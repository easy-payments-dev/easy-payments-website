# W6.1 — Etapa A: Auditoría técnica y visual

**Fecha:** 2026-11-08  
**Alcance:** Solo auditoría (sin cambios funcionales).  
**Repos inspeccionados:** `easy-payments-website`, referencia de solo lectura `easy-payments-angular` (working tree local `1.2.0` no publicado).

---

## 1. Resumen de hallazgos

1. **El Playground del sitio no renderiza el componente real** `@easy-payments/angular`. Es una **simulación visual propia del website** (`playground.page.html`), etiquetada explícitamente como *Visual simulation* / *DEMO · Simulated checkout*. Evidencia de runtime: snapshot en `http://127.0.0.1:4200/playground`.

2. **La forma más directa de fidelidad Full Checkout** es montar `<easy-payments>` con `provideEasyPayments({ enableMockMode: true, ... })` y `MockPaymentController`. En mock mode, `AdapterFactory` usa `*MockAdapter` (`adapter.factory.ts`); `BaseMockAdapter.initialize()` **no carga SDKs** y los resultados llevan metadata `mock: true` y mensajes `[DEMO]`.

3. **Buttons Only y Headless existen en el código local 1.2.0** (`EasyPaymentButtonsComponent`, `EasyPaymentsHeadless` en `public-api.ts`), con demo real en `projects/demo`. **No existen en npm 1.0.0 / 1.1.0** (confirmado por `historical-api.evidence.ts` y `HISTORICAL_ABSENT_IN_1_0_AND_1_1`). **Sin discrepancia** con el contexto W4.1/W5.

4. **Logos:** la librería ya centraliza presentación oficial en `payment-method-presentation.ts` (Apple/Google bundled data-URI; PayPal/Klarna/Affirm CDN; Card genérico). El Playground del sitio **solo muestra marks locales para Apple/Google**; PayPal/Klarna/Affirm aparecen como texto/`method` id sin mark. Homepage sí usa CDN para PayPal/Klarna/Affirm.

5. **i18n de la librería (checkout):** solo `en` | `es` | `pt` (+ `auto`). **Français no está implementado** (`locale-resolver` mapea `fr` → `en`). El **sitio web no tiene selector de idioma ni catálogo de traducciones**; `html lang="en"` fijo.

6. **Simulaciones de proveedor:** la librería ya ofrece paneles mock (`easy-mock-method-panel`) y outcomes reales (`easy-checkout-outcome`). El Playground del sitio usa botones externos “Simulate success/cancel/error” y un shell simplificado — no el flujo in-panel de la librería.

7. **Validación visual:** verificada en desktop (tema dark del sitio) y viewport móvil (~390×844). El preview no replica tipografía/tiles/outcomes del componente real. Capturas: `w61-playground-desktop.png`, `w61-playground-mobile.png` (sesión de auditoría).

---

## 2. Tabla de funcionalidad: publicada / local / pendiente

| Capacidad | Publicada npm 1.0.0 | Publicada npm 1.1.0 | Local angular 1.2.0 (unpublished) | Sitio (Playground) |
| --- | --- | --- | --- | --- |
| Full Checkout `<easy-payments>` | Sí | Sí | Sí | **No** (simulación website) |
| `locale` / `translations` | No | Sí (`en`/`es`/`pt`/`auto`) | Sí | Control UI + codegen 1.1.0 only; no traduce el site |
| Buttons Only `<easy-payment-buttons>` | No | No | Sí (completo + specs + demo) | No (1.2.0 disabled) |
| Headless `EasyPaymentsHeadless` | No | No | Sí (session API + recoverReturn) | No |
| `visualStyle` / `checkoutInstanceId` / `started` | No | No | Sí (1.2.0) | Correctamente omitidos |
| `enableMockMode` + `MockPaymentController` | Sí (docs 1.0/1.1) | Sí | Sí | No integrado |
| Samsung Pay | No | No | No (explícitamente no soportado) | No |
| Site-wide language switcher | N/A | N/A | N/A | **No existe** |
| Français (checkout o site) | No | No | No | No |

**Evidencia publicada:**  
`src/app/core/docs/historical-api.evidence.ts` (`hasButtonsOnly: false`, `hasHeadless: false`, `HISTORICAL_ABSENT_IN_1_0_AND_1_1`).

