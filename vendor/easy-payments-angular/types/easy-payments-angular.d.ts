import * as _easy_payments_angular from '@easy-payments/angular';
import * as _angular_core from '@angular/core';
import { EnvironmentProviders, Signal } from '@angular/core';
import { Stripe } from '@stripe/stripe-js';
import { Observable } from 'rxjs';

/**
 * Optional visual overrides for Easy Payments–owned UI.
 *
 * Independent of {@link PaymentTheme} and {@link EasyPaymentsAppearance}.
 * Omitted or invalid fields leave the built-in light/dark tokens unchanged.
 * Does not restyle official provider SDK chrome (Stripe Elements, PayPal,
 * Apple Pay, Google Pay buttons, or provider marks).
 */
interface EasyPaymentsVisualStyle {
    /**
     * CSS `font-family` list for Easy Payments–owned text, or `'inherit'` to use
     * the host application's font. Default: library Segoe UI / system stack.
     */
    fontFamily?: string;
    /** Primary text color (maps to `--ep-text`). */
    textColor?: string;
    /** Secondary / muted text color (maps to `--ep-text-secondary`). */
    textSecondaryColor?: string;
    /**
     * Host backdrop (maps to `--ep-background` on `<easy-payments>`).
     * Use `'transparent'` to keep the host clear. Independent of `appearance`.
     */
    backgroundColor?: string;
    /**
     * EP-owned surface fill (maps to `--ep-surface`): default shell card, tiles,
     * and other solid panels. With `appearance="transparent"`, the outer shell
     * stays clear; tiles/panels still use this surface.
     */
    surfaceColor?: string;
    /**
     * Accent / selection / focus hue (maps to `--ep-accent`, `--ep-focus`, and a
     * derived `--ep-accent-soft`). Does not recolor provider logos or SDK chrome.
     */
    accentColor?: string;
    /**
     * Outer corner radius (maps to `--ep-radius`). Inner EP controls use
     * `--ep-radius-md` derived as `calc(var(--ep-radius) * 0.625)`.
     */
    borderRadius?: string;
    /**
     * Spacing scale (maps to `--ep-spacing`). Shell padding uses `--ep-padding`
     * (`calc(var(--ep-spacing) * 1.25)`).
     */
    spacing?: string;
}

/**
 * Host-bound CSS custom property values derived from {@link EasyPaymentsVisualStyle}.
 * `null` means “do not set inline” so SCSS theme defaults remain in effect.
 */
interface VisualStyleHostCssVars {
    fontFamily: string | null;
    textColor: string | null;
    textSecondaryColor: string | null;
    backgroundColor: string | null;
    surfaceColor: string | null;
    accentColor: string | null;
    /** Derived soft fill for selected tiles; set only when `accentColor` is valid. */
    accentSoft: string | null;
    borderRadius: string | null;
    spacing: string | null;
}

type PaymentMethod = 'apple-pay' | 'google-pay' | 'paypal' | 'klarna' | 'affirm' | 'card';
type PaymentProviderName = 'stripe' | 'paypal' | 'applePay' | 'googlePay' | 'klarna' | 'affirm';
declare const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string>;

/**
 * Optional merchant metadata on a product.
 * Flat strings only. This is not `PaymentResult.metadata`.
 */
type EasyPaymentsMerchantMetadata$1 = Record<string, string>;
interface PaymentProduct {
    id: string;
    name: string;
    description?: string;
    amount: number;
    currency: string;
    quantity?: number;
    imageUrl?: string;
    metadata?: EasyPaymentsMerchantMetadata$1;
}

/**
 * Postal address for checkout customer / shipping hints.
 *
 * `country` must be an ISO 3166-1 alpha-2 code (for example `US`, `CA`, `DE`).
 * Easy Payments does not yet send these fields to create-payment backends.
 */
interface EasyPaymentsAddress {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    /** Postal / ZIP code. */
    postalCode: string;
    /** ISO 3166-1 alpha-2 country code (for example `US`). */
    country: string;
}

/**
 * Planned Buttons Only Klarna/Affirm confirmation strategy.
 *
 * - `auto` — prefer Direct when {@link evaluateBnplDirectReadiness} is ready; otherwise Payment Element.
 * - `direct` — require Direct readiness; otherwise a configuration error (no silent Element fallback).
 * - `element` — always use the existing Stripe Payment Element + Continue flow.
 *
 * **Not yet active in production components.** `<easy-payment-buttons>` continues to use
 * Payment Element for Klarna/Affirm regardless of this value until a later milestone wires it.
 */
type BnplConfirmMode = 'auto' | 'direct' | 'element';

type CheckoutSuccessBehavior = 'confirmation' | 'event-only';
interface CheckoutCustomerOptions {
    email?: string;
    name?: string;
    /** Optional phone in E.164 or merchant-local format. Not sent to backends yet. */
    phone?: string;
    /**
     * Optional billing address.
     * Country must be ISO 3166-1 alpha-2. Not sent to backends yet.
     */
    address?: EasyPaymentsAddress;
}
interface CheckoutShippingOptions {
    /** When true, BNPL Direct readiness requires shipping name + address. */
    required?: boolean;
    /** Shipping recipient name. Not sent to backends yet. */
    name?: string;
    /**
     * Optional shipping address.
     * Country must be ISO 3166-1 alpha-2. Not sent to backends yet.
     */
    address?: EasyPaymentsAddress;
}
interface CheckoutOptions {
    successUrl?: string;
    cancelUrl?: string;
    /**
     * Controls built-in success confirmation UI after a successful payment.
     * - confirmation (default): show Easy Payments success screen
     * - event-only: emit (success) only; merchant handles post-payment UX/navigation
     *
     * Existing successUrl / cancelUrl remain merchant-controlled hints and do not
     * trigger automatic redirects inside Easy Payments.
     */
    successBehavior?: CheckoutSuccessBehavior;
    customer?: CheckoutCustomerOptions;
    shipping?: CheckoutShippingOptions;
}

/**
 * `processing` — PaymentIntent (or equivalent) is still settling. Not success and
 * not a definitive failure. Merchants must confirm the final outcome via backend
 * webhooks / retrieve; the UI must not invite a retry that could double-charge.
 */
