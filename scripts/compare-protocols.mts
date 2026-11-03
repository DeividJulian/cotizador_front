// Measures REST (JSON) against gRPC over Connect (Protobuf) with the SAME simulation, using the same generated
// client as the browser (@connectrpc/connect-web). Prints a Markdown table for the README.
//
//   API_URL=https://cotizador-backend-c0ul.onrender.com TOKEN=<jwt> QUOTE_ID=1 node scripts/compare-protocols.mts
//   optional: RUNS=100000 SAMPLES=10000 REPEAT=5
//
// The token is read from the environment and never printed.
import { gzipSync } from 'node:zlib';

import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

import { SimulationService } from '../src/app/grpc/gen/cotizador/v1/simulation_pb.ts';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:8000';
const TOKEN = process.env.TOKEN ?? '';
const QUOTE_ID = Number(process.env.QUOTE_ID ?? 1);
const RUNS = Number(process.env.RUNS ?? 100_000);
const SAMPLES = Number(process.env.SAMPLES ?? 10_000);
const REPEAT = Number(process.env.REPEAT ?? 5);

if (!TOKEN) {
  console.error('Falta TOKEN (el JWT de /auth/verify)');
  process.exit(2);
}

interface Measure {
  bytes: Buffer;
  firstMs: number;
  totalMs: number;
  messages: number;
}

/** fetch that keeps a copy of the response body, to count its exact bytes. */
function recordingFetch(sink: Buffer[]): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, init);
    const [forClient, forCount] = response.body!.tee();
    void (async () => {
      for await (const chunk of forCount) sink.push(Buffer.from(chunk));
    })();
    return new Response(forClient, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}

async function rest(): Promise<Measure> {
  const started = performance.now();
  const response = await fetch(`${API_URL}/quotes/${QUOTE_ID}/simulation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ runs: RUNS, samples: SAMPLES }),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const totalMs = performance.now() - started;
  if (!response.ok) throw new Error(`REST ${response.status}: ${bytes.toString()}`);
  JSON.parse(bytes.toString());
  return { bytes, firstMs: totalMs, totalMs, messages: 1 };
}

async function grpc(): Promise<Measure> {
  const sink: Buffer[] = [];
  const client = createClient(
    SimulationService,
    createConnectTransport({ baseUrl: API_URL, useBinaryFormat: true, fetch: recordingFetch(sink) }),
  );
  const started = performance.now();
  let firstMs = 0;
  let messages = 0;
  const stream = client.simulate(
    { quoteId: BigInt(QUOTE_ID), runs: RUNS, samples: SAMPLES },
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  for await (const event of stream) {
    firstMs ||= performance.now() - started;
    messages++;
    if (event.event.case === 'result' && event.event.value.runs !== RUNS) throw new Error('resultado inesperado');
  }
  const totalMs = performance.now() - started;
  await new Promise((resolve) => setTimeout(resolve, 20));
  return { bytes: Buffer.concat(sink), firstMs, totalMs, messages };
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const kb = (n: number) => `${(n / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} kB`;
const ms = (n: number) => `${Math.round(n).toLocaleString('es-CO')} ms`;

async function measure(fn: () => Promise<Measure>) {
  await fn(); // warm up (Render's free plan sleeps)
  const results: Measure[] = [];
  for (let i = 0; i < REPEAT; i++) results.push(await fn());
  const bytes = results[0].bytes;
  return {
    payload: bytes.length,
    gzip: gzipSync(bytes).length,
    first: median(results.map((r) => r.firstMs)),
    total: median(results.map((r) => r.totalMs)),
    messages: results[0].messages,
  };
}

const r = await measure(rest);
const g = await measure(grpc);
const less = (a: number, b: number) => {
  const pct = Math.round((1 - b / a) * 100);
  return pct === 0 ? 'igual' : pct > 0 ? `gRPC ${pct} % menos` : `gRPC ${-pct} % más`;
};

console.log(`\n${API_URL} · ${RUNS.toLocaleString('es-CO')} simulaciones · ${SAMPLES.toLocaleString('es-CO')} totales devueltos · mediana de ${REPEAT}\n`);
console.log('| Medida | REST (JSON) | gRPC (Protobuf) | Diferencia |');
console.log('|---|---:|---:|---|');
console.log(`| Tamaño del mensaje | ${kb(r.payload)} | ${kb(g.payload)} | ${less(r.payload, g.payload)} |`);
console.log(`| Comprimido con gzip | ${kb(r.gzip)} | ${kb(g.gzip)} | ${less(r.gzip, g.gzip)} |`);
console.log(`| Primer dato | ${ms(r.first)} | ${ms(g.first)} | gRPC muestra progreso desde el inicio |`);
console.log(`| Tiempo total | ${ms(r.total)} | ${ms(g.total)} | |`);
console.log(`| Mensajes | ${r.messages} | ${g.messages} | 10 de progreso + 1 resultado |`);
