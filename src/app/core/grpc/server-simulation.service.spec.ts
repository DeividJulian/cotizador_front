import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { create } from '@bufbuild/protobuf';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { SimulationResultSchema, SimulationService } from '../../grpc/gen/cotizador/v1/simulation_pb';
import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { GRPC_TRANSPORT, ServerSimulationService, SimulationCancelled, jwtMetadata } from './server-simulation.service';

const RESULT = {
  runs: 2_000,
  plannedHours: 254,
  mean: 251.2,
  p10: 230.1,
  p50: 250.9,
  p80: 268.4,
  p90: 279.3,
  probOverPlan: 0.46,
  priceP50: 32_826_518n,
  priceP80: 35_049_828n,
  priceP90: 36_488_440n,
  histogram: [{ start: 190, end: 200, count: 2_000, overPlan: false }],
  samples: [251.5, 249],
  elapsedMs: 12,
};

describe('simulación en el servidor por gRPC (Connect)', () => {
  let headers: Headers | null;

  function setup(handler: (signal: AbortSignal) => AsyncIterable<unknown>, token: string | null = 'jwt-de-prueba') {
    headers = null;
    const auth = { token: () => token, logout: vi.fn() };
    const transport = createRouterTransport(
      (router) =>
        router.service(SimulationService, {
          async *simulate(_request, ctx) {
            headers = ctx.requestHeader;
            yield* handler(ctx.signal) as AsyncIterable<never>;
          },
        }),
      { transport: { interceptors: [jwtMetadata(auth as unknown as AuthService)] } },
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: GRPC_TRANSPORT, useValue: transport },
      ],
    });
    return { service: TestBed.inject(ServerSimulationService), auth };
  }

  async function* ok() {
    for (let done = 500; done <= 2_000; done += 500) yield { event: { case: 'progress', value: { done, total: 2_000 } } };
    yield { event: { case: 'result', value: create(SimulationResultSchema, RESULT) } };
  }

  it('recibe el progreso en streaming y el resultado con la forma de REST', async () => {
    const { service } = setup(ok);
    const progress: number[] = [];
    const run = await service.run('grpc', 7, 2_000, 2, new AbortController().signal, (f) => progress.push(f));
    expect(progress).toEqual([0.25, 0.5, 0.75, 1]);
    expect(run.messages).toBe(5);
    expect(run.result.price_p80).toBe(35_049_828); // int64 (bigint) -> number
    expect(run.result.histogram[0]).toEqual({ start: 190, end: 200, count: 2_000, over_plan: false });
    expect(run.payloadBytes).toBeGreaterThan(0);
  });

  it('envía el mismo JWT de REST como metadata', async () => {
    const { service } = setup(ok);
    await service.run('grpc', 7, 2_000, 0, new AbortController().signal, () => undefined);
    expect(headers?.get('authorization')).toBe('Bearer jwt-de-prueba');
  });

  it('sin sesión válida muestra el mensaje del servidor y cierra la sesión', async () => {
    const { service, auth } = setup(async function* () {
      throw new ConnectError('La sesión venció o no es válida: inicia sesión de nuevo', Code.Unauthenticated);
    });
    await expect(service.run('grpc', 7, 2_000, 0, new AbortController().signal, () => undefined)).rejects.toThrow(
      'La sesión venció o no es válida: inicia sesión de nuevo',
    );
    expect(auth.logout).toHaveBeenCalled();
  });

  it('una cotización ajena llega como el error del servidor, sin cerrar la sesión', async () => {
    const { service, auth } = setup(async function* () {
      throw new ConnectError('Cotización no encontrada', Code.NotFound);
    });
    await expect(service.run('grpc', 99, 2_000, 0, new AbortController().signal, () => undefined)).rejects.toThrow(
      'Cotización no encontrada',
    );
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('se puede cancelar a mitad del streaming', async () => {
    const controller = new AbortController();
    const { service } = setup(async function* (signal) {
      yield { event: { case: 'progress', value: { done: 500, total: 2_000 } } };
      await new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    });
    const running = service.run('grpc', 7, 2_000, 0, controller.signal, () => controller.abort());
    await expect(running).rejects.toBeInstanceOf(SimulationCancelled);
  });

  it('REST pide la misma simulación y parsea la respuesta', async () => {
    const { service } = setup(ok);
    const running = service.run('rest', 7, 2_000, 0, new AbortController().signal, () => undefined);
    const request = TestBed.inject(HttpTestingController).expectOne(`${API_URL}/quotes/7/simulation`);
    expect(request.request.body).toEqual({ runs: 2_000, samples: 0 });
    request.flush({ ...RESULT_REST, samples: [] });
    const run = await running;
    expect(run.messages).toBe(1);
    expect(run.result.p80).toBe(268.4);
  });
});

const RESULT_REST = {
  runs: 2_000,
  planned_hours: 254,
  mean: 251.2,
  p10: 230.1,
  p50: 250.9,
  p80: 268.4,
  p90: 279.3,
  prob_over_plan: 0.46,
  price_p50: 32_826_518,
  price_p80: 35_049_828,
  price_p90: 36_488_440,
  histogram: [{ start: 190, end: 200, count: 2_000, over_plan: false }],
  elapsed_ms: 12,
};
