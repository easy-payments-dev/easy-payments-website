import { HISTORICAL_ANGULAR_API } from '../../core/docs/historical-api.evidence';
import { docsPagePath } from '../../core/docs/docs-url';
import {
  PlaygroundCodeBundle,
  PlaygroundConfig,
  PlaygroundPaymentMethod,
} from './playground.types';

function escapeSingleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function methodsLiteral(methods: readonly PlaygroundPaymentMethod[]): string {
  return `[${methods.map((method) => `'${method}'`).join(', ')}]`;
}

/**
 * Generates Angular integration snippets from verified published APIs only.
 * Intentionally omits unpublished fields (baseUrl, visualStyle, etc.).
 */
export function generatePlaygroundCode(
  config: PlaygroundConfig,
): PlaygroundCodeBundle {
  const evidence = HISTORICAL_ANGULAR_API[config.version];
  const amount = Number.isFinite(config.product.amount)
    ? config.product.amount
    : 0;
  const quantity = Math.max(1, Math.floor(config.product.quantity || 1));
  const name = escapeSingleQuoted(config.product.name.trim() || 'Product');
  const description = escapeSingleQuoted(config.product.description.trim());
  const currency = escapeSingleQuoted(config.product.currency || 'USD');
  const includeLocale = evidence.localization;

  const localeInput = includeLocale
    ? `\n      locale="${config.locale}"`
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
  readonly product: PaymentProduct = {
    id: 'premium',
    name: '${name}',
    description: '${description}',
    amount: ${amount},
    currency: '${currency}',
    quantity: ${quantity},
  };

  readonly methods: PaymentMethod[] = ${methodsLiteral(config.methods)};${localeField}

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

  return {
    install,
    appConfig,
    componentTs,
    componentHtml,
    docsHref: docsPagePath('angular', config.version, 'getting-started'),
  };
}
