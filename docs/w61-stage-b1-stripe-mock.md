# W6.1 — Etapa B.1: Eliminar carga de Stripe en mock

**Fecha:** 2026-11-08  
**Alcance:** Conservar Etapa B; eliminar el efecto secundario que descarga `js.stripe.com` al importar `@easy-payments/angular` en modo mock.  
**No incluido:** publish npm, deploy del sitio, Git.

---

## 1. Causa (cadena de imports)

```
Playground → @easy-payments/angular (FESM)
  → import { loadStripe } from '@stripe/stripe-js'   // entry DEFAULT
    → dist/index.js ejecuta en evaluación de módulo:
         Promise.resolve().then(() => getStripePromise())
      → injectScript('https://js.stripe.com/clover/stripe.js')
```

Fuente publicada npm **1.1.0**: `StripeSdkLoader` en el FESM  
(`node_modules/@easy-payments/angular/fesm2022/easy-payments-angular.mjs`, línea de import).

Equivalente en fuente local no publicada:  
`easy-payments-angular/.../adapters/stripe/stripe-sdk.loader.ts`  
→ `import { loadStripe } from '@stripe/stripe-js'`.

Los adaptadores **mock** (`BaseMockAdapter.initialize()` vacío) **no** llaman `loadStripe`.  
La descarga ocurría solo por el **side-effect del entry default** del peer.

---

## 2. Evaluación de opciones

| Opción | Compatible | Decisión |
| --- | --- | --- |
| CSP / bloqueo de red / interceptores | Sí técnicamente | **Rechazada** — oculta el problema |
| Alias bundler website → `/pure` | Angular 22 app builder sin hooks de alias Vite estables | No usada |
| Cambiar librería a `@stripe/stripe-js/pure` + `loadStripe(key)` diferido en adaptadores reales | Correcta arquitectónicamente; API `loadStripe` idéntica | **Elegida** |
| Publicar nueva versión npm de la librería | Fuera de alcance de esta etapa | No |

`@stripe/stripe-js/pure` (v8.11.0 instalada): **no** auto-inyecta; solo carga al invocar `loadStripe(publishableKey)`.  
Los adaptadores reales ya usan `StripeSdkLoader.load(key)` → comportamiento real de Stripe se conserva (carga diferida al montar/pagar con key).

---

## 3. Solución aplicada en este website

**Parche local** (no es un release publicado de la librería):

- Archivo: `patches/@easy-payments+angular+1.1.0.patch`
- Cambio: `from '@stripe/stripe-js'` → `from '@stripe/stripe-js/pure/index.js'`  
  (`/index.js` explícito para resolución ESM de Node/Vitest; equivalente a `/pure` en bundlers)
- Aplicación: `postinstall` → `patch-package`

### Estado de npm 1.1.0 (upstream)

El paquete **publicado** `@easy-payments/angular@1.1.0` en el registry **sigue** importando el entry default y **conserva la limitación** de auto-cargar Stripe.js.  
La corrección de esta etapa es **local al website** (patch) y **no** debe presentarse como capacidad publicada de npm 1.1.0.

Fix canónico para el próximo release de la librería (referencia; no publicado):

```ts
// stripe-sdk.loader.ts
import { loadStripe, type Stripe } from '@stripe/stripe-js/pure';
```

---

## 4. Comprobación de red

Script: `npm run verify:mock-network` → `scripts/verify-playground-mock-network.mjs`

1. **Estático:** FESM parcheado importa `/pure`; entry default vs pure sanity-check.
2. **Browser (Playwright):** navega `/playground`, selecciona Klarna, paga mock; falla si hay requests a hosts de SDKs (`js.stripe.com`, PayPal SDK, Google Pay, Klarna payments, Affirm JS).  
   Marks SVG CDN (paypalobjects / klarnacdn / affirm images) están **permitidos** (assets de marca, no SDKs).

Tests Vitest: `playground-mock-sdk.spec.ts` — mount mock sin script Stripe; `loadStripe` de `/pure` sí inyecta bajo demanda (regresión de integración real diferida).

---

## 5. Evidencia / checks (ejecutados)

| Check | Resultado |
| --- | --- |
| `npm run test:ci` | **88/88 passed** (incluye `playground-mock-sdk.spec.ts`) |
| `npm run verify:mock-network` | **passed** — patched import OK; browser: **48 requests, 0 payment SDK hits** tras load + Klarna mock pay |
| Klarna mock | Sin `js.stripe.com` / sin script Stripe en DOM |
| npm 1.1.0 sin patch | **Limitación upstream intacta** — solo el patch local del website la mitiga |

---

## 6. Cierre posterior

Corrección permanente en fuente local de la librería (1.2.0 unpublished) +
checklist para retirar el parche: ver `docs/w61-closeout-stripe-pure.md`.

## 7. Detener para revisión

Etapa B.1 documentada. Sin publish npm ni deploy.
