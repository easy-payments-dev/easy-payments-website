import { NgClass } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HISTORICAL_ANGULAR_API } from '../../core/docs/historical-api.evidence';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpBadge } from '../../shared/ui/badge/badge';
import { EpButton } from '../../shared/ui/button/button';
import { EpCodeBlock } from '../../shared/ui/code-block/code-block';
import { EpContainer } from '../../shared/ui/container/container';
import { generatePlaygroundCode } from './playground-code.generator';
import { createDefaultPlaygroundConfig } from './playground.defaults';
import {
  PLAYGROUND_CURRENCIES,
  PLAYGROUND_METHOD_OPTIONS,
  PlaygroundAppearance,
  PlaygroundCheckoutTheme,
  PlaygroundConfig,
  PlaygroundLocale,
  PlaygroundPaymentMethod,
  PlaygroundPreviewState,
  PlaygroundSimEvent,
  PlaygroundSimEventName,
  PlaygroundSuccessBehavior,
  PlaygroundVersion,
} from './playground.types';
import { validatePlaygroundConfig } from './playground.validation';

@Component({
  selector: 'app-playground-page',
  imports: [
    NgClass,
    RouterLink,
    EpContainer,
    EpAlert,
    EpBadge,
    EpButton,
    EpCodeBlock,
  ],
  templateUrl: './playground.page.html',
  styleUrl: './playground.page.scss',
})
export class PlaygroundPage {
  private eventSeq = 0;

  protected readonly methodOptions = PLAYGROUND_METHOD_OPTIONS;
  protected readonly currencies = PLAYGROUND_CURRENCIES;

  protected readonly config = signal<PlaygroundConfig>(
    createDefaultPlaygroundConfig(),
  );
  protected readonly selectedMethod = signal<PlaygroundPaymentMethod | null>(
    null,
  );
  protected readonly previewState = signal<PlaygroundPreviewState>('idle');
  protected readonly eventLog = signal<readonly PlaygroundSimEvent[]>([]);

  protected readonly issues = computed(() =>
    validatePlaygroundConfig(this.config()),
  );
  protected readonly isValid = computed(() => this.issues().length === 0);
  protected readonly evidence = computed(
    () => HISTORICAL_ANGULAR_API[this.config().version],
  );
  protected readonly supportsLocale = computed(
    () => this.evidence().localization,
  );
  protected readonly code = computed(() =>
    generatePlaygroundCode(this.config()),
  );
  protected readonly resolvedPreviewTheme = computed(() => {
    const theme = this.config().theme;
    if (theme !== 'system') {
      return theme;
    }
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  protected readonly formattedAmount = computed(() => {
    const product = this.config().product;
    try {
      return new Intl.NumberFormat(this.previewLocaleTag(), {
        style: 'currency',
        currency: product.currency || 'USD',
      }).format(product.amount * Math.max(1, product.quantity || 1));
    } catch {
      return `${product.amount} ${product.currency}`;
    }
  });

  protected setVersion(version: PlaygroundVersion): void {
    this.config.update((current) => ({
      ...createDefaultPlaygroundConfig(version),
      product: current.product,
      methods: current.methods,
      theme: current.theme,
      appearance: current.appearance,
      successBehavior: current.successBehavior,
      maxWidth: current.maxWidth,
      locale: version === '1.1.0' ? current.locale : 'auto',
      version,
    }));
    this.resetSimulation(false);
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
    if (this.selectedMethod() === method) {
      this.selectedMethod.set(null);
      this.previewState.set('idle');
    }
  }

  protected setTheme(theme: PlaygroundCheckoutTheme): void {
    this.config.update((current) => ({ ...current, theme }));
  }

  protected setAppearance(appearance: PlaygroundAppearance): void {
    this.config.update((current) => ({ ...current, appearance }));
  }

  protected setSuccessBehavior(successBehavior: PlaygroundSuccessBehavior): void {
    this.config.update((current) => ({ ...current, successBehavior }));
  }

  protected setLocale(locale: PlaygroundLocale): void {
    if (!this.supportsLocale()) {
      return;
    }
    this.config.update((current) => ({ ...current, locale }));
  }

  protected resetDefaults(): void {
    this.config.set(createDefaultPlaygroundConfig(this.config().version));
    this.resetSimulation(true);
  }

  protected selectMethod(method: PlaygroundPaymentMethod): void {
    if (!this.isValid() || !this.config().methods.includes(method)) {
      return;
    }
    this.selectedMethod.set(method);
    this.previewState.set('selected');
  }

  protected simulateSuccess(): void {
    if (!this.ensureSelection()) {
      return;
    }
    this.pushEvent(
      'success',
      `Simulated success for ${this.selectedMethod()} (UX only).`,
    );
    if (this.config().successBehavior === 'confirmation') {
      this.previewState.set('success');
    } else {
      this.previewState.set('idle');
      this.selectedMethod.set(null);
    }
  }

  protected simulateCancel(): void {
    if (!this.ensureSelection()) {
      return;
    }
    this.pushEvent('cancel', `Simulated cancel for ${this.selectedMethod()}.`);
    this.previewState.set('cancelled');
  }

  protected simulateError(): void {
    if (!this.ensureSelection()) {
      return;
    }
    this.pushEvent(
      'error',
      `Simulated error PAYMENT_FAILED for ${this.selectedMethod()}.`,
    );
    this.previewState.set('error');
  }

  protected simulateSuccessContinue(): void {
    if (this.previewState() !== 'success') {
      return;
    }
    this.pushEvent(
      'successContinue',
      'Simulated successContinue from confirmation UI.',
    );
    this.previewState.set('idle');
    this.selectedMethod.set(null);
  }

  protected resetSimulation(clearLog: boolean): void {
    this.selectedMethod.set(null);
    this.previewState.set('idle');
    if (clearLog) {
      this.eventLog.set([]);
    }
  }

  protected clearEventLog(): void {
    this.eventLog.set([]);
  }

  protected isMethodEnabled(method: PlaygroundPaymentMethod): boolean {
    return this.config().methods.includes(method);
  }

  protected issueFor(field: string): string | null {
    return this.issues().find((issue) => issue.field === field)?.message ?? null;
  }

  private ensureSelection(): boolean {
    if (!this.isValid() || !this.selectedMethod()) {
      return false;
    }
    return true;
  }

  private pushEvent(name: PlaygroundSimEventName, detail: string): void {
    this.eventSeq += 1;
    const entry: PlaygroundSimEvent = {
      id: `evt-${this.eventSeq}`,
      at: new Date().toLocaleTimeString(),
      name,
      detail,
    };
    this.eventLog.update((events) => [entry, ...events].slice(0, 20));
  }

  private previewLocaleTag(): string {
    if (!this.supportsLocale()) {
      return 'en';
    }
    switch (this.config().locale) {
      case 'es':
        return 'es';
      case 'pt':
        return 'pt';
      case 'en':
        return 'en';
      default:
        return typeof navigator !== 'undefined' ? navigator.language : 'en';
    }
  }
}
