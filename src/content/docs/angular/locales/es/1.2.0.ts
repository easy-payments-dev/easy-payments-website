import { DocsLocaleBundle } from '../types';

export const angular120Es: DocsLocaleBundle = {
  'getting-started': {
    title: 'Primeros pasos',
    description: 'Qué es Easy Payments, requisitos y cómo empezar.',
    groupTitle: 'Primeros pasos',
    markdown: `# Primeros pasos

Easy Payments para Angular (\`@easy-payments/angular\` **1.2.0**) es una **librería de integración** de código abierto para un checkout con múltiples proveedores.

Ayuda a tu aplicación Angular a presentar Card, PayPal, Apple Pay, Google Pay, Klarna y Affirm usando **tus** cuentas de comercio.

## Qué es

- APIs standalone de Angular sobre los SDK de los proveedores (Full Checkout, Buttons Only, Headless)
- Eventos normalizados de éxito / cancelación / error para la experiencia de usuario
- Modo mock opcional para demos locales sin cargos reales
- Localización del checkout integrada (en / es / pt)

## Qué no es

- No es un procesador de pagos
- No es un banco ni un proveedor de billeteras
- No sustituye la verificación en el backend ni los webhooks
- **No** mueve dinero ni retiene fondos

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| Angular | \`>=20.3.0 <23.0.0\` |
| Paquete | \`@easy-payments/angular@1.2.0\` |
| Stripe JS | Peer \`@stripe/stripe-js\` (\`^8.0.0\` según la guía de peers publicada) |
| Backend | Endpoints HTTPS bajo tu control para los flujos de creación/captura/confirmación |

Las instalaciones de consumidor se validaron en Angular **20**, **21** y **22** con pruebas de humo en modo mock.

## Modos en 1.2.0

| Superficie | API pública | Guía |
|------------|-------------|------|
| **Full Checkout** | \`<easy-payments>\` | [Full Checkout](./full-checkout) |
| **Buttons Only** | \`<easy-payment-buttons>\` | [Buttons Only](./buttons-only) |
| **Headless** | \`EasyPaymentsHeadless\` | [Headless](./headless) |

Consulta [Modos de checkout](./checkout-modes). Preguntas frecuentes: [FAQ](/faq).

> La documentación de la revisión de lanzamiento se valida con el paquete local \`vendor/@easy-payments/angular@1.2.0\`. El comando de instalación público es \`npm install @easy-payments/angular@1.2.0\`.

## Prueba el playground del sitio web

Usa el [Angular Checkout Playground](/playground) para previsualizar los tres modos en modo mock. Los flujos mock de Klarna están etiquetados como **DEMO**.

## Siguientes pasos

1. [Instalación](./installation)
2. [Inicio rápido](./quick-start): primer Full Checkout en modo mock
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
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
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
    description: 'Instala 1.2.0, activa el modo mock y renderiza tu primer Full Checkout.',
    groupTitle: 'Primeros pasos',
    markdown: `# Inicio rápido

**Paquete objetivo:** \`@easy-payments/angular@1.2.0\`.
Esta guía usa **Full Checkout** (\`<easy-payments>\`) con \`enableMockMode\` para que puedas completar una primera demo sin cargos reales.

> Prefiere una guía dedicada cuando ya conozcas la forma de tu interfaz: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless). Resumen: [Modos de checkout](./checkout-modes).

## 1. Instalar

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

Peers: Angular \`>=20.3.0 <23.0.0\`, \`@stripe/stripe-js\` \`^8.0.0\`. Las pruebas de humo verificadas de consumidor cubren Angular **20**, **21** y **22**.

> **Nota de revisión local:** este sitio web valida los ejemplos con el paquete local \`vendor/@easy-payments/angular@1.2.0\`. El comando de instalación anterior es el comando público de npm para el día del lanzamiento.

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
| \`theme\` (\`light\` \\| \`dark\` \\| \`system\`) y \`locale\` | Textos del checkout integrados en en / es / pt |

## Resultados mock

Inyecta \`MockPaymentController\` para forzar \`success\`, \`cancelled\` o \`failed\` antes de pagar. Detalles: [Modo mock](./mock-mode).

Klarna en modo mock es un flujo **DEMO** de los adaptadores de la librería, no un checkout alojado oficial de Klarna. Pruébalo en el [Playground](/playground?demo=full).

## Siguiente

- [Modos de checkout](./checkout-modes): Full vs Buttons Only vs Headless
- [Guía de Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless)
- [Métodos de pago](./payment-methods): estado real / sandbox / mock
- [Referencia de la API](./api-reference) · [Ejemplos](./examples)
`,
  },
  'checkout-modes': {
    title: 'Modos de checkout',
    description: 'Compara Full Checkout, Buttons Only y Headless en Easy Payments 1.2.0.',
    groupTitle: 'Primeros pasos',
    markdown: `# Modos de checkout

Easy Payments **1.2.0** incluye tres formas de integración. Elige la que se ajuste a cuánta interfaz quieres que gestione la librería. Cada tarjeta responde las mismas tres preguntas en el mismo orden.

::: mode-cards
::: mode-card
## Full Checkout

- **Cuándo usarlo:** quieres el camino más rápido hacia un checkout completo: resumen del pedido, métodos de pago y confirmación en un solo componente.
- **Quién es dueño de la interfaz:** la librería.
- **API pública:** \`<easy-payments>\` (\`EasyPaymentsComponent\`).

[Probar demo](/playground?demo=full) · [Ver guía](./full-checkout)
:::
::: mode-card
## Buttons Only

- **Cuándo usarlo:** ya tienes la estructura del carrito o del checkout y solo necesitas una franja compacta de métodos de pago dentro de ella.
- **Quién es dueño de la interfaz:** compartida. La librería renderiza la franja y su panel expandible; tú controlas todo lo que la rodea.
- **API pública:** \`<easy-payment-buttons>\` (\`EasyPaymentButtonsComponent\`) con \`[buttonsAppearance]\` para el estilo de la franja.

[Probar demo](/playground?demo=buttons) · [Ver guía](./buttons-only)
:::
::: mode-card
## Headless

- **Cuándo usarlo:** necesitas un diseño totalmente personalizado y solo quieres la sesión de pago y las superficies de los proveedores.
- **Quién es dueño de la interfaz:** tú. La librería monta la interfaz del proveedor en tus contenedores y nunca incluye un diseño de checkout.
- **API pública:** \`EasyPaymentsHeadless\` (\`createSession()\`, \`mount()\`, \`confirm()\`).

[Probar demo](/playground?demo=headless) · [Ver guía](./headless)
:::
:::

## Cómo elegir rápido

1. Necesitas una página de checkout completa para mañana → **Full Checkout**.
2. Ya tienes la estructura del carrito y necesitas una franja de pago → **Buttons Only**.
3. Necesitas un diseño totalmente personalizado → **Headless**.

Los tres modos de este sitio web funcionan con \`enableMockMode\`, por lo que no se mueve dinero. Los flujos mock de Klarna están etiquetados como **DEMO**. Consulta [Modo mock](./mock-mode) y la [FAQ](/faq#which-mode).

## Instala una sola vez

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

Después sigue la guía del modo que corresponda a la interfaz de tu producto.
`,
  },
  'full-checkout': {
    title: 'Full Checkout',
    description: 'Interfaz de checkout completa gestionada por la librería, con resumen del producto, métodos y resultados.',
    groupTitle: 'Primeros pasos',
    markdown: `# Full Checkout

**Cuándo elegirlo:** quieres que Easy Payments se encargue de la estructura del checkout (resumen del producto, lista de métodos, confirmación y estados de éxito) para lanzar un checkout multiproveedor sin diseñar la interfaz de pago.

**Demo mock ejecutable:** [Playground → Full Checkout](/playground?demo=full)

## Instalación y providers

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true, // local demos only — never in production
      providers: {},
    }),
  ],
};
\`\`\`

## Ejemplo completo de Full Checkout

Tú defines el producto, el precio (en unidades mayores), la moneda, los métodos de pago y su orden. La librería renderiza la interfaz completa del checkout y emite resultados normalizados.

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
  selector: 'app-store-checkout',
  standalone: true,
  imports: [EasyPaymentsComponent],
  template: \`
    <h1>Complete your purchase</h1>
    <easy-payments
      [product]="product"
      [methods]="methods"
      theme="system"
      appearance="default"
      [maxWidth]="640"
      successBehavior="confirmation"
      locale="auto"
      (success)="onSuccess($event)"
      (cancel)="onCancel($event)"
      (error)="onError($event)"
      (successContinue)="onContinue()"
    />
  \`,
})
export class StoreCheckoutComponent {
  /** Product + price + currency are owned by your app. */
  readonly product: PaymentProduct = {
    id: 'annual-pro',
    name: 'Annual Pro',
    description: 'Full library checkout for a subscription SKU',
    amount: 149, // major units → $149.00
    currency: 'USD',
    quantity: 1,
  };

  /** Allow-list + display order — Klarna is DEMO in mock mode. */
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
    console.log('success', result.status, result.method);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result.method);
  }

  onError(error: PaymentError): void {
    console.error(error.code, error.message);
  }

  onContinue(): void {
    // Shopper dismissed the built-in success confirmation
  }
}
\`\`\`

## Resultados que gestionas

| Salida | Significado |
|--------|-------------|
| \`success\` | El proveedor/mock informó éxito para la experiencia de usuario; aun así verifica en tu backend |
| \`cancel\` | El comprador canceló |
| \`error\` | Fallo del pago o del SDK |
| \`successContinue\` | El comprador continuó desde la interfaz de éxito de la librería |

## Notas

- Los flujos mock de Klarna están etiquetados como **DEMO**; no son un checkout alojado oficial de Klarna.
- Desactiva \`enableMockMode\` y proporciona claves publicables + backends HTTPS para sandbox/TEST o soporte en producción verificado. Consulta [Métodos de pago](./payment-methods).
- Compara los modos: [Modos de checkout](./checkout-modes) · [Buttons Only](./buttons-only) · [Headless](./headless)
`,
  },
  'buttons-only': {
    title: 'Buttons Only',
    description: 'Integra la franja de pago de la librería dentro de tu propio carrito o checkout.',
    groupTitle: 'Primeros pasos',
    markdown: `# Buttons Only

**Cuándo elegirlo:** ya controlas los totales del carrito, el envío y el diseño; solo necesitas la franja compacta de pago de Easy Payments (\`<easy-payment-buttons>\`) con botones oficiales de billeteras y paneles expandibles compartidos para tarjeta / BNPL.

**Demo mock ejecutable:** [Playground → Buttons Only](/playground?demo=buttons)

## Instalación y providers

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true, // local demos only — never in production
      providers: {},
    }),
  ],
};
\`\`\`

## Ejemplo completo de Buttons Only

Tu aplicación mantiene el resumen del pedido. Easy Payments gestiona la franja de pago. Tú sigues definiendo producto, precio, moneda, métodos y orden.

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentButtonsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
  PaymentStartedEvent,
} from '@easy-payments/angular';

@Component({
  selector: 'app-cart-payments',
  standalone: true,
  imports: [EasyPaymentButtonsComponent],
  template: \`
    <aside class="cart">
      <h2>{{ product.name }}</h2>
      <p>{{ product.amount }} {{ product.currency }}</p>
      <p>Shipping: Free · Taxes calculated at capture</p>
    </aside>

    <section aria-label="Pay with">
      <easy-payment-buttons
        [product]="product"
        [methods]="methods"
        layout="vertical"
        theme="system"
        locale="auto"
        checkoutInstanceId="store-cart-payments"
        (started)="onStarted($event)"
        (success)="onSuccess($event)"
        (cancel)="onCancel($event)"
        (error)="onError($event)"
      />
    </section>
  \`,
})
export class CartPaymentsComponent {
  readonly product: PaymentProduct = {
    id: 'hoodie-navy',
    name: 'Navy hoodie',
    description: 'Buttons Only strip inside a custom cart',
    amount: 68,
    currency: 'USD',
    quantity: 1,
  };

  /** Compact strip: wallets first, then card — order is yours. */
  readonly methods: PaymentMethod[] = [
    'apple-pay',
    'google-pay',
    'paypal',
    'card',
    'klarna',
  ];

  onStarted(event: PaymentStartedEvent): void {
    console.log('started', event.method);
  }

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification
    console.log('success', result.status, result.method);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result.method);
  }

  onError(error: PaymentError): void {
    console.error(error.code, error.message);
  }
}
\`\`\`

## Puntos clave de configuración

| Tú defines | La librería aporta |
|------------|--------------------|
| \`product\`, orden de \`methods\` | Franja compacta + botones oficiales de billeteras |
| \`layout\` (\`vertical\` \\| \`horizontal\`) | Panel expandible compartido para tarjeta / BNPL |
| \`theme\`, \`locale\`, \`checkoutInstanceId\` opcional | \`started\` / \`success\` / \`cancel\` / \`error\` normalizados |

## Notas

- Klarna en modo mock sigue siendo un adaptador **DEMO**; no es la interfaz oficial de Klarna.
- Prefiere Full Checkout cuando no tengas ya la estructura de un carrito: [Full Checkout](./full-checkout).
- ¿Necesitas control visual total? [Headless](./headless). Resumen: [Modos de checkout](./checkout-modes).
`,
  },
  'headless': {
    title: 'Headless',
    description: 'Crea una interfaz de checkout personalizada sobre EasyPaymentsHeadless mientras la librería monta las superficies de los proveedores.',
    groupTitle: 'Primeros pasos',
    markdown: `# Headless

**Cuándo elegirlo:** controlas cada píxel de la interfaz del checkout (chips de métodos, etiquetas y botones de confirmación) y solo necesitas que Easy Payments monte las superficies de los proveedores (Payment Element para Card / Klarna / Affirm, PayPal Buttons, Google Pay, Apple Pay) y emita resultados normalizados.

**Demo mock ejecutable:** [Playground → Headless](/playground?demo=headless)
El diseño Headless del Playground es una **interfaz de ejemplo creada por el consumidor**; Headless en sí no incluye estructura de checkout.

## Instalación y providers

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true, // local demos only — never in production
      providers: {},
    }),
  ],
};
\`\`\`

## Ejemplo completo de Headless

Tu aplicación define producto, precio, moneda, métodos y orden; construye la interfaz; y después usa \`EasyPaymentsHeadless.createSession\` → \`initialize\` → \`selectMethod\` → \`mount\` → \`confirm\` (para los métodos de tipo confirmación).

\`\`\`typescript
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  EasyPaymentsHeadless,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  type HeadlessCheckoutSession,
  type HeadlessMountHandle,
} from '@easy-payments/angular';

@Component({
  selector: 'app-custom-checkout',
  standalone: true,
  template: \`
    <h1>Custom branded checkout</h1>
    <p>{{ product.name }} — {{ product.amount }} {{ product.currency }}</p>

    <div role="list">
      @for (method of methods; track method) {
        <button type="button" role="listitem" (click)="select(method)">
          {{ method }}
        </button>
      }
    </div>

    <div #mountHost aria-label="Payment surface"></div>

    <button type="button" (click)="pay()" [disabled]="!canConfirm">
      Pay now
    </button>
  \`,
})
export class CustomCheckoutComponent implements OnInit, OnDestroy {
  private readonly headless = inject(EasyPaymentsHeadless);
  private readonly mountHost = viewChild.required<ElementRef<HTMLElement>>('mountHost');
  private session: HeadlessCheckoutSession | null = null;
  private mountHandle: HeadlessMountHandle | null = null;
  private events = new Subscription();
  protected canConfirm = false;

  readonly product: PaymentProduct = {
    id: 'studio-seat',
    name: 'Design studio seat',
    description: 'Headless custom UI example',
    amount: 220,
    currency: 'EUR',
    quantity: 1,
  };

  /** You choose methods and order for your brand experience. */
  readonly methods: PaymentMethod[] = ['card', 'paypal', 'klarna', 'affirm'];

  async ngOnInit(): Promise<void> {
    const session = this.headless.createSession({
      product: this.product,
      methods: this.methods,
      theme: 'system',
      locale: 'auto',
      // Stable id required if you recover Klarna/Affirm Stripe redirects after reload.
      checkoutInstanceId: 'store-custom-checkout',
    });
    this.session = session;

    this.events.add(
      session.events.success.subscribe((result) => {
        console.log('success', result.status, result.method);
      }),
    );
    this.events.add(
      session.events.cancel.subscribe((result) => {
        console.log('cancel', result.method);
      }),
    );
    this.events.add(
      session.events.error.subscribe((error: PaymentError) => {
        console.error(error.code, error.message);
      }),
    );

    await session.initialize();
    const first = session.availableMethods().find((entry) => entry.available);
    if (first) {
      await this.select(first.method);
    }
  }

  async select(method: PaymentMethod): Promise<void> {
    if (!this.session) return;
    this.session.selectMethod(method);
    if (this.mountHandle) {
      await this.mountHandle.unmount();
      this.mountHandle = null;
    }
    const host = this.mountHost().nativeElement;
    host.replaceChildren();
    this.mountHandle = await this.session.mount(method, host);
    const interaction = this.session
      .availableMethods()
      .find((entry) => entry.method === method)?.interaction;
    // PayPal / wallets own the gesture; card / BNPL / mock use confirm().
    this.canConfirm = interaction === 'confirm' || interaction === 'mock';
  }

  async pay(): Promise<void> {
    if (!this.session || !this.canConfirm) return;
    await this.session.confirm();
  }

  async ngOnDestroy(): Promise<void> {
    this.events.unsubscribe();
    if (this.mountHandle) await this.mountHandle.unmount();
    if (this.session) await this.session.destroy();
  }
}
\`\`\`

## Flujo público de Headless

1. \`createSession({ product, methods, ... })\`
2. Suscríbete a \`events.success\` / \`cancel\` / \`error\` (y opcionalmente \`started\`, \`pending\`, \`methodChange\`)
3. \`initialize()\` y luego lee \`availableMethods()\`
4. \`selectMethod\` + \`mount(method, container)\`
5. \`confirm()\` para \`card\` / \`klarna\` / \`affirm\` / mock; las billeteras y PayPal usan sus botones oficiales
6. \`destroy()\` al salir de la página

## Notas

- Los montajes mock de Klarna son adaptadores **DEMO**; no son la interfaz oficial de Klarna.
- Prefiere Buttons Only cuando una franja de la librería sea suficiente: [Buttons Only](./buttons-only).
- Prefiere Full Checkout para obtener la estructura completa: [Full Checkout](./full-checkout). Resumen: [Modos de checkout](./checkout-modes).
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
| Idioma (1.2.0) | \`locale="auto" \\| "en" \\| "es" \\| "pt"\` (+ \`translations\` opcional) |
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

**No** existe el campo \`backend.baseUrl\` en la versión publicada 1.2.0. Proporciona URLs HTTPS absolutas (o rutas relativas a la aplicación que tu capa HTTP resuelva) en cada propiedad de URL del backend.
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

Los estados siguientes describen lo que este conjunto de documentación puede afirmar con honestidad sobre Full Checkout de Angular **1.2.0** y el Playground mock del sitio web. **No** son una garantía de elegibilidad del comercio.

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
    description: 'Idiomas de interfaz añadidos en Angular 1.2.0.',
    groupTitle: 'Configuración',
    markdown: `# Localización

Añadido en **Angular 1.2.0**.

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

Klarna se integra como **BNPL respaldado por Stripe** en Full Checkout de Angular **1.2.0** publicado.

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
    description: 'API pública de Full Checkout, Buttons Only y Headless para 1.2.0.',
    groupTitle: 'Referencia',
    markdown: `# Referencia de la API

Superficie pública de Angular **1.2.0**. Guías por modo: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless). Mocks ejecutables: [Playground](/playground).

## Provider

- \`provideEasyPayments(config: EasyPaymentsConfig)\`
- \`MockPaymentController\`: fuerza resultados mock cuando \`enableMockMode: true\`

## Full Checkout

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

## Buttons Only

- \`EasyPaymentButtonsComponent\` con selector \`<easy-payment-buttons>\`

### Inputs (resumen)

| Nombre | Tipo / notas |
|--------|--------------|
| \`product\` | \`PaymentProduct\` obligatorio |
| \`methods\` | Lista permitida/orden de \`PaymentMethod[]\` |
| \`layout\` | \`vertical\` \\| \`horizontal\` |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`locale\` / \`translations\` | Mismo modelo de idioma que Full Checkout |
| \`checkoutInstanceId\` | Id de host estable opcional para la propiedad de la redirección BNPL |
| \`buttonsAppearance\` / \`visualStyle\` / \`cardButtonAppearance\` | Presentación opcional de la franja / CTA |
| \`bnplConfirmMode\` | Estrategia de confirmación de Klarna/Affirm |
| \`selectorVisibility\` | \`library\` \\| \`merchant\` |

### Outputs

| Nombre | Propósito |
|--------|-----------|
| \`started\` | Comenzó el intento de pago |
| \`methodChange\` | Cambió la selección |
| \`success\` / \`cancel\` / \`error\` | Eventos terminales de experiencia de usuario |

## Headless

- \`EasyPaymentsHeadless\` (inyectable) → \`createSession(options)\` → \`HeadlessCheckoutSession\`

### Aspectos destacados de la sesión

| Miembro | Propósito |
|---------|-----------|
| \`initialize()\` | Resuelve la disponibilidad |
| \`availableMethods\` / \`selectedMethod\` / \`state\` | Signals |
| \`selectMethod\` / \`mount\` / \`confirm\` | Dirigen el pago |
| \`recoverReturn()\` | Recuperación de la redirección de Stripe para Klarna/Affirm |
| \`events.success\` / \`cancel\` / \`error\` / \`started\` / \`pending\` / \`methodChange\` | Observables |
| \`destroy()\` | Libera los recursos |

## Tipos principales

- \`PaymentMethod\`: \`card\` \\| \`paypal\` \\| \`apple-pay\` \\| \`google-pay\` \\| \`klarna\` \\| \`affirm\`
- \`PaymentProduct\`, \`PaymentResult\`, \`PaymentError\`, \`CheckoutOptions\`

> Validado con el archivo de declaración local \`vendor/@easy-payments/angular@1.2.0\` para la revisión de lanzamiento. La publicación pública en npm es un paso aparte.
`,
  },
  'examples': {
    title: 'Ejemplos',
    description: 'Ejemplos de configuración y checkout listos para copiar.',
    groupTitle: 'Referencia',
    markdown: `# Ejemplos

## Instalar

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
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
    title: 'Migración',
    description: 'Notas de actualización de 1.0.x / 1.1.0 a 1.2.0.',
    groupTitle: 'Referencia',
    markdown: `# Migración

## 1.1.0 → 1.2.0

1.2.0 añade **Buttons Only** y **Headless** junto a Full Checkout.

### Qué cambió

- Nuevo componente \`<easy-payment-buttons>\`
- Nueva API de sesión \`EasyPaymentsHeadless\`
- La localización de Full Checkout introducida en 1.1.0 sigue disponible

### Pasos de actualización

1. Instala \`@easy-payments/angular@1.2.0\`
2. Mantén el uso actual de \`<easy-payments>\` o adopta Buttons Only / Headless
3. Realiza pruebas de regresión de los flujos mock y sandbox de los métodos que actives

Guías por modo: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless)

## 1.0.x → 1.2.0

Si todavía usas 1.0.x, trátalo como una actualización combinada de localización + modos:

1. Instala \`@easy-payments/angular@1.2.0\`
2. Opcionalmente define \`locale\` / \`translations\` en Full Checkout o Buttons Only
3. Realiza pruebas de regresión de los textos del checkout en en / es / pt
4. Opcionalmente adopta Buttons Only o Headless

El nombre del paquete y el rango peer de Angular (\`>=20.3.0 <23.0.0\`) siguen igual. No se añadió ninguna semántica de conversión de moneda.
`,
  },
};
