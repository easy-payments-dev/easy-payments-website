import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import {
  EasyPaymentButtonsComponent,
  EasyPaymentsComponent,
  EasyPaymentsLocale,
  MockPaymentController,
  MockPaymentOutcome,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
} from '@easy-payments/angular';
import { HISTORICAL_ANGULAR_API } from '../../core/docs/historical-api.evidence';
import { getLatestPublishedAngularVersion } from '../../data/frameworks';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpBadge } from '../../shared/ui/badge/badge';
import { EpButton } from '../../shared/ui/button/button';
import { EpCodeBlock } from '../../shared/ui/code-block/code-block';
import { EpContainer } from '../../shared/ui/container/container';
import { PlaygroundHeadlessDemo } from './playground-headless-demo';
import { generatePlaygroundCode } from './playground-code.generator';
import {
  PLAYGROUND_BUTTONS_APPEARANCE,
  PLAYGROUND_DEFAULT_SNIPPET_VERSION,
  PLAYGROUND_VERSIONS_BY_MODE,
  createDefaultPlaygroundConfig,
  playgroundSupportsVersion,
} from './playground.defaults';
import {
  PLAYGROUND_CURRENCIES,
  PLAYGROUND_METHOD_OPTIONS,
  PlaygroundAppearance,
  PlaygroundButtonsLayout,
  PlaygroundCheckoutTheme,
  PlaygroundConfig,
  PlaygroundDemoMode,
  PlaygroundLocale,
  PlaygroundPaymentMethod,
  PlaygroundSimEvent,
  PlaygroundSimEventName,
  PlaygroundSuccessBehavior,
  PlaygroundVersion,
} from './playground.types';
import { validatePlaygroundConfig } from './playground.validation';

@Component({
  selector: 'app-playground-page',
  imports: [
    RouterLink,
    EpContainer,
    EpAlert,
    EpBadge,
    EpButton,
    EpCodeBlock,
    EasyPaymentsComponent,
    EasyPaymentButtonsComponent,
    PlaygroundHeadlessDemo,
  ],
  templateUrl: './playground.page.html',
  styleUrl: './playground.page.scss',
})
export class PlaygroundPage {
  private readonly i18n = inject(SiteI18nService);
  private readonly mockController = inject(MockPaymentController);
  private readonly route = inject(ActivatedRoute);
  private eventSeq = 0;

  /** Terminal events repeated inside this window are logged once. */
  private static readonly EVENT_DEDUPE_MS = 1500;
  private readonly recentTerminalEvents = new Map<string, number>();

  protected readonly methodOptions = PLAYGROUND_METHOD_OPTIONS;
  /** Public [buttonsAppearance] shared by every Buttons Only slot (matches library demo). */
  protected readonly buttonsAppearance = PLAYGROUND_BUTTONS_APPEARANCE;
  protected readonly currencies = PLAYGROUND_CURRENCIES;
  protected readonly mockOutcomes: readonly MockPaymentOutcome[] = [
    'success',
    'cancelled',
    'failed',
  ];
  protected readonly demoModes: readonly PlaygroundDemoMode[] = [
    'full',
    'buttons',
    'headless',
  ];

  protected readonly config = signal<PlaygroundConfig>(
    createDefaultPlaygroundConfig(PLAYGROUND_DEFAULT_SNIPPET_VERSION, {
      name: this.i18n.t('playground.product.name'),
      description: this.i18n.t('playground.product.description'),
    }),
  );
  protected readonly demoMode = signal<PlaygroundDemoMode>('full');
  protected readonly buttonsLayout = signal<PlaygroundButtonsLayout>('horizontal');
  protected readonly eventLog = signal<readonly PlaygroundSimEvent[]>([]);
  protected readonly mockOutcome = signal<MockPaymentOutcome>('success');
  /** Bumped when demo/config reset should remount interactive hosts. */
  protected readonly remountToken = signal(0);

  protected readonly issues = computed(() =>
    validatePlaygroundConfig(this.config()),
  );
  protected readonly isValid = computed(() => this.issues().length === 0);
  protected readonly evidence = computed(
    () => HISTORICAL_ANGULAR_API[this.config().version],
  );
  /** Snippet versions offered for the active demo mode. */
  protected readonly availableVersions = computed(
    () => PLAYGROUND_VERSIONS_BY_MODE[this.demoMode()],
  );
  protected readonly supportsLocale = computed(
    () => this.evidence().localization,
  );
  protected readonly code = computed(() =>
    generatePlaygroundCode(this.config(), {
      mode: this.demoMode(),
      buttonsLayout: this.buttonsLayout(),
    }),
  );
  protected readonly language = this.i18n.language;

