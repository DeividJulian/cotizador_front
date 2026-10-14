/**
 * Simulación Monte Carlo de la estimación PERT.
 * Cada módulo tiene tres estimaciones (optimista, probable, pesimista). En vez de sumar solo el
 * promedio, se sortean miles de "proyectos posibles" con la distribución Beta-PERT y se mide
 * cuántas horas (y qué precio) cubren el 50 %, 80 % o 90 % de los casos.
 *
 * Es lógica pura (sin Angular ni DOM): corre igual en un Web Worker o en el hilo principal.
 */

export interface PertItem {
  optimista: number;
  probable: number;
  pesimista: number;
}

export interface SimulationJob {
  items: PertItem[];
  runs: number;
  /** Horas que prometería la cotización (la suma de horas esperadas) */
  plannedHours: number;
  /** Precio final por hora de esfuerzo (total con margen e IVA / horas esperadas) */
  pricePerHour: number;
}

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
  overPlan: boolean;
}

export interface SimulationOutput {
  runs: number;
  mean: number;
  p10: number;
  p50: number;
  p80: number;
  p90: number;
  /** Probabilidad (0-1) de que el proyecto necesite más horas de las cotizadas */
  probOverPlan: number;
  priceP50: number;
  priceP80: number;
  priceP90: number;
  histogram: HistogramBin[];
  elapsedMs: number;
}

const BINS = 30;

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random: () => number): number {
  // Box-Muller
  const u = 1 - random();
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Muestra de Gamma(alfa, 1) con alfa >= 1 (Marsaglia-Tsang). */
function gamma(alpha: number, random: () => number): number {
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(random);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = random();
    if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Muestra de la distribución Beta-PERT escalada al rango [optimista, pesimista]. */
export function samplePert(item: PertItem, random: () => number): number {
  const { optimista: o, probable: m, pesimista: p } = item;
  if (p <= o) return m;
  const alpha = 1 + (4 * (m - o)) / (p - o);
  const beta = 1 + (4 * (p - m)) / (p - o);
  const x = gamma(alpha, random);
  const y = gamma(beta, random);
  return o + (p - o) * (x / (x + y));
}

function percentile(sorted: Float64Array, fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(fraction * sorted.length));
  return sorted[index];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function simulate(job: SimulationJob, onProgress: (fraction: number) => void = () => undefined): SimulationOutput {
  const started = performance.now();
  const random = mulberry32(2026);
  const totals = new Float64Array(job.runs);
  const step = Math.max(1, Math.floor(job.runs / 100));
  let sum = 0;
  let over = 0;

  for (let r = 0; r < job.runs; r++) {
    let hours = 0;
    for (const item of job.items) hours += samplePert(item, random);
    totals[r] = hours;
    sum += hours;
    if (hours > job.plannedHours) over++;
    if (r % step === 0) onProgress((0.9 * r) / job.runs);
  }

  totals.sort();
  const min = totals[0];
  const max = totals[job.runs - 1];
  const width = (max - min) / BINS || 1;
  const counts = new Array<number>(BINS).fill(0);
  for (const t of totals) counts[Math.min(BINS - 1, Math.floor((t - min) / width))]++;

  const p50 = percentile(totals, 0.5);
  const p80 = percentile(totals, 0.8);
  const p90 = percentile(totals, 0.9);
  onProgress(1);

  return {
    runs: job.runs,
    mean: round1(sum / job.runs),
    p10: round1(percentile(totals, 0.1)),
    p50: round1(p50),
    p80: round1(p80),
    p90: round1(p90),
    probOverPlan: over / job.runs,
    priceP50: Math.round(p50 * job.pricePerHour),
    priceP80: Math.round(p80 * job.pricePerHour),
    priceP90: Math.round(p90 * job.pricePerHour),
    histogram: counts.map((count, i) => ({
      from: round1(min + i * width),
      to: round1(min + (i + 1) * width),
      count,
      overPlan: min + i * width >= job.plannedHours,
    })),
    elapsedMs: Math.round(performance.now() - started),
  };
}
