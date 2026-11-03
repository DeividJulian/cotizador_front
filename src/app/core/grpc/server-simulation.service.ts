import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { toBinary } from '@bufbuild/protobuf';
import { Code, ConnectError, type Interceptor, type Transport, createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { firstValueFrom, fromEvent, takeUntil, tap } from 'rxjs';

import * as api from '../../api/functions';
import type { SimulationResult } from '../../api/models';
import {
  SimulateEventSchema,
  SimulationService,
  type SimulationResult as SimulationResultPb,
} from '../../grpc/gen/cotizador/v1/simulation_pb';
import { API_URL } from '../config/api.config';
import { SimulationResultSchema } from '../schemas/api.schemas';
import { AuthService } from '../services/auth.service';
import { parsed } from '../utils/api';

export type Protocol = 'rest' | 'grpc';

/** One run measured the same way for both protocols. */
export interface ServerRun {
  protocol: Protocol;
  result: SimulationResult;
  /** Bytes of the response body (JSON text, or the Protobuf messages with their 5-byte envelopes) */
  payloadBytes: number;
  /** Bytes that really travelled (compressed), from the browser's Resource Timing; null if it does not say */
  wireBytes: number | null;
  firstDataMs: number;
  totalMs: number;
  /** How many messages arrived: 1 in REST; the progress events plus the result in gRPC */
  messages: number;
}

export class SimulationCancelled extends Error {
  constructor() {
    super('Simulación cancelada');
  }
}

const REST_PATH = (id: number) => `${API_URL}${api.simulateQuote.PATH.replace('{quote_id}', String(id))}`;
const GRPC_PATH = `${API_URL}/${SimulationService.typeName}/${SimulationService.method.simulate.name}`;

/** The proto result in the same shape as the REST one (int64 arrives as bigint). */
function fromProto(r: SimulationResultPb): SimulationResult {
  return {
    runs: r.runs,
    planned_hours: r.plannedHours,
    mean: r.mean,
    p10: r.p10,
    p50: r.p50,
    p80: r.p80,
    p90: r.p90,
    prob_over_plan: r.probOverPlan,
    price_p50: Number(r.priceP50),
    price_p80: Number(r.priceP80),
    price_p90: Number(r.priceP90),
    histogram: r.histogram.map((b) => ({ start: b.start, end: b.end, count: b.count, over_plan: b.overPlan })),
    samples: r.samples,
    elapsed_ms: r.elapsedMs,
  };
}

/** Bytes on the wire of the last request to `url`, if the server allowed it (Timing-Allow-Origin). */
async function wireBytes(url: string): Promise<number | null> {
  await new Promise((resolve) => setTimeout(resolve, 50)); // the entry is added when the body ends
  const entries = performance.getEntriesByName(url, 'resource') as PerformanceResourceTiming[];
  const last = entries.at(-1);
  return last && last.encodedBodySize > 0 ? last.encodedBodySize : null;
}

/** Same JWT as REST, sent as gRPC metadata (the "authorization" header). */
export function jwtMetadata(auth: AuthService): Interceptor {
  return (next) => (request) => {
    const token = auth.token();
    if (token) request.header.set('Authorization', `Bearer ${token}`);
    return next(request);
  };
}

/** Connect over fetch with binary Protobuf. The tests replace it with an in-memory transport. */
export const GRPC_TRANSPORT = new InjectionToken<Transport>('Transporte gRPC (Connect)', {
  providedIn: 'root',
  factory: () =>
    createConnectTransport({ baseUrl: API_URL, useBinaryFormat: true, interceptors: [jwtMetadata(inject(AuthService))] }),
});

/**
 * Monte Carlo on the server, through REST (JSON, one response at the end) or gRPC over Connect (Protobuf,
 * server streaming with progress). Both reach the same Python function (backend/services/simulation.py).
 */
@Injectable({ providedIn: 'root' })
export class ServerSimulationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly client = createClient(SimulationService, inject(GRPC_TRANSPORT));

  run(
    protocol: Protocol,
    quoteId: number,
    runs: number,
    samples: number,
    signal: AbortSignal,
    onProgress: (fraction: number) => void,
  ): Promise<ServerRun> {
    return protocol === 'grpc'
      ? this.grpc(quoteId, runs, samples, signal, onProgress)
      : this.rest(quoteId, runs, samples, signal);
  }

  private async grpc(
    quoteId: number,
    runs: number,
    samples: number,
    signal: AbortSignal,
    onProgress: (fraction: number) => void,
  ): Promise<ServerRun> {
    const started = performance.now();
    let firstDataMs = 0;
    let payloadBytes = 0;
    let messages = 0;
    let result: SimulationResult | null = null;
    try {
      for await (const event of this.client.simulate({ quoteId: BigInt(quoteId), runs, samples }, { signal })) {
        firstDataMs ||= performance.now() - started;
        payloadBytes += 5 + toBinary(SimulateEventSchema, event).length; // Connect envelope: 1 flag + 4 length
        messages++;
        if (event.event.case === 'progress') onProgress(event.event.value.done / event.event.value.total);
        if (event.event.case === 'result') result = fromProto(event.event.value);
      }
    } catch (error) {
      throw this.grpcError(error, signal);
    }
    if (!result) throw new Error('El servidor cerró la simulación sin enviar el resultado');
    const totalMs = performance.now() - started;
    return { protocol: 'grpc', result, payloadBytes, wireBytes: await wireBytes(GRPC_PATH), firstDataMs, totalMs, messages };
  }

  private async rest(quoteId: number, runs: number, samples: number, signal: AbortSignal): Promise<ServerRun> {
    const started = performance.now();
    let payloadBytes = 0;
    try {
      const result = await firstValueFrom(
        api.simulateQuote(this.http, API_URL, { quote_id: quoteId, body: { runs, samples } }).pipe(
          takeUntil(fromEvent(signal, 'abort')),
          // FastAPI writes compact JSON: re-serializing the body gives its size within a few bytes
          tap((r) => (payloadBytes = new TextEncoder().encode(JSON.stringify(r.body)).length)),
          parsed(SimulationResultSchema, 'la simulación'),
        ),
        { defaultValue: null },
      );
      if (!result) throw new SimulationCancelled();
      const totalMs = performance.now() - started;
      const wire = await wireBytes(REST_PATH(quoteId));
      return { protocol: 'rest', result, payloadBytes, wireBytes: wire, firstDataMs: totalMs, totalMs, messages: 1 };
    } catch (error) {
      if (signal.aborted) throw new SimulationCancelled();
      throw error;
    }
  }

  private grpcError(error: unknown, signal: AbortSignal): Error {
    const e = ConnectError.from(error);
    if (signal.aborted || e.code === Code.Canceled) return new SimulationCancelled();
    if (e.code === Code.Unauthenticated) {
      this.auth.logout(); // same as the REST interceptor does with a 401
    }
    if (e.code === Code.Unknown || e.code === Code.Unavailable || e.code === Code.Internal) {
      return new Error('No se pudo completar la simulación por gRPC. Revisa tu conexión o intenta de nuevo en un momento.');
    }
    // The server's message is already in Spanish ("Debes iniciar sesión", "Cotización no encontrada"...)
    return new Error(e.rawMessage);
  }
}