**Evidencia local 1.2.0:**  
`easy-payments-angular/projects/easy-payments/package.json` → `"version": "1.2.0"`; exports en `projects/easy-payments/src/public-api.ts`; demo en `projects/demo/src/app/app.html`.

---

## 3. Comparación Playground vs componente real

### Qué renderiza el sitio hoy
- Archivos: `src/app/features/playground/playground.page.{ts,html,scss}`
- Shell propio: producto + grid de botones de métodos + acciones Simulate + event log
- **No** importa `@easy-payments/angular` (ausente de `package.json` / `node_modules`)

### Componente real Full Checkout
- Template: `easy-payments-angular/.../easy-payments.component.html`
- Estructura: header (`checkoutTitle`/`checkoutSubtitle`) → `easy-checkout-product-summary` → `easy-payment-method-selector` / tiles → paneles provider o `easy-mock-method-panel` → `easy-checkout-outcome`
- Marks: `payment-method-icon` + `getPaymentMethodPresentation`
- Estados: processing / success / error / cancelled con UI de outcome real

### Diferencias observadas (fidelidad)

| Aspecto | Librería | Playground sitio |
| --- | --- | --- |
| Estructura | Header + summary + selector + panel detalle | Summary + grid plano + botones Simulate fuera de flujo |
| Tiles/métodos | Marks oficiales + labels i18n; alineación fija de marks | Solo Apple/Google con SVG local; labels = ids (`card`, `paypal`…) |
| Outcomes | `easy-checkout-outcome` (iconos, copy i18n, Continue/Try again) | Texto simplificado “Payment succeeded (simulated)” |
| Theme checkout | Tokens `--ep-*` del componente | Shell blanco/oscuro parcial; no es el skin EP |
| Mock flow | CTA in-panel + `MockPaymentController` outcomes | Tres botones externos success/cancel/error |
| Loading | Spinner en mock panel / processing outcome | No hay estado processing en preview |
| Accesibilidad | aria labels i18n del componente | Controles del playground OK; preview menos semántica que EP |

### Camino recomendado (sin inventar API)
1. Añadir dependencia **publicada** `@easy-payments/angular@1.1.0` (o path local etiquetado RC para demos 1.2.0).
2. `provideEasyPayments({ enableMockMode: true, providers: { /* placeholders no secretos */ } })`.
3. Renderizar `<easy-payments [product] [methods] theme appearance …>` en el panel Preview.
4. Controles del playground → inputs del componente; event log ← `(success)/(cancel)/(error)/(successContinue)`.
5. Usar `MockPaymentController.setOutcome(...)` para demos de éxito/cancel/error **sin** botones inventados que simulen UI de proveedor.
6. Mantener banner DEMO y copy de no-fulfillment.

**Garantías mock:** `BaseMockAdapter.initialize()` vacío; resultados `metadata.mock === true`; mensajes `[DEMO] … No real payment was processed.`

---

## 4. Inventario de logos y assets

| Método | Asset actual (sitio) | Ubicación | Procedencia verificable | Uso librería | Problemas | Ajuste recomendado |
| --- | --- | --- | --- | --- | --- | --- |
| Card | Texto “Card” / genérico | Homepage: `method-card__generic`; Playground: sin mark | Genérico EP (no brand network) | SVG genérico en `payment-method-icon` | OK como genérico | Reutilizar icono genérico de la librería si se monta el componente |
| Apple Pay | `apple-pay-mark.svg` | `public/payment-marks/` + playground | Apple Pay Mark ZIP (`SOURCES.md`) | Data-URI oficial bundled | Alineación playground distinta a EP tiles | Preferir marks de la librería / mismos SVG |
| Google Pay | `google-pay-mark.svg` | `public/payment-marks/` | Google Pay Acceptance ZIP | Data-URI oficial bundled | Idem | Idem |
| PayPal | CDN homepage; **null en playground** | `payment-methods.ts` CDN; playground types `markSrc: null` | paypalobjects.com | CDN en `payment-method-presentation.ts` | Playground muestra texto/`paypal` sin logo | Alinear con CDN oficial de la librería o marks del componente |
| Klarna | CDN homepage; **null en playground** | Klarna CDN | `x.klarnacdn.net/.../klarna.svg` | Mismo CDN | Playground sin badge | Usar badge oficial Klarna (como librería) |
| Affirm | CDN homepage (black); **null en playground** | Affirm CDN | cdn-assets.affirm.com | Light/dark CDN | Playground sin logo; dark Affirm no contemplado en site sim | Usar assets Affirm light/dark según tema checkout |
| Samsung Pay | N/A (unsupported) | Homepage footnote | N/A | No soportado | No inventar mark | Mantener “Not supported” |

