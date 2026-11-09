import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { environment } from '../../../environments/environment';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
import { ThemeService } from '../../core/theme/theme.service';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpButton } from '../../shared/ui/button/button';
import { EpContainer } from '../../shared/ui/container/container';
import { EpSectionHeading } from '../../shared/ui/section-heading/section-heading';
import { ContactApiService, createIdempotencyKey } from './contact-api.service';
import { CONTACT_CONFIG } from './contact.config';
import {
  CONTACT_LIMITS,
  CONTACT_TURNSTILE_ACTION,
  CONTACT_TYPES,
  ContactApiResult,
  ContactFieldName,
  ContactStatus,
  ContactType,
} from './contact.types';
import { hasContactErrors, isContactType, validateContactForm } from './contact.validation';
import { TurnstileApi, TurnstileService } from './turnstile.service';

type VerifyState = 'loading' | 'ready' | 'failed';
type VerifyError = 'required' | 'failed' | 'load';

const FIELD_ORDER: readonly ContactFieldName[] = ['name', 'replyEmail', 'type', 'message'];
const FIELD_IDS: Record<ContactFieldName, string> = {
  name: 'contact-name',
  replyEmail: 'contact-email',
  type: 'contact-type',
  message: 'contact-message',
};

@Component({
  selector: 'app-contact-page',
  imports: [EpContainer, EpSectionHeading, EpAlert, EpButton],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.scss',
})
export class ContactPage {
  private readonly i18n = inject(SiteI18nService);
  private readonly theme = inject(ThemeService);
  private readonly api = inject(ContactApiService);
  private readonly turnstile = inject(TurnstileService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly config = inject(CONTACT_CONFIG);
  protected readonly githubUrl = environment.githubUrl;
  protected readonly limits = CONTACT_LIMITS;
  protected readonly types = CONTACT_TYPES;
  protected readonly ids = FIELD_IDS;

  protected readonly name = signal('');
  protected readonly replyEmail = signal('');
  protected readonly type = signal<ContactType>('suggestion');
  protected readonly message = signal('');
  /** Honeypot value — bound only so that bots filling it are detected server-side. */
  protected readonly website = signal('');

  protected readonly status = signal<ContactStatus>('idle');
  protected readonly submitAttempted = signal(false);
  protected readonly touched = signal<Partial<Record<ContactFieldName, boolean>>>({});
  protected readonly verifyState = signal<VerifyState>('loading');
  protected readonly verifyError = signal<VerifyError | null>(null);
  private readonly turnstileToken = signal<string | null>(null);

  protected readonly errors = computed(() =>
    validateContactForm({
      name: this.name(),
      replyEmail: this.replyEmail(),
      type: this.type(),
      message: this.message(),
    }),
  );
  protected readonly submitting = computed(() => this.status() === 'submitting');
  protected readonly messageLength = computed(() => this.message().trim().length);

  private readonly turnstileHost = viewChild<ElementRef<HTMLElement>>('turnstileHost');
  private readonly successHeading = viewChild<ElementRef<HTMLElement>>('successHeading');

  private inFlight = false;
  private widgetId: string | null = null;
  private turnstileApi: TurnstileApi | null = null;
  private renderGeneration = 0;
  private lastAttempt: { fingerprint: string; key: string } | null = null;

  constructor() {
    effect(() => {
      const host = this.turnstileHost()?.nativeElement;
      if (!this.config.operational || !isPlatformBrowser(this.platformId)) {
        return;
      }
      if (!host) {
        // Form hidden (success view): drop the widget; it is re-rendered with the form.
        untracked(() => {
          this.renderGeneration++;
          this.removeWidget();
        });
        return;
      }
      untracked(() => void this.mountTurnstile(host));
    });

    this.destroyRef.onDestroy(() => this.removeWidget());
  }

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }

  protected typeLabel(type: ContactType): string {
    return this.t(`contact.types.${type}` as SiteMessageKey);
  }

  protected fieldError(field: ContactFieldName): string | null {
    if (!this.submitAttempted() && !this.touched()[field]) {
      return null;
    }
    const error = this.errors()[field];
    if (!error) {
      return null;
    }
    switch (error) {
      case 'tooLong':
        return this.t('contact.tooLong');
      case 'invalidEmail':
        return this.t('contact.invalidEmail');
      default:
        return this.t('contact.required');
    }
  }

  protected verifyErrorText(): string | null {
    switch (this.verifyError()) {
      case 'required':
        return this.t('contact.verifyRequired');
      case 'failed':
      case 'load':
        return this.t('contact.verifyFailed');
      default:
        return null;
    }
  }

  protected setText(field: 'name' | 'replyEmail' | 'message' | 'website', value: string): void {
    this[field].set(value);
  }

