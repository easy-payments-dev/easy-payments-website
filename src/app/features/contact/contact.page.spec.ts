import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { ContactApiService } from './contact-api.service';
import { CONTACT_CONFIG, ContactConfig } from './contact.config';
import { ContactApiResult, ContactSubmitPayload } from './contact.types';
import { ContactPage } from './contact.page';
import { TurnstileService } from './turnstile.service';

const operational: ContactConfig = {
  operational: true,
  transport: 'local-mock',
  apiUrl: 'http://127.0.0.1:8787/contact',
  siteKey: '1x00000000000000000000AA',
};

interface Setup {
  fixture: ComponentFixture<ContactPage>;
  el: HTMLElement;
  submit: ReturnType<typeof vi.fn>;
  turnstileApi: { render: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
}

async function setup(
  config: ContactConfig,
  result: ContactApiResult | Promise<ContactApiResult> = { kind: 'success' },
  issueToken = true,
): Promise<Setup> {
  const submit = vi.fn(async (_payload: ContactSubmitPayload, _key: string) => result);
  let callback: ((token: string) => void) | undefined;
  const turnstileApi = {
    render: vi.fn((_host: HTMLElement, options: { callback: (token: string) => void }) => {
      callback = options.callback;
      if (issueToken) {
        options.callback('turnstile-test-token');
      }
      return 'widget-1';
    }),
    // A real widget issues a fresh token after reset().
    reset: vi.fn(() => {
      if (issueToken) {
        callback?.(`turnstile-test-token-${Math.random()}`);
      }
    }),
    remove: vi.fn(),
  };
  await TestBed.configureTestingModule({
    imports: [ContactPage],
    providers: [
      provideRouter([]),
      SiteI18nService,
      { provide: CONTACT_CONFIG, useValue: config },
      { provide: ContactApiService, useValue: { submit } },
      { provide: TurnstileService, useValue: { load: async () => turnstileApi } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContactPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, submit, turnstileApi };
}

function type(el: HTMLElement, selector: string, value: string): void {
  const control = el.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
  control.value = value;
  control.dispatchEvent(new Event('input'));
}

function fill(el: HTMLElement): void {
  type(el, '#contact-name', 'Ada Lovelace');
  type(el, '#contact-email', 'ada@example.org');
  type(el, '#contact-message', 'Please add dark mode.');
  const select = el.querySelector('#contact-type') as HTMLSelectElement;
  select.value = 'problem';
  select.dispatchEvent(new Event('change'));
}

async function settle(s: Setup): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  s.fixture.detectChanges();
  await s.fixture.whenStable();
  s.fixture.detectChanges();
}

async function submitForm(s: Setup): Promise<void> {
  (s.el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
  await settle(s);
}

describe('ContactPage', () => {
  it('shows a NOT OPERATIONAL notice and no form when not configured', async () => {
    const s = await setup({ operational: false, reason: 'disabled' });
    expect(s.el.querySelector('form')).toBeNull();
    expect(s.el.querySelector('button[type="submit"]')).toBeNull();
    expect(s.el.textContent).toContain('Contact form not operational');
    expect(s.turnstileApi.render).not.toHaveBeenCalled();
  });

  it('renders the form with a hidden, non-focusable honeypot and no file inputs', async () => {
    const s = await setup(operational);
    const honeypot = s.el.querySelector('input[name="website"]') as HTMLInputElement;
    expect(honeypot).toBeTruthy();
    expect(honeypot.getAttribute('tabindex')).toBe('-1');
    expect(honeypot.getAttribute('autocomplete')).toBe('off');
    expect(honeypot.closest('[aria-hidden="true"]')).toBeTruthy();
    expect(s.el.querySelector('input[type="file"]')).toBeNull();
    expect(s.el.querySelectorAll('#contact-type option')).toHaveLength(4);
    expect(s.turnstileApi.render).toHaveBeenCalledTimes(1);
    expect(s.turnstileApi.render.mock.calls[0][1]).toMatchObject({
      sitekey: '1x00000000000000000000AA',
      action: 'contact',
    });
  });

  it('keeps fields and does not call the API when validation fails', async () => {
    const s = await setup(operational);
    type(s.el, '#contact-name', 'Ada');
    await submitForm(s);
    expect(s.submit).not.toHaveBeenCalled();
    expect((s.el.querySelector('#contact-name') as HTMLInputElement).value).toBe('Ada');
    expect(s.el.querySelector('#contact-email')?.getAttribute('aria-invalid')).toBe('true');
    expect(s.el.querySelector('#contact-message')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('submits JSON with token and honeypot, then clears fields only after success', async () => {
    const s = await setup(operational);
    fill(s.el);
    await submitForm(s);

    expect(s.submit).toHaveBeenCalledTimes(1);
    const [payload, key] = s.submit.mock.calls[0] as [ContactSubmitPayload, string];
    expect(payload).toEqual({
      name: 'Ada Lovelace',
      replyEmail: 'ada@example.org',
      type: 'problem',
      message: 'Please add dark mode.',
      website: '',
      turnstileToken: 'turnstile-test-token',
    });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.turnstileApi.reset).toHaveBeenCalled();
    expect(s.el.querySelector('form')).toBeNull();
    expect(s.el.textContent).toContain('Message sent');

    // "Send another" returns an empty form.
    (s.el.querySelector('.contact__success ep-button') as HTMLElement).click();
    s.fixture.detectChanges();
    expect((s.el.querySelector('#contact-name') as HTMLInputElement).value).toBe('');
    expect((s.el.querySelector('#contact-message') as HTMLTextAreaElement).value).toBe('');
  });

  it('passes a filled honeypot through to the API untouched', async () => {
    const s = await setup(operational);
    fill(s.el);
    type(s.el, 'input[name="website"]', 'https://spam.test');
    await submitForm(s);
    expect((s.submit.mock.calls[0][0] as ContactSubmitPayload).website).toBe('https://spam.test');
  });

  it('keeps field values and shows an error state on failure; reuses the key for identical retries', async () => {
    const s = await setup(operational, { kind: 'error' });
    fill(s.el);
    await submitForm(s);
    expect(s.el.querySelector('form')).toBeTruthy();
    expect((s.el.querySelector('#contact-name') as HTMLInputElement).value).toBe('Ada Lovelace');
    expect((s.el.querySelector('#contact-message') as HTMLTextAreaElement).value).toBe('Please add dark mode.');
    expect(s.el.textContent).toContain('Message not sent');

    await submitForm(s);
    expect(s.submit).toHaveBeenCalledTimes(2);
    expect(s.submit.mock.calls[1][1]).toBe(s.submit.mock.calls[0][1]);

    type(s.el, '#contact-message', 'Edited message');
    await submitForm(s);
    expect(s.submit.mock.calls[2][1]).not.toBe(s.submit.mock.calls[0][1]);
  });

  it('shows the rate-limited state and keeps the text', async () => {
    const s = await setup(operational, { kind: 'rate-limited', retryAfterSeconds: 300 });
    fill(s.el);
    await submitForm(s);
    expect(s.el.textContent).toContain('Too many messages');
    expect((s.el.querySelector('#contact-name') as HTMLInputElement).value).toBe('Ada Lovelace');
  });

  it('prevents double submission while a request is in flight', async () => {
    let release!: (value: ContactApiResult) => void;
    const pending = new Promise<ContactApiResult>((resolve) => (release = resolve));
    const s = await setup(operational, pending);
    fill(s.el);

    const form = s.el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    s.fixture.detectChanges();

    expect(s.submit).toHaveBeenCalledTimes(1);
    expect(s.el.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);

    release({ kind: 'success' });
    await settle(s);
    expect(s.el.textContent).toContain('Message sent');
  });

  it('requires a Turnstile token before sending', async () => {
    const s = await setup(operational, { kind: 'success' }, false);
    fill(s.el);
    await submitForm(s);
    expect(s.submit).not.toHaveBeenCalled();
    expect(s.el.textContent).toContain('Complete the spam protection check');
    expect((s.el.querySelector('#contact-name') as HTMLInputElement).value).toBe('Ada Lovelace');
  });
});