Fuentes sitio: `public/payment-marks/SOURCES.md`, `src/app/data/payment-methods.ts`, `playground.types.ts`.  
Fuentes librería: `projects/easy-payments/src/lib/branding/payment-method-presentation.ts`, `official-mark-data.ts`, `assets/payment-methods/SOURCES.md`.

---

## 5. Matriz de idiomas y cobertura

### Locales del componente (librería)
| Locale | Estado | Evidencia |
| --- | --- | --- |
| `auto` | Implementado | `locale.types.ts` |
| `en` | Diccionario completo | `i18n/en.ts` |
| `es` | Diccionario completo | `i18n/es.ts` |
| `pt` | Diccionario completo (mapeos pt-BR a Stripe/PayPal) | `i18n/pt.ts`, `provider-locale.ts` |
| `fr` / Français | **No implementado** (fallback a `en`) | `locale-resolver.spec.ts` espera `fr` → `en` |

### Cobertura del sitio web
| Área | Cobertura i18n |
| --- | --- |
| Nav / footer / homepage / docs | Inglés hardcodeado |
| Playground UI / errores / simulaciones | Inglés hardcodeado |
| Control `locale` playground | Solo afecta codegen + `Intl` del preview; **no** traduce strings del site ni monta i18n EP |
| `document.documentElement.lang` | Fijo `en` en `src/index.html` |
| Metadatos SEO | Inglés |

### Estrategia propuesta (compatible, sin nueva dependencia en Etapa A)
1. **Separar** `siteLanguage` (chrome del website) vs `checkoutLocale` (`EasyPaymentsLocale` del componente).
2. Catálogo ligero propio del sitio (JSON/TS records) para `en`/`es`/`pt` — **no** añadir ngx-translate u otra lib en esta fase.
3. Preferencia: `localStorage` + detección `navigator.language` + fallback `en`.
4. Selector en header; al cambiar: actualizar strings del site + `lang` del documento + (si hay componente real) `[locale]` del checkout.
5. **No traducir** nombres de APIs, snippets de código, paths, identificadores de métodos en codegen.
6. Français: **fuera de alcance** hasta existir diccionario en la librería **o** decisión explícita de site-only FR (no sincronizable con checkout).

---

## 6. Viabilidad Full Checkout / Buttons Only / Headless

### Full Checkout (prioridad)
- **Viable y recomendado** con paquete **publicado 1.1.0** + `enableMockMode: true`.
- Fidelidad máxima a UI real, marks, outcomes, i18n checkout.
- Impacto: nueva dependencia npm publicada; lazy route playground; providers en playground module/page.

### Buttons Only (1.2.0 local)
- **Existe y está maduro** en working tree (`easy-payment-buttons.component.*`, specs extensos, demo).
- **No publicable como “published API”** hasta npm 1.2.0.
- Viabilidad en sitio: preview etiquetado **“Angular 1.2.0 unpublished / RC — local package”** vía:
  - `file:../easy-payments-angular/dist/easy-payments` o path workspace, **o**
  - build artifact local documentado.
- Debe renderizar `<easy-payment-buttons>` real (diseños mock strip/expand oficiales), no un invento.

### Headless (1.2.0 local)
- **Existe** `EasyPaymentsHeadless.createSession(...)` + mounts + `recoverReturn` (Klarna/Affirm).
- Demo de referencia: `projects/demo` experience `headless`.
- En el sitio: solo tiene sentido como **demo merchant-owned UI** que llama a la API headless real en mock mode — **no** una simulación aislada etiquetada como Headless.
- Misma restricción de etiquetado unpublished.

### Cómo consumir 1.2.0 local sin sugerir publicación
- Selector de experiencia: Published Full Checkout (1.1.0 npm) vs Preview 1.2.0 (local) disabled-by-default o badge **Unpublished**.
- Documentación/robots ya bloquean `/docs/angular/1.2.0`.
- No listar 1.2.0 en sitemap como docs publicadas.
- README del playground: “sourced from local workspace build, not npm”.

