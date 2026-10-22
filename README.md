# Cotizador IA · Frontend

Interfaz web del **Motor de Cotización con IA** (Programación Orientada a la Web, UCC Pasto): una herramienta para
freelancers que no saben cuánto cobrar por un proyecto de software.
Angular 21 · TypeScript · FastAPI + Neon (PostgreSQL) en la nube · Vercel + Render.

- App: https://cotizador-front-eight.vercel.app
- API: https://cotizador-backend-c0ul.onrender.com/docs

## Qué hace
- Registro con tu correo (un código de 6 dígitos, sin contraseña): tus cotizaciones y tarifas quedan en tu cuenta,
  así nunca pierdes tu avance.
- Describes el proyecto con tus palabras (en español o en inglés) y el análisis lo convierte en módulos con horas
  optimistas / más probables / pesimistas (PERT).
- Calcula el precio con **tus tarifas por hora** (empiezan con valores de referencia del mercado en COP; ajústalas en
  **Mis tarifas**): costo directo, contingencia, margen, descuento, IVA, cronograma y pagos.
- Simula el riesgo con Monte Carlo (P50 / P80 / P90 y probabilidad de pasarte de las horas).
- Genera la propuesta comercial en Markdown para tu cliente (léela, descárgala o imprímela).
- Sigue cada propuesta: borrador → enviada → aceptada / rechazada.

No hay roles: cada persona solo ve sus propias cotizaciones, tarifas y panel.

## Pantallas
| Ruta | Pantalla |
| --- | --- |
| `/registro`, `/login` | Registro e ingreso con código por correo |
| `/` | Panel: indicadores, estados, horas por rol y módulos más cotizados |
| `/cotizaciones` | Mis cotizaciones, con filtro por estado |
| `/cotizaciones/nueva` | Asistente de 3 pasos: proyecto, alcance (con vista previa) y precio |
| `/cotizaciones/:id` | Detalle con pestañas Módulos, Finanzas, Riesgo (Monte Carlo) y Propuesta |
| `/tarifas` | Mis tarifas por rol, comparadas con el mercado |

## Ingreso con código por correo
En **Crear cuenta** o **Iniciar sesión** la persona escribe su correo y recibe un código de 6 dígitos que vence en 10 minutos.
Al verificarlo, el token de la sesión se guarda en el navegador y se envía en cada petición a la API. Si la sesión
vence, la app vuelve al login. Al cerrar sesión también se borran los datos de la API guardados por el Service Worker,
así otra cuenta en el mismo navegador nunca los ve.

## Los tres workers
| Worker | Archivo | Para qué sirve |
| --- | --- | --- |
| Web Worker | `src/app/core/workers/simulation.worker.ts` | Monte Carlo fuera del hilo principal: la pantalla no se congela. |
| Shared Worker | `public/shared-worker.js` | Avisa a todas las pestañas abiertas cuando una cambia datos. |
| Service Worker | `public/sw.js` | Caché "primero la red" de las lecturas GET: la app sigue mostrando datos sin conexión. |

## Convención de nombres
El código, los endpoints y los campos JSON están en inglés (`/quotes`, `hours_likely`, `status: "draft"`). Todo lo que
ve la persona está en español: botones, menús, mensajes, estados y rutas del navegador.

## Correr en local
Primero el backend (en su carpeta, con su `.env`): `uvicorn main:app --reload` → http://127.0.0.1:8000/docs.

```bash
npm install --legacy-peer-deps
npm start            # http://localhost:4200  (usa la API en http://127.0.0.1:8000)
npm test             # pruebas unitarias
npm run build        # build de producción en dist/cotizador-front/browser
```

Regístrate (en local el backend imprime el código en su terminal con `EMAIL_BACKEND=console`) y luego
**Nueva cotización** → describe el proyecto → **Crear y analizar con IA**. Para verla con datos, usa **Cargar ejemplos** en el
Panel.

## Configuración
La URL del backend de producción está en `src/app/core/config/api.config.ts` (`PRODUCTION_API`).

## Despliegue
Vercel (preset Angular, salida `dist/cotizador-front/browser`). `vercel.json` redirige las rutas a `index.html` y evita
que se guarden en caché `sw.js` y `shared-worker.js`.

## Estructura
```
src/app/
  core/       configuración, modelos, servicios HTTP, utilidades y workers
  core/auth/  interceptor del token y guards de sesión
  shared/     íconos, notificaciones y estado de la conexión
  features/   auth, dashboard, quotes, quote-new, quote-detail, rates
public/       sw.js y shared-worker.js
src/styles.css  sistema de diseño (tokens, tema oscuro/claro y componentes)
```
