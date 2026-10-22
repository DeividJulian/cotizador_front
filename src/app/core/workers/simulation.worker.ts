/// <reference lib="webworker" />
/**
 * WEB WORKER: runs the Monte Carlo simulation on a separate thread
 * so the interface (main thread) doesn't freeze.
 */
import { SimulationJob, simulate } from './simulation.logic';

addEventListener('message', ({ data }: MessageEvent<SimulationJob>) => {
  try {
    const output = simulate(data, (progress) => postMessage({ type: 'progress', progress }));
    postMessage({ type: 'result', output });
  } catch (error) {
    postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Error en la simulación' });
  }
});
