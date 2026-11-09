import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'headless',
  slug: 'headless',
  title: 'Headless',
  description:
    'Build a custom checkout UI on EasyPaymentsHeadless while the library mounts provider surfaces.',
  order: 38,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Headless

**When to choose it:** you own every pixel of checkout UI — method chips, labels, and confirm CTAs — and only need Easy Payments to mount provider surfaces (Card / Klarna / Affirm Payment Element, PayPal Buttons, Google Pay, Apple Pay) and emit normalized results.

**Runnable mock demo:** [Playground → Headless](/playground?demo=headless)
The Playground Headless layout is a **consumer-built example UI**; Headless itself does not ship checkout chrome.

## Install and providers

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

## Complete Headless example

Your app defines product, price, currency, methods, and order; builds the UI; then uses \`EasyPaymentsHeadless.createSession\` → \`initialize\` → \`selectMethod\` → \`mount\` → \`confirm\` (for confirm-style methods).

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

## Public Headless flow

1. \`createSession({ product, methods, ... })\`
2. Subscribe to \`events.success\` / \`cancel\` / \`error\` (and optionally \`started\`, \`pending\`, \`methodChange\`)
3. \`initialize()\` then read \`availableMethods()\`
4. \`selectMethod\` + \`mount(method, container)\`
5. \`confirm()\` for \`card\` / \`klarna\` / \`affirm\` / mock — wallets and PayPal use their official buttons
6. \`destroy()\` when leaving the page

## Notes

- Klarna mock mounts are **DEMO** adapters — not official Klarna UI.
- Prefer Buttons Only when a library strip is enough: [Buttons Only](./buttons-only).
- Prefer Full Checkout for the complete shell: [Full Checkout](./full-checkout). Overview: [Checkout modes](./checkout-modes).
`,
};