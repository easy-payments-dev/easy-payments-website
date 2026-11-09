import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  EasyPaymentsHeadless,
  PAYMENT_METHOD_LABELS,
  PaymentError,
  type EasyPaymentsLocale,
  type HeadlessCheckoutSession,
  type HeadlessMethodInteraction,
  type HeadlessMountHandle,
  type PaymentMethod,
  type PaymentProduct,
  type PaymentResult,
  type PaymentTheme,
} from '@easy-payments/angular';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';

interface HeadlessMethodRow {
  method: PaymentMethod;
  available: boolean;
  interaction: HeadlessMethodInteraction;
  mock: boolean;
}

interface HeadlessLifecycleEntry {
  id: number;
  label: string;
}

/** Same terminal error delivered twice (event + rejected promise) is shown once. */
const ERROR_DEDUPE_MS = 1500;
const LIFECYCLE_LIMIT = 8;

/**
 * Merchant-owned Headless demo UI. Layout and copy belong to the website;
 * payment mounts and lifecycle come from `EasyPaymentsHeadless` (public API).
 * Mirrors the structure of the library demo panel: product, method list,
 * mount host, confirm CTA, and lifecycle events.
 */
@Component({
  selector: 'app-playground-headless-demo',
  imports: [],
  templateUrl: './playground-headless-demo.html',
  styleUrl: './playground-headless-demo.scss',
})
export class PlaygroundHeadlessDemo {
  readonly product = input.required<PaymentProduct>();
  readonly methods = input.required<readonly PaymentMethod[]>();
  readonly theme = input<PaymentTheme>('system');
  readonly locale = input<EasyPaymentsLocale>('auto');
  readonly resetToken = input(0);

  readonly success = output<PaymentResult>();
  readonly cancel = output<PaymentResult>();
  readonly error = output<PaymentError>();
  readonly started = output<{ method: PaymentMethod }>();

  private readonly headless = inject(EasyPaymentsHeadless);
  private readonly i18n = inject(SiteI18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mountHost = viewChild<ElementRef<HTMLElement>>('mountHost');

  private session: HeadlessCheckoutSession | null = null;
  private mountHandle: HeadlessMountHandle | null = null;
  private bootGeneration = 0;
  private eventSubscriptions = new Subscription();
  private lifecycleSeq = 0;
  private lastErrorKey = '';
  private lastErrorAt = 0;

  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly bootStatus = signal<'idle' | 'ready' | 'failed'>('idle');
  protected readonly bootError = signal<string | null>(null);
  protected readonly uiSelected = signal<PaymentMethod | null>(null);
  protected readonly mountBusy = signal(false);
  protected readonly mountReady = signal(false);
  protected readonly confirmBusy = signal(false);
  protected readonly available = signal<readonly HeadlessMethodRow[]>([]);
  protected readonly sessionState = signal<string | null>(null);
  protected readonly lifecycle = signal<readonly HeadlessLifecycleEntry[]>([]);

  protected readonly selectedRow = computed(
    () =>
      this.available().find((entry) => entry.method === this.uiSelected()) ??
      null,
  );

  /** Confirm applies to Stripe confirm methods and mock-mode stand-ins. */
  protected readonly showConfirm = computed(() => {
    const interaction = this.selectedRow()?.interaction;
    return interaction === 'confirm' || interaction === 'mock';
  });

  protected readonly canConfirm = computed(
    () => this.showConfirm() && this.mountReady() && !this.confirmBusy(),
  );

  protected readonly priceLabel = computed(() => {
    const product = this.product();
    return this.formatMoney(product.amount, product.currency);
  });

  protected readonly totalLabel = computed(() => {
    const product = this.product();
    const quantity = product.quantity ?? 1;
    return quantity > 1
      ? this.formatMoney(product.amount * quantity, product.currency)
      : null;
  });

  constructor() {
    effect(() => {
      const product = this.product();
      const methods = this.methods();
      const theme = this.theme();
      const locale = this.locale();
      void this.resetToken();
      untracked(() => {
        void this.bootSession(product, [...methods], theme, locale);
      });
    });

    this.destroyRef.onDestroy(() => {
      this.bootGeneration += 1;
      void this.teardown();
    });
  }

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }

  protected interactionLabel(row: HeadlessMethodRow): string {
    switch (row.interaction) {
      case 'confirm':
        return this.t('playground.headless.interaction.confirm');
      case 'mock':
        return this.t('playground.headless.interaction.mock');
      default:
        return this.t('playground.headless.interaction.wallet');
    }
  }

  protected confirmLabel(): string {
    if (this.confirmBusy()) {
      return this.t('playground.headless.processing');
    }
    return this.t('playground.headless.confirm');
  }

  protected async selectMethod(method: PaymentMethod): Promise<void> {
    if (!this.session || this.mountBusy()) {
      return;
    }
    this.uiSelected.set(method);
    this.session.selectMethod(method);
    await this.mountSelected(method);
  }

