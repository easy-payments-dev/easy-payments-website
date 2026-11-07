import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PlaygroundPage } from './playground.page';
import {
  PlaygroundConfig,
  PlaygroundPaymentMethod,
  PlaygroundPreviewState,
  PlaygroundSimEvent,
  PlaygroundVersion,
} from './playground.types';
import { PlaygroundCodeBundle } from './playground.types';

/** Test-only surface for protected playground API. */
type PlaygroundHarness = PlaygroundPage & {
  config: WritableSignal<PlaygroundConfig>;
  selectedMethod: WritableSignal<PlaygroundPaymentMethod | null>;
  previewState: WritableSignal<PlaygroundPreviewState>;
  eventLog: WritableSignal<readonly PlaygroundSimEvent[]>;
  isValid: () => boolean;
  code: () => PlaygroundCodeBundle;
  setVersion: (version: PlaygroundVersion) => void;
  patchProduct: <K extends keyof PlaygroundConfig['product']>(
    key: K,
    value: PlaygroundConfig['product'][K],
  ) => void;
  selectMethod: (method: PlaygroundPaymentMethod) => void;
  simulateSuccess: () => void;
  simulateSuccessContinue: () => void;
  simulateCancel: () => void;
  resetDefaults: () => void;
};

describe('PlaygroundPage', () => {
  let fixture: ComponentFixture<PlaygroundPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaygroundPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaygroundPage);
    fixture.detectChanges();
  });

  function page(): PlaygroundHarness {
    return fixture.componentInstance as PlaygroundHarness;
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders the simulation playground with version controls', () => {
    expect(text()).toContain('Angular Checkout Playground');
    expect(text()).toContain('Simulation only');
    expect(text()).toContain('1.1.0 — Latest Published');
    expect(text()).toContain('1.2.0 — Unpublished');
    expect(text()).toContain('Visual simulation');
  });

  it('defaults to Angular 1.1.0 with locale controls visible', () => {
    expect(page().config().version).toBe('1.1.0');
    expect(text()).toContain('Locale (1.1.0)');
    expect(page().code().componentHtml).toContain('locale="auto"');
  });

  it('hides locale and regenerates code when switching to 1.0.0', () => {
    page().setVersion('1.0.0');
    fixture.detectChanges();
    expect(page().config().version).toBe('1.0.0');
    expect(text()).toContain('Locale inputs are unavailable in Angular 1.0.0');
    expect(page().code().install).toContain('@easy-payments/angular@1.0.0');
    expect(page().code().componentHtml).not.toContain('locale=');
  });

  it('validates empty method selection and blocks simulation', () => {
    page().config.update((current) => ({ ...current, methods: [] }));
    fixture.detectChanges();
    expect(page().isValid()).toBe(false);
    expect(text()).toContain('Select at least one payment method.');
    page().selectMethod('card');
    expect(page().selectedMethod()).toBeNull();
  });

  it('logs only verified public simulation events', () => {
    page().selectMethod('card');
    page().simulateSuccess();
    page().simulateSuccessContinue();
    fixture.detectChanges();

    const names = page()
      .eventLog()
      .map((event) => event.name);
    expect(names).toEqual(['successContinue', 'success']);
    expect(text()).toContain('Simulated success');
    expect(text()).not.toContain('(started)');
  });

  it('resets configuration and simulation state', () => {
    page().patchProduct('name', 'Custom');
    page().selectMethod('paypal');
    page().simulateCancel();
    page().resetDefaults();
    fixture.detectChanges();

    expect(page().config().product.name).toBe('Premium Plan');
    expect(page().selectedMethod()).toBeNull();
    expect(page().previewState()).toBe('idle');
    expect(page().eventLog().length).toBe(0);
  });

  it('does not reference unpublished APIs in generated snippets', () => {
    const code = page().code();
    const blob = `${code.install}\n${code.appConfig}\n${code.componentTs}\n${code.componentHtml}`;
    expect(blob).not.toContain('baseUrl');
    expect(blob).not.toContain('visualStyle');
    expect(blob).not.toContain('checkoutInstanceId');
    expect(blob).not.toContain('EasyPaymentsHeadless');
    expect(blob).not.toContain('easy-payment-buttons');
    expect(blob).not.toContain('(started)');
  });

  it('does not issue payment network calls during simulation', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockImplementation(() => Promise.reject(new Error('blocked')));
    page().selectMethod('card');
    page().simulateSuccess();
    page().simulateCancel();
    expect(open).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    open.mockRestore();
    fetchSpy.mockRestore();
  });

  it('supports keyboard-accessible version switching via buttons', () => {
    const root = fixture.nativeElement as HTMLElement;
    const versionButtons = Array.from(
      root.querySelectorAll('.segmented__option:not([disabled])'),
    ) as HTMLButtonElement[];
    expect(versionButtons.length).toBeGreaterThanOrEqual(2);
    versionButtons[1].focus();
    versionButtons[1].click();
    fixture.detectChanges();
    expect(page().config().version).toBe('1.0.0');
  });
});
