import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Quote } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { cop, int, num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { SimulationJob } from '../../core/workers/simulation.logic';
import { SimulationMode, SimulationRun, SimulationService } from '../../core/workers/simulation.service';
import { Icon } from '../../shared/icon/icon';

interface FrameStats {
  averageFps: number;
  lowestFps: number;
  longestFreezeMs: number;
}

type ModeResult = SimulationRun & FrameStats;

/**
 * Monte Carlo simulation of the estimate risk. It runs in a WEB WORKER so the screen
 * doesn't freeze; the comparison button runs it on the main thread to show the difference.
 */
@Component({
  selector: 'app-simulation-panel',
  imports: [FormsModule, Icon],
  templateUrl: './simulation-panel.html',
})
export class SimulationPanel implements OnInit {
  readonly quote = input.required<Quote>();

  protected readonly simulation = inject(SimulationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly int = int;
  protected readonly modes: SimulationMode[] = ['worker', 'main'];
  protected readonly options = [10_000, 100_000, 500_000, 1_000_000, 2_000_000];

  protected readonly runs = signal(100_000);
  protected readonly lastRun = signal<SimulationRun | null>(null);
  protected readonly results = signal<Partial<Record<SimulationMode, ModeResult>>>({});

  // Frame monitor: shows whether the main thread stays free
  protected readonly fps = signal(60);
  private rafId = 0;
  private lastFrame = 0;
  private frames = 0;
  private windowStart = 0;
  /** Measurements of the run in progress */
  private longestGap = 0;
  private fpsSamples: number[] = [];

  protected readonly percent = computed(() => Math.round(this.simulation.progress() * 100));
  protected readonly canRun = computed(() => this.quote().items.length > 0 && !!this.quote().financials.total);
  protected readonly planned = computed(() => {
    const q = this.quote();
    return q.estimate.hours_expected ?? q.items.reduce((n, i) => n + i.hours_expected, 0);
  });

  /** Histogram bars plus the position (0-100 %) of the quoted hours. */
  protected readonly chart = computed(() => {
    const run = this.lastRun();
    if (!run) return null;
    const bins = run.output.histogram;
    const max = Math.max(1, ...bins.map((b) => b.count));
    const from = bins[0].from;
    const to = bins[bins.length - 1].to;
    const marker = Math.min(100, Math.max(0, ((this.planned() - from) / (to - from || 1)) * 100));
    const axis = [0, 0.25, 0.5, 0.75, 1].map((f) => `${num(Math.round(from + (to - from) * f))} h`);
    return { bars: bins.map((b) => ({ ...b, height: (b.count / max) * 100 })), marker, axis };
  });

  ngOnInit(): void {
    this.startFrameMonitor();
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.rafId);
      this.simulation.cancel();
    });
  }

  protected async run(mode: SimulationMode): Promise<void> {
    const q = this.quote();
    const planned = this.planned();
    const job: SimulationJob = {
      items: q.items.map((i) => ({ optimistic: i.hours_optimistic, likely: i.hours_likely, pessimistic: i.hours_pessimistic })),
      runs: this.runs(),
      plannedHours: planned,
      pricePerHour: planned > 0 ? (q.financials.total ?? 0) / planned : 0,
    };

    this.longestGap = 0;
    this.fpsSamples = [];
    this.lastFrame = performance.now();
    try {
      const result = await this.simulation.run(job, mode);
      await new Promise((resolve) => requestAnimationFrame(resolve)); // lets the monitor measure the last freeze
      const samples = this.fpsSamples.length ? this.fpsSamples : [this.fps()];
      // A frame gap of N ms means the screen showed at most 1000 / N frames per second
      const freezeFps = this.longestGap > 0 ? Math.min(60, Math.round(1000 / this.longestGap)) : 60;
      const stats: FrameStats = {
        averageFps: Math.round(samples.reduce((n, s) => n + s, 0) / samples.length),
        lowestFps: Math.min(freezeFps, ...samples),
        longestFreezeMs: Math.round(this.longestGap),
      };
      this.lastRun.set(result);
      this.results.update((all) => ({ ...all, [mode]: { ...result, ...stats } }));
    } catch (error) {
      this.toast.error('La simulación falló', errorMessage(error));
    }
  }

  protected cancel(): void {
    this.simulation.cancel();
    this.toast.info('Simulación cancelada');
  }

  private startFrameMonitor(): void {
    this.windowStart = this.lastFrame = performance.now();
    const tick = () => {
      // performance.now() and not the frame timestamp: that one is set before the freeze and would hide it
      const now = performance.now();
      this.longestGap = Math.max(this.longestGap, now - this.lastFrame);
      this.lastFrame = now;
      this.frames++;
      if (now - this.windowStart >= 500) {
        const value = Math.round((this.frames * 1000) / (now - this.windowStart));
        this.fps.set(value);
        if (this.simulation.running()) this.fpsSamples.push(value);
        this.frames = 0;
        this.windowStart = now;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
