import { Component, input } from '@angular/core';

import { Icon } from '../../shared/icon/icon';

/** Left half of the log in / sign up screens: what the app does, in three steps. */
@Component({
  selector: 'app-auth-pitch',
  imports: [Icon],
  template: `
    <section class="auth__pitch" aria-labelledby="pitch-title">
      <span class="brand">
        <span class="brand__mark"><app-icon name="brand" /></span>
        <span>Cotizador <span class="brand__ai">IA</span></span>
      </span>

      <div>
        @if (variant() === 'signup') {
          <h1 class="auth__headline" id="pitch-title">Deja de adivinar tu precio.</h1>
          <p class="auth__lead">De una descripción sencilla a una propuesta que tu cliente puede firmar.</p>
        } @else {
          <h1 class="auth__headline" id="pitch-title">Sabe cuánto cobrar <em>antes</em> de responderle al cliente.</h1>
          <p class="auth__lead">
            Describe el proyecto con tus palabras. Obtén las horas, un precio con cada costo explicado y una propuesta
            lista para enviar.
          </p>
        }
      </div>

      <ol class="how">
        <li class="how__step">
          <span class="how__num">1</span>
          <div>
            <div class="how__title">Describe el proyecto</div>
            <p class="how__text">Como te lo contó el cliente: login, pagos, catálogo, reportes…</p>
          </div>
        </li>
        <li class="how__step">
          <span class="how__num">2</span>
          <div>
            <div class="how__title">La IA estima las horas</div>
            <p class="how__text">Detecta los módulos y los estima con PERT: optimista, más probable y pesimista.</p>
          </div>
        </li>
        <li class="how__step">
          <span class="how__num">3</span>
          <div>
            <div class="how__title">Un precio que puedes defender</div>
            <p class="how__text">Tus tarifas, contingencia, margen e IVA en pesos, un análisis de riesgo y la propuesta.</p>
          </div>
        </li>
      </ol>

      <div class="sample-quote" aria-label="Ejemplo de resultado">
        <div>
          <span class="eyebrow">Ejemplo · Tienda en línea</span>
          <div class="sample-quote__total" style="margin-top: 6px">$ 33.218.866 <span class="subtle" style="font-size: 14px; font-weight: 600">COP</span></div>
        </div>
        <div style="display: flex; align-items: flex-start">
          <span class="badge badge--ai"><app-icon name="sparkle" />7 módulos</span>
        </div>
        <div class="row small muted" style="grid-column: 1 / -1; gap: 16px">
          <span><strong class="tabular" style="color: var(--text)">254 h</strong> esperadas</span>
          <span><strong class="tabular" style="color: var(--text)">≈ 9 semanas</strong></span>
          <span><strong class="tabular" style="color: var(--text)">80 %</strong> de escenarios ≤ 268 h</span>
        </div>
      </div>
    </section>
  `,
  styles: `:host { display: contents; }`,
})
export class AuthPitch {
  readonly variant = input<'login' | 'signup'>('login');
}
