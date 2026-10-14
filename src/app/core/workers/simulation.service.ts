import { Injectable, signal } from '@angular/core';

import { SimulationJob, SimulationOutput, simulate } from './simulation.logic';

export type SimulationMode = 'worker' | 'main';

export interface SimulationRun {
  mode: SimulationMode;
  output: SimulationOutput;
  /** Tiempo total medido desde la pantalla (incluye el traspaso de datos al worker) */
  wallMs: number;
}

/**
 * Orquesta la simulación: lo ejecuta en un Web Worker (hilo aparte) o, para comparar,
 * en el hilo principal.
 */
@Injectable({ providedIn: 'root' })
export class SimulationService {
  readonly running = signal(false);
  readonly progress = signal(0);
  readonly mode = signal<SimulationMode>('worker');

  private worker: Worker | null = null;

  readonly workerSupported = typeof Worker !== 'undefined';

  async run(job: SimulationJob, mode: SimulationMode): Promise<SimulationRun> {
    this.running.set(true);
    this.progress.set(0);
    this.mode.set(mode);
    const started = performance.now();
    try {
      const output = mode === 'worker' ? await this.runInWorker(job) : await this.runOnMainThread(job);
      return { mode, output, wallMs: Math.round(performance.now() - started) };
    } finally {
      this.running.set(false);
    }
  }

  cancel(): void {
    this.worker?.terminate();
    this.worker = null;
    this.running.set(false);
  }

  private runInWorker(job: SimulationJob): Promise<SimulationOutput> {
    if (!this.workerSupported) return Promise.reject(new Error('This browser does not support Web Workers'));

    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./simulation.worker', import.meta.url), { type: 'module' });
      this.worker = worker;

      worker.onmessage = ({ data }: MessageEvent) => {
        if (data.type === 'progress') {
          this.progress.set(data.progress);
        } else if (data.type === 'result') {
          worker.terminate();
          this.worker = null;
          resolve(data.output as SimulationOutput);
        } else if (data.type === 'error') {
          worker.terminate();
          this.worker = null;
          reject(new Error(data.message));
        }
      };
      worker.onerror = (event) => {
        worker.terminate();
        this.worker = null;
        reject(new Error(event.message || 'The worker failed'));
      };
      worker.postMessage(job);
    });
  }

  private async runOnMainThread(job: SimulationJob): Promise<SimulationOutput> {
    // Se cede un instante para que la pantalla muestre "procesando" antes de que el hilo se bloquee
    await new Promise((resolve) => setTimeout(resolve, 60));
    return simulate(job, (fraction) => this.progress.set(fraction));
  }
}
