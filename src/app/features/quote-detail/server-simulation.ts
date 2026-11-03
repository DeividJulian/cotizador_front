import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Protocol, ServerRun, ServerSimulationService, SimulationCancelled } from '../../core/grpc/server-simulation.service';
import { mockEnabled } from '../../core/mocks/mock.interceptor';
import { Quote } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { cop, int, num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { Icon } from '../../shared/icon/icon';

const LABELS: Record<Protocol, string> = { rest: 'REST (JSON)', grpc: 'gRPC (Protobuf)' };

/** Bytes in a readable unit: 1234 -> "1,2 kB". */
function size(bytes: number | null): string {
  if (bytes === null) return '—';
  return bytes < 1024 ? `${int(bytes)} B` : bytes < 1024 * 1024 ? `${num(bytes / 1024)} kB` : `${num(bytes / 1024 / 1024)} MB`;
}

/**
 * Monte Carlo on the SERVER, by REST or by gRPC (Connect + Protobuf, server streaming). The same Python function
 * answers both; the switch shows what changes: live progress and the size of what travels.
 */
@Component({
  selector: 'app-server-simulation',
  imports: [FormsModule, Icon],
  templateUrl: './server-simulation.html',
})
export class ServerSimulation {
  readonly quote = input.required<Quote>();

  private readonly service = inject(ServerSimulationService);
  private readonly toast = inject(ToastService);

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly int = int;
  protected readonly size = size;
  protected readonly labels = LABELS;
  protected readonly protocols: Protocol[] = ['grpc', 'rest'];
  protected readonly runOptions = [10_000, 50_000, 100_000, 200_000];
  protected readonly sampleOptions = [0, 10_000, 50_000];
  protected readonly mock = mockEnabled();

  protected readonly protocol = signal<Protocol>('grpc');
  protected readonly runs = signal(100_000);
  protected readonly samples = signal(10_000);
  protected readonly running = signal<Protocol | null>(null);
  protected readonly progress = signal(0);
  protected readonly error = signal<string | null>(null);
  protected readonly last = signal<ServerRun | null>(null);
  /** Last run of each protocol with the same parameters, for the comparison table */
  protected readonly runsByProtocol = signal<Partial<Record<Protocol, ServerRun>>>({});

  private controller: AbortController | null = null;

  protected readonly canRun = computed(() => !this.mock && this.quote().items.length > 0 && !!this.quote().total);
  protected readonly comparison = computed(() => {
    const { rest, grpc } = this.runsByProtocol();
    if (!rest || !grpc) return null;
    const saved = (a: number | null, b: number | null) => (a && b ? Math.round((1 - b / a) * 100) : null);
    return { rest, grpc, payloadSaved: saved(rest.payloadBytes, grpc.payloadBytes), wireSaved: saved(rest.wireBytes, grpc.wireBytes) };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  protected changeParams(): void {
    // A comparison only makes sense with the same volume
    this.runsByProtocol.set({});
  }

  protected async run(protocol = this.protocol()): Promise<ServerRun | null> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.running.set(protocol);
    this.progress.set(0);
    this.error.set(null);
    try {
      const run = await this.service.run(protocol, this.quote().id, this.runs(), this.samples(), controller.signal, (f) =>
        this.progress.set(f),
      );
      this.last.set(run);
      this.runsByProtocol.update((all) => ({ ...all, [protocol]: run }));
      return run;
    } catch (error) {
      if (error instanceof SimulationCancelled) {
        this.toast.info('Simulación cancelada');
      } else {
        this.error.set(errorMessage(error));
      }
      return null;
    } finally {
      if (this.controller === controller) {
        this.running.set(null);
        this.controller = null;
      }
    }
  }

  /** Runs both with the same parameters: first REST, then gRPC. */
  protected async compare(): Promise<void> {
    this.runsByProtocol.set({});
    if (await this.run('rest')) await this.run('grpc');
  }

  protected cancel(): void {
    this.controller?.abort();
  }
}
