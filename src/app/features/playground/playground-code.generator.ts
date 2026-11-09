import { HISTORICAL_ANGULAR_API } from '../../core/docs/historical-api.evidence';
import { docsPagePath } from '../../core/docs/docs-url';
import { PLAYGROUND_BUTTONS_APPEARANCE } from './playground.defaults';
import {
  PlaygroundButtonsLayout,
  PlaygroundCodeBundle,
  PlaygroundConfig,
  PlaygroundDemoMode,
  PlaygroundPaymentMethod,
} from './playground.types';

export interface PlaygroundCodeOptions {
  /** Demo surface to generate for. Defaults to Full Checkout. */
  mode?: PlaygroundDemoMode;
  /** Buttons Only `layout` input. Defaults to `horizontal` (library demo). */
  buttonsLayout?: PlaygroundButtonsLayout;
}

function escapeSingleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function methodsLiteral(methods: readonly PlaygroundPaymentMethod[]): string {
  return `[${methods.map((method) => `'${method}'`).join(', ')}]`;
}

function productAndMethodsTs(
  config: PlaygroundConfig,
  localeField: string,
): string {
  const amount = Number.isFinite(config.product.amount)
    ? config.product.amount
    : 0;
  const quantity = Math.max(1, Math.floor(config.product.quantity || 1));
  const name = escapeSingleQuoted(config.product.name.trim() || 'Product');
  const description = escapeSingleQuoted(config.product.description.trim());
  const currency = escapeSingleQuoted(config.product.currency || 'USD');

  return `  readonly product: PaymentProduct = {
    id: 'premium',
    name: '${name}',
    description: '${description}',
    amount: ${amount},
    currency: '${currency}',
    quantity: ${quantity},
  };

  readonly methods: PaymentMethod[] = ${methodsLiteral(config.methods)};${localeField}`;
}

function fullCheckoutSnippets(
  config: PlaygroundConfig,
  localeField: string,
  localeInput: string,
): { componentTs: string; componentHtml: string } {
  const componentTs = `import { Component } from '@angular/core';
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
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent {
${productAndMethodsTs(config, localeField)}

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification.
    console.log('success', result);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result);
  }

  onError(error: PaymentError): void {
    console.error('error', error.code, error.message);
  }

  onSuccessContinue(result: PaymentResult): void {
    console.log('successContinue', result);
  }
}`;

  const componentHtml = `<easy-payments
  [product]="product"
  [methods]="methods"
  theme="${config.theme}"
  appearance="${config.appearance}"
  [maxWidth]="${config.maxWidth}"
  successBehavior="${config.successBehavior}"${localeInput}
  (success)="onSuccess($event)"
  (cancel)="onCancel($event)"
  (error)="onError($event)"
  (successContinue)="onSuccessContinue($event)"
/>`;

  return { componentTs, componentHtml };
}

function buttonsOnlySnippets(
  config: PlaygroundConfig,
  layout: PlaygroundButtonsLayout,
  localeField: string,
  localeInput: string,
): { componentTs: string; componentHtml: string } {
  const appearanceLines = Object.entries(PLAYGROUND_BUTTONS_APPEARANCE)
    .map(([key, value]) => `    ${key}: '${String(value)}',`)
    .join('\n');

  const componentTs = `import { Component } from '@angular/core';
import {
  EasyPaymentButtonsAppearance,
  EasyPaymentButtonsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
} from '@easy-payments/angular';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [EasyPaymentButtonsComponent],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent {
${productAndMethodsTs(config, localeField)}

  /** Shared strip chrome for Card / Klarna / Affirm selectors and wallet buttons. */
  readonly buttonsAppearance: EasyPaymentButtonsAppearance = {
${appearanceLines}
  };

  onStarted(event: { method: PaymentMethod }): void {
    console.log('started', event.method);
  }

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification.
    console.log('success', result);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result);
  }

  onError(error: PaymentError): void {
    console.error('error', error.code, error.message);
  }
}`;

  const componentHtml = `<easy-payment-buttons
  [product]="product"
  [methods]="methods"
  layout="${layout}"
  theme="${config.theme}"${localeInput}
  [buttonsAppearance]="buttonsAppearance"
  checkoutInstanceId="checkout-buttons"
  (started)="onStarted($event)"
  (success)="onSuccess($event)"
  (cancel)="onCancel($event)"
  (error)="onError($event)"
/>`;

  return { componentTs, componentHtml };
}