  protected async confirmPayment(): Promise<void> {
    if (!this.session || !this.canConfirm()) {
      return;
    }
    this.confirmBusy.set(true);
    try {
      await this.session.confirm();
    } catch (err) {
      this.emitError(
        err instanceof PaymentError
          ? err
          : new PaymentError({
              code: 'PAYMENT_FAILED',
              message: err instanceof Error ? err.message : 'Confirm failed',
            }),
      );
    } finally {
      this.confirmBusy.set(false);
      this.refreshState();
    }
  }

  private formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }

  private refreshState(): void {
    this.sessionState.set(this.session?.state() ?? null);
  }

  private log(label: string): void {
    this.lifecycleSeq += 1;
    const entry: HeadlessLifecycleEntry = { id: this.lifecycleSeq, label };
    this.lifecycle.update((entries) =>
      [entry, ...entries].slice(0, LIFECYCLE_LIMIT),
    );
  }

  /** Emits a terminal error once even if the session event and a rejection both report it. */
  private emitError(err: PaymentError): void {
    const key = `${err.code}|${err.message}`;
    const now = Date.now();
    if (key === this.lastErrorKey && now - this.lastErrorAt < ERROR_DEDUPE_MS) {
      return;
    }
    this.lastErrorKey = key;
    this.lastErrorAt = now;
    this.log(`error · ${err.code}`);
    this.error.emit(err);
  }

  private async bootSession(
    product: PaymentProduct,
    methods: PaymentMethod[],
    theme: PaymentTheme,
    locale: EasyPaymentsLocale,
  ): Promise<void> {
    const generation = ++this.bootGeneration;
    await this.teardown();
    if (generation !== this.bootGeneration) {
      return;
    }
    if (methods.length === 0) {
      this.bootStatus.set('failed');
      this.bootError.set(this.t('playground.headless.noMethods'));
      return;
    }

    this.bootStatus.set('idle');
    this.bootError.set(null);
    this.lifecycle.set([]);
    try {
      const session = this.headless.createSession({
        product,
        methods,
        theme,
        locale,
        checkoutInstanceId: 'website-playground-headless',
      });
      this.session = session;
      this.bindEvents(session);
      await session.initialize();
      if (generation !== this.bootGeneration) {
        await session.destroy();
        return;
      }
      this.available.set(
        session.availableMethods().map((entry) => ({
          method: entry.method,
          available: entry.available,
          interaction: entry.interaction,
          mock: entry.mock,
        })),
      );
      this.refreshState();
      this.bootStatus.set('ready');
      const first = session.availableMethods().find((entry) => entry.available);
      if (first) {
        this.uiSelected.set(first.method);
        session.selectMethod(first.method);
        await this.mountSelected(first.method);
      }
    } catch (err) {
      this.bootStatus.set('failed');
      this.bootError.set(
        err instanceof Error ? err.message : this.t('playground.headless.bootFailed'),
      );
    }
  }

  private bindEvents(session: HeadlessCheckoutSession): void {
    this.eventSubscriptions.unsubscribe();
    this.eventSubscriptions = new Subscription();
    this.eventSubscriptions.add(
      session.events.success.subscribe((result) => {
        this.refreshState();
        this.log(`success · ${result.method}`);
        this.success.emit(result);
      }),
    );
    this.eventSubscriptions.add(
      session.events.cancel.subscribe((result) => {
        this.refreshState();
        this.log(`cancel · ${result.method}`);
        this.cancel.emit(result);
      }),
    );
    this.eventSubscriptions.add(
      session.events.error.subscribe((err) => {
        this.refreshState();
        this.emitError(err);
      }),
    );
    this.eventSubscriptions.add(
      session.events.started.subscribe((event) => {
        this.refreshState();
        this.log(`started · ${event.method}`);
        this.started.emit({ method: event.method });
      }),
    );
    this.eventSubscriptions.add(
      session.events.pending.subscribe((result) => {
        this.refreshState();
        this.log(`pending · ${result.method}`);
      }),
    );
  }

  private async mountSelected(method: PaymentMethod): Promise<void> {
    const host = this.mountHost()?.nativeElement;
    const session = this.session;
    if (!host || !session) {
      return;
    }
    this.mountBusy.set(true);
    this.mountReady.set(false);
    try {
      if (this.mountHandle) {
        await this.mountHandle.unmount();
        this.mountHandle = null;
      }
      host.replaceChildren();
      this.mountHandle = await session.mount(method, host);
      this.mountReady.set(true);
    } catch (err) {
      this.emitError(
        err instanceof PaymentError
          ? err
          : new PaymentError({
              code: 'SDK_LOAD_FAILED',
              message: err instanceof Error ? err.message : 'Mount failed',
              method,
            }),
      );
    } finally {
      this.mountBusy.set(false);
      this.refreshState();
    }
  }

  private async teardown(): Promise<void> {
    this.eventSubscriptions.unsubscribe();
    this.eventSubscriptions = new Subscription();
    try {
      if (this.mountHandle) {
        await this.mountHandle.unmount();
      }
    } catch {
      // ignore
    }
    this.mountHandle = null;
    this.mountReady.set(false);
    this.uiSelected.set(null);
    this.available.set([]);
    this.sessionState.set(null);
    if (this.session) {
      try {
        await this.session.destroy();
      } catch {
        // ignore
      }
    }
    this.session = null;
    this.mountHost()?.nativeElement.replaceChildren();
  }
}
