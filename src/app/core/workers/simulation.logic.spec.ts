import { SimulationJob, mulberry32, samplePert, simulate } from './simulation.logic';

const ITEMS = [
  { optimista: 48, probable: 64, pesimista: 121.6 },
  { optimista: 54, probable: 72, pesimista: 136.8 },
  { optimista: 30, probable: 40, pesimista: 76 },
];

describe('simulación Monte Carlo PERT', () => {
  it('cada muestra queda dentro del rango optimista-pesimista', () => {
    const random = mulberry32(1);
    for (let i = 0; i < 2000; i++) {
      const value = samplePert(ITEMS[0], random);
      expect(value).toBeGreaterThanOrEqual(48);
      expect(value).toBeLessThanOrEqual(121.6);
    }
  });

  it('es determinista: misma semilla, mismo resultado', () => {
    const job: SimulationJob = { items: ITEMS, runs: 3000, plannedHours: 200, pricePerHour: 1000 };
    const a = simulate(job);
    const b = simulate(job);
    expect(a.p80).toBe(b.p80);
    expect(a.mean).toBe(b.mean);
  });

  it('los percentiles son crecientes y el precio escala con las horas', () => {
    const out = simulate({ items: ITEMS, runs: 5000, plannedHours: 200, pricePerHour: 1000 });
    expect(out.p10).toBeLessThanOrEqual(out.p50);
    expect(out.p50).toBeLessThanOrEqual(out.p80);
    expect(out.p80).toBeLessThanOrEqual(out.p90);
    expect(out.priceP90).toBeGreaterThanOrEqual(out.priceP50);
    expect(out.histogram.reduce((n, b) => n + b.count, 0)).toBe(5000);
  });

  it('el promedio simulado se acerca al promedio PERT', () => {
    const pert = ITEMS.reduce((n, i) => n + (i.optimista + 4 * i.probable + i.pesimista) / 6, 0);
    const out = simulate({ items: ITEMS, runs: 20000, plannedHours: pert, pricePerHour: 1 });
    expect(Math.abs(out.mean - pert) / pert).toBeLessThan(0.03);
  });
});
