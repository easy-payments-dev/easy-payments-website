import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MockPaymentController } from '@easy-payments/angular';
import { vi } from 'vitest';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { PlaygroundPage } from './playground.page';
import { providePlaygroundEasyPayments } from './playground.providers';
import {
  PlaygroundConfig,
  PlaygroundSimEvent,
  PlaygroundVersion,
} from './playground.types';
import { PlaygroundCodeBundle } from './playground.types';

/** Test-only surface for protected playground API. */
type PlaygroundHarness = PlaygroundPage & {
  config: WritableSignal<PlaygroundConfig>;
  eventLog: WritableSignal<readonly PlaygroundSimEvent[]>;
  mockOutcome: WritableSignal<'success' | 'cancelled' | 'failed'>;
  demoMode: WritableSignal<'full' | 'buttons' | 'headless'>;
  isValid: () => boolean;
  code: () => PlaygroundCodeBundle;
  setVersion: (version: PlaygroundVersion) => void;
  setDemoMode: (mode: 'full' | 'buttons' | 'headless') => void;
  patchProduct: <K extends keyof PlaygroundConfig['product']>(
    key: K,
    value: PlaygroundConfig['product'][K],
  ) => void;
  setMockOutcome: (outcome: 'success' | 'cancelled' | 'failed') => void;
  onSuccess: (result: {
    method: string;
    status: string;
    message?: string;
  }) => void;
  onSuccessContinue: (result: { method: string; status: string }) => void;
  resetDefaults: () => void;
};

describe('PlaygroundPage', () => {
  let fixture: ComponentFixture<PlaygroundPage>;
  let mockController: MockPaymentController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaygroundPage],
      providers: [
        provideRouter([]),
        providePlaygroundEasyPayments(),
        SiteI18nService,
      ],
    }).compileComponents();

    mockController = TestBed.inject(MockPaymentController);
    fixture = TestBed.createComponent(PlaygroundPage);
    fixture.detectChanges();
  });

  function page(): PlaygroundHarness {
    return fixture.componentInstance as PlaygroundHarness;
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders the real-component mock playground with version controls', () => {
    expect(text()).toContain('Angular Checkout Playground');
    expect(text()).toContain('Live component · mock mode');
    expect(text()).toContain('1.1.0 — Latest Published');
    expect(text()).toContain('1.2.0 — Unpublished');
    expect(text()).toContain('Real API · mock');
    expect(text()).toContain('Unpublished — 1.2.0');
  });

  it('mounts easy-payments when configuration is valid', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('easy-payments')).toBeTruthy();
  });

  it('defaults to Angular 1.1.0 with locale controls visible', () => {
    expect(page().config().version).toBe('1.1.0');
    expect(text()).toContain('Checkout locale (1.1.0+)');
    expect(page().code().componentHtml).toContain('locale="auto"');
  });

  it('hides locale and regenerates code when switching to 1.0.0', () => {
    page().setVersion('1.0.0');
    fixture.detectChanges();
    expect(page().config().version).toBe('1.0.0');
    expect(text()).toContain(
      'Locale inputs are unavailable in Angular 1.0.0 snippets',
    );
    expect(page().code().install).toContain('@easy-payments/angular@1.0.0');
    expect(page().code().componentHtml).not.toContain('locale=');
  });

  it('validates empty method selection and hides the live component', () => {
    page().config.update((current) => ({ ...current, methods: [] }));
    fixture.detectChanges();
    expect(page().isValid()).toBe(false);
    expect(text()).toContain('Select at least one payment method.');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('easy-payments'),
    ).toBeNull();
  });

  it('wires MockPaymentController outcomes from playground controls', () => {
    page().setMockOutcome('failed');
    fixture.detectChanges();
    expect(mockController.outcome()).toBe('failed');
    page().setMockOutcome('cancelled');
    fixture.detectChanges();
    expect(mockController.outcome()).toBe('cancelled');
  });

  it('logs verified public component events', () => {
    page().onSuccess({
      method: 'klarna',
      status: 'succeeded',
      message: '[DEMO] Mock Klarna payment succeeded',
    });
    page().onSuccessContinue({ method: 'klarna', status: 'succeeded' });
    fixture.detectChanges();

    const names = page()
      .eventLog()
      .map((event) => event.name);
    expect(names).toEqual(['successContinue', 'success']);
    expect(text()).toContain('Mock success');
    expect(text()).toContain('klarna');
  });

  it('resets configuration and event log', () => {
    page().patchProduct('name', 'Custom');
    page().onSuccess({ method: 'card', status: 'succeeded' });
    page().setMockOutcome('failed');
    page().resetDefaults();
    fixture.detectChanges();

    expect(page().config().product.name).toBe('Premium Plan');
    expect(page().mockOutcome()).toBe('success');
    expect(page().eventLog().length).toBe(0);
    expect(mockController.outcome()).toBe('success');
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

  it('labels Buttons Only and Headless as unpublished 1.2.0 demos', () => {
    expect(text()).toContain('Full Checkout');
    expect(text()).toContain('Buttons Only');
    expect(text()).toContain('Headless');
    expect(text()).toContain('Unpublished — 1.2.0');
    expect(text()).not.toContain('Official Klarna sandbox');
  });

  it('switches to Buttons Only and mounts easy-payment-buttons', () => {
    page().setDemoMode('buttons');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('easy-payments')).toBeNull();
    expect(root.querySelector('easy-payment-buttons')).toBeTruthy();
  });

  it('switches to Headless and mounts the consumer demo host', () => {
    page().setDemoMode('headless');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('easy-payments')).toBeNull();
    expect(root.querySelector('app-playground-headless-demo')).toBeTruthy();
  });

  it('does not issue payment network calls while mounting mock checkout', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockImplementation(() => Promise.reject(new Error('blocked')));
    fixture.detectChanges();
    expect(open).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    open.mockRestore();
    fetchSpy.mockRestore();
  });

  it('supports keyboard-accessible version switching via buttons', () => {
    const root = fixture.nativeElement as HTMLElement;
    const versionGroup = root.querySelector('#version-label')
      ?.closest('.field')
      ?.querySelector('.segmented');
    const versionButtons = Array.from(
      versionGroup?.querySelectorAll('.segmented__option:not([disabled])') ?? [],
    ) as HTMLButtonElement[];
    expect(versionButtons.length).toBeGreaterThanOrEqual(2);
    versionButtons[1].focus();
    versionButtons[1].click();
    fixture.detectChanges();
    expect(page().config().version).toBe('1.0.0');
  });
});
