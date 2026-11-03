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

## ¿Qué hace la IA?
Las cifras (módulos, horas, precio y pagos) las calcula el backend con código propio. La IA (**Groq**, opcional) solo
escribe texto en cuatro paneles del detalle de una cotización:

| Pestaña | Panel | Qué hace |
| --- | --- | --- |
| Módulos | Segunda opinión del alcance | Sugiere módulos del catálogo que pudieron faltar; botón **Agregar** para sumarlos como módulo manual |
| Finanzas | Explícame el precio | Explica de dónde sale el precio y cómo podría bajar |
| Riesgo | Preguntas y riesgos para el cliente | Qué aclarar en la reunión antes de enviar la cotización |
| Propuesta | Mejorar la redacción | Antes/después por sección; solo se guarda lo que apliques y las cifras no cambian |

Cada panel muestra el proveedor que informa el servidor (`GET /ai/status`). Si el servidor no tiene `AI_API_KEY`, los
botones quedan deshabilitados con un aviso y el resto de la app funciona igual.

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

### Sin backend (modo de prueba)
Abre la app con `?mock=1` (por ejemplo http://localhost:4200/?mock=1) y entra con cualquier correo y cualquier
código de 6 dígitos. `core/mocks/mock.interceptor.ts` responde con los datos de `core/mocks/mock-data.ts`, que se
tomaron de respuestas reales de la API y están tipados con `satisfies` sobre los tipos generados: si el contrato
cambia, los mocks dejan de compilar. `?mock=0` lo apaga.

## Contrato y tipos de extremo a extremo
La cadena completa: **PostgreSQL → modelos SQLAlchemy → esquemas Pydantic → `openapi.json` → tipos TypeScript →
componentes**. El contrato vive en el backend (`backend/openapi.json`); este repo guarda una copia en
`contract/openapi.json` y genera `src/app/api` con [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen).

```bash
npm run gen:api     # copia ../backend/openapi.json (si está) y regenera src/app/api
npm run check:api   # falla si la copia o el código generado están desactualizados
```

- `src/app/api` **no se edita a mano**: lo genera `npm run gen:api`.
- `core/models` solo tiene alias de esos tipos y las etiquetas en español (`STATUS_LABELS`…). Si el backend cambia
  o quita un campo, el front deja de compilar donde lo usa.
- Elegimos ng-openapi-gen y no openapi-typescript + openapi-fetch porque genera funciones sobre el `HttpClient` de
  Angular: siguen funcionando los interceptores del token, de las pestañas y del modo sin conexión. openapi-fetch usa
  `fetch` y se los saltaría. Es compatible con Angular 16+ (este proyecto usa Angular 21) y su versión 1.1.0 salió
  en septiembre de 2026.

## Validar no es lo mismo que parsear (Zod)
Los tipos de TypeScript se borran al compilar. El propio cliente generado termina así:

```ts
return r as StrictHttpResponse<QuoteOut>;   // src/app/api/fn/cotizaciones/read-quote.ts
```

Ese `as` no comprueba nada: si el backend mandara `"total": "48726478"` (texto), TypeScript seguiría creyendo que es
un número, y `cop(quote.total)` mostraría basura o fallaría lejos de donde está el problema.

- **Validar** es preguntar «¿esto cumple?» y seguir usando el mismo dato sin tipo
  (`if (typeof body.total === 'number') { … body … }`): lo que sigue sigue siendo `any`.
- **Parsear** es transformar un `unknown` en un valor tipado **o** fallar en la frontera. Aquí cada servicio hace
  `api.readQuote(...).pipe(parsed(QuoteSchema, 'la cotización'))`: lo que llega al componente es el **resultado**
  del parseo (sin campos que el contrato no declara), nunca el JSON crudo.

Si la respuesta no cumple el esquema (`core/utils/api.ts`):
1. Se registra en la consola qué campo falló, con la URL: `[contrato] la cotización no cumple el esquema
   (…/quotes/7): ✖ Invalid input → at total`.
2. La pantalla recibe un `ContractError` con el mensaje «El servidor respondió la cotización con un formato
   inesperado. Recarga la página; si sigue pasando, avísanos.» y lo muestra en su estado de error, sin romperse.

Los esquemas están en `core/schemas/api.schemas.ts` y se escriben a mano (usamos `zod/mini`, que pesa 23 kB en el
bundle). No se desalinean del contrato: cada uno pasa por `sameAs<Api.QuoteOut>()(…)`, que **no compila** si el tipo
que produce el esquema no es exactamente el tipo generado desde `openapi.json`. La sesión guardada en `localStorage`
también se parsea, porque ahí puede haber cualquier cosa. Las pruebas están en `core/schemas/api.schemas.spec.ts`.

## gRPC en el navegador (Connect + Protobuf)
En **Cotización → Riesgo**, debajo de la simulación con Web Worker, está **Simulación en el servidor: REST o gRPC**:
- Interruptor **gRPC (Protobuf)** / **REST (JSON)**. Los dos llegan a la misma función de Python.
- Con gRPC la barra avanza con el progreso real que envía el servidor (server streaming). Con REST solo se espera la
  respuesta completa.
- **Cancelar** corta la petición (`AbortSignal`) y el servidor deja de calcular.
- **Comparar los dos** corre ambos con el mismo volumen y muestra el tamaño del mensaje, los bytes por la red
  (Resource Timing, gracias a `Timing-Allow-Origin`), el primer dato y el tiempo total.

El cliente se genera desde el mismo `.proto` del backend:

```bash
npm run gen:proto     # copia ../backend/proto a proto/ y genera src/app/grpc/gen (buf + protoc-gen-es)
npm run check:proto   # falla si la copia o el código generado están desactualizados
```

`core/grpc/server-simulation.service.ts` crea el cliente con `@connectrpc/connect-web`. El JWT viaja como metadata
(`authorization`), y un `UNAUTHENTICATED` cierra la sesión igual que un 401. Las pruebas
(`server-simulation.service.spec.ts`) usan un transporte en memoria: progreso, JWT, sin sesión, cotización ajena,
cancelación y REST. Por qué Connect y no Envoy, las cifras medidas y la tabla REST / GraphQL / gRPC-Web / tRPC
están en el README del backend. Para medir desde la terminal: `scripts/compare-protocols.mts`.

## Configuración
La URL del backend de producción está en `src/app/core/config/api.config.ts` (`PRODUCTION_API`).

## Despliegue
Vercel (preset Angular, salida `dist/cotizador-front/browser`). `vercel.json` redirige las rutas a `index.html` y evita
que se guarden en caché `sw.js` y `shared-worker.js`.

## Estructura
```
src/app/
  api/        cliente y tipos generados desde el contrato (no editar)
  grpc/gen/   cliente gRPC generado desde proto/ (no editar)
  core/grpc/  simulación en el servidor por REST o gRPC
  core/       configuración, modelos, servicios HTTP, utilidades y workers
  core/mocks/ datos e interceptor del modo de prueba (?mock=1)
  core/schemas/ esquemas Zod de las respuestas (parseo en runtime)
  core/auth/  interceptor del token y guards de sesión
  shared/     íconos, panel de IA, notificaciones y estado de la conexión
  features/   auth, dashboard, quotes, quote-new, quote-detail, rates
public/       sw.js y shared-worker.js
src/styles.css  sistema de diseño (tokens, tema oscuro/claro y componentes)
```
