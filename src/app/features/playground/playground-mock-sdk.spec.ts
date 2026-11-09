import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadStripe as loadStripePure } from '@stripe/stripe-js/pure/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { PlaygroundPage } from './playground.page';
import { providePlaygroundEasyPayments } from './playground.providers';

function stripeScriptSrcs(): string[] {
  return Array.from(document.querySelectorAll('script'))
    .map((script) => script.src)
    .filter((src) => /js\.stripe\.com/i.test(src));
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Playground mock SDK side effects (W6.1 B.1)', () => {
  let fixture: ComponentFixture<PlaygroundPage>;

  beforeEach(async () => {
    document
      .querySelectorAll('script[src*="js.stripe.com"]')
      .forEach((node) => node.remove());

    await TestBed.configureTestingModule({
      imports: [PlaygroundPage],
      providers: [
        provideRouter([]),
        providePlaygroundEasyPayments(),
        SiteI18nService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaygroundPage);
    fixture.detectChanges();
    await flushMicrotasks();
  });

  afterEach(() => {
    document
      .querySelectorAll('script[src*="js.stripe.com"]')
      .forEach((node) => node.remove());
  });

  it('does not inject Stripe.js when the mock playground mounts', async () => {
    expect(fixture.nativeElement.querySelector('easy-payments')).toBeTruthy();
    await flushMicrotasks();
    expect(stripeScriptSrcs()).toEqual([]);
  });

  it('keeps deferred Stripe loading available via @stripe/stripe-js/pure', async () => {
    expect(stripeScriptSrcs()).toEqual([]);
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    void loadStripePure('pk_test_w61_stage_b1_deferred');
    await flushMicrotasks();
    const injected = appendSpy.mock.calls
      .map(([node]) => node as Node)
      .filter((node): node is HTMLScriptElement => node instanceof HTMLScriptElement)
      .some((script) => /js\.stripe\.com/i.test(script.src));
    expect(injected || stripeScriptSrcs().length > 0).toBe(true);
    appendSpy.mockRestore();
  });
});