---

## 7. Propuesta de simulación Klarna

### Distinción requerida
| Tipo | Descripción | Etapa B |
| --- | --- | --- |
| **A. Simulación local** | `enableMockMode` + `KlarnaMockAdapter` + UI `easy-mock-method-panel` / outcome EP | **Sí — recomendado** |
| **B. Sandbox oficial** | Stripe TEST + Klarna Payment Element real, backend, credenciales | **No en W6.1** |

### Diseño propuesto (Tipo A)
1. Preview = componente real en mock mode; método `klarna` seleccionado.
2. Banner persistente: “Easy Payments demo — no payment is processed.”
3. Hint i18n librería: `demoCheckoutHint`.
4. Controles playground: `MockPaymentController.setOutcome('success'|'cancelled'|'failed')` + opcional delay.
5. Event log: solo outputs públicos verificados (`success`/`cancel`/`error`/`successContinue`).
6. **No** imitar ventana/UI oficial Klarna; **no** pedir PII/PAN.
7. Teclado/foco: heredar del componente EP (CTA mock + outcomes).

---

## 8. Plan concreto — W6.1 Etapa B (implementación)

Orden sugerido y archivos afectados (solo website, salvo consumo path documentado):

| # | Trabajo | Archivos típicos | Criterios de aceptación |
| --- | --- | --- | --- |
| B1 | Dependencia publicada `@easy-payments/angular@1.1.0` + peer `@stripe/stripe-js` (mock no carga Stripe, pero peer puede ser requerido) | `package.json` | Install limpio; sin secret keys |
| B2 | Providers mock-only en Playground | `playground.page.ts` / `app.config` scoped | `enableMockMode: true`; cero network payment |
| B3 | Sustituir shell simulado por `<easy-payments>` | `playground.page.html/scss` | Preview = componente real; banner DEMO |
| B4 | Cablear config UI → inputs; eventos → log | `playground.page.ts` | Cambios de theme/methods/locale reflejados; eventos verificados |
| B5 | `MockPaymentController` UI (success/cancel/fail) | playground controls | Reemplaza Simulate* genéricos o los mapea al controller |
| B6 | Alinear marks homepage/playground con presentation EP | `payment-methods.ts`, assets | PayPal/Klarna/Affirm visibles y oficiales |
| B7 | Preview Buttons Only / Headless **opcional**, gated unpublished | nueva sección + path 1.2.0 local | Badge Unpublished; no en sitemap docs |
| B8 | Site i18n `en`/`es`/`pt` (sin FR) | header, diccionarios site, `lang` | Preferencia persistida; sync `checkoutLocale` |
| B9 | Tests + a11y + build | specs playground, `test:ci`, `build:prod` | 0 regresiones; sin llamadas provider |

**Fuera de Etapa B:** publicar 1.2.0, sandbox Klarna, Français en librería, React/Vue/Svelte.

---

## 9. Bloqueos y puntos no verificados

| Ítem | Estado |
| --- | --- |
| Comparación pixel-perfect lado a lado con demo angular en vivo | **No verificada** (demo angular no levantada en esta sesión; se usaron templates/specs/docs assets) |
| Comportamiento exacto de CDN marks con CSP del sitio en producción | Parcial (headers permiten `img-src https:`) |
| Peer `@stripe/stripe-js` impacto de bundle en playground mock-only | No medido aún |
| Path linking a `dist` local 1.2.0 en CI Windows | No probado en Etapa A |
| Français | Confirmado ausente; no auditar como “casi listo” |
| Samsung Pay assets | N/A — no soportado |

### Validación visual realizada
- Ruta: `/playground`
- Condiciones: site theme Dark; checkout theme control `system`; Angular 1.1.0; métodos todos checked
- Desktop + mobile emulation 390×844
- Tras seleccionar `card` + Simulate success → outcome “Payment succeeded (simulated)” + event `success` (confirma simulación website, no EP outcome)

---

## Confirmaciones de proceso Etapa A

- Sin cambios funcionales de producto (solo este informe en `docs/`).
- Sin publicación npm, deploy, DNS ni edits en `easy-payments-angular`.
- Sin Git commands en esta etapa de auditoría.
- **STOP — Etapa A completa.** Esperar revisión antes de Etapa B.
