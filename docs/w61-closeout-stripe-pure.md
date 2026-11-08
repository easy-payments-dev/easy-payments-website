# W6.1 — Cierre: Stripe `/pure` (mock sin SDKs)

**Fecha:** 2026-11-08  
**Alcance:** Corrección permanente en fuente local de la librería + retención del parche website mientras se consuma npm 1.1.0.  
**No incluido:** publish npm, deploy del sitio, Git.

---

## Distinción de estados

| Superficie | Versión | ¿Auto-carga `js.stripe.com` al importar? | Notas |
| --- | --- | --- | --- |
| **npm publicado** | `@easy-payments/angular@1.1.0` | **Sí** (limitación original) | Importa `loadStripe` desde entry **default** de `@stripe/stripe-js` |
| **Website (este repo)** | Consume npm `^1.1.0` + **parche local** | **No** | `patches/@easy-payments+angular+1.1.0.patch` → `/pure/index.js` vía `postinstall` / `patch-package` |
| **Librería local** | working tree **1.2.0 unpublished** | **No** | `stripe-sdk.loader.ts` → `@stripe/stripe-js/pure` (entry público). **No publicada** |

La corrección permanente vive en la fuente local de la librería. **No** presentarla como capacidad de npm 1.1.0 ni como release publicado.

---

## 1. Corrección permanente (librería local, no publicada)

**Archivo:** `easy-payments-angular/projects/easy-payments/src/lib/adapters/stripe/stripe-sdk.loader.ts`

```ts
import type { Stripe } from '@stripe/stripe-js'; // types only (erased)
import { loadStripe } from '@stripe/stripe-js/pure'; // public deferred entry
```

- Entry público `/pure` (no rutas internas `dist/...`).
- Tipos desde el paquete principal con `import type` (sin side-effect de runtime).
- Adaptadores reales siguen llamando `StripeSdkLoader.load(publishableKey)` → Stripe.js solo entonces.
- Mock nunca llama `load()`.

**Build verificado:** `dist/easy-payments/fesm2022/...` contiene  
`import { loadStripe } from '@stripe/stripe-js/pure'`.

**Script local:** `easy-payments-angular/scripts/verify-stripe-pure-entry.mjs`  
→ import `/pure` sin script; `loadStripe(pk)` sí inyecta `js.stripe.com`.

---

## 2. Parche del website (mientras npm 1.1.0)

Conservar:

- `patches/@easy-payments+angular+1.1.0.patch`
- `"postinstall": "patch-package"` en `package.json`

El parche usa `@stripe/stripe-js/pure/index.js` (compatible con resolución ESM de Node/Vitest; equivalente al entry público `/pure` en bundlers Angular/Vite).

### Cómo retirar el parche (cuando el sitio adopte una versión publicada con el fix)

1. Publicar (fuera de esta etapa) una versión de `@easy-payments/angular` cuyo FESM importe `@stripe/stripe-js/pure`.
2. En el website, subir la dependencia a esa versión (p. ej. `^1.2.0` o el número real publicado).
3. Borrar `patches/@easy-payments+angular+1.1.0.patch`.
4. Quitar `"postinstall": "patch-package"` **solo si** no quedan otros patches.
5. Opcional: retirar `patch-package` de `devDependencies` si ya no se usa.
6. Ejecutar `npm install` limpio y `npm run verify:mock-network` (estático debe exigir el import `/pure` **sin** depender del archivo de patch).
7. Actualizar `scripts/verify-playground-mock-network.mjs` si el mensaje aún dice “local patch” de forma exclusiva — la aserción del FESM `/pure` sigue siendo válida para la versión publicada.

---

## 3. Comprobaciones

| Check | Resultado |
| --- | --- |
| Librería local `npm run build:lib` | OK — FESM usa `/pure` |
| Librería `npm test` | **910 SUCCESS** |
| `node scripts/verify-stripe-pure-entry.mjs` (lib) | passed — sin auto-load; `loadStripe` diferido sí inyecta |
| Website clean install + patch | Ver sección 4 |
| `verify:mock-network` contra **prod build** servido | Ver sección 4 |

---

## 4. Evidencia clean install + producción

| Paso | Resultado |
| --- | --- |
| Delete `node_modules` + `npm install` | `postinstall` → `@easy-payments/angular@1.1.0 ✔` (patch-package) |
| FESM website | `import { loadStripe } from '@stripe/stripe-js/pure/index.js'` |
| `npm run build:prod` | OK (warning CJS bailout por `/pure/index.js` del patch; la lib local emite `/pure`) |
| Servir `dist/.../browser` (`scripts/serve-prod-browser.mjs` :4173) | OK |
| `PLAYGROUND_BASE_URL=http://localhost:4173 npm run verify:mock-network` | **passed** — 26 requests, **0 payment SDK hits** (load + Klarna mock) |

---

## 5. Pendientes (fuera de esta etapa)

1. **Publish** de la librería con el fix `/pure` (nueva versión npm).
2. Website: bump dependencia + **retirar parche** según la checklist de arriba.
3. No deploy del sitio en este cierre.

---

## Relacionado

- Etapa B: `docs/w61-stage-b-implementation.md`
- Etapa B.1: `docs/w61-stage-b1-stripe-mock.md`
