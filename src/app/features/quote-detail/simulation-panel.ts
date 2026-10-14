import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Quote } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { cop, num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { SimulationJob } from '../../core/workers/simulation.logic';
import { SimulationMode, SimulationRun, SimulationService } from '../../core/workers/simulation.service';

interface RunLog {
  mode: SimulationMode;
  runs: number;
  elapsedMs: number;
  longestFreezeMs: number;
}

/**
 * Simulación Monte Carlo del riesgo de la estimación. Usa un WEB WORKER para que la pantalla
 * no se congele; el botón de comparación la ejecuta en el hilo principal para demostrar la diferencia.
 */
@Component({
  selector: 'app-simulation-panel',
  imports: [FormsModule],
  templateUrl: './simulation-panel.html',
})
export class SimulationPanel implements OnInit {
  readonly quote = input.required<Quote>();

  protected readonly simulation = inject(SimulationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cop = cop;
  protected readonly num = num;

  protected readonly runs = signal(100_000);
  protected readonly lastRun = signal<SimulationRun | null>(null);
  protected readonly log = signal<RunLog[]>([]);

  // Monitor de fotogramas: demuestra si el hilo principal sigue libre
  protected readonly fps = signal(0);
  private rafId = 0;
  private lastFrame = 0;
  private longestGap = 0;
  private frames = 0;
  private windowStart = 0;

  protected readonly percent = computed(() => Math.round(this.simulation.progress() * 100));
  protected readonly canRun = computed(() => this.quote().items.length > 0 && !!this.quote().financiero.total);
  protected readonly maxBin = computed(() => Math.max(1, ...(this.lastRun()?.output.histogram.map((b) => b.count) ?? [1])));

  ngOnInit(): void {
    this.startFrameMonitor();
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.rafId);
      this.simulation.cancel();
    });
  }

  protected async run(mode: SimulationMode): Promise<void> {
    const q = this.quote();
    const planned = q.estimacion.horas_esperadas ?? q.items.reduce((n, i) => n + i.horas_esperadas, 0);
    const job: SimulationJob = {
      items: q.items.map((i) => ({ optimista: i.horas_optimista, probable: i.horas_probable, pesimista: i.horas_pesimista })),
      runs: this.runs(),
      plannedHours: planned,
      pricePerHour: planned > 0 ? (q.financiero.total ?? 0) / planned : 0,
    };

    this.longestGap = 0;
    this.lastFrame = performance.now();
    try {
      const result = await this.simulation.run(job, mode);
      await new Promise((resolve) => requestAnimationFrame(resolve)); // deja que el monitor mida el último bloqueo
      this.lastRun.set(result);
      this.log.update((entries) => [
        { mode, runs: result.output.runs, elapsedMs: result.output.elapsedMs, longestFreezeMs: Math.round(this.longestGap) },
        ...entries,
      ]);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  protected cancel(): void {
    this.simulation.cancel();
    this.toast.info('Simulation cancelled');
  }

  private startFrameMonitor(): void {
    this.windowStart = this.lastFrame = performance.now();
    const tick = () => {
      // performance.now() y no la marca del fotograma: esa se fija antes del bloqueo y ocultaría el congelamiento
      const now = performance.now();
      this.longestGap = Math.max(this.longestGap, now - this.lastFrame);
      this.lastFrame = now;
      this.frames++;
      if (now - this.windowStart >= 500) {
        this.fps.set(Math.round((this.frames * 1000) / (now - this.windowStart)));
        this.frames = 0;
        this.windowStart = now;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
