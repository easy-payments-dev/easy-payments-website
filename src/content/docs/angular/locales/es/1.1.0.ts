import { DocsLocaleBundle } from '../types';

export const angular110Es: DocsLocaleBundle = {
  'getting-started': {
    title: 'Primeros pasos',
    description: 'Qué es Easy Payments, requisitos y cómo empezar.',
    groupTitle: 'Primeros pasos',
    markdown: `# Primeros pasos

Easy Payments para Angular (\`@easy-payments/angular\` **1.1.0**) es una **librería de integración** de código abierto para un checkout con múltiples proveedores.

Ayuda a tu aplicación Angular a presentar Card, PayPal, Apple Pay, Google Pay, Klarna y Affirm usando **tus** cuentas de comercio.

## Qué es

- Una API de componente standalone de Angular sobre los SDK de los proveedores
- Eventos normalizados de éxito / cancelación / error para la experiencia de usuario
- Modo mock opcional para demos locales sin cargos reales

## Qué no es

- No es un procesador de pagos
- No es un banco ni un proveedor de billeteras
- No sustituye la verificación en el backend ni los webhooks
- **No** mueve dinero ni retiene fondos

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| Angular | \`>=20.3.0 <23.0.0\` |
| Paquete | \`@easy-payments/angular@1.1.0\` |
| Stripe JS | Peer \`@stripe/stripe-js\` (\`^8.0.0\` según la guía de peers publicada) |
| Backend | Endpoints HTTPS bajo tu control para los flujos de creación/captura/confirmación |

Las instalaciones de consumidor se validaron en Angular **20**, **21** y **22** con pruebas de humo en modo mock.

## Publicado vs no publicado

| Superficie | Dónde |
|------------|-------|
| **Full Checkout** \`<easy-payments>\` | npm publicado **1.1.0** (este conjunto de documentación) |
| **Buttons Only** / **Headless** | **1.2.0** local no publicado: prueba el [Playground](/playground); todavía no está en npm |

Consulta [Modos de checkout](./checkout-modes). Preguntas frecuentes: [FAQ](/faq).

> **Nota de 1.1.0:** Verificado con \`@easy-payments/angular@1.1.0\`. Los inputs de localización \`[locale]\` / \`[translations]\` están presentes en este paquete publicado. Consulta [Localización](./localization).

## Prueba el playground del sitio web

Usa el [Angular Checkout Playground](/playground) para previsualizar **Full Checkout**, **Buttons Only** y **Headless** en modo mock y luego copiar fragmentos de npm **publicados** (1.0.0 / 1.1.0). El playground nunca procesa pagos.

## Siguientes pasos

1. [Instalación](./installation)
2. [Inicio rápido](./quick-start): primer checkout en modo mock
3. [Modos de checkout](./checkout-modes)
4. [Configuración](./configuration)
5. [Seguridad](./security)
`,
  },
  'installation': {
    title: 'Instalación',
    description: 'Instala el paquete publicado de Angular y sus peers.',
    groupTitle: 'Primeros pasos',
    markdown: `# Instalación

Instala el paquete publicado y el peer Stripe.js:

\`\`\`bash
npm install @easy-payments/angular@1.1.0 @stripe/stripe-js
\`\`\`

## Dependencias peer

| Paquete | Rango |
|---------|-------|
| \`@angular/core\` | \`>=20.3.0 <23.0.0\` |
| \`@angular/common\` | \`>=20.3.0 <23.0.0\` |
| \`@stripe/stripe-js\` | \`^8.0.0\` |

## Providers de la aplicación

Easy Payments es **solo standalone** (sin NgModule). Registra HTTP y Easy Payments en la configuración de tu aplicación:

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        stripe: { publishableKey: 'pk_test_your_key' },
        // Add PayPal / wallets / BNPL only when configured
      },
      // enableMockMode: true // local demos only — never in production
    }),
  ],
};
\`\`\`

## Credenciales

| Permitido en Angular | Nunca en Angular |
|----------------------|------------------|
| Clave **publicable** de Stripe (\`pk_test_\` / \`pk_live_\`) | Clave **secreta** de Stripe (\`sk_\`) |
| **Client ID** de PayPal | **Client Secret** de PayPal |
| Nombres públicos del comercio | Secretos de webhook (\`whsec_\`) |
| Las URLs HTTPS de tu backend | Tokens de acceso / claves privadas |

Consulta [Seguridad](./security).
`,
  },
  'quick-start': {
    title: 'Inicio rápido',
    description: 'Instala la 1.1.0 publicada, activa el modo mock y renderiza tu primer Full Checkout.',
    groupTitle: 'Primeros pasos',
    markdown: `# Inicio rápido

**Paquete objetivo:** \`@easy-payments/angular@1.1.0\` publicado (npm).
Esta guía usa **Full Checkout** (\`<easy-payments>\`) con \`enableMockMode\` para que puedas completar una primera demo sin cargos reales.

> Buttons Only y Headless **no** están en npm 1.1.0. Se incluyen en la **1.2.0** local no publicada y se previsualizan en el [Playground](/playground). Consulta [Modos de checkout](./checkout-modes).

## 1. Instalar

\`\`\`bash
npm install @easy-payments/angular@1.1.0 @stripe/stripe-js
\`\`\`

Peers: Angular \`>=20.3.0 <23.0.0\`, \`@stripe/stripe-js\` \`^8.0.0\`. Las pruebas de humo verificadas de consumidor cubren Angular **20**, **21** y **22**.

## 2. Registrar providers (mock)

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      // Mock adapters — no real charges. Never enable in production.
      enableMockMode: true,
      providers: {},
    }),
  ],
};
\`\`\`

Para una integración real con Stripe en modo TEST más adelante, añade \`providers.stripe.publishableKey\` (\`pk_test_...\`) y tus URLs HTTPS en \`backend\`. Mantén las claves **secretas** solo en el servidor; consulta [Seguridad](./security).

## 3. Montar Full Checkout

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
} from '@easy-payments/angular';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [EasyPaymentsComponent],
  template: \`
    <easy-payments
      [product]="product"
      [methods]="methods"
      theme="system"
      locale="auto"
      (success)="onSuccess($event)"
      (cancel)="onCancel($event)"
      (error)="onError($event)"
    />
  \`,
})
export class CheckoutComponent {
  readonly product: PaymentProduct = {
    id: 'premium',
    name: 'Premium Plan',
    description: 'Mock checkout example',
    amount: 99, // major units ($99.00)
    currency: 'USD',
    quantity: 1,
  };

  /** Allow-list and display order — controlled by you. */
  readonly methods: PaymentMethod[] = [
    'card',
    'paypal',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
  ];

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification
  }

  onCancel(result: PaymentResult): void {}

  onError(error: PaymentError): void {}
}
\`\`\`

## 4. Qué controlas tú y qué aporta la librería

| Tú configuras | La librería aporta (Full Checkout) |
|---------------|------------------------------------|
| Nombre del producto, importe (unidades mayores), moneda, cantidad | Estructura del checkout, interfaz de la lista de métodos, marcas de proveedores |
| Lista de métodos permitidos y orden | Eventos normalizados \`success\` / \`cancel\` / \`error\` |
| \`theme\` (\`light\` \\| \`dark\` \\| \`system\`) y \`locale\` | Textos del checkout integrados en en / es / pt (1.1.0) |

## Resultados mock

Inyecta \`MockPaymentController\` para forzar \`success\`, \`cancelled\` o \`failed\` antes de pagar. Detalles: [Modo mock](./mock-mode).

Klarna en modo mock es un flujo **DEMO** de los adaptadores de la librería, no un checkout alojado oficial de Klarna. Pruébalo en el [Playground](/playground).

## Siguiente

- [Configuración](./configuration): proveedores reales y URLs del backend
- [Modos de checkout](./checkout-modes): Full vs Buttons Only vs Headless
- [Métodos de pago](./payment-methods): estado real / sandbox / mock
- [Referencia de la API](./api-reference) · [Ejemplos](./examples)
`,
  },
  'checkout-modes': {
    title: 'Modos de checkout',
    description: 'Compara Full Checkout, Buttons Only y Headless: qué se publica en npm frente a la 1.2.0 local.',
    groupTitle: 'Primeros pasos',
    markdown: `# Modos de checkout

Easy Payments ofrece tres formas de integración. **La 1.1.0 publicada en npm** incluye solo Full Checkout. **Buttons Only** y **Headless** están disponibles en la **1.2.0** local no publicada (el Playground de este sitio web) y no se pueden instalar desde npm hasta que se publique la 1.2.0.

| Modo | Superficie del paquete | Quién controla la interfaz | Cuándo usarlo | Demo |
|------|------------------------|----------------------------|---------------|------|
| **Full Checkout** | npm **1.1.0** (\`<easy-payments>\`) | Librería | Camino más rápido: resumen del pedido + métodos + estructura de confirmación | [Playground → Full Checkout](/playground) |
| **Buttons Only** | **1.2.0** no publicada (\`<easy-payment-buttons>\`) | Franja de la librería + panel expandible compartido | Integrar una franja de pago compacta sin la estructura completa del checkout | [Playground → Buttons Only](/playground) |
| **Headless** | **1.2.0** no publicada (\`EasyPaymentsHeadless\`) | **Tú** | Diseño personalizado; la librería monta las superficies de los proveedores en tus contenedores | [Playground → Headless](/playground) |

## Full Checkout (publicado)

- Selector: \`<easy-payments>\`
- Interfaz de la librería: resumen del producto, selección de método, estados de confirmación / éxito
- Tú pasas: \`product\`, \`methods\` (orden), \`theme\`, \`appearance\`, \`maxWidth\`, \`successBehavior\`, \`locale\` / \`translations\` (1.1.0)
- Empieza aquí: [Inicio rápido](./quick-start)

## Buttons Only (no publicado — 1.2.0)

- Selector: \`<easy-payment-buttons>\`
- Interfaz de la librería: franja compacta de métodos (botones oficiales de billeteras cuando corresponda), expansión compartida para tarjeta / BNPL
- Tú pasas: \`product\`, \`methods\`, \`layout\` (\`vertical\` \\| \`horizontal\`), \`theme\`, \`locale\`, tokens de apariencia opcionales
- **No** está en npm \`@easy-payments/angular@1.1.0\`

## Headless (no publicado — 1.2.0)

- API: \`EasyPaymentsHeadless.createSession(...)\` y luego \`mount\` / \`confirm\`
- **Sin** diseño de checkout de la librería: tu aplicación controla la estructura, las etiquetas y el diseño
- Úsalo cuando necesites control visual total y aun así quieras usar los adaptadores de Easy Payments
- La demo Headless del Playground es explícitamente una **interfaz de ejemplo creada por el consumidor**

## Cómo elegir rápido

1. Necesitas una página de checkout completa para mañana → **Full Checkout** (1.1.0).
2. Necesitas una franja dentro de una interfaz de carrito existente → **Buttons Only** (espera a npm 1.2.0 o prueba el Playground).
3. Necesitas un diseño totalmente personalizado → **Headless** (igual).

Los tres modos de este sitio web funcionan con \`enableMockMode\`: no se mueve dinero. Consulta [Modo mock](./mock-mode) y la [FAQ](/faq).
`,
  },
  'configuration': {
    title: 'Configuración',
    description: 'Providers, URLs del backend y opciones del checkout.',
    groupTitle: 'Configuración',
    markdown: `# Configuración

Configura Easy Payments una sola vez con \`provideEasyPayments\`. El **consumidor** siempre controla los precios del producto, la moneda, la lista de métodos permitidos y su orden, el tema y el idioma; la librería no inventa precios de catálogo.

## Entradas del checkout controladas por el consumidor

| Aspecto | Cómo |
|---------|------|
| Producto / precio / moneda | \`[product]\` (\`amount\` en **unidades mayores**) |
| Conjunto y orden de métodos | Orden del array \`[methods]\` |
| Tema | \`theme="light" \\| "dark" \\| "system"\` |
| Idioma (1.1.0) | \`locale="auto" \\| "en" \\| "es" \\| "pt"\` (+ \`translations\` opcional) |
| Ancho / apariencia del contenedor | \`maxWidth\`, \`appearance\` |

Consulta también [Temas](./theming) y [Localización](./localization).

## EasyPaymentsConfig

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    paypal: { clientId: 'your-paypal-client-id', currency: 'USD', intent: 'capture' },
    applePay: { merchantName: 'Your Store', countryCode: 'US' },
    googlePay: {
      merchantName: 'Your Store',
      environment: 'TEST',
      countryCode: 'US',
    },
    klarna: { purchaseCountry: 'US' },
    affirm: { purchaseCountry: 'US' },
  },
  backend: {
    createPaymentUrl: 'https://api.example.com/api/payments/create',
    paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
    paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
    affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
    // confirmPaymentUrl is optional/reserved — not required for standard Stripe Payment Element flows
  },
  enableMockMode: false,
});
\`\`\`

### Campos de configuración por proveedor

| Clave del proveedor | Campos destacados |
|---------------------|-------------------|
| \`stripe\` | \`publishableKey\` |
| \`paypal\` | \`clientId\`, \`currency\` opcional, \`intent\` (\`capture\` \\| \`authorize\`) |
| \`applePay\` | \`merchantName\`, \`countryCode\` (\`merchantId\` está obsoleto/se ignora) |
| \`googlePay\` | \`merchantId?\`, \`merchantName?\`, \`environment\` (\`TEST\` \\| \`PRODUCTION\`), \`countryCode?\` |
| \`klarna\` | \`purchaseCountry?\`, \`locale?\` |
| \`affirm\` | \`purchaseCountry?\`, \`locale?\` |

### URLs del backend

Los campos opcionales de \`backend\` apuntan a **tu** API HTTPS. Easy Payments no aloja APIs de pago.

## Inputs del componente (Full Checkout)

| Input | Propósito |
|-------|-----------|
| \`product\` | \`PaymentProduct\` obligatorio |
| \`methods\` | Lista de métodos permitidos y orden visual |
| \`checkout\` | \`CheckoutOptions\` opcional (\`successUrl\`, \`cancelUrl\`, \`successBehavior\`, \`customer\`, \`shipping\`) |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | Limitado entre 320 y 1200 (por defecto 640) |
| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |

| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` | Idioma de la interfaz (por defecto \`auto\`) |
| \`translations\` | mapa parcial | Sobrescrituras opcionales de textos |

## Forma del producto

\`\`\`typescript
interface PaymentProduct {
  id: string;
  name: string;
  amount: number; // major units
  currency: string;
  description?: string;
  quantity?: number;
  imageUrl?: string;
  metadata?: Record<string, string>;
}
\`\`\`

Trata el \`amount\` del navegador como una entrada de visualización no confiable. Tu backend debe derivar un precio confiable.

### Forma de CheckoutOptions (publicada)

\`\`\`typescript
interface CheckoutOptions {
  successUrl?: string;
  cancelUrl?: string;
  successBehavior?: 'confirmation' | 'event-only';
  customer?: { email?: string; name?: string };
  shipping?: { required?: boolean };
}
\`\`\`

**No** existe el campo \`backend.baseUrl\` en la versión publicada 1.1.0. Proporciona URLs HTTPS absolutas (o rutas relativas a la aplicación que tu capa HTTP resuelva) en cada propiedad de URL del backend.
`,
  },
  'payment-methods': {
    title: 'Métodos de pago',
    description: 'Ids de método, orden y estado real vs sandbox vs mock.',
    groupTitle: 'Configuración',
    markdown: `# Métodos de pago

Tú controlas qué métodos aparecen y en qué orden mediante el input \`methods\`. Easy Payments no reordena tu lista de métodos permitidos.

\`\`\`typescript
methods: PaymentMethod[] = ['card', 'paypal', 'klarna'];
\`\`\`

## Matriz de estado (basada en evidencia)

Los estados siguientes describen lo que este conjunto de documentación puede afirmar con honestidad sobre Full Checkout de Angular **1.1.0** y el Playground mock del sitio web. **No** son una garantía de elegibilidad del comercio.

| Id del método | Ruta del proveedor | Estado de integración | Notas |
|---------------|--------------------|-----------------------|-------|
| \`card\` | Stripe Payment Element | **Real + sandbox/TEST** | Clave publicable + tu backend de creación de pagos; usa \`pk_test_\` en TEST |
| \`paypal\` | PayPal Buttons | **Real + sandbox** | Client ID en Angular; el Client Secret solo en tu servidor |
| \`apple-pay\` | Apple Pay vía Stripe | **Real + TEST** (según el dispositivo) | Requiere HTTPS, dispositivo/navegador compatible y configuración de dominio en Stripe/Apple; puede ocultarse cuando no está disponible |
| \`google-pay\` | Google Pay vía Stripe | **Real + TEST** | \`environment: 'TEST' \\| 'PRODUCTION'\`; PRODUCTION requiere el alta completa del comercio |
| \`klarna\` | Klarna vía Stripe BNPL | **Ruta real documentada** + **mock DEMO** | La elegibilidad en producción depende del país/moneda/importe; el mock del sitio web/playground está etiquetado como **DEMO** (no es la interfaz oficial de Klarna) |
| \`affirm\` | Affirm vía Stripe | **Ruta real documentada** + mock | Se aplican límites de elegibilidad; mock disponible con \`enableMockMode\` |

### Leyenda

- **Real + sandbox/TEST**: existen APIs publicadas; puedes integrar con credenciales TEST/sandbox del proveedor y tu backend.
- **Mock DEMO**: adaptadores locales de \`enableMockMode\` para demos de interfaz/eventos; **sin cargos**.
- **Pendiente**: no se afirma aquí (ejemplo: Samsung Pay **no** está implementado).

## No compatible

**Samsung Pay** no está implementado.

## Advertencias de disponibilidad

Las billeteras pueden estar configuradas y aun así **no mostrarse** cuando el navegador, el dispositivo, el registro del dominio o el alta del comercio están incompletos. Consulta [Solución de problemas](./troubleshooting) y la [FAQ](/faq#wallets-missing).

Guías por proveedor: [Stripe](./stripe) · [PayPal](./paypal) · [Apple Pay](./apple-pay) · [Google Pay](./google-pay) · [Klarna](./klarna) · [Affirm](./affirm).
`,
  },
  'theming': {
    title: 'Temas',
    description: 'Tema, apariencia y estilo visual.',
    groupTitle: 'Configuración',
    markdown: `# Temas

## Tema

\`\`\`html
<easy-payments theme="light" [product]="product" [methods]="methods" />
<easy-payments theme="dark" [product]="product" [methods]="methods" />
<easy-payments theme="system" [product]="product" [methods]="methods" />
\`\`\`

- \`light\` / \`dark\` fuerzan los colores de Easy Payments
- \`system\` sigue \`prefers-color-scheme\` y se actualiza en vivo

## Apariencia

\`\`\`html
<easy-payments appearance="default" ... />
<easy-payments appearance="transparent" ... />
\`\`\`

| Valor | Efecto |
|-------|--------|
| \`default\` | Contenedor exterior integrado |
| \`transparent\` | Elimina el marco exterior para integrarlo en tu diseño |

\`theme\` y \`appearance\` son independientes.

## Ancho máximo

\`[maxWidth]\` se limita entre **320** y **1200** (por defecto **640**).
`,
  },
  'localization': {
    title: 'Localización',
    description: 'Idiomas de interfaz añadidos en Angular 1.1.0.',
    groupTitle: 'Configuración',
    markdown: `# Localización

Añadido en **Angular 1.1.0**.

## Input de idioma

\`\`\`html
<easy-payments
  locale="auto"
  [product]="product"
  [methods]="methods"
/>
\`\`\`

Valores permitidos: \`auto\` | \`en\` | \`es\` | \`pt\` (por defecto \`auto\`).

La detección automática del navegador se asigna así:

- \`es-*\` → español
- \`pt-*\` → portugués
- \`en-*\` → inglés
- otros idiomas → inglés como alternativa

## Traducciones

El \`[translations]\` opcional proporciona sobrescrituras parciales de textos. Orden de resolución: sobrescritura → diccionario del idioma → inglés.

## Visualización de importes

Los importes usan el formato \`Intl\` del idioma activo **sin convertir la moneda**. \`product.amount\` y \`product.currency\` no cambian.

## Superficies de los proveedores

Las hojas gestionadas por los proveedores (billeteras, interfaces bancarias) pueden seguir sus propias reglas de idioma y Easy Payments no las controla por completo.
`,
  },
  'stripe': {
    title: 'Stripe Card',
    description: 'Pagos con tarjeta mediante Stripe Payment Element.',
    groupTitle: 'Integraciones',
    markdown: `# Stripe Card

El checkout con tarjeta usa Stripe Payment Element a través de Easy Payments.

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_your_publishable_key' },
  },
  backend: {
    createPaymentUrl: 'https://api.example.com/api/payments/create',
  },
});
\`\`\`

## Reglas del frontend

- Solo la clave **publicable** pertenece a Angular
- El número de tarjeta, el CVC y la fecha de caducidad permanecen dentro de los campos alojados por Stripe
- Las claves secretas y los secretos de webhook permanecen en el servidor

## Backend

Tu endpoint de creación de pagos debe crear un PaymentIntent (o equivalente) con importe/moneda **confiables en el servidor** y devolver el client secret que espera tu adaptador.

No despaches el pedido solo a partir del evento \`success\` del navegador: confirma el estado del PaymentIntent en el servidor o mediante webhooks firmados.
`,
  },
  'paypal': {
    title: 'PayPal',
    description: 'Botones de PayPal con creación/captura en el servidor.',
    groupTitle: 'Integraciones',
    markdown: `# PayPal

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    paypal: {
      clientId: 'your-paypal-client-id',
      currency: 'USD',
      intent: 'capture',
    },
  },
  backend: {
    paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
    paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
  },
});
\`\`\`

## Credenciales

| En Angular | Solo en el servidor |
|------------|---------------------|
| Client ID de PayPal | Client Secret de PayPal |
| | Credenciales de verificación de webhooks |

## Precios

Trata el \`product.amount\` del cliente como no confiable. Las rutas de creación/captura deben fijar el precio a partir de tu catálogo.
`,
  },
  'apple-pay': {
    title: 'Apple Pay',
    description: 'Apple Pay mediante Stripe Express Checkout.',
    groupTitle: 'Integraciones',
    markdown: `# Apple Pay

Apple Pay se ofrece mediante flujos de billetera respaldados por Stripe.

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    applePay: {
      merchantName: 'Your Store',
      countryCode: 'US',
    },
  },
});
\`\`\`

## Requisitos

- Dispositivo/navegador compatible con Apple Pay
- Verificación de dominio de Apple Pay en Stripe para uso en producción
- Nombre comercial visible para la hoja de pago

\`merchantId\` en la configuración de Apple Pay está obsoleto/se ignora en el modelo de configuración público actual; sigue la guía de registro de dominios de Stripe.

Apple Pay en producción sobre un dominio verificado puede requerir configuración adicional del comercio más allá de las pruebas locales en modo mock.
`,
  },
  'google-pay': {
    title: 'Google Pay',
    description: 'Botón de Google Pay con confirmación de Stripe.',
    groupTitle: 'Integraciones',
    markdown: `# Google Pay

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    googlePay: {
      merchantName: 'Your Store',
      environment: 'TEST',
      countryCode: 'US',
    },
  },
});
\`\`\`

## Entornos

| Valor | Uso |
|-------|-----|
| \`TEST\` | Desarrollo / pruebas tipo sandbox |
| \`PRODUCTION\` | Configuración de comercio en producción |

Google Pay \`PRODUCTION\` y los cargos reales requieren el alta completa del comercio. Las demos locales suelen usar el modo mock o TEST.
`,
  },
  'klarna': {
    title: 'Klarna',
    description: 'Klarna BNPL mediante Stripe: ruta real y salvedades del mock DEMO.',
    groupTitle: 'Integraciones',
    markdown: `# Klarna

Klarna se integra como **BNPL respaldado por Stripe** en Full Checkout de Angular **1.1.0** publicado.

## Configuración real / TEST

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    klarna: {
      purchaseCountry: 'US',
    },
  },
  backend: {
    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
  },
});
\`\`\`

### Frontend

- Incluye \`'klarna'\` en \`[methods]\`
- Solo la clave publicable de Stripe en el navegador
- \`checkout.successUrl\` / \`cancelUrl\` opcionales en tu origen para los retornos por redirección

### Backend

- Crea/confirma el PaymentIntent (o equivalente) con claves **secretas** en el servidor
- Verifica los webhooks antes de despachar pedidos; el \`success\` del navegador es solo experiencia de usuario

## Elegibilidad

La disponibilidad depende del país del comercio, la moneda, el importe del producto y la configuración de Klarna/Stripe. No todos los compradores ni artículos del catálogo son elegibles.

## Mock DEMO (Playground / enableMockMode)

Cuando \`enableMockMode: true\`, Klarna usa el adaptador **mock DEMO** de la librería:

- **Sin** ventana alojada real de Klarna
- **No** es una interfaz de checkout sandbox oficial de Klarna
- Los resultados provienen de \`MockPaymentController\` (\`success\` / \`cancelled\` / \`failed\`)

Prueba el flujo DEMO etiquetado en el [Playground](/playground). Detalles: [Modo mock](./mock-mode).
`,
  },
  'affirm': {
    title: 'Affirm',
    description: 'Pagos en cuotas con Affirm mediante flujos respaldados por Stripe.',
    groupTitle: 'Integraciones',
    markdown: `# Affirm

Affirm se integra como pago en cuotas respaldado por Stripe.

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    affirm: {
      purchaseCountry: 'US',
    },
  },
  backend: {
    affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
  },
});
\`\`\`

## Notas

- La elegibilidad de Affirm (incluidos los importes mínimos y las monedas admitidas, como USD/CAD en la documentación del proveedor) la aplican Affirm/Stripe; no la inventa este sitio web
- Trata el éxito en el navegador solo como experiencia de usuario; verifica en el servidor
`,
  },
  'mock-mode': {
    title: 'Modo mock',
    description: 'Demos locales sin cargos reales.',
    groupTitle: 'Guías',
    markdown: `# Modo mock

Activa los adaptadores mock para demos locales de la interfaz:

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_demo' },
  },
  enableMockMode: true,
});
\`\`\`

## Comportamiento

- Todos los métodos configurados usan adaptadores mock
- **No se procesa dinero real**
- Útil para capturas de pantalla, QA de diseño y conexión de eventos

## MockPaymentController

Helper publicado para los resultados de las demos:

\`\`\`typescript
import { MockPaymentController } from '@easy-payments/angular';

controller.setOutcome('success' | 'cancelled' | 'failed');
controller.setUnavailableMethods(['apple-pay']);
controller.setDelay(500);
controller.reset();
\`\`\`

## Producción

Nunca actives \`enableMockMode\` en compilaciones de producción.
`,
  },
  'testing': {
    title: 'Pruebas',
    description: 'Claves de prueba, sandbox y límites de la verificación.',
    groupTitle: 'Guías',
    markdown: `# Pruebas

## Capas recomendadas

1. **Modo mock** para la interfaz y la conexión de eventos
2. Credenciales **TEST / Sandbox** del proveedor para ensayos de integración
3. Pruebas de contrato del backend contra tus endpoints de creación/captura
4. Pruebas de verificación de la firma de webhooks en el servidor

## Lo que la verificación local no demuestra

- Cargos reales en producción
- Apple Pay en un dominio de producción verificado
- Google Pay \`PRODUCTION\` de extremo a extremo
- La entrega real de webhooks del proveedor a tu servidor entre entornos

Documenta explícitamente las diferencias entre entornos en tus runbooks.
`,
  },
  'error-handling': {
    title: 'Gestión de errores',
    description: 'Códigos de PaymentError y eventos de experiencia de usuario.',
    groupTitle: 'Guías',
    markdown: `# Gestión de errores

Escucha \`error\` en \`<easy-payments>\` y prefiere los valores estables de \`PaymentError.code\` al registrar logs.

## Códigos comunes

| Código | Significado |
|--------|-------------|
| \`CONFIG_MISSING\` | Falta una configuración obligatoria |
| \`CONFIG_INVALID\` | Configuración rechazada |
| \`PRODUCT_INVALID\` | Payload de producto no válido |
| \`PROVIDER_UNAVAILABLE\` | Método no disponible en este entorno |
| \`PROVIDER_NOT_CONFIGURED\` | Proveedor no configurado |
| \`PAYMENT_CANCELLED\` | El comprador canceló |
| \`PAYMENT_FAILED\` | El pago falló |
| \`CARD_DECLINED\` | Tarjeta rechazada |
| \`AUTHENTICATION_REQUIRED\` / \`AUTHENTICATION_FAILED\` | Desafíos de autenticación |
| \`NETWORK_ERROR\` | Fallo de red |
| \`SDK_LOAD_FAILED\` | No se pudo cargar el SDK del proveedor |
| \`BACKEND_ERROR\` | Falló la solicitud al backend |
| \`PROVIDER_NOT_IMPLEMENTED\` | Ruta del proveedor no implementada |
| \`UNKNOWN\` | Sin clasificar |

Prefiere \`code\` sobre el \`message\` libre para métricas y alertas.

Los fallos de configuración deben aparecer como \`error\`, no como \`cancel\` del comprador.
`,
  },
  'security': {
    title: 'Seguridad',
    description: 'Secretos, verificación y reglas de despacho de pedidos.',
    groupTitle: 'Guías',
    markdown: `# Seguridad

Easy Payments es una **librería de integración**, no un procesador de pagos.

## Seguro para el frontend

- Claves publicables de Stripe (\`pk_test_\` / \`pk_live_\`)
- Client ID de PayPal
- Nombres públicos del comercio
- URLs HTTPS de **tu** backend

Los datos de la tarjeta permanecen en Stripe Elements. Easy Payments **no** afirma cumplir PCI de forma automática: sigue las obligaciones de Stripe y las tuyas propias.

## Nunca en Angular

- Claves secretas de Stripe (\`sk_\`)
- Secretos de webhook de Stripe (\`whsec_\`)
- Client Secret de PayPal / secretos de verificación de webhooks
- Claves privadas, tokens de acceso, contraseñas

## Precios

El \`product.amount\` del navegador no es confiable. El backend debe validar la identidad del producto, el importe, la moneda y la cantidad antes de crear o capturar un cargo.

## Despacho de pedidos

Los eventos de Angular (\`success\`, \`cancel\`, \`error\`, \`successContinue\`) son **solo señales de experiencia de usuario**.

Despacha el pedido a partir de:

1. Webhooks verificados del proveedor, o
2. La consulta en el servidor del estado del PaymentIntent / de la captura

## Modo mock

\`enableMockMode: true\` nunca procesa dinero real. Desactívalo en producción.

## Metadatos

\`PaymentProduct.metadata\` opcional no debe contener secretos ni datos personales (PII). Trátalo como entrada no confiable del navegador; vuelve a validarlo en el servidor.
`,
  },
  'troubleshooting': {
    title: 'Solución de problemas',
    description: 'Fallos de configuración habituales y comprobaciones.',
    groupTitle: 'Guías',
    markdown: `# Solución de problemas

## El checkout no muestra un método

- Confirma que el id del método figura en \`[methods]\`
- Confirma que existe el bloque del proveedor correspondiente en \`provideEasyPayments\`
- Comprueba la compatibilidad de dispositivo/navegador para las billeteras
- Prueba el modo mock para separar los problemas de interfaz del alta con el proveedor

## Los pagos fallan de inmediato

- Inspecciona \`PaymentError.code\`
- Verifica que las URLs del backend sean HTTPS y estén accesibles
- Confirma que las claves TEST y de producción coincidan con el entorno
- Asegúrate de que no falten las claves secretas en el servidor

## Éxito en el navegador pero sin pedido

Es lo esperado si despachas pedidos solo a partir de eventos del cliente. Implementa la verificación de webhooks o comprobaciones de estado en el servidor.

## El tema se ve mal

- Usa \`light\` / \`dark\` / \`system\` (no \`white\`)
- Recuerda que el marco gestionado por el proveedor no está totalmente controlado por los tokens de Easy Payments
`,
  },
  'api-reference': {
    title: 'Referencia de la API',
    description: 'API pública de Full Checkout para esta versión.',
    groupTitle: 'Referencia',
    markdown: `# Referencia de la API

Superficie pública documentada para Full Checkout de Angular **1.1.0**. Para elegir entre Full vs Buttons Only vs Headless, consulta [Modos de checkout](./checkout-modes). Mocks ejecutables: [Playground](/playground) · [Ejemplos](./examples).

## Provider

- \`provideEasyPayments(config: EasyPaymentsConfig)\`

## Componente

- \`EasyPaymentsComponent\` con selector \`<easy-payments>\`

### Inputs

| Nombre | Tipo / notas |
|--------|--------------|
| \`product\` | \`PaymentProduct\` obligatorio |
| \`methods\` | Lista permitida/orden de \`PaymentMethod[]\` |
| \`checkout\` | Opciones de checkout opcionales |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | number \\| string, limitado entre 320 y 1200 (por defecto 640) |
| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |
| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` |
| \`translations\` | \`Partial<EasyPaymentsTranslations>\` |

### Outputs

| Nombre | Propósito |
|--------|-----------|
| \`success\` | El pago se completó (experiencia de usuario) |
| \`cancel\` | Pago cancelado |
| \`error\` | Error de pago |
| \`successContinue\` | El comprador continuó desde la interfaz de éxito |

> Verificado con el archivo de declaración publicado en npm para la 1.1.0.

## Tipos principales

- \`PaymentMethod\`: \`card\` \\| \`paypal\` \\| \`apple-pay\` \\| \`google-pay\` \\| \`klarna\` \\| \`affirm\`
- \`PaymentProduct\`, \`PaymentResult\`, \`PaymentError\`, \`CheckoutOptions\`

## Fuera del alcance de la documentación 1.1.0

- \`EasyPaymentsHeadless\` (1.2.0 RC)
- Disparadores de comerciante de Buttons Only / \`bnplConfirmMode\` (1.2.0 RC)
`,
  },
  'examples': {
    title: 'Ejemplos',
    description: 'Ejemplos de configuración y checkout listos para copiar.',
    groupTitle: 'Referencia',
    markdown: `# Ejemplos

## Instalar

\`\`\`bash
npm install @easy-payments/angular@1.1.0 @stripe/stripe-js
\`\`\`

## Registro de providers

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        stripe: { publishableKey: 'pk_test_replace_me' },
        paypal: { clientId: 'replace_me' },
      },
      backend: {
        createPaymentUrl: 'https://api.example.com/api/payments/create',
        paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
        paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
      },
    }),
  ],
};
\`\`\`

## Checkout básico

\`\`\`html
<easy-payments
  [product]="product"
  [methods]="['card', 'paypal']"
  theme="system"
  appearance="default"
  [maxWidth]="640"
  (success)="onSuccess($event)"
  (error)="onError($event)"
/>
\`\`\`

## Configuración del tema

\`\`\`html
<easy-payments
  theme="dark"
  appearance="transparent"
  [product]="product"
  [methods]="methods"
/>
\`\`\`

## Modo mock

\`\`\`typescript
provideEasyPayments({
  providers: { stripe: { publishableKey: 'pk_test_demo' } },
  enableMockMode: true,
});
\`\`\`

Sustituye las claves publicables y los Client ID por tus propias credenciales TEST. Mantén los secretos en el servidor.

## Playground interactivo

Genera fragmentos de código según la versión de forma visual en el [Angular Checkout Playground](/playground). Es una herramienta de demostración con una simulación local etiquetada, no un flujo de cargos reales.
`,
  },
  'migration': {
    title: 'Migración desde 1.0',
    description: 'Notas de actualización de 1.0.x a 1.1.0.',
    groupTitle: 'Referencia',
    markdown: `# Migración desde 1.0

## 1.0.x → 1.1.0

1.1.0 es una versión de **localización**.

### Qué cambió

- Nuevo input \`[locale]\`
- Nuevo input \`[translations]\`
- Diccionarios de interfaz integrados en inglés / español / portugués
- Formato de visualización de importes con Intl (sin conversión de divisas)

### Qué sigue igual

- Nombre del paquete \`@easy-payments/angular\`
- Rango peer de Angular \`>=20.3.0 <23.0.0\`
- Métodos de Full Checkout y modelo de configuración de proveedores
- Sin semántica de conversión de moneda

### Pasos de actualización

1. Instala \`@easy-payments/angular@1.1.0\`
2. Opcionalmente define \`locale\` / \`translations\` en \`<easy-payments>\`
3. Realiza pruebas de regresión de los textos del checkout en tus idiomas de destino

### No incluido en 1.1.0

Las funciones de Buttons Only Direct / Headless pertenecen a la **1.2.0** (RC no publicada) y se omiten aquí.
`,
  },
};