  protected setType(value: string): void {
    if (isContactType(value)) {
      this.type.set(value);
    }
  }

  protected markTouched(field: ContactFieldName): void {
    this.touched.update((current) => ({ ...current, [field]: true }));
  }

  protected sendAnother(): void {
    this.status.set('idle');
    this.submitAttempted.set(false);
    this.touched.set({});
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.inFlight || !this.config.operational || this.status() === 'success') {
      return;
    }

    this.submitAttempted.set(true);
    const errors = this.errors();
    if (hasContactErrors(errors)) {
      const first = FIELD_ORDER.find((field) => errors[field]);
      if (first) {
        this.document.getElementById(FIELD_IDS[first])?.focus();
      }
      return;
    }

    const token = this.turnstileToken();
    if (!token) {
      this.verifyError.set(this.verifyState() === 'failed' ? 'load' : 'required');
      return;
    }

    this.inFlight = true;
    this.status.set('submitting');
    this.verifyError.set(null);

    const fields = {
      name: this.name().trim(),
      replyEmail: this.replyEmail().trim(),
      type: this.type(),
      message: this.message().trim(),
    };
    const key = this.idempotencyKeyFor(fields);

    let result: ContactApiResult;
    try {
      result = await this.api.submit(
        { ...fields, website: this.website(), turnstileToken: token },
        key,
      );
    } finally {
      this.inFlight = false;
    }

    this.applyResult(result);
  }

  private applyResult(result: ContactApiResult): void {
    // A Turnstile token is single-use: always request a fresh one after an attempt.
    this.resetTurnstile();

    switch (result.kind) {
      case 'success':
        this.clearForm();
        this.lastAttempt = null;
        this.status.set('success');
        setTimeout(() => this.successHeading()?.nativeElement.focus());
        break;
      case 'rate-limited':
        this.status.set('rate-limited');
        break;
      case 'verification-failed':
        this.verifyError.set('failed');
        this.status.set('error');
        break;
      default:
        this.status.set('error');
        break;
    }
  }

  /** Reuse the key while retrying identical content so a repeated send cannot duplicate mail. */
  private idempotencyKeyFor(fields: Record<string, string>): string {
    const fingerprint = JSON.stringify(fields);
    if (this.lastAttempt?.fingerprint === fingerprint) {
      return this.lastAttempt.key;
    }
    this.lastAttempt = { fingerprint, key: createIdempotencyKey() };
    return this.lastAttempt.key;
  }

  private clearForm(): void {
    this.name.set('');
    this.replyEmail.set('');
    this.type.set('suggestion');
    this.message.set('');
    this.website.set('');
    this.submitAttempted.set(false);
    this.touched.set({});
    this.verifyError.set(null);
  }

  private async mountTurnstile(host: HTMLElement): Promise<void> {
    const config = this.config;
    if (!config.operational) {
      return;
    }
    const generation = ++this.renderGeneration;
    this.removeWidget();
    this.turnstileToken.set(null);
    this.verifyState.set('loading');

    try {
      const api = await this.turnstile.load();
      if (generation !== this.renderGeneration || !host.isConnected) {
        return;
      }
      this.turnstileApi = api;
      this.widgetId = api.render(host, {
        sitekey: config.siteKey,
        action: CONTACT_TURNSTILE_ACTION,
        theme: this.theme.resolvedTheme() === 'dark' ? 'dark' : 'light',
        language: this.turnstileLanguage(),
        callback: (token) => {
          this.turnstileToken.set(token);
          this.verifyState.set('ready');
          this.verifyError.set(null);
        },
        'expired-callback': () => this.turnstileToken.set(null),
        'timeout-callback': () => this.turnstileToken.set(null),
        'error-callback': () => {
          this.turnstileToken.set(null);
          this.verifyState.set('failed');
        },
      });
      this.verifyState.set('ready');
    } catch {
      if (generation === this.renderGeneration) {
        this.verifyState.set('failed');
      }
    }
  }

  private resetTurnstile(): void {
    this.turnstileToken.set(null);
    if (this.turnstileApi && this.widgetId !== null) {
      try {
        this.turnstileApi.reset(this.widgetId);
      } catch {
        this.verifyState.set('failed');
      }
    }
  }

  private removeWidget(): void {
    if (this.turnstileApi && this.widgetId !== null) {
      try {
        this.turnstileApi.remove(this.widgetId);
      } catch {
        // Widget already gone.
      }
    }
    this.widgetId = null;
  }

  private turnstileLanguage(): string {
    switch (this.i18n.language()) {
      case 'es':
        return 'es';
      case 'pt':
        return 'pt-br';
      default:
        return 'en';
    }
  }
}
