/// <reference lib="webworker" />
/**
 * WEB WORKER: ejecuta la simulación Monte Carlo en un hilo aparte
 * para que la interfaz (hilo principal) no se congele.
 */
import { SimulationJob, simulate } from './simulation.logic';

addEventListener('message', ({ data }: MessageEvent<SimulationJob>) => {
  try {
    const output = simulate(data, (progress) => postMessage({ type: 'progress', progress }));
    postMessage({ type: 'result', output });
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Simulation error' });
  }
});