  protected readonly checkoutProduct = computed<PaymentProduct>(() => {
    const product = this.config().product;
    return {
      id: 'playground-premium',
      name: product.name.trim() || 'Product',
      description: product.description.trim() || undefined,
      amount: product.amount,
      currency: product.currency,
      quantity: product.quantity,
    };
  });

  protected readonly checkoutMethods = computed<PaymentMethod[]>(
    () => [...this.config().methods] as PaymentMethod[],
  );

  protected readonly checkoutLocale = computed<EasyPaymentsLocale>(() => {
    if (this.supportsLocale()) {
      const configured = this.config().locale;
      if (configured !== 'auto') {
        return configured;
      }
    }
    return this.i18n.checkoutLocale();
  });

  protected readonly showFull = computed(() => this.demoMode() === 'full');
  protected readonly showButtons = computed(() => this.demoMode() === 'buttons');
  protected readonly showHeadless = computed(
    () => this.demoMode() === 'headless',
  );

  constructor() {
    effect(() => {
      this.mockController.setOutcome(this.mockOutcome());
    });

    effect(() => {
      const name = this.i18n.t('playground.product.name');
      const description = this.i18n.t('playground.product.description');
      this.config.update((current) => ({
        ...current,
        product: { ...current.product, name, description },
      }));
    });

    this.route.queryParamMap
      .pipe(
        map((params) => params.get('demo')),
        takeUntilDestroyed(),
      )
      .subscribe((demo) => {
        if (demo === 'full' || demo === 'buttons' || demo === 'headless') {
          this.setDemoMode(demo);
        }
      });
  }

  private localizedProductDefaults(): { name: string; description: string } {
    return {
      name: this.i18n.t('playground.product.name'),
      description: this.i18n.t('playground.product.description'),
    };
  }