function headlessSnippets(
  config: PlaygroundConfig,
  localeField: string,
): { componentTs: string; componentHtml: string } {
  const localeOption =
    localeField.length > 0 ? '\n      locale: this.locale,' : '';

  const componentTs = `import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import {
  EasyPaymentsHeadless,
  HeadlessCheckoutSession,
  HeadlessMountHandle,
  PaymentMethod,
  PaymentProduct,
} from '@easy-payments/angular';

@Component({
  selector: 'app-checkout',
  standalone: true,
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements AfterViewInit, OnDestroy {
  private readonly headless = inject(EasyPaymentsHeadless);
  private readonly mountHost = viewChild.required<ElementRef<HTMLElement>>('mountHost');
  private session: HeadlessCheckoutSession | null = null;
  private mounted: HeadlessMountHandle | null = null;

${productAndMethodsTs(config, localeField)}

  async ngAfterViewInit(): Promise<void> {
    // You own the layout; the library only mounts provider UI into your host element.
    this.session = this.headless.createSession({
      product: this.product,
      methods: this.methods,
      theme: '${config.theme}',${localeOption}
      checkoutInstanceId: 'checkout-headless',
    });
    this.session.events.success.subscribe((result) => console.log('success', result));
    this.session.events.cancel.subscribe((result) => console.log('cancel', result));
    this.session.events.error.subscribe((error) => console.error('error', error.code));
    await this.session.initialize();
  }

  async select(method: PaymentMethod): Promise<void> {
    if (!this.session) return;
    await this.mounted?.unmount();
    this.session.selectMethod(method);
    this.mounted = await this.session.mount(method, this.mountHost().nativeElement);
  }

  /** Card / Klarna / Affirm only; wallets use their official buttons. */
  confirm(): Promise<void> | undefined {
    return this.session?.confirm();
  }

  async ngOnDestroy(): Promise<void> {
    await this.mounted?.unmount();
    await this.session?.destroy();
  }
}`;

  const componentHtml = `@for (method of methods; track method) {
  <button type="button" (click)="select(method)">{{ method }}</button>
}

<div #mountHost></div>

<button type="button" (click)="confirm()">Confirm payment</button>`;

  return { componentTs, componentHtml };
}

/**
 * Generates Angular integration snippets from verified public APIs only.
 * Full Checkout is available for every supported version; Buttons Only and
 * Headless snippets are generated only for versions whose evidence includes them
 * (1.2.0+). Intentionally omits fields that are not part of the public API
 * (baseUrl, etc.).
 */
export function generatePlaygroundCode(
  config: PlaygroundConfig,
  options: PlaygroundCodeOptions = {},
): PlaygroundCodeBundle {
  const evidence = HISTORICAL_ANGULAR_API[config.version];
  const requestedMode = options.mode ?? 'full';
  const mode: PlaygroundDemoMode =
    (requestedMode === 'buttons' && evidence.hasButtonsOnly) ||
    (requestedMode === 'headless' && evidence.hasHeadless)
      ? requestedMode
      : 'full';
  const currency = escapeSingleQuoted(config.product.currency || 'USD');
  const includeLocale = evidence.localization;

  const localeInput = includeLocale
    ? `\n  locale="${config.locale}"`
    : '';
  const localeField = includeLocale
    ? `\n  readonly locale = '${config.locale}' as const;`
    : '';

  const install = `npm install @easy-payments/angular@${config.version} @stripe/stripe-js`;

  const appConfig = `import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        // Publishable / client IDs only — never secret keys in Angular.
        stripe: { publishableKey: 'pk_test_your_publishable_key' },
        paypal: { clientId: 'your_paypal_client_id', currency: '${currency}', intent: 'capture' },
        applePay: { merchantName: 'Your Store', countryCode: 'US' },
        googlePay: { merchantName: 'Your Store', environment: 'TEST', countryCode: 'US' },
        klarna: { purchaseCountry: 'US' },
        affirm: { purchaseCountry: 'US' },
      },
      backend: {
        createPaymentUrl: 'https://api.example.com/api/payments/create',
        paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
        paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
        klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
        affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
      },
      // enableMockMode: true // local demos only — never in production
    }),
  ],
};`;

  const snippets =
    mode === 'buttons'
      ? buttonsOnlySnippets(
          config,
          options.buttonsLayout ?? 'horizontal',
          localeField,
          localeInput,
        )
      : mode === 'headless'
        ? headlessSnippets(config, localeField)
        : fullCheckoutSnippets(config, localeField, localeInput);

  return {
    install,
    appConfig,
    componentTs: snippets.componentTs,
    componentHtml: snippets.componentHtml,
    docsHref: docsPagePath('angular', config.version, 'getting-started'),
  };
}