type PaymentStatus = 'success' | 'cancelled' | 'failed' | 'processing';
interface PaymentResult {
    status: PaymentStatus;
    method: PaymentMethod;
    provider: PaymentProviderName;
    transactionId?: string;
    sessionId?: string;
    message?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Emitted when a customer starts a payment attempt.
 * Amount and currency come from the current checkout product input.
 * They are not a captured charge and are not a provider authorization.
 */
interface PaymentStartedEvent {
    method: PaymentMethod;
    provider: PaymentProviderName;
    amount: number;
    currency: string;
}
/**
 * Emitted when the selected checkout method changes.
 * `method` is null when the previous selection is no longer available and no
 * other method can be selected.
 */
interface PaymentMethodChangeEvent {
    method: PaymentMethod | null;
    previousMethod: PaymentMethod | null;
    provider: PaymentProviderName | null;
}
declare function normalizePaymentResult(result: PaymentResult): PaymentResult;

type PaymentTheme = 'light' | 'dark' | 'system';
type ResolvedPaymentTheme = 'light' | 'dark';

/**
 * Outer visual shell for `<easy-payments>`.
 *
 * Independent of {@link PaymentTheme}: theme controls colors; appearance controls
 * whether the built-in card/container chrome is drawn around the checkout.
 *
 * - `default` — built-in surface, border, radius, padding, and shadow (backward compatible).
 * - `transparent` — no outer shell so the merchant parent background shows through.
 */
type EasyPaymentsAppearance = 'default' | 'transparent';

/**
 * Layout for {@link EasyPaymentButtonsComponent}.
 * Method order always follows the developer `[methods]` array.
 */
type EasyPaymentButtonsLayout = 'horizontal' | 'vertical';

/**
 * Optional strip presentation for {@link EasyPaymentButtonsComponent}.
 *
 * Applies to library-owned selectors, placeholders, and the outer strip shell.
 * Official Apple Pay / Google Pay / PayPal SDK chrome is not restyled beyond
 * layout/gap constraints the SDKs already tolerate.
 *
 * Defaults favor a transparent, compact payment strip that sits inside the
 * merchant's own checkout UI.
 */
interface EasyPaymentButtonsAppearance {
    /**
     * Gap between strip slots. CSS length. Default: `visualStyle.spacing` or `12px`.
     * Separators (when enabled) sit in this gap.
     */
    gap?: string;
    /** Optional padding inside the strip shell (CSS length or shorthand). Default: none. */
    padding?: string;
    /**
     * Visual dividers between strip slots.
     * - `none` (default) — no dividers
     * - `line` — hairline that follows layout orientation
     *
     * Not inserted inside a single PayPal SDK funding group (one slot).
     */
    separators?: 'none' | 'line';
    /** Optional CSS color for `separators: 'line'`. Default: theme border token. */
    separatorColor?: string;
    /**
     * Outer strip background. Default: `'transparent'` so the merchant page shows through.
     * Pass any CSS color when a filled strip is desired.
     */
    background?: 'transparent' | string;
    /**
     * Border treatment for library-owned Card / Klarna / Affirm selectors and placeholders.
     * Default: `'default'` (1px theme border). `'none'` removes the border.
     */
    border?: 'default' | 'none';
    /** Optional border color for library-owned selectors when `border` is not `'none'`. */
    borderColor?: string;
    /** Optional border width for library-owned selectors (e.g. `'1px'`, `'2px'`). */
    borderWidth?: string;
    /**
     * Corner radius for library-owned selectors / strip mock buttons.
     * Examples: `'0'`, `'8px'`, `'999px'` (pill). Default: theme `--ep-radius-md`.
     */
    borderRadius?: string;
    /** Target height for library-owned strip controls. Default: `40px`. */
    buttonHeight?: string;
    /**
     * Optional fixed width for every slot in a horizontal strip (selectors and
     * official wallet buttons alike). Default: `160px` slots that wrap.
     */
    buttonWidth?: string;
    /** Minimum width for library-owned strip controls. Default: `100px`. */
    buttonMinWidth?: string;
    /**
     * Library-owned Card / Klarna / Affirm selector chrome.
     * Omitted values keep the current default appearance.
     * These fields do not restyle PayPal, Google Pay, or Apple Pay SDK buttons.
     */
    selectorBackgroundColor?: string;
    selectorTextColor?: string;
    selectorFontFamily?: string;
    selectorFontSize?: string;
    selectorFontWeight?: string | number;
    /** CSS padding shorthand for library-owned selectors. */
    selectorPadding?: string;
    selectorHoverBackgroundColor?: string;
    selectorHoverTextColor?: string;
    selectorHoverBorderColor?: string;
    selectorSelectedBackgroundColor?: string;
    selectorSelectedTextColor?: string;
    selectorSelectedBorderColor?: string;
    selectorDisabledBackgroundColor?: string;
    selectorDisabledTextColor?: string;
    selectorLoadingBackgroundColor?: string;
    selectorLoadingTextColor?: string;
    selectorFocusOutlineColor?: string;
    /**
     * Plain-text labels for library-owned selectors.
     * Angular text binding escapes the value. HTML is rejected.
     * Wallet brand buttons are not relabelable.
     */
    selectorLabels?: EasyPaymentButtonsSelectorLabels;
    /**
     * Library brand mark beside a selector label.
     * Default `true`. Does not replace or restyle official wallet SDK chrome.
     */
    showSelectorIcon?: boolean;
}
/** Plain-text overrides for library-owned strip selectors. */
interface EasyPaymentButtonsSelectorLabels {
    card?: string;
    klarna?: string;
    affirm?: string;
}
/** Who renders the Card / Klarna / Affirm triggers. Wallets stay official SDK buttons. */
type EasyPaymentButtonsSelectorVisibility = 'library' | 'merchant';

/**
 * Optional presentation for the Easy Payments–owned Stripe Card confirmation CTA
 * (`.ep-stripe-card__pay`).
 *
 * Applies to the library button that confirms a Stripe Payment Element payment in
 * both `<easy-payments>` (Full Checkout) and `<easy-payment-buttons>` (Buttons Only).
 * It does **not** restyle the Stripe Payment Element iframe or official
 * PayPal / Google Pay / Apple Pay SDK buttons.
 *
 * All fields are optional. Omitted or invalid values leave theme defaults in place
 * (`--ep-cta-*` light/dark tokens and existing localization).
 */
interface EasyPaymentsCardButtonAppearance {
    /**
     * Plain-text label override for the idle CTA.
     * When set, replaces the localized default (`Pay {{amount}}` in Full Checkout,
     * `Pay with card` in Buttons Only). Processing/loading copy still uses i18n
     * (`processingPayment`) unless you also customize loading styles only.
     */
    label?: string;
    /** Idle background (maps to `--ep-card-cta-bg`, falls back to `--ep-cta-bg`). */
    backgroundColor?: string;
    /** Idle text color (maps to `--ep-card-cta-text`, falls back to `--ep-cta-text`). */
    textColor?: string;
    /** CSS `font-family` for the CTA, or `'inherit'`. */
    fontFamily?: string;
    /** CSS font size (e.g. `'15px'`, `'1rem'`). */
    fontSize?: string;
    /** CSS font weight (e.g. `650`, `'bold'`, `'600'`). */
    fontWeight?: string | number;
    /** Horizontal text alignment inside the button. */
    textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
    /**
     * Border treatment shortcut.
     * - `'default'` — keep library default (no border)
     * - `'none'` — force `border: none`
     * Individual `borderWidth` / `borderStyle` / `borderColor` still apply when
     * `border` is not `'none'`.
     */
    border?: 'default' | 'none';
    /** CSS border width (e.g. `'1px'`). Ignored when `border: 'none'`. */
    borderWidth?: string;
    /** CSS border style (e.g. `'solid'`, `'dashed'`). Ignored when `border: 'none'`. */
    borderStyle?: string;
    /** CSS border color. Ignored when `border: 'none'`. */
    borderColor?: string;
    /** Corner radius (e.g. `'8px'`, `'999px'`). */
    borderRadius?: string;
    /** Minimum button height (e.g. `'44px'`). */
    minHeight?: string;
    /**
     * Button width. CSS length or `%` (e.g. `'100%'`, `'220px'`).
     * Prefer `%` / lengths that fit the panel; avoid values that overflow the strip.
     */
    width?: string;
    /** CSS padding shorthand (1–4 length values). */
    padding?: string;
    /** Hover background when the CTA is enabled. */
    hoverBackgroundColor?: string;
    /** Hover text color when the CTA is enabled. */
    hoverTextColor?: string;
    /** Disabled background (overrides the default muted color-mix). */
    disabledBackgroundColor?: string;
    /** Disabled text color. */
    disabledTextColor?: string;
    /** Background while confirming (`aria-busy="true"`). */
    loadingBackgroundColor?: string;
    /** Text color while confirming. */
    loadingTextColor?: string;
    /** `:focus-visible` outline color (defaults to `--ep-focus` / accent). */
    focusOutlineColor?: string;
    /** `:focus-visible` outline width (e.g. `'2px'`). */
    focusOutlineWidth?: string;
    /** `:focus-visible` outline offset (e.g. `'2px'`). */
    focusOutlineOffset?: string;
}

interface PaymentContext {
    product: PaymentProduct;
    checkout?: CheckoutOptions;
    theme: ResolvedPaymentTheme;
}

interface PaymentRequest {
    method: PaymentMethod;
    context: PaymentContext;
}

interface CreatePaymentRequest {
    provider: 'stripe' | 'paypal';
    productId: string;
    quantity: number;
    currency?: string;
    /**
     * Display/request unit amount from the Angular product (e.g. 99.99).
     * Useful for UI display. Production / demo backends must NOT trust this —
     * derive the authoritative amount server-side from productId / catalog.
     */
    amount?: number;
    /** Optional non-sensitive metadata for the merchant backend. */
    metadata?: Record<string, string>;
}
/**
 * Minimal wire contract for PayPal create-order.
 * Never includes a browser-controlled amount or a metadata map.
 * `orderReference` is the only merchant reference sent to PayPal.
 */
interface PayPalCreateOrderRequest {
    provider: 'paypal';
    productId: string;
    quantity: number;
    currency: string;
    /**
     * Merchant `orderId` metadata, mapped to PayPal `custom_id`.
     * Other metadata keys are not sent to PayPal.
     */
    orderReference?: string;
}
/**
 * Maps product identity fields into the PayPal create-order HTTP body.
 * Strips amount, metadata, and any other internal fields.
 */
declare function toPayPalCreateOrderRequest(input: {
    productId: string;
    quantity: number;
    currency: string;
    orderReference?: string;
}): PayPalCreateOrderRequest;
/**
 * Minimal wire contract for Klarna-via-Stripe create PaymentIntent.
 * Never includes a browser-controlled amount. Metadata is a validated string map.
 */
interface KlarnaCreatePaymentRequest {
    provider: 'klarna';
    productId: string;
    quantity: number;
    currency: string;
    /**
     * Optional Stripe Klarna preferred_locale (e.g. `es-US`).
     * Localization hint only — never affects pricing.
     */
    preferredLocale?: string;
    /** Validated merchant metadata. Amount and currency are not accepted here. */
    metadata?: Record<string, string>;
}
/**
 * Maps product identity fields into the Klarna create-payment HTTP body.
 * Strips amount and any fields other than the validated metadata map.
 */
declare function toKlarnaCreatePaymentRequest(input: {
    productId: string;
    quantity: number;
    currency: string;
    preferredLocale?: string;
    metadata?: Record<string, string>;
}): KlarnaCreatePaymentRequest;
/**
 * Response expected from the merchant backend after creating a Stripe PaymentIntent.
 * The backend alone decides the trusted amount and uses the Stripe secret key.
 */
interface CreateStripePaymentResponse {
    provider: 'stripe';
    clientSecret: string;
    sessionId?: string;
    paymentIntentId?: string;
}
/**
 * Response from POST paypal create-order.
 * The backend alone creates the PayPal order with a trusted catalog amount.
 */
interface CreatePayPalOrderResponse {
    provider: 'paypal';
    orderId: string;
}
/**
 * Response from POST paypal capture-order after buyer approval.
 */
interface CapturePayPalOrderResponse {
    provider: 'paypal';
    orderId: string;
    captureId: string;
    status?: string;
}
/**
 * Response from POST klarna create (Klarna-only Stripe PaymentIntent).
 * The backend alone decides the trusted amount and uses the Stripe secret key.
 */
interface CreateKlarnaPaymentResponse {
    provider: 'klarna';
    clientSecret: string;
    paymentIntentId?: string;
    sessionId?: string;
}
/**
 * Minimal wire contract for Affirm-via-Stripe create PaymentIntent.
 * Never includes a browser-controlled amount. Metadata is a validated string map.
 */
interface AffirmCreatePaymentRequest {
    provider: 'affirm';
    productId: string;
    quantity: number;
    currency: string;
    /**
     * Optional Stripe Affirm preferred_locale (e.g. `en_US`).
     * Localization hint only — never affects pricing.
     */
    preferredLocale?: string;
    /** Validated merchant metadata. Amount and currency are not accepted here. */
    metadata?: Record<string, string>;
}
/**
 * Maps product identity fields into the Affirm create-payment HTTP body.
 * Strips amount and any fields other than the validated metadata map.
 */
declare function toAffirmCreatePaymentRequest(input: {
    productId: string;
    quantity: number;
    currency: string;
    preferredLocale?: string;
    metadata?: Record<string, string>;
}): AffirmCreatePaymentRequest;
/**
 * Response from POST affirm create (Affirm-only Stripe PaymentIntent).
 * The backend alone decides the trusted amount and uses the Stripe secret key.
 */
interface CreateAffirmPaymentResponse {
    provider: 'affirm';
    clientSecret: string;
    paymentIntentId?: string;
    sessionId?: string;
}
type CreatePaymentResponse = CreateStripePaymentResponse | CreatePayPalOrderResponse | CreateKlarnaPaymentResponse | CreateAffirmPaymentResponse;

type PaymentErrorCode = 'CONFIG_MISSING' | 'CONFIG_INVALID' | 'PRODUCT_INVALID' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_NOT_CONFIGURED' | 'PAYMENT_CANCELLED' | 'PAYMENT_FAILED' | 'CARD_DECLINED' | 'AUTHENTICATION_REQUIRED' | 'AUTHENTICATION_FAILED' | 'NETWORK_ERROR' | 'SDK_LOAD_FAILED' | 'BACKEND_ERROR' | 'PROVIDER_NOT_IMPLEMENTED' | 'UNKNOWN';
declare class PaymentError extends Error {
    readonly code: PaymentErrorCode;
    readonly method?: PaymentMethod;
    readonly provider?: PaymentProviderName;
    readonly originalError?: unknown;
    constructor(options: {
        code: PaymentErrorCode;
        message: string;
        method?: PaymentMethod;
        provider?: PaymentProviderName;
        originalError?: unknown;
    });
    toJSON(): Record<string, unknown>;
}
declare function normalizeError(error: unknown, fallback?: {
    method?: PaymentMethod;
    provider?: PaymentProviderName;
}): PaymentError;

/** Internal readiness for a checkout method. Compatible with a future diagnostics API. */
type MethodReadinessState = 'loading' | 'ready' | 'unavailable' | 'misconfigured';

interface AvailablePaymentMethod {
    method: PaymentMethod;
    isMock: boolean;
    available: boolean;
    /**
     * Optional readiness detail (Apple Pay real ECE).
     * `checking` = waiting for Express Checkout `ready` (tile hidden).
     */
    status?: 'checking' | 'available' | 'unavailable' | 'error' | 'indeterminate';
    /** Internal method readiness. Optional so existing callers stay compatible. */
    readiness?: MethodReadinessState;
    /** Stable diagnostic code for developers. Not shown in customer UI. */
    diagnosticCode?: string;
}
declare class PaymentOrchestratorService {
    private readonly adapterFactory;
    private readonly registry;
    private readonly themeService;
    private readonly _availableMethods;
    private readonly _availabilityPublished;
    private readonly _loading;
    private initialized;
    /** In-flight adapter registration, shared by concurrent hosts so it runs once. */
    private initPromise;
    /** Concurrent `processPayment` calls across hosts; `loading` is true while any is in flight. */
    private inFlightPayments;
    /**
     * Global last-refresh availability. UI hosts must not bind tiles to this signal
     * when multiple checkouts can mount — use the per-instance
     * `CheckoutAvailabilitySession` applied from the return value of
     * {@link refreshAvailability}. `EasyPaymentsDiagnosticsService` continues to
     * project this global snapshot.
     */
    readonly availableMethods: _angular_core.Signal<AvailablePaymentMethod[]>;
    /**
     * True after `refreshAvailability` publishes method readiness on the root
     * orchestrator. `reinitialize()` clears it until the next successful refresh.
     * Consuming apps should read `EasyPaymentsDiagnosticsService` for developer
     * diagnostics (also global / last-refresh).
     */
    readonly availabilityPublished: _angular_core.Signal<boolean>;
    readonly loading: _angular_core.Signal<boolean>;
    initialize(): Promise<void>;
    /** Re-register adapters after runtime config changes (e.g. demo mock ↔ Stripe). */
    reinitialize(): Promise<void>;
    setTheme(theme: PaymentTheme): void;
    validateProduct(product: PaymentProduct): void;
    private buildContext;
    refreshAvailability(methods: PaymentMethod[], product: PaymentProduct, checkout?: CheckoutOptions, theme?: ResolvedPaymentTheme): Promise<AvailablePaymentMethod[]>;
    processPayment(method: PaymentMethod, product: PaymentProduct, checkout?: CheckoutOptions): Promise<PaymentResult>;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<PaymentOrchestratorService, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<PaymentOrchestratorService>;
}

type CheckoutViewState = 'checkout' | 'processing' | 'success' | 'error' | 'cancelled';
/**
 * Safe, truncated transaction reference for customer UI.
 * Never displays tokens or secrets — only a shortened id when present.
 */
declare function formatTransactionReference(transactionId?: string | null): string | null;

/**
 * Public locale API for Easy Payments v1.1.0.
 * `auto` resolves from the browser when available; otherwise English.
 */
type EasyPaymentsLocale = 'auto' | 'en' | 'es' | 'pt';
/** Resolved dictionary locale (never `auto`). */
type EasyPaymentsResolvedLocale = 'en' | 'es' | 'pt';
declare const EASY_PAYMENTS_SUPPORTED_LOCALES: readonly EasyPaymentsResolvedLocale[];
declare const EASY_PAYMENTS_DEFAULT_LOCALE: EasyPaymentsLocale;

/**
 * Normalize a BCP 47 / browser language tag to a supported Easy Payments locale.
 * Unsupported languages resolve to English.
 */
declare function normalizeLanguageTag(tag: string | null | undefined): EasyPaymentsResolvedLocale;
/**
 * SSR-safe browser language detection.
 * Never touches navigator during evaluation unless it exists.
 */
declare function detectBrowserLocale(languages?: readonly string[] | null, language?: string | null): EasyPaymentsResolvedLocale;
/**
 * Resolve the effective dictionary locale from a requested locale input.
 */
declare function resolveEffectiveLocale(requested: EasyPaymentsLocale | string | null | undefined, options?: {
    languages?: readonly string[] | null;
    language?: string | null;
}): EasyPaymentsResolvedLocale;

/**
 * Full Easy Payments-owned UI dictionary.
 * English is canonical; es/pt must implement the same shape.
 */
interface EasyPaymentsTranslations {
    checkoutAriaLabel: string;
    paymentMethodsLabel: string;
    paymentMethodSelectionAria: string;
    checkoutTitle: string;
    checkoutSubtitle: string;
    noPaymentMethodsAvailable: string;
    demoBadge: string;
    demoModeAria: string;
    methodCard: string;
    orderTotal: string;
    quantityPrefix: string;
    eachSuffix: string;
    processingTitle: string;
    processingHint: string;
    successTitle: string;
    successBody: string;
    successContinue: string;
    successProduct: string;
    successTotal: string;
    successPaidWith: string;
    successTransaction: string;
    errorTitle: string;
    errorBody: string;
    errorTryAgain: string;
    errorDetailCardDeclined: string;
    errorDetailNetwork: string;
    errorDetailConfig: string;
    errorDetailUnavailable: string;
    errorDetailAuthRequired: string;
    errorDetailAuthFailed: string;
    errorDetailSdkLoad: string;
    errorDetailBackend: string;
    errorDetailProductInvalid: string;
    errorDetailCancelled: string;
    cancelledTitle: string;
    cancelledBody: string;
    cancelledReturn: string;
    payWithMethod: string;
    demoCheckoutHint: string;
    /** Single notice above the Buttons Only strip when mock methods are present. */
    buttonsDemoModeNotice: string;
    continuePaymentHint: string;
    processingPayment: string;
    /** Nonterminal recovered BNPL PaymentIntent — not an active buyer submit. */
    awaitingProviderPayment: string;
    payAmount: string;
    payAmountWithMethodAria: string;
    /** Confirm CTA without repeating the merchant-owned amount (Buttons Only expanded panels). */
    confirmPayment: string;
    confirmPaymentWithMethodAria: string;
    /** Buttons Only redirect-method CTA (Klarna / Affirm). `{{method}}` is the provider name. */
    continueToMethod: string;
    /** Buttons Only demo-mode CTA — makes clear no real payment is made. */
    completeDemoPayment: string;
    /** Buttons Only demo-mode CTA accessible name. `{{method}}` is the method label. */
    completeDemoPaymentWithMethodAria: string;
    methodLoadingStatus: string;
    methodUnavailableStatus: string;
    cardPaymentRegionAria: string;
    klarnaPaymentRegionAria: string;
    affirmPaymentRegionAria: string;
    demoWalletButtonAria: string;
    payWithCard: string;
    secureCardPaymentStripe: string;
    preparingSecureCardForm: string;
    stripeCardFormAria: string;
    acceptedCardsAria: string;
    cardsAcceptedViaStripe: string;
    paymentCompleted: string;
    defaultSecureCheckout: string;
    payWithPayPal: string;
    secureCheckoutPayPal: string;
    preparingPayPal: string;
    creatingPayPalOrder: string;
    waitingPayPalApproval: string;
    capturingPayPal: string;
    paypalCheckoutAria: string;
    paypalCancelled: string;
    payWithGooglePay: string;
    secureCheckoutGooglePay: string;
    preparingGooglePay: string;
    googlePayUnavailable: string;
    preparingSecurePayment: string;
    waitingGooglePay: string;
    processingGooglePay: string;
    googlePayCheckoutAria: string;
    totalAmount: string;
    payWithApplePay: string;
    secureCheckoutApplePay: string;
    preparingApplePay: string;
    applePayUnavailable: string;
    processingApplePay: string;
    applePayCheckoutAria: string;
    payWithKlarna: string;
    secureCheckoutKlarna: string;
    preparingKlarna: string;
    klarnaFormAria: string;
    payWithAffirm: string;
    secureCheckoutAffirm: string;
    preparingAffirm: string;
    affirmFormAria: string;
}
/** Partial overrides supplied by the consuming app. */
type EasyPaymentsTranslationOverrides = Partial<EasyPaymentsTranslations>;
type EasyPaymentsTranslationKey = keyof EasyPaymentsTranslations;
/**
 * Replace `{{token}}` placeholders in a translation string.
 */
declare function interpolate(template: string, params?: Record<string, string | number | undefined | null>): string;

/**
 * Priority: custom override → locale dictionary → English.
 */
declare function resolveMessages(locale: EasyPaymentsResolvedLocale, overrides?: EasyPaymentsTranslationOverrides): EasyPaymentsTranslations;

/**
 * Stripe.js Elements `locale` option.
 * @see https://docs.stripe.com/js/appendix/supported_locales
 */
declare function toStripeElementsLocale(locale: EasyPaymentsResolvedLocale): string;
/**
 * PayPal JS SDK `locale` query parameter (underscore form).
 * @see https://developer.paypal.com/sdk/js/configuration/#locale
 */
declare function toPayPalSdkLocale(locale: EasyPaymentsResolvedLocale): string;
/**
 * Google Pay Web `ButtonOptions.buttonLocale` (ISO 639-1).
 * Controls official button text only — not the Google-hosted payment sheet.
 * @see https://developers.google.com/pay/api/web/reference/request-objects#ButtonOptions
 */
declare function toGooglePayButtonLocale(locale: EasyPaymentsResolvedLocale): string;
/**
 * BCP-47 style language-region tags used as Stripe BNPL locale hints
 * (e.g. documentation / Affirm preferred_locale when underscore form is derived).
 */
declare function toStripeBnplLocale(locale: EasyPaymentsResolvedLocale): string;
/**
 * Stripe Klarna `payment_method_options.klarna.preferred_locale`.
 * Must be a language-country pair Stripe accepts for the purchase/billing country.
 * Invalid combinations are ignored by Stripe (country default language wins).
 * @see https://docs.stripe.com/payments/klarna/accept-a-payment
 */
declare function toKlarnaPreferredLocale(locale: EasyPaymentsResolvedLocale, purchaseCountry?: string): string;
/**
 * Stripe Affirm `payment_method_options.affirm.preferred_locale`.
 * Affirm’s documented US/CA page languages are limited (typically `en_US` / `en_CA` / `fr_CA`).
 * Easy Payments does not invent unsupported Affirm locales for `es` / `pt`.
 * @see https://docs.stripe.com/api/payment_intents/create#create_payment_intent-payment_method_options-affirm-preferred_locale
 */
declare function toAffirmPreferredLocale(locale: EasyPaymentsResolvedLocale, purchaseCountry?: string): string;

/**
 * Map a normalized PaymentError code to a customer-facing localized string.
 * Never returns the technical/provider English diagnostic from PaymentError.message.
 */
declare function localizePaymentError(code: PaymentErrorCode | undefined, messages: EasyPaymentsTranslations): string;

declare class EasyPaymentsComponent {
    private readonly orchestrator;
    private readonly themeService;
    private readonly stripeRedirectRecovery;
    private readonly applePayAdapter;
    private readonly i18n;
    private readonly destroyRef;
    private readonly ngZone;
    private readonly hostContext;
    private readonly pendingTasks;
    private destroyed;
    /** True while this component owns the availability ECE mount (Minimal-style host). */
    private applePayBootstrapOwned;
    private applePayBootstrapGeneration;
    /**
     * Instance-local availability. Updated from orchestrator.refreshAvailability
     * return values; stale async completions are ignored via generation counter.
     */
    private readonly availabilitySession;
    private availabilityGeneration;
    /** Per-instance contrast warning dedupe (dev console only; never buyer-facing). */
    private readonly contrastWarnings;
    private readonly applePayBootstrapHost;
    readonly product: _angular_core.InputSignal<PaymentProduct>;
    readonly methods: _angular_core.InputSignal<PaymentMethod[]>;
    readonly checkout: _angular_core.InputSignal<CheckoutOptions | undefined>;
    /**
     * Optional stable id for this checkout host on pages with several instances.
     * Used to attribute Stripe Klarna/Affirm redirect returns after reload or reorder.
     * Omit on single-host pages. Values: 1–64 chars `[a-zA-Z0-9_.:-]`.
     */
    readonly checkoutInstanceId: _angular_core.InputSignal<string | null>;
    readonly theme: _angular_core.InputSignal<PaymentTheme>;
    /**
     * Outer shell style. `default` draws the built-in card chrome;
     * `transparent` removes it so a merchant parent background shows through.
     */
    readonly appearance: _angular_core.InputSignal<EasyPaymentsAppearance>;
    /**
     * Optional Easy Payments–owned visual overrides (font, text/surface colors,
     * accent, radius, spacing). Independent of `theme` and `appearance`.
     * Invalid or omitted fields leave built-in tokens unchanged. Does not restyle
     * official provider SDK buttons or marks.
     */
    readonly visualStyle: _angular_core.InputSignal<EasyPaymentsVisualStyle | null>;
    /**
     * Optional Easy Payments–owned Stripe Card confirmation CTA presentation
     * (label, colors, typography, border, size, hover/disabled/loading/focus).
     * Does not restyle the Stripe Payment Element iframe or other providers.
     */
    readonly cardButtonAppearance: _angular_core.InputSignal<EasyPaymentsCardButtonAppearance | null>;
    /**
     * Maximum checkout width in pixels. The component stays fluid (`width: 100%`)
     * up to this cap. Values are clamped to library-safe limits (320–1200).
     * Defaults to 640.
     */
    readonly maxWidth: _angular_core.InputSignal<string | number | null | undefined>;
    /**
     * Built-in confirmation UI after success. Defaults to confirmation.
     * Can also be set via checkout.successBehavior.
     */
    readonly successBehavior: _angular_core.InputSignal<CheckoutSuccessBehavior>;
    /**
     * UI locale. `auto` detects from the browser (es-*, pt-*, en-* → matching base;
     * anything else → English). Defaults to `auto`.
     */
    readonly locale: _angular_core.InputSignal<EasyPaymentsLocale>;
    /**
     * Partial overrides for Easy Payments-owned UI text.
     * Priority: override → effective locale dictionary → English.
     */
    readonly translations: _angular_core.InputSignal<Partial<_easy_payments_angular.EasyPaymentsTranslations>>;
    readonly success: _angular_core.OutputEmitterRef<PaymentResult>;
    readonly cancel: _angular_core.OutputEmitterRef<PaymentResult>;
    readonly error: _angular_core.OutputEmitterRef<PaymentError>;
    /**
     * Fired when a PaymentIntent is still `processing` (not yet succeeded or failed).
     * Not a success and not a definitive failure. Do not retry; await backend/webhook.
     */
    readonly pending: _angular_core.OutputEmitterRef<PaymentResult>;
    /** Fired when the customer clicks Continue on the built-in success screen. */
    readonly successContinue: _angular_core.OutputEmitterRef<PaymentResult>;
    /**
     * Fired once when a payment attempt begins.
     * Selecting a method tile does not start an attempt.
     */
    readonly started: _angular_core.OutputEmitterRef<PaymentStartedEvent>;
    /** Fired when the selected method changes, including when it becomes unavailable. */
    readonly methodChange: _angular_core.OutputEmitterRef<PaymentMethodChangeEvent>;
    readonly effectiveLocale: _angular_core.Signal<_easy_payments_angular.EasyPaymentsResolvedLocale>;
    readonly checkoutAriaLabel: _angular_core.Signal<string>;
    readonly paymentMethodSelectionAria: _angular_core.Signal<string>;
    readonly checkoutTitle: _angular_core.Signal<string>;
    readonly checkoutSubtitle: _angular_core.Signal<string>;
    readonly noPaymentMethodsAvailable: _angular_core.Signal<string>;
    readonly resolvedTheme: _angular_core.Signal<ResolvedPaymentTheme>;
    /** Per-instance readiness — not the root orchestrator snapshot. */
    readonly availableMethods: _angular_core.Signal<AvailablePaymentMethod[]>;
    readonly loading: _angular_core.Signal<boolean>;
    /** Clamped max-width applied to the host (and used by container queries). */
    readonly effectiveMaxWidth: _angular_core.Signal<number>;
    readonly checkoutMaxWidthCss: _angular_core.Signal<string>;
    /** Sanitized host CSS variable overrides from `[visualStyle]` (null = use SCSS defaults). */
    readonly visualStyleCssVars: _angular_core.Signal<VisualStyleHostCssVars>;
    readonly selectedMethod: _angular_core.WritableSignal<PaymentMethod | null>;
    private readonly processingMethod;
    /** Real provider is mid-flow (3DS / PayPal approval / Google Pay sheet). */
    readonly providerBusy: _angular_core.WritableSignal<boolean>;
    readonly viewState: _angular_core.WritableSignal<CheckoutViewState>;
    readonly lastResult: _angular_core.WritableSignal<PaymentResult | null>;
    readonly lastError: _angular_core.WritableSignal<PaymentError | null>;
    /** Bumped on reset so real provider panels remount with a fresh session. */
    readonly providerMountKey: _angular_core.WritableSignal<number>;
    /** Prevents duplicate Stripe BNPL return recovery / success emits on one page load. */
    private stripeReturnRecoveryStarted;
    /** Method of a Stripe BNPL return seen at construction, until ownership is claimed. */
    private stripeReturnMethod;
    private stripeReturnClaimed;
    /** Re-runs default method selection after a non-owned return releases this host. */
    private readonly selectionRefresh;
    private terminalSuccessEmitted;
    /** One in-flight attempt. `settled` drops duplicate terminal callbacks until the next attempt. */
    private paymentAttempt;
    /** Terminal/mock-processing screens that replace the checkout form. */
    readonly showOutcome: _angular_core.Signal<boolean>;
    readonly showCheckoutForm: _angular_core.Signal<boolean>;
    readonly methodsLocked: _angular_core.Signal<boolean>;
    readonly resolvedSuccessBehavior: _angular_core.Signal<CheckoutSuccessBehavior>;
    readonly outcomeState: _angular_core.Signal<"success" | "cancelled" | "processing" | "error">;
    readonly visibleMethods: _angular_core.Signal<AvailablePaymentMethod[]>;
    readonly selectedEntry: _angular_core.Signal<AvailablePaymentMethod | null>;
    readonly hasRealCardMethod: _angular_core.Signal<boolean>;
    readonly hasRealPayPalMethod: _angular_core.Signal<boolean>;
    readonly hasRealGooglePayMethod: _angular_core.Signal<boolean>;
    readonly hasRealApplePayMethod: _angular_core.Signal<boolean>;
    readonly hasRealKlarnaMethod: _angular_core.Signal<boolean>;
    readonly hasRealAffirmMethod: _angular_core.Signal<boolean>;
    readonly showMockPanel: _angular_core.Signal<boolean>;
    readonly showStripePanel: _angular_core.Signal<boolean>;
    readonly showPayPalPanel: _angular_core.Signal<boolean>;
    readonly showGooglePayPanel: _angular_core.Signal<boolean>;
    /**
     * Dedicated Minimal-ECE-style host: mounts while Apple Pay availability is unknown.
     * Independent of tile/panel visibility so Stripe can fire `ready` on iOS Safari.
     */
    readonly showApplePayBootstrap: _angular_core.Signal<boolean>;
    /**
     * Payment panel after Stripe reports Apple Pay available.
     * Only mount when selected so ECE is not remounted into a clipped inactive panel.
     */
    /**
     * Real Apple Pay renders Stripe's own button inside the methods list, so it is an
     * express action rather than a selectable tile. Mock Apple Pay keeps the tile + panel.
     */
    readonly applePayExpressInList: _angular_core.Signal<boolean>;
    readonly showApplePayPanel: _angular_core.Signal<boolean>;
    readonly showKlarnaPanel: _angular_core.Signal<boolean>;
    readonly showAffirmPanel: _angular_core.Signal<boolean>;
    /**
     * Keep the active real-provider panel interactive while its own UI is needed
     * (including during providerBusy / 3DS / sheets). Clip only when another method
     * is selected or a terminal/mock-processing outcome replaced the form.
     */
    readonly stripePanelActive: _angular_core.Signal<boolean>;
    readonly paypalPanelActive: _angular_core.Signal<boolean>;
    readonly googlePayPanelActive: _angular_core.Signal<boolean>;
    readonly applePayPanelActive: _angular_core.Signal<boolean>;
    readonly klarnaPanelActive: _angular_core.Signal<boolean>;
    readonly affirmPanelActive: _angular_core.Signal<boolean>;
    constructor();
    /**
     * Minimal-ECE-parity availability mount. Tile appears only after ready + applePay:true.
     */
    private applePayBootstrapSessionKey;
    private applePayBootstrapHostElement;
    /**
     * Evaluate availability through the root orchestrator (adapters + global diagnostics
     * projection), then store the returned snapshot on this instance only.
     */
    private refreshInstanceAvailability;
    private mountApplePayBootstrap;
    private claimStripeReturnOnce;
    /** Another host owns the return (or it was unattributable): show a normal checkout. */
    private releaseStripeReturn;
    /**
     * Library-owned Stripe BNPL redirect recovery (Klarna / Affirm). Always leaves
     * processing for a terminal state (success / error / cancelled). Idempotent per page load.
     */
    private recoverStripeReturn;
    selectMethod(method: PaymentMethod): void;
    isMethodLoading(method: PaymentMethod): boolean;
    onProviderBusy(busy: boolean): void;
    onStripeSuccess(result: PaymentResult): void;
    onStripeCancel(result: PaymentResult): void;
    onStripeError(error: PaymentError): void;
    onPayPalSuccess(result: PaymentResult): void;
    onPayPalCancel(result: PaymentResult): void;
    onPayPalError(error: PaymentError): void;
    onGooglePaySuccess(result: PaymentResult): void;
    onGooglePayCancel(result: PaymentResult): void;
    onGooglePayError(error: PaymentError): void;
    onApplePaySuccess(result: PaymentResult): void;
    onApplePayCancel(result: PaymentResult): void;
    onApplePayError(error: PaymentError): void;
    onKlarnaSuccess(result: PaymentResult): void;
    onKlarnaCancel(result: PaymentResult): void;
    onKlarnaError(error: PaymentError): void;
    /**
     * Klarna panel busy/returning signals (in-page confirm). Redirect recovery is
     * owned by recoverStripeReturn() so Processing cannot hang without a panel.
     */
    onKlarnaReturning(active: boolean): void;
    onAffirmSuccess(result: PaymentResult): void;
    onAffirmCancel(result: PaymentResult): void;
    onAffirmError(error: PaymentError): void;
    onAffirmReturning(active: boolean): void;
    onPay(method: PaymentMethod): Promise<void>;
    onOutcomeAction(): void;
    /** Public helper for hosts (e.g. demo Continue) to restore a fresh checkout UI. */
    resetCheckoutView(): void;
    /** Provider panels call this when a real attempt starts. Tile selection does not. */
    onPaymentStarted(method: PaymentMethod): void;
    private updateSelectedMethod;
    /** False when this terminal callback repeats an attempt that already finished. */
    private acceptTerminalEvent;
    private handleSuccess;
    /**
     * Asynchronous pending PaymentIntent: not success, not failure.
     * Locks retry (settles the attempt) and keeps the processing screen.
     */
    private handlePending;
    private handleCancelled;
    private handlePaymentError;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<EasyPaymentsComponent, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<EasyPaymentsComponent, "easy-payments", never, { "product": { "alias": "product"; "required": true; "isSignal": true; }; "methods": { "alias": "methods"; "required": false; "isSignal": true; }; "checkout": { "alias": "checkout"; "required": false; "isSignal": true; }; "checkoutInstanceId": { "alias": "checkoutInstanceId"; "required": false; "isSignal": true; }; "theme": { "alias": "theme"; "required": false; "isSignal": true; }; "appearance": { "alias": "appearance"; "required": false; "isSignal": true; }; "visualStyle": { "alias": "visualStyle"; "required": false; "isSignal": true; }; "cardButtonAppearance": { "alias": "cardButtonAppearance"; "required": false; "isSignal": true; }; "maxWidth": { "alias": "maxWidth"; "required": false; "isSignal": true; }; "successBehavior": { "alias": "successBehavior"; "required": false; "isSignal": true; }; "locale": { "alias": "locale"; "required": false; "isSignal": true; }; "translations": { "alias": "translations"; "required": false; "isSignal": true; }; }, { "success": "success"; "cancel": "cancel"; "error": "error"; "pending": "pending"; "successContinue": "successContinue"; "started": "started"; "methodChange": "methodChange"; }, never, never, true, never>;
}

/** Slot readiness for the method list. */
type EasyPaymentButtonSlotState = 'loading' | 'available' | 'unavailable';
/**
 * How a method slot is rendered.
 * - `placeholder` — noninteractive (loading or unavailable)
 * - `*-selector` — compact strip selector that reveals the shared panel below
 * - `*-express` — official provider buttons in-slot
 * - `*-mock` — development-only mock wallet strip buttons in-slot
 */
type EasyPaymentButtonSlotKind = 'placeholder' | 'card-selector' | 'klarna-selector' | 'affirm-selector' | 'paypal-express' | 'paypal-mock' | 'google-pay-express' | 'google-pay-mock' | 'apple-pay-express' | 'apple-pay-mock';
interface EasyPaymentButtonSlot {
    readonly method: PaymentMethod;
    readonly state: EasyPaymentButtonSlotState;
    readonly isMock: boolean;
    readonly label: string;
    readonly kind: EasyPaymentButtonSlotKind;
    /**
     * True for Card / Klarna / Affirm strip selectors.
     * Express mounts are interactive payments but not selectors.
     */
    readonly interactive: boolean;
    /**
     * Visible text next to the mark. Always false when the mark already includes
     * the brand name (Klarna / Affirm) or when Card uses the icon alone.
     */
    readonly showVisibleLabel: boolean;
    /** Library brand mark. Ignored by official wallet SDK slots. */
    readonly showBrandIcon: boolean;
}
/**
 * Payment Buttons Only — compact payment strip + shared expanded panel.
 *
 * Wallets (Apple Pay / Google Pay / PayPal) mount official SDK buttons in the strip.
 * Card / Klarna / Affirm use compact selectors; their secure forms open in one shared
 * region below the entire strip. Mock wallet stand-ins are development-only.
 */
declare class EasyPaymentButtonsComponent {
    private readonly orchestrator;
    private readonly themeService;
    private readonly i18n;
    private readonly configService;
    private readonly applePayAdapter;
    private readonly klarnaAdapter;
    private readonly affirmAdapter;
    private readonly confirmationGate;
    private readonly stripeRedirectRecovery;
    private readonly hostContext;
    private readonly pendingTasks;
    private readonly ngZone;
    private readonly destroyRef;
    private destroyed;
    private readonly klarnaDirectOwnerId;
    private readonly affirmDirectOwnerId;
    private directAttemptGeneration;
    /**
     * Page-level mutex for Buttons Only Direct Intent create+confirm.
     * Prevents parallel Klarna/Affirm Direct attempts across multiple hosts
     * before `StripeConfirmationGate` is acquired inside the adapter.
     */
    private static directPageLock;
    private readonly availabilitySession;
    private availabilityGeneration;
    /** One in-flight attempt. Prevents duplicate terminal emits. */
    private paymentAttempt;
    /** Idempotent Klarna/Affirm redirect recovery per host instance. */
    private stripeReturnRecoveryStarted;
    /** True while a Stripe BNPL return is pending ownership or being recovered (blocks selection clears). */
    private stripeReturnRecovering;
    /** Method of a Stripe BNPL return seen at construction, until ownership is claimed. */
    private stripeReturnMethod;
    private stripeReturnClaimed;
    /** A recovered return succeeded: its panel must not create another PaymentIntent. */
    private successAfterReturn;
    readonly product: _angular_core.InputSignal<PaymentProduct>;
    readonly methods: _angular_core.InputSignal<PaymentMethod[]>;
    readonly checkout: _angular_core.InputSignal<CheckoutOptions | undefined>;
    /**
     * Optional stable id for this buttons host on pages with several instances.
     * Used to attribute Stripe Klarna/Affirm redirect returns after reload or reorder.
     * Omit on single-host pages. Values: 1–64 chars `[a-zA-Z0-9_.:-]`.
     */
    readonly checkoutInstanceId: _angular_core.InputSignal<string | null>;
    /** Method row orientation. Order always follows `[methods]`. */
    readonly layout: _angular_core.InputSignal<EasyPaymentButtonsLayout>;
    readonly theme: _angular_core.InputSignal<PaymentTheme>;
    readonly locale: _angular_core.InputSignal<EasyPaymentsLocale>;
    readonly translations: _angular_core.InputSignal<Partial<_easy_payments_angular.EasyPaymentsTranslations>>;
    /**
     * Optional EP-owned token overrides for list chrome.
     * Host background remains permanently transparent regardless of `backgroundColor`.
     * Use `[buttonsAppearance].background` for an optional strip fill.
     */
    readonly visualStyle: _angular_core.InputSignal<EasyPaymentsVisualStyle | null>;
    /**
     * Optional strip presentation (gap, separators, borders, radius, dimensions).
     * Defaults to a transparent compact payment strip.
     */
    readonly buttonsAppearance: _angular_core.InputSignal<EasyPaymentButtonsAppearance | null>;
    /**
     * Optional Easy Payments–owned Stripe Card confirmation CTA presentation
     * (label, colors, typography, border, size, hover/disabled/loading/focus).
     * Independent of `[buttonsAppearance]` (strip chrome). Does not restyle the
     * Stripe Payment Element iframe or official wallet SDK buttons.
     */
    readonly cardButtonAppearance: _angular_core.InputSignal<EasyPaymentsCardButtonAppearance | null>;
    /**
     * Klarna/Affirm confirmation strategy for Buttons Only only.
     * Default `element` preserves Payment Element + Continue for existing merchants.
     * Opt in to `auto` / `direct` for one-click Stripe Direct when checkout customer
     * data satisfies {@link evaluateBnplDirectReadiness}.
     */
    readonly bnplConfirmMode: _angular_core.InputSignal<BnplConfirmMode>;
    /**
     * `library` (default) renders Easy Payments Card / Klarna / Affirm selectors.
     * `merchant` hides those selectors so the host app calls {@link requestPayment}.
     * PayPal, Google Pay, and Apple Pay stay official SDK buttons either way.
     */
    readonly selectorVisibility: _angular_core.InputSignal<EasyPaymentButtonsSelectorVisibility>;
    readonly started: _angular_core.OutputEmitterRef<PaymentStartedEvent>;
    readonly methodChange: _angular_core.OutputEmitterRef<PaymentMethodChangeEvent>;
    readonly success: _angular_core.OutputEmitterRef<PaymentResult>;
    readonly cancel: _angular_core.OutputEmitterRef<PaymentResult>;
    readonly error: _angular_core.OutputEmitterRef<PaymentError>;
    /**
     * Fired when a PaymentIntent is still `processing` (not yet succeeded or failed).
     * Not a success and not a definitive failure. Do not retry; await backend/webhook.
     */
    readonly pending: _angular_core.OutputEmitterRef<PaymentResult>;
    readonly resolvedTheme: _angular_core.Signal<ResolvedPaymentTheme>;
    readonly effectiveLocale: _angular_core.Signal<EasyPaymentsResolvedLocale>;
    readonly availableMethods: _angular_core.Signal<AvailablePaymentMethod[]>;
    readonly availabilityPublished: _angular_core.Signal<boolean>;
    readonly loading: _angular_core.Signal<boolean>;
    readonly selectedMethod: _angular_core.WritableSignal<PaymentMethod | null>;
    readonly providerBusy: _angular_core.WritableSignal<boolean>;
    readonly processingMethod: _angular_core.WritableSignal<PaymentMethod | null>;
    /** True while Buttons Only is running (or has locked) a Direct BNPL attempt — suppresses PE panels. */
    readonly bnplDirectActive: _angular_core.WritableSignal<boolean>;
    readonly visualStyleCssVars: _angular_core.Signal<VisualStyleHostCssVars>;
    readonly msgs: _angular_core.Signal<_easy_payments_angular.EasyPaymentsTranslations>;
    readonly regionAriaLabel: _angular_core.Signal<string>;
    readonly separatorsEnabled: _angular_core.Signal<boolean>;
    readonly borderlessSelectors: _angular_core.Signal<boolean>;
    readonly buttonsGapCss: _angular_core.Signal<string>;
    readonly buttonsPaddingCss: _angular_core.Signal<string>;
    readonly buttonsHeightCss: _angular_core.Signal<string>;
    readonly buttonsMinWidthCss: _angular_core.Signal<string>;
    readonly buttonsWidthCss: _angular_core.Signal<string>;
    /** Horizontal slot width; `null` keeps the stylesheet default. */
    readonly buttonsSlotWidthCss: _angular_core.Signal<string | null>;
    readonly buttonsRadiusCss: _angular_core.Signal<string | null>;
    readonly buttonsBorderWidthCss: _angular_core.Signal<string>;
    readonly buttonsBorderColorCss: _angular_core.Signal<string | null>;
    readonly buttonsSeparatorColorCss: _angular_core.Signal<string | null>;
    readonly buttonsStripBackgroundCss: _angular_core.Signal<string>;
    readonly selectorBackgroundCss: _angular_core.Signal<string | null>;
    readonly selectorTextCss: _angular_core.Signal<string | null>;
    readonly selectorFontFamilyCss: _angular_core.Signal<string | null>;
    readonly selectorFontSizeCss: _angular_core.Signal<string | null>;
    readonly selectorFontWeightCss: _angular_core.Signal<string | null>;
    readonly selectorPaddingCss: _angular_core.Signal<string | null>;
    readonly selectorHoverBackgroundCss: _angular_core.Signal<string | null>;
    readonly selectorHoverTextCss: _angular_core.Signal<string | null>;
    readonly selectorHoverBorderCss: _angular_core.Signal<string | null>;
    readonly selectorSelectedBackgroundCss: _angular_core.Signal<string | null>;
    readonly selectorSelectedTextCss: _angular_core.Signal<string | null>;
    readonly selectorSelectedBorderCss: _angular_core.Signal<string | null>;
    readonly selectorDisabledBackgroundCss: _angular_core.Signal<string | null>;
    readonly selectorDisabledTextCss: _angular_core.Signal<string | null>;
    readonly selectorLoadingBackgroundCss: _angular_core.Signal<string | null>;
    readonly selectorLoadingTextCss: _angular_core.Signal<string | null>;
    readonly selectorFocusOutlineCss: _angular_core.Signal<string | null>;
    readonly methodsLocked: _angular_core.Signal<boolean>;
    /**
     * Slots in exact developer `[methods]` order.
     * Availability filters state only — never reorders.
     */
    readonly methodSlots: _angular_core.Signal<EasyPaymentButtonSlot[]>;
    /**
     * Methods followed by a separator. Unavailable slots are collapsed, so a
     * separator only sits between two visible slots.
     */
    readonly separatorAfter: _angular_core.Signal<ReadonlySet<PaymentMethod>>;
    /** Availability is known and no requested method can be shown. */
    readonly noMethodsAvailable: _angular_core.Signal<boolean>;
    /** One notice above the strip when any mock stand-in is present (not per-button). */
    readonly showDemoModeNotice: _angular_core.Signal<boolean>;
    readonly hasAvailableCard: _angular_core.Signal<boolean>;
    readonly hasAvailablePayPal: _angular_core.Signal<boolean>;
    readonly hasAvailableGooglePay: _angular_core.Signal<boolean>;
    readonly hasAvailableApplePay: _angular_core.Signal<boolean>;
    readonly hasAvailableKlarna: _angular_core.Signal<boolean>;
    readonly hasAvailableAffirm: _angular_core.Signal<boolean>;
    readonly selectedCardEntry: _angular_core.Signal<AvailablePaymentMethod | null>;
    readonly showStripeCardPanel: _angular_core.Signal<boolean>;
    readonly showMockCardPanel: _angular_core.Signal<boolean>;
    readonly selectedKlarnaEntry: _angular_core.Signal<AvailablePaymentMethod | null>;
    readonly showKlarnaPanel: _angular_core.Signal<boolean>;
    readonly showMockKlarnaPanel: _angular_core.Signal<boolean>;
    readonly selectedAffirmEntry: _angular_core.Signal<AvailablePaymentMethod | null>;
    readonly showAffirmPanel: _angular_core.Signal<boolean>;
    readonly showMockAffirmPanel: _angular_core.Signal<boolean>;
    /**
     * True when at least one configured method is still loading (placeholder, not unavailable).
     */
    readonly foundationOnly: _angular_core.Signal<boolean>;
    constructor();
    /** Merchant-owned mode hides library Card / Klarna / Affirm triggers. Wallets stay visible. */
    merchantOwnsSelector(slot: EasyPaymentButtonSlot): boolean;
    /**
     * Custom disabled/loading fills apply only when the merchant set them.
     * Otherwise the default selected fill and opacity stay in place.
     */
    selectorStateBackground(method: PaymentMethod): string | null;
    selectorStateColor(method: PaymentMethod): string | null;
    slotAriaLabel(slot: EasyPaymentButtonSlot): string;
    /**
     * Merchant-owned trigger for Card, Klarna, and Affirm.
     * Runs only when the host application calls it from a user action.
     * PayPal, Google Pay, and Apple Pay are refused: those methods stay on official SDK buttons.
     */
    requestPayment(method: PaymentMethod): void;
    /** True when a merchant click may call {@link requestPayment} for this method. */
    canRequestPayment(method: PaymentMethod): boolean;
    selectMethod(method: PaymentMethod): void;
    onCardStarted(): void;
    onCardBusy(busy: boolean): void;
    onCardSuccess(result: PaymentResult): void;
    onCardCancel(result: PaymentResult): void;
    onCardError(error: PaymentError): void;
    onKlarnaStarted(): void;
    onKlarnaBusy(busy: boolean): void;
    onKlarnaSuccess(result: PaymentResult): void;
    onKlarnaCancel(result: PaymentResult): void;
    onKlarnaError(error: PaymentError): void;
    onAffirmStarted(): void;
    onAffirmBusy(busy: boolean): void;
    onAffirmSuccess(result: PaymentResult): void;
    onAffirmCancel(result: PaymentResult): void;
    onAffirmError(error: PaymentError): void;
    /**
     * Official PayPal has no separate selector — engaging the SDK (order create)
     * selects PayPal for methodChange, then emits started.
     */
    onPayPalStarted(): void;
    onPayPalBusy(busy: boolean): void;
    onPayPalSuccess(result: PaymentResult): void;
    onPayPalCancel(result: PaymentResult): void;
    onPayPalError(error: PaymentError): void;
    /**
     * Official Google Pay has no separate selector — buyer click selects the method
     * for methodChange, then emits started.
     */
    onGooglePayStarted(): void;
    onGooglePayBusy(busy: boolean): void;
    onGooglePaySuccess(result: PaymentResult): void;
    onGooglePayCancel(result: PaymentResult): void;
    onGooglePayError(error: PaymentError): void;
    /**
     * Official Apple Pay has no separate selector — wallet confirm selects the method
     * for methodChange, then emits started (not on ECE mount / ready).
     */
    onApplePayStarted(): void;
    onApplePayBusy(busy: boolean): void;
    onApplePaySuccess(result: PaymentResult): void;
    onApplePayCancel(result: PaymentResult): void;
    onApplePayError(error: PaymentError): void;
    onMockCardPay(): Promise<void>;
    onMockKlarnaPay(): Promise<void>;
    onMockAffirmPay(): Promise<void>;
    onMockPayPalPay(): Promise<void>;
    onMockGooglePayPay(): Promise<void>;
    onMockApplePayPay(): Promise<void>;
    private resolveSlotKind;
    private claimStripeReturnOnce;
    /** Another host owns the return (or it was unattributable): resume a normal, idle list. */
    private releaseStripeReturn;
    /**
     * Library-owned Stripe BNPL redirect recovery (Klarna / Affirm).
     * Always leaves busy for a terminal success / cancel / error. Idempotent per host.
     * Does not emit `started` — confirmation already happened before redirect.
     */
    private recoverStripeReturn;
    private runMockPayment;
    private onPaymentStarted;
    private updateSelectedMethod;
    private acceptTerminalEvent;
    private handleSuccess;
    /** Asynchronous pending PaymentIntent — lock retry; do not emit success or error. */
    private handlePending;
    private handleCancelled;
    private handlePaymentError;
    /**
     * Payment Element panels are shown for `element` / `auto` fallback only.
     * `direct` never mounts PE (config error or one-click Direct).
     */
    private shouldShowBnplElementPanel;
    /**
     * Klarna/Affirm selector click: Direct, PE fallback, or configuration error.
     * @returns true when the click was fully handled (caller must not open PE).
     */
    private beginBnplSelectorClick;
    private emitBnplDirectConfigurationError;
    private runBnplDirectPayment;
    private resolveBnplPreferredLocale;
    private refreshInstanceAvailability;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<EasyPaymentButtonsComponent, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<EasyPaymentButtonsComponent, "easy-payment-buttons", never, { "product": { "alias": "product"; "required": true; "isSignal": true; }; "methods": { "alias": "methods"; "required": false; "isSignal": true; }; "checkout": { "alias": "checkout"; "required": false; "isSignal": true; }; "checkoutInstanceId": { "alias": "checkoutInstanceId"; "required": false; "isSignal": true; }; "layout": { "alias": "layout"; "required": false; "isSignal": true; }; "theme": { "alias": "theme"; "required": false; "isSignal": true; }; "locale": { "alias": "locale"; "required": false; "isSignal": true; }; "translations": { "alias": "translations"; "required": false; "isSignal": true; }; "visualStyle": { "alias": "visualStyle"; "required": false; "isSignal": true; }; "buttonsAppearance": { "alias": "buttonsAppearance"; "required": false; "isSignal": true; }; "cardButtonAppearance": { "alias": "cardButtonAppearance"; "required": false; "isSignal": true; }; "bnplConfirmMode": { "alias": "bnplConfirmMode"; "required": false; "isSignal": true; }; "selectorVisibility": { "alias": "selectorVisibility"; "required": false; "isSignal": true; }; }, { "started": "started"; "methodChange": "methodChange"; "success": "success"; "cancel": "cancel"; "error": "error"; "pending": "pending"; }, never, never, true, never>;
}

/**
 * Host-bound CSS custom properties for the Stripe Card CTA.
 * `null` means “do not set inline” so theme `--ep-cta-*` defaults remain.
 */
interface CardButtonAppearanceCssVars {
    backgroundColor: string | null;
    textColor: string | null;
    fontFamily: string | null;
    fontSize: string | null;
    fontWeight: string | null;
    textAlign: string | null;
    borderWidth: string | null;
    borderStyle: string | null;
    borderColor: string | null;
    borderRadius: string | null;
    minHeight: string | null;
    width: string | null;
    padding: string | null;
    hoverBackgroundColor: string | null;
    hoverTextColor: string | null;
    disabledBackgroundColor: string | null;
    disabledTextColor: string | null;
    loadingBackgroundColor: string | null;
    loadingTextColor: string | null;
    focusOutlineColor: string | null;
    focusOutlineWidth: string | null;
    focusOutlineOffset: string | null;
}
interface ResolvedCardButtonAppearance {
    /** Sanitized plain-text label override, or `null` to keep localized default. */
    label: string | null;
    cssVars: CardButtonAppearanceCssVars;
}
/**
 * Map optional {@link EasyPaymentsCardButtonAppearance} to a sanitized label
 * and host CSS variable overrides. Invalid fields are ignored.
 */
declare function resolveCardButtonAppearance(appearance: EasyPaymentsCardButtonAppearance | null | undefined): ResolvedCardButtonAppearance;

interface StripeProviderConfig {
    /**
     * Stripe publishable key only (pk_test_... / pk_live_...).
     * Never put a secret key (sk_...) here.
     */
    publishableKey: string;
}
interface PayPalProviderConfig {
    clientId: string;
    currency?: string;
    intent?: 'capture' | 'authorize';
}
/**
 * Apple Pay via Stripe (Express Checkout Element).
 * Opt in with `providers.applePay: {}` (or with optional display fields).
 * No Apple Merchant ID / certificates in Angular — Stripe registers domains
 * and handles merchant validation. Requires Stripe publishableKey + createPaymentUrl.
 */
interface ApplePayProviderConfig {
    /** Display name shown in the Apple Pay sheet (optional). */
    merchantName?: string;
    /** ISO 3166-1 alpha-2 country for Payment Request / wallet (default US). */
    countryCode?: string;
    /**
     * @deprecated Not used for Stripe Apple Pay. Stripe creates/manages the Merchant ID.
     * Kept optional for backward compatibility; ignored at runtime.
     */
    merchantId?: string;
}
interface GooglePayProviderConfig {
    /**
     * Google Pay merchant ID from Google Pay & Wallet Console.
     * Optional in TEST (Easy Payments defaults to Google's documented TEST merchantId).
     * Required for PRODUCTION.
     */
    merchantId?: string;
    /** User-visible merchant name shown in the Google Pay sheet. */
    merchantName?: string;
    /** Defaults to TEST. Do not use PRODUCTION until merchant approval is complete. */
    environment?: 'TEST' | 'PRODUCTION';
    /** ISO 3166-1 alpha-2 country for transactionInfo (default US). */
    countryCode?: string;
}
interface KlarnaProviderConfig {
    /** ISO country for Klarna purchase context (default US). */
    purchaseCountry?: string;
    /** Locale hint for Klarna/Stripe (default en-US). */
    locale?: string;
}
interface AffirmProviderConfig {
    /** ISO country for Affirm purchase context (default US). */
    purchaseCountry?: string;
    /** Locale hint for Affirm/Stripe. */
    locale?: string;
}
interface EasyPaymentsBackendConfig {
    /**
     * Optional origin or origin + path prefix for relative backend endpoints.
     * Example: `https://api.example.com` or `https://api.example.com/v1`.
     * Omitted baseUrl leaves each endpoint unchanged. Absolute http(s) endpoints
     * are used as-is. `javascript:`, `data:`, and protocol-relative URLs are rejected.
     */
    baseUrl?: string;
    /** Merchant endpoint that creates a Stripe PaymentIntent and returns clientSecret. */
    createPaymentUrl?: string;
    /**
     * PayPal Orders API: create order (returns { provider: 'paypal', orderId }).
     * Required for real PayPal checkout.
     */
    paypalCreateOrderUrl?: string;
    /**
     * PayPal Orders API: capture approved order
     * (returns { provider: 'paypal', orderId, captureId, status? }).
     * Required for real PayPal checkout.
     */
    paypalCaptureOrderUrl?: string;
    /** Creates a Klarna-only Stripe PaymentIntent. Returns clientSecret. */
    klarnaCreatePaymentUrl?: string;
    /** Creates an Affirm-only Stripe PaymentIntent. Returns clientSecret. */
    affirmCreatePaymentUrl?: string;
    /**
     * Optional. Not required for the standard Stripe Payment Element + PaymentIntent flow.
     * Reserved for future provider flows that need an explicit server confirm step.
     */
    confirmPaymentUrl?: string;
}
interface EasyPaymentsProviderConfig {
    stripe?: StripeProviderConfig;
    paypal?: PayPalProviderConfig;
    applePay?: ApplePayProviderConfig;
    googlePay?: GooglePayProviderConfig;
    klarna?: KlarnaProviderConfig;
    affirm?: AffirmProviderConfig;
}
interface EasyPaymentsConfig {
    providers: EasyPaymentsProviderConfig;
    backend?: EasyPaymentsBackendConfig;
    /**
     * When true, every provider uses a mock adapter.
     * Mock mode never processes a real payment and must not be used in production.
     */
    enableMockMode?: boolean;
}
type ProviderConfigStatus = 'configured' | 'missing' | 'invalid' | 'not_requested';
interface ProviderValidationResult {
    provider: keyof EasyPaymentsProviderConfig;
    status: ProviderConfigStatus;
    message?: string;
}

declare function provideEasyPayments(config: EasyPaymentsConfig): EnvironmentProviders;

/**
 * Mutable runtime config so demos (and hosts) can switch mock ↔ real Stripe
 * without rebuilding the injector tree.
 */
declare class EasyPaymentsConfigService {
    private config;
    constructor();
    getSnapshot(): EasyPaymentsConfig;
    update(partial: Partial<EasyPaymentsConfig>): EasyPaymentsConfig;
    replace(config: EasyPaymentsConfig): EasyPaymentsConfig;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<EasyPaymentsConfigService, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<EasyPaymentsConfigService>;
}

/** BNPL methods that may use Direct confirmation in a future Buttons Only milestone. */
type BnplDirectProvider = 'klarna' | 'affirm';
type BnplSelectedFlow = 'direct' | 'element' | 'configuration-error';
/**
 * Stable machine-readable readiness codes. Values never include customer PII.
 */
type BnplReadinessReasonCode = 'mode_element' | 'missing_email' | 'missing_name' | 'missing_billing_address' | 'incomplete_billing_address' | 'invalid_billing_country' | 'missing_shipping_name' | 'missing_shipping_address' | 'incomplete_shipping_address' | 'invalid_shipping_country' | 'direct_not_ready' | 'ready';
/**
 * Field paths describing what is missing or invalid (not the field values).
 * Example: `customer.email`, `customer.address.country`.
 */
type BnplReadinessFieldPath = string;
interface BnplReadinessResult {
    /** True when library Direct readiness policy is satisfied for the provider. */
    ready: boolean;
    /**
     * Flow Buttons Only selects for the given mode when `[bnplConfirmMode]` is set.
     * Full Checkout and Headless ignore this helper for payment execution.
     */
    selectedFlow: BnplSelectedFlow;
    missingFields: BnplReadinessFieldPath[];
    reasonCodes: BnplReadinessReasonCode[];
}
interface EvaluateBnplDirectReadinessInput {
    provider: BnplDirectProvider;
    /** Defaults to `auto` when omitted / null / undefined. */
    mode?: BnplConfirmMode | null;
    checkout?: CheckoutOptions | null;
}
/**
 * Evaluates Easy Payments library UX readiness for Klarna/Affirm Direct confirmation.
 *
 * This is **not** a network call and does not create or confirm PaymentIntents.
 * It does not mutate `checkout`.
 *
 * Library policy (stricter than / distinct from Stripe API minimums):
 * - Klarna: email + name; shipping name+address when `shipping.required`.
 * - Affirm: email + name + complete billing address; shipping when required.
 */
declare function evaluateBnplDirectReadiness(input: EvaluateBnplDirectReadinessInput): BnplReadinessResult;

/**
 * Checkout width limits for the embeddable <easy-payments> component.
 *
 * Consumers control overall checkout size via [maxWidth].
 * The library clamps to these bounds and decides internal grid columns
 * from the component's own container width (not the viewport).
 */
declare const MIN_CHECKOUT_WIDTH = 320;
declare const DEFAULT_CHECKOUT_MAX_WIDTH = 640;
declare const MAX_CHECKOUT_WIDTH = 1200;
/**
 * Normalize a consumer [maxWidth] value into a safe pixel max-width.
 * Invalid / missing values fall back to the default.
 */
declare function resolveCheckoutMaxWidth(value: number | string | null | undefined): number;

type MockPaymentOutcome = 'success' | 'cancelled' | 'failed';
/**
 * Controls mock/demo payment behavior.
 *
 * Mock adapters implement the same PaymentProviderAdapter contract as real
 * providers. This controller never processes a real payment.
 */
declare class MockPaymentController {
    private readonly _outcome;
    private readonly _unavailableMethods;
    private readonly _delayMs;
    readonly outcome: _angular_core.Signal<MockPaymentOutcome>;
    readonly unavailableMethods: _angular_core.Signal<ReadonlySet<PaymentMethod>>;
    readonly delayMs: _angular_core.Signal<number>;
    setOutcome(outcome: MockPaymentOutcome): void;
    setUnavailableMethods(methods: readonly PaymentMethod[]): void;
    setDelay(ms: number): void;
    isMethodAvailable(method: PaymentMethod): boolean;
    reset(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<MockPaymentController, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<MockPaymentController>;
}

/**
 * Generic Stripe BNPL / redirect return helpers (Klarna, Affirm, …).
 *
 * Stripe appends `payment_intent` and `payment_intent_client_secret` to return_url.
 * We stamp `ep_method=<method>` and a light sessionStorage marker (no secrets)
 * so Easy Payments can resume the correct method after the page remounts.
 *
 * Host kinds:
 * - `checkout` / `buttons` — Full Checkout and Buttons Only (existing)
 * - `headless` — Headless Klarna/Affirm (H4.2 ownership; public recovery is H4.3)
 */

type StripeRedirectMethod = 'klarna' | 'affirm';
/**
 * Detect which Stripe redirect method (if any) is returning.
 * Prefers explicit `ep_method`; falls back to pending session marker.
 */
declare function detectStripeReturnMethod(search?: string, storage?: Storage): StripeRedirectMethod | null;
/**
 * True when the URL/session indicates a Stripe redirect return for the given method
 * (or any supported method when method is omitted).
 */
declare function isStripeReturnAttempt(method?: StripeRedirectMethod, search?: string, storage?: Storage): boolean;

/**
 * Klarna-specific wrappers around the shared Stripe redirect return helpers.
 * Prefer importing from `../stripe/stripe-redirect-return` for new BNPL methods.
 */

declare function isKlarnaReturnAttempt(search?: string, storage?: Storage): boolean;
declare function isKlarnaStripeReturn(search?: string, storage?: Storage): boolean;
/** Any Stripe BNPL return (Klarna or Affirm) — used by demo mode bootstrap. */
declare function isAnyStripeBnplReturnAttempt(search?: string, storage?: Storage): boolean;

declare class EasyPaymentsConfigValidator {
    private readonly configService;
    private get config();
    validateProvider(provider: keyof EasyPaymentsProviderConfig, providerConfig: EasyPaymentsProviderConfig[keyof EasyPaymentsProviderConfig] | undefined): ProviderValidationResult;
    validateAll(methods?: PaymentMethod[], config?: EasyPaymentsConfig | null): ProviderValidationResult[];
    /**
     * Human-readable status lines. Never includes secret values such as keys.
     */
    getStatusSummary(methods?: PaymentMethod[], config?: EasyPaymentsConfig | null): string[];
    formatStatusLine(result: ProviderValidationResult, mockMode?: boolean): string;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<EasyPaymentsConfigValidator, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<EasyPaymentsConfigValidator>;
}

interface ProductValidationResult {
    valid: boolean;
    errors: string[];
}
declare function validatePaymentProduct(product: unknown): ProductValidationResult;

/**
 * Flat merchant metadata supplied on `PaymentProduct.metadata`.
 * This is not `PaymentResult.metadata`.
 */
type EasyPaymentsMerchantMetadata = Record<string, string>;
declare const MERCHANT_METADATA_LIMITS: {
    readonly maxEntries: 10;
    readonly maxKeyLength: 40;
    readonly maxValueLength: 500;
};
/** PayPal `custom_id` limit. Only `orderId` is mapped, and it is never truncated. */
declare const PAYPAL_ORDER_REFERENCE_MAX_LENGTH = 127;
declare const PAYPAL_ORDER_REFERENCE_KEY = "orderId";
/**
 * Keys the browser must not set. Server-owned payment fields are written
 * after merchant metadata and always win if a caller bypasses this list.
 * Keep this list identical to `server/src/metadata/merchant-metadata.ts`.
 */
declare const MERCHANT_METADATA_RESERVED_KEYS: readonly ["amount", "authorization", "cardnumber", "catalogunitamount", "clientsecret", "constructor", "currency", "cvc", "cvv", "pan", "password", "paymentmethod", "productid", "prototype", "provider", "quantity", "secret", "secretkey", "source", "token", "trustedunitamount", "unitamount", "__proto__"];
interface MerchantMetadataValidationResult {
    valid: boolean;
    errors: string[];
    metadata?: EasyPaymentsMerchantMetadata;
}
declare function validateMerchantMetadata(metadata: unknown): MerchantMetadataValidationResult;

/**
 * Stable diagnostic codes Easy Payments may attach to a method snapshot.
 * `BACKEND_BASE_URL_INVALID` and `BACKEND_ENDPOINT_INVALID` are also emitted as
 * development-console warnings. Availability currently reports the affected
 * method as `PROVIDER_MISCONFIGURED` and does not include the raw URL.
 */
declare const EASY_PAYMENTS_DIAGNOSTIC_CODES: readonly ["PROVIDER_AVAILABILITY_PENDING", "PROVIDER_UNAVAILABLE", "PROVIDER_MISCONFIGURED", "PROVIDER_NOT_CONFIGURED", "STRIPE_INITIALIZATION_FAILED", "CONFIG_MISSING", "CONFIG_INVALID", "SDK_LOAD_FAILED", "BACKEND_ERROR", "BACKEND_BASE_URL_INVALID", "BACKEND_ENDPOINT_INVALID", "PROVIDER_NOT_IMPLEMENTED", "NETWORK_ERROR", "AUTHENTICATION_REQUIRED", "AUTHENTICATION_FAILED", "PRODUCT_INVALID", "PAYMENT_FAILED", "CARD_DECLINED", "PAYMENT_CANCELLED", "UNKNOWN"];
/** Machine-readable diagnostic code. Values in this union are stable. */
type EasyPaymentsDiagnosticCode = (typeof EASY_PAYMENTS_DIAGNOSTIC_CODES)[number];
/**
 * Read-only readiness for one payment method.
 * Messages are fixed developer text. Snapshots never include credentials,
 * client secrets, raw provider errors, or request headers.
 */
interface PaymentMethodDiagnostic {
    readonly method: PaymentMethod;
    readonly provider: PaymentProviderName;
    readonly readiness: MethodReadinessState;
    readonly code?: EasyPaymentsDiagnosticCode;
    readonly message: string;
    readonly mock: boolean;
}
/**
 * Immutable view of checkout readiness.
 * `published` is false until `PaymentOrchestratorService.refreshAvailability`
 * completes, and false again after `reinitialize()` until the next refresh.
 * An empty method list before publication is not a ready checkout.
 *
 * This snapshot is **global / last-refresh**: it mirrors the root orchestrator,
 * not a specific `<easy-payments>` instance. Concurrent checkouts keep
 * independent tile visibility via per-instance availability sessions; inject
 * diagnostics for app-wide developer readiness, not per-host UI state.
 */
interface EasyPaymentsDiagnosticsSnapshot {
    readonly published: boolean;
    readonly methods: readonly PaymentMethodDiagnostic[];
}
/**
 * Public, read-only view of payment-method readiness.
 *
 * Projects the root `PaymentOrchestratorService` availability snapshot (the
 * latest `refreshAvailability` call in the app). It does not calculate a
 * second readiness result, poll, or read browser globals. Per-checkout tile
 * visibility is owned by each component's local availability session and may
 * differ from this global projection when multiple hosts are mounted.
 */
declare class EasyPaymentsDiagnosticsService {
    private readonly orchestrator;
    /** Updates when availability is published or cleared. */
    readonly diagnostics: Signal<EasyPaymentsDiagnosticsSnapshot>;
    /** Frozen copy of the current snapshot. */
    snapshot(): EasyPaymentsDiagnosticsSnapshot;
    /** Frozen copy of one method, or undefined when that method is not in the snapshot. */
    method(method: PaymentMethod): PaymentMethodDiagnostic | undefined;
    private projectSnapshot;
    private toDiagnostic;
    private readinessOf;
    private knownCode;
    private messageFor;
    private cloneDiagnostic;
    private freezeSnapshot;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<EasyPaymentsDiagnosticsService, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<EasyPaymentsDiagnosticsService>;
}

interface PaymentProviderAdapter {
    readonly provider: PaymentProviderName;
    readonly isMock: boolean;
    initialize(): Promise<void>;
    isAvailable(context: PaymentContext): Promise<boolean>;
    createPayment(request: PaymentRequest): Promise<PaymentResult>;
    destroy?(): Promise<void> | void;
}

declare abstract class BaseProviderAdapter implements PaymentProviderAdapter {
    abstract readonly provider: PaymentProviderName;
    readonly isMock = false;
    protected initialized: boolean;
    abstract initialize(): Promise<void>;
    abstract isAvailable(context: PaymentContext): Promise<boolean>;
    abstract createPayment(request: PaymentRequest): Promise<PaymentResult>;
    protected ensureInitialized(): void;
}

/**
 * Production Apple Pay availability — decided only by the mounted Express Checkout
 * Element `ready` event (never by a hidden probe, timeout, UA sniffing, OS checks,
 * or ApplePaySession).
 *
 * - `idle` / `checking` = UNKNOWN (must not expose Apple Pay in the method list)
 * - `available` = Stripe reported applePay:true for the current session
 * - `unavailable` / `error` = Stripe reported applePay:false or load failure
 */
type ApplePayAvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable' | 'error' | 'indeterminate';

declare class ApplePayAdapter extends BaseProviderAdapter {
    readonly provider: "applePay";
    private readonly configService;
    private readonly backend;
    private readonly browser;
    private readonly stripeSdk;
    private readonly gate;
    private stripe;
    private configReady;
    private readonly configReadySignal;
    /** Mounts with a wallet confirm in flight. Page-level exclusivity comes from the gate. */
    private readonly processingMounts;
    /**
     * Ownership-scoped ECE mounts.
     * Omit `mountId` on mount/unmount to use {@link LEGACY_SINGLETON_MOUNT_ID}
     * (Ready-to-Use Checkout single-host remount path).
     */
    private readonly mounts;
    private nextMountSeq;
    static readonly LEGACY_SINGLETON_MOUNT_ID = "apple-pay-ece-legacy";
    /** Most recent state change (any session) — legacy no-arg `getAvailabilityStatus()`. */
    private availabilityState;
    private availabilitySessionKey;
    /** ECE-decided availability per checkout session (product render key). */
    private readonly availabilityBySession;
    private readyFired;
    private lastAvailablePaymentMethods;
    private availabilityListener;
    private readonly availabilityListeners;
    private abortedMounts;
    isConfigured(): boolean;
    /** Reactive config readiness for Apple Pay bootstrap mounting. */
    readonly configured: _angular_core.Signal<boolean>;
    /**
     * Availability for `product`'s checkout session, or the most recent state
     * change when omitted (legacy single-host behaviour).
     */
    getAvailabilityStatus(product?: PaymentProduct): ApplePayAvailabilityState;
    /**
     * Optional UI hook — fired when production availability state changes
     * (e.g. after ECE `ready`). Use to call orchestrator.refreshAvailability.
     * Single legacy slot; prefer {@link addAvailabilityListener} for multi-host pages.
     */
    setAvailabilityListener(listener: ((state: ApplePayAvailabilityState) => void) | null): void;
    /** Per-host availability listener. Returns a function that removes only this listener. */
    addAvailabilityListener(listener: (state: ApplePayAvailabilityState) => void): () => void;
    /**
     * Validates Apple Pay + Stripe gateway prerequisites.
     * Does not load Stripe.js until availability or mount.
     */
    initialize(): Promise<void>;
    /**
     * Production availability from the mounted ECE `ready` event only.
     *
     * Rules:
     * - UNKNOWN (`idle` / `checking`) is never treated as available.
     * - Returns true only when Stripe reported `availablePaymentMethods.applePay`
     *   for the **current** product session key.
     * - Never uses UA sniffing, OS checks, ApplePaySession, or hidden probes.
     * - Windows / Chrome / third-party browsers are allowed when Stripe says so
     *   (including Apple Pay on the Web cross-device flows).
     */
    isAvailable(context: PaymentContext): Promise<boolean>;
    createPayment(_request: PaymentRequest): Promise<PaymentResult>;
    ensureStripeLoaded(): Promise<Stripe>;
    /** Allocates a unique ECE mount id for Payment Buttons / multi-host ownership. */
    createMountId(): string;
    /** Active ownership-scoped ECE mounts (test / diagnostics). */
    getActiveEceMountCount(): number;
    /**
     * Mounts Stripe Express Checkout Element with Apple Pay only.
     * Availability is decided by the `ready` event.
     * PaymentIntent is created only on confirm (not on mount).
     *
     * @param mountId Ownership token. Omit to use the legacy singleton id
     *   (Ready-to-Use Checkout). Pass an explicit id for multi-host isolation.
     * @returns The mount id to pass to {@link unmountExpressCheckout}.
     */
    mountExpressCheckout(host: HTMLElement, options: {
        product: PaymentProduct;
        checkout?: CheckoutOptions;
        theme: ResolvedPaymentTheme;
        /** Stripe Elements locale (Easy Payments chrome is localized separately). */
        locale?: string;
        onSuccess: (result: PaymentResult) => void;
        onCancel: () => void;
        onError: (error: PaymentError) => void;
        /** Wallet confirm began. Not fired for ready, unavailable, or a duplicate confirm. */
        onAttempt?: () => void;
        onReady?: () => void;
        onUnavailable?: () => void;
        onAvailabilityChange?: (state: ApplePayAvailabilityState) => void;
    }, mountId?: string): Promise<string>;
    /**
     * Unmounts one ECE mount (default: legacy singleton) or clears handlers for that host.
     * Does not tear down sibling mounts when `mountId` is provided.
     */
    unmountExpressCheckout(options?: {
        preserveAvailability?: boolean;
        mountId?: string;
    }): void;
    /**
     * Clears ECE-driven availability (e.g. merchant removed `apple-pay` from methods,
     * or a brand-new checkout session must not inherit a previous ready result).
     */
    clearAvailability(product?: PaymentProduct): void;
    /** True while `mountId` (or, when omitted, any mount) has a wallet confirm in flight. */
    isProcessing(mountId?: string): boolean;
    private teardownMount;
    private setAvailabilityState;
    private confirmExpressCheckout;
    private createPaymentSession;
    destroy(): Promise<void>;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<ApplePayAdapter, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<ApplePayAdapter>;
}

/**
 * Public Headless Checkout session lifecycle.
 *
 * H2: `idle → initializing → ready | error → destroyed`.
 * H3.1–H3.4 (Card / Klarna / Affirm / PayPal / Google Pay): `ready → processing → success | pending | cancelled | error`.
 */
type HeadlessSessionState = 'idle' | 'initializing' | 'ready' | 'processing' | 'pending' | 'success' | 'cancelled' | 'error' | 'destroyed';
/**
 * Handle returned by {@link HeadlessCheckoutSession.mount}.
 * `unmount()` is idempotent and does not destroy the Headless session.
 */
interface HeadlessMountHandle {
    readonly method: PaymentMethod;
    unmount(): Promise<void> | void;
}
/**
 * How the merchant interacts with a Headless method after mount.
 * - `confirm` — merchant CTA calls {@link HeadlessCheckoutSession.confirm}
 * - `wallet-button` / `paypal-buttons` — official SDK button starts payment
 * - `mock` — mock adapters when `enableMockMode` is on
 */
type HeadlessMethodInteraction = 'confirm' | 'wallet-button' | 'paypal-buttons' | 'mock';
/**
 * Options for {@link EasyPaymentsHeadless.createSession}.
 *
 * `locale` is passed into provider availability / Stripe Elements context.
 * `translations` are accepted for forward compatibility; Headless does not own
 * a localized chrome surface (merchants own layout copy).
 * `theme` affects Stripe appearance context; it does not mutate the shared root
 * {@link ThemeService}.
 */
interface HeadlessSessionOptions {
    product: PaymentProduct;
    /** Allow-list and preferred order. Duplicates and unknown values are rejected. */
    methods: PaymentMethod[];
    checkout?: CheckoutOptions;
    /**
     * Optional stable session id. Required for Klarna/Affirm redirect ownership (H4.2):
     * merchant must supply a value reusable after page reload. Auto-generated ids are
     * fine for Card / PayPal / Google Pay / Apple Pay but cannot own BNPL redirects.
     * Must match `^[a-zA-Z0-9_.:-]{1,64}$` when provided.
     * Must be unique among live Headless sessions.
     */
    checkoutInstanceId?: string | null;
    locale?: EasyPaymentsLocale;
    translations?: EasyPaymentsTranslationOverrides;
    theme?: PaymentTheme;
}
interface HeadlessMethodStatus {
    method: PaymentMethod;
    provider: PaymentProviderName;
    readiness: MethodReadinessState;
    available: boolean;
    diagnosticCode?: string;
    /**
     * Always true for real interactive methods in Easy Payments.
     * Merchants must call {@link HeadlessCheckoutSession.mount} before paying.
     */
    requiresMount: boolean;
    interaction: HeadlessMethodInteraction;
    /** True when the registered adapter is a mock (enableMockMode). */
    mock: boolean;
    /**
     * Present when readiness cannot be finalized without a mounted provider surface
     * (notably Apple Pay Express Checkout Element `ready`).
     */
    readinessNote?: string;
}
interface HeadlessCheckoutEvents {
    /** Emitted when a payment attempt begins (Card/BNPL confirm, PayPal createOrder, or Google Pay click). */
    readonly started: Observable<PaymentStartedEvent>;
    /** Emitted when {@link HeadlessCheckoutSession.selectMethod} changes selection. */
    readonly methodChange: Observable<PaymentMethodChangeEvent>;
    /** Emitted when a payment is still processing (not success; await backend/webhooks). */
    readonly pending: Observable<PaymentResult>;
    /** Emitted after a verified provider success result for the current attempt. */
    readonly success: Observable<PaymentResult>;
    /** Emitted when the buyer cancels (or the provider reports cancelled). */
    readonly cancel: Observable<PaymentResult>;
    /** Emitted for session or payment failures. */
    readonly error: Observable<PaymentError>;
}
/**
 * Public Headless Checkout session.
 *
 * Supports Card / Klarna / Affirm (Payment Element + `confirm()`), PayPal Buttons,
 * Google Pay, and Apple Pay Express Checkout. Klarna/Affirm leave-page returns use
 * {@link HeadlessCheckoutSession.recoverReturn} with a stable `checkoutInstanceId`.
 */
interface HeadlessCheckoutSession {
    readonly id: string;
    readonly state: Signal<HeadlessSessionState>;
    readonly selectedMethod: Signal<PaymentMethod | null>;
    readonly availableMethods: Signal<readonly HeadlessMethodStatus[]>;
    readonly lastError: Signal<PaymentError | null>;
    /** Latest payment result for this session, if any. */
    readonly lastResult: Signal<PaymentResult | null>;
    readonly events: HeadlessCheckoutEvents;
    initialize(): Promise<void>;
    refreshAvailability(): Promise<readonly HeadlessMethodStatus[]>;
    selectMethod(method: PaymentMethod | null): void;
    /**
     * Mount official provider UI into a merchant-owned container.
     * Supports `card`, `klarna`, `affirm`, `paypal`, `google-pay`, and `apple-pay`.
     */
    mount(method: PaymentMethod, container: HTMLElement): Promise<HeadlessMountHandle>;
    /**
     * Confirm the selected Stripe method (`card` | `klarna` | `affirm`) with an active mount.
     * Rejects for PayPal, Google Pay, and Apple Pay — their official controls own the payment gesture.
     */
    confirm(): Promise<void>;
    /**
     * Recover a Klarna/Affirm Stripe redirect return for this session's stable
     * `checkoutInstanceId` via the shared recovery service (no remount / no reconfirm).
     *
     * @returns Normalized {@link PaymentResult} when this session owns the return;
     * `null` when there is no applicable return for this session (unrelated / absent).
     * Rejects with {@link PaymentError} for owned returns that fail verification.
     */
    recoverReturn(): Promise<PaymentResult | null>;
    destroy(): Promise<void>;
}

/**
 * Public factory for Headless Checkout sessions (v1.2.0).
 *
 * H3.1: Stripe Card mount/confirm.
 * H3.2: Klarna + Affirm mount/confirm via existing Stripe Payment Element adapters.
 * H3.3: PayPal official Buttons (create/capture via backend; no session.confirm()).
 * H3.4: Google Pay official button (Stripe gateway; no session.confirm()).
 * H3.5: Apple Pay via Stripe Express Checkout Element (no session.confirm()).
 * H4.2: Headless Klarna/Affirm pending ownership markers.
 * H4.3: {@link HeadlessCheckoutSession.recoverReturn} via shared StripeRedirectRecoveryService.
 */
declare class EasyPaymentsHeadless {
    private readonly orchestrator;
    private readonly registry;
    private readonly browser;
    private readonly config;
    private readonly stripeCard;
    private readonly klarna;
    private readonly affirm;
    private readonly paypal;
    private readonly googlePay;
    private readonly applePay;
    private readonly stripeRedirectRecovery;
    createSession(options: HeadlessSessionOptions): HeadlessCheckoutSession;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<EasyPaymentsHeadless, never>;
    static ɵprov: _angular_core.ɵɵInjectableDeclaration<EasyPaymentsHeadless>;
}

export { ApplePayAdapter, DEFAULT_CHECKOUT_MAX_WIDTH, EASY_PAYMENTS_DEFAULT_LOCALE, EASY_PAYMENTS_DIAGNOSTIC_CODES, EASY_PAYMENTS_SUPPORTED_LOCALES, EasyPaymentButtonsComponent, EasyPaymentsComponent, EasyPaymentsConfigService, EasyPaymentsConfigValidator, EasyPaymentsDiagnosticsService, EasyPaymentsHeadless, MAX_CHECKOUT_WIDTH, MERCHANT_METADATA_LIMITS, MERCHANT_METADATA_RESERVED_KEYS, MIN_CHECKOUT_WIDTH, MockPaymentController, PAYMENT_METHOD_LABELS, PAYPAL_ORDER_REFERENCE_KEY, PAYPAL_ORDER_REFERENCE_MAX_LENGTH, PaymentError, PaymentOrchestratorService, detectBrowserLocale, detectStripeReturnMethod, evaluateBnplDirectReadiness, formatTransactionReference, interpolate, isAnyStripeBnplReturnAttempt, isKlarnaReturnAttempt, isKlarnaStripeReturn, isStripeReturnAttempt, localizePaymentError, normalizeError, normalizeLanguageTag, normalizePaymentResult, provideEasyPayments, resolveCardButtonAppearance, resolveCheckoutMaxWidth, resolveEffectiveLocale, resolveMessages, toAffirmCreatePaymentRequest, toAffirmPreferredLocale, toGooglePayButtonLocale, toKlarnaCreatePaymentRequest, toKlarnaPreferredLocale, toPayPalCreateOrderRequest, toPayPalSdkLocale, toStripeBnplLocale, toStripeElementsLocale, validateMerchantMetadata, validatePaymentProduct };
export type { AffirmCreatePaymentRequest, AffirmProviderConfig, ApplePayAvailabilityState, ApplePayProviderConfig, AvailablePaymentMethod, BnplConfirmMode, BnplDirectProvider, BnplReadinessFieldPath, BnplReadinessReasonCode, BnplReadinessResult, BnplSelectedFlow, CapturePayPalOrderResponse, CardButtonAppearanceCssVars, CheckoutCustomerOptions, CheckoutOptions, CheckoutShippingOptions, CheckoutSuccessBehavior, CheckoutViewState, CreateAffirmPaymentResponse, CreateKlarnaPaymentResponse, CreatePayPalOrderResponse, CreatePaymentRequest, CreatePaymentResponse, CreateStripePaymentResponse, EasyPaymentButtonSlot, EasyPaymentButtonSlotKind, EasyPaymentButtonSlotState, EasyPaymentButtonsAppearance, EasyPaymentButtonsLayout, EasyPaymentButtonsSelectorLabels, EasyPaymentButtonsSelectorVisibility, EasyPaymentsAddress, EasyPaymentsAppearance, EasyPaymentsBackendConfig, EasyPaymentsCardButtonAppearance, EasyPaymentsConfig, EasyPaymentsDiagnosticCode, EasyPaymentsDiagnosticsSnapshot, EasyPaymentsLocale, EasyPaymentsMerchantMetadata$1 as EasyPaymentsMerchantMetadata, EasyPaymentsProviderConfig, EasyPaymentsResolvedLocale, EasyPaymentsTranslationKey, EasyPaymentsTranslationOverrides, EasyPaymentsTranslations, EasyPaymentsVisualStyle, EvaluateBnplDirectReadinessInput, GooglePayProviderConfig, HeadlessCheckoutEvents, HeadlessCheckoutSession, HeadlessMethodInteraction, HeadlessMethodStatus, HeadlessMountHandle, HeadlessSessionOptions, HeadlessSessionState, KlarnaCreatePaymentRequest, KlarnaProviderConfig, MerchantMetadataValidationResult, MethodReadinessState, MockPaymentOutcome, PayPalCreateOrderRequest, PayPalProviderConfig, PaymentErrorCode, PaymentMethod, PaymentMethodChangeEvent, PaymentMethodDiagnostic, PaymentProduct, PaymentProviderName, PaymentResult, PaymentStartedEvent, PaymentStatus, PaymentTheme, ProductValidationResult, ProviderConfigStatus, ProviderValidationResult, ResolvedCardButtonAppearance, ResolvedPaymentTheme, StripeProviderConfig, StripeRedirectMethod };