  protected guideHref(): string {
    const latest = getLatestPublishedAngularVersion();
    switch (this.demoMode()) {
      case 'full':
        return `/docs/angular/${latest}/full-checkout`;
      case 'buttons':
        return `/docs/angular/${latest}/buttons-only`;
      case 'headless':
        return `/docs/angular/${latest}/headless`;
    }
  }

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }

  protected demoLabel(mode: PlaygroundDemoMode): string {
    switch (mode) {
      case 'full':
        return this.t('playground.demo.full');
      case 'buttons':
        return this.t('playground.demo.buttons');
      case 'headless':
        return this.t('playground.demo.headless');
    }
  }

  protected setDemoMode(mode: PlaygroundDemoMode): void {
    if (this.demoMode() === mode) {
      return;
    }
    this.demoMode.set(mode);
    if (!playgroundSupportsVersion(mode, this.config().version)) {
      this.setVersion('1.2.0');
    }
    this.eventLog.set([]);
    this.recentTerminalEvents.clear();
    this.remountToken.update((value) => value + 1);
  }

  protected setVersion(version: PlaygroundVersion): void {
    if (!playgroundSupportsVersion(this.demoMode(), version)) {
      return;
    }
    const localized = HISTORICAL_ANGULAR_API[version].localization;
    this.config.update((current) => ({
      ...createDefaultPlaygroundConfig(version),
      product: current.product,
      methods: current.methods,
      theme: current.theme,
      appearance: current.appearance,
      successBehavior: current.successBehavior,
      maxWidth: current.maxWidth,
      locale: localized
        ? current.locale === 'auto'
          ? this.i18n.checkoutLocale()
          : current.locale
        : 'auto',
      version,
    }));
    this.remountToken.update((value) => value + 1);
  }

  protected patchProduct<K extends keyof PlaygroundConfig['product']>(
    key: K,
    value: PlaygroundConfig['product'][K],
  ): void {
    this.config.update((current) => ({
      ...current,
      product: { ...current.product, [key]: value },
    }));
  }

  protected onAmountInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.patchProduct('amount', Number(raw));
  }

  protected onQuantityInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.patchProduct('quantity', Number.parseInt(raw, 10));
  }

  protected onMaxWidthInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.config.update((current) => ({
      ...current,
      maxWidth: Number.parseInt(raw, 10),
    }));
  }

  protected toggleMethod(method: PlaygroundPaymentMethod): void {
    this.config.update((current) => {
      const exists = current.methods.includes(method);
      const methods = exists
        ? current.methods.filter((entry) => entry !== method)
        : [...current.methods, method];
      return { ...current, methods };
    });
    this.remountToken.update((value) => value + 1);
    this.eventLog.set([]);
  }

  protected setTheme(theme: PlaygroundCheckoutTheme): void {
    this.config.update((current) => ({ ...current, theme }));
    this.remountToken.update((value) => value + 1);
  }

  protected setAppearance(appearance: PlaygroundAppearance): void {
    this.config.update((current) => ({ ...current, appearance }));
    this.remountToken.update((value) => value + 1);
  }

  protected setSuccessBehavior(successBehavior: PlaygroundSuccessBehavior): void {
    this.config.update((current) => ({ ...current, successBehavior }));
    this.remountToken.update((value) => value + 1);
  }

  protected setLocale(locale: PlaygroundLocale): void {
    if (!this.supportsLocale()) {
      return;
    }
    this.config.update((current) => ({ ...current, locale }));
    this.remountToken.update((value) => value + 1);
  }

  protected setButtonsLayout(layout: PlaygroundButtonsLayout): void {
    this.buttonsLayout.set(layout);
    this.remountToken.update((value) => value + 1);
  }

  protected setMockOutcome(outcome: MockPaymentOutcome): void {
    this.mockOutcome.set(outcome);
  }

  protected resetDefaults(): void {
    const version = this.config().version;
    this.config.set({
      ...createDefaultPlaygroundConfig(version, this.localizedProductDefaults()),
      locale: HISTORICAL_ANGULAR_API[version].localization
        ? this.i18n.checkoutLocale()
        : 'auto',
    });
    this.mockOutcome.set('success');
    this.buttonsLayout.set('horizontal');
    this.mockController.reset();
    this.eventLog.set([]);
    this.recentTerminalEvents.clear();
    this.remountToken.update((value) => value + 1);
  }

  protected isMethodEnabled(method: PlaygroundPaymentMethod): boolean {
    return this.config().methods.includes(method);
  }

  protected issueFor(field: string): string | null {
    return this.issues().find((issue) => issue.field === field)?.message ?? null;
  }

  protected onSuccess(result: PaymentResult): void {
    this.pushEvent(
      'success',
      `Mock success · ${result.method} · ${result.message ?? 'ok'}`,
    );
  }

  protected onCancel(result: PaymentResult): void {
    this.pushEvent(
      'cancel',
      `Mock cancel · ${result.method} · ${result.message ?? 'cancelled'}`,
    );
  }

  protected onError(error: PaymentError): void {
    this.pushEvent('error', `Mock error · ${error.code} · ${error.message}`);
  }

  protected onSuccessContinue(result: PaymentResult): void {
    this.pushEvent(
      'successContinue',
      `Mock successContinue · ${result.method}`,
    );
  }

  protected onStarted(event: { method: PaymentMethod }): void {
    this.pushEvent('started', `Mock started · ${event.method}`);
  }

  protected clearEventLog(): void {
    this.eventLog.set([]);
    this.recentTerminalEvents.clear();
  }

  private pushEvent(name: PlaygroundSimEventName, detail: string): void {
    if (this.isDuplicateTerminalEvent(name, detail)) {
      return;
    }
    this.eventSeq += 1;
    const entry: PlaygroundSimEvent = {
      id: `evt-${this.eventSeq}`,
      at: new Date().toLocaleTimeString(),
      name,
      detail,
    };
    this.eventLog.update((events) => [entry, ...events].slice(0, 20));
  }

  /**
   * success / cancel / error can reach the page twice for one outcome (for
   * example a rejected confirm() plus the session error event). Log it once.
   */
  private isDuplicateTerminalEvent(
    name: PlaygroundSimEventName,
    detail: string,
  ): boolean {
    if (name !== 'success' && name !== 'cancel' && name !== 'error') {
      return false;
    }
    const key = `${name}|${detail}`;
    const now = Date.now();
    const previous = this.recentTerminalEvents.get(key);
    this.recentTerminalEvents.set(key, now);
    return (
      previous !== undefined && now - previous < PlaygroundPage.EVENT_DEDUPE_MS
    );
  }
}
