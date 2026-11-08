# W6.1 — Etapa B: Playground real e idiomas del website

**Fecha:** 2026-11-08  
**Alcance:** Sustituir la simulación del Playground por `@easy-payments/angular@1.1.0` en mock mode; añadir selector de idioma del sitio (en/es/pt); etiquetar demos 1.2.0 como unpublished.  
**No incluido:** publish npm, deploy del sitio, Git.

---

## 1. Verificación de dependencia publicada (1.1.0)

Inspección de `node_modules/@easy-payments/angular@1.1.0` (`package.json` + `types/easy-payments-angular.d.ts` + FESM):

| Capacidad | ¿En npm 1.1.0? | Notas |
| --- | --- | --- |
| `EasyPaymentsComponent` (`<easy-payments>`) | Sí | Full Checkout |
| `provideEasyPayments` + `enableMockMode` | Sí | Mock adapters; sin cargos |
| `MockPaymentController` / `MockPaymentOutcome` | Sí | `success` \| `cancelled` \| `failed` |
| `EasyPaymentsLocale` (`auto`/`en`/`es`/`pt`) | Sí | Sin Français |
| Logos / presentación oficial | Sí | Bundled + CDN en la librería |
| `<easy-payment-buttons>` / Buttons Only | **No** | Solo local 1.2.0 |
| `EasyPaymentsHeadless` | **No** | Solo local 1.2.0 |

**Bloqueo de dependencia:** ninguno para Full Checkout mock + i18n del componente.  
**No** se cambió a path local 1.2.0. Peer `@stripe/stripe-js` instalado (requerido por el package; mock no lo inicializa).

---

## 2. Cambios implementados

### Playground real (mock)
- Dependencia: `@easy-payments/angular@^1.1.0` + `@stripe/stripe-js`.
- Providers: `providePlaygroundEasyPayments()` → `provideEasyPayments({ enableMockMode: true, providers: {} })` en `app.config.ts`.
- Preview monta `<easy-payments>` con product/methods/theme/appearance/maxWidth/successBehavior/locale.
- Outcomes vía `MockPaymentController.setOutcome` (control del playground).
- Event log desde outputs públicos: `success` / `cancel` / `error` / `successContinue`.
- Banner DEMO + alertas de “no payment processed”.
- Sin shell de checkout inventado; UI/marks vienen de la librería.
- Klarna: flujo mock real in-panel de la librería; etiquetado como demostración simulada (no sandbox oficial).

### Idiomas del website
- `SiteI18nService` + catálogos `en` / `es` / `pt` (sin Français).
- Selector visible en header (desktop + menú móvil).
- Persistencia `localStorage` (`ep-site-language`); `document.documentElement.lang` sincronizado.
- Traduce nav, footer, controles del Playground y CTA playground del home.
- Locale del checkout: si playground `locale === 'auto'`, sincroniza con el idioma del sitio.

### Unpublished 1.2.0
- Panel informativo Buttons Only + Headless con badge **Unpublished — local 1.2.0**.
- No se montan; no se presentan como capacidades de npm 1.1.0.
- Codegen sigue limitado a APIs publicadas (evidencia histórica W4/W5).

### SEO / copy
- Títulos/descripciones del playground actualizados de “simulation” → “mock demo” / componente real en mock mode.

---

## 3. Archivos clave

| Área | Ruta |
| --- | --- |
| i18n | `src/app/core/i18n/site-*.ts` |
| Providers EP | `src/app/features/playground/playground.providers.ts` |
| Playground | `src/app/features/playground/playground.page.{ts,html,scss}` |
| Header lang | `src/app/core/layout/site-header/*` |
| Footer i18n | `src/app/core/layout/site-footer/*` |
| App init | `src/app/app.ts`, `src/app/app.config.ts` |

---

## 4. Validación (ejecutada)

| Chequeo | Resultado |
| --- | --- |
| Unit tests | **86/86 passed** (`npm run test:ci`) |
| Typecheck | **OK** (`npm run typecheck`) |
| Historical playground API | **OK** (`npm run verify:playground-api` 1.0.0 + 1.1.0) |
| Desktop | Preview monta `<easy-payments>`; badges “Live component · mock mode”; panel Unpublished 1.2.0 |
| Móvil ~390×844 | Layout apilado; idioma/tema vía menú hamburguesa; checkout usable |
| Tres idiomas | en / es / pt en nav, playground y checkout (`locale=auto` sync); `localStorage` conserva tras reload |
| Temas checkout | Controles light/dark/system + appearance default/transparent cableados al componente |
| Mock outcomes | `MockPaymentController` success/cancelled/failed; Klarna → `[DEMO] Mock klarna payment completed…` |
| SDKs de pago en flujo mock | Adaptadores mock **no** llaman `loadStripe` / PayPal / Google Pay / Klarna payments SDK; **no hay cargos** |
| Français | No ofrecido |

### Evidencia runtime Klarna mock
- Selección Klarna → panel “Demo checkout — no real payment is processed.”
- Pay → outcome “Payment successful” + event log `Mock success · klarna · [DEMO] … No real payment was processed.`
- No se abrió ventana/sandbox oficial de Klarna.

### Red / scripts observados al montar mock
| Recurso | Tipo | ¿SDK de cobro? |
| --- | --- | --- |
| Marks PayPal / Klarna / Affirm (CDN SVG) | Brand assets de la librería | No |
| `https://js.stripe.com/clover/stripe.js` | Con npm 1.1.0 **sin** patch: auto-inyectado por entry default del peer. **Tras Etapa B.1** (patch local → `/pure`): **0 hits** en `verify:mock-network` | Mitigado localmente; upstream 1.1.0 sigue afectado |
| PayPal JS SDK / Google Pay / Klarna payments SDK | No observados | — |

---

## 5. Limitaciones conocidas

1. **Live binary siempre 1.1.0** aunque el selector de codegen esté en 1.0.0 (snippets históricos).
2. **Buttons Only / Headless** solo panel informativo “Unpublished — local 1.2.0”; no montados.
3. **Home/marketing** (hero, docs, security, frameworks) permanece mayormente en inglés; i18n cubre nav, footer, playground y CTA playground del home.
4. **Peer `@stripe/stripe-js` (entry no-`pure`)**: en npm 1.1.0 upstream, al importar la librería el peer auto-inyecta Stripe.js. **Mitigado en el website (Etapa B.1)** con patch local → `@stripe/stripe-js/pure/index.js` (ver `docs/w61-stage-b1-stripe-mock.md`). Upstream publicado sigue con la limitación.
5. **CDN de marks** (PayPal/Klarna/Affirm) se solicitan desde la presentación oficial de la librería.
6. **Français** ausente a propósito.

---

## 6. Detener para revisión

Etapa B lista para revisión humana. No se publicó npm ni se desplegó el sitio.
