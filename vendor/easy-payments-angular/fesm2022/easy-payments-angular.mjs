import * as i0 from '@angular/core';
import { isDevMode, signal, InjectionToken, makeEnvironmentProviders, inject, Injectable, PLATFORM_ID, DestroyRef, Injector, computed, input, ChangeDetectionStrategy, Component, output, viewChild, effect, untracked, viewChildren, ElementRef, NgZone, PendingTasks } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { loadStripe } from '@stripe/stripe-js/pure';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';

const PAYMENT_METHOD_PROVIDER_MAP = {
    'apple-pay': 'applePay',
    'google-pay': 'googlePay',
    paypal: 'paypal',
    klarna: 'klarna',
    affirm: 'affirm',
    card: 'stripe',
};
const PAYMENT_METHOD_LABELS = {
    'apple-pay': 'Apple Pay',
    'google-pay': 'Google Pay',
    paypal: 'PayPal',
    klarna: 'Klarna',
    affirm: 'Affirm',
    card: 'Card',
};

function normalizePaymentResult(result) {
    return {
        status: result.status,
        method: result.method,
        provider: result.provider,
        ...(result.transactionId !== undefined ? { transactionId: result.transactionId } : {}),
        ...(result.sessionId !== undefined ? { sessionId: result.sessionId } : {}),
        ...(result.message !== undefined ? { message: result.message } : {}),
        ...(result.metadata !== undefined ? { metadata: { ...result.metadata } } : {}),
    };
}

/**
 * Maps product identity fields into the PayPal create-order HTTP body.
 * Strips amount, metadata, and any other internal fields.
 */
function toPayPalCreateOrderRequest(input) {
    const body = {
        provider: 'paypal',
        productId: input.productId.trim(),
        quantity: input.quantity,
        currency: input.currency.trim().toUpperCase(),
    };
    if (input.orderReference) {
        body.orderReference = input.orderReference;
    }
    return body;
}
/**
 * Maps product identity fields into the Klarna create-payment HTTP body.
 * Strips amount and any fields other than the validated metadata map.
 */
function toKlarnaCreatePaymentRequest(input) {
    const body = {
        provider: 'klarna',
        productId: input.productId.trim(),
        quantity: input.quantity,
        currency: input.currency.trim().toUpperCase(),
    };
    const preferredLocale = input.preferredLocale?.trim();
    if (preferredLocale) {
        body.preferredLocale = preferredLocale;
    }
    if (input.metadata && Object.keys(input.metadata).length > 0) {
        body.metadata = { ...input.metadata };
    }
    return body;
}
/**
 * Maps product identity fields into the Affirm create-payment HTTP body.
 * Strips amount and any fields other than the validated metadata map.
 */
function toAffirmCreatePaymentRequest(input) {
    const body = {
        provider: 'affirm',
        productId: input.productId.trim(),
        quantity: input.quantity,
        currency: input.currency.trim().toUpperCase(),
    };
    const preferredLocale = input.preferredLocale?.trim();
    if (preferredLocale) {
        body.preferredLocale = preferredLocale;
    }
    if (input.metadata && Object.keys(input.metadata).length > 0) {
        body.metadata = { ...input.metadata };
    }
    return body;
}

class PaymentError extends Error {
    code;
    method;
    provider;
    originalError;
    constructor(options) {
        super(options.message);
        this.name = 'PaymentError';
        this.code = options.code;
        this.method = options.method;
        this.provider = options.provider;
        this.originalError = options.originalError;
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            method: this.method,
            provider: this.provider,
        };
    }
}
function normalizeError(error, fallback = {}) {
    if (error instanceof PaymentError) {
        return error;
    }
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('cancel')) {
            return new PaymentError({
                code: 'PAYMENT_CANCELLED',
                message: error.message,
                method: fallback.method,
                provider: fallback.provider,
                originalError: error,
            });
        }
        return new PaymentError({
            code: 'PAYMENT_FAILED',
            message: error.message,
            method: fallback.method,
            provider: fallback.provider,
            originalError: error,
        });
    }
    return new PaymentError({
        code: 'UNKNOWN',
        message: 'An unexpected payment error occurred.',
        method: fallback.method,
        provider: fallback.provider,
        originalError: error,
    });
}

const warned = new Set();
/**
 * Redact secrets and credential-bearing URLs before any developer diagnostic output.
 */
function sanitizeDiagnosticText(value) {
    if (!value) {
        return '';
    }
    return value
        .replace(/\b(sk|pk|rk)_(test|live)_[A-Za-z0-9]+/gi, '$1_$2_[redacted]')
        .replace(/\b(?:pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+/gi, '[redacted-client-secret]')
        .replace(/client-id=[^&\s]+/gi, 'client-id=[redacted]')
        .replace(/client_secret=[^&\s]+/gi, 'client_secret=[redacted]')
        .replace(/payment_intent_client_secret=[^&\s]+/gi, 'payment_intent_client_secret=[redacted]')
        .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [redacted]')
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-jwt]');
}
function resetProviderDiagnosticsForTests() {
    warned.clear();
}
/**
 * One development-console warning per provider+code.
 * Never logs customer cancellations or raw secrets.
 */
function warnProviderDiagnostic(providerLabel, code, detail) {
    if (!isDevMode()) {
        return;
    }
    if (code === 'PAYMENT_CANCELLED') {
        return;
    }
    const key = `${providerLabel}:${code}`;
    if (warned.has(key)) {
        return;
    }
    warned.add(key);
    const safeDetail = sanitizeDiagnosticText(detail).trim();
    const extra = safeDetail ? `\n${safeDetail}` : '';
    console.warn(`[Easy Payments] ${providerLabel} initialization failed.\nCode: ${code}\nOther independent payment methods remain available.${extra}`);
}
function describeInitFailure(error) {
    if (error instanceof PaymentError) {
        const config = error.code === 'CONFIG_MISSING' ||
            error.code === 'CONFIG_INVALID' ||
            error.code === 'PROVIDER_NOT_CONFIGURED';
        return {
            code: error.code,
            readiness: config ? 'misconfigured' : 'unavailable',
        };
    }
    return { code: 'SDK_LOAD_FAILED', readiness: 'unavailable' };
}
/** Failures that must not replace the whole checkout with the terminal error screen. */
function isIsolatedProviderFailure(code) {
    return (code === 'SDK_LOAD_FAILED' ||
        code === 'CONFIG_MISSING' ||
        code === 'CONFIG_INVALID' ||
        code === 'PROVIDER_NOT_CONFIGURED' ||
        code === 'PROVIDER_UNAVAILABLE' ||
        code === 'BACKEND_ERROR');
}

const MERCHANT_METADATA_LIMITS = {
    maxEntries: 10,
    maxKeyLength: 40,
    maxValueLength: 500,
};
/** PayPal `custom_id` limit. Only `orderId` is mapped, and it is never truncated. */
const PAYPAL_ORDER_REFERENCE_MAX_LENGTH = 127;
const PAYPAL_ORDER_REFERENCE_KEY = 'orderId';
/**
 * Keys the browser must not set. Server-owned payment fields are written
 * after merchant metadata and always win if a caller bypasses this list.
 * Keep this list identical to `server/src/metadata/merchant-metadata.ts`.
 */
const MERCHANT_METADATA_RESERVED_KEYS = [
    'amount',
    'authorization',
    'cardnumber',
    'catalogunitamount',
    'clientsecret',
    'constructor',
    'currency',
    'cvc',
    'cvv',
    'pan',
    'password',
    'paymentmethod',
    'productid',
    'prototype',
    'provider',
    'quantity',
    'secret',
    'secretkey',
    'source',
    'token',
    'trustedunitamount',
    'unitamount',
    '__proto__',
];
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;
const MESSAGES = {
    shape: 'Merchant metadata must be a flat map of strings.',
    count: 'Merchant metadata exceeds the maximum of 10 entries.',
    emptyKey: 'Merchant metadata contains an empty key.',
    invalidKey: 'Merchant metadata contains an invalid key.',
    reservedKey: 'Merchant metadata contains a reserved key.',
    valueType: 'Merchant metadata values must be strings.',
    emptyValue: 'Merchant metadata values must be non-empty strings.',
    valueLength: 'Merchant metadata values must be at most 500 characters.',
    unsafeValue: 'Merchant metadata contains an unsafe value.',
    paypalLength: 'PayPal orderId metadata must be at most 127 characters.',
};
function validateMerchantMetadata(metadata) {
    if (metadata === undefined || metadata === null) {
        return { valid: true, errors: [] };
    }
    if (!isPlainObject(metadata)) {
        return { valid: false, errors: [MESSAGES.shape] };
    }
    const entries = Object.entries(metadata);
    if (entries.length > MERCHANT_METADATA_LIMITS.maxEntries) {
        return { valid: false, errors: [MESSAGES.count] };
    }
    const errors = [];
    const normalized = {};
    for (const [key, value] of entries) {
        if (key.trim() === '') {
            pushError(errors, MESSAGES.emptyKey);
            continue;
        }
        if (!KEY_PATTERN.test(key)) {
            pushError(errors, MESSAGES.invalidKey);
            continue;
        }
        if (isReservedMerchantMetadataKey(key)) {
            pushError(errors, MESSAGES.reservedKey);
            continue;
        }
        if (typeof value !== 'string') {
            pushError(errors, MESSAGES.valueType);
            continue;
        }
        if (value.trim() === '') {
            pushError(errors, MESSAGES.emptyValue);
            continue;
        }
        if (value.length > MERCHANT_METADATA_LIMITS.maxValueLength) {
            pushError(errors, MESSAGES.valueLength);
            continue;
        }
        if (isUnsafeMetadataValue(value)) {
            pushError(errors, MESSAGES.unsafeValue);
            continue;
        }
        normalized[key] = value;
    }
    if (errors.length > 0) {
        return { valid: false, errors };
    }
    return { valid: true, errors: [], metadata: normalized };
}
function assertMerchantMetadata(metadata, method, provider) {
    const result = validateMerchantMetadata(metadata);
    if (!result.valid) {
        throw new PaymentError({
            code: 'CONFIG_INVALID',
            message: result.errors[0] ?? MESSAGES.shape,
            method,
            provider,
        });
    }
    return result.metadata;
}
function assertPayPalOrderReference(orderReference, method = 'paypal', provider = 'paypal') {
    if (orderReference.length > PAYPAL_ORDER_REFERENCE_MAX_LENGTH ||
        orderReference.trim() === '' ||
        isUnsafeMetadataValue(orderReference)) {
        throw new PaymentError({
            code: 'CONFIG_INVALID',
            message: MESSAGES.paypalLength,
            method,
            provider,
        });
    }
    return orderReference;
}
/**
 * Library-added fields (product name, checkout method) are omitted when they
 * fail the same value rules. They are not truncated. When a library field is
 * accepted, it replaces a merchant entry of the same key.
 */
function buildStripeRequestMetadata(merchant, libraryFields, method, provider) {
    const validated = assertMerchantMetadata(merchant, method, provider) ?? {};
    const merged = { ...validated };
    for (const [key, value] of Object.entries(libraryFields)) {
        if (value === undefined) {
            continue;
        }
        if (isReservedMerchantMetadataKey(key) || !isAcceptableLibraryValue(value)) {
            continue;
        }
        merged[key] = value;
    }
    return Object.keys(merged).length > 0 ? merged : undefined;
}
function merchantMetadataSessionPart(metadata) {
    if (!metadata) {
        return '';
    }
    // Encode so values containing `&`, `=`, or `|` cannot collide with another map.
    return Object.keys(metadata)
        .sort()
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(metadata[key])}`)
        .join('&');
}
function appendMetadataSessionPart(base, metadata) {
    const part = merchantMetadataSessionPart(metadata);
    return part ? `${base}|${part}` : base;
}
function isReservedMerchantMetadataKey(key) {
    return MERCHANT_METADATA_RESERVED_KEYS.includes(key.toLowerCase());
}
function isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function isAcceptableLibraryValue(value) {
    return (value.trim() !== '' &&
        value.length <= MERCHANT_METADATA_LIMITS.maxValueLength &&
        !isUnsafeMetadataValue(value));
}
function isUnsafeMetadataValue(value) {
    if (/[\u0000-\u001F\u007F]/.test(value)) {
        return true;
    }
    if (/(?:sk|rk)_(?:test|live)_/i.test(value)) {
        return true;
    }
    if (/bearer\s+\S+/i.test(value) || /client_secret/i.test(value)) {
        return true;
    }
    if (/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./.test(value)) {
        return true;
    }
    const digits = value.replace(/[ -]/g, '');
    return /^\d{13,19}$/.test(digits);
}
function pushError(errors, message) {
    if (!errors.includes(message)) {
        errors.push(message);
    }
}

/**
 * Per-checkout-instance availability snapshot.
 *
 * `PaymentOrchestratorService` remains root-scoped (adapters, initialize,
 * processPayment, and the global diagnostics projection). Each
 * `<easy-payments>` (and future payment-buttons) host owns one of these
 * sessions so a sibling refresh cannot overwrite another host's visible methods.
 *
 * Not providedIn root — construct one per component instance.
 */
class CheckoutAvailabilitySession {
    _availableMethods = signal([], /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_availableMethods" }] : /* istanbul ignore next */ []));
    _availabilityPublished = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_availabilityPublished" }] : /* istanbul ignore next */ []));
    availableMethods = this._availableMethods.asReadonly();
    availabilityPublished = this._availabilityPublished.asReadonly();
    /** Replace the instance snapshot after a successful availability evaluation. */
    apply(results) {
        this._availableMethods.set(results.map((entry) => ({ ...entry })));
        this._availabilityPublished.set(true);
    }
    /** Clear local publication (e.g. after a failed refresh that should not paint stale tiles). */
    clear() {
        this._availableMethods.set([]);
        this._availabilityPublished.set(false);
    }
}

const EASY_PAYMENTS_CONFIG = new InjectionToken('EASY_PAYMENTS_CONFIG');
function provideEasyPayments(config) {
    return makeEnvironmentProviders([
        {
            provide: EASY_PAYMENTS_CONFIG,
            useValue: config,
        },
    ]);
}

/**
 * Mutable runtime config so demos (and hosts) can switch mock ↔ real Stripe
 * without rebuilding the injector tree.
 */
class EasyPaymentsConfigService {
    config;
    constructor() {
        const initial = inject(EASY_PAYMENTS_CONFIG, { optional: true });
        this.config = initial
            ? structuredClone(initial)
            : { providers: {}, enableMockMode: true };
    }
    getSnapshot() {
        return this.config;
    }
    update(partial) {
        this.config = {
            ...this.config,
            ...partial,
            providers: {
                ...this.config.providers,
                ...(partial.providers ?? {}),
            },
            backend: partial.backend
                ? { ...this.config.backend, ...partial.backend }
                : this.config.backend,
        };
        return this.config;
    }
    replace(config) {
        this.config = structuredClone(config);
        return this.config;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsConfigService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsConfigService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsConfigService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [] });

class BrowserGuard {
    platformId = inject(PLATFORM_ID);
    get isBrowser() {
        return isPlatformBrowser(this.platformId);
    }
    getWindow() {
        return this.isBrowser ? window : null;
    }
    getDocument() {
        return this.isBrowser ? document : null;
    }
    getNavigator() {
        return this.isBrowser ? navigator : null;
    }
    matchMedia(query) {
        const win = this.getWindow();
        return win?.matchMedia?.(query) ?? null;
    }
    getLocalStorage() {
        if (!this.isBrowser) {
            return null;
        }
        try {
            return localStorage;
        }
        catch {
            return null;
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: BrowserGuard, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: BrowserGuard, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: BrowserGuard, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
function isBrowserPlatform(platformId) {
    return isPlatformBrowser(platformId);
}

function mapStripeError(error) {
    if (error instanceof PaymentError) {
        return error;
    }
    const stripeError = (error ?? {});
    const message = stripeError.message?.trim() || 'Stripe payment failed.';
    const code = (stripeError.code ?? '').toLowerCase();
    const type = (stripeError.type ?? '').toLowerCase();
    const decline = (stripeError.decline_code ?? '').toLowerCase();
    if (code === 'payment_intent_authentication_failure' ||
        (type === 'invalid_request_error' && message.toLowerCase().includes('authenticat'))) {
        return new PaymentError({
            code: 'AUTHENTICATION_FAILED',
            message: message || 'Payment authentication failed.',
            method: 'card',
            provider: 'stripe',
            originalError: error,
        });
    }
    if (code.includes('authentication') ||
        message.toLowerCase().includes('authentication required')) {
        return new PaymentError({
            code: 'AUTHENTICATION_REQUIRED',
            message,
            method: 'card',
            provider: 'stripe',
            originalError: error,
        });
    }
    if (type === 'card_error' ||
        decline ||
        code === 'card_declined' ||
        code === 'insufficient_funds' ||
        code === 'expired_card' ||
        code === 'incorrect_cvc') {
        return new PaymentError({
            code: 'CARD_DECLINED',
            message,
            method: 'card',
            provider: 'stripe',
            originalError: error,
        });
    }
    if (code === 'canceled' ||
        message.toLowerCase().includes('cancel') ||
        stripeError.payment_intent?.status === 'canceled') {
        return new PaymentError({
            code: 'PAYMENT_CANCELLED',
            message,
            method: 'card',
            provider: 'stripe',
            originalError: error,
        });
    }
    if (type === 'api_connection_error' || message.toLowerCase().includes('network')) {
        return new PaymentError({
            code: 'NETWORK_ERROR',
            message: 'A network error occurred while contacting Stripe.',
            method: 'card',
            provider: 'stripe',
            originalError: error,
        });
    }
    let mapped = 'PAYMENT_FAILED';
    if (type === 'invalid_request_error') {
        mapped = 'CONFIG_INVALID';
    }
    return new PaymentError({
        code: mapped,
        message,
        method: 'card',
        provider: 'stripe',
        originalError: error,
    });
}

/**
 * Thin wrapper around official loadStripe so unit tests can stub SDK loading
 * without hitting the network.
 */
class StripeSdkLoader {
    load(publishableKey) {
        return loadStripe(publishableKey);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeSdkLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeSdkLoader, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeSdkLoader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

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
const STRIPE_RETURN_METHOD_PARAM = 'ep_method';
/** Random, non-secret attempt token that ties a return URL to its pending marker. */
const STRIPE_RETURN_ATTEMPT_PARAM = 'ep_attempt';
const STRIPE_PENDING_STORAGE_KEY = 'ep.stripe.redirect.pending';
/** Finite poll when Stripe reports PaymentIntent status `processing` after return. */
const STRIPE_PROCESSING_MAX_ATTEMPTS = 6;
const STRIPE_PROCESSING_DELAY_MS = 750;
/**
 * Bounded retries when Stripe PaymentIntent retrieval fails transiently
 * (network / SDK). Does not reconfirm or create a new PaymentIntent.
 */
const STRIPE_RETRIEVE_RETRY_ATTEMPTS = 3;
const STRIPE_RETRIEVE_RETRY_DELAY_MS = 400;
/** Pending redirect markers older than this grant no ownership. */
const STRIPE_PENDING_TTL_MS = 24 * 60 * 60 * 1000;
/** Merchant or auto host ids: non-secret, URL/storage safe. */
const CHECKOUT_INSTANCE_ID_PATTERN = /^[a-zA-Z0-9_.:-]{1,64}$/;
function isValidCheckoutInstanceId(value) {
    return typeof value === 'string' && CHECKOUT_INSTANCE_ID_PATTERN.test(value);
}
function createStripeReturnAttemptId() {
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    }
    else {
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function canUseSessionStorage(storage) {
    return !!storage && typeof storage.getItem === 'function';
}
function currentSearch(search) {
    return search ?? (typeof window !== 'undefined' ? window.location.search : '');
}
function isRedirectMethod(value) {
    return value === 'klarna' || value === 'affirm';
}
function isHostKind(value) {
    return value === 'checkout' || value === 'buttons' || value === 'headless';
}
/** True when the marker is past TTL or lacks a usable timestamp. */
function isStripePendingReturnExpired(marker, now = Date.now()) {
    if (typeof marker.at !== 'number' || !Number.isFinite(marker.at) || marker.at <= 0) {
        return true;
    }
    return now - marker.at > STRIPE_PENDING_TTL_MS;
}
const STRIPE_RETURN_URL_MESSAGE = 'Checkout successUrl must be a same-origin http(s) URL. Relative paths are resolved against the current page. Other schemes and cross-origin destinations are not allowed.';
function invalidStripeReturnUrl(method) {
    const provider = method === 'klarna' || method === 'affirm' ? method : 'stripe';
    throw new PaymentError({
        code: 'CONFIG_INVALID',
        message: STRIPE_RETURN_URL_MESSAGE,
        method,
        provider,
    });
}
function currentPageHref(locationHref) {
    const explicit = locationHref?.trim();
    if (explicit) {
        return explicit;
    }
    if (typeof window !== 'undefined' && window.location) {
        return `${window.location.origin}${window.location.pathname}${window.location.search}`;
    }
    return 'http://localhost/';
}
/**
 * Resolve a merchant return destination against the current page.
 * Does not add Stripe return markers and does not echo the supplied URL.
 */
function resolveSameOriginStripeReturnUrl(baseUrl, locationHref, method) {
    let page;
    try {
        page = new URL(currentPageHref(locationHref));
    }
    catch {
        invalidStripeReturnUrl(method);
    }
    if (page.protocol !== 'http:' && page.protocol !== 'https:') {
        invalidStripeReturnUrl(method);
    }
    const raw = baseUrl?.trim() ?? '';
    if (!raw) {
        return page;
    }
    if (raw.startsWith('//') || raw.startsWith('\\\\') || raw.startsWith('/\\')) {
        invalidStripeReturnUrl(method);
    }
    const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(raw);
    if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        if (scheme !== 'http' && scheme !== 'https') {
            invalidStripeReturnUrl(method);
        }
    }
    let url;
    try {
        url = new URL(raw, page);
    }
    catch {
        invalidStripeReturnUrl(method);
    }
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') ||
        url.username ||
        url.password ||
        url.origin !== page.origin) {
        invalidStripeReturnUrl(method);
    }
    return url;
}
/** Build a return_url that preserves merchant params and marks the Stripe redirect method. */
function buildStripeReturnUrl(method, baseUrl, locationHref, attemptId) {
    const url = resolveSameOriginStripeReturnUrl(baseUrl, locationHref, method);
    url.searchParams.set(STRIPE_RETURN_METHOD_PARAM, method);
    if (attemptId) {
        url.searchParams.set(STRIPE_RETURN_ATTEMPT_PARAM, attemptId);
    }
    return url.href;
}
function readStripeReturnParams(search) {
    const params = new URLSearchParams(currentSearch(search));
    const rawMethod = params.get(STRIPE_RETURN_METHOD_PARAM);
    const rawAttempt = params.get(STRIPE_RETURN_ATTEMPT_PARAM);
    return {
        paymentIntentId: params.get('payment_intent'),
        clientSecret: params.get('payment_intent_client_secret'),
        redirectStatus: params.get('redirect_status'),
        method: isRedirectMethod(rawMethod) ? rawMethod : null,
        attemptId: rawAttempt && /^[a-z0-9]{8,64}$/i.test(rawAttempt) ? rawAttempt : null,
    };
}
function markStripePendingReturn(method, productId, storage, origin) {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
    if (!canUseSessionStorage(store)) {
        return;
    }
    try {
        const payload = { method, productId, at: Date.now(), ...origin };
        store.setItem(STRIPE_PENDING_STORAGE_KEY, JSON.stringify(payload));
    }
    catch {
        // Quota / private mode — callers that require a durable marker must use markHeadlessPendingReturn.
    }
}
/**
 * Write a Headless-owned pending marker. Fails closed when another unresolved
 * attempt already occupies the shared key (different host or Headless instance).
 * Same Headless `checkoutInstanceId` may replace its own prior attempt.
 */
function markHeadlessPendingReturn(method, productId, origin, storage) {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
    if (!canUseSessionStorage(store)) {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'sessionStorage is required to record Headless Klarna/Affirm redirect ownership before confirmation.',
            method,
            provider: method,
        });
    }
    if (!origin.attemptId || !isValidCheckoutInstanceId(origin.checkoutInstanceId)) {
        throw new PaymentError({
            code: 'CONFIG_INVALID',
            message: 'Headless Klarna/Affirm redirect requires a stable checkoutInstanceId and attempt id for ownership.',
            method,
            provider: method,
        });
    }
    let existing = null;
    try {
        existing = readStripePendingReturn(store);
    }
    catch {
        existing = null;
    }
    if (existing) {
        const sameHeadlessSession = existing.hostKind === 'headless' &&
            existing.checkoutInstanceId === origin.checkoutInstanceId;
        if (!sameHeadlessSession) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'A Stripe redirect return is already pending for another checkout attempt. Complete or abandon that attempt before starting another.',
                method,
                provider: method,
            });
        }
    }
    try {
        const payload = {
            method,
            productId,
            at: Date.now(),
            attemptId: origin.attemptId,
            hostKind: 'headless',
            checkoutInstanceId: origin.checkoutInstanceId,
        };
        store.setItem(STRIPE_PENDING_STORAGE_KEY, JSON.stringify(payload));
    }
    catch {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Unable to persist Headless redirect ownership marker in sessionStorage.',
            method,
            provider: method,
        });
    }
}
/**
 * Read the pending marker. Expired, malformed, or unreadable markers return null
 * and do not grant ownership. Expired entries are cleared from storage when possible.
 */
function readStripePendingReturn(storage, now = Date.now()) {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
    if (!canUseSessionStorage(store)) {
        return null;
    }
    try {
        const raw = store.getItem(STRIPE_PENDING_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || !isRedirectMethod(parsed.method) || typeof parsed.productId !== 'string') {
            return null;
        }
        if (parsed.hostKind !== undefined && parsed.hostKind !== null && !isHostKind(parsed.hostKind)) {
            return null;
        }
        if (isStripePendingReturnExpired(parsed, now)) {
            try {
                store.removeItem(STRIPE_PENDING_STORAGE_KEY);
            }
            catch {
                // ignore clear failures
            }
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function clearStripePendingReturn(storage) {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
    if (!canUseSessionStorage(store)) {
        return;
    }
    try {
        store.removeItem(STRIPE_PENDING_STORAGE_KEY);
    }
    catch {
        // ignore
    }
}
/**
 * Clears the pending marker only if it still belongs to `attemptId`
 * (never a sibling host's or a newer attempt).
 */
function clearStripePendingReturnFor(attemptId, storage) {
    if (!attemptId) {
        return;
    }
    const pending = peekStripePendingReturn(storage);
    if (pending?.attemptId === attemptId) {
        clearStripePendingReturn(storage);
    }
}
/**
 * Read without TTL eviction — used only so attempt-scoped clear can still remove
 * an expired marker that matches the settling attempt.
 */
function peekStripePendingReturn(storage) {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
    if (!canUseSessionStorage(store)) {
        return null;
    }
    try {
        const raw = store.getItem(STRIPE_PENDING_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || !isRedirectMethod(parsed.method) || typeof parsed.productId !== 'string') {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
/**
 * Detect which Stripe redirect method (if any) is returning.
 * Prefers explicit `ep_method`; falls back to pending session marker.
 */
function detectStripeReturnMethod(search, storage) {
    const params = readStripeReturnParams(search);
    if (params.method) {
        return params.method;
    }
    const pending = readStripePendingReturn(storage);
    if (!pending) {
        return null;
    }
    if (!(params.clientSecret || params.paymentIntentId)) {
        // ep_method alone without Stripe params is still a return attempt for that method
        // when the URL explicitly carries ep_method — handled above.
        // Pending alone without any Stripe params is not enough.
        return null;
    }
    return pending.method;
}
/**
 * True when the URL/session indicates a Stripe redirect return for the given method
 * (or any supported method when method is omitted).
 */
function isStripeReturnAttempt(method, search, storage) {
    const params = new URLSearchParams(currentSearch(search));
    const urlMethod = params.get(STRIPE_RETURN_METHOD_PARAM);
    if (isRedirectMethod(urlMethod)) {
        return method ? urlMethod === method : true;
    }
    const { clientSecret, paymentIntentId } = readStripeReturnParams(search);
    if (!(clientSecret || paymentIntentId)) {
        return false;
    }
    const pending = readStripePendingReturn(storage);
    if (!pending) {
        return false;
    }
    return method ? pending.method === method : true;
}
/**
 * Remove Stripe + Easy Payments return query params without a full reload.
 * An explicit `href` is pure: it never writes `window.history` (callers that pass a
 * sample URL must not navigate the live page). The live page is updated only when
 * `href` is omitted, using the current pathname and `location.search` so a stale
 * `location.href` cannot keep or restore another attempt's query.
 */
function clearStripeReturnParamsFromUrl(href) {
    if (typeof window === 'undefined' && !href) {
        return null;
    }
    let url;
    try {
        if (href) {
            url = new URL(href);
        }
        else {
            const live = window.location;
            url = new URL(`${live.origin}${live.pathname}${live.search}${live.hash}`);
        }
    }
    catch {
        return null;
    }
    url.searchParams.delete('payment_intent');
    url.searchParams.delete('payment_intent_client_secret');
    url.searchParams.delete('redirect_status');
    url.searchParams.delete(STRIPE_RETURN_METHOD_PARAM);
    url.searchParams.delete(STRIPE_RETURN_ATTEMPT_PARAM);
    const next = href ? url.href : `${url.pathname}${url.search}${url.hash}`;
    if (!href && typeof window !== 'undefined' && typeof window.history?.replaceState === 'function') {
        window.history.replaceState({}, '', url.href);
    }
    return next;
}
/** @deprecated Use STRIPE_RETURN_METHOD_PARAM */
const KLARNA_RETURN_METHOD_PARAM$1 = STRIPE_RETURN_METHOD_PARAM;
/** @deprecated Use STRIPE_PENDING_STORAGE_KEY (shared) — Klarna pending now uses shared key */
const KLARNA_PENDING_STORAGE_KEY$1 = STRIPE_PENDING_STORAGE_KEY;
const KLARNA_PROCESSING_MAX_ATTEMPTS$1 = STRIPE_PROCESSING_MAX_ATTEMPTS;
const KLARNA_PROCESSING_DELAY_MS$1 = STRIPE_PROCESSING_DELAY_MS;

/** Exact sessionStorage payload for the pending marker (identity, not timestamp). */
function readPendingReturnRaw() {
    try {
        if (typeof sessionStorage === 'undefined') {
            return null;
        }
        return sessionStorage.getItem(STRIPE_PENDING_STORAGE_KEY);
    }
    catch {
        return null;
    }
}
/**
 * Pure ownership rule for a Stripe redirect return. Never guesses.
 *
 * Preference order when `ep_attempt` matches a live (non-expired) pending marker:
 * 1. Headless markers — only `hostKind: 'headless'` candidates with matching instance/attempt
 * 2. `checkoutInstanceId` + host kind (stable across reorder / remount)
 * 3. Legacy kind + productId + hostOrdinal (markers from before stable ids)
 * 4. Single eligible non-headless host — only for true legacy returns with no `ep_attempt`
 * 5. Otherwise wait (owner not mounted) or AMBIGUOUS_HOSTS / STALE_ATTEMPT
 *
 * Headless returns and any URL with `ep_attempt` never fall through to the
 * single-host legacy shortcut (prevents Full Checkout / Buttons claiming Headless).
 */
function decideStripeReturnOwner(candidates, params, marker, now = Date.now()) {
    const method = params.method ?? marker?.method ?? null;
    if (!method) {
        return { kind: 'unattributed', reason: 'MISSING_METHOD' };
    }
    const markerExpired = !!marker && isStripePendingReturnExpired(marker, now);
    const liveMarker = marker && !markerExpired ? marker : null;
    // Headless-shaped markers never grant checkout/buttons ownership — including when expired.
    if (marker?.hostKind === 'headless') {
        if (!liveMarker) {
            return { kind: 'unattributed', reason: 'STALE_ATTEMPT' };
        }
        return decideHeadlessReturnOwner(candidates, params, liveMarker, method);
    }
    // Checkout / Buttons path — never select a Headless candidate.
    const eligible = candidates.filter((c) => c.methods.includes(method) && c.kind !== 'headless');
    if (params.attemptId && liveMarker?.attemptId && params.attemptId !== liveMarker.attemptId) {
        return { kind: 'unattributed', reason: 'STALE_ATTEMPT' };
    }
    // Attempt token without a matching live marker: could be Headless or stale — fail closed.
    if (params.attemptId && (!liveMarker || !liveMarker.attemptId)) {
        return { kind: 'unattributed', reason: 'STALE_ATTEMPT' };
    }
    if (params.method && liveMarker?.method && params.method !== liveMarker.method) {
        return { kind: 'unattributed', reason: 'STALE_ATTEMPT' };
    }
    const attemptMatches = !!params.attemptId && !!liveMarker?.attemptId && params.attemptId === liveMarker.attemptId;
    if (attemptMatches && liveMarker.checkoutInstanceId) {
        const match = eligible.find((c) => c.instanceId === liveMarker.checkoutInstanceId &&
            (!liveMarker.hostKind || c.kind === liveMarker.hostKind));
        return match ? { kind: 'owner', owner: match.host } : { kind: 'wait' };
    }
    if (attemptMatches &&
        liveMarker.hostKind &&
        typeof liveMarker.hostOrdinal === 'number' &&
        !liveMarker.checkoutInstanceId) {
        const match = eligible.find((c) => c.kind === liveMarker.hostKind &&
            c.productId === liveMarker.productId &&
            c.ordinal === liveMarker.hostOrdinal);
        return match ? { kind: 'owner', owner: match.host } : { kind: 'wait' };
    }
    // Incomplete marker with ep_attempt (matched attempt but no stable/ordinal path) — fail closed.
    if (params.attemptId) {
        return { kind: 'unattributed', reason: 'AMBIGUOUS_HOSTS' };
    }
    // True legacy (no ep_attempt): single eligible non-headless host only.
    const pool = liveMarker ? eligible.filter((c) => c.productId === liveMarker.productId) : eligible;
    if (pool.length === 1) {
        return { kind: 'owner', owner: pool[0].host };
    }
    if (pool.length === 0) {
        return { kind: 'wait' };
    }
    return { kind: 'unattributed', reason: 'AMBIGUOUS_HOSTS' };
}
function decideHeadlessReturnOwner(candidates, params, marker, method) {
    if (!marker.attemptId || !marker.checkoutInstanceId || marker.hostKind !== 'headless') {
        return { kind: 'unattributed', reason: 'AMBIGUOUS_HOSTS' };
    }
    if (params.method && params.method !== marker.method) {
        return { kind: 'unattributed', reason: 'STALE_ATTEMPT' };
    }
    if (!params.attemptId || params.attemptId !== marker.attemptId) {
        return { kind: 'unattributed', reason: 'STALE_ATTEMPT' };
    }
    if (method !== marker.method) {
        return { kind: 'unattributed', reason: 'STALE_ATTEMPT' };
    }
    const eligible = candidates.filter((c) => c.kind === 'headless' &&
        c.methods.includes(method) &&
        c.instanceId === marker.checkoutInstanceId &&
        (!marker.productId || c.productId === marker.productId));
    if (eligible.length === 1) {
        return { kind: 'owner', owner: eligible[0].host };
    }
    if (eligible.length === 0) {
        // Matching Headless host not registered yet (or wrong instance among claimants).
        // Always wait — never let Checkout/Buttons close a Headless return.
        return { kind: 'wait' };
    }
    return { kind: 'unattributed', reason: 'AMBIGUOUS_HOSTS' };
}
function looksLikeSecretKey$3(value) {
    return /^sk_(test|live)_/i.test(value.trim());
}
function looksLikePublishableKey$3(value) {
    return /^pk_(test|live)_/i.test(value.trim());
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Shared Stripe redirect recovery for Klarna / Affirm (and future BNPL methods).
 * Single source of truth so Easy Payments does not duplicate retrieve flows.
 */
class StripeRedirectRecoveryService {
    configService = inject(EasyPaymentsConfigService);
    browser = inject(BrowserGuard);
    sdkLoader = inject(StripeSdkLoader);
    stripe = null;
    loadPromise = null;
    consumePromise = null;
    consumeEpoch = -1;
    consumed = false;
    /** Live hosts in registration (render) order — used for return ownership ordinals. */
    hosts = [];
    pendingClaims = [];
    claimScheduled = false;
    /**
     * Epoch captured when the current claim microtask was queued.
     * A newer claim after {@link mutationEpoch} advances must schedule its own turn.
     */
    scheduledEpoch = 0;
    scheduledSearch = '';
    /**
     * Increments for every newly scheduled claim batch and on test reset.
     * An older microtask must not settle a newer batch, even when the page search string is unchanged.
     */
    claimTurn = 0;
    /**
     * Shared by every instance. Tests advance it when a spec ends so a claim or
     * consume started in an earlier spec cannot clear the next spec's URL or marker.
     * Production does not advance it; overlapping claim batches are ordered by claimTurn.
     */
    static mutationEpoch = 0;
    /** Epoch this instance has already folded into its claim/consume fields. */
    observedEpoch = 0;
    returnOwner = null;
    returnClosed = false;
    /** Attempt id captured when the return was closed or an owner was granted. */
    boundAttempt = null;
    waitWarned = false;
    wasReturnConsumed() {
        return this.consumed;
    }
    /**
     * Test helper — drops queued claims and in-flight return cleanup on every instance.
     * Does not run during a payment. Safe to call when the service instance is already destroyed.
     */
    static invalidateRedirectRecoveryForTests() {
        StripeRedirectRecoveryService.mutationEpoch += 1;
    }
    /** Test helper — clears consume/claim state between Karma specs (root singleton). */
    resetForTests() {
        StripeRedirectRecoveryService.invalidateRedirectRecoveryForTests();
        this.observedEpoch = StripeRedirectRecoveryService.mutationEpoch;
        this.claimTurn += 1;
        this.consumed = false;
        this.consumePromise = null;
        this.consumeEpoch = -1;
        this.returnOwner = null;
        this.returnClosed = false;
        this.boundAttempt = null;
        this.waitWarned = false;
        const abandoned = this.pendingClaims;
        this.pendingClaims = [];
        this.claimScheduled = false;
        this.scheduledEpoch = 0;
        this.scheduledSearch = '';
        abandoned.forEach((claim) => claim.resolve('not-owner'));
        this.hosts.length = 0;
        this.stripe = null;
        this.loadPromise = null;
    }
    registerHost(host) {
        if (!this.hosts.includes(host)) {
            this.hosts.push(host);
        }
    }
    unregisterHost(host) {
        const index = this.hosts.indexOf(host);
        if (index >= 0) {
            this.hosts.splice(index, 1);
        }
        // An owner destroyed before it started recovery hands the return back to a remount.
        if (this.returnOwner === host && !this.consumed) {
            this.returnOwner = null;
        }
    }
    /** Non-secret origin stamp stored before a redirect so only this host recovers it. */
    describeReturnOrigin(host, attemptId) {
        return {
            attemptId,
            hostKind: host.kind,
            checkoutInstanceId: host.instanceId(),
            hostOrdinal: this.ordinalOf(host),
        };
    }
    /**
     * Asks whether `host` owns the current Stripe redirect return. Claims made in
     * the same render pass are decided together, so sibling hosts are all visible.
     */
    /**
     * Drop claim/consume conclusions from a previous {@link mutationEpoch}.
     * Does not unregister hosts. Production never advances the epoch, so this is a no-op there.
     * A claim or consume started before a test reset must not close the next return.
     */
    adoptEpoch() {
        const epoch = StripeRedirectRecoveryService.mutationEpoch;
        if (this.observedEpoch === epoch) {
            return;
        }
        this.observedEpoch = epoch;
        this.consumed = false;
        this.consumePromise = null;
        this.consumeEpoch = -1;
        this.returnOwner = null;
        this.returnClosed = false;
        this.boundAttempt = null;
        this.waitWarned = false;
        this.claimTurn += 1;
        this.claimScheduled = false;
        this.scheduledEpoch = epoch;
        this.scheduledSearch = '';
        const abandoned = this.pendingClaims;
        this.pendingClaims = [];
        abandoned.forEach((claim) => claim.resolve('not-owner'));
    }
    claimReturn(host, methods) {
        if (!this.browser.isBrowser) {
            return Promise.resolve('not-owner');
        }
        this.adoptEpoch();
        const epoch = StripeRedirectRecoveryService.mutationEpoch;
        const search = pageSearch();
        return new Promise((resolve) => {
            if (epoch !== StripeRedirectRecoveryService.mutationEpoch) {
                resolve('not-owner');
                return;
            }
            const scheduleNew = !this.claimScheduled || this.scheduledEpoch !== epoch || this.scheduledSearch !== search;
            if (scheduleNew) {
                this.claimTurn += 1;
                this.claimScheduled = true;
                this.scheduledEpoch = epoch;
                this.scheduledSearch = search;
                const turn = this.claimTurn;
                queueMicrotask(() => this.flushClaims(turn, epoch, search));
            }
            this.pendingClaims.push({ host, methods, resolve, turn: this.claimTurn });
        });
    }
    /** Settle only the batch queued for `turn`. Never the claims a newer turn already holds. */
    flushClaims(turn, epoch, search) {
        const mine = this.pendingClaims.filter((claim) => claim.turn === turn);
        this.pendingClaims = this.pendingClaims.filter((claim) => claim.turn !== turn);
        const superseded = turn !== this.claimTurn ||
            epoch !== StripeRedirectRecoveryService.mutationEpoch ||
            search !== pageSearch();
        if (superseded) {
            if (this.claimTurn === turn) {
                this.claimScheduled = false;
            }
            mine.forEach((claim) => claim.resolve('not-owner'));
            return;
        }
        this.resolveClaims(mine);
    }
    ordinalOf(host) {
        const productId = host.productId();
        return this.hosts
            .filter((h) => h.kind === host.kind && h.productId() === productId)
            .indexOf(host);
    }
    resolveClaims(batch) {
        const epoch = StripeRedirectRecoveryService.mutationEpoch;
        const turn = batch[0]?.turn;
        if (turn === this.claimTurn) {
            this.claimScheduled = false;
        }
        const rejectAll = () => batch.forEach((claim) => claim.resolve('not-owner'));
        if (batch.length === 0 ||
            turn !== this.claimTurn ||
            epoch !== StripeRedirectRecoveryService.mutationEpoch) {
            rejectAll();
            return;
        }
        const attemptNow = readStripeReturnParams().attemptId;
        if (attemptNow && this.boundAttempt && attemptNow !== this.boundAttempt) {
            // A newer attempt is on the page. The previous close or owner must not apply to it.
            this.returnClosed = false;
            this.returnOwner = null;
            this.consumed = false;
            this.boundAttempt = null;
            // Drop the cached consume so a newer attempt is verified, not joined to the old promise.
            this.consumePromise = null;
            this.consumeEpoch = -1;
        }
        const live = batch.filter((claim) => this.hosts.includes(claim.host));
        if (this.returnClosed || !isStripeReturnAttempt()) {
            rejectAll();
            return;
        }
        // Owner claimed earlier but verification did not finish (transient retrieve failure).
        // Only that host may retry consume — never hand the return to a sibling.
        if (this.returnOwner && !this.consumed) {
            batch.forEach((claim) => claim.resolve(claim.host === this.returnOwner ? 'owner' : 'not-owner'));
            return;
        }
        if (this.returnOwner && this.consumed) {
            rejectAll();
            return;
        }
        const decision = decideStripeReturnOwner(live.map((claim) => ({
            host: claim.host,
            kind: claim.host.kind,
            productId: claim.host.productId(),
            instanceId: claim.host.instanceId(),
            ordinal: this.ordinalOf(claim.host),
            methods: claim.methods,
        })), readStripeReturnParams(), readStripePendingReturn());
        if (decision.kind === 'owner') {
            this.returnOwner = decision.owner;
            this.boundAttempt = readStripeReturnParams().attemptId;
            batch.forEach((claim) => claim.resolve(claim.host === decision.owner ? 'owner' : 'not-owner'));
            return;
        }
        if (decision.kind === 'wait') {
            // The originating host is not mounted (yet). Leave the return in place for it.
            if (!this.waitWarned) {
                this.waitWarned = true;
                warnReturnDiagnostic('STRIPE_RETURN_OWNER_NOT_MOUNTED');
            }
            rejectAll();
            return;
        }
        if (turn !== this.claimTurn ||
            epoch !== StripeRedirectRecoveryService.mutationEpoch) {
            rejectAll();
            return;
        }
        const closingAttempt = readStripeReturnParams().attemptId;
        this.returnClosed = true;
        this.boundAttempt = closingAttempt;
        warnReturnDiagnostic(`STRIPE_RETURN_UNATTRIBUTED (${decision.reason})`);
        if (decision.reason !== 'STALE_ATTEMPT') {
            clearStripePendingReturn();
        }
        clearStripeReturnParamsFromUrl();
        rejectAll();
    }
    /**
     * Idempotent for a successful or definitive consume.
     * Transient verification failures (network / SDK) do not mark the return consumed
     * and preserve marker + URL so the owner may retry verification (not confirmation).
     */
    consumeReturn() {
        this.adoptEpoch();
        const epoch = StripeRedirectRecoveryService.mutationEpoch;
        if (!this.consumePromise || this.consumeEpoch !== epoch) {
            this.consumeEpoch = epoch;
            const promise = this.doConsumeReturn(epoch).catch((error) => {
                if (this.consumePromise === promise && isTransientStripeVerificationError(error)) {
                    // Allow a later consumeReturn() to retry verification.
                    // Do not drop a newer attempt's in-flight consume.
                    this.consumePromise = null;
                }
                throw error;
            });
            this.consumePromise = promise;
        }
        return this.consumePromise;
    }
    async doConsumeReturn(epoch) {
        const stillCurrent = () => epoch === StripeRedirectRecoveryService.mutationEpoch;
        if (!stillCurrent() || !this.browser.isBrowser || !isStripeReturnAttempt()) {
            return null;
        }
        if (this.consumed) {
            return null;
        }
        const method = detectStripeReturnMethod() ?? readStripeReturnParams().method;
        const { clientSecret, redirectStatus, attemptId } = readStripeReturnParams();
        // Exact storage identity of the marker at consume start. Used so a legacy
        // (no ep_attempt) cleanup can clear that marker without deleting a different
        // attempted marker written while verification was in flight.
        const pendingRawAtStart = readPendingReturnRaw();
        try {
            if (!method) {
                throw new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: 'Payment return is missing method context. Please try again.',
                    method: 'klarna',
                    provider: 'klarna',
                });
            }
            if (redirectStatus === 'failed') {
                throw new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: `${methodLabel$1(method)} payment was not completed.`,
                    method,
                    provider: method,
                });
            }
            if (!clientSecret?.trim()) {
                throw new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: `${methodLabel$1(method)} return is missing payment details. Please try the payment again.`,
                    method,
                    provider: method,
                });
            }
            const result = await this.retrieveReturningPayment(method, clientSecret);
            if (!stillCurrent()) {
                return null;
            }
            if (!this.finishConsumeCleanup(attemptId, pendingRawAtStart)) {
                return null;
            }
            return result;
        }
        catch (error) {
            if (!stillCurrent()) {
                return null;
            }
            if (isTransientStripeVerificationError(error)) {
                // Outcome uncertain — keep correlation data for a bounded verification retry.
                throw error;
            }
            if (!this.finishConsumeCleanup(attemptId, pendingRawAtStart)) {
                return null;
            }
            throw error;
        }
    }
    /** @returns false when a newer attempt owns the page and this result must be discarded. */
    finishConsumeCleanup(attemptAtStart, pendingRawAtStart) {
        if (readStripeReturnParams().attemptId !== attemptAtStart) {
            // A newer return was written while verification was in flight. Leave it alone.
            return false;
        }
        this.consumed = true;
        const pendingRaw = readPendingReturnRaw();
        const pendingAttempt = readStripePendingReturn()?.attemptId ?? null;
        let clearMarker = false;
        if (!pendingRaw) {
            clearMarker = false;
        }
        else if (attemptAtStart != null) {
            // Attempted return: clear missing/legacy markers or the matching attempt.
            clearMarker = !pendingAttempt || pendingAttempt === attemptAtStart;
        }
        else {
            // Legacy URL (no ep_attempt): clear the exact marker observed at start, or
            // any attempt-less marker. Never clear a different attempted marker that
            // appeared mid-flight (raw identity, not timestamp).
            clearMarker = !pendingAttempt || pendingRaw === pendingRawAtStart;
        }
        if (clearMarker) {
            clearStripePendingReturn();
        }
        clearStripeReturnParamsFromUrl();
        return true;
    }
    async retrieveReturningPayment(method, clientSecret) {
        if (!clientSecret?.trim()) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: `Missing payment_intent_client_secret after ${methodLabel$1(method)} return.`,
                method,
                provider: method,
            });
        }
        const stripe = await this.ensureStripeLoaded();
        const secret = clientSecret.trim();
        let lastIntent;
        let lastTransient = null;
        for (let attempt = 0; attempt < STRIPE_PROCESSING_MAX_ATTEMPTS; attempt++) {
            let paymentIntent;
            try {
                const retrieved = await this.retrievePaymentIntentWithRetry(stripe, method, secret);
                paymentIntent = retrieved ?? undefined;
                lastTransient = null;
            }
            catch (error) {
                if (isTransientStripeVerificationError(error)) {
                    lastTransient = error instanceof PaymentError ? error : mapMethodError(method, error);
                    if (attempt < STRIPE_PROCESSING_MAX_ATTEMPTS - 1) {
                        await delay(STRIPE_PROCESSING_DELAY_MS);
                        continue;
                    }
                    throw lastTransient;
                }
                throw error;
            }
            lastIntent = paymentIntent;
            const status = paymentIntent?.status;
            if (status === 'succeeded' || status === 'requires_capture' || status === 'canceled') {
                return this.normalizeIntent(method, paymentIntent);
            }
            if (status === 'requires_payment_method' ||
                status === 'requires_action' ||
                status === 'requires_confirmation') {
                return this.normalizeIntent(method, paymentIntent);
            }
            if (status === 'processing') {
                if (attempt < STRIPE_PROCESSING_MAX_ATTEMPTS - 1) {
                    await delay(STRIPE_PROCESSING_DELAY_MS);
                    continue;
                }
                return this.normalizeIntent(method, paymentIntent);
            }
            return this.normalizeIntent(method, paymentIntent);
        }
        if (lastTransient) {
            throw lastTransient;
        }
        return this.normalizeIntent(method, lastIntent);
    }
    /**
     * Bounded retries for a single retrievePaymentIntent call on transient network/SDK errors.
     * Never confirms or creates a PaymentIntent.
     */
    async retrievePaymentIntentWithRetry(stripe, method, clientSecret) {
        let lastError = null;
        for (let attempt = 0; attempt < STRIPE_RETRIEVE_RETRY_ATTEMPTS; attempt++) {
            try {
                const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
                if (error) {
                    const mapped = mapMethodError(method, error);
                    if (!isTransientStripeVerificationError(mapped) || attempt === STRIPE_RETRIEVE_RETRY_ATTEMPTS - 1) {
                        throw mapped;
                    }
                    lastError = mapped;
                    await delay(STRIPE_RETRIEVE_RETRY_DELAY_MS);
                    continue;
                }
                return paymentIntent ?? undefined;
            }
            catch (error) {
                if (error instanceof PaymentError && !isTransientStripeVerificationError(error)) {
                    throw error;
                }
                lastError =
                    error instanceof PaymentError ? error : mapMethodError(method, error);
                if (attempt === STRIPE_RETRIEVE_RETRY_ATTEMPTS - 1) {
                    throw lastError;
                }
                await delay(STRIPE_RETRIEVE_RETRY_DELAY_MS);
            }
        }
        throw (lastError ??
            new PaymentError({
                code: 'NETWORK_ERROR',
                message: `Unable to verify ${methodLabel$1(method)} payment status.`,
                method,
                provider: method,
            }));
    }
    normalizeIntent(method, paymentIntent) {
        const status = paymentIntent?.status;
        if (status === 'succeeded') {
            return normalizePaymentResult({
                status: 'success',
                method,
                provider: method,
                transactionId: paymentIntent?.id,
                message: `${methodLabel$1(method)} payment completed successfully.`,
                metadata: {
                    stripeStatus: status,
                    gateway: 'stripe',
                },
            });
        }
        if (status === 'requires_capture') {
            // Public contract keeps status "success" for compatibility; metadata clarifies authorization-only.
            return normalizePaymentResult({
                status: 'success',
                method,
                provider: method,
                transactionId: paymentIntent?.id,
                message: `${methodLabel$1(method)} payment is authorized and requires capture. Confirm capture and fulfillment on your backend — this is not proof of captured funds.`,
                metadata: {
                    stripeStatus: status,
                    gateway: 'stripe',
                    authorizationOnly: true,
                },
            });
        }
        if (status === 'canceled') {
            return normalizePaymentResult({
                status: 'cancelled',
                method,
                provider: method,
                transactionId: paymentIntent?.id,
                message: `${methodLabel$1(method)} payment was cancelled.`,
                metadata: { gateway: 'stripe' },
            });
        }
        if (status === 'requires_payment_method') {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: `${methodLabel$1(method)} payment was not completed. Please try again.`,
                method,
                provider: method,
                originalError: paymentIntent,
            });
        }
        if (status === 'requires_action' || status === 'requires_confirmation') {
            throw new PaymentError({
                code: 'AUTHENTICATION_REQUIRED',
                message: `${methodLabel$1(method)} payment still requires additional customer action.`,
                method,
                provider: method,
                originalError: paymentIntent,
            });
        }
        if (status === 'processing') {
            return normalizePaymentResult({
                status: 'processing',
                method,
                provider: method,
                transactionId: paymentIntent?.id,
                message: `${methodLabel$1(method)} payment is still processing. Do not retry — confirm the final status on your backend.`,
                metadata: { stripeStatus: status, gateway: 'stripe' },
            });
        }
        throw new PaymentError({
            code: 'PAYMENT_FAILED',
            message: `Unexpected PaymentIntent status: ${status ?? 'unknown'}.`,
            method,
            provider: method,
            originalError: paymentIntent,
        });
    }
    async ensureStripeLoaded() {
        if (this.stripe) {
            return this.stripe;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        const key = this.configService.getSnapshot().providers?.stripe?.publishableKey?.trim() ?? '';
        if (!key || looksLikeSecretKey$3(key) || !looksLikePublishableKey$3(key)) {
            throw new PaymentError({
                code: 'CONFIG_MISSING',
                message: 'Stripe publishableKey is missing or invalid (required for redirect recovery).',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        this.loadPromise = (async () => {
            try {
                const stripe = await this.sdkLoader.load(key);
                if (!stripe) {
                    throw new PaymentError({
                        code: 'SDK_LOAD_FAILED',
                        message: 'Stripe.js failed to initialize.',
                        method: 'klarna',
                        provider: 'klarna',
                    });
                }
                this.stripe = stripe;
                return stripe;
            }
            catch (error) {
                // Allow a later verification retry to reload Stripe.js after a transient failure.
                this.loadPromise = null;
                throw error;
            }
        })();
        return this.loadPromise;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeRedirectRecoveryService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeRedirectRecoveryService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeRedirectRecoveryService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
function pageSearch() {
    return typeof window !== 'undefined' ? window.location.search : '';
}
function warnReturnDiagnostic(code) {
    if (!isDevMode()) {
        return;
    }
    console.warn(`[Easy Payments] Stripe redirect return was not recovered.\nCode: ${code}\n` +
        'No success/cancel/error event was emitted. Confirm the payment status on your backend.');
}
function methodLabel$1(method) {
    return method === 'affirm' ? 'Affirm' : 'Klarna';
}
function mapMethodError(method, error) {
    const mapped = mapStripeError(error);
    return new PaymentError({
        code: mapped.code,
        message: mapped.message,
        method,
        provider: method,
        originalError: mapped.originalError ?? error,
    });
}
/**
 * Transient verification failures are not payment outcomes.
 * Marker/URL must stay so the owning host can retry retrieve — never confirm again.
 */
function isTransientStripeVerificationError(error) {
    if (!(error instanceof PaymentError)) {
        return false;
    }
    return error.code === 'NETWORK_ERROR' || error.code === 'SDK_LOAD_FAILED';
}

let ownerSequence = 0;
/**
 * Page-unique, non-secret token identifying one payment host component on a
 * shared root adapter (Payment Element session, wallet attempt, PayPal order guard).
 */
function createPaymentOwnerId(prefix) {
    ownerSequence += 1;
    return `${prefix}-${ownerSequence}`;
}

/**
 * Per-host context (component-level provider on `<easy-payments>` and
 * `<easy-payment-buttons>`). Lets child payment panels stamp redirect origin and
 * follow the host's return ownership without reaching into the host component.
 */
class CheckoutHostContext {
    recovery = inject(StripeRedirectRecoveryService);
    currentProductId = null;
    /** Auto id until the host optionally applies a merchant `[checkoutInstanceId]`. */
    currentInstanceId = createPaymentOwnerId('host');
    kind = 'checkout';
    phase = signal('none', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "phase" }] : /* istanbul ignore next */ []));
    phaseMethod = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "phaseMethod" }] : /* istanbul ignore next */ []));
    /** Return phase as seen by the panel for `method`; other methods always see `none`. */
    returnPhaseFor(method) {
        const phase = this.phase();
        return phase !== 'none' && this.phaseMethod() === method ? phase : 'none';
    }
    returnPhase() {
        return this.phase();
    }
    setReturnPhase(phase, method = null) {
        this.phaseMethod.set(phase === 'none' ? null : method);
        this.phase.set(phase);
    }
    constructor() {
        this.recovery.registerHost(this);
    }
    productId() {
        return this.currentProductId;
    }
    setProductId(productId) {
        this.currentProductId = productId;
    }
    instanceId() {
        return this.currentInstanceId;
    }
    /**
     * Applies an optional merchant-stable id. Invalid values are ignored so a typo
     * cannot wipe the auto-generated id mid-session.
     */
    setCheckoutInstanceId(checkoutInstanceId) {
        if (isValidCheckoutInstanceId(checkoutInstanceId)) {
            this.currentInstanceId = checkoutInstanceId;
        }
    }
    describeReturnOrigin(attemptId) {
        return this.recovery.describeReturnOrigin(this, attemptId);
    }
    ngOnDestroy() {
        this.recovery.unregisterHost(this);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutHostContext, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutHostContext });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutHostContext, decorators: [{
            type: Injectable
        }], ctorParameters: () => [] });

const VALID_CURRENCY = /^[A-Z]{3}$/;
function validatePaymentProduct(product) {
    const errors = [];
    if (!product || typeof product !== 'object') {
        return { valid: false, errors: ['Product is required.'] };
    }
    const p = product;
    if (!p['id'] || typeof p['id'] !== 'string' || p['id'].trim() === '') {
        errors.push('Product ID is required.');
    }
    if (!p['name'] || typeof p['name'] !== 'string' || p['name'].trim() === '') {
        errors.push('Product name is required.');
    }
    if (typeof p['amount'] !== 'number' || !Number.isFinite(p['amount']) || p['amount'] <= 0) {
        errors.push('Product amount must be a number greater than 0.');
    }
    if (!p['currency'] || typeof p['currency'] !== 'string' || !VALID_CURRENCY.test(p['currency'])) {
        errors.push('Product currency must be a valid 3-letter ISO code (e.g. USD).');
    }
    if (p['quantity'] !== undefined) {
        if (typeof p['quantity'] !== 'number' || !Number.isInteger(p['quantity']) || p['quantity'] < 1) {
            errors.push('Product quantity must be a positive integer when provided.');
        }
    }
    if (p['metadata'] !== undefined) {
        const metadata = validateMerchantMetadata(p['metadata']);
        if (!metadata.valid) {
            errors.push(...metadata.errors);
        }
    }
    return { valid: errors.length === 0, errors };
}

class ThemeService {
    browser = inject(BrowserGuard);
    destroyRef = inject(DestroyRef);
    _theme = signal('system', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_theme" }] : /* istanbul ignore next */ []));
    _resolvedTheme = signal('light', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_resolvedTheme" }] : /* istanbul ignore next */ []));
    theme = this._theme.asReadonly();
    resolvedTheme = this._resolvedTheme.asReadonly();
    mediaQuery = null;
    mediaListener = null;
    destroyHookRegistered = false;
    constructor() {
        this.updateResolvedTheme();
        this.setupSystemListener();
        this.registerDestroyHook();
    }
    setTheme(theme) {
        this._theme.set(theme);
        this.updateResolvedTheme();
        this.setupSystemListener();
    }
    updateResolvedTheme() {
        const theme = this._theme();
        if (theme === 'system') {
            const prefersDark = this.browser.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
            this._resolvedTheme.set(prefersDark ? 'dark' : 'light');
            return;
        }
        this._resolvedTheme.set(theme);
    }
    setupSystemListener() {
        this.teardownSystemListener();
        if (this._theme() !== 'system' || !this.browser.isBrowser) {
            return;
        }
        this.mediaQuery = this.browser.matchMedia('(prefers-color-scheme: dark)');
        if (!this.mediaQuery) {
            return;
        }
        this.mediaListener = () => this.updateResolvedTheme();
        this.mediaQuery.addEventListener('change', this.mediaListener);
    }
    registerDestroyHook() {
        if (this.destroyHookRegistered) {
            return;
        }
        this.destroyHookRegistered = true;
        this.destroyRef.onDestroy(() => this.teardownSystemListener());
    }
    teardownSystemListener() {
        if (this.mediaQuery && this.mediaListener) {
            this.mediaQuery.removeEventListener('change', this.mediaListener);
        }
        this.mediaQuery = null;
        this.mediaListener = null;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ThemeService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ThemeService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ThemeService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [] });

const PROVIDER_DISPLAY_NAMES = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    applePay: 'Apple Pay',
    googlePay: 'Google Pay',
    klarna: 'Klarna',
    affirm: 'Affirm',
};
const PROVIDER_REQUIRED_FIELD_LABEL = {
    stripe: 'publishableKey missing',
    paypal: 'clientId missing',
    applePay: 'configuration missing (requires Stripe publishableKey + createPaymentUrl)',
    googlePay: 'configuration missing (requires Stripe publishableKey for gateway)',
    klarna: 'configuration missing (requires Stripe publishableKey + klarnaCreatePaymentUrl)',
    affirm: 'configuration missing (requires Stripe publishableKey + affirmCreatePaymentUrl)',
};

class AdapterRegistry {
    adapters = new Map();
    register(adapter) {
        this.adapters.set(adapter.provider, adapter);
    }
    get(provider) {
        return this.adapters.get(provider);
    }
    getAll() {
        return Array.from(this.adapters.values());
    }
    clear() {
        this.adapters.clear();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AdapterRegistry, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AdapterRegistry, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AdapterRegistry, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
function injectAdapterRegistry() {
    return inject(AdapterRegistry);
}

const ALL_PROVIDERS = [
    'stripe',
    'paypal',
    'applePay',
    'googlePay',
    'klarna',
    'affirm',
];
class EasyPaymentsConfigValidator {
    configService = inject(EasyPaymentsConfigService);
    get config() {
        return this.configService.getSnapshot();
    }
    validateProvider(provider, providerConfig) {
        const required = PROVIDER_REQUIRED_FIELD_LABEL[provider];
        if (!providerConfig) {
            return {
                provider,
                status: 'missing',
                message: required,
            };
        }
        switch (provider) {
            case 'stripe': {
                const cfg = providerConfig;
                const key = cfg?.publishableKey?.trim() ?? '';
                if (!key) {
                    return { provider, status: 'invalid', message: required };
                }
                if (/^sk_(test|live)_/i.test(key)) {
                    return {
                        provider,
                        status: 'invalid',
                        message: 'secret key is not allowed in the frontend',
                    };
                }
                if (!/^pk_(test|live)_/i.test(key)) {
                    return {
                        provider,
                        status: 'invalid',
                        message: 'publishableKey appears invalid',
                    };
                }
                break;
            }
            case 'paypal': {
                const cfg = providerConfig;
                if (!cfg?.clientId?.trim()) {
                    return { provider, status: 'invalid', message: required };
                }
                break;
            }
            case 'applePay': {
                const cfg = providerConfig;
                // Presence of the applePay config object opts in.
                // Stripe publishableKey + createPaymentUrl are enforced by ApplePayAdapter.
                if (!cfg || typeof cfg !== 'object') {
                    return { provider, status: 'invalid', message: required };
                }
                break;
            }
            case 'googlePay': {
                const cfg = providerConfig;
                // Presence of the googlePay config object is enough to opt in.
                // Stripe publishableKey + backend URL are enforced at runtime by GooglePayAdapter.
                if (!cfg || typeof cfg !== 'object') {
                    return { provider, status: 'invalid', message: required };
                }
                if ((cfg.environment ?? 'TEST') === 'PRODUCTION' && !cfg.merchantId?.trim()) {
                    return {
                        provider,
                        status: 'invalid',
                        message: 'merchantId required for PRODUCTION',
                    };
                }
                break;
            }
            case 'klarna': {
                const cfg = providerConfig;
                // Presence of the klarna config object is enough to opt in.
                // Stripe publishableKey + klarnaCreatePaymentUrl are enforced at runtime by KlarnaAdapter.
                if (!cfg || typeof cfg !== 'object') {
                    return { provider, status: 'invalid', message: required };
                }
                break;
            }
            case 'affirm': {
                const cfg = providerConfig;
                // Presence of the affirm config object is enough to opt in.
                // Stripe publishableKey + affirmCreatePaymentUrl are enforced at runtime by AffirmAdapter.
                if (!cfg || typeof cfg !== 'object') {
                    return { provider, status: 'invalid', message: required };
                }
                break;
            }
        }
        return { provider, status: 'configured' };
    }
    validateAll(methods = [], config = this.config) {
        const providers = config?.providers ?? {};
        const requestedProviders = new Set(methods.map((method) => PAYMENT_METHOD_PROVIDER_MAP[method]));
        return ALL_PROVIDERS.map((provider) => {
            if (methods.length > 0 && !requestedProviders.has(provider)) {
                return { provider, status: 'not_requested' };
            }
            return this.validateProvider(provider, providers[provider]);
        });
    }
    /**
     * Human-readable status lines. Never includes secret values such as keys.
     */
    getStatusSummary(methods = [], config = this.config) {
        const mockMode = config?.enableMockMode === true;
        return this.validateAll(methods, config)
            .filter((result) => result.status !== 'not_requested')
            .map((result) => this.formatStatusLine(result, mockMode));
    }
    formatStatusLine(result, mockMode = false) {
        const name = PROVIDER_DISPLAY_NAMES[result.provider];
        const demoSuffix = mockMode ? ' (demo mode)' : '';
        switch (result.status) {
            case 'configured':
                return `${name}: configured${demoSuffix}`;
            case 'missing':
            case 'invalid':
                return `${name}: ${result.message ?? 'invalid configuration'}${demoSuffix}`;
            default:
                return `${name}: ${result.status}${demoSuffix}`;
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsConfigValidator, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsConfigValidator, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsConfigValidator, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

const HTTP_SCHEME = /^https?:$/i;
/**
 * Resolve a merchant backend endpoint against an optional baseUrl.
 * Uses the standard URL parser only. Does not read window, document, or location.
 */
function resolveBackendUrl(baseUrl, endpoint) {
    const endpointValue = endpoint?.trim() ?? '';
    if (!endpointValue) {
        return { ok: false, code: 'missing-endpoint' };
    }
    if (isProtocolRelative(endpointValue) || !isAllowedEndpoint(endpointValue)) {
        return { ok: false, code: 'invalid-endpoint' };
    }
    if (isAbsoluteHttpUrl(endpointValue)) {
        return { ok: true, url: endpointValue };
    }
    const baseValue = baseUrl?.trim() ?? '';
    if (!baseValue) {
        return { ok: true, url: endpointValue };
    }
    if (isProtocolRelative(baseValue) || !isAbsoluteHttpUrl(baseValue)) {
        return { ok: false, code: 'invalid-base-url' };
    }
    return { ok: true, url: joinBaseAndEndpoint(baseValue, endpointValue) };
}
/**
 * Resolved URL for availability checks and HTTP calls.
 * Invalid values warn once in development and return undefined.
 * An omitted baseUrl does not warn.
 */
function backendEndpointUrl(backend, endpoint) {
    const result = resolveBackendUrl(backend?.baseUrl, endpoint);
    if (result.ok) {
        return result.url;
    }
    warnBackendUrlIssue(result.code);
    return undefined;
}
function warnBackendUrlIssue(code) {
    if (code === 'missing-endpoint') {
        return;
    }
    if (code === 'invalid-base-url') {
        warnProviderDiagnostic('Backend', 'BACKEND_BASE_URL_INVALID', 'backend.baseUrl must be an absolute http or https URL.');
        return;
    }
    warnProviderDiagnostic('Backend', 'BACKEND_ENDPOINT_INVALID', 'A backend endpoint must be a relative path or an absolute http(s) URL.');
}
function isProtocolRelative(value) {
    return value.startsWith('//');
}
function isAllowedEndpoint(value) {
    const scheme = readScheme(value);
    if (!scheme) {
        return true;
    }
    return scheme === 'http' || scheme === 'https';
}
function isAbsoluteHttpUrl(value) {
    if (isProtocolRelative(value)) {
        return false;
    }
    const scheme = readScheme(value);
    if (!scheme || !HTTP_SCHEME.test(`${scheme}:`)) {
        return false;
    }
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function readScheme(value) {
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
    return match?.[1].toLowerCase();
}
function joinBaseAndEndpoint(base, endpoint) {
    const parsed = new URL(base);
    const path = parsed.pathname.replace(/\/+$/, '');
    const relative = endpoint.replace(/^\/+/, '');
    return `${parsed.origin}${path}/${relative}`;
}

class BackendService {
    http = inject(HttpClient, { optional: true });
    configService = inject(EasyPaymentsConfigService);
    get createPaymentUrl() {
        return this.endpointUrl('createPaymentUrl');
    }
    get paypalCreateOrderUrl() {
        return this.endpointUrl('paypalCreateOrderUrl');
    }
    get paypalCaptureOrderUrl() {
        return this.endpointUrl('paypalCaptureOrderUrl');
    }
    get klarnaCreatePaymentUrl() {
        return this.endpointUrl('klarnaCreatePaymentUrl');
    }
    get affirmCreatePaymentUrl() {
        return this.endpointUrl('affirmCreatePaymentUrl');
    }
    /** @deprecated Prefer createPaymentUrl. Kept optional for future provider flows. */
    get confirmPaymentUrl() {
        return this.endpointUrl('confirmPaymentUrl');
    }
    async createStripePayment(payload) {
        const url = this.requireEndpoint('createPaymentUrl', 'Backend createPaymentUrl is not configured.', 'card', 'stripe');
        const { metadata, ...rest } = payload;
        const validatedMetadata = assertMerchantMetadata(metadata, 'card', 'stripe');
        return this.postJson(url, validatedMetadata ? { ...rest, metadata: validatedMetadata } : rest, 'card', 'stripe', {
            successMessage: 'Failed to create payment on backend.',
            networkMessage: 'A network error occurred while creating the payment session.',
            validate: (response) => {
                if (response?.provider !== 'stripe' ||
                    typeof response.clientSecret !== 'string' ||
                    !response.clientSecret.trim()) {
                    throw new PaymentError({
                        code: 'BACKEND_ERROR',
                        message: 'Invalid Stripe create-payment response from backend.',
                        method: 'card',
                        provider: 'stripe',
                    });
                }
            },
        });
    }
    /**
     * Posts the PayPal create-order wire contract.
     * Forwards `orderReference` only. Never forwards a metadata map or a client amount.
     */
    async createPayPalOrder(payload) {
        const url = this.requireEndpoint('paypalCreateOrderUrl', 'Backend paypalCreateOrderUrl is not configured.', 'paypal', 'paypal');
        const body = toPayPalCreateOrderRequest(payload);
        if (body.orderReference) {
            body.orderReference = assertPayPalOrderReference(body.orderReference);
        }
        return this.postJson(url, body, 'paypal', 'paypal', {
            successMessage: 'Failed to create PayPal order on backend.',
            networkMessage: 'A network error occurred while creating the PayPal order.',
            validate: (response) => {
                if (response?.provider !== 'paypal' ||
                    typeof response.orderId !== 'string' ||
                    !response.orderId.trim()) {
                    throw new PaymentError({
                        code: 'BACKEND_ERROR',
                        message: 'Invalid PayPal create-order response from backend.',
                        method: 'paypal',
                        provider: 'paypal',
                    });
                }
            },
        });
    }
    async capturePayPalOrder(orderId) {
        const url = this.requireEndpoint('paypalCaptureOrderUrl', 'Backend paypalCaptureOrderUrl is not configured.', 'paypal', 'paypal');
        const id = orderId?.trim();
        if (!id) {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'PayPal orderId is required to capture payment.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        return this.postJson(url, { orderId: id }, 'paypal', 'paypal', {
            successMessage: 'Failed to capture PayPal order on backend.',
            networkMessage: 'A network error occurred while capturing the PayPal payment.',
            validate: (response) => {
                if (response?.provider !== 'paypal' ||
                    typeof response.orderId !== 'string' ||
                    !response.orderId.trim() ||
                    typeof response.captureId !== 'string' ||
                    !response.captureId.trim()) {
                    throw new PaymentError({
                        code: 'BACKEND_ERROR',
                        message: 'Invalid PayPal capture response from backend.',
                        method: 'paypal',
                        provider: 'paypal',
                    });
                }
            },
        });
    }
    /**
     * Posts the Klarna create-payment wire contract.
     * Forwards validated merchant metadata only. Never forwards a client amount.
     */
    async createKlarnaPayment(payload) {
        const url = this.requireEndpoint('klarnaCreatePaymentUrl', 'Backend klarnaCreatePaymentUrl is not configured.', 'klarna', 'klarna');
        const body = toKlarnaCreatePaymentRequest(payload);
        if (body.metadata) {
            body.metadata = assertMerchantMetadata(body.metadata, 'klarna', 'klarna');
        }
        return this.postJson(url, body, 'klarna', 'klarna', {
            successMessage: 'Failed to create Klarna payment on backend.',
            networkMessage: 'A network error occurred while creating the Klarna payment session.',
            validate: (response) => {
                if (response?.provider !== 'klarna' ||
                    typeof response.clientSecret !== 'string' ||
                    !response.clientSecret.trim()) {
                    throw new PaymentError({
                        code: 'BACKEND_ERROR',
                        message: 'Invalid Klarna create-payment response from backend.',
                        method: 'klarna',
                        provider: 'klarna',
                    });
                }
            },
        });
    }
    /**
     * Posts the Affirm create-payment wire contract.
     * Forwards validated merchant metadata only. Never forwards a client amount.
     */
    async createAffirmPayment(payload) {
        const url = this.requireEndpoint('affirmCreatePaymentUrl', 'Backend affirmCreatePaymentUrl is not configured.', 'affirm', 'affirm');
        const body = toAffirmCreatePaymentRequest(payload);
        if (body.metadata) {
            body.metadata = assertMerchantMetadata(body.metadata, 'affirm', 'affirm');
        }
        return this.postJson(url, body, 'affirm', 'affirm', {
            successMessage: 'Failed to create Affirm payment on backend.',
            networkMessage: 'A network error occurred while creating the Affirm payment session.',
            validate: (response) => {
                if (response?.provider !== 'affirm' ||
                    typeof response.clientSecret !== 'string' ||
                    !response.clientSecret.trim()) {
                    throw new PaymentError({
                        code: 'BACKEND_ERROR',
                        message: 'Invalid Affirm create-payment response from backend.',
                        method: 'affirm',
                        provider: 'affirm',
                    });
                }
            },
        });
    }
    endpointUrl(key) {
        const backend = this.configService.getSnapshot().backend;
        return backendEndpointUrl(backend, backend?.[key]);
    }
    requireEndpoint(key, missingMessage, method, provider) {
        const backend = this.configService.getSnapshot().backend;
        const result = resolveBackendUrl(backend?.baseUrl, backend?.[key]);
        if (result.ok) {
            return result.url;
        }
        if (result.code === 'missing-endpoint') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: missingMessage,
                method,
                provider,
            });
        }
        warnBackendUrlIssue(result.code);
        throw new PaymentError({
            code: 'CONFIG_INVALID',
            message: result.code === 'invalid-base-url'
                ? 'backend.baseUrl must be an absolute http or https URL.'
                : `${missingMessage.replace(' is not configured.', '')} must be a relative path or an absolute http(s) URL.`,
            method,
            provider,
        });
    }
    async postJson(url, payload, method, provider, options) {
        if (!this.http) {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'HttpClient is required for backend integration. Call provideHttpClient() in your app config.',
                method,
                provider,
            });
        }
        try {
            const response = await firstValueFrom(this.http.post(url, payload));
            options.validate(response);
            return response;
        }
        catch (error) {
            if (error instanceof PaymentError) {
                throw error;
            }
            const network = error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
            let message = network ? options.networkMessage : options.successMessage;
            if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
                const body = error.error;
                if (body && typeof body === 'object' && body.message) {
                    message = Array.isArray(body.message) ? body.message.join('; ') : String(body.message);
                }
                else if (typeof body === 'string' && body.trim()) {
                    message = body;
                }
            }
            throw new PaymentError({
                code: network ? 'NETWORK_ERROR' : 'BACKEND_ERROR',
                message,
                method,
                provider,
                originalError: error,
            });
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: BackendService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: BackendService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: BackendService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/**
 * Controls mock/demo payment behavior.
 *
 * Mock adapters implement the same PaymentProviderAdapter contract as real
 * providers. This controller never processes a real payment.
 */
class MockPaymentController {
    _outcome = signal('success', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_outcome" }] : /* istanbul ignore next */ []));
    _unavailableMethods = signal(new Set(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_unavailableMethods" }] : /* istanbul ignore next */ []));
    _delayMs = signal(0, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_delayMs" }] : /* istanbul ignore next */ []));
    outcome = this._outcome.asReadonly();
    unavailableMethods = this._unavailableMethods.asReadonly();
    delayMs = this._delayMs.asReadonly();
    setOutcome(outcome) {
        this._outcome.set(outcome);
    }
    setUnavailableMethods(methods) {
        this._unavailableMethods.set(new Set(methods));
    }
    setDelay(ms) {
        this._delayMs.set(Math.max(0, ms));
    }
    isMethodAvailable(method) {
        return !this._unavailableMethods().has(method);
    }
    reset() {
        this._outcome.set('success');
        this._unavailableMethods.set(new Set());
        this._delayMs.set(0);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: MockPaymentController, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: MockPaymentController, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: MockPaymentController, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

function realPaymentsNotImplemented(method, provider) {
    return new PaymentError({
        code: 'PROVIDER_NOT_IMPLEMENTED',
        message: `Real ${method} payments are not implemented yet. Use enableMockMode for development. No real payment was processed.`,
        method,
        provider,
    });
}
class BaseMockAdapter {
    isMock = true;
    mockController = inject(MockPaymentController);
    async initialize() {
        // Mock adapters require no SDK initialization.
    }
    async isAvailable(_context) {
        return this.mockController.isMethodAvailable(this.method);
    }
    async createPayment(request) {
        const delay = this.mockController.delayMs();
        if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
        const outcome = this.mockController.outcome();
        const demoNotice = 'No real payment was processed.';
        if (outcome === 'cancelled') {
            return normalizePaymentResult({
                status: 'cancelled',
                method: request.method,
                provider: this.provider,
                message: `[DEMO] Mock ${this.method} payment was cancelled. ${demoNotice}`,
                metadata: {
                    mock: true,
                    productId: request.context.product.id,
                },
            });
        }
        if (outcome === 'failed') {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: `[DEMO] Mock ${this.method} payment failed. ${demoNotice}`,
                method: request.method,
                provider: this.provider,
            });
        }
        return normalizePaymentResult({
            status: 'success',
            method: request.method,
            provider: this.provider,
            transactionId: `mock_${this.provider}_${Date.now()}`,
            message: `[DEMO] Mock ${this.method} payment completed. This is not a real transaction. ${demoNotice}`,
            metadata: {
                mock: true,
                productId: request.context.product.id,
                amount: request.context.product.amount,
                currency: request.context.product.currency,
            },
        });
    }
}
class BaseProviderAdapter {
    isMock = false;
    initialized = false;
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error(`${this.provider} adapter is not initialized.`);
        }
    }
}

function mapResolvedThemeToStripeAppearance(theme) {
    return {
        theme: theme === 'dark' ? 'night' : 'stripe',
        variables: {
            borderRadius: '8px',
        },
    };
}
function stripeAppearanceThemeName(theme) {
    return theme === 'dark' ? 'night' : 'stripe';
}
/**
 * Payment Element options for Easy Payments `card`.
 * Method availability is primarily controlled by the PaymentIntent
 * (`payment_method_types: ['card']`). These options keep wallets / Link off so
 * shoppers see the traditional card-entry fields (not a saved Link card).
 * Link remains controllable in the Stripe Dashboard; we disable it here for a
 * predictable card form in both Full Checkout and Buttons Only.
 */
const STRIPE_PAYMENT_ELEMENT_OPTIONS = {
    layout: {
        type: 'tabs',
    },
    wallets: {
        applePay: 'never',
        googlePay: 'never',
        link: 'never',
    },
};
const DEFAULT_STRIPE_LOCALE = 'auto';
/**
 * Stable session identity for Stripe PaymentIntent reuse.
 * Theme is intentionally excluded — appearance updates must not recreate intents.
 */
function buildStripeSessionKey(product, checkout) {
    const quantity = product.quantity ?? 1;
    const email = checkout?.customer?.email ?? '';
    const name = checkout?.customer?.name ?? '';
    return appendMetadataSessionPart([product.id, quantity, product.currency, product.amount, email, name].join('|'), product.metadata);
}

/**
 * Page-level guard: at most one Stripe confirmation (card, Klarna, Affirm,
 * Google Pay, Apple Pay) may be in flight at a time across every checkout host.
 *
 * Stripe.js confirmations can redirect the whole page (3DS, Klarna, Affirm), so a
 * second concurrent confirmation could be abandoned mid-flight. A rejected attempt
 * never reaches Stripe, so nothing is submitted and nothing is retried automatically.
 */
class StripeConfirmationGate {
    holder = null;
    /** Throws a PaymentError on the caller's host when another confirmation is in flight. */
    acquire(ownerId, method, provider) {
        if (this.holder !== null) {
            throw new PaymentError({
                code: this.holder === ownerId ? 'PAYMENT_FAILED' : 'PROVIDER_UNAVAILABLE',
                message: this.holder === ownerId
                    ? 'A payment confirmation is already in progress.'
                    : 'Another payment is already being confirmed on this page. Wait for it to finish, then try again.',
                method,
                provider,
            });
        }
        this.holder = ownerId;
        let released = false;
        return () => {
            if (released) {
                return;
            }
            released = true;
            if (this.holder === ownerId) {
                this.holder = null;
            }
        };
    }
    isHeld() {
        return this.holder !== null;
    }
    isHeldBy(ownerId) {
        return this.holder === ownerId;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeConfirmationGate, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeConfirmationGate, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeConfirmationGate, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/** Owner used when a caller does not pass an ownerId (legacy single-host behaviour). */
const LEGACY_STRIPE_ELEMENT_OWNER = 'legacy';
/**
 * Owner-scoped Payment Element sessions for a root (shared) Stripe adapter.
 * Each host component gets its own Elements group, PaymentIntent and confirm flag,
 * so one host can neither confirm nor unmount another host's payment.
 */
class StripeElementSessionStore {
    sessions = new Map();
    get(ownerId = LEGACY_STRIPE_ELEMENT_OWNER) {
        let session = this.sessions.get(ownerId);
        if (!session) {
            session = {
                elements: null,
                paymentElement: null,
                clientSecret: null,
                sessionId: undefined,
                paymentIntentId: undefined,
                confirming: false,
            };
            this.sessions.set(ownerId, session);
        }
        return session;
    }
    peek(ownerId = LEGACY_STRIPE_ELEMENT_OWNER) {
        return this.sessions.get(ownerId);
    }
    unmount(ownerId = LEGACY_STRIPE_ELEMENT_OWNER) {
        const session = this.sessions.get(ownerId);
        if (!session) {
            return;
        }
        unmountSession(session);
    }
    /** Destroys one owner's session, or every session when ownerId is omitted. */
    destroy(ownerId) {
        if (ownerId === undefined) {
            for (const session of this.sessions.values()) {
                unmountSession(session);
            }
            this.sessions.clear();
            return;
        }
        const session = this.sessions.get(ownerId);
        if (session) {
            unmountSession(session);
            this.sessions.delete(ownerId);
        }
    }
    size() {
        return this.sessions.size;
    }
}
function unmountSession(session) {
    try {
        session.paymentElement?.unmount();
    }
    catch {
        // Element may already be unmounted.
    }
    session.paymentElement = null;
    session.elements = null;
}

function looksLikeSecretKey$2(value) {
    return /^sk_(test|live)_/i.test(value.trim());
}
function looksLikePublishableKey$2(value) {
    return /^pk_(test|live)_/i.test(value.trim());
}
class StripeCardAdapter extends BaseProviderAdapter {
    provider = 'stripe';
    configService = inject(EasyPaymentsConfigService);
    backend = inject(BackendService);
    browser = inject(BrowserGuard);
    sdkLoader = inject(StripeSdkLoader);
    gate = inject(StripeConfirmationGate);
    stripe = null;
    sessions = new StripeElementSessionStore();
    loadPromise = null;
    configReady = false;
    /**
     * Validates Stripe frontend config only. Does not load Stripe.js until needed.
     */
    async initialize() {
        const stripeConfig = this.configService.getSnapshot().providers?.stripe;
        const key = stripeConfig?.publishableKey?.trim() ?? '';
        if (!key) {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        if (looksLikeSecretKey$2(key)) {
            this.configReady = false;
            this.initialized = false;
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Stripe secret keys must never be used in Angular. Provide a publishable key (pk_...) only.',
                method: 'card',
                provider: 'stripe',
            });
        }
        this.configReady = true;
        this.initialized = true;
    }
    async isAvailable(_context) {
        const snapshot = this.configService.getSnapshot();
        const key = snapshot.providers?.stripe?.publishableKey?.trim() ?? '';
        if (!key || looksLikeSecretKey$2(key) || !this.configReady) {
            return false;
        }
        if (!backendEndpointUrl(snapshot.backend, snapshot.backend?.createPaymentUrl)) {
            return false;
        }
        return true;
    }
    /**
     * Interactive Stripe Payment Element flow is handled by StripeCardPaymentComponent.
     * Calling createPayment directly is not supported for real card payments.
     */
    async createPayment(_request) {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Stripe card payments require the secure Payment Element UI. Use the card method inside <easy-payments>.',
            method: 'card',
            provider: 'stripe',
        });
    }
    async ensureStripeLoaded() {
        if (this.stripe) {
            return this.stripe;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        const key = this.configService.getSnapshot().providers?.stripe?.publishableKey?.trim() ?? '';
        if (!key) {
            throw new PaymentError({
                code: 'CONFIG_MISSING',
                message: 'Stripe publishableKey is missing.',
                method: 'card',
                provider: 'stripe',
            });
        }
        if (looksLikeSecretKey$2(key)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Stripe secret keys must never be used in Angular. Provide a publishable key (pk_...) only.',
                method: 'card',
                provider: 'stripe',
            });
        }
        if (!looksLikePublishableKey$2(key)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Stripe publishableKey appears invalid. Expected a pk_test_... or pk_live_... value.',
                method: 'card',
                provider: 'stripe',
            });
        }
        if (!this.browser.isBrowser) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Stripe.js can only load in the browser.',
                method: 'card',
                provider: 'stripe',
            });
        }
        this.loadPromise = (async () => {
            try {
                const stripe = await this.sdkLoader.load(key);
                if (!stripe) {
                    throw new PaymentError({
                        code: 'SDK_LOAD_FAILED',
                        message: 'Stripe.js failed to initialize.',
                        method: 'card',
                        provider: 'stripe',
                    });
                }
                this.stripe = stripe;
                return stripe;
            }
            catch (error) {
                this.loadPromise = null;
                if (error instanceof PaymentError) {
                    throw error;
                }
                throw new PaymentError({
                    code: 'SDK_LOAD_FAILED',
                    message: 'Stripe.js failed to load.',
                    method: 'card',
                    provider: 'stripe',
                    originalError: error,
                });
            }
        })();
        return this.loadPromise;
    }
    async createPaymentSession(product, checkout, ownerId) {
        if (!this.configService.getSnapshot().backend?.createPaymentUrl?.trim()) {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend createPaymentUrl is not configured.',
                method: 'card',
                provider: 'stripe',
            });
        }
        const payload = {
            provider: 'stripe',
            productId: product.id,
            quantity: product.quantity ?? 1,
            currency: product.currency,
            // Sent for local demos only — production backends must re-price server-side.
            amount: product.amount,
            metadata: buildStripeRequestMetadata(product.metadata, {
                productName: product.name,
                productDescription: product.description,
                customerEmail: checkout?.customer?.email,
                customerName: checkout?.customer?.name,
            }, 'card', 'stripe'),
        };
        const response = await this.backend.createStripePayment(payload);
        this.assertValidStripeResponse(response);
        const session = this.sessions.get(ownerId);
        session.clientSecret = response.clientSecret;
        session.sessionId = response.sessionId;
        session.paymentIntentId = response.paymentIntentId;
        return {
            clientSecret: response.clientSecret,
            sessionId: response.sessionId,
            paymentIntentId: response.paymentIntentId,
        };
    }
    async mountPaymentElement(container, clientSecret, theme, locale, ownerId) {
        const stripe = await this.ensureStripeLoaded();
        this.sessions.unmount(ownerId);
        const session = this.sessions.get(ownerId);
        try {
            session.clientSecret = clientSecret;
            const elements = stripe.elements({
                clientSecret,
                appearance: mapResolvedThemeToStripeAppearance(theme),
                ...(locale ? { locale: locale } : {}),
            });
            session.elements = elements;
            session.paymentElement = elements.create('payment', STRIPE_PAYMENT_ELEMENT_OPTIONS);
            session.paymentElement.mount(container);
        }
        catch (error) {
            throw new PaymentError({
                code: 'SDK_LOAD_FAILED',
                message: 'Stripe Payment Element failed to initialize.',
                method: 'card',
                provider: 'stripe',
                originalError: error,
            });
        }
    }
    async updateAppearance(theme, ownerId) {
        const elements = this.sessions.peek(ownerId)?.elements;
        if (!elements) {
            return;
        }
        elements.update({
            appearance: mapResolvedThemeToStripeAppearance(theme),
        });
    }
    async confirmPayment(returnUrl, ownerId) {
        const session = this.sessions.get(ownerId);
        if (session.confirming) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'A Stripe payment confirmation is already in progress.',
                method: 'card',
                provider: 'stripe',
            });
        }
        const release = this.gate.acquire(`card:${ownerId ?? 'legacy'}`, 'card', 'stripe');
        session.confirming = true;
        try {
            const stripe = await this.ensureStripeLoaded();
            const elements = session.elements;
            if (!elements) {
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Stripe Payment Element is not ready.',
                    method: 'card',
                    provider: 'stripe',
                });
            }
            const { error: submitError } = await elements.submit();
            if (submitError) {
                throw mapStripeError(submitError);
            }
            const resolvedReturnUrl = returnUrl?.trim()
                ? resolveSameOriginStripeReturnUrl(returnUrl, undefined, 'card').href
                : this.browser.isBrowser
                    ? `${window.location.origin}${window.location.pathname}`
                    : undefined;
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: resolvedReturnUrl
                    ? {
                        return_url: resolvedReturnUrl,
                    }
                    : undefined,
                redirect: 'if_required',
            });
            if (error) {
                throw mapStripeError(error);
            }
            return this.normalizeIntent(paymentIntent, session);
        }
        finally {
            session.confirming = false;
            release();
        }
    }
    isConfirming(ownerId) {
        return this.sessions.peek(ownerId)?.confirming ?? false;
    }
    unmountPaymentElement(ownerId) {
        this.sessions.unmount(ownerId);
    }
    hasMountedElement(ownerId) {
        const session = this.sessions.peek(ownerId);
        return !!session?.elements && !!session.paymentElement;
    }
    /** Destroys one host's session, or every session (adapter re-init) when ownerId is omitted. */
    async destroy(ownerId) {
        this.sessions.destroy(ownerId);
    }
    assertValidStripeResponse(response) {
        if (!response || typeof response !== 'object') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend returned an invalid Stripe payment response.',
                method: 'card',
                provider: 'stripe',
            });
        }
        if (response.provider && response.provider !== 'stripe') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend response provider must be "stripe".',
                method: 'card',
                provider: 'stripe',
            });
        }
        if (!response.clientSecret || typeof response.clientSecret !== 'string') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend did not return a Stripe clientSecret.',
                method: 'card',
                provider: 'stripe',
            });
        }
    }
    normalizeIntent(paymentIntent, session) {
        const status = paymentIntent?.status;
        if (status === 'processing') {
            // Not success and not a definitive failure. Do not retry; backend/webhook is authoritative.
            return normalizePaymentResult({
                status: 'processing',
                method: 'card',
                provider: 'stripe',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Card payment is still processing. Do not retry — confirm the final status on your backend.',
                metadata: { stripeStatus: status },
            });
        }
        if (status === 'succeeded') {
            return normalizePaymentResult({
                status: 'success',
                method: 'card',
                provider: 'stripe',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Card payment completed successfully.',
                metadata: {
                    stripeStatus: status,
                },
            });
        }
        if (status === 'requires_capture') {
            // Public status stays "success" for compatibility; metadata marks authorization-only.
            return normalizePaymentResult({
                status: 'success',
                method: 'card',
                provider: 'stripe',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Card payment is authorized and requires capture. Confirm capture and fulfillment on your backend — this is not proof of captured funds.',
                metadata: {
                    stripeStatus: status,
                    authorizationOnly: true,
                },
            });
        }
        if (status === 'canceled') {
            return normalizePaymentResult({
                status: 'cancelled',
                method: 'card',
                provider: 'stripe',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Card payment was cancelled.',
            });
        }
        throw new PaymentError({
            code: 'PAYMENT_FAILED',
            message: `Unexpected PaymentIntent status: ${status ?? 'unknown'}.`,
            method: 'card',
            provider: 'stripe',
            originalError: paymentIntent,
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
class StripeCardMockAdapter extends BaseMockAdapter {
    provider = 'stripe';
    method = 'card';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardMockAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardMockAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardMockAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/** Redact common secret-bearing query params from SDK URLs used in Error messages. */
function redactSdkUrl(src) {
    return src
        .replace(/([?&]client-id=)[^&]*/gi, '$1REDACTED')
        .replace(/([?&]client_id=)[^&]*/gi, '$1REDACTED')
        .replace(/([?&]publishable[_-]?key=)[^&]*/gi, '$1REDACTED');
}
class SdkLoaderService {
    browser = inject(BrowserGuard);
    loadedScripts = new Map();
    loadScript(options) {
        if (!this.browser.isBrowser) {
            return Promise.reject(new Error('SDK loading is only available in the browser.'));
        }
        const existing = this.loadedScripts.get(options.id);
        if (existing) {
            return existing;
        }
        const promise = this.loadScriptOnce(options).catch((error) => {
            // Allow a later retry after a network / script failure.
            this.loadedScripts.delete(options.id);
            throw error;
        });
        this.loadedScripts.set(options.id, promise);
        return promise;
    }
    isLoaded(id) {
        return this.loadedScripts.has(id);
    }
    /** Removes a previously loaded script so a new `src` (e.g. locale) can load under a new id. */
    unloadScript(id) {
        this.loadedScripts.delete(id);
        if (!this.browser.isBrowser) {
            return;
        }
        this.browser.getDocument()?.getElementById(id)?.remove();
    }
    loadScriptOnce(options) {
        return new Promise((resolve, reject) => {
            const doc = this.browser.getDocument();
            if (!doc) {
                reject(new Error('Document is not available.'));
                return;
            }
            const existingScript = doc.getElementById(options.id);
            if (existingScript) {
                // Stale tags (e.g. a previous failed attempt) must not short-circuit as success.
                existingScript.remove();
            }
            const script = doc.createElement('script');
            script.id = options.id;
            script.src = options.src;
            script.async = options.async ?? true;
            script.defer = options.defer ?? false;
            if (options.attributes) {
                for (const [key, value] of Object.entries(options.attributes)) {
                    script.setAttribute(key, value);
                }
            }
            let settled = false;
            let timeoutId;
            const settle = (fn) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                }
                fn();
            };
            script.onload = () => settle(() => resolve());
            script.onerror = () => settle(() => {
                script.remove();
                reject(new Error(`Failed to load SDK: ${redactSdkUrl(options.src)}`));
            });
            if (options.timeoutMs !== undefined && options.timeoutMs > 0) {
                timeoutId = setTimeout(() => {
                    settle(() => {
                        script.remove();
                        reject(new Error(`Timed out loading SDK after ${options.timeoutMs}ms: ${redactSdkUrl(options.src)}`));
                    });
                }, options.timeoutMs);
            }
            doc.head.appendChild(script);
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: SdkLoaderService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: SdkLoaderService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: SdkLoaderService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/**
 * Stripe.js Elements `locale` option.
 * @see https://docs.stripe.com/js/appendix/supported_locales
 */
function toStripeElementsLocale(locale) {
    switch (locale) {
        case 'es':
            return 'es';
        case 'pt':
            return 'pt-BR';
        case 'en':
        default:
            return 'en';
    }
}
/**
 * PayPal JS SDK `locale` query parameter (underscore form).
 * @see https://developer.paypal.com/sdk/js/configuration/#locale
 */
function toPayPalSdkLocale(locale) {
    switch (locale) {
        case 'es':
            return 'es_ES';
        case 'pt':
            return 'pt_BR';
        case 'en':
        default:
            return 'en_US';
    }
}
/**
 * Google Pay Web `ButtonOptions.buttonLocale` (ISO 639-1).
 * Controls official button text only — not the Google-hosted payment sheet.
 * @see https://developers.google.com/pay/api/web/reference/request-objects#ButtonOptions
 */
function toGooglePayButtonLocale(locale) {
    switch (locale) {
        case 'es':
            return 'es';
        case 'pt':
            return 'pt';
        case 'en':
        default:
            return 'en';
    }
}
/**
 * BCP-47 style language-region tags used as Stripe BNPL locale hints
 * (e.g. documentation / Affirm preferred_locale when underscore form is derived).
 */
function toStripeBnplLocale(locale) {
    switch (locale) {
        case 'es':
            return 'es-ES';
        case 'pt':
            return 'pt-BR';
        case 'en':
        default:
            return 'en-US';
    }
}
/**
 * Stripe Klarna `payment_method_options.klarna.preferred_locale`.
 * Must be a language-country pair Stripe accepts for the purchase/billing country.
 * Invalid combinations are ignored by Stripe (country default language wins).
 * @see https://docs.stripe.com/payments/klarna/accept-a-payment
 */
function toKlarnaPreferredLocale(locale, purchaseCountry = 'US') {
    const country = purchaseCountry.trim().toUpperCase() || 'US';
    if (locale === 'es') {
        return `es-${country}`;
    }
    if (locale === 'pt') {
        if (country === 'BR' || country === 'PT') {
            return `pt-${country}`;
        }
        // Portuguese is not a standard Klarna locale for most other countries (e.g. US).
        return `en-${country}`;
    }
    return `en-${country}`;
}
/**
 * Stripe Affirm `payment_method_options.affirm.preferred_locale`.
 * Affirm’s documented US/CA page languages are limited (typically `en_US` / `en_CA` / `fr_CA`).
 * Easy Payments does not invent unsupported Affirm locales for `es` / `pt`.
 * @see https://docs.stripe.com/api/payment_intents/create#create_payment_intent-payment_method_options-affirm-preferred_locale
 */
function toAffirmPreferredLocale(locale, purchaseCountry = 'US') {
    const country = purchaseCountry.trim().toUpperCase() || 'US';
    if (country === 'CA') {
        return 'en_CA';
    }
    void locale;
    return 'en_US';
}

/**
 * Maps PayPal JS SDK / REST failures into PaymentError without leaking raw payloads to UI.
 */
function mapPayPalError(error, fallbackCode = 'PAYMENT_FAILED', fallbackMessage = 'PayPal payment failed.') {
    if (error instanceof PaymentError) {
        return error;
    }
    const message = error instanceof Error
        ? error.message
        : typeof error === 'string'
            ? error
            : fallbackMessage;
    const lower = message.toLowerCase();
    if (lower.includes('cancel') ||
        lower.includes('closed') ||
        lower.includes('window closed') ||
        lower.includes('popup closed')) {
        return new PaymentError({
            code: 'PAYMENT_CANCELLED',
            message: 'PayPal checkout was cancelled.',
            method: 'paypal',
            provider: 'paypal',
            originalError: error,
        });
    }
    if (lower.includes('network') || lower.includes('failed to fetch')) {
        return new PaymentError({
            code: 'NETWORK_ERROR',
            message: 'A network error occurred during PayPal checkout.',
            method: 'paypal',
            provider: 'paypal',
            originalError: error,
        });
    }
    // Script/network load only — do not treat Buttons create/render messages as SDK load.
    if (lower.includes('failed to load sdk') ||
        lower.includes('sdk failed to load') ||
        lower.includes('sdk script') ||
        lower.includes('window.paypal') ||
        lower.includes('sdk load timed out') ||
        lower.includes('timed out loading')) {
        return new PaymentError({
            code: 'SDK_LOAD_FAILED',
            message: 'PayPal SDK failed to load.',
            method: 'paypal',
            provider: 'paypal',
            originalError: error,
        });
    }
    if (lower.includes('declin')) {
        return new PaymentError({
            code: 'PAYMENT_FAILED',
            message: 'The PayPal payment was declined.',
            method: 'paypal',
            provider: 'paypal',
            originalError: error,
        });
    }
    if (lower.includes('duplicate') || lower.includes('already captured')) {
        return new PaymentError({
            code: 'PAYMENT_FAILED',
            message: 'This PayPal order was already captured.',
            method: 'paypal',
            provider: 'paypal',
            originalError: error,
        });
    }
    return new PaymentError({
        code: fallbackCode,
        message: message || fallbackMessage,
        method: 'paypal',
        provider: 'paypal',
        originalError: error,
    });
}

/**
 * PayPal JS SDK rejects non-numeric `height` and `tagline` with vertical layout.
 * Coerce CSS-like values and drop incompatible fields before `Buttons()`.
 */
function sanitizePayPalButtonStyle(style) {
    const next = { ...style };
    if ('height' in next) {
        const raw = next.height;
        let height;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            height = raw;
        }
        else if (typeof raw === 'string') {
            const parsed = Number.parseInt(raw, 10);
            height = Number.isFinite(parsed) ? parsed : undefined;
        }
        else {
            height = undefined;
        }
        if (height === undefined) {
            delete next.height;
        }
        else {
            next.height = Math.min(55, Math.max(25, Math.round(height)));
        }
    }
    if (next.layout !== 'horizontal') {
        delete next.tagline;
    }
    return next;
}
const LEGACY_PAYPAL_OWNER = 'paypal-legacy';
class PayPalAdapter extends BaseProviderAdapter {
    provider = 'paypal';
    configService = inject(EasyPaymentsConfigService);
    backend = inject(BackendService);
    sdkLoader = inject(SdkLoaderService);
    browser = inject(BrowserGuard);
    configReady = false;
    loadPromise = null;
    /** PayPal SDK locale last successfully loaded (underscore form, e.g. en_US). */
    loadedSdkLocale = null;
    /**
     * Per-host official Buttons mounts. Destroying one host must not close another's.
     * Keyed by opaque mount ids owned by PayPalPaymentComponent instances.
     */
    buttonMounts = new Map();
    nextMountId = 0;
    creatingOwners = new Set();
    capturingOrders = new Set();
    activeOrderId = null;
    /**
     * Validates frontend PayPal config only. Does not load the JS SDK until needed.
     */
    async initialize() {
        const clientId = this.configService.getSnapshot().providers?.paypal?.clientId?.trim() ?? '';
        this.configReady = !!clientId;
        this.initialized = this.configReady;
    }
    async isAvailable(_context) {
        const snapshot = this.configService.getSnapshot();
        const clientId = snapshot.providers?.paypal?.clientId?.trim() ?? '';
        if (!clientId || !this.configReady) {
            return false;
        }
        if (!backendEndpointUrl(snapshot.backend, snapshot.backend?.paypalCreateOrderUrl)) {
            return false;
        }
        if (!backendEndpointUrl(snapshot.backend, snapshot.backend?.paypalCaptureOrderUrl)) {
            return false;
        }
        return true;
    }
    /**
     * Interactive PayPal Buttons flow is handled by PayPalPaymentComponent.
     */
    async createPayment(_request) {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'PayPal payments require the official PayPal Buttons UI. Use the paypal method inside <easy-payments>.',
            method: 'paypal',
            provider: 'paypal',
        });
    }
    async ensureSdkLoaded(locale = 'en') {
        if (!this.browser.isBrowser) {
            throw new PaymentError({
                code: 'SDK_LOAD_FAILED',
                message: 'PayPal SDK can only load in the browser.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        const paypalLocale = toPayPalSdkLocale(locale);
        const scriptId = `easy-payments-paypal-sdk-${paypalLocale}`;
        if (this.loadedSdkLocale === paypalLocale) {
            const existing = this.browser.getWindow()?.paypal;
            if (existing?.Buttons) {
                return existing;
            }
            this.loadPromise = null;
        }
        else if (this.loadedSdkLocale) {
            this.unloadSdk(this.loadedSdkLocale);
            this.loadPromise = null;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        const paypalConfig = this.configService.getSnapshot().providers?.paypal;
        const clientId = paypalConfig?.clientId?.trim() ?? '';
        if (!clientId) {
            throw new PaymentError({
                code: 'CONFIG_MISSING',
                message: 'PayPal clientId is not configured.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        const currency = (paypalConfig?.currency ?? 'USD').trim().toUpperCase() || 'USD';
        const intent = paypalConfig?.intent ?? 'capture';
        this.loadPromise = (async () => {
            try {
                await this.sdkLoader.loadScript({
                    id: scriptId,
                    src: `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=${encodeURIComponent(intent)}&components=buttons&locale=${encodeURIComponent(paypalLocale)}`,
                    // Surface hangs (adblock / DNS / captive portal) as a timeout instead of spinning forever.
                    timeoutMs: 20_000,
                });
            }
            catch (error) {
                this.loadPromise = null;
                this.loadedSdkLocale = null;
                this.sdkLoader.unloadScript(scriptId);
                throw mapPayPalError(error, 'SDK_LOAD_FAILED', 'PayPal SDK script failed to load.');
            }
            const paypal = this.browser.getWindow()?.paypal;
            if (!paypal?.Buttons) {
                this.loadPromise = null;
                this.loadedSdkLocale = null;
                this.sdkLoader.unloadScript(scriptId);
                throw new PaymentError({
                    code: 'SDK_LOAD_FAILED',
                    message: 'PayPal SDK script finished loading but window.paypal.Buttons is unavailable.',
                    method: 'paypal',
                    provider: 'paypal',
                });
            }
            this.loadedSdkLocale = paypalLocale;
            return paypal;
        })();
        return this.loadPromise;
    }
    unloadSdk(previousLocale) {
        const win = this.browser.getWindow();
        if (win?.paypal) {
            delete win.paypal;
        }
        this.sdkLoader.unloadScript(`easy-payments-paypal-sdk-${previousLocale}`);
        // Legacy id from pre-locale builds.
        this.sdkLoader.unloadScript('easy-payments-paypal-sdk');
    }
    /**
     * Creates a PayPal order for one host. Concurrent creates are rejected per
     * `ownerId` only, so sibling hosts on the same page are independent.
     */
    async createOrder(product, _checkout, ownerId = LEGACY_PAYPAL_OWNER) {
        if (this.creatingOwners.has(ownerId)) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'A PayPal order is already being created.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        this.creatingOwners.add(ownerId);
        try {
            const metadata = assertMerchantMetadata(product.metadata, 'paypal', 'paypal');
            const orderId = metadata?.[PAYPAL_ORDER_REFERENCE_KEY];
            const payload = toPayPalCreateOrderRequest({
                productId: product.id,
                quantity: product.quantity ?? 1,
                currency: product.currency,
                ...(orderId ? { orderReference: assertPayPalOrderReference(orderId) } : {}),
            });
            const response = await this.backend.createPayPalOrder(payload);
            this.activeOrderId = response.orderId;
            return response.orderId;
        }
        catch (error) {
            throw mapPayPalError(error, 'BACKEND_ERROR', 'Failed to create PayPal order.');
        }
        finally {
            this.creatingOwners.delete(ownerId);
        }
    }
    /** Captures one order. A second capture of the same order id is rejected (never double-captured). */
    async captureOrder(orderId) {
        if (this.capturingOrders.has(orderId)) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'A PayPal capture is already in progress.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        this.capturingOrders.add(orderId);
        try {
            const response = await this.backend.capturePayPalOrder(orderId);
            return normalizePaymentResult({
                status: 'success',
                method: 'paypal',
                provider: 'paypal',
                transactionId: response.captureId,
                sessionId: response.orderId,
                message: 'PayPal payment completed.',
                metadata: {
                    paypalStatus: response.status,
                },
            });
        }
        catch (error) {
            throw mapPayPalError(error, 'PAYMENT_FAILED', 'Failed to capture PayPal payment.');
        }
        finally {
            this.capturingOrders.delete(orderId);
        }
    }
    /**
     * Renders official PayPal Buttons into `container` under an ownership-scoped mount id.
     * Re-rendering with the same `mountId` replaces only that mount; other hosts stay intact.
     * @returns The mount id to pass to {@link destroyButtons} on host teardown.
     */
    async renderButtons(container, options, locale = 'en', mountId) {
        const id = mountId ?? this.allocateMountId();
        // Replace only this owner's previous Buttons instance.
        await this.destroyButtons(id);
        const paypal = await this.ensureSdkLoaded(locale);
        // When fundingSource is set (Buttons Only compact), PayPal renders one button.
        // Full checkout omits it so eligible Pay Later / card funding can still appear.
        const resolvedFunding = typeof options.fundingSource === 'string' && options.fundingSource.trim()
            ? options.fundingSource.trim()
            : undefined;
        const style = sanitizePayPalButtonStyle({
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            ...(options.style ?? {}),
        });
        let buttons;
        try {
            buttons = paypal.Buttons({
                style,
                ...(resolvedFunding ? { fundingSource: resolvedFunding } : {}),
                createOrder: options.createOrder,
                onApprove: options.onApprove,
                onCancel: options.onCancel,
                onError: options.onError,
                onClick: options.onClick,
            });
        }
        catch (error) {
            throw mapPayPalError(error, 'PROVIDER_UNAVAILABLE', 'PayPal Buttons could not be created with the current options.');
        }
        if (typeof buttons.isEligible === 'function' && !buttons.isEligible()) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'PayPal Buttons are not eligible in this browser or funding configuration.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        this.buttonMounts.set(id, buttons);
        try {
            await buttons.render(container);
        }
        catch (error) {
            this.buttonMounts.delete(id);
            throw mapPayPalError(error, 'PROVIDER_UNAVAILABLE', 'PayPal Buttons failed to render.');
        }
        return id;
    }
    /**
     * Closes one Buttons mount (host teardown) or all mounts when `mountId` is omitted
     * (adapter-wide destroy / orchestrator re-init).
     */
    async destroyButtons(mountId) {
        if (mountId !== undefined) {
            const current = this.buttonMounts.get(mountId);
            this.buttonMounts.delete(mountId);
            await this.closeButtonsHandle(current);
            return;
        }
        const handles = Array.from(this.buttonMounts.values());
        this.buttonMounts.clear();
        for (const handle of handles) {
            await this.closeButtonsHandle(handle);
        }
    }
    /** Active ownership-scoped Buttons mounts (test / diagnostics). */
    getActiveButtonMountCount() {
        return this.buttonMounts.size;
    }
    /**
     * With `ownerId`: true while that owner is creating an order or `orderId` is capturing.
     * Without arguments: true while any order is being created or captured (legacy).
     */
    isBusy(ownerId, orderId) {
        if (ownerId === undefined && orderId === undefined) {
            return this.creatingOwners.size > 0 || this.capturingOrders.size > 0;
        }
        return ((ownerId !== undefined && this.creatingOwners.has(ownerId)) ||
            (!!orderId && this.capturingOrders.has(orderId)));
    }
    /** Most recent order created on the page (any host). Hosts should track their own order id. */
    getActiveOrderId() {
        return this.activeOrderId;
    }
    /**
     * Full adapter reset: closes every Buttons mount and clears in-flight order flags.
     * Prefer {@link destroyButtons}(mountId) from individual payment hosts.
     */
    async destroy() {
        await this.destroyButtons();
        this.activeOrderId = null;
        this.creatingOwners.clear();
        this.capturingOrders.clear();
    }
    allocateMountId() {
        this.nextMountId += 1;
        return `paypal-buttons-${this.nextMountId}`;
    }
    async closeButtonsHandle(handle) {
        if (!handle?.close) {
            return;
        }
        try {
            await handle.close();
        }
        catch {
            // Ignore close failures during teardown.
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
class PayPalMockAdapter extends BaseMockAdapter {
    provider = 'paypal';
    method = 'paypal';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalMockAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalMockAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalMockAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/**
 * Maps Stripe / Apple Pay wallet errors to customer-safe PaymentError.
 * Never surfaces Apple payment tokens or raw Stripe JSON.
 */
function mapApplePayError(error, fallbackCode = 'PAYMENT_FAILED', fallbackMessage = 'Apple Pay payment failed.') {
    if (error instanceof PaymentError) {
        return error;
    }
    const stripeLike = error;
    const message = typeof stripeLike?.message === 'string' && stripeLike.message.trim()
        ? stripeLike.message.trim()
        : fallbackMessage;
    const code = stripeLike?.code?.toLowerCase() ?? '';
    const type = stripeLike?.type?.toLowerCase() ?? '';
    if (code === 'canceled' ||
        code === 'cancelled' ||
        type === 'canceled' ||
        /cancel/i.test(message)) {
        return new PaymentError({
            code: 'PAYMENT_CANCELLED',
            message: 'Apple Pay was cancelled.',
            method: 'apple-pay',
            provider: 'applePay',
            originalError: error,
        });
    }
    return new PaymentError({
        code: fallbackCode,
        message,
        method: 'apple-pay',
        provider: 'applePay',
        originalError: error,
    });
}

/** Stripe minor units for Elements / Payment Request (display amount only). */
function toStripeAmountCents(product) {
    const quantity = product.quantity ?? 1;
    return Math.round(product.amount * quantity * 100);
}
function buildApplePayRenderKey(product) {
    return appendMetadataSessionPart([product.id, product.quantity ?? 1, product.currency.trim().toUpperCase(), product.amount].join('|'), product.metadata);
}

/**
 * Stripe Express Checkout Element availability helpers.
 * Prefer boolean `ready.availablePaymentMethods.applePay`.
 * Also support change-event shape `{ applePay: { available: boolean } }`.
 *
 * Change-event shape: `{ applePay: { available: boolean }, ... } | undefined`
 * Ready-event shape: `{ applePay: boolean, ... } | undefined`
 */
function isApplePayAvailableFromPaymentMethods(paymentMethods) {
    if (!paymentMethods || typeof paymentMethods !== 'object') {
        return false;
    }
    const apple = paymentMethods['applePay'];
    if (apple === true) {
        return true;
    }
    if (apple && typeof apple === 'object') {
        return apple.available === true;
    }
    return false;
}
class ApplePayAdapter extends BaseProviderAdapter {
    provider = 'applePay';
    configService = inject(EasyPaymentsConfigService);
    backend = inject(BackendService);
    browser = inject(BrowserGuard);
    stripeSdk = inject(StripeSdkLoader);
    gate = inject(StripeConfirmationGate);
    stripe = null;
    configReady = false;
    configReadySignal = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "configReadySignal" }] : /* istanbul ignore next */ []));
    /** Mounts with a wallet confirm in flight. Page-level exclusivity comes from the gate. */
    processingMounts = new Set();
    /**
     * Ownership-scoped ECE mounts.
     * Omit `mountId` on mount/unmount to use {@link LEGACY_SINGLETON_MOUNT_ID}
     * (Ready-to-Use Checkout single-host remount path).
     */
    mounts = new Map();
    nextMountSeq = 0;
    static LEGACY_SINGLETON_MOUNT_ID = 'apple-pay-ece-legacy';
    /** Most recent state change (any session) — legacy no-arg `getAvailabilityStatus()`. */
    availabilityState = 'idle';
    availabilitySessionKey = null;
    /** ECE-decided availability per checkout session (product render key). */
    availabilityBySession = new Map();
    readyFired = false;
    lastAvailablePaymentMethods = null;
    availabilityListener = null;
    availabilityListeners = new Set();
    abortedMounts = 0;
    isConfigured() {
        return this.configReadySignal();
    }
    /** Reactive config readiness for Apple Pay bootstrap mounting. */
    configured = this.configReadySignal.asReadonly();
    /**
     * Availability for `product`'s checkout session, or the most recent state
     * change when omitted (legacy single-host behaviour).
     */
    getAvailabilityStatus(product) {
        if (!product) {
            return this.availabilityState;
        }
        const scoped = this.availabilityBySession.get(buildApplePayRenderKey(product));
        if (scoped) {
            return scoped;
        }
        return this.availabilitySessionKey === null ? this.availabilityState : 'idle';
    }
    /**
     * Optional UI hook — fired when production availability state changes
     * (e.g. after ECE `ready`). Use to call orchestrator.refreshAvailability.
     * Single legacy slot; prefer {@link addAvailabilityListener} for multi-host pages.
     */
    setAvailabilityListener(listener) {
        this.availabilityListener = listener;
    }
    /** Per-host availability listener. Returns a function that removes only this listener. */
    addAvailabilityListener(listener) {
        this.availabilityListeners.add(listener);
        return () => {
            this.availabilityListeners.delete(listener);
        };
    }
    /**
     * Validates Apple Pay + Stripe gateway prerequisites.
     * Does not load Stripe.js until availability or mount.
     */
    async initialize() {
        const snapshot = this.configService.getSnapshot();
        const applePay = snapshot.providers?.applePay;
        const stripeKey = snapshot.providers?.stripe?.publishableKey?.trim() ?? '';
        if (!applePay) {
            this.configReady = false;
            this.configReadySignal.set(false);
            this.initialized = false;
            return;
        }
        if (!stripeKey || /^sk_/i.test(stripeKey) || !/^pk_(test|live)_/i.test(stripeKey)) {
            this.configReady = false;
            this.configReadySignal.set(false);
            this.initialized = false;
            return;
        }
        if (!backendEndpointUrl(snapshot.backend, snapshot.backend?.createPaymentUrl)) {
            this.configReady = false;
            this.configReadySignal.set(false);
            this.initialized = false;
            return;
        }
        this.configReady = true;
        this.configReadySignal.set(true);
        this.initialized = true;
    }
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
    async isAvailable(context) {
        if (!this.configReady || !this.browser.isBrowser) {
            // idle — not a definitive "unsupported" decision (bootstrap may still mount).
            this.setAvailabilityState('idle', null);
            return false;
        }
        const amount = toStripeAmountCents(context.product);
        const currency = context.product.currency.trim().toLowerCase();
        if (!Number.isFinite(amount) || amount < 1 || !currency) {
            this.setAvailabilityState('unavailable', null);
            return false;
        }
        const sessionKey = buildApplePayRenderKey(context.product);
        // Availability is scoped per session key: an `available` decided for another
        // product/host never leaks into this checkout session.
        const current = this.availabilityBySession.get(sessionKey);
        if (current === 'available') {
            return true;
        }
        if (current === 'unavailable' || current === 'error') {
            return false;
        }
        // Keep checking while waiting for the real ECE ready event (or remount).
        this.setAvailabilityState('checking', sessionKey);
        return false;
    }
    async createPayment(_request) {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Apple Pay requires the official Apple Pay button UI. Use the apple-pay method inside <easy-payments>.',
            method: 'apple-pay',
            provider: 'applePay',
        });
    }
    async ensureStripeLoaded() {
        if (this.stripe) {
            return this.stripe;
        }
        const key = this.configService.getSnapshot().providers?.stripe?.publishableKey?.trim() ?? '';
        if (!key) {
            throw new PaymentError({
                code: 'CONFIG_MISSING',
                message: 'Stripe publishableKey is required for Apple Pay.',
                method: 'apple-pay',
                provider: 'applePay',
            });
        }
        const stripe = await this.stripeSdk.load(key);
        if (!stripe) {
            throw new PaymentError({
                code: 'SDK_LOAD_FAILED',
                message: 'Stripe.js failed to load for Apple Pay.',
                method: 'apple-pay',
                provider: 'applePay',
            });
        }
        this.stripe = stripe;
        return stripe;
    }
    /** Allocates a unique ECE mount id for Payment Buttons / multi-host ownership. */
    createMountId() {
        this.nextMountSeq += 1;
        return `apple-pay-ece-${this.nextMountSeq}`;
    }
    /** Active ownership-scoped ECE mounts (test / diagnostics). */
    getActiveEceMountCount() {
        return this.mounts.size;
    }
    /**
     * Mounts Stripe Express Checkout Element with Apple Pay only.
     * Availability is decided by the `ready` event.
     * PaymentIntent is created only on confirm (not on mount).
     *
     * @param mountId Ownership token. Omit to use the legacy singleton id
     *   (Ready-to-Use Checkout). Pass an explicit id for multi-host isolation.
     * @returns The mount id to pass to {@link unmountExpressCheckout}.
     */
    async mountExpressCheckout(host, options, mountId = ApplePayAdapter.LEGACY_SINGLETON_MOUNT_ID) {
        this.teardownMount(mountId, 'remount');
        const sessionKey = buildApplePayRenderKey(options.product);
        const keepAvailable = this.availabilityBySession.get(sessionKey) === 'available';
        if (!keepAvailable) {
            this.setAvailabilityState('checking', sessionKey);
            this.readyFired = false;
            this.lastAvailablePaymentMethods = null;
        }
        const mount = {
            id: mountId,
            host,
            elements: null,
            expressCheckout: null,
            successHandler: options.onSuccess,
            cancelHandler: options.onCancel,
            errorHandler: options.onError,
            token: 1,
        };
        this.mounts.set(mountId, mount);
        host.replaceChildren();
        const stripe = await this.ensureStripeLoaded();
        const current = this.mounts.get(mountId);
        if (!current || current !== mount) {
            // A newer remount of this id already replaced us.
            this.abortedMounts += 1;
            return mountId;
        }
        const amount = toStripeAmountCents(options.product);
        if (!Number.isFinite(amount) || amount < 1) {
            this.teardownMount(mountId, 'destroy');
            throw new PaymentError({
                code: 'PRODUCT_INVALID',
                message: 'Invalid amount for Apple Pay.',
                method: 'apple-pay',
                provider: 'applePay',
            });
        }
        const currency = options.product.currency.trim().toLowerCase();
        // Byte-for-byte parity with the known-good Minimal ECE Control on iPhone Safari.
        // Same paymentMethods contract that unlocked ready+applePay on iPhone Safari.
        // Explicitly never expose Google Pay / Link / etc. in the Apple Pay slot.
        const elements = stripe.elements({
            mode: 'payment',
            amount,
            currency,
            paymentMethodTypes: ['card'],
            ...(options.locale ? { locale: options.locale } : {}),
        });
        const expressCheckout = elements.create('expressCheckout', {
            paymentMethods: {
                applePay: 'always',
                googlePay: 'never',
                link: 'never',
                paypal: 'never',
                amazonPay: 'never',
                klarna: 'never',
            },
            buttonHeight: 44,
        });
        mount.elements = elements;
        mount.expressCheckout = expressCheckout;
        // Listeners MUST be attached before mount (Stripe ECE docs pattern).
        expressCheckout.on('ready', (event) => {
            if (!this.mounts.has(mountId)) {
                return;
            }
            this.readyFired = true;
            this.lastAvailablePaymentMethods = event.availablePaymentMethods ?? null;
            const available = isApplePayAvailableFromPaymentMethods(event.availablePaymentMethods);
            const next = available ? 'available' : 'unavailable';
            this.setAvailabilityState(next, sessionKey);
            options.onAvailabilityChange?.(next);
            if (available) {
                options.onReady?.();
            }
            else {
                options.onUnavailable?.();
            }
        });
        expressCheckout.on('cancel', () => {
            if (!this.mounts.has(mountId)) {
                return;
            }
            this.processingMounts.delete(mountId);
            mount.cancelHandler?.();
        });
        expressCheckout.on('loaderror', (event) => {
            if (!this.mounts.has(mountId)) {
                return;
            }
            this.processingMounts.delete(mountId);
            this.setAvailabilityState('error', sessionKey);
            options.onAvailabilityChange?.('error');
            const mapped = mapApplePayError(event?.error, 'SDK_LOAD_FAILED', 'Failed to load Apple Pay.');
            mount.errorHandler?.(mapped);
        });
        expressCheckout.on('confirm', async (event) => {
            if (!this.mounts.has(mountId) || this.processingMounts.has(mountId)) {
                return;
            }
            let release;
            try {
                release = this.gate.acquire(`apple-pay:${mountId}`, 'apple-pay', 'applePay');
            }
            catch (gateError) {
                // Another host is confirming a Stripe payment: close this sheet and tell this host.
                event
                    ?.paymentFailed?.({ reason: 'fail' });
                mount.errorHandler?.(gateError);
                return;
            }
            this.processingMounts.add(mountId);
            options.onAttempt?.();
            try {
                const result = await this.confirmExpressCheckout(mount, options.product, options.checkout);
                if (!this.mounts.has(mountId)) {
                    return;
                }
                mount.successHandler?.(result);
            }
            catch (error) {
                if (!this.mounts.has(mountId)) {
                    return;
                }
                const paymentError = mapApplePayError(error);
                if (paymentError.code === 'PAYMENT_CANCELLED') {
                    mount.cancelHandler?.();
                }
                else {
                    mount.errorHandler?.(paymentError);
                }
            }
            finally {
                this.processingMounts.delete(mountId);
                release();
            }
        });
        expressCheckout.mount(host);
        return mountId;
    }
    /**
     * Unmounts one ECE mount (default: legacy singleton) or clears handlers for that host.
     * Does not tear down sibling mounts when `mountId` is provided.
     */
    unmountExpressCheckout(options) {
        const id = options?.mountId ?? ApplePayAdapter.LEGACY_SINGLETON_MOUNT_ID;
        this.teardownMount(id, 'destroy', options?.preserveAvailability === true);
    }
    /**
     * Clears ECE-driven availability (e.g. merchant removed `apple-pay` from methods,
     * or a brand-new checkout session must not inherit a previous ready result).
     */
    clearAvailability(product) {
        if (product) {
            const sessionKey = buildApplePayRenderKey(product);
            this.availabilityBySession.delete(sessionKey);
            if (this.availabilitySessionKey === sessionKey) {
                this.availabilityState = 'idle';
                this.availabilitySessionKey = null;
            }
            return;
        }
        this.readyFired = false;
        this.lastAvailablePaymentMethods = null;
        this.availabilityBySession.clear();
        this.setAvailabilityState('idle', null);
    }
    /** True while `mountId` (or, when omitted, any mount) has a wallet confirm in flight. */
    isProcessing(mountId) {
        return mountId === undefined
            ? this.processingMounts.size > 0
            : this.processingMounts.has(mountId);
    }
    teardownMount(mountId, mode, preserveAvailability = false) {
        const mount = this.mounts.get(mountId);
        if (mount) {
            try {
                mount.expressCheckout?.unmount();
                mount.expressCheckout?.destroy();
            }
            catch {
                // Element may already be gone.
            }
            mount.expressCheckout = null;
            mount.elements = null;
            mount.successHandler = null;
            mount.cancelHandler = null;
            mount.errorHandler = null;
            try {
                mount.host.replaceChildren();
            }
            catch {
                // Host may already be detached.
            }
            this.mounts.delete(mountId);
        }
        if (preserveAvailability) {
            // Keep readyFired / availablePaymentMethods / availabilityState for the
            // **current session key only**. isAvailable() still requires session match.
            return;
        }
        // Only reset global availability when no other ECE mounts remain,
        // or when remounting the last/only mount into checking.
        if (this.mounts.size > 0) {
            return;
        }
        if (mode === 'remount') {
            if (this.availabilityState !== 'available') {
                this.readyFired = false;
                this.lastAvailablePaymentMethods = null;
                this.availabilityState = 'checking';
            }
        }
        else {
            this.clearAvailability();
        }
    }
    setAvailabilityState(state, sessionKey) {
        // Per-session change detection: a sibling host re-checking its own product
        // must not wake every listener (would ping-pong refreshes between hosts).
        const changed = sessionKey === null
            ? this.availabilityState !== state || this.availabilitySessionKey !== null
            : this.availabilityBySession.get(sessionKey) !== state;
        if (sessionKey !== null) {
            this.availabilityBySession.set(sessionKey, state);
        }
        this.availabilityState = state;
        this.availabilitySessionKey = sessionKey;
        if (changed) {
            this.availabilityListener?.(state);
            for (const listener of Array.from(this.availabilityListeners)) {
                listener(state);
            }
        }
    }
    async confirmExpressCheckout(mount, product, checkout) {
        const stripe = await this.ensureStripeLoaded();
        const elements = mount.elements;
        if (!elements || !this.mounts.has(mount.id)) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Apple Pay is not ready.',
                method: 'apple-pay',
                provider: 'applePay',
            });
        }
        const { error: submitError } = await elements.submit();
        if (submitError) {
            throw mapApplePayError(submitError);
        }
        const session = await this.createPaymentSession(product, checkout);
        const returnUrl = this.browser.getWindow()?.location?.href?.split('#')[0] ||
            'http://localhost/';
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret: session.clientSecret,
            confirmParams: {
                return_url: returnUrl,
            },
            redirect: 'if_required',
        });
        if (error) {
            throw mapApplePayError(error);
        }
        const status = paymentIntent?.status;
        if (status === 'processing') {
            return normalizePaymentResult({
                status: 'processing',
                method: 'apple-pay',
                provider: 'applePay',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: paymentIntent?.id ?? session.paymentIntentId,
                message: 'Apple Pay payment is still processing. Do not retry — confirm the final status on your backend.',
                metadata: { processor: 'stripe', stripeStatus: status },
            });
        }
        if (status === 'succeeded') {
            return normalizePaymentResult({
                status: 'success',
                method: 'apple-pay',
                provider: 'applePay',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: paymentIntent?.id ?? session.paymentIntentId,
                message: 'Apple Pay payment completed.',
                metadata: {
                    processor: 'stripe',
                    stripeStatus: status,
                },
            });
        }
        if (status === 'requires_capture') {
            // Public status stays "success" for compatibility; metadata marks authorization-only.
            return normalizePaymentResult({
                status: 'success',
                method: 'apple-pay',
                provider: 'applePay',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: paymentIntent?.id ?? session.paymentIntentId,
                message: 'Apple Pay payment is authorized and requires capture. Confirm capture and fulfillment on your backend — this is not proof of captured funds.',
                metadata: {
                    processor: 'stripe',
                    stripeStatus: status,
                    authorizationOnly: true,
                },
            });
        }
        if (status === 'canceled') {
            return normalizePaymentResult({
                status: 'cancelled',
                method: 'apple-pay',
                provider: 'applePay',
                message: 'Apple Pay payment was cancelled.',
                sessionId: paymentIntent?.id ?? session.paymentIntentId,
            });
        }
        throw new PaymentError({
            code: 'PAYMENT_FAILED',
            message: `Apple Pay payment ended with status: ${status ?? 'unknown'}.`,
            method: 'apple-pay',
            provider: 'applePay',
        });
    }
    async createPaymentSession(product, checkout) {
        const payload = {
            provider: 'stripe',
            productId: product.id,
            quantity: product.quantity ?? 1,
            currency: product.currency.trim().toUpperCase(),
            amount: product.amount,
            metadata: buildStripeRequestMetadata(product.metadata, {
                productName: product.name,
                checkoutMethod: 'apple-pay',
                customerEmail: checkout?.customer?.email,
            }, 'apple-pay', 'applePay'),
        };
        try {
            const response = await this.backend.createStripePayment(payload);
            if (response.provider !== 'stripe' ||
                typeof response.clientSecret !== 'string' ||
                !response.clientSecret.trim()) {
                throw new PaymentError({
                    code: 'BACKEND_ERROR',
                    message: 'Invalid Stripe create-payment response for Apple Pay.',
                    method: 'apple-pay',
                    provider: 'applePay',
                });
            }
            return {
                clientSecret: response.clientSecret,
                paymentIntentId: response.paymentIntentId,
            };
        }
        catch (error) {
            throw mapApplePayError(error, 'BACKEND_ERROR', 'Failed to create payment session for Apple Pay.');
        }
    }
    async destroy() {
        for (const id of Array.from(this.mounts.keys())) {
            this.teardownMount(id, 'destroy', false);
        }
        this.processingMounts.clear();
        this.stripe = null;
        // Per-host listeners (addAvailabilityListener) are owned by their hosts and survive re-init.
        this.availabilityListener = null;
        this.clearAvailability();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
class ApplePayMockAdapter extends BaseMockAdapter {
    provider = 'applePay';
    method = 'apple-pay';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayMockAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayMockAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayMockAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/**
 * Maps Google Pay / Stripe-from-Google-Pay failures into PaymentError.
 */
function mapGooglePayError(error, fallbackCode = 'PAYMENT_FAILED', fallbackMessage = 'Google Pay payment failed.') {
    if (error instanceof PaymentError) {
        if (error.method === 'google-pay' && error.provider === 'googlePay') {
            return error;
        }
        return new PaymentError({
            code: error.code,
            message: error.message,
            method: 'google-pay',
            provider: 'googlePay',
            originalError: error.originalError ?? error,
        });
    }
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? String(error.statusCode ?? '')
        : '';
    const message = error instanceof Error
        ? error.message
        : typeof error === 'string'
            ? error
            : typeof error === 'object' &&
                error !== null &&
                'statusMessage' in error &&
                typeof error.statusMessage === 'string'
                ? String(error.statusMessage)
                : fallbackMessage;
    const lower = `${statusCode} ${message}`.toLowerCase();
    if (statusCode === 'CANCELED' ||
        lower.includes('cancel') ||
        lower.includes('closed') ||
        lower.includes('dismiss')) {
        return new PaymentError({
            code: 'PAYMENT_CANCELLED',
            message: 'Google Pay checkout was cancelled.',
            method: 'google-pay',
            provider: 'googlePay',
            originalError: error,
        });
    }
    if (statusCode === 'DEVELOPER_ERROR' || lower.includes('developer_error')) {
        return new PaymentError({
            code: 'CONFIG_INVALID',
            message: message || 'Google Pay request was rejected (developer configuration error).',
            method: 'google-pay',
            provider: 'googlePay',
            originalError: error,
        });
    }
    if (lower.includes('sdk') || lower.includes('script') || lower.includes('paymentsclient')) {
        return new PaymentError({
            code: 'SDK_LOAD_FAILED',
            message: 'Google Pay SDK failed to load.',
            method: 'google-pay',
            provider: 'googlePay',
            originalError: error,
        });
    }
    // Stripe processing errors from confirmCardPayment / createPaymentMethod
    if (typeof error === 'object' &&
        error !== null &&
        ('type' in error || 'decline_code' in error || 'payment_intent' in error)) {
        const stripeMapped = mapStripeError(error);
        return new PaymentError({
            code: stripeMapped.code,
            message: stripeMapped.message,
            method: 'google-pay',
            provider: 'googlePay',
            originalError: stripeMapped.originalError ?? error,
        });
    }
    return new PaymentError({
        code: fallbackCode,
        message: message || fallbackMessage,
        method: 'google-pay',
        provider: 'googlePay',
        originalError: error,
    });
}

const GOOGLE_PAY_SCRIPT_ID = 'easy-payments-google-pay-sdk';
const GOOGLE_PAY_SCRIPT_SRC = 'https://pay.google.com/gp/p/js/pay.js';
/**
 * Lazy-loads Google's official pay.js once and reuses it.
 */
class GooglePaySdkLoader {
    sdkLoader = inject(SdkLoaderService);
    browser = inject(BrowserGuard);
    loadPromise = null;
    async load() {
        if (!this.browser.isBrowser) {
            throw new PaymentError({
                code: 'SDK_LOAD_FAILED',
                message: 'Google Pay SDK can only load in the browser.',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        const existing = this.browser.getWindow()?.google;
        if (existing?.payments?.api?.PaymentsClient) {
            return existing;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        this.loadPromise = (async () => {
            try {
                await this.sdkLoader.loadScript({
                    id: GOOGLE_PAY_SCRIPT_ID,
                    src: GOOGLE_PAY_SCRIPT_SRC,
                });
            }
            catch (error) {
                this.loadPromise = null;
                throw new PaymentError({
                    code: 'SDK_LOAD_FAILED',
                    message: 'Google Pay SDK failed to load.',
                    method: 'google-pay',
                    provider: 'googlePay',
                    originalError: error,
                });
            }
            const google = this.browser.getWindow()?.google;
            if (!google?.payments?.api?.PaymentsClient) {
                this.loadPromise = null;
                throw new PaymentError({
                    code: 'SDK_LOAD_FAILED',
                    message: 'Google Pay SDK loaded but PaymentsClient is unavailable.',
                    method: 'google-pay',
                    provider: 'googlePay',
                });
            }
            return google;
        })();
        return this.loadPromise;
    }
    /** Test helper — clears the in-flight/cached load promise. */
    resetForTests() {
        this.loadPromise = null;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePaySdkLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePaySdkLoader, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePaySdkLoader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/** Google's documented TEST merchantId (numeric). Not a production merchant. */
const GOOGLE_PAY_TEST_MERCHANT_ID = '12345678901234567890';
const GOOGLE_PAY_API_VERSION = 2;
const GOOGLE_PAY_API_VERSION_MINOR = 0;
/** Stripe gateway parameters required by Google Pay PAYMENT_GATEWAY tokenization. */
const STRIPE_GOOGLE_PAY_GATEWAY = 'stripe';
/** API version string expected by Google's Stripe gateway parameters. */
const STRIPE_GOOGLE_PAY_API_VERSION = '2018-10-31';
/** Format a major-unit total for Google Pay transactionInfo.totalPrice. */
function formatGooglePayTotalPrice(unitAmount, quantity) {
    const total = Number((unitAmount * quantity).toFixed(2));
    if (!Number.isFinite(total) || total < 0) {
        throw new Error('Invalid Google Pay total price.');
    }
    return total.toFixed(2);
}
/**
 * Stable key for Google Pay button host identity.
 * Theme is excluded — theme may restyle the button without starting payments.
 */
function buildGooglePayRenderKey(product) {
    const quantity = product.quantity ?? 1;
    return appendMetadataSessionPart(`${product.id}|${quantity}|${product.currency.trim().toUpperCase()}|${product.amount}`, product.metadata);
}

class GooglePayAdapter extends BaseProviderAdapter {
    provider = 'googlePay';
    configService = inject(EasyPaymentsConfigService);
    backend = inject(BackendService);
    browser = inject(BrowserGuard);
    googlePaySdk = inject(GooglePaySdkLoader);
    stripeSdk = inject(StripeSdkLoader);
    paymentsClient = null;
    stripe = null;
    configReady = false;
    gate = inject(StripeConfirmationGate);
    /** Owners (button mounts) with a Google Pay flow in flight. */
    processingOwners = new Set();
    /**
     * Per-host official button mounts. Destroying one host must not clear another's DOM.
     * Keyed by opaque mount ids owned by GooglePayPaymentComponent instances.
     */
    buttonMounts = new Map();
    nextMountId = 0;
    /**
     * Validates Google Pay + Stripe gateway prerequisites.
     * Does not load pay.js until needed.
     */
    async initialize() {
        const snapshot = this.configService.getSnapshot();
        const googlePay = snapshot.providers?.googlePay;
        const stripeKey = snapshot.providers?.stripe?.publishableKey?.trim() ?? '';
        if (!googlePay) {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        if (!stripeKey || /^sk_/i.test(stripeKey) || !/^pk_(test|live)_/i.test(stripeKey)) {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        if (!backendEndpointUrl(snapshot.backend, snapshot.backend?.createPaymentUrl)) {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        if ((googlePay.environment ?? 'TEST') === 'PRODUCTION' && !googlePay.merchantId?.trim()) {
            this.configReady = false;
            this.initialized = false;
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Google Pay PRODUCTION requires a real merchantId from Google Pay & Wallet Console.',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        this.configReady = true;
        this.initialized = true;
    }
    async isAvailable(_context) {
        if (!this.configReady) {
            return false;
        }
        try {
            const client = await this.ensurePaymentsClient();
            const response = await client.isReadyToPay({
                apiVersion: GOOGLE_PAY_API_VERSION,
                apiVersionMinor: GOOGLE_PAY_API_VERSION_MINOR,
                allowedPaymentMethods: [this.buildAllowedPaymentMethod()],
            });
            return !!response.result;
        }
        catch {
            return false;
        }
    }
    async createPayment(_request) {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Google Pay requires the official Google Pay button UI. Use the google-pay method inside <easy-payments>.',
            method: 'google-pay',
            provider: 'googlePay',
        });
    }
    async ensurePaymentsClient() {
        if (this.paymentsClient) {
            return this.paymentsClient;
        }
        const google = await this.googlePaySdk.load();
        const environment = this.getEnvironment();
        this.paymentsClient = new google.payments.api.PaymentsClient({ environment });
        return this.paymentsClient;
    }
    async ensureStripeLoaded() {
        if (this.stripe) {
            return this.stripe;
        }
        const key = this.configService.getSnapshot().providers?.stripe?.publishableKey?.trim() ?? '';
        if (!key) {
            throw new PaymentError({
                code: 'CONFIG_MISSING',
                message: 'Stripe publishableKey is required for Google Pay (Stripe gateway).',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        const stripe = await this.stripeSdk.load(key);
        if (!stripe) {
            throw new PaymentError({
                code: 'SDK_LOAD_FAILED',
                message: 'Stripe.js failed to load for Google Pay confirmation.',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        this.stripe = stripe;
        return stripe;
    }
    /**
     * Renders Google's official createButton into the host under an ownership-scoped mount id.
     * Theme only affects official buttonColor — does not start payments.
     * Re-rendering with the same `mountId` replaces only that mount; sibling hosts stay intact.
     * @returns The mount id to pass to {@link destroyButtonMount} on host teardown.
     */
    async renderOfficialButton(host, options, mountId) {
        const id = mountId ?? this.allocateMountId();
        // Replace only this owner's previous button instance.
        this.destroyButtonMount(id);
        const client = await this.ensurePaymentsClient();
        host.replaceChildren();
        // Compact uses `short`, not `plain`: for signed-in Chrome users pay.js swaps
        // `plain`/`pay` for a personalized card-info button (min-width 240px, saved
        // card art) whenever Google enables its server-side dynamic-button flags.
        // `short` renders the same logo-only mark and is excluded from that swap.
        const buttonOptions = {
            onClick: (event) => {
                event.preventDefault();
                void options.onClick();
            },
            buttonColor: options.theme === 'dark' ? 'white' : 'black',
            buttonType: options.compact ? 'short' : 'pay',
            buttonSizeMode: 'fill',
            ...(options.buttonLocale ? { buttonLocale: options.buttonLocale } : {}),
        };
        const button = client.createButton(buttonOptions);
        host.appendChild(button);
        this.buttonMounts.set(id, host);
        return id;
    }
    /**
     * Clears one official button mount (host teardown) or all mounts when `mountId` is omitted.
     */
    destroyButtonMount(mountId) {
        if (mountId !== undefined) {
            const host = this.buttonMounts.get(mountId);
            this.buttonMounts.delete(mountId);
            host?.replaceChildren();
            return;
        }
        for (const host of this.buttonMounts.values()) {
            host.replaceChildren();
        }
        this.buttonMounts.clear();
    }
    /** @deprecated Prefer {@link destroyButtonMount}; kept for callers that clear “the” host. */
    clearButtonHost() {
        this.destroyButtonMount();
    }
    /** Active ownership-scoped button mounts (test / diagnostics). */
    getActiveButtonMountCount() {
        return this.buttonMounts.size;
    }
    allocateMountId() {
        this.nextMountId += 1;
        return `google-pay-button-${this.nextMountId}`;
    }
    /** True while `ownerId` (or, when omitted, any owner) has a Google Pay flow in flight. */
    isProcessing(ownerId) {
        return ownerId === undefined
            ? this.processingOwners.size > 0
            : this.processingOwners.has(ownerId);
    }
    /**
     * Full click flow: trusted PaymentIntent → Google sheet → Stripe confirm.
     * PaymentIntent is created only on user click (not on mount/theme).
     * A concurrent attempt from another host is rejected before any PaymentIntent exists.
     */
    async payWithGooglePay(product, checkout, ownerId = 'google-pay-legacy') {
        if (this.processingOwners.has(ownerId)) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'A Google Pay payment is already in progress.',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        const release = this.gate.acquire(`google-pay:${ownerId}`, 'google-pay', 'googlePay');
        this.processingOwners.add(ownerId);
        try {
            const quantity = product.quantity ?? 1;
            const totalPrice = formatGooglePayTotalPrice(product.amount, quantity);
            const currencyCode = product.currency.trim().toUpperCase();
            // 1) Create PaymentIntent with trusted server price (catalog), not browser amount alone.
            const session = await this.createPaymentSession(product, checkout);
            // 2) Open official Google Pay sheet with the same displayed total.
            const client = await this.ensurePaymentsClient();
            let paymentData;
            try {
                paymentData = await client.loadPaymentData(this.buildPaymentDataRequest({
                    totalPrice,
                    currencyCode,
                }));
            }
            catch (error) {
                throw mapGooglePayError(error);
            }
            // 3) Confirm via Stripe using the gateway token (no raw card data handled by Easy Payments).
            return await this.confirmWithStripeToken(paymentData, session.clientSecret, session.paymentIntentId);
        }
        finally {
            this.processingOwners.delete(ownerId);
            release();
        }
    }
    buildPaymentDataRequest(input) {
        const googlePay = this.configService.getSnapshot().providers?.googlePay;
        const environment = this.getEnvironment();
        const merchantName = googlePay?.merchantName?.trim() || 'Easy Payments Demo';
        const merchantId = googlePay?.merchantId?.trim() ||
            (environment === 'TEST' ? GOOGLE_PAY_TEST_MERCHANT_ID : undefined);
        const merchantInfo = {
            merchantName,
        };
        if (merchantId) {
            merchantInfo.merchantId = merchantId;
        }
        return {
            apiVersion: GOOGLE_PAY_API_VERSION,
            apiVersionMinor: GOOGLE_PAY_API_VERSION_MINOR,
            allowedPaymentMethods: [this.buildAllowedPaymentMethod()],
            transactionInfo: {
                countryCode: (googlePay?.countryCode ?? 'US').trim().toUpperCase() || 'US',
                currencyCode: input.currencyCode,
                totalPriceStatus: 'FINAL',
                totalPrice: input.totalPrice,
            },
            merchantInfo,
        };
    }
    buildAllowedPaymentMethod() {
        const publishableKey = this.configService.getSnapshot().providers?.stripe?.publishableKey?.trim() ?? '';
        return {
            type: 'CARD',
            parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
            },
            tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                    gateway: STRIPE_GOOGLE_PAY_GATEWAY,
                    'stripe:version': STRIPE_GOOGLE_PAY_API_VERSION,
                    'stripe:publishableKey': publishableKey,
                },
            },
        };
    }
    getEnvironment() {
        return this.configService.getSnapshot().providers?.googlePay?.environment ?? 'TEST';
    }
    async createPaymentSession(product, checkout) {
        const payload = {
            provider: 'stripe',
            productId: product.id,
            quantity: product.quantity ?? 1,
            currency: product.currency.trim().toUpperCase(),
            // Display only — Nest ignores and uses trusted catalog.
            amount: product.amount,
            metadata: buildStripeRequestMetadata(product.metadata, {
                productName: product.name,
                checkoutMethod: 'google-pay',
                customerEmail: checkout?.customer?.email,
            }, 'google-pay', 'googlePay'),
        };
        try {
            const response = await this.backend.createStripePayment(payload);
            if (response.provider !== 'stripe' ||
                typeof response.clientSecret !== 'string' ||
                !response.clientSecret.trim()) {
                throw new PaymentError({
                    code: 'BACKEND_ERROR',
                    message: 'Invalid Stripe create-payment response for Google Pay.',
                    method: 'google-pay',
                    provider: 'googlePay',
                });
            }
            return {
                clientSecret: response.clientSecret,
                paymentIntentId: response.paymentIntentId,
            };
        }
        catch (error) {
            throw mapGooglePayError(error, 'BACKEND_ERROR', 'Failed to create payment session for Google Pay.');
        }
    }
    async confirmWithStripeToken(paymentData, clientSecret, paymentIntentId) {
        const tokenRaw = paymentData.paymentMethodData?.tokenizationData?.token;
        if (!tokenRaw) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'Google Pay did not return a payment token.',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        let tokenId;
        try {
            const parsed = JSON.parse(tokenRaw);
            tokenId = parsed.id?.trim() ?? '';
        }
        catch (error) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'Google Pay returned an invalid payment token.',
                method: 'google-pay',
                provider: 'googlePay',
                originalError: error,
            });
        }
        if (!tokenId) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'Google Pay token was empty. In Google Pay TEST environment tokens are not chargeable — see docs.',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        const stripe = await this.ensureStripeLoaded();
        const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
            type: 'card',
            card: { token: tokenId },
        });
        if (pmError || !paymentMethod) {
            throw mapGooglePayError(pmError ?? new Error('Failed to create Stripe PaymentMethod from Google Pay token.'));
        }
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: paymentMethod.id,
        });
        if (error) {
            throw mapGooglePayError(error);
        }
        const status = paymentIntent?.status;
        if (status === 'processing') {
            return normalizePaymentResult({
                status: 'processing',
                method: 'google-pay',
                provider: 'googlePay',
                transactionId: paymentIntent?.id ?? paymentIntentId,
                sessionId: paymentIntent?.id ?? paymentIntentId,
                message: 'Google Pay payment is still processing. Do not retry — confirm the final status on your backend.',
                metadata: { processor: 'stripe', stripeStatus: status },
            });
        }
        if (status === 'succeeded') {
            return normalizePaymentResult({
                status: 'success',
                method: 'google-pay',
                provider: 'googlePay',
                transactionId: paymentIntent?.id ?? paymentIntentId,
                sessionId: paymentIntent?.id ?? paymentIntentId,
                message: 'Google Pay payment completed.',
                metadata: {
                    processor: 'stripe',
                    stripeStatus: status,
                    cardNetwork: paymentData.paymentMethodData?.info?.cardNetwork,
                    cardDetails: paymentData.paymentMethodData?.info?.cardDetails,
                    googlePayEnvironment: this.getEnvironment(),
                },
            });
        }
        if (status === 'requires_capture') {
            // Public status stays "success" for compatibility; metadata marks authorization-only.
            return normalizePaymentResult({
                status: 'success',
                method: 'google-pay',
                provider: 'googlePay',
                transactionId: paymentIntent?.id ?? paymentIntentId,
                sessionId: paymentIntent?.id ?? paymentIntentId,
                message: 'Google Pay payment is authorized and requires capture. Confirm capture and fulfillment on your backend — this is not proof of captured funds.',
                metadata: {
                    processor: 'stripe',
                    stripeStatus: status,
                    authorizationOnly: true,
                    cardNetwork: paymentData.paymentMethodData?.info?.cardNetwork,
                    cardDetails: paymentData.paymentMethodData?.info?.cardDetails,
                    googlePayEnvironment: this.getEnvironment(),
                },
            });
        }
        if (status === 'canceled') {
            return normalizePaymentResult({
                status: 'cancelled',
                method: 'google-pay',
                provider: 'googlePay',
                message: 'Google Pay payment was cancelled.',
                sessionId: paymentIntent?.id ?? paymentIntentId,
            });
        }
        throw new PaymentError({
            code: 'PAYMENT_FAILED',
            message: `Google Pay payment ended with status: ${status ?? 'unknown'}.`,
            method: 'google-pay',
            provider: 'googlePay',
        });
    }
    /**
     * Full adapter reset: clears every button mount and in-flight processing flag.
     * Prefer {@link destroyButtonMount}(mountId) from individual payment hosts.
     */
    async destroy() {
        this.destroyButtonMount();
        this.processingOwners.clear();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
class GooglePayMockAdapter extends BaseMockAdapter {
    provider = 'googlePay';
    method = 'google-pay';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayMockAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayMockAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayMockAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

const ISO_COUNTRY$1 = /^[A-Za-z]{2}$/;
function trimText$1(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function normalizeCountry(value) {
    const country = trimText$1(value);
    if (!country || !ISO_COUNTRY$1.test(country)) {
        return null;
    }
    return country.toUpperCase();
}
function mapAddress(address) {
    if (!address || typeof address !== 'object') {
        return null;
    }
    const country = normalizeCountry(address.country);
    if (!country) {
        return null;
    }
    return {
        country,
        ...(trimText$1(address.line1) ? { line1: trimText$1(address.line1) } : {}),
        ...(trimText$1(address.line2) ? { line2: trimText$1(address.line2) } : {}),
        ...(trimText$1(address.city) ? { city: trimText$1(address.city) } : {}),
        ...(trimText$1(address.state) ? { state: trimText$1(address.state) } : {}),
        ...(trimText$1(address.postalCode) ? { postal_code: trimText$1(address.postalCode) } : {}),
    };
}
function applyShipping(data, shipping) {
    if (!shipping) {
        return;
    }
    const name = trimText$1(shipping.name);
    const address = mapAddress(shipping.address);
    if (!name || !address || !trimText$1(shipping.address?.line1) || !trimText$1(shipping.address?.city) || !trimText$1(shipping.address?.postalCode)) {
        // Incomplete shipping is omitted rather than inventing fields.
        return;
    }
    data.shipping = {
        name,
        address: {
            line1: trimText$1(shipping.address.line1),
            city: trimText$1(shipping.address.city),
            postal_code: trimText$1(shipping.address.postalCode),
            country: address.country,
            ...(trimText$1(shipping.address?.line2) ? { line2: trimText$1(shipping.address.line2) } : {}),
            ...(trimText$1(shipping.address?.state) ? { state: trimText$1(shipping.address.state) } : {}),
        },
    };
}
/**
 * Builds Stripe.js Klarna Direct confirm data.
 *
 * Installed typings require `billing_details.address.country` whenever a
 * `payment_method` object is supplied. Without a valid ISO country we send
 * `return_url` (+ optional shipping) only — matching Stripe Direct API's
 * return_url-only confirm path.
 */
function buildKlarnaDirectConfirmParams(returnUrl, customer, shipping) {
    const data = {
        return_url: returnUrl,
    };
    applyShipping(data, shipping);
    const mapped = mapAddress(customer?.address);
    if (!mapped) {
        return data;
    }
    const email = trimText$1(customer?.email);
    const name = trimText$1(customer?.name);
    const phone = trimText$1(customer?.phone);
    data.payment_method = {
        billing_details: {
            address: mapped,
            ...(email ? { email } : {}),
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
        },
    };
    return data;
}
/**
 * Builds Stripe.js Affirm Direct confirm data.
 * Billing/shipping are optional at the Stripe API level; incomplete maps are omitted.
 */
function buildAffirmDirectConfirmParams(returnUrl, customer, shipping) {
    const data = {
        return_url: returnUrl,
    };
    applyShipping(data, shipping);
    const email = trimText$1(customer?.email);
    const name = trimText$1(customer?.name);
    const phone = trimText$1(customer?.phone);
    const mapped = mapAddress(customer?.address);
    if (!email && !name && !phone && !mapped) {
        return data;
    }
    data.payment_method = {
        billing_details: {
            ...(email ? { email } : {}),
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
            ...(mapped ? { address: mapped } : {}),
        },
    };
    return data;
}

/**
 * Klarna-specific wrappers around the shared Stripe redirect return helpers.
 * Prefer importing from `../stripe/stripe-redirect-return` for new BNPL methods.
 */
const KLARNA_RETURN_METHOD_PARAM = STRIPE_RETURN_METHOD_PARAM;
const KLARNA_PENDING_STORAGE_KEY = STRIPE_PENDING_STORAGE_KEY;
const KLARNA_PROCESSING_MAX_ATTEMPTS = STRIPE_PROCESSING_MAX_ATTEMPTS;
const KLARNA_PROCESSING_DELAY_MS = STRIPE_PROCESSING_DELAY_MS;
function buildKlarnaReturnUrl(baseUrl, locationHref) {
    return buildStripeReturnUrl('klarna', baseUrl, locationHref);
}
function markKlarnaPendingReturn(productId, storage) {
    markStripePendingReturn('klarna', productId, storage);
}
function readKlarnaPendingReturn(storage) {
    const pending = readStripePendingReturn(storage);
    return pending?.method === 'klarna' ? pending : null;
}
function clearKlarnaPendingReturn(storage) {
    clearStripePendingReturn(storage);
}
function isKlarnaReturnAttempt(search, storage) {
    return isStripeReturnAttempt('klarna', search, storage);
}
function isKlarnaStripeReturn(search, storage) {
    const { clientSecret } = readStripeReturnParams(search);
    if (!clientSecret) {
        return false;
    }
    return isKlarnaReturnAttempt(search, storage);
}
/** Any Stripe BNPL return (Klarna or Affirm) — used by demo mode bootstrap. */
function isAnyStripeBnplReturnAttempt(search, storage) {
    return isStripeReturnAttempt(undefined, search, storage);
}

/**
 * Payment Element options for Easy Payments Klarna (via Stripe).
 * Method availability is controlled by the PaymentIntent
 * (`payment_method_types: ['klarna']`). These options keep wallets off.
 */
const KLARNA_PAYMENT_ELEMENT_OPTIONS = {
    layout: {
        type: 'accordion',
    },
    wallets: {
        applePay: 'never',
        googlePay: 'never',
        link: 'never',
    },
};
/**
 * Stable session identity for Klarna PaymentIntent reuse.
 * Theme is intentionally excluded — appearance updates must not recreate intents.
 * Amount is excluded — the backend prices from the trusted catalog.
 */
function buildKlarnaSessionKey(product, checkout) {
    const quantity = product.quantity ?? 1;
    const email = checkout?.customer?.email ?? '';
    const name = checkout?.customer?.name ?? '';
    return appendMetadataSessionPart([product.id, quantity, product.currency, email, name].join('|'), product.metadata);
}

const KLARNA_SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK']);
function looksLikeSecretKey$1(value) {
    return /^sk_(test|live)_/i.test(value.trim());
}
function looksLikePublishableKey$1(value) {
    return /^pk_(test|live)_/i.test(value.trim());
}
function mapKlarnaStripeError(error) {
    const mapped = mapStripeError(error);
    return new PaymentError({
        code: mapped.code,
        message: mapped.message,
        method: 'klarna',
        provider: 'klarna',
        originalError: mapped.originalError ?? error,
    });
}
class KlarnaAdapter extends BaseProviderAdapter {
    provider = 'klarna';
    configService = inject(EasyPaymentsConfigService);
    backend = inject(BackendService);
    browser = inject(BrowserGuard);
    sdkLoader = inject(StripeSdkLoader);
    redirectRecovery = inject(StripeRedirectRecoveryService);
    gate = inject(StripeConfirmationGate);
    stripe = null;
    sessions = new StripeElementSessionStore();
    loadPromise = null;
    configReady = false;
    /**
     * Validates Klarna + Stripe gateway config only. Does not load Stripe.js until needed.
     */
    async initialize() {
        const snapshot = this.configService.getSnapshot();
        const klarna = snapshot.providers?.klarna;
        const stripeKey = snapshot.providers?.stripe?.publishableKey?.trim() ?? '';
        if (!klarna || typeof klarna !== 'object') {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        if (!stripeKey || looksLikeSecretKey$1(stripeKey) || !looksLikePublishableKey$1(stripeKey)) {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        this.configReady = true;
        this.initialized = true;
    }
    async isAvailable(context) {
        const snapshot = this.configService.getSnapshot();
        const key = snapshot.providers?.stripe?.publishableKey?.trim() ?? '';
        if (!snapshot.providers?.klarna || !this.configReady) {
            return false;
        }
        if (!key || looksLikeSecretKey$1(key) || !looksLikePublishableKey$1(key)) {
            return false;
        }
        if (!backendEndpointUrl(snapshot.backend, snapshot.backend?.klarnaCreatePaymentUrl)) {
            return false;
        }
        if (!KLARNA_SUPPORTED_CURRENCIES.has(context.product.currency)) {
            return false;
        }
        if (context.product.amount <= 0) {
            return false;
        }
        return true;
    }
    /**
     * Interactive Klarna Payment Element flow is handled by KlarnaPaymentComponent.
     * Calling createPayment directly is not supported for real Klarna payments.
     */
    async createPayment(_request) {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Klarna payments require the secure Payment Element UI. Use the klarna method inside <easy-payments>.',
            method: 'klarna',
            provider: 'klarna',
        });
    }
    async ensureStripeLoaded() {
        if (this.stripe) {
            return this.stripe;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        const key = this.configService.getSnapshot().providers?.stripe?.publishableKey?.trim() ?? '';
        if (!key) {
            throw new PaymentError({
                code: 'CONFIG_MISSING',
                message: 'Stripe publishableKey is missing (required for Klarna via Stripe).',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        if (looksLikeSecretKey$1(key)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Stripe secret keys must never be used in Angular. Provide a publishable key (pk_...) only.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        if (!looksLikePublishableKey$1(key)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Stripe publishableKey appears invalid. Expected a pk_test_... or pk_live_... value.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        if (!this.browser.isBrowser) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Stripe.js can only load in the browser.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        this.loadPromise = (async () => {
            try {
                const stripe = await this.sdkLoader.load(key);
                if (!stripe) {
                    throw new PaymentError({
                        code: 'SDK_LOAD_FAILED',
                        message: 'Stripe.js failed to initialize.',
                        method: 'klarna',
                        provider: 'klarna',
                    });
                }
                this.stripe = stripe;
                return stripe;
            }
            catch (error) {
                this.loadPromise = null;
                if (error instanceof PaymentError) {
                    throw error;
                }
                throw new PaymentError({
                    code: 'SDK_LOAD_FAILED',
                    message: 'Stripe.js failed to load.',
                    method: 'klarna',
                    provider: 'klarna',
                    originalError: error,
                });
            }
        })();
        return this.loadPromise;
    }
    async createPaymentSession(product, _checkout, preferredLocale, ownerId) {
        if (!this.configService.getSnapshot().backend?.klarnaCreatePaymentUrl?.trim()) {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend klarnaCreatePaymentUrl is not configured.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        const metadata = assertMerchantMetadata(product.metadata, 'klarna', 'klarna');
        const response = await this.backend.createKlarnaPayment({
            productId: product.id,
            quantity: product.quantity ?? 1,
            currency: product.currency,
            ...(preferredLocale?.trim() ? { preferredLocale: preferredLocale.trim() } : {}),
            ...(metadata ? { metadata } : {}),
        });
        this.assertValidKlarnaResponse(response);
        const session = this.sessions.get(ownerId);
        session.clientSecret = response.clientSecret;
        session.sessionId = response.sessionId;
        session.paymentIntentId = response.paymentIntentId;
        return {
            clientSecret: response.clientSecret,
            sessionId: response.sessionId,
            paymentIntentId: response.paymentIntentId,
        };
    }
    async mountPaymentElement(container, clientSecret, theme, locale, ownerId) {
        const stripe = await this.ensureStripeLoaded();
        this.sessions.unmount(ownerId);
        const session = this.sessions.get(ownerId);
        try {
            session.clientSecret = clientSecret;
            const elements = stripe.elements({
                clientSecret,
                appearance: mapResolvedThemeToStripeAppearance(theme),
                ...(locale ? { locale: locale } : {}),
            });
            session.elements = elements;
            session.paymentElement = elements.create('payment', KLARNA_PAYMENT_ELEMENT_OPTIONS);
            session.paymentElement.mount(container);
        }
        catch (error) {
            throw new PaymentError({
                code: 'SDK_LOAD_FAILED',
                message: 'Klarna Payment Element failed to initialize.',
                method: 'klarna',
                provider: 'klarna',
                originalError: error,
            });
        }
    }
    async updateAppearance(theme, ownerId) {
        const elements = this.sessions.peek(ownerId)?.elements;
        if (!elements) {
            return;
        }
        elements.update({
            appearance: mapResolvedThemeToStripeAppearance(theme),
        });
    }
    async confirmPayment(returnUrl, ownerId) {
        const session = this.sessions.get(ownerId);
        if (session.confirming) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'A Klarna payment confirmation is already in progress.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        const release = this.gate.acquire(`klarna:${ownerId ?? 'legacy'}`, 'klarna', 'klarna');
        session.confirming = true;
        try {
            const stripe = await this.ensureStripeLoaded();
            const elements = session.elements;
            if (!elements) {
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Klarna Payment Element is not ready.',
                    method: 'klarna',
                    provider: 'klarna',
                });
            }
            const { error: submitError } = await elements.submit();
            if (submitError) {
                throw mapKlarnaStripeError(submitError);
            }
            // Klarna is redirect-based. Stamp ep_method=klarna on return_url so the
            // remounted app can resume as Klarna (Stripe preserves custom query params).
            const resolvedReturnUrl = this.browser.isBrowser
                ? buildKlarnaReturnUrl(returnUrl)
                : returnUrl;
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: resolvedReturnUrl
                    ? {
                        return_url: resolvedReturnUrl,
                    }
                    : undefined,
                redirect: 'if_required',
            });
            if (error) {
                throw mapKlarnaStripeError(error);
            }
            // When Klarna redirects, confirmPayment does not resolve in this page —
            // the return path uses retrieveReturningPayment instead.
            return this.normalizeIntent(paymentIntent, session);
        }
        finally {
            session.confirming = false;
            release();
        }
    }
    /**
     * Explicit Stripe Direct confirmation (no Payment Element).
     *
     * Invoked by Buttons Only when `[bnplConfirmMode]` is `auto`/`direct` and
     * {@link evaluateBnplDirectReadiness} is ready. Not used by Full Checkout or Headless.
     * Callers must create the method-locked PaymentIntent, stamp redirect markers,
     * and treat redirect initiation as non-terminal (recover via existing return path).
     */
    async confirmDirectPayment(request, ownerId) {
        const clientSecret = request?.clientSecret?.trim() ?? '';
        const returnUrl = request?.returnUrl?.trim() ?? '';
        if (!clientSecret) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Klarna Direct confirmation requires a PaymentIntent client secret.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        if (!returnUrl) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Klarna Direct confirmation requires a return URL.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        const session = this.sessions.get(ownerId);
        if (session.confirming) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'A Klarna payment confirmation is already in progress.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        const release = this.gate.acquire(`klarna:${ownerId ?? 'legacy'}`, 'klarna', 'klarna');
        session.confirming = true;
        session.clientSecret = clientSecret;
        try {
            const stripe = await this.ensureStripeLoaded();
            const confirmParams = buildKlarnaDirectConfirmParams(returnUrl, request.customer, request.shipping);
            const { error, paymentIntent } = await stripe.confirmKlarnaPayment(clientSecret, confirmParams);
            if (error) {
                throw mapKlarnaStripeError(error);
            }
            // Redirect-based Klarna often does not resolve here; when it does, reuse PE status mapping.
            return this.normalizeIntent(paymentIntent, session);
        }
        finally {
            session.confirming = false;
            release();
        }
    }
    /**
     * After Stripe redirects back, recover via shared StripeRedirectRecoveryService.
     */
    async retrieveReturningPayment(clientSecret) {
        return this.redirectRecovery.retrieveReturningPayment('klarna', clientSecret);
    }
    /**
     * Idempotent Klarna redirect recovery — delegates to shared Stripe BNPL recovery.
     */
    consumeStripeReturn() {
        return this.redirectRecovery.consumeReturn();
    }
    /** True after a Stripe BNPL return was consumed on this page load. */
    wasReturnConsumed() {
        return this.redirectRecovery.wasReturnConsumed();
    }
    isConfirming(ownerId) {
        return this.sessions.peek(ownerId)?.confirming ?? false;
    }
    unmountPaymentElement(ownerId) {
        this.sessions.unmount(ownerId);
    }
    hasMountedElement(ownerId) {
        const session = this.sessions.peek(ownerId);
        return !!session?.elements && !!session.paymentElement;
    }
    /** Destroys one host's session, or every session (adapter re-init) when ownerId is omitted. */
    async destroy(ownerId) {
        this.sessions.destroy(ownerId);
    }
    assertValidKlarnaResponse(response) {
        if (!response || typeof response !== 'object') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend returned an invalid Klarna payment response.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        if (response.provider && response.provider !== 'klarna') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend response provider must be "klarna".',
                method: 'klarna',
                provider: 'klarna',
            });
        }
        if (!response.clientSecret || typeof response.clientSecret !== 'string') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend did not return a Klarna clientSecret.',
                method: 'klarna',
                provider: 'klarna',
            });
        }
    }
    normalizeIntent(paymentIntent, session) {
        const status = paymentIntent?.status;
        // Terminal success only. Do not treat `processing` as success — Klarna may
        // still be settling asynchronously after customer authorization.
        if (status === 'succeeded') {
            return normalizePaymentResult({
                status: 'success',
                method: 'klarna',
                provider: 'klarna',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Klarna payment completed successfully.',
                metadata: {
                    stripeStatus: status,
                    gateway: 'stripe',
                },
            });
        }
        if (status === 'requires_capture') {
            // Public status stays "success" for compatibility; metadata marks authorization-only.
            return normalizePaymentResult({
                status: 'success',
                method: 'klarna',
                provider: 'klarna',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Klarna payment is authorized and requires capture. Confirm capture and fulfillment on your backend — this is not proof of captured funds.',
                metadata: {
                    stripeStatus: status,
                    gateway: 'stripe',
                    authorizationOnly: true,
                },
            });
        }
        if (status === 'canceled') {
            return normalizePaymentResult({
                status: 'cancelled',
                method: 'klarna',
                provider: 'klarna',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Klarna payment was cancelled.',
                metadata: {
                    gateway: 'stripe',
                },
            });
        }
        if (status === 'requires_payment_method') {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'Klarna payment was not completed. Please try again.',
                method: 'klarna',
                provider: 'klarna',
                originalError: paymentIntent,
            });
        }
        if (status === 'requires_action' || status === 'requires_confirmation') {
            throw new PaymentError({
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Klarna payment still requires additional customer action.',
                method: 'klarna',
                provider: 'klarna',
                originalError: paymentIntent,
            });
        }
        if (status === 'processing') {
            return normalizePaymentResult({
                status: 'processing',
                method: 'klarna',
                provider: 'klarna',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Klarna payment is still processing. Do not retry — confirm the final status on your backend.',
                metadata: { stripeStatus: status, gateway: 'stripe' },
            });
        }
        throw new PaymentError({
            code: 'PAYMENT_FAILED',
            message: `Unexpected PaymentIntent status: ${status ?? 'unknown'}.`,
            method: 'klarna',
            provider: 'klarna',
            originalError: paymentIntent,
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
class KlarnaMockAdapter extends BaseMockAdapter {
    provider = 'klarna';
    method = 'klarna';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaMockAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaMockAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaMockAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/**
 * Payment Element options for Easy Payments Affirm (via Stripe).
 * Method availability is controlled by the PaymentIntent
 * (`payment_method_types: ['affirm']`). These options keep wallets off.
 */
const AFFIRM_PAYMENT_ELEMENT_OPTIONS = {
    layout: {
        type: 'accordion',
    },
    wallets: {
        applePay: 'never',
        googlePay: 'never',
        link: 'never',
    },
};
/**
 * Stable session identity for Affirm PaymentIntent reuse.
 * Theme is intentionally excluded — appearance updates must not recreate intents.
 * Amount is excluded — the backend prices from the trusted catalog.
 */
function buildAffirmSessionKey(product, checkout) {
    const quantity = product.quantity ?? 1;
    const email = checkout?.customer?.email ?? '';
    const name = checkout?.customer?.name ?? '';
    return appendMetadataSessionPart([product.id, quantity, product.currency, email, name].join('|'), product.metadata);
}

/** Affirm via Stripe supports USD and CAD presentment. */
const AFFIRM_SUPPORTED_CURRENCIES = new Set(['USD', 'CAD']);
/** Stripe Affirm docs: minimum about $35 presentment (major units). */
const AFFIRM_MIN_AMOUNT = 35;
function looksLikeSecretKey(value) {
    return /^sk_(test|live)_/i.test(value.trim());
}
function looksLikePublishableKey(value) {
    return /^pk_(test|live)_/i.test(value.trim());
}
function mapAffirmStripeError(error) {
    const mapped = mapStripeError(error);
    return new PaymentError({
        code: mapped.code,
        message: mapped.message,
        method: 'affirm',
        provider: 'affirm',
        originalError: mapped.originalError ?? error,
    });
}
class AffirmAdapter extends BaseProviderAdapter {
    provider = 'affirm';
    configService = inject(EasyPaymentsConfigService);
    backend = inject(BackendService);
    browser = inject(BrowserGuard);
    sdkLoader = inject(StripeSdkLoader);
    redirectRecovery = inject(StripeRedirectRecoveryService);
    gate = inject(StripeConfirmationGate);
    stripe = null;
    sessions = new StripeElementSessionStore();
    loadPromise = null;
    configReady = false;
    /**
     * Validates Affirm + Stripe gateway config only. Does not load Stripe.js until needed.
     */
    async initialize() {
        const snapshot = this.configService.getSnapshot();
        const affirm = snapshot.providers?.affirm;
        const stripeKey = snapshot.providers?.stripe?.publishableKey?.trim() ?? '';
        if (!affirm || typeof affirm !== 'object') {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        if (!stripeKey || looksLikeSecretKey(stripeKey) || !looksLikePublishableKey(stripeKey)) {
            this.configReady = false;
            this.initialized = false;
            return;
        }
        this.configReady = true;
        this.initialized = true;
    }
    async isAvailable(context) {
        const snapshot = this.configService.getSnapshot();
        const key = snapshot.providers?.stripe?.publishableKey?.trim() ?? '';
        if (!snapshot.providers?.affirm || !this.configReady) {
            return false;
        }
        if (!key || looksLikeSecretKey(key) || !looksLikePublishableKey(key)) {
            return false;
        }
        if (!backendEndpointUrl(snapshot.backend, snapshot.backend?.affirmCreatePaymentUrl)) {
            return false;
        }
        if (!AFFIRM_SUPPORTED_CURRENCIES.has(context.product.currency)) {
            return false;
        }
        if (context.product.amount <= 0) {
            return false;
        }
        const quantity = context.product.quantity ?? 1;
        const total = context.product.amount * quantity;
        if (total < AFFIRM_MIN_AMOUNT) {
            return false;
        }
        return true;
    }
    /**
     * Interactive Affirm Payment Element flow is handled by AffirmPaymentComponent.
     * Calling createPayment directly is not supported for real Affirm payments.
     */
    async createPayment(_request) {
        throw new PaymentError({
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Affirm payments require the secure Payment Element UI. Use the affirm method inside <easy-payments>.',
            method: 'affirm',
            provider: 'affirm',
        });
    }
    async ensureStripeLoaded() {
        if (this.stripe) {
            return this.stripe;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        const key = this.configService.getSnapshot().providers?.stripe?.publishableKey?.trim() ?? '';
        if (!key) {
            throw new PaymentError({
                code: 'CONFIG_MISSING',
                message: 'Stripe publishableKey is missing (required for Affirm via Stripe).',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        if (looksLikeSecretKey(key)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Stripe secret keys must never be used in Angular. Provide a publishable key (pk_...) only.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        if (!looksLikePublishableKey(key)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Stripe publishableKey appears invalid. Expected a pk_test_... or pk_live_... value.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        if (!this.browser.isBrowser) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Stripe.js can only load in the browser.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        this.loadPromise = (async () => {
            try {
                const stripe = await this.sdkLoader.load(key);
                if (!stripe) {
                    throw new PaymentError({
                        code: 'SDK_LOAD_FAILED',
                        message: 'Stripe.js failed to initialize.',
                        method: 'affirm',
                        provider: 'affirm',
                    });
                }
                this.stripe = stripe;
                return stripe;
            }
            catch (error) {
                this.loadPromise = null;
                if (error instanceof PaymentError) {
                    throw error;
                }
                throw new PaymentError({
                    code: 'SDK_LOAD_FAILED',
                    message: 'Stripe.js failed to load.',
                    method: 'affirm',
                    provider: 'affirm',
                    originalError: error,
                });
            }
        })();
        return this.loadPromise;
    }
    async createPaymentSession(product, _checkout, preferredLocale, ownerId) {
        if (!this.configService.getSnapshot().backend?.affirmCreatePaymentUrl?.trim()) {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend affirmCreatePaymentUrl is not configured.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        const metadata = assertMerchantMetadata(product.metadata, 'affirm', 'affirm');
        const response = await this.backend.createAffirmPayment({
            productId: product.id,
            quantity: product.quantity ?? 1,
            currency: product.currency,
            ...(preferredLocale?.trim() ? { preferredLocale: preferredLocale.trim() } : {}),
            ...(metadata ? { metadata } : {}),
        });
        this.assertValidAffirmResponse(response);
        const session = this.sessions.get(ownerId);
        session.clientSecret = response.clientSecret;
        session.sessionId = response.sessionId;
        session.paymentIntentId = response.paymentIntentId;
        return {
            clientSecret: response.clientSecret,
            sessionId: response.sessionId,
            paymentIntentId: response.paymentIntentId,
        };
    }
    async mountPaymentElement(container, clientSecret, theme, locale, ownerId) {
        const stripe = await this.ensureStripeLoaded();
        this.sessions.unmount(ownerId);
        const session = this.sessions.get(ownerId);
        try {
            session.clientSecret = clientSecret;
            const elements = stripe.elements({
                clientSecret,
                appearance: mapResolvedThemeToStripeAppearance(theme),
                ...(locale ? { locale: locale } : {}),
            });
            session.elements = elements;
            session.paymentElement = elements.create('payment', AFFIRM_PAYMENT_ELEMENT_OPTIONS);
            session.paymentElement.mount(container);
        }
        catch (error) {
            throw new PaymentError({
                code: 'SDK_LOAD_FAILED',
                message: 'Affirm Payment Element failed to initialize.',
                method: 'affirm',
                provider: 'affirm',
                originalError: error,
            });
        }
    }
    async updateAppearance(theme, ownerId) {
        const elements = this.sessions.peek(ownerId)?.elements;
        if (!elements) {
            return;
        }
        elements.update({
            appearance: mapResolvedThemeToStripeAppearance(theme),
        });
    }
    async confirmPayment(returnUrl, ownerId) {
        const session = this.sessions.get(ownerId);
        if (session.confirming) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'An Affirm payment confirmation is already in progress.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        const release = this.gate.acquire(`affirm:${ownerId ?? 'legacy'}`, 'affirm', 'affirm');
        session.confirming = true;
        try {
            const stripe = await this.ensureStripeLoaded();
            const elements = session.elements;
            if (!elements) {
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Affirm Payment Element is not ready.',
                    method: 'affirm',
                    provider: 'affirm',
                });
            }
            const { error: submitError } = await elements.submit();
            if (submitError) {
                throw mapAffirmStripeError(submitError);
            }
            // Affirm is redirect-based. Stamp ep_method=affirm on return_url so the
            // remounted app can resume as Affirm (Stripe preserves custom query params).
            const resolvedReturnUrl = this.browser.isBrowser
                ? buildStripeReturnUrl('affirm', returnUrl)
                : returnUrl;
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: resolvedReturnUrl
                    ? {
                        return_url: resolvedReturnUrl,
                    }
                    : undefined,
                redirect: 'if_required',
            });
            if (error) {
                throw mapAffirmStripeError(error);
            }
            // When Affirm redirects, confirmPayment does not resolve in this page —
            // the return path uses StripeRedirectRecoveryService.
            return this.normalizeIntent(paymentIntent, session);
        }
        finally {
            session.confirming = false;
            release();
        }
    }
    /**
     * Explicit Stripe Direct confirmation (no Payment Element).
     *
     * Invoked by Buttons Only when `[bnplConfirmMode]` is `auto`/`direct` and
     * readiness is satisfied. Not used by Full Checkout or Headless.
     * Callers own Intent creation and redirect markers.
     */
    async confirmDirectPayment(request, ownerId) {
        const clientSecret = request?.clientSecret?.trim() ?? '';
        const returnUrl = request?.returnUrl?.trim() ?? '';
        if (!clientSecret) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Affirm Direct confirmation requires a PaymentIntent client secret.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        if (!returnUrl) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Affirm Direct confirmation requires a return URL.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        const session = this.sessions.get(ownerId);
        if (session.confirming) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'An Affirm payment confirmation is already in progress.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        const release = this.gate.acquire(`affirm:${ownerId ?? 'legacy'}`, 'affirm', 'affirm');
        session.confirming = true;
        session.clientSecret = clientSecret;
        try {
            const stripe = await this.ensureStripeLoaded();
            const confirmParams = buildAffirmDirectConfirmParams(returnUrl, request.customer, request.shipping);
            const { error, paymentIntent } = await stripe.confirmAffirmPayment(clientSecret, confirmParams);
            if (error) {
                throw mapAffirmStripeError(error);
            }
            return this.normalizeIntent(paymentIntent, session);
        }
        finally {
            session.confirming = false;
            release();
        }
    }
    /**
     * Delegates to shared Stripe BNPL redirect recovery (parent owns the flow).
     */
    consumeStripeReturn() {
        return this.redirectRecovery.consumeReturn();
    }
    /** True after a Stripe BNPL return was consumed on this page load. */
    wasReturnConsumed() {
        return this.redirectRecovery.wasReturnConsumed();
    }
    isConfirming(ownerId) {
        return this.sessions.peek(ownerId)?.confirming ?? false;
    }
    unmountPaymentElement(ownerId) {
        this.sessions.unmount(ownerId);
    }
    hasMountedElement(ownerId) {
        const session = this.sessions.peek(ownerId);
        return !!session?.elements && !!session.paymentElement;
    }
    /** Destroys one host's session, or every session (adapter re-init) when ownerId is omitted. */
    async destroy(ownerId) {
        this.sessions.destroy(ownerId);
    }
    assertValidAffirmResponse(response) {
        if (!response || typeof response !== 'object') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend returned an invalid Affirm payment response.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        if (response.provider && response.provider !== 'affirm') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend response provider must be "affirm".',
                method: 'affirm',
                provider: 'affirm',
            });
        }
        if (!response.clientSecret || typeof response.clientSecret !== 'string') {
            throw new PaymentError({
                code: 'BACKEND_ERROR',
                message: 'Backend did not return an Affirm clientSecret.',
                method: 'affirm',
                provider: 'affirm',
            });
        }
    }
    normalizeIntent(paymentIntent, session) {
        const status = paymentIntent?.status;
        // Terminal success only. Do not treat `processing` as success — Affirm may
        // still be settling asynchronously after customer authorization.
        if (status === 'succeeded') {
            return normalizePaymentResult({
                status: 'success',
                method: 'affirm',
                provider: 'affirm',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Affirm payment completed successfully.',
                metadata: {
                    stripeStatus: status,
                    gateway: 'stripe',
                },
            });
        }
        if (status === 'requires_capture') {
            // Public status stays "success" for compatibility; metadata marks authorization-only.
            return normalizePaymentResult({
                status: 'success',
                method: 'affirm',
                provider: 'affirm',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Affirm payment is authorized and requires capture. Confirm capture and fulfillment on your backend — this is not proof of captured funds.',
                metadata: {
                    stripeStatus: status,
                    gateway: 'stripe',
                    authorizationOnly: true,
                },
            });
        }
        if (status === 'canceled') {
            return normalizePaymentResult({
                status: 'cancelled',
                method: 'affirm',
                provider: 'affirm',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Affirm payment was cancelled.',
                metadata: {
                    gateway: 'stripe',
                },
            });
        }
        if (status === 'requires_payment_method') {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'Affirm payment was not completed. Please try again.',
                method: 'affirm',
                provider: 'affirm',
                originalError: paymentIntent,
            });
        }
        if (status === 'requires_action' || status === 'requires_confirmation') {
            throw new PaymentError({
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Affirm payment still requires additional customer action.',
                method: 'affirm',
                provider: 'affirm',
                originalError: paymentIntent,
            });
        }
        if (status === 'processing') {
            return normalizePaymentResult({
                status: 'processing',
                method: 'affirm',
                provider: 'affirm',
                transactionId: paymentIntent?.id ?? session.paymentIntentId,
                sessionId: session.sessionId,
                message: 'Affirm payment is still processing. Do not retry — confirm the final status on your backend.',
                metadata: { stripeStatus: status, gateway: 'stripe' },
            });
        }
        throw new PaymentError({
            code: 'PAYMENT_FAILED',
            message: `Unexpected PaymentIntent status: ${status ?? 'unknown'}.`,
            method: 'affirm',
            provider: 'affirm',
            originalError: paymentIntent,
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
class AffirmMockAdapter extends BaseMockAdapter {
    provider = 'affirm';
    method = 'affirm';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmMockAdapter, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmMockAdapter, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmMockAdapter, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

const REAL_ADAPTERS = {
    stripe: StripeCardAdapter,
    paypal: PayPalAdapter,
    applePay: ApplePayAdapter,
    googlePay: GooglePayAdapter,
    klarna: KlarnaAdapter,
    affirm: AffirmAdapter,
};
const MOCK_ADAPTERS = {
    stripe: StripeCardMockAdapter,
    paypal: PayPalMockAdapter,
    applePay: ApplePayMockAdapter,
    googlePay: GooglePayMockAdapter,
    klarna: KlarnaMockAdapter,
    affirm: AffirmMockAdapter,
};
const CONFIG_KEY_MAP = {
    stripe: 'stripe',
    paypal: 'paypal',
    applePay: 'applePay',
    googlePay: 'googlePay',
    klarna: 'klarna',
    affirm: 'affirm',
};
class AdapterFactory {
    configService = inject(EasyPaymentsConfigService);
    registry = inject(AdapterRegistry);
    validator = inject(EasyPaymentsConfigValidator);
    injector = inject(Injector);
    initFailures = new Map();
    getInitializationFailure(provider) {
        return this.initFailures.get(provider);
    }
    async initializeAdapters() {
        for (const adapter of this.registry.getAll()) {
            await adapter.destroy?.();
        }
        this.registry.clear();
        this.initFailures.clear();
        const providers = Object.keys(REAL_ADAPTERS);
        // One provider's initialize() must not reject the rest of checkout.
        await Promise.all(providers.map(async (provider) => {
            let adapter;
            try {
                adapter = this.createAdapter(provider);
                this.registry.register(adapter);
                await adapter.initialize();
            }
            catch (error) {
                if (adapter && !this.registry.get(provider)) {
                    this.registry.register(adapter);
                }
                const failure = describeInitFailure(error);
                this.initFailures.set(provider, failure);
                const configKey = CONFIG_KEY_MAP[provider];
                warnProviderDiagnostic(PROVIDER_DISPLAY_NAMES[configKey], failure.code, error instanceof Error ? error.message : undefined);
            }
        }));
    }
    createAdapter(provider) {
        const config = this.configService.getSnapshot();
        const configKey = CONFIG_KEY_MAP[provider];
        const validation = this.validator.validateProvider(configKey, config.providers?.[configKey]);
        // Mock adapters are an explicit demo mode. A missing or invalid provider
        // stays on its real adapter so it reports unavailable instead of looking payable.
        const useMock = config.enableMockMode === true;
        if (!useMock && validation.status === 'invalid') {
            warnProviderDiagnostic(PROVIDER_DISPLAY_NAMES[configKey], 'CONFIG_INVALID', validation.message);
        }
        const AdapterClass = useMock ? MOCK_ADAPTERS[provider] : REAL_ADAPTERS[provider];
        return this.injector.get(AdapterClass);
    }
    getAdapter(provider) {
        return this.registry.get(provider);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AdapterFactory, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AdapterFactory, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AdapterFactory, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/** Methods that cannot run without a working Stripe publishable-key setup. */
const STRIPE_DEPENDENT_METHODS = new Set([
    'card',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
]);
class PaymentOrchestratorService {
    adapterFactory = inject(AdapterFactory);
    registry = inject(AdapterRegistry);
    themeService = inject(ThemeService);
    _availableMethods = signal([], /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_availableMethods" }] : /* istanbul ignore next */ []));
    _availabilityPublished = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_availabilityPublished" }] : /* istanbul ignore next */ []));
    _loading = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_loading" }] : /* istanbul ignore next */ []));
    initialized = false;
    /** In-flight adapter registration, shared by concurrent hosts so it runs once. */
    initPromise = null;
    /** Concurrent `processPayment` calls across hosts; `loading` is true while any is in flight. */
    inFlightPayments = 0;
    /**
     * Global last-refresh availability. UI hosts must not bind tiles to this signal
     * when multiple checkouts can mount — use the per-instance
     * `CheckoutAvailabilitySession` applied from the return value of
     * {@link refreshAvailability}. `EasyPaymentsDiagnosticsService` continues to
     * project this global snapshot.
     */
    availableMethods = this._availableMethods.asReadonly();
    /**
     * True after `refreshAvailability` publishes method readiness on the root
     * orchestrator. `reinitialize()` clears it until the next successful refresh.
     * Consuming apps should read `EasyPaymentsDiagnosticsService` for developer
     * diagnostics (also global / last-refresh).
     */
    availabilityPublished = this._availabilityPublished.asReadonly();
    loading = this._loading.asReadonly();
    async initialize() {
        if (this.initialized) {
            return;
        }
        // Registration destroys every adapter's mounts; never run it twice concurrently.
        if (!this.initPromise) {
            const pending = this.adapterFactory.initializeAdapters().then(() => {
                if (this.initPromise === pending) {
                    this.initialized = true;
                    this.initPromise = null;
                }
            }, (error) => {
                if (this.initPromise === pending) {
                    this.initPromise = null;
                }
                throw error;
            });
            this.initPromise = pending;
        }
        await this.initPromise;
    }
    /** Re-register adapters after runtime config changes (e.g. demo mock ↔ Stripe). */
    async reinitialize() {
        this.initialized = false;
        this.initPromise = null;
        this._availableMethods.set([]);
        this._availabilityPublished.set(false);
        await this.initialize();
    }
    setTheme(theme) {
        this.themeService.setTheme(theme);
    }
    validateProduct(product) {
        const result = validatePaymentProduct(product);
        if (!result.valid) {
            throw new PaymentError({
                code: 'PRODUCT_INVALID',
                message: result.errors.join(' '),
            });
        }
    }
    buildContext(product, checkout, theme) {
        return {
            product,
            checkout,
            // Prefer the caller-supplied theme so concurrent <easy-payments> instances
            // do not share a single root ThemeService resolution for availability.
            theme: theme ?? this.themeService.resolvedTheme(),
        };
    }
    async refreshAvailability(methods, product, checkout, theme) {
        await this.initialize();
        this.validateProduct(product);
        const context = this.buildContext(product, checkout, theme);
        const stripeFailure = this.adapterFactory.getInitializationFailure('stripe');
        const results = [];
        for (const method of methods) {
            const provider = PAYMENT_METHOD_PROVIDER_MAP[method];
            const adapter = this.registry.get(provider);
            const ownFailure = this.adapterFactory.getInitializationFailure(provider);
            const blockedByStripe = !!stripeFailure && STRIPE_DEPENDENT_METHODS.has(method) && provider !== 'stripe'
                ? stripeFailure
                : undefined;
            const failure = ownFailure ?? blockedByStripe;
            if (!adapter) {
                results.push({
                    method,
                    isMock: false,
                    available: false,
                    status: 'unavailable',
                    readiness: 'misconfigured',
                    diagnosticCode: 'PROVIDER_NOT_CONFIGURED',
                });
                continue;
            }
            if (failure) {
                results.push({
                    method,
                    isMock: adapter.isMock,
                    available: false,
                    status: 'error',
                    readiness: failure.readiness,
                    diagnosticCode: blockedByStripe && !ownFailure ? 'STRIPE_INITIALIZATION_FAILED' : failure.code,
                });
                continue;
            }
            try {
                const available = await adapter.isAvailable(context);
                const status = typeof adapter.getAvailabilityStatus ===
                    'function'
                    ? (adapter.getAvailabilityStatus(context.product) ?? undefined)
                    : available
                        ? 'available'
                        : 'unavailable';
                const readiness = readinessFromAvailability(available, status);
                results.push({
                    method,
                    isMock: adapter.isMock,
                    available,
                    status,
                    readiness,
                    diagnosticCode: available ? undefined : diagnosticCodeForUnavailable(method, status),
                });
            }
            catch (error) {
                const normalized = normalizeError(error, { method, provider });
                warnProviderDiagnostic(method, normalized.code);
                results.push({
                    method,
                    isMock: adapter.isMock,
                    available: false,
                    status: 'error',
                    readiness: normalized.code.startsWith('CONFIG') ? 'misconfigured' : 'unavailable',
                    diagnosticCode: normalized.code,
                });
            }
        }
        this._availableMethods.set(results);
        this._availabilityPublished.set(true);
        return results;
    }
    async processPayment(method, product, checkout) {
        await this.initialize();
        this.validateProduct(product);
        const provider = PAYMENT_METHOD_PROVIDER_MAP[method];
        const adapter = this.registry.get(provider);
        if (!adapter) {
            throw new PaymentError({
                code: 'PROVIDER_NOT_CONFIGURED',
                message: `No adapter registered for ${method}.`,
                method,
                provider,
            });
        }
        const context = this.buildContext(product, checkout);
        const available = await adapter.isAvailable(context);
        if (!available) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `${method} is not available for this checkout configuration.`,
                method,
                provider,
            });
        }
        this.inFlightPayments += 1;
        this._loading.set(true);
        try {
            const result = await adapter.createPayment({ method, context });
            return normalizePaymentResult(result);
        }
        catch (error) {
            throw normalizeError(error, { method, provider });
        }
        finally {
            this.inFlightPayments -= 1;
            this._loading.set(this.inFlightPayments > 0);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentOrchestratorService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentOrchestratorService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentOrchestratorService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
function readinessFromAvailability(available, status) {
    if (status === 'checking') {
        return 'loading';
    }
    if (available || status === 'available') {
        return 'ready';
    }
    if (status === 'error') {
        return 'unavailable';
    }
    return 'unavailable';
}
function diagnosticCodeForUnavailable(method, status) {
    if (status === 'checking') {
        return 'PROVIDER_AVAILABILITY_PENDING';
    }
    if (method === 'apple-pay' || method === 'google-pay') {
        return 'PROVIDER_UNAVAILABLE';
    }
    return 'PROVIDER_MISCONFIGURED';
}

/**
 * Shared CSS declaration-value sanitizers for host-bound custom properties.
 * Rejects injection payloads; keeps a single safe declaration value.
 */
const MAX_VALUE_LENGTH = 200;
const UNSAFE_CSS_VALUE = /[;{}<>]|\/\*|\*\/|url\s*\(|expression\s*\(|javascript:|@import|@charset|behavior\s*:/i;
const CSS_COLOR = /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*[^;{}()]+\s*\)|transparent|currentcolor|[a-z]{1,32})$/i;
const CSS_LENGTH = /^(0|[-+]?(?:\d*\.\d+|\d+)(?:px|rem|em|%|ch|ex|vh|vw|vmin|vmax|cm|mm|in|pt|pc))$/i;
const CSS_FONT_VAR = /^var\(\s*--[a-zA-Z_][\w-]*\s*\)$/;
const CSS_FONT_STACK = /^[a-z0-9\s,'"._-]+$/i;
const CSS_FONT_WEIGHT = /^(?:[1-9]00|1000|normal|bold|bolder|lighter|[1-9]|[1-9]\d{1,2})$/i;
const CSS_BORDER_STYLE = /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i;
const CSS_TEXT_ALIGN = /^(?:left|center|right|start|end)$/i;
function trimOrEmpty(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function isSafeCssValue(value) {
    if (!value || value.length > MAX_VALUE_LENGTH) {
        return false;
    }
    if (UNSAFE_CSS_VALUE.test(value)) {
        return false;
    }
    if (/[\u0000-\u001f\u007f]/.test(value)) {
        return false;
    }
    return true;
}
function sanitizeColor(value) {
    const raw = trimOrEmpty(value);
    if (!raw || !isSafeCssValue(raw) || !CSS_COLOR.test(raw)) {
        return null;
    }
    return raw;
}
function sanitizeLength(value) {
    const raw = trimOrEmpty(value);
    if (!raw || !isSafeCssValue(raw) || !CSS_LENGTH.test(raw)) {
        return null;
    }
    return raw;
}
function sanitizeFontFamily(value) {
    const raw = trimOrEmpty(value);
    if (!raw || !isSafeCssValue(raw)) {
        return null;
    }
    if (raw.toLowerCase() === 'inherit') {
        return 'inherit';
    }
    if (CSS_FONT_VAR.test(raw)) {
        return raw;
    }
    if (!CSS_FONT_STACK.test(raw)) {
        return null;
    }
    return raw;
}
function sanitizeFontWeight(value) {
    const raw = typeof value === 'number' && Number.isFinite(value)
        ? String(Math.round(value))
        : trimOrEmpty(value);
    if (!raw || !isSafeCssValue(raw) || !CSS_FONT_WEIGHT.test(raw)) {
        return null;
    }
    const asNum = Number(raw);
    if (!Number.isNaN(asNum) && (asNum < 1 || asNum > 1000)) {
        return null;
    }
    return raw;
}
function sanitizeBorderStyle(value) {
    const raw = trimOrEmpty(value).toLowerCase();
    if (!raw || !isSafeCssValue(raw) || !CSS_BORDER_STYLE.test(raw)) {
        return null;
    }
    return raw;
}
function sanitizeTextAlign(value) {
    const raw = trimOrEmpty(value).toLowerCase();
    if (!raw || !CSS_TEXT_ALIGN.test(raw)) {
        return null;
    }
    return raw;
}
/** 1–4 CSS length tokens (padding/margin shorthand). */
function sanitizePaddingShorthand(value) {
    const raw = trimOrEmpty(value);
    if (!raw || !isSafeCssValue(raw)) {
        return null;
    }
    const parts = raw.split(/\s+/);
    if (parts.length < 1 || parts.length > 4) {
        return null;
    }
    if (!parts.every((part) => CSS_LENGTH.test(part))) {
        return null;
    }
    return parts.join(' ');
}
/**
 * Plain-text CTA label: collapses whitespace, caps length, rejects markup.
 * Never treated as HTML.
 */
function sanitizePlainLabel(value, maxLength = 80) {
    if (typeof value !== 'string') {
        return null;
    }
    if (/[<>]/.test(value) || /[\u0000-\u001f\u007f]/.test(value)) {
        return null;
    }
    const stripped = value.replace(/\s+/g, ' ').trim();
    if (!stripped || stripped.length > maxLength) {
        return null;
    }
    return stripped;
}

/**
 * Exact default stack previously hardcoded on `:host`.
 * Kept as the `--ep-font-family` default so typography does not change
 * unless `visualStyle.fontFamily` is set.
 */
const DEFAULT_EP_FONT_FAMILY = "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
const EMPTY_HOST_VARS = {
    fontFamily: null,
    textColor: null,
    textSecondaryColor: null,
    backgroundColor: null,
    surfaceColor: null,
    accentColor: null,
    accentSoft: null,
    borderRadius: null,
    spacing: null,
};
/**
 * Soft accent fill derived from a sanitized accent color.
 * Used for selected-method tile backgrounds without inventing a second public API field.
 */
function deriveAccentSoft(accentColor) {
    return `color-mix(in srgb, ${accentColor} 14%, transparent)`;
}
/**
 * Map an optional {@link EasyPaymentsVisualStyle} to host CSS variable overrides.
 * Invalid or omitted fields become `null` (no inline override).
 */
function resolveVisualStyleCssVars(style) {
    if (style == null || typeof style !== 'object') {
        return { ...EMPTY_HOST_VARS };
    }
    const accentColor = sanitizeColor(style.accentColor);
    return {
        fontFamily: sanitizeFontFamily(style.fontFamily),
        textColor: sanitizeColor(style.textColor),
        textSecondaryColor: sanitizeColor(style.textSecondaryColor),
        backgroundColor: sanitizeColor(style.backgroundColor),
        surfaceColor: sanitizeColor(style.surfaceColor),
        accentColor,
        accentSoft: accentColor ? deriveAccentSoft(accentColor) : null,
        borderRadius: sanitizeLength(style.borderRadius),
        spacing: sanitizeLength(style.spacing),
    };
}

/**
 * WCAG 2.x relative luminance and contrast-ratio helpers for Easy Payments
 * developer diagnostics. No runtime dependency.
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
/** WCAG AA minimum contrast for normal text. */
const WCAG_AA_NORMAL_TEXT = 4.5;
/** WCAG AA minimum for large text and non-text UI components (e.g. focus rings). */
const WCAG_AA_UI_OR_LARGE_TEXT = 3;
const NAMED_COLORS = {
    black: { r: 0, g: 0, b: 0, a: 1 },
    white: { r: 255, g: 255, b: 255, a: 1 },
    red: { r: 255, g: 0, b: 0, a: 1 },
    green: { r: 0, g: 128, b: 0, a: 1 },
    blue: { r: 0, g: 0, b: 255, a: 1 },
    yellow: { r: 255, g: 255, b: 0, a: 1 },
    orange: { r: 255, g: 165, b: 0, a: 1 },
    purple: { r: 128, g: 0, b: 128, a: 1 },
    gray: { r: 128, g: 128, b: 128, a: 1 },
    grey: { r: 128, g: 128, b: 128, a: 1 },
    silver: { r: 192, g: 192, b: 192, a: 1 },
    navy: { r: 0, g: 0, b: 128, a: 1 },
    teal: { r: 0, g: 128, b: 128, a: 1 },
    maroon: { r: 128, g: 0, b: 0, a: 1 },
    olive: { r: 128, g: 128, b: 0, a: 1 },
    lime: { r: 0, g: 255, b: 0, a: 1 },
    aqua: { r: 0, g: 255, b: 255, a: 1 },
    cyan: { r: 0, g: 255, b: 255, a: 1 },
    fuchsia: { r: 255, g: 0, b: 255, a: 1 },
    magenta: { r: 255, g: 0, b: 255, a: 1 },
    rebeccapurple: { r: 102, g: 51, b: 153, a: 1 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
};
function clampByte(n) {
    return Math.min(255, Math.max(0, Math.round(n)));
}
function channelToLinear(c8) {
    const c = c8 / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
/** Relative luminance in 0–1 (WCAG). Alpha is ignored; composite first if needed. */
function relativeLuminance(rgb) {
    const r = channelToLinear(rgb.r);
    const g = channelToLinear(rgb.g);
    const b = channelToLinear(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Contrast ratio ≥ 1 (WCAG). */
function contrastRatio(foreground, background) {
    const l1 = relativeLuminance(foreground);
    const l2 = relativeLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}
/** Source-over alpha composite of fg onto bg. */
function compositeOver(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a <= 0) {
        return { r: 0, g: 0, b: 0, a: 0 };
    }
    return {
        r: clampByte((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a),
        g: clampByte((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a),
        b: clampByte((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a),
        a,
    };
}
function isEffectivelyTransparent(color, epsilon = 0.01) {
    return color.a <= epsilon;
}
function isOpaqueEnoughForTextBackdrop(color, minAlpha = 0.98) {
    return color.a >= minAlpha;
}
function parseHex(raw) {
    const hex = raw.slice(1);
    if (!/^[0-9a-f]+$/i.test(hex)) {
        return null;
    }
    if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
        return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
    }
    return null;
}
function parseRgbFunction(raw) {
    const match = raw.match(/^rgba?\(\s*([\d.%\s,/+-]+)\s*\)$/i);
    if (!match) {
        return null;
    }
    const body = match[1].trim();
    const parts = body.includes(',')
        ? body.split(',').map((p) => p.trim())
        : body.split(/\s+/).filter(Boolean);
    // Modern "r g b / a"
    let alpha = 1;
    if (parts.length >= 4 && parts[3].startsWith('/')) {
        // unlikely
    }
    const slashIdx = parts.findIndex((p) => p === '/');
    let channels = parts;
    if (slashIdx >= 0) {
        channels = parts.slice(0, slashIdx);
        alpha = parseCssNumber(parts[slashIdx + 1] ?? '1', true) ?? 1;
    }
    else if (parts.length === 4) {
        channels = parts.slice(0, 3);
        alpha = parseCssNumber(parts[3], true) ?? 1;
    }
    else if (parts.length !== 3) {
        return null;
    }
    const r = parseRgbChannel(channels[0]);
    const g = parseRgbChannel(channels[1]);
    const b = parseRgbChannel(channels[2]);
    if (r == null || g == null || b == null) {
        return null;
    }
    return { r, g, b, a: alpha };
}
function parseRgbChannel(token) {
    if (!token) {
        return null;
    }
    if (token.endsWith('%')) {
        const pct = Number.parseFloat(token);
        if (!Number.isFinite(pct)) {
            return null;
        }
        return clampByte((pct / 100) * 255);
    }
    const n = Number.parseFloat(token);
    if (!Number.isFinite(n)) {
        return null;
    }
    return clampByte(n);
}
function parseCssNumber(token, allowPercent) {
    if (allowPercent && token.endsWith('%')) {
        const pct = Number.parseFloat(token);
        return Number.isFinite(pct) ? Math.min(1, Math.max(0, pct / 100)) : null;
    }
    const n = Number.parseFloat(token);
    return Number.isFinite(n) ? n : null;
}
function parseHslFunction(raw) {
    const match = raw.match(/^hsla?\(\s*([\d.%a-z\s,/+-]+)\s*\)$/i);
    if (!match) {
        return null;
    }
    const body = match[1].trim();
    const normalized = body.replace(/\s*\/\s*/g, ' / ');
    const parts = normalized.includes(',')
        ? normalized.split(',').map((p) => p.trim())
        : normalized.split(/\s+/).filter(Boolean);
    let hTok;
    let sTok;
    let lTok;
    let a = 1;
    if (parts.includes('/')) {
        const idx = parts.indexOf('/');
        if (idx !== 3 || parts.length < 5) {
            return null;
        }
        [hTok, sTok, lTok] = parts;
        a = parseCssNumber(parts[4], true) ?? 1;
    }
    else if (parts.length === 4) {
        [hTok, sTok, lTok] = parts;
        a = parseCssNumber(parts[3], true) ?? 1;
    }
    else if (parts.length === 3) {
        [hTok, sTok, lTok] = parts;
    }
    else {
        return null;
    }
    const h = Number.parseFloat(hTok);
    const s = parseCssNumber(sTok.endsWith('%') ? sTok : `${sTok}%`, true);
    const l = parseCssNumber(lTok.endsWith('%') ? lTok : `${lTok}%`, true);
    if (!Number.isFinite(h) || s == null || l == null) {
        return null;
    }
    return { ...hslToRgb(h, s, l), a };
}
function hslToRgb(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - c / 2;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (hue < 60) {
        rp = c;
        gp = x;
    }
    else if (hue < 120) {
        rp = x;
        gp = c;
    }
    else if (hue < 180) {
        gp = c;
        bp = x;
    }
    else if (hue < 240) {
        gp = x;
        bp = c;
    }
    else if (hue < 300) {
        rp = x;
        bp = c;
    }
    else {
        rp = c;
        bp = x;
    }
    return {
        r: clampByte((rp + m) * 255),
        g: clampByte((gp + m) * 255),
        b: clampByte((bp + m) * 255),
    };
}
/**
 * Parse a CSS color used by Easy Payments tokens / visualStyle.
 * Returns null for unresolved values (empty, var(), color-mix, unknown).
 * `'transparent'` parses to alpha 0.
 */
function parseCssColor(value) {
    if (value == null) {
        return null;
    }
    const raw = value.trim();
    if (!raw) {
        return null;
    }
    const lower = raw.toLowerCase();
    if (lower.startsWith('var(') || lower.includes('color-mix(') || lower.includes('oklch(')) {
        return null;
    }
    if (NAMED_COLORS[lower]) {
        return { ...NAMED_COLORS[lower] };
    }
    if (raw.startsWith('#')) {
        return parseHex(raw);
    }
    if (/^rgba?\(/i.test(raw)) {
        return parseRgbFunction(raw);
    }
    if (/^hsla?\(/i.test(raw)) {
        return parseHslFunction(raw);
    }
    return null;
}
/** Format RGB for diagnostic messages. */
function formatRgb(rgb) {
    if (rgb.a < 1) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(rgb.a.toFixed(3))})`;
    }
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}
/** Round contrast ratio for stable messages / tests. */
function formatContrastRatio(ratio) {
    return `${Math.round(ratio * 100) / 100}:1`;
}

const LIGHT_THEME_COLORS = {
    text: '#0f172a',
    textSecondary: '#64748b',
    background: 'transparent',
    surface: '#ffffff',
    accent: '#2563eb',
    accentSoft: '#eff6ff',
    focus: '#2563eb',
};
const DARK_THEME_COLORS = {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: 'transparent',
    surface: '#111827',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.12)',
    focus: '#93c5fd',
};
function themeColorsFor(theme) {
    return theme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
}
/**
 * Merge theme defaults with sanitized visualStyle overrides (same effective
 * colors the host CSS variables would use).
 */
function resolveEffectiveVisualColors(theme, style) {
    const base = themeColorsFor(theme);
    const overrides = resolveVisualStyleCssVars(style);
    return {
        text: overrides.textColor ?? base.text,
        textSecondary: overrides.textSecondaryColor ?? base.textSecondary,
        background: overrides.backgroundColor ?? base.background,
        surface: overrides.surfaceColor ?? base.surface,
        accent: overrides.accentColor ?? base.accent,
        accentSoft: overrides.accentSoft ?? base.accentSoft,
        focus: overrides.accentColor ?? base.focus,
    };
}
function pushFailure(failures, id, kind, propertyPair, foregroundCss, backgroundCss, fg, bg) {
    const minimum = kind === 'normal-text' ? WCAG_AA_NORMAL_TEXT : WCAG_AA_UI_OR_LARGE_TEXT;
    const ratio = contrastRatio(fg, bg);
    if (ratio + 1e-9 >= minimum) {
        return;
    }
    failures.push({
        id,
        kind,
        propertyPair,
        foregroundCss,
        backgroundCss,
        ratio,
        minimum,
    });
}
function resolveOpaqueColor(css, skips, checkId, propertyPair, transparentDetail) {
    const parsed = parseCssColor(css);
    if (!parsed) {
        skips.push({
            id: `${checkId}:unresolved`,
            propertyPair,
            reason: 'unresolved-color',
            detail: `Could not parse background color "${css}". Contrast was not estimated.`,
        });
        return null;
    }
    if (isEffectivelyTransparent(parsed) || !isOpaqueEnoughForTextBackdrop(parsed)) {
        skips.push({
            id: `${checkId}:transparent`,
            propertyPair,
            reason: 'transparent-background',
            detail: transparentDetail,
        });
        return null;
    }
    return { css, rgb: parsed };
}
/**
 * Soft accent fill as used for selected tiles: accent at ~14% over the surface.
 * Prefer compositing over parsing color-mix() strings.
 */
function resolveAccentSoftAgainstSurface(accentCss, surfaceCss) {
    const accent = parseCssColor(accentCss);
    const surface = parseCssColor(surfaceCss);
    if (!accent || !surface || isEffectivelyTransparent(surface)) {
        return null;
    }
    const tint = { ...accent, a: 0.14 };
    const rgb = compositeOver(tint, { ...surface, a: 1 });
    return {
        css: `color-mix(in srgb, ${accentCss} 14%, ${surfaceCss})`,
        rgb,
    };
}
function checkTextPairsOnBackdrop(failures, skips, colors, backdrop, options) {
    const text = parseCssColor(colors.text);
    const textSecondary = parseCssColor(colors.textSecondary);
    const accent = parseCssColor(colors.accent);
    const focus = parseCssColor(colors.focus);
    if (text) {
        pushFailure(failures, options.textId, 'normal-text', options.textPair, colors.text, backdrop.css, text, backdrop.rgb);
    }
    else {
        skips.push({
            id: `${options.textId}:unresolved-fg`,
            propertyPair: 'textColor',
            reason: 'unresolved-color',
            detail: `Could not parse text color "${colors.text}".`,
        });
    }
    if (textSecondary) {
        pushFailure(failures, options.secondaryId, 'normal-text', options.secondaryPair, colors.textSecondary, backdrop.css, textSecondary, backdrop.rgb);
    }
    if (options.includeAccentText && accent) {
        pushFailure(failures, 'accent-text-on-surface', 'normal-text', 'visualStyle.accentColor (as text) vs surface', colors.accent, backdrop.css, accent, backdrop.rgb);
    }
    if (options.includeFocus && focus) {
        pushFailure(failures, 'focus-on-shell', 'ui-non-text', options.focusPair, colors.focus, backdrop.css, focus, backdrop.rgb);
    }
}
/**
 * Evaluate Easy Payments–owned text / surface / accent / focus pairs.
 * Does not inspect provider SDK chrome. Never mutates colors.
 *
 * Backdrop rules:
 * - `appearance="default"`: checkout chrome text sits on `--ep-surface`.
 * - `appearance="transparent"`: chrome text sits on host `--ep-background`
 *   (often unknown/transparent → skip). Tile/panel text still uses `--ep-surface`
 *   when that surface is opaque — never treat an invisible shell as painted.
 */
function evaluateVisualStyleContrast(options) {
    const colors = resolveEffectiveVisualColors(options.theme, options.style);
    const failures = [];
    const skips = [];
    const opaqueSurface = resolveOpaqueColor(colors.surface, skips, 'surface', 'textColor / surfaceColor', `Surface "${colors.surface}" is transparent or translucent; tile/panel contrast against an unknown underlay was not estimated.`);
    if (options.appearance === 'default') {
        // Shell and tiles share --ep-surface when the default chrome is painted.
        if (opaqueSurface) {
            checkTextPairsOnBackdrop(failures, skips, colors, opaqueSurface, {
                textId: 'text-on-shell',
                secondaryId: 'text-secondary-on-shell',
                textPair: 'visualStyle.textColor vs surface',
                secondaryPair: 'visualStyle.textSecondaryColor vs surface',
                includeAccentText: true,
                includeFocus: true,
                focusPair: 'visualStyle.accentColor / focus vs surface',
            });
        }
    }
    else {
        // Transparent shell: do not evaluate chrome text against surface (shell is not painted).
        const hostBackdrop = resolveOpaqueColor(colors.background, skips, 'host-background', 'textColor / backgroundColor', 'appearance="transparent" with a transparent/unknown host background leaves the underlying page color unknown. Chrome text contrast was not estimated.');
        if (hostBackdrop) {
            checkTextPairsOnBackdrop(failures, skips, colors, hostBackdrop, {
                textId: 'text-on-host',
                secondaryId: 'text-secondary-on-host',
                textPair: 'visualStyle.textColor vs host background',
                secondaryPair: 'visualStyle.textSecondaryColor vs host background',
                includeAccentText: false,
                includeFocus: true,
                focusPair: 'visualStyle.accentColor / focus vs host background',
            });
        }
        // Tiles/panels still use --ep-surface when it is opaque.
        if (opaqueSurface) {
            checkTextPairsOnBackdrop(failures, skips, colors, opaqueSurface, {
                textId: 'text-on-tile-surface',
                secondaryId: 'text-secondary-on-tile-surface',
                textPair: 'visualStyle.textColor vs tile surface',
                secondaryPair: 'visualStyle.textSecondaryColor vs tile surface',
                includeAccentText: true,
                includeFocus: false,
                focusPair: '',
            });
        }
    }
    // Selected method tile: primary text on soft accent over surface.
    const soft = resolveAccentSoftAgainstSurface(colors.accent, colors.surface);
    const textOnSoft = parseCssColor(colors.text);
    if (soft && textOnSoft) {
        pushFailure(failures, 'text-on-accent-soft', 'normal-text', 'visualStyle.textColor vs selected-tile accent soft fill', colors.text, soft.css, textOnSoft, soft.rgb);
    }
    else if (!soft) {
        skips.push({
            id: 'accent-soft:unresolved',
            propertyPair: 'accentColor / surfaceColor',
            reason: 'unresolved-color',
            detail: 'Selected-tile accent soft fill could not be resolved against a known opaque surface; that pair was skipped.',
        });
    }
    return { failures, skips };
}
function failureKey(failure) {
    return [
        failure.id,
        failure.foregroundCss,
        failure.backgroundCss,
        failure.minimum,
        formatContrastRatio(failure.ratio),
    ].join('|');
}
function skipKey(skip) {
    return `${skip.id}|${skip.reason}|${skip.detail}`;
}
/**
 * Per-checkout-instance tracker: warns in development only, dedupes identical
 * messages, and drops stale keys when the visual configuration improves.
 */
class VisualStyleContrastWarningTracker {
    warned = new Set();
    /** Test helper. */
    reset() {
        this.warned.clear();
    }
    /** Keys currently remembered (tests). */
    warnedKeys() {
        return this.warned;
    }
    report(report) {
        if (!isDevMode()) {
            return;
        }
        const active = new Set();
        for (const failure of report.failures) {
            const key = failureKey(failure);
            active.add(key);
            if (this.warned.has(key)) {
                continue;
            }
            this.warned.add(key);
            const fgParsed = parseCssColor(failure.foregroundCss);
            const fgLabel = fgParsed
                ? `${failure.foregroundCss} (${formatRgb(fgParsed)})`
                : failure.foregroundCss;
            console.warn([
                '[Easy Payments] Low contrast in Easy Payments–owned UI (developer warning only).',
                `Pair: ${failure.propertyPair}`,
                `Foreground: ${fgLabel}`,
                `Background: ${failure.backgroundCss}`,
                `Contrast ratio: ${formatContrastRatio(failure.ratio)}`,
                `Recommended minimum (${failure.kind === 'normal-text' ? 'WCAG AA normal text' : 'WCAG AA non-text UI'}): ${failure.minimum}:1`,
                'Colors were not changed. Checkout was not blocked. This is not a full WCAG audit.',
            ].join('\n'));
        }
        for (const skip of report.skips) {
            // Only surface transparent/unknown backdrop skips (actionable for merchants).
            if (skip.reason !== 'transparent-background') {
                continue;
            }
            const key = skipKey(skip);
            active.add(key);
            if (this.warned.has(key)) {
                continue;
            }
            this.warned.add(key);
            console.info([
                '[Easy Payments] Contrast check skipped (developer notice only).',
                `Pair: ${skip.propertyPair}`,
                skip.detail,
                'Easy Payments does not guess underlying host page colors.',
            ].join('\n'));
        }
        for (const key of [...this.warned]) {
            if (!active.has(key)) {
                this.warned.delete(key);
            }
        }
    }
}

/**
 * Presentational money formatting for checkout UI.
 * Not used for charge authority — backends determine trusted amounts.
 * Locale affects formatting only; amount and currency code are unchanged.
 */
function formatMoney(amount, currency, quantity = 1, locale) {
    const total = amount * quantity;
    const code = (currency || 'USD').trim().toUpperCase() || 'USD';
    const localeTag = locale && locale.trim() ? locale.trim() : undefined;
    try {
        return new Intl.NumberFormat(localeTag, {
            style: 'currency',
            currency: code,
            currencyDisplay: 'symbol',
        }).format(total);
    }
    catch {
        return `${code} ${total.toFixed(2)}`;
    }
}
function formatUnitAmount(amount, currency, locale) {
    return formatMoney(amount, currency, 1, locale);
}

const EASY_PAYMENTS_SUPPORTED_LOCALES = [
    'en',
    'es',
    'pt',
];
const EASY_PAYMENTS_DEFAULT_LOCALE = 'auto';

/**
 * Normalize a BCP 47 / browser language tag to a supported Easy Payments locale.
 * Unsupported languages resolve to English.
 */
function normalizeLanguageTag(tag) {
    if (!tag || typeof tag !== 'string') {
        return 'en';
    }
    const normalized = tag.trim().toLowerCase().replace(/_/g, '-');
    if (!normalized) {
        return 'en';
    }
    const base = normalized.split('-')[0] ?? '';
    if (base === 'es') {
        return 'es';
    }
    if (base === 'pt') {
        return 'pt';
    }
    if (base === 'en') {
        return 'en';
    }
    return 'en';
}
/**
 * SSR-safe browser language detection.
 * Never touches navigator during evaluation unless it exists.
 */
function detectBrowserLocale(languages, language) {
    const list = languages && languages.length > 0
        ? languages
        : language
            ? [language]
            : readNavigatorLanguages();
    for (const tag of list) {
        const resolved = normalizeLanguageTag(tag);
        // First tag wins after normalization (unsupported -> en still "wins" as English).
        if (tag && typeof tag === 'string' && tag.trim()) {
            return resolved;
        }
    }
    return 'en';
}
function readNavigatorLanguages() {
    try {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (!nav) {
            return [];
        }
        if (Array.isArray(nav.languages) && nav.languages.length > 0) {
            return nav.languages;
        }
        if (typeof nav.language === 'string' && nav.language.trim()) {
            return [nav.language];
        }
    }
    catch {
        // Ignore — SSR / restricted environments.
    }
    return [];
}
/**
 * Resolve the effective dictionary locale from a requested locale input.
 */
function resolveEffectiveLocale(requested, options) {
    if (requested == null || requested === '' || requested === 'auto') {
        return detectBrowserLocale(options?.languages, options?.language);
    }
    if (requested === 'en' || requested === 'es' || requested === 'pt') {
        return requested;
    }
    // Unexpected values (including regional tags passed by mistake) normalize safely.
    return normalizeLanguageTag(String(requested));
}

/**
 * Replace `{{token}}` placeholders in a translation string.
 */
function interpolate(template, params = {}) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
        const value = params[key];
        return value == null ? '' : String(value);
    });
}

const EN_TRANSLATIONS = {
    checkoutAriaLabel: 'Checkout',
    paymentMethodsLabel: 'Payment methods',
    paymentMethodSelectionAria: 'Payment method selection',
    checkoutTitle: 'Complete your purchase',
    checkoutSubtitle: 'Choose your preferred payment method',
    noPaymentMethodsAvailable: 'No payment methods are available for this configuration.',
    demoBadge: 'Demo',
    demoModeAria: 'demo mode',
    methodCard: 'Card',
    orderTotal: 'Order total',
    quantityPrefix: 'Qty',
    eachSuffix: 'each',
    processingTitle: 'Processing payment...',
    processingHint: "Please don't close this window.",
    successTitle: 'Payment successful',
    successBody: 'Your payment has been completed successfully.',
    successContinue: 'Continue',
    successProduct: 'Product',
    successTotal: 'Total',
    successPaidWith: 'Paid with',
    successTransaction: 'Transaction',
    errorTitle: 'Payment failed',
    errorBody: "We couldn't complete your payment.",
    errorTryAgain: 'Try again',
    errorDetailCardDeclined: 'Your card was declined. Please try another payment method.',
    errorDetailNetwork: 'A network error occurred. Please check your connection and try again.',
    errorDetailConfig: 'Checkout is not configured correctly. Please contact the merchant.',
    errorDetailUnavailable: 'This payment method is not available right now.',
    errorDetailAuthRequired: 'Additional authentication is required to complete this payment.',
    errorDetailAuthFailed: 'Authentication failed. Please try again.',
    errorDetailSdkLoad: 'Unable to load the payment provider. Please refresh and try again.',
    errorDetailBackend: 'Unable to reach the payment server. Please try again.',
    errorDetailProductInvalid: 'This product cannot be purchased with the current details.',
    errorDetailCancelled: 'The payment was cancelled before it was completed.',
    cancelledTitle: 'Payment cancelled',
    cancelledBody: 'No payment was completed.',
    cancelledReturn: 'Return to checkout',
    payWithMethod: 'Pay with {{method}}',
    demoCheckoutHint: 'Demo checkout — no real payment is processed.',
    buttonsDemoModeNotice: 'Demo mode — no real payments will be processed.',
    continuePaymentHint: 'Continue to complete your payment.',
    processingPayment: 'Processing payment…',
    awaitingProviderPayment: 'Waiting for provider confirmation…',
    payAmount: 'Pay {{amount}}',
    payAmountWithMethodAria: 'Pay {{amount}} with {{method}}',
    confirmPayment: 'Confirm payment',
    confirmPaymentWithMethodAria: 'Confirm {{method}} payment',
    continueToMethod: 'Continue to {{method}}',
    completeDemoPayment: 'Complete demo payment',
    completeDemoPaymentWithMethodAria: 'Complete demo {{method}} payment (no real charge)',
    methodLoadingStatus: 'Loading',
    methodUnavailableStatus: 'Unavailable',
    cardPaymentRegionAria: 'Card payment',
    klarnaPaymentRegionAria: 'Klarna payment',
    affirmPaymentRegionAria: 'Affirm payment',
    demoWalletButtonAria: '{{method}}, demo mode',
    payWithCard: 'Pay with card',
    secureCardPaymentStripe: 'Secure card payment powered by Stripe',
    preparingSecureCardForm: 'Preparing secure card form…',
    stripeCardFormAria: 'Stripe secure card payment form',
    acceptedCardsAria: 'Commonly accepted cards',
    cardsAcceptedViaStripe: 'Cards accepted via Stripe (Visa, Mastercard, American Express, and more)',
    paymentCompleted: 'Payment completed.',
    defaultSecureCheckout: 'Secure checkout — your payment details stay with the payment provider.',
    payWithPayPal: 'Pay with PayPal',
    secureCheckoutPayPal: 'Secure checkout powered by PayPal',
    preparingPayPal: 'Preparing PayPal checkout…',
    creatingPayPalOrder: 'Creating PayPal order…',
    waitingPayPalApproval: 'Waiting for PayPal approval…',
    capturingPayPal: 'Capturing PayPal payment…',
    paypalCheckoutAria: 'PayPal official checkout',
    paypalCancelled: 'PayPal checkout cancelled.',
    payWithGooglePay: 'Pay with Google Pay',
    secureCheckoutGooglePay: 'Secure checkout with Google Pay',
    preparingGooglePay: 'Preparing Google Pay…',
    googlePayUnavailable: 'Google Pay is not available in this browser or Google account.',
    preparingSecurePayment: 'Preparing secure payment…',
    waitingGooglePay: 'Waiting for Google Pay…',
    processingGooglePay: 'Processing Google Pay payment…',
    googlePayCheckoutAria: 'Google Pay official checkout',
    totalAmount: 'Total {{amount}}',
    payWithApplePay: 'Pay with Apple Pay',
    secureCheckoutApplePay: 'Secure checkout with Apple Pay',
    preparingApplePay: 'Preparing Apple Pay…',
    applePayUnavailable: 'Apple Pay is not available in this browser or Wallet.',
    processingApplePay: 'Processing Apple Pay payment…',
    applePayCheckoutAria: 'Apple Pay official checkout',
    payWithKlarna: 'Pay with Klarna',
    secureCheckoutKlarna: 'Secure checkout powered by Klarna via Stripe',
    preparingKlarna: 'Preparing Klarna…',
    klarnaFormAria: 'Klarna secure payment form',
    payWithAffirm: 'Pay with Affirm',
    secureCheckoutAffirm: 'Secure checkout powered by Affirm via Stripe',
    preparingAffirm: 'Preparing Affirm…',
    affirmFormAria: 'Affirm secure payment form',
};

/** Neutral international Spanish. Provider trademarks stay untranslated. */
const ES_TRANSLATIONS = {
    checkoutAriaLabel: 'Pago',
    paymentMethodsLabel: 'Métodos de pago',
    paymentMethodSelectionAria: 'Selección de método de pago',
    checkoutTitle: 'Completa tu compra',
    checkoutSubtitle: 'Elige tu método de pago preferido',
    noPaymentMethodsAvailable: 'No hay métodos de pago disponibles para esta configuración.',
    demoBadge: 'Demo',
    demoModeAria: 'modo demo',
    methodCard: 'Tarjeta',
    orderTotal: 'Total del pedido',
    quantityPrefix: 'Cant.',
    eachSuffix: 'c/u',
    processingTitle: 'Procesando el pago...',
    processingHint: 'Por favor, no cierre esta ventana.',
    successTitle: 'Pago realizado',
    successBody: 'Su pago se completó correctamente.',
    successContinue: 'Continuar',
    successProduct: 'Producto',
    successTotal: 'Total',
    successPaidWith: 'Pagado con',
    successTransaction: 'Transacción',
    errorTitle: 'Pago fallido',
    errorBody: 'No pudimos completar su pago.',
    errorTryAgain: 'Intentar de nuevo',
    errorDetailCardDeclined: 'Su tarjeta fue rechazada. Pruebe con otro método de pago.',
    errorDetailNetwork: 'Ocurrió un error de red. Compruebe su conexión e inténtelo de nuevo.',
    errorDetailConfig: 'El checkout no está configurado correctamente. Contacte al comercio.',
    errorDetailUnavailable: 'Este método de pago no está disponible en este momento.',
    errorDetailAuthRequired: 'Se requiere autenticación adicional para completar este pago.',
    errorDetailAuthFailed: 'La autenticación falló. Inténtelo de nuevo.',
    errorDetailSdkLoad: 'No se pudo cargar el proveedor de pago. Actualice e inténtelo de nuevo.',
    errorDetailBackend: 'No se pudo contactar al servidor de pagos. Inténtelo de nuevo.',
    errorDetailProductInvalid: 'Este producto no se puede comprar con los datos actuales.',
    errorDetailCancelled: 'El pago se canceló antes de completarse.',
    cancelledTitle: 'Pago cancelado',
    cancelledBody: 'No se completó ningún pago.',
    cancelledReturn: 'Volver al checkout',
    payWithMethod: 'Pagar con {{method}}',
    demoCheckoutHint: 'Checkout de demostración — no se procesa un pago real.',
    buttonsDemoModeNotice: 'Modo demo — no se procesarán pagos reales.',
    continuePaymentHint: 'Continúe para completar su pago.',
    processingPayment: 'Procesando el pago…',
    awaitingProviderPayment: 'Esperando la confirmación del proveedor…',
    payAmount: 'Pagar {{amount}}',
    payAmountWithMethodAria: 'Pagar {{amount}} con {{method}}',
    confirmPayment: 'Confirmar pago',
    confirmPaymentWithMethodAria: 'Confirmar pago con {{method}}',
    continueToMethod: 'Continuar con {{method}}',
    completeDemoPayment: 'Completar pago de demostración',
    completeDemoPaymentWithMethodAria: 'Completar pago de demostración con {{method}} (sin cargo real)',
    methodLoadingStatus: 'Cargando',
    methodUnavailableStatus: 'No disponible',
    cardPaymentRegionAria: 'Pago con tarjeta',
    klarnaPaymentRegionAria: 'Pago con Klarna',
    affirmPaymentRegionAria: 'Pago con Affirm',
    demoWalletButtonAria: '{{method}}, modo demo',
    payWithCard: 'Pagar con tarjeta',
    secureCardPaymentStripe: 'Pago con tarjeta seguro impulsado por Stripe',
    preparingSecureCardForm: 'Preparando el formulario seguro de tarjeta…',
    stripeCardFormAria: 'Formulario seguro de tarjeta de Stripe',
    acceptedCardsAria: 'Tarjetas comúnmente aceptadas',
    cardsAcceptedViaStripe: 'Tarjetas aceptadas a través de Stripe (Visa, Mastercard, American Express y más)',
    paymentCompleted: 'Pago completado.',
    defaultSecureCheckout: 'Checkout seguro — sus datos de pago permanecen con el proveedor de pagos.',
    payWithPayPal: 'Pagar con PayPal',
    secureCheckoutPayPal: 'Checkout seguro impulsado por PayPal',
    preparingPayPal: 'Preparando el checkout de PayPal…',
    creatingPayPalOrder: 'Creando el pedido de PayPal…',
    waitingPayPalApproval: 'Esperando la aprobación de PayPal…',
    capturingPayPal: 'Capturando el pago de PayPal…',
    paypalCheckoutAria: 'Checkout oficial de PayPal',
    paypalCancelled: 'Checkout de PayPal cancelado.',
    payWithGooglePay: 'Pagar con Google Pay',
    secureCheckoutGooglePay: 'Checkout seguro con Google Pay',
    preparingGooglePay: 'Preparando Google Pay…',
    googlePayUnavailable: 'Google Pay no está disponible en este navegador o cuenta de Google.',
    preparingSecurePayment: 'Preparando el pago seguro…',
    waitingGooglePay: 'Esperando Google Pay…',
    processingGooglePay: 'Procesando el pago con Google Pay…',
    googlePayCheckoutAria: 'Checkout oficial de Google Pay',
    totalAmount: 'Total {{amount}}',
    payWithApplePay: 'Pagar con Apple Pay',
    secureCheckoutApplePay: 'Checkout seguro con Apple Pay',
    preparingApplePay: 'Preparando Apple Pay…',
    applePayUnavailable: 'Apple Pay no está disponible en este navegador o Wallet.',
    processingApplePay: 'Procesando el pago con Apple Pay…',
    applePayCheckoutAria: 'Checkout oficial de Apple Pay',
    payWithKlarna: 'Pagar con Klarna',
    secureCheckoutKlarna: 'Checkout seguro impulsado por Klarna a través de Stripe',
    preparingKlarna: 'Preparando Klarna…',
    klarnaFormAria: 'Formulario seguro de pago de Klarna',
    payWithAffirm: 'Pagar con Affirm',
    secureCheckoutAffirm: 'Checkout seguro impulsado por Affirm a través de Stripe',
    preparingAffirm: 'Preparando Affirm…',
    affirmFormAria: 'Formulario seguro de pago de Affirm',
};

/** Brazilian Portuguese for v1.1.0. Provider trademarks stay untranslated. */
const PT_TRANSLATIONS = {
    checkoutAriaLabel: 'Pagamento',
    paymentMethodsLabel: 'Formas de pagamento',
    paymentMethodSelectionAria: 'Seleção da forma de pagamento',
    checkoutTitle: 'Finalize sua compra',
    checkoutSubtitle: 'Escolha seu método de pagamento preferido',
    noPaymentMethodsAvailable: 'Nenhum método de pagamento está disponível para esta configuração.',
    demoBadge: 'Demo',
    demoModeAria: 'modo demo',
    methodCard: 'Cartão',
    orderTotal: 'Total do pedido',
    quantityPrefix: 'Qtd.',
    eachSuffix: 'cada',
    processingTitle: 'Processando pagamento...',
    processingHint: 'Por favor, não feche esta janela.',
    successTitle: 'Pagamento concluído',
    successBody: 'Seu pagamento foi concluído com sucesso.',
    successContinue: 'Continuar',
    successProduct: 'Produto',
    successTotal: 'Total',
    successPaidWith: 'Pago com',
    successTransaction: 'Transação',
    errorTitle: 'Falha no pagamento',
    errorBody: 'Não foi possível concluir seu pagamento.',
    errorTryAgain: 'Tentar novamente',
    errorDetailCardDeclined: 'Seu cartão foi recusado. Tente outro método de pagamento.',
    errorDetailNetwork: 'Ocorreu um erro de rede. Verifique sua conexão e tente novamente.',
    errorDetailConfig: 'O checkout não está configurado corretamente. Contate o comerciante.',
    errorDetailUnavailable: 'Este método de pagamento não está disponível no momento.',
    errorDetailAuthRequired: 'É necessária autenticação adicional para concluir este pagamento.',
    errorDetailAuthFailed: 'A autenticação falhou. Tente novamente.',
    errorDetailSdkLoad: 'Não foi possível carregar o provedor de pagamento. Atualize e tente novamente.',
    errorDetailBackend: 'Não foi possível contatar o servidor de pagamentos. Tente novamente.',
    errorDetailProductInvalid: 'Este produto não pode ser comprado com os dados atuais.',
    errorDetailCancelled: 'O pagamento foi cancelado antes de ser concluído.',
    cancelledTitle: 'Pagamento cancelado',
    cancelledBody: 'Nenhum pagamento foi concluído.',
    cancelledReturn: 'Voltar ao checkout',
    payWithMethod: 'Pagar com {{method}}',
    demoCheckoutHint: 'Checkout de demonstração — nenhum pagamento real é processado.',
    buttonsDemoModeNotice: 'Modo demo — nenhum pagamento real será processado.',
    continuePaymentHint: 'Continue para concluir seu pagamento.',
    processingPayment: 'Processando pagamento…',
    awaitingProviderPayment: 'Aguardando confirmação do provedor…',
    payAmount: 'Pagar {{amount}}',
    payAmountWithMethodAria: 'Pagar {{amount}} com {{method}}',
    confirmPayment: 'Confirmar pagamento',
    confirmPaymentWithMethodAria: 'Confirmar pagamento com {{method}}',
    continueToMethod: 'Continuar com {{method}}',
    completeDemoPayment: 'Concluir pagamento de demonstração',
    completeDemoPaymentWithMethodAria: 'Concluir pagamento de demonstração com {{method}} (sem cobrança real)',
    methodLoadingStatus: 'Carregando',
    methodUnavailableStatus: 'Indisponível',
    cardPaymentRegionAria: 'Pagamento com cartão',
    klarnaPaymentRegionAria: 'Pagamento com Klarna',
    affirmPaymentRegionAria: 'Pagamento com Affirm',
    demoWalletButtonAria: '{{method}}, modo demo',
    payWithCard: 'Pagar com cartão',
    secureCardPaymentStripe: 'Pagamento com cartão seguro com tecnologia Stripe',
    preparingSecureCardForm: 'Preparando o formulário seguro de cartão…',
    stripeCardFormAria: 'Formulário seguro de cartão da Stripe',
    acceptedCardsAria: 'Cartões comumente aceitos',
    cardsAcceptedViaStripe: 'Cartões aceitos via Stripe (Visa, Mastercard, American Express e mais)',
    paymentCompleted: 'Pagamento concluído.',
    defaultSecureCheckout: 'Checkout seguro — seus dados de pagamento permanecem com o provedor de pagamento.',
    payWithPayPal: 'Pagar com PayPal',
    secureCheckoutPayPal: 'Checkout seguro com tecnologia PayPal',
    preparingPayPal: 'Preparando o checkout do PayPal…',
    creatingPayPalOrder: 'Criando o pedido do PayPal…',
    waitingPayPalApproval: 'Aguardando aprovação do PayPal…',
    capturingPayPal: 'Capturando o pagamento do PayPal…',
    paypalCheckoutAria: 'Checkout oficial do PayPal',
    paypalCancelled: 'Checkout do PayPal cancelado.',
    payWithGooglePay: 'Pagar com Google Pay',
    secureCheckoutGooglePay: 'Checkout seguro com Google Pay',
    preparingGooglePay: 'Preparando o Google Pay…',
    googlePayUnavailable: 'O Google Pay não está disponível neste navegador ou conta Google.',
    preparingSecurePayment: 'Preparando o pagamento seguro…',
    waitingGooglePay: 'Aguardando o Google Pay…',
    processingGooglePay: 'Processando o pagamento com Google Pay…',
    googlePayCheckoutAria: 'Checkout oficial do Google Pay',
    totalAmount: 'Total {{amount}}',
    payWithApplePay: 'Pagar com Apple Pay',
    secureCheckoutApplePay: 'Checkout seguro com Apple Pay',
    preparingApplePay: 'Preparando o Apple Pay…',
    applePayUnavailable: 'O Apple Pay não está disponível neste navegador ou Wallet.',
    processingApplePay: 'Processando o pagamento com Apple Pay…',
    applePayCheckoutAria: 'Checkout oficial do Apple Pay',
    payWithKlarna: 'Pagar com Klarna',
    secureCheckoutKlarna: 'Checkout seguro com Klarna via Stripe',
    preparingKlarna: 'Preparando a Klarna…',
    klarnaFormAria: 'Formulário seguro de pagamento da Klarna',
    payWithAffirm: 'Pagar com Affirm',
    secureCheckoutAffirm: 'Checkout seguro com Affirm via Stripe',
    preparingAffirm: 'Preparando a Affirm…',
    affirmFormAria: 'Formulário seguro de pagamento da Affirm',
};

const DICTIONARIES = {
    en: EN_TRANSLATIONS,
    es: ES_TRANSLATIONS,
    pt: PT_TRANSLATIONS,
};
function getDictionary(locale) {
    return DICTIONARIES[locale] ?? EN_TRANSLATIONS;
}
/**
 * Priority: custom override → locale dictionary → English.
 */
function resolveMessages(locale, overrides = {}) {
    const base = getDictionary(locale);
    const english = EN_TRANSLATIONS;
    const merged = { ...english, ...base };
    for (const key of Object.keys(overrides)) {
        const value = overrides[key];
        if (typeof value === 'string' && value.trim()) {
            merged[key] = value;
        }
    }
    return merged;
}

/**
 * Map a normalized PaymentError code to a customer-facing localized string.
 * Never returns the technical/provider English diagnostic from PaymentError.message.
 */
function localizePaymentError(code, messages) {
    switch (code) {
        case 'CARD_DECLINED':
            return messages.errorDetailCardDeclined;
        case 'NETWORK_ERROR':
            return messages.errorDetailNetwork;
        case 'CONFIG_MISSING':
        case 'CONFIG_INVALID':
            return messages.errorDetailConfig;
        case 'PROVIDER_UNAVAILABLE':
        case 'PROVIDER_NOT_CONFIGURED':
        case 'PROVIDER_NOT_IMPLEMENTED':
            return messages.errorDetailUnavailable;
        case 'AUTHENTICATION_REQUIRED':
            return messages.errorDetailAuthRequired;
        case 'AUTHENTICATION_FAILED':
            return messages.errorDetailAuthFailed;
        case 'SDK_LOAD_FAILED':
            return messages.errorDetailSdkLoad;
        case 'BACKEND_ERROR':
            return messages.errorDetailBackend;
        case 'PRODUCT_INVALID':
            return messages.errorDetailProductInvalid;
        case 'PAYMENT_CANCELLED':
            return messages.errorDetailCancelled;
        case 'PAYMENT_FAILED':
        case 'UNKNOWN':
        default:
            return messages.errorBody;
    }
}

/**
 * Per-checkout i18n context. Provided by `<easy-payments>` so child panels share
 * the same requested/effective locale and merged messages.
 */
class EasyPaymentsI18nService {
    requestedLocale = signal('auto', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "requestedLocale" }] : /* istanbul ignore next */ []));
    overrides = signal({}, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "overrides" }] : /* istanbul ignore next */ []));
    effectiveLocale = computed(() => resolveEffectiveLocale(this.requestedLocale()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "effectiveLocale" }] : /* istanbul ignore next */ []));
    messages = computed(() => resolveMessages(this.effectiveLocale(), this.overrides()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "messages" }] : /* istanbul ignore next */ []));
    requested = this.requestedLocale.asReadonly();
    setRequestedLocale(locale) {
        this.requestedLocale.set(locale ?? 'auto');
    }
    setOverrides(overrides) {
        this.overrides.set(overrides ?? {});
    }
    t(key, params) {
        const template = this.messages()[key];
        return params ? interpolate(template, params) : template;
    }
    formatMoney(amount, currency, quantity = 1) {
        return formatMoney(amount, currency, quantity, this.effectiveLocale());
    }
    formatUnitAmount(amount, currency) {
        return formatUnitAmount(amount, currency, this.effectiveLocale());
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsI18nService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsI18nService });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsI18nService, decorators: [{
            type: Injectable
        }] });

const EMPTY_CSS_VARS = {
    backgroundColor: null,
    textColor: null,
    fontFamily: null,
    fontSize: null,
    fontWeight: null,
    textAlign: null,
    borderWidth: null,
    borderStyle: null,
    borderColor: null,
    borderRadius: null,
    minHeight: null,
    width: null,
    padding: null,
    hoverBackgroundColor: null,
    hoverTextColor: null,
    disabledBackgroundColor: null,
    disabledTextColor: null,
    loadingBackgroundColor: null,
    loadingTextColor: null,
    focusOutlineColor: null,
    focusOutlineWidth: null,
    focusOutlineOffset: null,
};
const EMPTY_RESOLVED = {
    label: null,
    cssVars: { ...EMPTY_CSS_VARS },
};
/**
 * Map optional {@link EasyPaymentsCardButtonAppearance} to a sanitized label
 * and host CSS variable overrides. Invalid fields are ignored.
 */
function resolveCardButtonAppearance(appearance) {
    if (appearance == null || typeof appearance !== 'object') {
        return {
            label: null,
            cssVars: { ...EMPTY_CSS_VARS },
        };
    }
    const borderNone = appearance.border === 'none';
    return {
        label: sanitizePlainLabel(appearance.label),
        cssVars: {
            backgroundColor: sanitizeColor(appearance.backgroundColor),
            textColor: sanitizeColor(appearance.textColor),
            fontFamily: sanitizeFontFamily(appearance.fontFamily),
            fontSize: sanitizeLength(appearance.fontSize),
            fontWeight: sanitizeFontWeight(appearance.fontWeight),
            textAlign: sanitizeTextAlign(appearance.textAlign),
            borderWidth: borderNone ? '0px' : sanitizeLength(appearance.borderWidth),
            borderStyle: borderNone ? 'none' : sanitizeBorderStyle(appearance.borderStyle),
            borderColor: borderNone ? 'transparent' : sanitizeColor(appearance.borderColor),
            borderRadius: sanitizeLength(appearance.borderRadius),
            minHeight: sanitizeLength(appearance.minHeight),
            width: sanitizeLength(appearance.width),
            padding: sanitizePaddingShorthand(appearance.padding),
            hoverBackgroundColor: sanitizeColor(appearance.hoverBackgroundColor),
            hoverTextColor: sanitizeColor(appearance.hoverTextColor),
            disabledBackgroundColor: sanitizeColor(appearance.disabledBackgroundColor),
            disabledTextColor: sanitizeColor(appearance.disabledTextColor),
            loadingBackgroundColor: sanitizeColor(appearance.loadingBackgroundColor),
            loadingTextColor: sanitizeColor(appearance.loadingTextColor),
            focusOutlineColor: sanitizeColor(appearance.focusOutlineColor),
            focusOutlineWidth: sanitizeLength(appearance.focusOutlineWidth),
            focusOutlineOffset: sanitizeLength(appearance.focusOutlineOffset),
        },
    };
}
function emptyCardButtonAppearance() {
    return {
        label: EMPTY_RESOLVED.label,
        cssVars: { ...EMPTY_CSS_VARS },
    };
}

class CheckoutSecurityMessageComponent {
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    /**
     * Provider-aware security copy. Defaults to a neutral message (never Stripe-specific).
     */
    message = input(undefined, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "message" }] : /* istanbul ignore next */ []));
    resolvedMessage = computed(() => this.message() ??
        this.i18n?.messages().defaultSecureCheckout ??
        EN_TRANSLATIONS.defaultSecureCheckout, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedMessage" }] : /* istanbul ignore next */ []));
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutSecurityMessageComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.1.0", version: "22.1.5", type: CheckoutSecurityMessageComponent, isStandalone: true, selector: "easy-checkout-security-message", inputs: { message: { classPropertyName: "message", publicName: "message", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0, template: `
    <p class="ep-security" role="note">
      <span class="ep-security__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
          <path
            d="M8 1.5 3 3.5v4.2c0 3 2 5.2 5 6.3 3-1.1 5-3.3 5-6.3V3.5L8 1.5Z"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
          <path
            d="M6 8.1 7.3 9.4 10.2 6.4"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span>{{ resolvedMessage() }}</span>
    </p>
  `, isInline: true, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-security{display:flex;align-items:center;gap:8px;margin:0;font-size:12px;line-height:1.4;color:var(--ep-text-secondary, #64748b)}.ep-security__icon{display:inline-flex;color:var(--ep-accent, #2563eb);flex-shrink:0}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutSecurityMessageComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-checkout-security-message', standalone: true, template: `
    <p class="ep-security" role="note">
      <span class="ep-security__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
          <path
            d="M8 1.5 3 3.5v4.2c0 3 2 5.2 5 6.3 3-1.1 5-3.3 5-6.3V3.5L8 1.5Z"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
          <path
            d="M6 8.1 7.3 9.4 10.2 6.4"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span>{{ resolvedMessage() }}</span>
    </p>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-security{display:flex;align-items:center;gap:8px;margin:0;font-size:12px;line-height:1.4;color:var(--ep-text-secondary, #64748b)}.ep-security__icon{display:inline-flex;color:var(--ep-accent, #2563eb);flex-shrink:0}\n"] }]
        }], propDecorators: { message: [{ type: i0.Input, args: [{ isSignal: true, alias: "message", required: false }] }] } });

class StripeCardPaymentComponent {
    stripeAdapter = inject(StripeCardAdapter);
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    /** This panel's Payment Element session on the shared StripeCardAdapter. */
    ownerId = createPaymentOwnerId('card');
    destroyed = false;
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    resolvedTheme = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedTheme" }] : /* istanbul ignore next */ []));
    /**
     * `full` — checkout chrome (title, brands, amount CTA).
     * `minimal` — Buttons Only expanded panel (security + Element + confirm, no amount).
     */
    chrome = input('full', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "chrome" }] : /* istanbul ignore next */ []));
    /**
     * Optional Easy Payments–owned Card CTA presentation (label + CSS tokens).
     * Invalid / omitted fields keep theme defaults and localized labels.
     */
    cardButtonAppearance = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "cardButtonAppearance" }] : /* istanbul ignore next */ []));
    success = output();
    cancel = output();
    error = output();
    /** Fired once when the customer submits the card form. */
    started = output();
    /** True while confirmPayment / 3DS is in progress — parent should lock method switching. */
    busyChange = output();
    host = viewChild.required('paymentElementHost', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "host" }] : /* istanbul ignore next */ []));
    uiState = signal('idle', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "uiState" }] : /* istanbul ignore next */ []));
    inlineError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "inlineError" }] : /* istanbul ignore next */ []));
    /** Host element is ready for Stripe mount (must be a signal so the session effect can react). */
    viewReady = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "viewReady" }] : /* istanbul ignore next */ []));
    sessionKey = null;
    lastClientSecret = null;
    lastMountedLocale = null;
    initGeneration = 0;
    lastAppliedTheme = null;
    resolvedCardButton = computed(() => resolveCardButtonAppearance(this.cardButtonAppearance()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedCardButton" }] : /* istanbul ignore next */ []));
    cardButtonCssVars = computed(() => this.resolvedCardButton().cssVars, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "cardButtonCssVars" }] : /* istanbul ignore next */ []));
    amountLabel = computed(() => this.i18n
        ? this.i18n.formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1)
        : formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1, 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "amountLabel" }] : /* istanbul ignore next */ []));
    payLabel = computed(() => {
        const custom = this.resolvedCardButton().label;
        if (custom) {
            return custom;
        }
        return this.chrome() === 'minimal'
            ? this.msgs().payWithCard
            : interpolate(this.msgs().payAmount, { amount: this.amountLabel() });
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "payLabel" }] : /* istanbul ignore next */ []));
    constructor() {
        // Product/checkout changes may require a new PaymentIntent.
        // Theme must NOT recreate PaymentIntents — only update appearance.
        //
        // CRITICAL: ensureSession reads/writes uiState. Without untracked(), those
        // signal writes re-trigger this effect and spam PaymentIntent creation /
        // Element remounts (browser freeze).
        effect(() => {
            const product = this.product();
            const checkout = this.checkout();
            const ready = this.viewReady();
            const locale = this.i18n?.effectiveLocale() ?? 'en';
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.ensureSession(product, checkout, locale);
            });
        });
        effect(() => {
            const theme = this.resolvedTheme();
            const ready = this.viewReady();
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.applyTheme(theme);
            });
        });
    }
    ngAfterViewInit() {
        this.viewReady.set(true);
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.initGeneration += 1;
        this.sessionKey = null;
        this.lastClientSecret = null;
        this.lastMountedLocale = null;
        void this.stripeAdapter.destroy(this.ownerId);
    }
    canPay() {
        return this.uiState() === 'ready' && !this.stripeAdapter.isConfirming(this.ownerId);
    }
    async onPay() {
        if (!this.canPay()) {
            return;
        }
        this.inlineError.set(null);
        this.uiState.set('processing');
        this.started.emit();
        this.busyChange.emit(true);
        try {
            const result = await this.stripeAdapter.confirmPayment(this.checkout()?.successUrl, this.ownerId);
            if (this.destroyed) {
                return;
            }
            if (result.status === 'success') {
                this.uiState.set('success');
                this.success.emit(result);
            }
            else if (result.status === 'processing') {
                this.uiState.set('processing');
                this.success.emit(result);
            }
            else if (result.status === 'cancelled') {
                this.uiState.set('ready');
                this.cancel.emit(result);
            }
            else {
                this.uiState.set('ready');
                const paymentError = new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: result.message ?? 'Payment failed.',
                    method: 'card',
                    provider: 'stripe',
                });
                this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
                this.error.emit(paymentError);
            }
        }
        catch (err) {
            if (this.destroyed) {
                return;
            }
            const paymentError = normalizeError(err, { method: 'card', provider: 'stripe' });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.uiState.set('ready');
                this.cancel.emit({
                    status: 'cancelled',
                    method: 'card',
                    provider: 'stripe',
                    message: paymentError.message,
                });
                return;
            }
            this.uiState.set('ready');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
        finally {
            if (!this.destroyed) {
                this.busyChange.emit(false);
            }
        }
    }
    async applyTheme(theme) {
        if (this.lastAppliedTheme === theme && this.stripeAdapter.hasMountedElement(this.ownerId)) {
            return;
        }
        this.lastAppliedTheme = theme;
        if (this.stripeAdapter.hasMountedElement(this.ownerId)) {
            await this.stripeAdapter.updateAppearance(theme, this.ownerId);
        }
    }
    async ensureSession(product, checkout, locale) {
        const validation = validatePaymentProduct(product);
        if (!validation.valid) {
            const paymentError = new PaymentError({
                code: 'PRODUCT_INVALID',
                message: validation.errors.join(' '),
                method: 'card',
                provider: 'stripe',
            });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
            return;
        }
        const nextKey = buildStripeSessionKey(product, checkout);
        const elementsLocale = toStripeElementsLocale(locale);
        // Same checkout identity (including in-flight): never create another PaymentIntent.
        // sessionKey is cleared only on error/destroy so retries remain possible.
        if (nextKey === this.sessionKey) {
            if (this.lastMountedLocale !== elementsLocale &&
                this.lastClientSecret &&
                this.stripeAdapter.hasMountedElement(this.ownerId)) {
                const host = this.host().nativeElement;
                const theme = untracked(() => this.resolvedTheme());
                await this.stripeAdapter.mountPaymentElement(host, this.lastClientSecret, theme, elementsLocale, this.ownerId);
                this.lastMountedLocale = elementsLocale;
                this.lastAppliedTheme = theme;
            }
            return;
        }
        const generation = ++this.initGeneration;
        this.sessionKey = nextKey;
        this.uiState.set('initializing');
        this.inlineError.set(null);
        try {
            await this.stripeAdapter.ensureStripeLoaded();
            if (generation !== this.initGeneration) {
                return;
            }
            this.uiState.set('loading-session');
            const session = await this.stripeAdapter.createPaymentSession(product, checkout, this.ownerId);
            if (generation !== this.initGeneration) {
                return;
            }
            const host = this.host().nativeElement;
            const theme = untracked(() => this.resolvedTheme());
            this.lastClientSecret = session.clientSecret;
            await this.stripeAdapter.mountPaymentElement(host, session.clientSecret, theme, elementsLocale, this.ownerId);
            if (generation !== this.initGeneration) {
                return;
            }
            this.lastMountedLocale = elementsLocale;
            this.lastAppliedTheme = theme;
            this.uiState.set('ready');
        }
        catch (err) {
            if (generation !== this.initGeneration) {
                return;
            }
            this.sessionKey = null;
            this.lastClientSecret = null;
            this.lastMountedLocale = null;
            const paymentError = normalizeError(err, { method: 'card', provider: 'stripe' });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardPaymentComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: StripeCardPaymentComponent, isStandalone: true, selector: "easy-stripe-card-payment", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, resolvedTheme: { classPropertyName: "resolvedTheme", publicName: "resolvedTheme", isSignal: true, isRequired: true, transformFunction: null }, chrome: { classPropertyName: "chrome", publicName: "chrome", isSignal: true, isRequired: false, transformFunction: null }, cardButtonAppearance: { classPropertyName: "cardButtonAppearance", publicName: "cardButtonAppearance", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { success: "success", cancel: "cancel", error: "error", started: "started", busyChange: "busyChange" }, host: { properties: { "style.--ep-card-cta-bg": "cardButtonCssVars().backgroundColor", "style.--ep-card-cta-text": "cardButtonCssVars().textColor", "style.--ep-card-cta-font-family": "cardButtonCssVars().fontFamily", "style.--ep-card-cta-font-size": "cardButtonCssVars().fontSize", "style.--ep-card-cta-font-weight": "cardButtonCssVars().fontWeight", "style.--ep-card-cta-text-align": "cardButtonCssVars().textAlign", "style.--ep-card-cta-border-width": "cardButtonCssVars().borderWidth", "style.--ep-card-cta-border-style": "cardButtonCssVars().borderStyle", "style.--ep-card-cta-border-color": "cardButtonCssVars().borderColor", "style.--ep-card-cta-radius": "cardButtonCssVars().borderRadius", "style.--ep-card-cta-min-height": "cardButtonCssVars().minHeight", "style.--ep-card-cta-width": "cardButtonCssVars().width", "style.--ep-card-cta-padding": "cardButtonCssVars().padding", "style.--ep-card-cta-hover-bg": "cardButtonCssVars().hoverBackgroundColor", "style.--ep-card-cta-hover-text": "cardButtonCssVars().hoverTextColor", "style.--ep-card-cta-disabled-bg": "cardButtonCssVars().disabledBackgroundColor", "style.--ep-card-cta-disabled-text": "cardButtonCssVars().disabledTextColor", "style.--ep-card-cta-loading-bg": "cardButtonCssVars().loadingBackgroundColor", "style.--ep-card-cta-loading-text": "cardButtonCssVars().loadingTextColor", "style.--ep-card-cta-focus-color": "cardButtonCssVars().focusOutlineColor", "style.--ep-card-cta-focus-width": "cardButtonCssVars().focusOutlineWidth", "style.--ep-card-cta-focus-offset": "cardButtonCssVars().focusOutlineOffset" } }, viewQueries: [{ propertyName: "host", first: true, predicate: ["paymentElementHost"], descendants: true, isSignal: true }], ngImport: i0, template: `
    <div
      class="ep-stripe-card"
      [class.ep-stripe-card--minimal]="chrome() === 'minimal'"
      [attr.data-state]="uiState()"
      [attr.data-chrome]="chrome()"
    >
      @if (chrome() === 'full') {
        <div class="ep-stripe-card__header">
          <h3 class="ep-stripe-card__title">{{ msgs().payWithCard }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCardPaymentStripe" />
        </div>
      } @else {
        <easy-checkout-security-message [message]="msgs().secureCardPaymentStripe" />
      }

      @if (uiState() === 'initializing' || uiState() === 'loading-session') {
        <p class="ep-stripe-card__status" role="status">{{ msgs().preparingSecureCardForm }}</p>
      }

      <!--
        Keep the Stripe mount host always in the DOM and visible to layout.
        Toggling display:none on a mounted Stripe iframe causes severe browser jank.
      -->
      <div
        #paymentElementHost
        class="ep-stripe-card__element"
        [class.ep-stripe-card__element--pending]="
          uiState() === 'initializing' || uiState() === 'loading-session'
        "
        [attr.aria-hidden]="uiState() === 'error' || uiState() === 'idle'"
        [attr.aria-label]="msgs().stripeCardFormAria"
      ></div>

      @if (chrome() === 'full') {
        <p class="ep-stripe-card__brands" [attr.aria-label]="msgs().acceptedCardsAria">
          {{ msgs().cardsAcceptedViaStripe }}
        </p>
      }

      @if (inlineError()) {
        <p class="ep-stripe-card__error" role="alert">{{ inlineError() }}</p>
      }

      <!--
        Full Checkout may show an in-panel completion banner.
        Buttons Only (chrome=minimal) is event-driven — the host owns outcome UI.
      -->
      @if (uiState() === 'success' && chrome() !== 'minimal') {
        <p class="ep-stripe-card__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      <button
        type="button"
        class="ep-stripe-card__pay"
        [disabled]="!canPay()"
        [attr.aria-busy]="uiState() === 'processing'"
        (click)="onPay()"
      >
        @if (uiState() === 'processing') {
          {{ msgs().processingPayment }}
        } @else {
          {{ payLabel() }}
        }
      </button>
    </div>
  `, isInline: true, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-stripe-card{display:flex;flex-direction:column;gap:14px}.ep-stripe-card__header{display:flex;flex-direction:column;gap:6px}.ep-stripe-card__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-stripe-card__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-stripe-card__element{min-height:48px;padding:4px 0}.ep-stripe-card__element--pending{opacity:.45;pointer-events:none}.ep-stripe-card__brands{margin:0;font-size:12px;color:var(--ep-text-secondary, #64748b)}.ep-stripe-card__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-stripe-card__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}.ep-stripe-card__pay{box-sizing:border-box;min-height:var(--ep-card-cta-min-height, 48px);width:var(--ep-card-cta-width, auto);max-width:100%;padding:var(--ep-card-cta-padding, 0 16px);border-width:var(--ep-card-cta-border-width, 0);border-style:var(--ep-card-cta-border-style, none);border-color:var(--ep-card-cta-border-color, transparent);border-radius:var(--ep-card-cta-radius, var(--ep-radius-md, 10px));background:var(--ep-card-cta-bg, var(--ep-cta-bg, #0f172a));color:var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc));font-family:var(--ep-card-cta-font-family, inherit);font-size:var(--ep-card-cta-font-size, 15px);font-weight:var(--ep-card-cta-font-weight, 650);text-align:var(--ep-card-cta-text-align, center);cursor:pointer;transition:background-color .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease}.ep-stripe-card__pay:hover:not(:disabled){background:var( --ep-card-cta-hover-bg, var(--ep-cta-bg-hover, #1e293b) );color:var( --ep-card-cta-hover-text, var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc)) )}.ep-stripe-card__pay:active:not(:disabled){background:var( --ep-card-cta-hover-bg, var(--ep-cta-bg-hover, #1e293b) );box-shadow:inset 0 1px color-mix(in srgb,#000 18%,transparent)}.ep-stripe-card__pay:focus-visible{outline:var(--ep-card-cta-focus-width, 2px) solid var(--ep-card-cta-focus-color, var(--ep-focus, #2563eb));outline-offset:var(--ep-card-cta-focus-offset, 2px);box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-card-cta-focus-color, var(--ep-focus, #2563eb)) 28%,transparent)}.ep-stripe-card--minimal .ep-stripe-card__pay{min-height:var(--ep-card-cta-min-height, 44px);align-self:flex-start;min-width:min(100%,200px);padding:var(--ep-card-cta-padding, 0 20px);font-size:var(--ep-card-cta-font-size, 14px)}.ep-stripe-card__pay:disabled{cursor:not-allowed;opacity:1;background:var( --ep-card-cta-disabled-bg, color-mix( in srgb, var(--ep-card-cta-bg, var(--ep-cta-bg, #0f172a)) 42%, var(--ep-surface, #ffffff) ) );color:var( --ep-card-cta-disabled-text, color-mix( in srgb, var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc)) 72%, var(--ep-text-secondary, #64748b) ) )}.ep-stripe-card__pay[aria-busy=true]:disabled{background:var( --ep-card-cta-loading-bg, color-mix( in srgb, var(--ep-card-cta-bg, var(--ep-cta-bg, #0f172a)) 58%, var(--ep-surface, #ffffff) ) );color:var( --ep-card-cta-loading-text, var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc)) )}@media(prefers-reduced-motion:reduce){.ep-stripe-card__pay{transition:none}}\n"], dependencies: [{ kind: "component", type: CheckoutSecurityMessageComponent, selector: "easy-checkout-security-message", inputs: ["message"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: StripeCardPaymentComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-stripe-card-payment', standalone: true, imports: [CheckoutSecurityMessageComponent], host: {
                        '[style.--ep-card-cta-bg]': 'cardButtonCssVars().backgroundColor',
                        '[style.--ep-card-cta-text]': 'cardButtonCssVars().textColor',
                        '[style.--ep-card-cta-font-family]': 'cardButtonCssVars().fontFamily',
                        '[style.--ep-card-cta-font-size]': 'cardButtonCssVars().fontSize',
                        '[style.--ep-card-cta-font-weight]': 'cardButtonCssVars().fontWeight',
                        '[style.--ep-card-cta-text-align]': 'cardButtonCssVars().textAlign',
                        '[style.--ep-card-cta-border-width]': 'cardButtonCssVars().borderWidth',
                        '[style.--ep-card-cta-border-style]': 'cardButtonCssVars().borderStyle',
                        '[style.--ep-card-cta-border-color]': 'cardButtonCssVars().borderColor',
                        '[style.--ep-card-cta-radius]': 'cardButtonCssVars().borderRadius',
                        '[style.--ep-card-cta-min-height]': 'cardButtonCssVars().minHeight',
                        '[style.--ep-card-cta-width]': 'cardButtonCssVars().width',
                        '[style.--ep-card-cta-padding]': 'cardButtonCssVars().padding',
                        '[style.--ep-card-cta-hover-bg]': 'cardButtonCssVars().hoverBackgroundColor',
                        '[style.--ep-card-cta-hover-text]': 'cardButtonCssVars().hoverTextColor',
                        '[style.--ep-card-cta-disabled-bg]': 'cardButtonCssVars().disabledBackgroundColor',
                        '[style.--ep-card-cta-disabled-text]': 'cardButtonCssVars().disabledTextColor',
                        '[style.--ep-card-cta-loading-bg]': 'cardButtonCssVars().loadingBackgroundColor',
                        '[style.--ep-card-cta-loading-text]': 'cardButtonCssVars().loadingTextColor',
                        '[style.--ep-card-cta-focus-color]': 'cardButtonCssVars().focusOutlineColor',
                        '[style.--ep-card-cta-focus-width]': 'cardButtonCssVars().focusOutlineWidth',
                        '[style.--ep-card-cta-focus-offset]': 'cardButtonCssVars().focusOutlineOffset',
                    }, template: `
    <div
      class="ep-stripe-card"
      [class.ep-stripe-card--minimal]="chrome() === 'minimal'"
      [attr.data-state]="uiState()"
      [attr.data-chrome]="chrome()"
    >
      @if (chrome() === 'full') {
        <div class="ep-stripe-card__header">
          <h3 class="ep-stripe-card__title">{{ msgs().payWithCard }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCardPaymentStripe" />
        </div>
      } @else {
        <easy-checkout-security-message [message]="msgs().secureCardPaymentStripe" />
      }

      @if (uiState() === 'initializing' || uiState() === 'loading-session') {
        <p class="ep-stripe-card__status" role="status">{{ msgs().preparingSecureCardForm }}</p>
      }

      <!--
        Keep the Stripe mount host always in the DOM and visible to layout.
        Toggling display:none on a mounted Stripe iframe causes severe browser jank.
      -->
      <div
        #paymentElementHost
        class="ep-stripe-card__element"
        [class.ep-stripe-card__element--pending]="
          uiState() === 'initializing' || uiState() === 'loading-session'
        "
        [attr.aria-hidden]="uiState() === 'error' || uiState() === 'idle'"
        [attr.aria-label]="msgs().stripeCardFormAria"
      ></div>

      @if (chrome() === 'full') {
        <p class="ep-stripe-card__brands" [attr.aria-label]="msgs().acceptedCardsAria">
          {{ msgs().cardsAcceptedViaStripe }}
        </p>
      }

      @if (inlineError()) {
        <p class="ep-stripe-card__error" role="alert">{{ inlineError() }}</p>
      }

      <!--
        Full Checkout may show an in-panel completion banner.
        Buttons Only (chrome=minimal) is event-driven — the host owns outcome UI.
      -->
      @if (uiState() === 'success' && chrome() !== 'minimal') {
        <p class="ep-stripe-card__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      <button
        type="button"
        class="ep-stripe-card__pay"
        [disabled]="!canPay()"
        [attr.aria-busy]="uiState() === 'processing'"
        (click)="onPay()"
      >
        @if (uiState() === 'processing') {
          {{ msgs().processingPayment }}
        } @else {
          {{ payLabel() }}
        }
      </button>
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-stripe-card{display:flex;flex-direction:column;gap:14px}.ep-stripe-card__header{display:flex;flex-direction:column;gap:6px}.ep-stripe-card__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-stripe-card__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-stripe-card__element{min-height:48px;padding:4px 0}.ep-stripe-card__element--pending{opacity:.45;pointer-events:none}.ep-stripe-card__brands{margin:0;font-size:12px;color:var(--ep-text-secondary, #64748b)}.ep-stripe-card__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-stripe-card__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}.ep-stripe-card__pay{box-sizing:border-box;min-height:var(--ep-card-cta-min-height, 48px);width:var(--ep-card-cta-width, auto);max-width:100%;padding:var(--ep-card-cta-padding, 0 16px);border-width:var(--ep-card-cta-border-width, 0);border-style:var(--ep-card-cta-border-style, none);border-color:var(--ep-card-cta-border-color, transparent);border-radius:var(--ep-card-cta-radius, var(--ep-radius-md, 10px));background:var(--ep-card-cta-bg, var(--ep-cta-bg, #0f172a));color:var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc));font-family:var(--ep-card-cta-font-family, inherit);font-size:var(--ep-card-cta-font-size, 15px);font-weight:var(--ep-card-cta-font-weight, 650);text-align:var(--ep-card-cta-text-align, center);cursor:pointer;transition:background-color .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease}.ep-stripe-card__pay:hover:not(:disabled){background:var( --ep-card-cta-hover-bg, var(--ep-cta-bg-hover, #1e293b) );color:var( --ep-card-cta-hover-text, var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc)) )}.ep-stripe-card__pay:active:not(:disabled){background:var( --ep-card-cta-hover-bg, var(--ep-cta-bg-hover, #1e293b) );box-shadow:inset 0 1px color-mix(in srgb,#000 18%,transparent)}.ep-stripe-card__pay:focus-visible{outline:var(--ep-card-cta-focus-width, 2px) solid var(--ep-card-cta-focus-color, var(--ep-focus, #2563eb));outline-offset:var(--ep-card-cta-focus-offset, 2px);box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-card-cta-focus-color, var(--ep-focus, #2563eb)) 28%,transparent)}.ep-stripe-card--minimal .ep-stripe-card__pay{min-height:var(--ep-card-cta-min-height, 44px);align-self:flex-start;min-width:min(100%,200px);padding:var(--ep-card-cta-padding, 0 20px);font-size:var(--ep-card-cta-font-size, 14px)}.ep-stripe-card__pay:disabled{cursor:not-allowed;opacity:1;background:var( --ep-card-cta-disabled-bg, color-mix( in srgb, var(--ep-card-cta-bg, var(--ep-cta-bg, #0f172a)) 42%, var(--ep-surface, #ffffff) ) );color:var( --ep-card-cta-disabled-text, color-mix( in srgb, var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc)) 72%, var(--ep-text-secondary, #64748b) ) )}.ep-stripe-card__pay[aria-busy=true]:disabled{background:var( --ep-card-cta-loading-bg, color-mix( in srgb, var(--ep-card-cta-bg, var(--ep-cta-bg, #0f172a)) 58%, var(--ep-surface, #ffffff) ) );color:var( --ep-card-cta-loading-text, var(--ep-card-cta-text, var(--ep-cta-text, #f8fafc)) )}@media(prefers-reduced-motion:reduce){.ep-stripe-card__pay{transition:none}}\n"] }]
        }], ctorParameters: () => [], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], resolvedTheme: [{ type: i0.Input, args: [{ isSignal: true, alias: "resolvedTheme", required: true }] }], chrome: [{ type: i0.Input, args: [{ isSignal: true, alias: "chrome", required: false }] }], cardButtonAppearance: [{ type: i0.Input, args: [{ isSignal: true, alias: "cardButtonAppearance", required: false }] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], started: [{ type: i0.Output, args: ["started"] }], busyChange: [{ type: i0.Output, args: ["busyChange"] }], host: [{ type: i0.ViewChild, args: ['paymentElementHost', { isSignal: true }] }] } });

/**
 * Stable identity for PayPal button render sessions.
 * Theme is intentionally excluded — theme changes must not recreate orders or buttons.
 */
function buildPayPalRenderKey(product, checkout) {
    const quantity = product.quantity ?? 1;
    const currency = product.currency.trim().toUpperCase();
    const email = checkout?.customer?.email ?? '';
    const name = checkout?.customer?.name ?? '';
    const success = checkout?.successUrl ?? '';
    const cancel = checkout?.cancelUrl ?? '';
    return appendMetadataSessionPart(`${product.id}|${quantity}|${currency}|${email}|${name}|${success}|${cancel}`, product.metadata);
}

/** Matches the default `--ep-buttons-height` of the Buttons Only strip. */
const PAYPAL_COMPACT_BUTTON_HEIGHT = 40;
class PayPalPaymentComponent {
    paypalAdapter = inject(PayPalAdapter);
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    /** Theme is accepted for API symmetry with Stripe; PayPal Buttons use official gold styling. */
    resolvedTheme = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedTheme" }] : /* istanbul ignore next */ []));
    /**
     * Compact in-list / Payment Buttons Only mount: official PayPal Buttons without
     * checkout panel chrome (title, security blurb, verbose status copy).
     */
    compact = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "compact" }] : /* istanbul ignore next */ []));
    success = output();
    cancel = output();
    error = output();
    /** Fired once when PayPal order creation begins. Capture does not fire it again. */
    started = output();
    /** True during create/approve/capture — parent should lock method switching. */
    busyChange = output();
    host = viewChild.required('paypalButtonsHost', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "host" }] : /* istanbul ignore next */ []));
    uiState = signal('idle', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "uiState" }] : /* istanbul ignore next */ []));
    inlineError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "inlineError" }] : /* istanbul ignore next */ []));
    viewReady = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "viewReady" }] : /* istanbul ignore next */ []));
    renderKey = null;
    renderGeneration = 0;
    attemptAnnounced = false;
    captureEmitted = false;
    /** Ownership token for this host's Buttons mount on the shared PayPalAdapter. */
    buttonsMountId = null;
    /** Owner token for order-create guards on the shared PayPalAdapter. */
    orderOwnerId = createPaymentOwnerId('paypal');
    /** This host's most recent order — never another host's. */
    currentOrderId = null;
    constructor() {
        // Product/checkout/locale identity may require re-rendering Buttons (createOrder closure).
        // Theme must NOT recreate orders or reload the SDK.
        effect(() => {
            const product = this.product();
            const checkout = this.checkout();
            const ready = this.viewReady();
            const locale = this.i18n?.effectiveLocale() ?? 'en';
            const compact = this.compact();
            // Read theme so Angular tracks it, but do not use it as a render key.
            void this.resolvedTheme();
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.ensureButtons(product, checkout, locale, compact);
            });
        });
        effect(() => {
            const busy = this.isBusyState();
            untracked(() => this.busyChange.emit(busy));
        });
    }
    ngAfterViewInit() {
        this.viewReady.set(true);
    }
    ngOnDestroy() {
        this.renderGeneration += 1;
        this.renderKey = null;
        const mountId = this.buttonsMountId;
        this.buttonsMountId = null;
        // Ownership-scoped cleanup only — do not call adapter.destroy(), which would
        // close sibling PayPal mounts and clear shared in-flight order flags.
        if (mountId) {
            void this.paypalAdapter.destroyButtons(mountId);
        }
    }
    isBusyState() {
        const state = this.uiState();
        return (state === 'creating-order' ||
            state === 'waiting-approval' ||
            state === 'capturing' ||
            this.paypalAdapter.isBusy(this.orderOwnerId, this.currentOrderId));
    }
    /**
     * Compact strip ARIA: keep a single accessible name on the mount host.
     * Transaction/init failures still emit `error`; in-strip banners are omitted.
     */
    compactButtonsAriaLabel() {
        const base = this.msgs().paypalCheckoutAria;
        if (!this.compact()) {
            return base;
        }
        if (this.uiState() === 'initializing') {
            return `${base}, ${this.msgs().preparingPayPal}`;
        }
        const err = this.inlineError();
        if (err) {
            return `${base}, ${err}`;
        }
        return base;
    }
    async ensureButtons(product, checkout, locale, compact = false) {
        const validation = validatePaymentProduct(product);
        if (!validation.valid) {
            const paymentError = new PaymentError({
                code: 'PRODUCT_INVALID',
                message: validation.errors.join(' '),
                method: 'paypal',
                provider: 'paypal',
            });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
            return;
        }
        const nextKey = `${buildPayPalRenderKey(product, checkout)}|${locale}|compact:${compact ? 1 : 0}`;
        if (nextKey === this.renderKey) {
            return;
        }
        const generation = ++this.renderGeneration;
        this.renderKey = nextKey;
        this.uiState.set('initializing');
        this.inlineError.set(null);
        try {
            try {
                await this.paypalAdapter.ensureSdkLoaded(locale);
            }
            catch (err) {
                if (generation !== this.renderGeneration) {
                    return;
                }
                this.renderKey = null;
                const paymentError = mapPayPalError(err, 'SDK_LOAD_FAILED', 'PayPal SDK script failed to load.');
                this.uiState.set('error');
                this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
                this.error.emit(paymentError);
                return;
            }
            if (generation !== this.renderGeneration) {
                return;
            }
            const host = this.host().nativeElement;
            host.replaceChildren();
            // Buttons Only: one primary PayPal funding button. Full checkout keeps
            // SDK-eligible funding sources (Pay Later / card) via omitted fundingSource.
            const mountId = await this.paypalAdapter.renderButtons(host, {
                ...(compact
                    ? {
                        fundingSource: 'paypal',
                        style: {
                            layout: 'vertical',
                            color: 'gold',
                            shape: 'rect',
                            label: 'paypal',
                            height: PAYPAL_COMPACT_BUTTON_HEIGHT,
                        },
                    }
                    : {}),
                createOrder: () => this.onCreateOrder(product, checkout, generation),
                onApprove: (data) => this.onApprove(data.orderID, generation),
                onCancel: () => this.onCancel(generation),
                onError: (err) => this.onSdkError(err, generation),
                onClick: async (_data, actions) => {
                    if (this.paypalAdapter.isBusy(this.orderOwnerId, this.currentOrderId) ||
                        this.uiState() === 'success') {
                        await actions.reject();
                        return;
                    }
                    await actions.resolve();
                },
            }, locale, this.buttonsMountId ?? undefined);
            if (generation !== this.renderGeneration) {
                await this.paypalAdapter.destroyButtons(mountId);
                if (this.buttonsMountId === mountId) {
                    this.buttonsMountId = null;
                }
                return;
            }
            this.buttonsMountId = mountId;
            this.uiState.set('ready');
        }
        catch (err) {
            if (generation !== this.renderGeneration) {
                return;
            }
            this.renderKey = null;
            // SDK script already loaded — classify Buttons create/render separately.
            const paymentError = mapPayPalError(err, 'PROVIDER_UNAVAILABLE', 'PayPal Buttons failed to initialize.');
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
    }
    async onCreateOrder(product, checkout, generation) {
        if (generation !== this.renderGeneration) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'PayPal checkout was superseded.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        this.inlineError.set(null);
        this.uiState.set('creating-order');
        this.captureEmitted = false;
        if (!this.attemptAnnounced) {
            this.attemptAnnounced = true;
            this.started.emit();
        }
        try {
            const orderId = await this.paypalAdapter.createOrder(product, checkout, this.orderOwnerId);
            if (generation === this.renderGeneration) {
                this.currentOrderId = orderId;
                this.uiState.set('waiting-approval');
            }
            return orderId;
        }
        catch (err) {
            const paymentError = mapPayPalError(err, 'BACKEND_ERROR', 'Failed to create PayPal order.');
            if (generation === this.renderGeneration) {
                this.attemptAnnounced = false;
                this.uiState.set('ready');
                this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
                this.error.emit(paymentError);
            }
            throw paymentError;
        }
    }
    async onApprove(orderId, generation) {
        if (generation !== this.renderGeneration || this.captureEmitted) {
            return;
        }
        this.captureEmitted = true;
        this.uiState.set('capturing');
        this.inlineError.set(null);
        try {
            const result = await this.paypalAdapter.captureOrder(orderId);
            if (generation !== this.renderGeneration) {
                return;
            }
            if (result.status === 'success') {
                this.attemptAnnounced = false;
                this.uiState.set('success');
                this.success.emit(result);
                return;
            }
            if (result.status === 'cancelled') {
                this.attemptAnnounced = false;
                this.uiState.set('cancelled');
                this.cancel.emit(result);
                return;
            }
            const paymentError = new PaymentError({
                code: 'PAYMENT_FAILED',
                message: result.message ?? 'PayPal payment failed.',
                method: 'paypal',
                provider: 'paypal',
            });
            this.attemptAnnounced = false;
            this.captureEmitted = false;
            this.uiState.set('ready');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
        catch (err) {
            if (generation !== this.renderGeneration) {
                return;
            }
            const paymentError = normalizeError(err, { method: 'paypal', provider: 'paypal' });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.attemptAnnounced = false;
                this.captureEmitted = false;
                this.uiState.set('cancelled');
                this.cancel.emit({
                    status: 'cancelled',
                    method: 'paypal',
                    provider: 'paypal',
                    message: paymentError.message,
                    sessionId: orderId,
                });
                return;
            }
            this.attemptAnnounced = false;
            this.captureEmitted = false;
            this.uiState.set('ready');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
    }
    onCancel(generation) {
        if (generation !== this.renderGeneration) {
            return;
        }
        this.attemptAnnounced = false;
        this.uiState.set('cancelled');
        this.cancel.emit({
            status: 'cancelled',
            method: 'paypal',
            provider: 'paypal',
            message: 'PayPal checkout was cancelled.',
            sessionId: this.currentOrderId ?? undefined,
        });
        // Allow another attempt without remounting Buttons.
        queueMicrotask(() => {
            if (generation === this.renderGeneration && this.uiState() === 'cancelled') {
                this.uiState.set('ready');
            }
        });
    }
    onSdkError(err, generation) {
        if (generation !== this.renderGeneration) {
            return;
        }
        const paymentError = mapPayPalError(err);
        if (paymentError.code === 'PAYMENT_CANCELLED') {
            this.onCancel(generation);
            return;
        }
        this.attemptAnnounced = false;
        this.uiState.set('ready');
        this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
        this.error.emit(paymentError);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalPaymentComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: PayPalPaymentComponent, isStandalone: true, selector: "easy-paypal-payment", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, resolvedTheme: { classPropertyName: "resolvedTheme", publicName: "resolvedTheme", isSignal: true, isRequired: true, transformFunction: null }, compact: { classPropertyName: "compact", publicName: "compact", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { success: "success", cancel: "cancel", error: "error", started: "started", busyChange: "busyChange" }, viewQueries: [{ propertyName: "host", first: true, predicate: ["paypalButtonsHost"], descendants: true, isSignal: true }], ngImport: i0, template: `
    <div
      class="ep-paypal"
      [class.ep-paypal--compact]="compact()"
      [attr.data-state]="uiState()"
      [attr.data-has-error]="inlineError() ? 'true' : null"
    >
      @if (!compact()) {
        <div class="ep-paypal__header">
          <h3 class="ep-paypal__title">{{ msgs().payWithPayPal }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutPayPal" />
        </div>
      }

      <!-- Compact: no status copy in the strip — it shifts neighboring slots. -->
      @if (uiState() === 'initializing' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().preparingPayPal }}</p>
      }

      @if (uiState() === 'creating-order' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().creatingPayPalOrder }}</p>
      }

      @if (uiState() === 'waiting-approval' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().waitingPayPalApproval }}</p>
      }

      @if (uiState() === 'capturing' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().capturingPayPal }}</p>
      }

      <!--
        Keep the Buttons host in the DOM while PayPal is available.
        Hide via parent clip (not display:none) when another method is selected.
      -->
      <div
        #paypalButtonsHost
        class="ep-paypal__buttons"
        [class.ep-paypal__buttons--pending]="uiState() === 'initializing'"
        [class.ep-paypal__buttons--unavailable]="compact() && uiState() === 'error'"
        [attr.aria-busy]="isBusyState()"
        [attr.aria-label]="compactButtonsAriaLabel()"
        [attr.aria-invalid]="compact() && inlineError() ? 'true' : null"
      ></div>

      <!--
        Full Checkout keeps inline payment/init error alerts.
        Buttons Only is event-driven: emit error/cancel; do not insert strip banners
        that move the official PayPal button.
      -->
      @if (inlineError() && !compact()) {
        <p class="ep-paypal__error" role="alert">{{ inlineError() }}</p>
      }

      @if (uiState() === 'success' && !compact()) {
        <p class="ep-paypal__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      @if (uiState() === 'cancelled' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().paypalCancelled }}</p>
      }
    </div>
  `, isInline: true, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-paypal{display:flex;flex-direction:column;gap:14px}.ep-paypal--compact{gap:0;min-height:40px;height:40px}.ep-paypal__header{display:flex;flex-direction:column;gap:6px}.ep-paypal__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-paypal__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-paypal__buttons{min-height:48px}.ep-paypal--compact .ep-paypal__buttons{box-sizing:border-box;width:100%;height:40px;min-height:40px;max-height:40px}.ep-paypal--compact .ep-paypal__buttons--unavailable{opacity:.45;pointer-events:none}:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons,:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons:focus,:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons:focus-visible,:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons:focus-within{outline:none;box-shadow:none}:host ::ng-deep .ep-paypal__buttons iframe,:host ::ng-deep .ep-paypal__buttons iframe:focus,:host ::ng-deep .ep-paypal__buttons iframe:focus-visible{outline:none!important;box-shadow:none!important}:host ::ng-deep .ep-paypal__buttons .paypal-buttons:focus,:host ::ng-deep .ep-paypal__buttons .paypal-buttons:focus-visible,:host ::ng-deep .ep-paypal__buttons .paypal-buttons *:focus,:host ::ng-deep .ep-paypal__buttons .paypal-buttons *:focus-visible{outline:none!important;box-shadow:none!important}.ep-paypal__buttons--pending{opacity:.45;pointer-events:none}.ep-paypal__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-paypal__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}\n"], dependencies: [{ kind: "component", type: CheckoutSecurityMessageComponent, selector: "easy-checkout-security-message", inputs: ["message"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PayPalPaymentComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-paypal-payment', standalone: true, imports: [CheckoutSecurityMessageComponent], template: `
    <div
      class="ep-paypal"
      [class.ep-paypal--compact]="compact()"
      [attr.data-state]="uiState()"
      [attr.data-has-error]="inlineError() ? 'true' : null"
    >
      @if (!compact()) {
        <div class="ep-paypal__header">
          <h3 class="ep-paypal__title">{{ msgs().payWithPayPal }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutPayPal" />
        </div>
      }

      <!-- Compact: no status copy in the strip — it shifts neighboring slots. -->
      @if (uiState() === 'initializing' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().preparingPayPal }}</p>
      }

      @if (uiState() === 'creating-order' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().creatingPayPalOrder }}</p>
      }

      @if (uiState() === 'waiting-approval' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().waitingPayPalApproval }}</p>
      }

      @if (uiState() === 'capturing' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().capturingPayPal }}</p>
      }

      <!--
        Keep the Buttons host in the DOM while PayPal is available.
        Hide via parent clip (not display:none) when another method is selected.
      -->
      <div
        #paypalButtonsHost
        class="ep-paypal__buttons"
        [class.ep-paypal__buttons--pending]="uiState() === 'initializing'"
        [class.ep-paypal__buttons--unavailable]="compact() && uiState() === 'error'"
        [attr.aria-busy]="isBusyState()"
        [attr.aria-label]="compactButtonsAriaLabel()"
        [attr.aria-invalid]="compact() && inlineError() ? 'true' : null"
      ></div>

      <!--
        Full Checkout keeps inline payment/init error alerts.
        Buttons Only is event-driven: emit error/cancel; do not insert strip banners
        that move the official PayPal button.
      -->
      @if (inlineError() && !compact()) {
        <p class="ep-paypal__error" role="alert">{{ inlineError() }}</p>
      }

      @if (uiState() === 'success' && !compact()) {
        <p class="ep-paypal__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      @if (uiState() === 'cancelled' && !compact()) {
        <p class="ep-paypal__status" role="status">{{ msgs().paypalCancelled }}</p>
      }
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-paypal{display:flex;flex-direction:column;gap:14px}.ep-paypal--compact{gap:0;min-height:40px;height:40px}.ep-paypal__header{display:flex;flex-direction:column;gap:6px}.ep-paypal__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-paypal__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-paypal__buttons{min-height:48px}.ep-paypal--compact .ep-paypal__buttons{box-sizing:border-box;width:100%;height:40px;min-height:40px;max-height:40px}.ep-paypal--compact .ep-paypal__buttons--unavailable{opacity:.45;pointer-events:none}:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons,:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons:focus,:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons:focus-visible,:host ::ng-deep .ep-paypal--compact .ep-paypal__buttons:focus-within{outline:none;box-shadow:none}:host ::ng-deep .ep-paypal__buttons iframe,:host ::ng-deep .ep-paypal__buttons iframe:focus,:host ::ng-deep .ep-paypal__buttons iframe:focus-visible{outline:none!important;box-shadow:none!important}:host ::ng-deep .ep-paypal__buttons .paypal-buttons:focus,:host ::ng-deep .ep-paypal__buttons .paypal-buttons:focus-visible,:host ::ng-deep .ep-paypal__buttons .paypal-buttons *:focus,:host ::ng-deep .ep-paypal__buttons .paypal-buttons *:focus-visible{outline:none!important;box-shadow:none!important}.ep-paypal__buttons--pending{opacity:.45;pointer-events:none}.ep-paypal__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-paypal__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}\n"] }]
        }], ctorParameters: () => [], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], resolvedTheme: [{ type: i0.Input, args: [{ isSignal: true, alias: "resolvedTheme", required: true }] }], compact: [{ type: i0.Input, args: [{ isSignal: true, alias: "compact", required: false }] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], started: [{ type: i0.Output, args: ["started"] }], busyChange: [{ type: i0.Output, args: ["busyChange"] }], host: [{ type: i0.ViewChild, args: ['paypalButtonsHost', { isSignal: true }] }] } });

class GooglePayPaymentComponent {
    googlePayAdapter = inject(GooglePayAdapter);
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    resolvedTheme = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedTheme" }] : /* istanbul ignore next */ []));
    /**
     * Compact in-list / Payment Buttons Only mount: official Google Pay button without
     * checkout panel chrome (title, security blurb, amount row, verbose status).
     */
    compact = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "compact" }] : /* istanbul ignore next */ []));
    success = output();
    cancel = output();
    error = output();
    /** Fired once when the customer clicks the Google Pay button. */
    started = output();
    /** True while sheet/confirm is in progress — parent should lock method switching. */
    busyChange = output();
    host = viewChild.required('googlePayButtonHost', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "host" }] : /* istanbul ignore next */ []));
    uiState = signal('idle', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "uiState" }] : /* istanbul ignore next */ []));
    inlineError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "inlineError" }] : /* istanbul ignore next */ []));
    viewReady = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "viewReady" }] : /* istanbul ignore next */ []));
    renderKey = null;
    lastTheme = null;
    lastButtonLocale = null;
    renderGeneration = 0;
    /** Ownership token for this host's button mount on the shared GooglePayAdapter. */
    buttonMountId = null;
    /** Ownership token for this host's in-flight Google Pay attempt. */
    payOwnerId = createPaymentOwnerId('google-pay');
    amountLabel = computed(() => this.i18n
        ? this.i18n.formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1)
        : formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1, 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "amountLabel" }] : /* istanbul ignore next */ []));
    totalLabel = computed(() => interpolate(this.msgs().totalAmount, { amount: this.amountLabel() }), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "totalLabel" }] : /* istanbul ignore next */ []));
    constructor() {
        // Product identity may require re-checking readiness / rebuilding the button.
        // Theme only restyles the official button — never creates PaymentIntents.
        effect(() => {
            const product = this.product();
            const checkout = this.checkout();
            const theme = this.resolvedTheme();
            const locale = this.i18n?.effectiveLocale() ?? 'en';
            const compact = this.compact();
            const ready = this.viewReady();
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.ensureButton(product, checkout, theme, locale, compact);
            });
        });
        effect(() => {
            const busy = this.isBusy();
            untracked(() => this.busyChange.emit(busy));
        });
    }
    ngAfterViewInit() {
        this.viewReady.set(true);
    }
    ngOnDestroy() {
        this.renderGeneration += 1;
        this.renderKey = null;
        const mountId = this.buttonMountId;
        this.buttonMountId = null;
        // Ownership-scoped cleanup only — do not call adapter.destroy(), which would
        // clear sibling Google Pay mounts and the shared processing flag.
        if (mountId) {
            this.googlePayAdapter.destroyButtonMount(mountId);
        }
    }
    isBusy() {
        const state = this.uiState();
        return (state === 'creating-session' ||
            state === 'awaiting-sheet' ||
            state === 'processing' ||
            this.googlePayAdapter.isProcessing(this.payOwnerId));
    }
    async ensureButton(product, checkout, theme, locale, compact = false) {
        const validation = validatePaymentProduct(product);
        if (!validation.valid) {
            const paymentError = new PaymentError({
                code: 'PRODUCT_INVALID',
                message: validation.errors.join(' '),
                method: 'google-pay',
                provider: 'googlePay',
            });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
            return;
        }
        const buttonLocale = toGooglePayButtonLocale(locale);
        const nextKey = `${buildGooglePayRenderKey(product)}|${buttonLocale}|compact:${compact ? 1 : 0}`;
        const themeChanged = this.lastTheme !== theme;
        const localeChanged = this.lastButtonLocale !== buttonLocale;
        if (nextKey === this.renderKey && !themeChanged && !localeChanged && this.uiState() === 'ready') {
            return;
        }
        const generation = ++this.renderGeneration;
        this.renderKey = nextKey;
        this.lastTheme = theme;
        this.lastButtonLocale = buttonLocale;
        this.uiState.set('initializing');
        this.inlineError.set(null);
        try {
            const available = await this.googlePayAdapter.isAvailable({
                product,
                theme,
                checkout,
            });
            if (generation !== this.renderGeneration) {
                return;
            }
            if (!available) {
                this.uiState.set('unavailable');
                if (this.buttonMountId) {
                    this.googlePayAdapter.destroyButtonMount(this.buttonMountId);
                    this.buttonMountId = null;
                }
                return;
            }
            const host = this.host().nativeElement;
            const mountId = await this.googlePayAdapter.renderOfficialButton(host, {
                theme,
                buttonLocale,
                compact,
                onClick: () => this.onGooglePayClick(product, checkout, generation),
            }, this.buttonMountId ?? undefined);
            if (generation !== this.renderGeneration) {
                this.googlePayAdapter.destroyButtonMount(mountId);
                if (this.buttonMountId === mountId) {
                    this.buttonMountId = null;
                }
                return;
            }
            this.buttonMountId = mountId;
            this.uiState.set('ready');
        }
        catch (err) {
            if (generation !== this.renderGeneration) {
                return;
            }
            this.renderKey = null;
            const paymentError = mapGooglePayError(err, 'SDK_LOAD_FAILED', 'Failed to initialize Google Pay.');
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
    }
    async onGooglePayClick(product, checkout, generation) {
        if (generation !== this.renderGeneration || this.isBusy() || this.uiState() === 'success') {
            return;
        }
        this.inlineError.set(null);
        this.started.emit();
        this.uiState.set('creating-session');
        try {
            // Intermediate UI while PaymentIntent is created, then sheet opens.
            this.uiState.set('awaiting-sheet');
            const result = await this.googlePayAdapter.payWithGooglePay(product, checkout, this.payOwnerId);
            if (generation !== this.renderGeneration) {
                return;
            }
            if (result.status === 'success') {
                this.uiState.set('success');
                this.success.emit(result);
                return;
            }
            if (result.status === 'processing') {
                this.uiState.set('processing');
                this.success.emit(result);
                return;
            }
            if (result.status === 'cancelled') {
                this.uiState.set('ready');
                this.cancel.emit(result);
                return;
            }
            const paymentError = new PaymentError({
                code: 'PAYMENT_FAILED',
                message: result.message ?? 'Google Pay payment failed.',
                method: 'google-pay',
                provider: 'googlePay',
            });
            this.uiState.set('ready');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
        catch (err) {
            if (generation !== this.renderGeneration) {
                return;
            }
            const paymentError = normalizeError(err, { method: 'google-pay', provider: 'googlePay' });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.uiState.set('ready');
                this.cancel.emit({
                    status: 'cancelled',
                    method: 'google-pay',
                    provider: 'googlePay',
                    message: paymentError.message,
                });
                return;
            }
            this.uiState.set('ready');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayPaymentComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: GooglePayPaymentComponent, isStandalone: true, selector: "easy-google-pay-payment", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, resolvedTheme: { classPropertyName: "resolvedTheme", publicName: "resolvedTheme", isSignal: true, isRequired: true, transformFunction: null }, compact: { classPropertyName: "compact", publicName: "compact", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { success: "success", cancel: "cancel", error: "error", started: "started", busyChange: "busyChange" }, viewQueries: [{ propertyName: "host", first: true, predicate: ["googlePayButtonHost"], descendants: true, isSignal: true }], ngImport: i0, template: `
    <div class="ep-gpay" [class.ep-gpay--compact]="compact()" [attr.data-state]="uiState()">
      @if (!compact()) {
        <div class="ep-gpay__header">
          <h3 class="ep-gpay__title">{{ msgs().payWithGooglePay }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutGooglePay" />
        </div>
      }

      @if (uiState() === 'initializing') {
        <p class="ep-gpay__status" role="status">{{ msgs().preparingGooglePay }}</p>
      }

      @if (uiState() === 'unavailable') {
        <p class="ep-gpay__status" role="status">
          {{ msgs().googlePayUnavailable }}
        </p>
      }

      @if (uiState() === 'creating-session' && !compact()) {
        <p class="ep-gpay__status" role="status">{{ msgs().preparingSecurePayment }}</p>
      }

      @if (uiState() === 'awaiting-sheet' && !compact()) {
        <p class="ep-gpay__status" role="status">{{ msgs().waitingGooglePay }}</p>
      }

      @if (uiState() === 'processing' && !compact()) {
        <p class="ep-gpay__status" role="status">{{ msgs().processingGooglePay }}</p>
      }

      <div
        #googlePayButtonHost
        class="ep-gpay__button"
        [class.ep-gpay__button--busy]="isBusy()"
        [class.ep-gpay__button--hidden]="uiState() === 'unavailable'"
        [attr.aria-busy]="isBusy()"
        [attr.aria-label]="msgs().googlePayCheckoutAria"
      ></div>

      @if (!compact()) {
        <p class="ep-gpay__amount" aria-live="polite">{{ totalLabel() }}</p>
      }

      @if (inlineError()) {
        <p class="ep-gpay__error" role="alert">{{ inlineError() }}</p>
      }

      @if (uiState() === 'success' && !compact()) {
        <p class="ep-gpay__success" role="status">{{ msgs().paymentCompleted }}</p>
      }
    </div>
  `, isInline: true, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-gpay{display:flex;flex-direction:column;gap:14px}.ep-gpay--compact{gap:8px}.ep-gpay__header{display:flex;flex-direction:column;gap:6px}.ep-gpay__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-gpay__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-gpay--compact .ep-gpay__status,.ep-gpay--compact .ep-gpay__error{font-size:12px}.ep-gpay__button{min-height:48px;width:100%}.ep-gpay--compact .ep-gpay__button{min-height:40px;height:40px;display:flex;align-items:center}.ep-gpay--compact .ep-gpay__button>*{width:100%;max-width:100%}.ep-gpay__button--busy{pointer-events:none;opacity:.65}.ep-gpay__button--hidden{display:none}.ep-gpay__amount{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-gpay__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-gpay__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}\n"], dependencies: [{ kind: "component", type: CheckoutSecurityMessageComponent, selector: "easy-checkout-security-message", inputs: ["message"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: GooglePayPaymentComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-google-pay-payment', standalone: true, imports: [CheckoutSecurityMessageComponent], template: `
    <div class="ep-gpay" [class.ep-gpay--compact]="compact()" [attr.data-state]="uiState()">
      @if (!compact()) {
        <div class="ep-gpay__header">
          <h3 class="ep-gpay__title">{{ msgs().payWithGooglePay }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutGooglePay" />
        </div>
      }

      @if (uiState() === 'initializing') {
        <p class="ep-gpay__status" role="status">{{ msgs().preparingGooglePay }}</p>
      }

      @if (uiState() === 'unavailable') {
        <p class="ep-gpay__status" role="status">
          {{ msgs().googlePayUnavailable }}
        </p>
      }

      @if (uiState() === 'creating-session' && !compact()) {
        <p class="ep-gpay__status" role="status">{{ msgs().preparingSecurePayment }}</p>
      }

      @if (uiState() === 'awaiting-sheet' && !compact()) {
        <p class="ep-gpay__status" role="status">{{ msgs().waitingGooglePay }}</p>
      }

      @if (uiState() === 'processing' && !compact()) {
        <p class="ep-gpay__status" role="status">{{ msgs().processingGooglePay }}</p>
      }

      <div
        #googlePayButtonHost
        class="ep-gpay__button"
        [class.ep-gpay__button--busy]="isBusy()"
        [class.ep-gpay__button--hidden]="uiState() === 'unavailable'"
        [attr.aria-busy]="isBusy()"
        [attr.aria-label]="msgs().googlePayCheckoutAria"
      ></div>

      @if (!compact()) {
        <p class="ep-gpay__amount" aria-live="polite">{{ totalLabel() }}</p>
      }

      @if (inlineError()) {
        <p class="ep-gpay__error" role="alert">{{ inlineError() }}</p>
      }

      @if (uiState() === 'success' && !compact()) {
        <p class="ep-gpay__success" role="status">{{ msgs().paymentCompleted }}</p>
      }
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-gpay{display:flex;flex-direction:column;gap:14px}.ep-gpay--compact{gap:8px}.ep-gpay__header{display:flex;flex-direction:column;gap:6px}.ep-gpay__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-gpay__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-gpay--compact .ep-gpay__status,.ep-gpay--compact .ep-gpay__error{font-size:12px}.ep-gpay__button{min-height:48px;width:100%}.ep-gpay--compact .ep-gpay__button{min-height:40px;height:40px;display:flex;align-items:center}.ep-gpay--compact .ep-gpay__button>*{width:100%;max-width:100%}.ep-gpay__button--busy{pointer-events:none;opacity:.65}.ep-gpay__button--hidden{display:none}.ep-gpay__amount{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-gpay__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-gpay__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}\n"] }]
        }], ctorParameters: () => [], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], resolvedTheme: [{ type: i0.Input, args: [{ isSignal: true, alias: "resolvedTheme", required: true }] }], compact: [{ type: i0.Input, args: [{ isSignal: true, alias: "compact", required: false }] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], started: [{ type: i0.Output, args: ["started"] }], busyChange: [{ type: i0.Output, args: ["busyChange"] }], host: [{ type: i0.ViewChild, args: ['googlePayButtonHost', { isSignal: true }] }] } });

class ApplePayPaymentComponent {
    applePayAdapter = inject(ApplePayAdapter);
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    resolvedTheme = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedTheme" }] : /* istanbul ignore next */ []));
    /** Button-only rendering for the express slot inside the payment methods list. */
    compact = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "compact" }] : /* istanbul ignore next */ []));
    success = output();
    cancel = output();
    error = output();
    /** Fired when the wallet confirm event begins. Rendering the button does not fire it. */
    started = output();
    busyChange = output();
    host = viewChild.required('applePayButtonHost', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "host" }] : /* istanbul ignore next */ []));
    uiState = signal('idle', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "uiState" }] : /* istanbul ignore next */ []));
    inlineError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "inlineError" }] : /* istanbul ignore next */ []));
    viewReady = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "viewReady" }] : /* istanbul ignore next */ []));
    renderKey = null;
    lastTheme = null;
    lastLocale = null;
    renderGeneration = 0;
    emittedSuccess = false;
    /** Ownership token for this host's ECE mount on the shared ApplePayAdapter. */
    eceMountId = null;
    amountLabel = computed(() => this.i18n
        ? this.i18n.formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1)
        : formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1, 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "amountLabel" }] : /* istanbul ignore next */ []));
    totalLabel = computed(() => interpolate(this.msgs().totalAmount, { amount: this.amountLabel() }), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "totalLabel" }] : /* istanbul ignore next */ []));
    constructor() {
        effect(() => {
            const product = this.product();
            const checkout = this.checkout();
            const theme = this.resolvedTheme();
            const ready = this.viewReady();
            const locale = this.i18n?.effectiveLocale() ?? 'en';
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.ensureButton(product, checkout, theme, locale);
            });
        });
        effect(() => {
            const busy = this.isBusy();
            untracked(() => this.busyChange.emit(busy));
        });
    }
    ngAfterViewInit() {
        this.viewReady.set(true);
    }
    ngOnDestroy() {
        this.renderGeneration += 1;
        this.renderKey = null;
        const mountId = this.eceMountId;
        this.eceMountId = null;
        // Ownership-scoped unmount — do not tear down sibling ECE mounts.
        // Keep the availability decided by `ready` so checkout tiles survive method switches.
        if (mountId) {
            this.applePayAdapter.unmountExpressCheckout({
                preserveAvailability: true,
                mountId,
            });
        }
    }
    isBusy() {
        const state = this.uiState();
        return (state === 'processing' ||
            (this.eceMountId !== null && this.applePayAdapter.isProcessing(this.eceMountId)));
    }
    async ensureButton(product, checkout, theme, locale) {
        const validation = validatePaymentProduct(product);
        if (!validation.valid) {
            const paymentError = new PaymentError({
                code: 'PRODUCT_INVALID',
                message: validation.errors.join(' '),
                method: 'apple-pay',
                provider: 'applePay',
            });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
            return;
        }
        const elementsLocale = toStripeElementsLocale(locale);
        const nextKey = buildApplePayRenderKey(product);
        const themeChanged = this.lastTheme !== theme;
        const localeChanged = this.lastLocale !== elementsLocale;
        if (nextKey === this.renderKey &&
            !themeChanged &&
            !localeChanged &&
            this.uiState() === 'ready') {
            return;
        }
        const generation = ++this.renderGeneration;
        this.renderKey = nextKey;
        this.lastTheme = theme;
        this.lastLocale = elementsLocale;
        this.emittedSuccess = false;
        // Availability was already proven by the bootstrap `ready`; don't fall back to
        // "Preparing Apple Pay…" while the button re-renders in this panel.
        this.uiState.set(this.applePayAdapter.getAvailabilityStatus(product) === 'available' ? 'ready' : 'initializing');
        this.inlineError.set(null);
        try {
            // Mount the real ECE first — availability comes from ready, not a hidden probe.
            if (!this.applePayAdapter.isConfigured()) {
                this.uiState.set('unavailable');
                return;
            }
            const host = this.host().nativeElement;
            if (!this.eceMountId) {
                this.eceMountId = this.applePayAdapter.createMountId();
            }
            const mountId = await this.applePayAdapter.mountExpressCheckout(host, {
                product,
                checkout,
                theme,
                locale: elementsLocale,
                onSuccess: (result) => this.onPaymentSuccess(result, generation),
                onCancel: () => this.onPaymentCancel(generation),
                onError: (err) => this.onPaymentError(err, generation),
                onAttempt: () => {
                    if (generation === this.renderGeneration) {
                        this.started.emit();
                    }
                },
                onReady: () => {
                    if (generation === this.renderGeneration) {
                        this.uiState.set('ready');
                    }
                },
                onUnavailable: () => {
                    if (generation === this.renderGeneration) {
                        this.uiState.set('unavailable');
                    }
                },
            }, this.eceMountId);
            if (generation !== this.renderGeneration) {
                this.applePayAdapter.unmountExpressCheckout({
                    preserveAvailability: true,
                    mountId,
                });
                if (this.eceMountId === mountId) {
                    this.eceMountId = null;
                }
                return;
            }
            this.eceMountId = mountId;
            // Stay initializing until ready fires (or unavailable/error).
            const status = this.applePayAdapter.getAvailabilityStatus(product);
            if (status === 'available') {
                this.uiState.set('ready');
            }
            else if (status === 'unavailable' || status === 'error') {
                this.uiState.set('unavailable');
            }
        }
        catch (err) {
            if (generation !== this.renderGeneration) {
                return;
            }
            this.renderKey = null;
            const paymentError = mapApplePayError(err, 'SDK_LOAD_FAILED', 'Failed to initialize Apple Pay.');
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.error.emit(paymentError);
        }
    }
    onPaymentSuccess(result, generation) {
        if (generation !== this.renderGeneration || this.emittedSuccess) {
            return;
        }
        this.emittedSuccess = true;
        this.uiState.set(result.status === 'processing' ? 'processing' : 'success');
        this.success.emit(result);
    }
    onPaymentCancel(generation) {
        if (generation !== this.renderGeneration) {
            return;
        }
        this.uiState.set('ready');
        this.cancel.emit({
            status: 'cancelled',
            method: 'apple-pay',
            provider: 'applePay',
            message: 'Apple Pay was cancelled.',
        });
    }
    onPaymentError(err, generation) {
        if (generation !== this.renderGeneration) {
            return;
        }
        const paymentError = normalizeError(err, { method: 'apple-pay', provider: 'applePay' });
        if (paymentError.code === 'PAYMENT_CANCELLED') {
            this.onPaymentCancel(generation);
            return;
        }
        this.uiState.set('ready');
        this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
        this.error.emit(paymentError);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayPaymentComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: ApplePayPaymentComponent, isStandalone: true, selector: "easy-apple-pay-payment", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, resolvedTheme: { classPropertyName: "resolvedTheme", publicName: "resolvedTheme", isSignal: true, isRequired: true, transformFunction: null }, compact: { classPropertyName: "compact", publicName: "compact", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { success: "success", cancel: "cancel", error: "error", started: "started", busyChange: "busyChange" }, viewQueries: [{ propertyName: "host", first: true, predicate: ["applePayButtonHost"], descendants: true, isSignal: true }], ngImport: i0, template: `
    <div class="ep-apay" [class.ep-apay--compact]="compact()" [attr.data-state]="uiState()">
      @if (!compact()) {
        <div class="ep-apay__header">
          <h3 class="ep-apay__title">{{ msgs().payWithApplePay }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutApplePay" />
        </div>
      }

      <!-- Compact (Buttons Only): the strip host owns loading/unavailable presentation. -->
      @if (uiState() === 'initializing' && !compact()) {
        <p class="ep-apay__status" role="status">{{ msgs().preparingApplePay }}</p>
      }

      @if (uiState() === 'unavailable' && !compact()) {
        <p class="ep-apay__status" role="status">
          {{ msgs().applePayUnavailable }}
        </p>
      }

      @if (uiState() === 'processing') {
        <p class="ep-apay__status" role="status">{{ msgs().processingApplePay }}</p>
      }

      <div
        #applePayButtonHost
        class="ep-apay__button"
        [class.ep-apay__button--busy]="isBusy()"
        [class.ep-apay__button--hidden]="uiState() === 'unavailable'"
        [attr.aria-busy]="isBusy()"
        [attr.aria-label]="msgs().applePayCheckoutAria"
      ></div>

      @if (!compact()) {
        <p class="ep-apay__amount" aria-live="polite">{{ totalLabel() }}</p>
      }

      @if (inlineError()) {
        <p class="ep-apay__error" role="alert">{{ inlineError() }}</p>
      }

      @if (uiState() === 'success' && !compact()) {
        <p class="ep-apay__success" role="status">{{ msgs().paymentCompleted }}</p>
      }
    </div>
  `, isInline: true, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-apay{display:flex;flex-direction:column;gap:14px}.ep-apay--compact{gap:4px;width:100%;align-items:center}.ep-apay--compact .ep-apay__status,.ep-apay--compact .ep-apay__error{text-align:center;font-size:12px;width:100%}.ep-apay--compact .ep-apay__button{min-height:44px;height:44px;width:100%;max-width:100%;margin-inline:auto}@container ep-checkout (min-width: 360px){.ep-apay--compact .ep-apay__button{max-width:168px}}@container ep-checkout (min-width: 520px){.ep-apay--compact .ep-apay__button{max-width:152px}}.ep-apay__header{display:flex;flex-direction:column;gap:6px}.ep-apay__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-apay__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-apay__button{min-height:44px;width:100%}.ep-apay__button--busy{pointer-events:none;opacity:.65}.ep-apay__button--hidden{display:none}.ep-apay__amount{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-apay__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-apay__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}\n"], dependencies: [{ kind: "component", type: CheckoutSecurityMessageComponent, selector: "easy-checkout-security-message", inputs: ["message"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: ApplePayPaymentComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-apple-pay-payment', standalone: true, imports: [CheckoutSecurityMessageComponent], template: `
    <div class="ep-apay" [class.ep-apay--compact]="compact()" [attr.data-state]="uiState()">
      @if (!compact()) {
        <div class="ep-apay__header">
          <h3 class="ep-apay__title">{{ msgs().payWithApplePay }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutApplePay" />
        </div>
      }

      <!-- Compact (Buttons Only): the strip host owns loading/unavailable presentation. -->
      @if (uiState() === 'initializing' && !compact()) {
        <p class="ep-apay__status" role="status">{{ msgs().preparingApplePay }}</p>
      }

      @if (uiState() === 'unavailable' && !compact()) {
        <p class="ep-apay__status" role="status">
          {{ msgs().applePayUnavailable }}
        </p>
      }

      @if (uiState() === 'processing') {
        <p class="ep-apay__status" role="status">{{ msgs().processingApplePay }}</p>
      }

      <div
        #applePayButtonHost
        class="ep-apay__button"
        [class.ep-apay__button--busy]="isBusy()"
        [class.ep-apay__button--hidden]="uiState() === 'unavailable'"
        [attr.aria-busy]="isBusy()"
        [attr.aria-label]="msgs().applePayCheckoutAria"
      ></div>

      @if (!compact()) {
        <p class="ep-apay__amount" aria-live="polite">{{ totalLabel() }}</p>
      }

      @if (inlineError()) {
        <p class="ep-apay__error" role="alert">{{ inlineError() }}</p>
      }

      @if (uiState() === 'success' && !compact()) {
        <p class="ep-apay__success" role="status">{{ msgs().paymentCompleted }}</p>
      }
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-apay{display:flex;flex-direction:column;gap:14px}.ep-apay--compact{gap:4px;width:100%;align-items:center}.ep-apay--compact .ep-apay__status,.ep-apay--compact .ep-apay__error{text-align:center;font-size:12px;width:100%}.ep-apay--compact .ep-apay__button{min-height:44px;height:44px;width:100%;max-width:100%;margin-inline:auto}@container ep-checkout (min-width: 360px){.ep-apay--compact .ep-apay__button{max-width:168px}}@container ep-checkout (min-width: 520px){.ep-apay--compact .ep-apay__button{max-width:152px}}.ep-apay__header{display:flex;flex-direction:column;gap:6px}.ep-apay__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-apay__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-apay__button{min-height:44px;width:100%}.ep-apay__button--busy{pointer-events:none;opacity:.65}.ep-apay__button--hidden{display:none}.ep-apay__amount{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-apay__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-apay__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}\n"] }]
        }], ctorParameters: () => [], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], resolvedTheme: [{ type: i0.Input, args: [{ isSignal: true, alias: "resolvedTheme", required: true }] }], compact: [{ type: i0.Input, args: [{ isSignal: true, alias: "compact", required: false }] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], started: [{ type: i0.Output, args: ["started"] }], busyChange: [{ type: i0.Output, args: ["busyChange"] }], host: [{ type: i0.ViewChild, args: ['applePayButtonHost', { isSignal: true }] }] } });

class KlarnaPaymentComponent {
    klarnaAdapter = inject(KlarnaAdapter);
    confirmationGate = inject(StripeConfirmationGate);
    configService = inject(EasyPaymentsConfigService);
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    hostContext = inject(CheckoutHostContext, { optional: true });
    /** This panel's Payment Element session on the shared KlarnaAdapter. */
    ownerId = createPaymentOwnerId('klarna');
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    resolvedTheme = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedTheme" }] : /* istanbul ignore next */ []));
    /**
     * `full` — checkout chrome (title + amount CTA).
     * `minimal` — Buttons Only expanded panel (security + Element + confirm).
     */
    chrome = input('full', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "chrome" }] : /* istanbul ignore next */ []));
    success = output();
    cancel = output();
    error = output();
    /** Fired once when the customer submits Klarna. Redirect recovery does not fire it again. */
    started = output();
    /** True while confirmPayment / redirect is in progress — parent should lock method switching. */
    busyChange = output();
    /**
     * True while recovering a Stripe Klarna redirect return (parent should show
     * Processing payment… and must not flash fresh checkout).
     */
    returning = output();
    host = viewChild.required('paymentElementHost', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "host" }] : /* istanbul ignore next */ []));
    uiState = signal('idle', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "uiState" }] : /* istanbul ignore next */ []));
    inlineError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "inlineError" }] : /* istanbul ignore next */ []));
    /** Host element is ready for Stripe mount (must be a signal so the session effect can react). */
    viewReady = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "viewReady" }] : /* istanbul ignore next */ []));
    sessionKey = null;
    lastClientSecret = null;
    lastMountedLocale = null;
    initGeneration = 0;
    lastAppliedTheme = null;
    /** Ensures success/cancel/error emit at most once per payment attempt (incl. redirect return). */
    terminalEmitted = false;
    destroyed = false;
    amountLabel = computed(() => this.i18n
        ? this.i18n.formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1)
        : formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1, 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "amountLabel" }] : /* istanbul ignore next */ []));
    payLabel = computed(() => this.chrome() === 'minimal'
        ? interpolate(this.msgs().continueToMethod, { method: 'Klarna' })
        : interpolate(this.msgs().payAmount, { amount: this.amountLabel() }), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "payLabel" }] : /* istanbul ignore next */ []));
    constructor() {
        // Product/checkout changes may require a new PaymentIntent.
        // Theme must NOT recreate PaymentIntents — only update appearance.
        effect(() => {
            const product = this.product();
            const checkout = this.checkout();
            const ready = this.viewReady();
            const locale = this.i18n?.effectiveLocale() ?? 'en';
            const returnPhase = this.resolveReturnPhase();
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.ensureSession(product, checkout, locale, returnPhase);
            });
        });
        effect(() => {
            const theme = this.resolvedTheme();
            const ready = this.viewReady();
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.applyTheme(theme);
            });
        });
    }
    ngAfterViewInit() {
        this.viewReady.set(true);
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.initGeneration += 1;
        this.sessionKey = null;
        this.lastClientSecret = null;
        this.lastMountedLocale = null;
        void this.klarnaAdapter.destroy(this.ownerId);
    }
    canPay() {
        return this.uiState() === 'ready' && !this.klarnaAdapter.isConfirming(this.ownerId);
    }
    async onPay() {
        if (!this.canPay()) {
            return;
        }
        // New attempt: a previous cancel/error must not block retry from this panel.
        this.terminalEmitted = false;
        this.inlineError.set(null);
        this.uiState.set('processing');
        this.started.emit();
        this.busyChange.emit(true);
        const attemptId = createStripeReturnAttemptId();
        try {
            // While another host is confirming, its pending marker must stay intact;
            // confirmPayment below rejects this attempt before anything reaches Stripe.
            if (!this.confirmationGate.isHeld()) {
                markStripePendingReturn('klarna', this.product().id, undefined, this.hostContext?.describeReturnOrigin(attemptId) ?? { attemptId });
            }
            const returnUrl = buildStripeReturnUrl('klarna', this.checkout()?.successUrl, undefined, attemptId);
            const result = await this.klarnaAdapter.confirmPayment(returnUrl, this.ownerId);
            // If Klarna redirected, this page unloads and confirmPayment never settles here.
            clearStripePendingReturnFor(attemptId);
            this.emitTerminal(result);
        }
        catch (err) {
            clearStripePendingReturnFor(attemptId);
            const paymentError = normalizeError(err, { method: 'klarna', provider: 'klarna' });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.emitTerminal({
                    status: 'cancelled',
                    method: 'klarna',
                    provider: 'klarna',
                    message: paymentError.message,
                });
                return;
            }
            this.uiState.set('ready');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.emitErrorOnce(paymentError);
        }
        finally {
            if (!this.destroyed) {
                this.busyChange.emit(false);
            }
        }
    }
    async applyTheme(theme) {
        if (this.lastAppliedTheme === theme && this.klarnaAdapter.hasMountedElement(this.ownerId)) {
            return;
        }
        this.lastAppliedTheme = theme;
        if (this.klarnaAdapter.hasMountedElement(this.ownerId)) {
            await this.klarnaAdapter.updateAppearance(theme, this.ownerId);
        }
    }
    /** Host-decided return phase; standalone panels fall back to URL detection. */
    resolveReturnPhase() {
        if (this.hostContext) {
            return this.hostContext.returnPhaseFor('klarna');
        }
        return isKlarnaReturnAttempt() ? 'owner' : 'none';
    }
    async ensureSession(product, checkout, locale, returnPhase) {
        const validation = validatePaymentProduct(product);
        if (!validation.valid) {
            const paymentError = new PaymentError({
                code: 'PRODUCT_INVALID',
                message: validation.errors.join(' '),
                method: 'klarna',
                provider: 'klarna',
            });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.emitErrorOnce(paymentError);
            return;
        }
        // Redirect return is recovered by the owning host. While ownership is unresolved or
        // recovery is in flight, never create a new PaymentIntent. After recovery settles,
        // keep blocking Intent creation (settled/awaiting) while presentation stays chrome-aware:
        // Full Checkout may show completion; Buttons Only (minimal) stays event-driven.
        if (returnPhase === 'pending' || returnPhase === 'owner') {
            this.initGeneration += 1;
            this.sessionKey = null;
            this.uiState.set('processing');
            return;
        }
        if (returnPhase === 'settled') {
            this.initGeneration += 1;
            this.sessionKey = null;
            this.uiState.set('success');
            return;
        }
        if (returnPhase === 'awaiting') {
            this.initGeneration += 1;
            this.sessionKey = null;
            this.uiState.set('awaiting');
            return;
        }
        const preferredLocale = this.resolvePreferredLocale(locale);
        const nextKey = this.buildSessionKey(product, checkout, locale);
        const elementsLocale = toStripeElementsLocale(locale);
        // Same checkout identity (including in-flight): never create another PaymentIntent.
        if (nextKey === this.sessionKey) {
            if (this.lastMountedLocale !== elementsLocale &&
                this.lastClientSecret &&
                this.klarnaAdapter.hasMountedElement(this.ownerId)) {
                const host = this.host().nativeElement;
                const theme = untracked(() => this.resolvedTheme());
                await this.klarnaAdapter.mountPaymentElement(host, this.lastClientSecret, theme, elementsLocale, this.ownerId);
                this.lastMountedLocale = elementsLocale;
                this.lastAppliedTheme = theme;
            }
            return;
        }
        const generation = ++this.initGeneration;
        this.sessionKey = nextKey;
        this.uiState.set('initializing');
        this.inlineError.set(null);
        try {
            await this.klarnaAdapter.ensureStripeLoaded();
            if (generation !== this.initGeneration) {
                return;
            }
            this.uiState.set('loading-session');
            const session = await this.klarnaAdapter.createPaymentSession(product, checkout, preferredLocale, this.ownerId);
            if (generation !== this.initGeneration) {
                return;
            }
            const host = this.host().nativeElement;
            const theme = untracked(() => this.resolvedTheme());
            this.lastClientSecret = session.clientSecret;
            await this.klarnaAdapter.mountPaymentElement(host, session.clientSecret, theme, elementsLocale, this.ownerId);
            if (generation !== this.initGeneration) {
                return;
            }
            this.lastMountedLocale = elementsLocale;
            this.lastAppliedTheme = theme;
            this.uiState.set('ready');
        }
        catch (err) {
            if (generation !== this.initGeneration) {
                return;
            }
            this.sessionKey = null;
            this.lastClientSecret = null;
            this.lastMountedLocale = null;
            const paymentError = normalizeError(err, { method: 'klarna', provider: 'klarna' });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.emitErrorOnce(paymentError);
        }
    }
    emitTerminal(result) {
        if (this.terminalEmitted || this.destroyed) {
            return;
        }
        this.terminalEmitted = true;
        if (result.status === 'success') {
            this.uiState.set('success');
            this.success.emit(result);
            return;
        }
        if (result.status === 'processing') {
            // Host maps this to the optional `pending` output; panel stays locked without active-submit copy.
            this.uiState.set('awaiting');
            this.success.emit(result);
            return;
        }
        if (result.status === 'cancelled') {
            this.uiState.set('ready');
            this.cancel.emit(result);
            return;
        }
        this.uiState.set('ready');
        const paymentError = new PaymentError({
            code: 'PAYMENT_FAILED',
            message: result.message ?? 'Payment failed.',
            method: 'klarna',
            provider: 'klarna',
        });
        this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
        this.error.emit(paymentError);
    }
    emitErrorOnce(paymentError) {
        if (this.terminalEmitted || this.destroyed) {
            return;
        }
        this.terminalEmitted = true;
        this.error.emit(paymentError);
    }
    resolvePreferredLocale(locale) {
        const klarna = this.configService.getSnapshot().providers?.klarna;
        const configured = klarna?.locale?.trim();
        if (configured) {
            return configured;
        }
        return toKlarnaPreferredLocale(locale, klarna?.purchaseCountry ?? 'US');
    }
    buildSessionKey(product, checkout, locale) {
        return `${buildKlarnaSessionKey(product, checkout)}|${this.resolvePreferredLocale(locale)}`;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaPaymentComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: KlarnaPaymentComponent, isStandalone: true, selector: "easy-klarna-payment", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, resolvedTheme: { classPropertyName: "resolvedTheme", publicName: "resolvedTheme", isSignal: true, isRequired: true, transformFunction: null }, chrome: { classPropertyName: "chrome", publicName: "chrome", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { success: "success", cancel: "cancel", error: "error", started: "started", busyChange: "busyChange", returning: "returning" }, viewQueries: [{ propertyName: "host", first: true, predicate: ["paymentElementHost"], descendants: true, isSignal: true }], ngImport: i0, template: `
    <div
      class="ep-klarna"
      [class.ep-klarna--minimal]="chrome() === 'minimal'"
      [attr.data-state]="uiState()"
      [attr.data-chrome]="chrome()"
    >
      @if (chrome() === 'full') {
        <div class="ep-klarna__header">
          <h3 class="ep-klarna__title">{{ msgs().payWithKlarna }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutKlarna" />
        </div>
      } @else {
        <easy-checkout-security-message [message]="msgs().secureCheckoutKlarna" />
      }

      @if (uiState() === 'initializing' || uiState() === 'loading-session') {
        <p class="ep-klarna__status" role="status">{{ msgs().preparingKlarna }}</p>
      }

      <!--
        Keep the Stripe mount host always in the DOM and visible to layout.
        Toggling display:none on a mounted Stripe iframe causes severe browser jank.
      -->
      <div
        #paymentElementHost
        class="ep-klarna__element"
        [class.ep-klarna__element--pending]="
          uiState() === 'initializing' || uiState() === 'loading-session'
        "
        [attr.aria-hidden]="uiState() === 'error' || uiState() === 'idle'"
        [attr.aria-label]="msgs().klarnaFormAria"
      ></div>

      @if (inlineError()) {
        <p class="ep-klarna__error" role="alert">{{ inlineError() }}</p>
      }

      <!--
        Full Checkout may show an in-panel completion banner.
        Buttons Only (chrome=minimal) is event-driven — the host owns outcome UI.
        After settled recovery the lifecycle lock remains; we do not render a success CTA.
      -->
      @if (uiState() === 'success' && chrome() !== 'minimal') {
        <p class="ep-klarna__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      @if (uiState() === 'awaiting') {
        <p class="ep-klarna__status" role="status">{{ msgs().awaitingProviderPayment }}</p>
      }

      @if (uiState() !== 'success' || chrome() !== 'minimal') {
        <button
          type="button"
          class="ep-klarna__pay"
          [disabled]="!canPay()"
          [attr.aria-busy]="uiState() === 'processing'"
          (click)="onPay()"
        >
          @if (uiState() === 'processing') {
            {{ msgs().processingPayment }}
          } @else if (uiState() === 'awaiting') {
            {{ msgs().awaitingProviderPayment }}
          } @else if (uiState() === 'success') {
            {{ msgs().paymentCompleted }}
          } @else {
            {{ payLabel() }}
          }
        </button>
      }
    </div>
  `, isInline: true, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-klarna{display:flex;flex-direction:column;gap:14px}.ep-klarna__header{display:flex;flex-direction:column;gap:6px}.ep-klarna__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-klarna__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-klarna__element{min-height:48px;padding:4px 0}.ep-klarna__element--pending{opacity:.45;pointer-events:none}.ep-klarna__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-klarna__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}.ep-klarna__pay{min-height:48px;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-klarna__pay:hover:not(:disabled){background:var(--ep-cta-bg-hover, #1e293b)}.ep-klarna__pay:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-klarna--minimal .ep-klarna__pay{min-height:44px;align-self:flex-start;min-width:min(100%,200px);padding:0 20px;font-size:14px}.ep-klarna__pay:disabled{opacity:.55;cursor:not-allowed}@media(prefers-reduced-motion:reduce){.ep-klarna__pay{transition:none}}\n"], dependencies: [{ kind: "component", type: CheckoutSecurityMessageComponent, selector: "easy-checkout-security-message", inputs: ["message"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: KlarnaPaymentComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-klarna-payment', standalone: true, imports: [CheckoutSecurityMessageComponent], template: `
    <div
      class="ep-klarna"
      [class.ep-klarna--minimal]="chrome() === 'minimal'"
      [attr.data-state]="uiState()"
      [attr.data-chrome]="chrome()"
    >
      @if (chrome() === 'full') {
        <div class="ep-klarna__header">
          <h3 class="ep-klarna__title">{{ msgs().payWithKlarna }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutKlarna" />
        </div>
      } @else {
        <easy-checkout-security-message [message]="msgs().secureCheckoutKlarna" />
      }

      @if (uiState() === 'initializing' || uiState() === 'loading-session') {
        <p class="ep-klarna__status" role="status">{{ msgs().preparingKlarna }}</p>
      }

      <!--
        Keep the Stripe mount host always in the DOM and visible to layout.
        Toggling display:none on a mounted Stripe iframe causes severe browser jank.
      -->
      <div
        #paymentElementHost
        class="ep-klarna__element"
        [class.ep-klarna__element--pending]="
          uiState() === 'initializing' || uiState() === 'loading-session'
        "
        [attr.aria-hidden]="uiState() === 'error' || uiState() === 'idle'"
        [attr.aria-label]="msgs().klarnaFormAria"
      ></div>

      @if (inlineError()) {
        <p class="ep-klarna__error" role="alert">{{ inlineError() }}</p>
      }

      <!--
        Full Checkout may show an in-panel completion banner.
        Buttons Only (chrome=minimal) is event-driven — the host owns outcome UI.
        After settled recovery the lifecycle lock remains; we do not render a success CTA.
      -->
      @if (uiState() === 'success' && chrome() !== 'minimal') {
        <p class="ep-klarna__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      @if (uiState() === 'awaiting') {
        <p class="ep-klarna__status" role="status">{{ msgs().awaitingProviderPayment }}</p>
      }

      @if (uiState() !== 'success' || chrome() !== 'minimal') {
        <button
          type="button"
          class="ep-klarna__pay"
          [disabled]="!canPay()"
          [attr.aria-busy]="uiState() === 'processing'"
          (click)="onPay()"
        >
          @if (uiState() === 'processing') {
            {{ msgs().processingPayment }}
          } @else if (uiState() === 'awaiting') {
            {{ msgs().awaitingProviderPayment }}
          } @else if (uiState() === 'success') {
            {{ msgs().paymentCompleted }}
          } @else {
            {{ payLabel() }}
          }
        </button>
      }
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-klarna{display:flex;flex-direction:column;gap:14px}.ep-klarna__header{display:flex;flex-direction:column;gap:6px}.ep-klarna__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-klarna__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-klarna__element{min-height:48px;padding:4px 0}.ep-klarna__element--pending{opacity:.45;pointer-events:none}.ep-klarna__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-klarna__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}.ep-klarna__pay{min-height:48px;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-klarna__pay:hover:not(:disabled){background:var(--ep-cta-bg-hover, #1e293b)}.ep-klarna__pay:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-klarna--minimal .ep-klarna__pay{min-height:44px;align-self:flex-start;min-width:min(100%,200px);padding:0 20px;font-size:14px}.ep-klarna__pay:disabled{opacity:.55;cursor:not-allowed}@media(prefers-reduced-motion:reduce){.ep-klarna__pay{transition:none}}\n"] }]
        }], ctorParameters: () => [], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], resolvedTheme: [{ type: i0.Input, args: [{ isSignal: true, alias: "resolvedTheme", required: true }] }], chrome: [{ type: i0.Input, args: [{ isSignal: true, alias: "chrome", required: false }] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], started: [{ type: i0.Output, args: ["started"] }], busyChange: [{ type: i0.Output, args: ["busyChange"] }], returning: [{ type: i0.Output, args: ["returning"] }], host: [{ type: i0.ViewChild, args: ['paymentElementHost', { isSignal: true }] }] } });

class AffirmPaymentComponent {
    affirmAdapter = inject(AffirmAdapter);
    confirmationGate = inject(StripeConfirmationGate);
    configService = inject(EasyPaymentsConfigService);
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    hostContext = inject(CheckoutHostContext, { optional: true });
    /** This panel's Payment Element session on the shared AffirmAdapter. */
    ownerId = createPaymentOwnerId('affirm');
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    resolvedTheme = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedTheme" }] : /* istanbul ignore next */ []));
    /**
     * `full` — checkout chrome (title + amount CTA).
     * `minimal` — Buttons Only expanded panel (security + Element + confirm).
     */
    chrome = input('full', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "chrome" }] : /* istanbul ignore next */ []));
    success = output();
    cancel = output();
    error = output();
    /** Fired once when the customer submits Affirm. Redirect recovery does not fire it again. */
    started = output();
    /** True while confirmPayment / redirect is in progress — parent should lock method switching. */
    busyChange = output();
    /**
     * True while recovering a Stripe Affirm redirect return (parent should show
     * Processing payment… and must not flash fresh checkout).
     */
    returning = output();
    host = viewChild.required('paymentElementHost', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "host" }] : /* istanbul ignore next */ []));
    uiState = signal('idle', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "uiState" }] : /* istanbul ignore next */ []));
    inlineError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "inlineError" }] : /* istanbul ignore next */ []));
    /** Host element is ready for Stripe mount (must be a signal so the session effect can react). */
    viewReady = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "viewReady" }] : /* istanbul ignore next */ []));
    sessionKey = null;
    lastClientSecret = null;
    lastMountedLocale = null;
    initGeneration = 0;
    lastAppliedTheme = null;
    /** Ensures success/cancel/error emit at most once per payment attempt (incl. redirect return). */
    terminalEmitted = false;
    destroyed = false;
    amountLabel = computed(() => this.i18n
        ? this.i18n.formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1)
        : formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1, 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "amountLabel" }] : /* istanbul ignore next */ []));
    payLabel = computed(() => this.chrome() === 'minimal'
        ? interpolate(this.msgs().continueToMethod, { method: 'Affirm' })
        : interpolate(this.msgs().payAmount, { amount: this.amountLabel() }), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "payLabel" }] : /* istanbul ignore next */ []));
    constructor() {
        // Product/checkout changes may require a new PaymentIntent.
        // Theme must NOT recreate PaymentIntents — only update appearance.
        effect(() => {
            const product = this.product();
            const checkout = this.checkout();
            const ready = this.viewReady();
            const locale = this.i18n?.effectiveLocale() ?? 'en';
            const returnPhase = this.resolveReturnPhase();
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.ensureSession(product, checkout, locale, returnPhase);
            });
        });
        effect(() => {
            const theme = this.resolvedTheme();
            const ready = this.viewReady();
            if (!ready) {
                return;
            }
            untracked(() => {
                void this.applyTheme(theme);
            });
        });
    }
    ngAfterViewInit() {
        this.viewReady.set(true);
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.initGeneration += 1;
        this.sessionKey = null;
        this.lastClientSecret = null;
        this.lastMountedLocale = null;
        void this.affirmAdapter.destroy(this.ownerId);
    }
    canPay() {
        return this.uiState() === 'ready' && !this.affirmAdapter.isConfirming(this.ownerId);
    }
    async onPay() {
        if (!this.canPay()) {
            return;
        }
        // New attempt: a previous cancel/error must not block retry from this panel.
        this.terminalEmitted = false;
        this.inlineError.set(null);
        this.uiState.set('processing');
        this.started.emit();
        this.busyChange.emit(true);
        const attemptId = createStripeReturnAttemptId();
        try {
            // While another host is confirming, its pending marker must stay intact;
            // confirmPayment below rejects this attempt before anything reaches Stripe.
            if (!this.confirmationGate.isHeld()) {
                markStripePendingReturn('affirm', this.product().id, undefined, this.hostContext?.describeReturnOrigin(attemptId) ?? { attemptId });
            }
            const returnUrl = buildStripeReturnUrl('affirm', this.checkout()?.successUrl, undefined, attemptId);
            const result = await this.affirmAdapter.confirmPayment(returnUrl, this.ownerId);
            // If Affirm redirected, this page unloads and confirmPayment never settles here.
            clearStripePendingReturnFor(attemptId);
            this.emitTerminal(result);
        }
        catch (err) {
            clearStripePendingReturnFor(attemptId);
            const paymentError = normalizeError(err, { method: 'affirm', provider: 'affirm' });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.emitTerminal({
                    status: 'cancelled',
                    method: 'affirm',
                    provider: 'affirm',
                    message: paymentError.message,
                });
                return;
            }
            this.uiState.set('ready');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.emitErrorOnce(paymentError);
        }
        finally {
            if (!this.destroyed) {
                this.busyChange.emit(false);
            }
        }
    }
    async applyTheme(theme) {
        if (this.lastAppliedTheme === theme && this.affirmAdapter.hasMountedElement(this.ownerId)) {
            return;
        }
        this.lastAppliedTheme = theme;
        if (this.affirmAdapter.hasMountedElement(this.ownerId)) {
            await this.affirmAdapter.updateAppearance(theme, this.ownerId);
        }
    }
    /** Host-decided return phase; standalone panels fall back to URL detection. */
    resolveReturnPhase() {
        if (this.hostContext) {
            return this.hostContext.returnPhaseFor('affirm');
        }
        return isStripeReturnAttempt('affirm') ? 'owner' : 'none';
    }
    async ensureSession(product, checkout, locale, returnPhase) {
        const validation = validatePaymentProduct(product);
        if (!validation.valid) {
            const paymentError = new PaymentError({
                code: 'PRODUCT_INVALID',
                message: validation.errors.join(' '),
                method: 'affirm',
                provider: 'affirm',
            });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.emitErrorOnce(paymentError);
            return;
        }
        // Redirect return is recovered by the owning host. While ownership is unresolved or
        // recovery is in flight, never create a new PaymentIntent. After recovery settles,
        // keep blocking Intent creation (settled/awaiting) while presentation stays chrome-aware:
        // Full Checkout may show completion; Buttons Only (minimal) stays event-driven.
        if (returnPhase === 'pending' || returnPhase === 'owner') {
            this.initGeneration += 1;
            this.sessionKey = null;
            this.uiState.set('processing');
            return;
        }
        if (returnPhase === 'settled') {
            this.initGeneration += 1;
            this.sessionKey = null;
            this.uiState.set('success');
            return;
        }
        if (returnPhase === 'awaiting') {
            this.initGeneration += 1;
            this.sessionKey = null;
            this.uiState.set('awaiting');
            return;
        }
        const preferredLocale = this.resolvePreferredLocale(locale);
        const nextKey = this.buildSessionKey(product, checkout, locale);
        const elementsLocale = toStripeElementsLocale(locale);
        // Same checkout identity (including in-flight): never create another PaymentIntent.
        if (nextKey === this.sessionKey) {
            if (this.lastMountedLocale !== elementsLocale &&
                this.lastClientSecret &&
                this.affirmAdapter.hasMountedElement(this.ownerId)) {
                const host = this.host().nativeElement;
                const theme = untracked(() => this.resolvedTheme());
                await this.affirmAdapter.mountPaymentElement(host, this.lastClientSecret, theme, elementsLocale, this.ownerId);
                this.lastMountedLocale = elementsLocale;
                this.lastAppliedTheme = theme;
            }
            return;
        }
        const generation = ++this.initGeneration;
        this.sessionKey = nextKey;
        this.uiState.set('initializing');
        this.inlineError.set(null);
        try {
            await this.affirmAdapter.ensureStripeLoaded();
            if (generation !== this.initGeneration) {
                return;
            }
            this.uiState.set('loading-session');
            const session = await this.affirmAdapter.createPaymentSession(product, checkout, preferredLocale, this.ownerId);
            if (generation !== this.initGeneration) {
                return;
            }
            const host = this.host().nativeElement;
            const theme = untracked(() => this.resolvedTheme());
            this.lastClientSecret = session.clientSecret;
            await this.affirmAdapter.mountPaymentElement(host, session.clientSecret, theme, elementsLocale, this.ownerId);
            if (generation !== this.initGeneration) {
                return;
            }
            this.lastMountedLocale = elementsLocale;
            this.lastAppliedTheme = theme;
            this.uiState.set('ready');
        }
        catch (err) {
            if (generation !== this.initGeneration) {
                return;
            }
            this.sessionKey = null;
            this.lastClientSecret = null;
            this.lastMountedLocale = null;
            const paymentError = normalizeError(err, { method: 'affirm', provider: 'affirm' });
            this.uiState.set('error');
            this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
            this.emitErrorOnce(paymentError);
        }
    }
    emitTerminal(result) {
        if (this.terminalEmitted || this.destroyed) {
            return;
        }
        this.terminalEmitted = true;
        if (result.status === 'success') {
            this.uiState.set('success');
            this.success.emit(result);
            return;
        }
        if (result.status === 'processing') {
            this.uiState.set('awaiting');
            this.success.emit(result);
            return;
        }
        if (result.status === 'cancelled') {
            this.uiState.set('ready');
            this.cancel.emit(result);
            return;
        }
        this.uiState.set('ready');
        const paymentError = new PaymentError({
            code: 'PAYMENT_FAILED',
            message: result.message ?? 'Payment failed.',
            method: 'affirm',
            provider: 'affirm',
        });
        this.inlineError.set(localizePaymentError(paymentError.code, this.msgs()));
        this.error.emit(paymentError);
    }
    emitErrorOnce(paymentError) {
        if (this.terminalEmitted || this.destroyed) {
            return;
        }
        this.terminalEmitted = true;
        this.error.emit(paymentError);
    }
    resolvePreferredLocale(locale) {
        const affirm = this.configService.getSnapshot().providers?.affirm;
        const configured = affirm?.locale?.trim();
        if (configured) {
            return configured;
        }
        return toAffirmPreferredLocale(locale, affirm?.purchaseCountry ?? 'US');
    }
    buildSessionKey(product, checkout, locale) {
        return `${buildAffirmSessionKey(product, checkout)}|${this.resolvePreferredLocale(locale)}`;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmPaymentComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: AffirmPaymentComponent, isStandalone: true, selector: "easy-affirm-payment", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, resolvedTheme: { classPropertyName: "resolvedTheme", publicName: "resolvedTheme", isSignal: true, isRequired: true, transformFunction: null }, chrome: { classPropertyName: "chrome", publicName: "chrome", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { success: "success", cancel: "cancel", error: "error", started: "started", busyChange: "busyChange", returning: "returning" }, viewQueries: [{ propertyName: "host", first: true, predicate: ["paymentElementHost"], descendants: true, isSignal: true }], ngImport: i0, template: `
    <div
      class="ep-affirm"
      [class.ep-affirm--minimal]="chrome() === 'minimal'"
      [attr.data-state]="uiState()"
      [attr.data-chrome]="chrome()"
    >
      @if (chrome() === 'full') {
        <div class="ep-affirm__header">
          <h3 class="ep-affirm__title">{{ msgs().payWithAffirm }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutAffirm" />
        </div>
      } @else {
        <easy-checkout-security-message [message]="msgs().secureCheckoutAffirm" />
      }

      @if (uiState() === 'initializing' || uiState() === 'loading-session') {
        <p class="ep-affirm__status" role="status">{{ msgs().preparingAffirm }}</p>
      }

      <!--
        Keep the Stripe mount host always in the DOM and visible to layout.
        Toggling display:none on a mounted Stripe iframe causes severe browser jank.
      -->
      <div
        #paymentElementHost
        class="ep-affirm__element"
        [class.ep-affirm__element--pending]="
          uiState() === 'initializing' || uiState() === 'loading-session'
        "
        [attr.aria-hidden]="uiState() === 'error' || uiState() === 'idle'"
        [attr.aria-label]="msgs().affirmFormAria"
      ></div>

      @if (inlineError()) {
        <p class="ep-affirm__error" role="alert">{{ inlineError() }}</p>
      }

      <!--
        Full Checkout may show an in-panel completion banner.
        Buttons Only (chrome=minimal) is event-driven — the host owns outcome UI.
        After settled recovery the lifecycle lock remains; we do not render a success CTA.
      -->
      @if (uiState() === 'success' && chrome() !== 'minimal') {
        <p class="ep-affirm__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      @if (uiState() === 'awaiting') {
        <p class="ep-affirm__status" role="status">{{ msgs().awaitingProviderPayment }}</p>
      }

      @if (uiState() !== 'success' || chrome() !== 'minimal') {
        <button
          type="button"
          class="ep-affirm__pay"
          [disabled]="!canPay()"
          [attr.aria-busy]="uiState() === 'processing'"
          (click)="onPay()"
        >
          @if (uiState() === 'processing') {
            {{ msgs().processingPayment }}
          } @else if (uiState() === 'awaiting') {
            {{ msgs().awaitingProviderPayment }}
          } @else if (uiState() === 'success') {
            {{ msgs().paymentCompleted }}
          } @else {
            {{ payLabel() }}
          }
        </button>
      }
    </div>
  `, isInline: true, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-affirm{display:flex;flex-direction:column;gap:14px}.ep-affirm__header{display:flex;flex-direction:column;gap:6px}.ep-affirm__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-affirm__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-affirm__element{min-height:48px;padding:4px 0}.ep-affirm__element--pending{opacity:.45;pointer-events:none}.ep-affirm__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-affirm__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}.ep-affirm__pay{min-height:48px;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-affirm__pay:hover:not(:disabled){background:var(--ep-cta-bg-hover, #1e293b)}.ep-affirm__pay:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-affirm--minimal .ep-affirm__pay{min-height:44px;align-self:flex-start;min-width:min(100%,200px);padding:0 20px;font-size:14px}.ep-affirm__pay:disabled{opacity:.55;cursor:not-allowed}@media(prefers-reduced-motion:reduce){.ep-affirm__pay{transition:none}}\n"], dependencies: [{ kind: "component", type: CheckoutSecurityMessageComponent, selector: "easy-checkout-security-message", inputs: ["message"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: AffirmPaymentComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-affirm-payment', standalone: true, imports: [CheckoutSecurityMessageComponent], template: `
    <div
      class="ep-affirm"
      [class.ep-affirm--minimal]="chrome() === 'minimal'"
      [attr.data-state]="uiState()"
      [attr.data-chrome]="chrome()"
    >
      @if (chrome() === 'full') {
        <div class="ep-affirm__header">
          <h3 class="ep-affirm__title">{{ msgs().payWithAffirm }}</h3>
          <easy-checkout-security-message [message]="msgs().secureCheckoutAffirm" />
        </div>
      } @else {
        <easy-checkout-security-message [message]="msgs().secureCheckoutAffirm" />
      }

      @if (uiState() === 'initializing' || uiState() === 'loading-session') {
        <p class="ep-affirm__status" role="status">{{ msgs().preparingAffirm }}</p>
      }

      <!--
        Keep the Stripe mount host always in the DOM and visible to layout.
        Toggling display:none on a mounted Stripe iframe causes severe browser jank.
      -->
      <div
        #paymentElementHost
        class="ep-affirm__element"
        [class.ep-affirm__element--pending]="
          uiState() === 'initializing' || uiState() === 'loading-session'
        "
        [attr.aria-hidden]="uiState() === 'error' || uiState() === 'idle'"
        [attr.aria-label]="msgs().affirmFormAria"
      ></div>

      @if (inlineError()) {
        <p class="ep-affirm__error" role="alert">{{ inlineError() }}</p>
      }

      <!--
        Full Checkout may show an in-panel completion banner.
        Buttons Only (chrome=minimal) is event-driven — the host owns outcome UI.
        After settled recovery the lifecycle lock remains; we do not render a success CTA.
      -->
      @if (uiState() === 'success' && chrome() !== 'minimal') {
        <p class="ep-affirm__success" role="status">{{ msgs().paymentCompleted }}</p>
      }

      @if (uiState() === 'awaiting') {
        <p class="ep-affirm__status" role="status">{{ msgs().awaitingProviderPayment }}</p>
      }

      @if (uiState() !== 'success' || chrome() !== 'minimal') {
        <button
          type="button"
          class="ep-affirm__pay"
          [disabled]="!canPay()"
          [attr.aria-busy]="uiState() === 'processing'"
          (click)="onPay()"
        >
          @if (uiState() === 'processing') {
            {{ msgs().processingPayment }}
          } @else if (uiState() === 'awaiting') {
            {{ msgs().awaitingProviderPayment }}
          } @else if (uiState() === 'success') {
            {{ msgs().paymentCompleted }}
          } @else {
            {{ payLabel() }}
          }
        </button>
      }
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;font-family:var(--ep-font-family, inherit)}.ep-affirm{display:flex;flex-direction:column;gap:14px}.ep-affirm__header{display:flex;flex-direction:column;gap:6px}.ep-affirm__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-affirm__status{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-affirm__element{min-height:48px;padding:4px 0}.ep-affirm__element--pending{opacity:.45;pointer-events:none}.ep-affirm__error{margin:0;color:var(--ep-danger, #b91c1c);font-size:13px}.ep-affirm__success{margin:0;color:var(--ep-success, #15803d);font-size:13px;font-weight:600}.ep-affirm__pay{min-height:48px;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-affirm__pay:hover:not(:disabled){background:var(--ep-cta-bg-hover, #1e293b)}.ep-affirm__pay:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-affirm--minimal .ep-affirm__pay{min-height:44px;align-self:flex-start;min-width:min(100%,200px);padding:0 20px;font-size:14px}.ep-affirm__pay:disabled{opacity:.55;cursor:not-allowed}@media(prefers-reduced-motion:reduce){.ep-affirm__pay{transition:none}}\n"] }]
        }], ctorParameters: () => [], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], resolvedTheme: [{ type: i0.Input, args: [{ isSignal: true, alias: "resolvedTheme", required: true }] }], chrome: [{ type: i0.Input, args: [{ isSignal: true, alias: "chrome", required: false }] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], started: [{ type: i0.Output, args: ["started"] }], busyChange: [{ type: i0.Output, args: ["busyChange"] }], returning: [{ type: i0.Output, args: ["returning"] }], host: [{ type: i0.ViewChild, args: ['paymentElementHost', { isSignal: true }] }] } });

class CheckoutProductSummaryComponent {
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    quantity = computed(() => this.product().quantity ?? 1, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "quantity" }] : /* istanbul ignore next */ []));
    currency = computed(() => (this.product().currency || 'USD').toUpperCase(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "currency" }] : /* istanbul ignore next */ []));
    totalLabel = computed(() => this.i18n
        ? this.i18n.formatMoney(this.product().amount, this.product().currency, this.quantity())
        : formatMoney(this.product().amount, this.product().currency, this.quantity(), 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "totalLabel" }] : /* istanbul ignore next */ []));
    unitLabel = computed(() => this.i18n
        ? this.i18n.formatUnitAmount(this.product().amount, this.product().currency)
        : formatUnitAmount(this.product().amount, this.product().currency, 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "unitLabel" }] : /* istanbul ignore next */ []));
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutProductSummaryComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: CheckoutProductSummaryComponent, isStandalone: true, selector: "easy-checkout-product-summary", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null } }, ngImport: i0, template: `
    <div class="ep-summary">
      @if (product().imageUrl) {
        <img
          class="ep-summary__image"
          [src]="product().imageUrl"
          [alt]="product().name"
          width="56"
          height="56"
        />
      }
      <div class="ep-summary__body">
        <div class="ep-summary__row">
          <h3 class="ep-summary__name">{{ product().name }}</h3>
          <p class="ep-summary__amount">{{ totalLabel() }}</p>
        </div>
        <div class="ep-summary__row ep-summary__row--meta">
          <p class="ep-summary__description">
            @if (product().description) {
              {{ product().description }}
            } @else {
              {{ msgs().orderTotal }}
            }
            @if (quantity() > 1) {
              <span> · {{ msgs().quantityPrefix }} {{ quantity() }}</span>
            }
          </p>
          <p class="ep-summary__currency">{{ currency() }}</p>
        </div>
        @if (quantity() > 1) {
          <p class="ep-summary__unit">{{ unitLabel() }} {{ msgs().eachSuffix }}</p>
        }
      </div>
    </div>
  `, isInline: true, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-summary{display:flex;gap:14px;align-items:flex-start;padding:14px;border:1px solid var(--ep-border, #e2e8f0);border-radius:var(--ep-radius-md, 10px);background:var(--ep-surface-muted, #f8fafc)}.ep-summary__image{width:56px;height:56px;object-fit:cover;border-radius:8px;background:var(--ep-surface, #fff);flex-shrink:0}.ep-summary__body{flex:1;min-width:0}.ep-summary__row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.ep-summary__row--meta{margin-top:4px}.ep-summary__name{margin:0;font-size:.95rem;font-weight:650;letter-spacing:-.01em;color:var(--ep-text, #0f172a);overflow-wrap:anywhere;min-width:0}.ep-summary__amount{margin:0;font-size:.95rem;font-weight:700;color:var(--ep-text, #0f172a);white-space:nowrap;flex-shrink:0}.ep-summary__description,.ep-summary__currency,.ep-summary__unit{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-summary__description{min-width:0;overflow-wrap:anywhere}.ep-summary__currency{text-transform:uppercase;white-space:nowrap;flex-shrink:0}.ep-summary__unit{margin-top:4px}@container ep-checkout (max-width: 380px){.ep-summary__row{flex-direction:column;align-items:flex-start;gap:4px}.ep-summary__amount,.ep-summary__currency{white-space:normal}}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutProductSummaryComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-checkout-product-summary', standalone: true, template: `
    <div class="ep-summary">
      @if (product().imageUrl) {
        <img
          class="ep-summary__image"
          [src]="product().imageUrl"
          [alt]="product().name"
          width="56"
          height="56"
        />
      }
      <div class="ep-summary__body">
        <div class="ep-summary__row">
          <h3 class="ep-summary__name">{{ product().name }}</h3>
          <p class="ep-summary__amount">{{ totalLabel() }}</p>
        </div>
        <div class="ep-summary__row ep-summary__row--meta">
          <p class="ep-summary__description">
            @if (product().description) {
              {{ product().description }}
            } @else {
              {{ msgs().orderTotal }}
            }
            @if (quantity() > 1) {
              <span> · {{ msgs().quantityPrefix }} {{ quantity() }}</span>
            }
          </p>
          <p class="ep-summary__currency">{{ currency() }}</p>
        </div>
        @if (quantity() > 1) {
          <p class="ep-summary__unit">{{ unitLabel() }} {{ msgs().eachSuffix }}</p>
        }
      </div>
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-summary{display:flex;gap:14px;align-items:flex-start;padding:14px;border:1px solid var(--ep-border, #e2e8f0);border-radius:var(--ep-radius-md, 10px);background:var(--ep-surface-muted, #f8fafc)}.ep-summary__image{width:56px;height:56px;object-fit:cover;border-radius:8px;background:var(--ep-surface, #fff);flex-shrink:0}.ep-summary__body{flex:1;min-width:0}.ep-summary__row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.ep-summary__row--meta{margin-top:4px}.ep-summary__name{margin:0;font-size:.95rem;font-weight:650;letter-spacing:-.01em;color:var(--ep-text, #0f172a);overflow-wrap:anywhere;min-width:0}.ep-summary__amount{margin:0;font-size:.95rem;font-weight:700;color:var(--ep-text, #0f172a);white-space:nowrap;flex-shrink:0}.ep-summary__description,.ep-summary__currency,.ep-summary__unit{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-summary__description{min-width:0;overflow-wrap:anywhere}.ep-summary__currency{text-transform:uppercase;white-space:nowrap;flex-shrink:0}.ep-summary__unit{margin-top:4px}@container ep-checkout (max-width: 380px){.ep-summary__row{flex-direction:column;align-items:flex-start;gap:4px}.ep-summary__amount,.ep-summary__currency{white-space:normal}}\n"] }]
        }], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }] } });

/**
 * Official provider mark data URIs generated from Apple / Google download packages.
 * Source SVG files: src/lib/assets/payment-methods/ (see SOURCES.md).
 * Do not hand-edit the artwork encoded here.
 */
const APPLE_PAY_MARK_DATA_URI = "data:image/svg+xml;charset=utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%0A%3C!--%20Generator%3A%20Adobe%20Illustrator%2021.1.0%2C%20SVG%20Export%20Plug-In%20.%20SVG%20Version%3A%206.00%20Build%200)%20%20--%3E%0A%3Csvg%20version%3D%221.1%22%20id%3D%22Artwork%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20x%3D%220px%22%20y%3D%220px%22%0A%09%20width%3D%22165.52107px%22%20height%3D%22105.9651px%22%20viewBox%3D%220%200%20165.52107%20105.9651%22%20enable-background%3D%22new%200%200%20165.52107%20105.9651%22%0A%09%20xml%3Aspace%3D%22preserve%22%3E%0A%3Cg%3E%0A%09%3Cpath%20id%3D%22XMLID_4_%22%20d%3D%22M150.69807%2C0H14.82318c-0.5659%2C0-1.1328%2C0-1.69769%2C0.0033c-0.47751%2C0.0034-0.95391%2C0.0087-1.43031%2C0.0217%0A%09%09c-1.039%2C0.0281-2.0869%2C0.0894-3.1129%2C0.2738c-1.0424%2C0.1876-2.0124%2C0.4936-2.9587%2C0.9754%0A%09%09c-0.9303%2C0.4731-1.782%2C1.0919-2.52009%2C1.8303c-0.73841%2C0.7384-1.35721%2C1.5887-1.83021%2C2.52%0A%09%09c-0.4819%2C0.9463-0.7881%2C1.9166-0.9744%2C2.9598c-0.18539%2C1.0263-0.2471%2C2.074-0.2751%2C3.1119%0A%09%09c-0.0128%2C0.4764-0.01829%2C0.9528-0.0214%2C1.4291c-0.0033%2C0.5661-0.0022%2C1.1318-0.0022%2C1.6989V91.142%0A%09%09c0%2C0.5671-0.0011%2C1.13181%2C0.0022%2C1.69901c0.00311%2C0.4763%2C0.0086%2C0.9527%2C0.0214%2C1.4291%0A%09%09c0.028%2C1.03699%2C0.08971%2C2.08469%2C0.2751%2C3.11069c0.1863%2C1.0436%2C0.4925%2C2.0135%2C0.9744%2C2.9599%0A%09%09c0.473%2C0.9313%2C1.0918%2C1.7827%2C1.83021%2C2.52c0.73809%2C0.7396%2C1.58979%2C1.3583%2C2.52009%2C1.8302%0A%09%09c0.9463%2C0.4831%2C1.9163%2C0.7892%2C2.9587%2C0.9767c1.026%2C0.1832%2C2.0739%2C0.2456%2C3.1129%2C0.2737c0.4764%2C0.0108%2C0.9528%2C0.0172%2C1.43031%2C0.0194%0A%09%09c0.56489%2C0.0044%2C1.13179%2C0.0044%2C1.69769%2C0.0044h135.87489c0.5649%2C0%2C1.13181%2C0%2C1.69659-0.0044%0A%09%09c0.47641-0.0022%2C0.95282-0.0086%2C1.4314-0.0194c1.0368-0.0281%2C2.0845-0.0905%2C3.11301-0.2737%0A%09%09c1.041-0.1875%2C2.0112-0.4936%2C2.9576-0.9767c0.9313-0.4719%2C1.7805-1.0906%2C2.52011-1.8302c0.7372-0.7373%2C1.35599-1.5887%2C1.8302-2.52%0A%09%09c0.48299-0.9464%2C0.78889-1.9163%2C0.97429-2.9599c0.1855-1.026%2C0.2457-2.0737%2C0.2738-3.11069%0A%09%09c0.013-0.4764%2C0.01941-0.9528%2C0.02161-1.4291c0.00439-0.5672%2C0.00439-1.1319%2C0.00439-1.69901V14.8242%0A%09%09c0-0.5671%2C0-1.1328-0.00439-1.6989c-0.0022-0.4763-0.00861-0.9527-0.02161-1.4291c-0.02811-1.0379-0.0883-2.0856-0.2738-3.1119%0A%09%09c-0.18539-1.0432-0.4913-2.0135-0.97429-2.9598c-0.47421-0.9313-1.093-1.7816-1.8302-2.52%0A%09%09c-0.73961-0.7384-1.58881-1.3572-2.52011-1.8303c-0.9464-0.4818-1.9166-0.7878-2.9576-0.9754%0A%09%09c-1.0285-0.1844-2.0762-0.2457-3.11301-0.2738c-0.47858-0.013-0.95499-0.0183-1.4314-0.0217C151.82988%2C0%2C151.26297%2C0%2C150.69807%2C0%0A%09%09L150.69807%2C0z%22%2F%3E%0A%09%3Cpath%20id%3D%22XMLID_3_%22%20fill%3D%22%23FFFFFF%22%20d%3D%22M150.69807%2C3.532l1.67149%2C0.0032c0.4528%2C0.0032%2C0.90561%2C0.0081%2C1.36092%2C0.0205%0A%09%09c0.79201%2C0.0214%2C1.71849%2C0.0643%2C2.58209%2C0.2191c0.7507%2C0.1352%2C1.38029%2C0.3408%2C1.9845%2C0.6484%0A%09%09c0.5965%2C0.3031%2C1.14301%2C0.7003%2C1.62019%2C1.1768c0.479%2C0.4797%2C0.87671%2C1.0271%2C1.18381%2C1.6302%0A%09%09c0.30589%2C0.5995%2C0.51019%2C1.2261%2C0.64459%2C1.9823c0.1544%2C0.8542%2C0.1971%2C1.7832%2C0.21881%2C2.5801%0A%09%09c0.01219%2C0.4498%2C0.01819%2C0.8996%2C0.0204%2C1.3601c0.00429%2C0.5569%2C0.0042%2C1.1135%2C0.0042%2C1.6715V91.142%0A%09%09c0%2C0.558%2C0.00009%2C1.1136-0.0043%2C1.6824c-0.00211%2C0.4497-0.0081%2C0.8995-0.0204%2C1.3501c-0.02161%2C0.7957-0.0643%2C1.7242-0.2206%2C2.5885%0A%09%09c-0.13251%2C0.7458-0.3367%2C1.3725-0.64429%2C1.975c-0.30621%2C0.6016-0.70331%2C1.1484-1.18022%2C1.6251%0A%09%09c-0.47989%2C0.48-1.0246%2C0.876-1.62819%2C1.1819c-0.5997%2C0.3061-1.22821%2C0.51151-1.97151%2C0.6453%0A%09%09c-0.88109%2C0.157-1.84639%2C0.2002-2.57339%2C0.2199c-0.4574%2C0.0103-0.9126%2C0.01649-1.37889%2C0.0187%0A%09%09c-0.55571%2C0.0043-1.1134%2C0.0042-1.6692%2C0.0042H14.82318c-0.0074%2C0-0.0146%2C0-0.0221%2C0c-0.5494%2C0-1.0999%2C0-1.6593-0.0043%0A%09%09c-0.4561-0.00211-0.9112-0.0082-1.3512-0.0182c-0.7436-0.0201-1.7095-0.0632-2.5834-0.2193%0A%09%09c-0.74969-0.1348-1.3782-0.3402-1.9858-0.6503c-0.59789-0.3032-1.1422-0.6988-1.6223-1.1797%0A%09%09c-0.4764-0.4756-0.8723-1.0207-1.1784-1.6232c-0.3064-0.6019-0.5114-1.2305-0.64619-1.9852%0A%09%09c-0.15581-0.8626-0.19861-1.7874-0.22-2.5777c-0.01221-0.4525-0.01731-0.9049-0.02021-1.3547l-0.0022-1.3279l0.0001-0.3506V14.8242%0A%09%09l-0.0001-0.3506l0.0021-1.3251c0.003-0.4525%2C0.0081-0.9049%2C0.02031-1.357c0.02139-0.7911%2C0.06419-1.7163%2C0.22129-2.5861%0A%09%09c0.1336-0.7479%2C0.3385-1.3765%2C0.6465-1.9814c0.3037-0.5979%2C0.7003-1.1437%2C1.17921-1.6225%0A%09%09c0.477-0.4772%2C1.02309-0.8739%2C1.62479-1.1799c0.6011-0.3061%2C1.2308-0.5116%2C1.9805-0.6465c0.8638-0.1552%2C1.7909-0.198%2C2.5849-0.2195%0A%09%09c0.4526-0.0123%2C0.9052-0.0172%2C1.3544-0.0203l1.6771-0.0033H150.69807%22%2F%3E%0A%09%3Cg%3E%0A%09%09%3Cg%3E%0A%09%09%09%3Cpath%20d%3D%22M45.1862%2C35.64053c1.41724-1.77266%2C2.37897-4.15282%2C2.12532-6.58506c-2.07464%2C0.10316-4.60634%2C1.36871-6.07207%2C3.14276%0A%09%09%09%09c-1.31607%2C1.5192-2.4809%2C3.99902-2.17723%2C6.3293C41.39111%2C38.72954%2C43.71785%2C37.36345%2C45.1862%2C35.64053%22%2F%3E%0A%09%09%09%3Cpath%20d%3D%22M47.28506%2C38.98252c-3.38211-0.20146-6.25773%2C1.91951-7.87286%2C1.91951c-1.61602%2C0-4.08931-1.81799-6.76438-1.76899%0A%09%09%09%09c-3.48177%2C0.05114-6.71245%2C2.01976-8.4793%2C5.15079c-3.63411%2C6.2636-0.95904%2C15.55471%2C2.57494%2C20.65606%0A%09%09%09%09c1.71618%2C2.5238%2C3.78447%2C5.30269%2C6.50976%2C5.20287c2.57494-0.10104%2C3.58421-1.66732%2C6.71416-1.66732%0A%09%09%09%09c3.12765%2C0%2C4.03679%2C1.66732%2C6.76252%2C1.61681c2.82665-0.05054%2C4.59381-2.52506%2C6.30997-5.05132%0A%09%09%09%09c1.96878-2.877%2C2.77473-5.65498%2C2.82542-5.80748c-0.0507-0.05051-5.45058-2.12204-5.50065-8.33358%0A%09%09%09%09c-0.05098-5.20101%2C4.23951-7.6749%2C4.44144-7.82832C52.3832%2C39.4881%2C48.5975%2C39.08404%2C47.28506%2C38.98252%22%2F%3E%0A%09%09%3C%2Fg%3E%0A%09%09%3Cg%3E%0A%09%09%09%3Cpath%20d%3D%22M76.73385%2C31.94381c7.35096%2C0%2C12.4697%2C5.06708%2C12.4697%2C12.44437c0%2C7.40363-5.22407%2C12.49704-12.65403%2C12.49704h-8.13892%0A%09%09%09%09v12.94318h-5.88037v-37.8846H76.73385z%20M68.41059%2C51.9493h6.74732c5.11975%2C0%2C8.0336-2.75636%2C8.0336-7.53479%0A%09%09%09%09c0-4.77792-2.91385-7.50845-8.00727-7.50845h-6.77365V51.9493z%22%2F%3E%0A%09%09%09%3Cpath%20d%3D%22M90.73997%2C61.97864c0-4.8311%2C3.70182-7.79761%2C10.26583-8.16526l7.56061-0.44614v-2.12639%0A%09%09%09%09c0-3.07185-2.07423-4.90959-5.53905-4.90959c-3.28251%2C0-5.33041%2C1.57492-5.82871%2C4.04313h-5.35574%0A%09%09%09%09c0.31499-4.98859%2C4.56777-8.66407%2C11.3941-8.66407c6.69466%2C0%2C10.97377%2C3.54432%2C10.97377%2C9.08388v19.03421h-5.43472v-4.54194%0A%09%09%09%09h-0.13065c-1.60125%2C3.07185-5.09341%2C5.01441-8.71623%2C5.01441C94.52078%2C70.30088%2C90.73997%2C66.94038%2C90.73997%2C61.97864z%0A%09%09%09%09%20M108.56641%2C59.4846v-2.17905l-6.8%2C0.41981c-3.38683%2C0.23649-5.30306%2C1.73291-5.30306%2C4.09579%0A%09%09%09%09c0%2C2.41504%2C1.99523%2C3.99046%2C5.04075%2C3.99046C105.46823%2C65.81161%2C108.56641%2C63.08108%2C108.56641%2C59.4846z%22%2F%3E%0A%09%09%09%3Cpath%20d%3D%22M119.34167%2C79.9889v-4.5946c0.4193%2C0.10483%2C1.36425%2C0.10483%2C1.83723%2C0.10483c2.6252%2C0%2C4.04313-1.10245%2C4.90908-3.9378%0A%09%09%09%09c0-0.05267%2C0.49931-1.68025%2C0.49931-1.70658l-9.97616-27.64562h6.14268l6.98432%2C22.47371h0.10432l6.98433-22.47371h5.9857%0A%09%09%09%09l-10.34483%2C29.06304c-2.36186%2C6.69517-5.0924%2C8.84789-10.81577%2C8.84789C121.17891%2C80.12006%2C119.76098%2C80.06739%2C119.34167%2C79.9889%0A%09%09%09%09z%22%2F%3E%0A%09%09%3C%2Fg%3E%0A%09%3C%2Fg%3E%0A%3C%2Fg%3E%0A%3Cg%3E%0A%3C%2Fg%3E%0A%3Cg%3E%0A%3C%2Fg%3E%0A%3Cg%3E%0A%3C%2Fg%3E%0A%3Cg%3E%0A%3C%2Fg%3E%0A%3Cg%3E%0A%3C%2Fg%3E%0A%3Cg%3E%0A%3C%2Fg%3E%0A%3C%2Fsvg%3E%0A";
const GOOGLE_PAY_MARK_DATA_URI = "data:image/svg+xml;charset=utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%0D%0A%3C!--%20Generator%3A%20Adobe%20Illustrator%2024.3.0%2C%20SVG%20Export%20Plug-In%20.%20SVG%20Version%3A%206.00%20Build%200)%20%20--%3E%0D%0A%3Csvg%20version%3D%221.1%22%20id%3D%22G_Pay_Acceptance_Mark%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%0D%0A%09%20x%3D%220px%22%20y%3D%220px%22%20viewBox%3D%220%200%201094%20742%22%20enable-background%3D%22new%200%200%201094%20742%22%20xml%3Aspace%3D%22preserve%22%3E%0D%0A%3Cpath%20id%3D%22Base_1_%22%20fill%3D%22%23FFFFFF%22%20d%3D%22M722.7%2C170h-352c-110%2C0-200%2C90-200%2C200l0%2C0c0%2C110%2C90%2C200%2C200%2C200h352c110%2C0%2C200-90%2C200-200l0%2C0%0D%0A%09C922.7%2C260%2C832.7%2C170%2C722.7%2C170z%22%2F%3E%0D%0A%3Cpath%20id%3D%22Outline%22%20fill%3D%22%233C4043%22%20d%3D%22M722.7%2C186.2c24.7%2C0%2C48.7%2C4.9%2C71.3%2C14.5c21.9%2C9.3%2C41.5%2C22.6%2C58.5%2C39.5%0D%0A%09c16.9%2C16.9%2C30.2%2C36.6%2C39.5%2C58.5c9.6%2C22.6%2C14.5%2C46.6%2C14.5%2C71.3s-4.9%2C48.7-14.5%2C71.3c-9.3%2C21.9-22.6%2C41.5-39.5%2C58.5%0D%0A%09c-16.9%2C16.9-36.6%2C30.2-58.5%2C39.5c-22.6%2C9.6-46.6%2C14.5-71.3%2C14.5h-352c-24.7%2C0-48.7-4.9-71.3-14.5c-21.9-9.3-41.5-22.6-58.5-39.5%0D%0A%09c-16.9-16.9-30.2-36.6-39.5-58.5c-9.6-22.6-14.5-46.6-14.5-71.3s4.9-48.7%2C14.5-71.3c9.3-21.9%2C22.6-41.5%2C39.5-58.5%0D%0A%09c16.9-16.9%2C36.6-30.2%2C58.5-39.5c22.6-9.6%2C46.6-14.5%2C71.3-14.5L722.7%2C186.2%20M722.7%2C170h-352c-110%2C0-200%2C90-200%2C200l0%2C0%0D%0A%09c0%2C110%2C90%2C200%2C200%2C200h352c110%2C0%2C200-90%2C200-200l0%2C0C922.7%2C260%2C832.7%2C170%2C722.7%2C170L722.7%2C170z%22%2F%3E%0D%0A%3Cg%20id%3D%22G_Pay_Lockup_1_%22%3E%0D%0A%09%3Cg%20id%3D%22Pay_Typeface_3_%22%3E%0D%0A%09%09%3Cpath%20id%3D%22Letter_p_3_%22%20fill%3D%22%233C4043%22%20d%3D%22M529.3%2C384.2v60.5h-19.2V295.3H561c12.9%2C0%2C23.9%2C4.3%2C32.9%2C12.9%0D%0A%09%09%09c9.2%2C8.6%2C13.8%2C19.1%2C13.8%2C31.5c0%2C12.7-4.6%2C23.2-13.8%2C31.7c-8.9%2C8.5-19.9%2C12.7-32.9%2C12.7h-31.7V384.2z%20M529.3%2C313.7v52.1h32.1%0D%0A%09%09%09c7.6%2C0%2C14-2.6%2C19-7.7c5.1-5.1%2C7.7-11.3%2C7.7-18.3c0-6.9-2.6-13-7.7-18.1c-5-5.3-11.3-7.9-19-7.9h-32.1V313.7z%22%2F%3E%0D%0A%09%09%3Cpath%20id%3D%22Letter_a_3_%22%20fill%3D%22%233C4043%22%20d%3D%22M657.9%2C339.1c14.2%2C0%2C25.4%2C3.8%2C33.6%2C11.4c8.2%2C7.6%2C12.3%2C18%2C12.3%2C31.2v63h-18.3v-14.2h-0.8%0D%0A%09%09%09c-7.9%2C11.7-18.5%2C17.5-31.7%2C17.5c-11.3%2C0-20.7-3.3-28.3-10s-11.4-15-11.4-25c0-10.6%2C4-19%2C12-25.2c8-6.3%2C18.7-9.4%2C32-9.4%0D%0A%09%09%09c11.4%2C0%2C20.8%2C2.1%2C28.1%2C6.3v-4.4c0-6.7-2.6-12.3-7.9-17c-5.3-4.7-11.5-7-18.6-7c-10.7%2C0-19.2%2C4.5-25.4%2C13.6l-16.9-10.6%0D%0A%09%09%09C625.9%2C345.8%2C639.7%2C339.1%2C657.9%2C339.1z%20M633.1%2C413.3c0%2C5%2C2.1%2C9.2%2C6.4%2C12.5c4.2%2C3.3%2C9.2%2C5%2C14.9%2C5c8.1%2C0%2C15.3-3%2C21.6-9%0D%0A%09%09%09s9.5-13%2C9.5-21.1c-6-4.7-14.3-7.1-25-7.1c-7.8%2C0-14.3%2C1.9-19.5%2C5.6C635.7%2C403.1%2C633.1%2C407.8%2C633.1%2C413.3z%22%2F%3E%0D%0A%09%09%3Cpath%20id%3D%22Letter_y_3_%22%20fill%3D%22%233C4043%22%20d%3D%22M808.2%2C342.4l-64%2C147.2h-19.8l23.8-51.5L706%2C342.4h20.9l30.4%2C73.4h0.4l29.6-73.4H808.2z%22%0D%0A%09%09%09%2F%3E%0D%0A%09%3C%2Fg%3E%0D%0A%09%3Cg%20id%3D%22G_Mark_1_%22%3E%0D%0A%09%09%3Cpath%20id%3D%22Blue_500%22%20fill%3D%22%234285F4%22%20d%3D%22M452.93%2C372c0-6.26-0.56-12.25-1.6-18.01h-80.48v33L417.2%2C387%0D%0A%09%09%09c-1.88%2C10.98-7.93%2C20.34-17.2%2C26.58v21.41h27.59C443.7%2C420.08%2C452.93%2C398.04%2C452.93%2C372z%22%2F%3E%0D%0A%09%09%3Cpath%20id%3D%22Green_500_1_%22%20fill%3D%22%2334A853%22%20d%3D%22M400.01%2C413.58c-7.68%2C5.18-17.57%2C8.21-29.14%2C8.21c-22.35%2C0-41.31-15.06-48.1-35.36%0D%0A%09%09%09h-28.46v22.08c14.1%2C27.98%2C43.08%2C47.18%2C76.56%2C47.18c23.14%2C0%2C42.58-7.61%2C56.73-20.71L400.01%2C413.58z%22%2F%3E%0D%0A%09%09%3Cpath%20id%3D%22Yellow_500_1_%22%20fill%3D%22%23FABB05%22%20d%3D%22M320.09%2C370.05c0-5.7%2C0.95-11.21%2C2.68-16.39v-22.08h-28.46%0D%0A%09%09%09c-5.83%2C11.57-9.11%2C24.63-9.11%2C38.47s3.29%2C26.9%2C9.11%2C38.47l28.46-22.08C321.04%2C381.26%2C320.09%2C375.75%2C320.09%2C370.05z%22%2F%3E%0D%0A%09%09%3Cpath%20id%3D%22Red_500%22%20fill%3D%22%23E94235%22%20d%3D%22M370.87%2C318.3c12.63%2C0%2C23.94%2C4.35%2C32.87%2C12.85l24.45-24.43%0D%0A%09%09%09c-14.85-13.83-34.21-22.32-57.32-22.32c-33.47%2C0-62.46%2C19.2-76.56%2C47.18l28.46%2C22.08C329.56%2C333.36%2C348.52%2C318.3%2C370.87%2C318.3z%22%2F%3E%0D%0A%09%3C%2Fg%3E%0D%0A%3C%2Fg%3E%0D%0A%3C%2Fsvg%3E%0D%0A";

/** Official Klarna checkout badge (documented by Klarna for merchant checkout). */
const KLARNA_BADGE = 'https://x.klarnacdn.net/payment-method/assets/badges/generic/klarna.svg';
/** PayPal primary full-color wordmark hosted on paypalobjects.com (transparent). */
const PAYPAL_MARK = 'https://www.paypalobjects.com/digitalassets/c/website/logo/full-text/pp_fc_hl.svg';
/** Affirm black logo (transparent) for light surfaces — Affirm CDN. */
const AFFIRM_MARK_LIGHT = 'https://cdn-assets.affirm.com/images/black_logo-transparent_bg.svg';
/** Affirm white logo (transparent PNG) for dark surfaces — Affirm CDN. */
const AFFIRM_MARK_DARK = 'https://cdn-assets.affirm.com/images/white_logo-transparent_bg.png';
/**
 * Build presentation for a payment method + theme.
 * Uses only provider-approved assets or intentional fallbacks.
 */
function getPaymentMethodPresentation(method, theme = 'light') {
    const label = PAYMENT_METHOD_LABELS[method];
    const dark = theme === 'dark';
    switch (method) {
        case 'card':
            return {
                method,
                label,
                markIncludesName: false,
                source: 'generic',
                markUrl: null,
                notes: 'Generic neutral card icon (not a card-network brand).',
            };
        case 'apple-pay':
            return {
                method,
                label,
                markIncludesName: true,
                source: 'official-bundled',
                markUrl: APPLE_PAY_MARK_DATA_URI,
                notes: 'Official Apple Pay mark from Apple’s Apple-Pay-Mark.zip (developer.apple.com/apple-pay/marketing/).',
            };
        case 'google-pay':
            return {
                method,
                label,
                markIncludesName: true,
                source: 'official-bundled',
                markUrl: GOOGLE_PAY_MARK_DATA_URI,
                notes: 'Official Google Pay mark from Google-Pay-Acceptance.zip (developers.google.com brand guidelines).',
            };
        case 'paypal':
            return {
                method,
                label,
                markIncludesName: true,
                source: 'official-cdn',
                // Full-color transparent SVG works on light and dark tiles without a white plate.
                markUrl: PAYPAL_MARK,
                notes: 'PayPal-hosted logo assets on paypalobjects.com.',
            };
        case 'klarna':
            return {
                method,
                label,
                markIncludesName: true,
                source: 'official-cdn',
                markUrl: KLARNA_BADGE,
                notes: 'Official Klarna badge from Klarna CDN (payment_method_categories / checkout styling docs).',
            };
        case 'affirm':
            return {
                method,
                label,
                markIncludesName: true,
                source: 'official-cdn',
                markUrl: dark ? AFFIRM_MARK_DARK : AFFIRM_MARK_LIGHT,
                notes: 'Affirm-hosted logo assets (cdn-assets.affirm.com). Merchant toolkit recommends Affirm-hosted assets.',
            };
        default: {
            const _exhaustive = method;
            return _exhaustive;
        }
    }
}
function listPaymentMethodPresentations(theme = 'light') {
    const methods = [
        'card',
        'apple-pay',
        'google-pay',
        'paypal',
        'klarna',
        'affirm',
    ];
    return methods.map((method) => getPaymentMethodPresentation(method, theme));
}

class PaymentMethodIconComponent {
    method = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "method" }] : /* istanbul ignore next */ []));
    theme = input('light', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    markFailed = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "markFailed" }] : /* istanbul ignore next */ []));
    lastKey = '';
    presentation = computed(() => getPaymentMethodPresentation(this.method(), this.theme()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "presentation" }] : /* istanbul ignore next */ []));
    showMark = computed(() => !!this.presentation().markUrl && !this.markFailed(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showMark" }] : /* istanbul ignore next */ []));
    constructor() {
        effect(() => {
            const key = `${this.method()}|${this.theme()}`;
            if (key !== this.lastKey) {
                this.lastKey = key;
                this.markFailed.set(false);
            }
        });
    }
    onMarkError() {
        this.markFailed.set(true);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentMethodIconComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: PaymentMethodIconComponent, isStandalone: true, selector: "easy-payment-method-icon", inputs: { method: { classPropertyName: "method", publicName: "method", isSignal: true, isRequired: true, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0, template: `
    <span class="ep-mark" [attr.data-method]="method()" [attr.data-source]="presentation().source">
      @if (presentation().source === 'generic') {
        <svg class="ep-mark__generic" viewBox="0 0 32 24" aria-hidden="true" focusable="false">
          <rect x="1" y="3" width="30" height="18" rx="3" fill="currentColor" opacity="0.12" />
          <rect x="1" y="7" width="30" height="4" fill="currentColor" opacity="0.35" />
          <rect x="4" y="15" width="10" height="2.5" rx="1" fill="currentColor" opacity="0.55" />
          <rect x="22" y="14.5" width="6" height="3.5" rx="1" fill="currentColor" opacity="0.35" />
        </svg>
      } @else if (showMark()) {
        <img
          class="ep-mark__img"
          [src]="presentation().markUrl!"
          [alt]="''"
          decoding="async"
          loading="lazy"
          (error)="onMarkError()"
        />
      } @else {
        <span class="ep-mark__fallback" aria-hidden="true">{{ presentation().label }}</span>
      }
    </span>
  `, isInline: true, styles: [":host{display:inline-flex;align-items:center;justify-content:center;width:100%;color:inherit;font-family:var(--ep-font-family, inherit)}.ep-mark{display:inline-flex;align-items:center;justify-content:center;width:100%;height:36px;max-width:100%}.ep-mark__generic{width:34px;height:26px;display:block}.ep-mark__img{display:block;height:24px;width:auto;max-width:88px;object-fit:contain;object-position:center}.ep-mark[data-method=apple-pay] .ep-mark__img{height:28px;max-width:56px}.ep-mark[data-method=google-pay] .ep-mark__img{height:32px;max-width:72px}.ep-mark[data-method=paypal] .ep-mark__img{height:26px;max-width:90px}.ep-mark[data-method=klarna] .ep-mark__img{height:22px;max-width:68px}.ep-mark[data-method=affirm] .ep-mark__img{height:24px;max-width:84px}.ep-mark__fallback{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:0 2px;font-size:11px;font-weight:700;letter-spacing:-.015em;line-height:1.15;text-align:center;color:var(--ep-text, #0f172a);max-width:92px}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentMethodIconComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-payment-method-icon', standalone: true, template: `
    <span class="ep-mark" [attr.data-method]="method()" [attr.data-source]="presentation().source">
      @if (presentation().source === 'generic') {
        <svg class="ep-mark__generic" viewBox="0 0 32 24" aria-hidden="true" focusable="false">
          <rect x="1" y="3" width="30" height="18" rx="3" fill="currentColor" opacity="0.12" />
          <rect x="1" y="7" width="30" height="4" fill="currentColor" opacity="0.35" />
          <rect x="4" y="15" width="10" height="2.5" rx="1" fill="currentColor" opacity="0.55" />
          <rect x="22" y="14.5" width="6" height="3.5" rx="1" fill="currentColor" opacity="0.35" />
        </svg>
      } @else if (showMark()) {
        <img
          class="ep-mark__img"
          [src]="presentation().markUrl!"
          [alt]="''"
          decoding="async"
          loading="lazy"
          (error)="onMarkError()"
        />
      } @else {
        <span class="ep-mark__fallback" aria-hidden="true">{{ presentation().label }}</span>
      }
    </span>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:inline-flex;align-items:center;justify-content:center;width:100%;color:inherit;font-family:var(--ep-font-family, inherit)}.ep-mark{display:inline-flex;align-items:center;justify-content:center;width:100%;height:36px;max-width:100%}.ep-mark__generic{width:34px;height:26px;display:block}.ep-mark__img{display:block;height:24px;width:auto;max-width:88px;object-fit:contain;object-position:center}.ep-mark[data-method=apple-pay] .ep-mark__img{height:28px;max-width:56px}.ep-mark[data-method=google-pay] .ep-mark__img{height:32px;max-width:72px}.ep-mark[data-method=paypal] .ep-mark__img{height:26px;max-width:90px}.ep-mark[data-method=klarna] .ep-mark__img{height:22px;max-width:68px}.ep-mark[data-method=affirm] .ep-mark__img{height:24px;max-width:84px}.ep-mark__fallback{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:0 2px;font-size:11px;font-weight:700;letter-spacing:-.015em;line-height:1.15;text-align:center;color:var(--ep-text, #0f172a);max-width:92px}\n"] }]
        }], ctorParameters: () => [], propDecorators: { method: [{ type: i0.Input, args: [{ isSignal: true, alias: "method", required: true }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }] } });

class PaymentMethodTileComponent {
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    method = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "method" }] : /* istanbul ignore next */ []));
    theme = input('light', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    selected = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selected" }] : /* istanbul ignore next */ []));
    isMock = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "isMock" }] : /* istanbul ignore next */ []));
    disabled = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "disabled" }] : /* istanbul ignore next */ []));
    select = output();
    presentation = computed(() => getPaymentMethodPresentation(this.method(), this.theme()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "presentation" }] : /* istanbul ignore next */ []));
    /**
     * Show a visible label when the mark does not already include the brand name,
     * or when we are on a text fallback (label IS the mark).
     * For text-fallback, the icon component already renders the name — avoid duplicate.
     */
    showVisibleLabel = computed(() => {
        const p = this.presentation();
        if (p.source === 'text-fallback') {
            return false;
        }
        return !p.markIncludesName;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showVisibleLabel" }] : /* istanbul ignore next */ []));
    ariaLabel() {
        const method = this.method();
        const base = method === 'card' ? this.msgs().methodCard : PAYMENT_METHOD_LABELS[method];
        const demo = this.isMock() ? `, ${this.msgs().demoModeAria}` : '';
        const state = this.selected() ? ', selected' : '';
        return `${base}${demo}${state}`;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentMethodTileComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: PaymentMethodTileComponent, isStandalone: true, selector: "easy-payment-method-tile", inputs: { method: { classPropertyName: "method", publicName: "method", isSignal: true, isRequired: true, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null }, selected: { classPropertyName: "selected", publicName: "selected", isSignal: true, isRequired: false, transformFunction: null }, isMock: { classPropertyName: "isMock", publicName: "isMock", isSignal: true, isRequired: false, transformFunction: null }, disabled: { classPropertyName: "disabled", publicName: "disabled", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { select: "select" }, ngImport: i0, template: `
    <button
      type="button"
      class="ep-tile"
      role="radio"
      [class.ep-tile--selected]="selected()"
      [class.ep-tile--mock]="isMock()"
      [class.ep-tile--fallback]="presentation().source === 'text-fallback'"
      [attr.aria-checked]="selected()"
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled()"
      (click)="select.emit()"
      (keydown.enter)="select.emit()"
      (keydown.space)="$event.preventDefault(); select.emit()"
    >
      @if (isMock()) {
        <span class="ep-tile__demo" aria-hidden="true">{{ msgs().demoBadge }}</span>
      }
      @if (selected()) {
        <span class="ep-tile__check" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <path
              d="M3.5 8.2 6.4 11l6.1-6.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      }
      <span class="ep-tile__icon">
        <easy-payment-method-icon [method]="method()" [theme]="theme()" />
      </span>
      @if (showVisibleLabel()) {
        <span class="ep-tile__label">{{ presentation().label }}</span>
      } @else {
        <!-- Reserve label row so mark-only tiles align with Card (icon + label). -->
        <span class="ep-tile__label ep-tile__label--spacer" aria-hidden="true"></span>
      }
    </button>
  `, isInline: true, styles: [":host{display:block;min-width:0;font-family:var(--ep-font-family, inherit)}.ep-tile{box-sizing:border-box;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;height:88px;min-height:88px;padding:18px 8px 12px;border:1px solid var(--ep-border, #e2e8f0);border-radius:var(--ep-radius-md, 10px);background:var(--ep-surface, #fff);color:var(--ep-text, #0f172a);box-shadow:var(--ep-shadow-sm, 0 1px 2px rgba(15, 23, 42, .04));cursor:pointer;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}.ep-tile:hover:not(:disabled){border-color:var(--ep-border-strong, #cbd5e1);background:var(--ep-surface-hover, #f8fafc)}.ep-tile:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-tile--selected{border-color:var(--ep-accent, #2563eb);background:var(--ep-accent-soft, #eff6ff);box-shadow:var(--ep-shadow-sm, 0 1px 2px rgba(15, 23, 42, .04)),inset 0 0 0 1px var(--ep-accent, #2563eb)}.ep-tile:disabled{opacity:.5;cursor:not-allowed}.ep-tile__demo{position:absolute;top:6px;left:6px;z-index:1;padding:1px 5px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.2;background:var(--ep-demo-bg, #f1f5f9);color:var(--ep-demo-text, #64748b);pointer-events:none}.ep-tile__check{position:absolute;top:6px;right:6px;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:var(--ep-accent, #2563eb);color:#fff;pointer-events:none}.ep-tile__icon{display:flex;align-items:center;justify-content:center;flex:0 0 36px;height:36px;width:100%;max-width:100%;color:var(--ep-text, #0f172a)}.ep-tile__label{font-size:12px;font-weight:600;line-height:1.2;text-align:center;color:var(--ep-text-secondary, #64748b);min-height:1.2em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ep-tile__label--spacer{visibility:hidden}.ep-tile--selected .ep-tile__label{color:var(--ep-text, #0f172a)}@media(prefers-reduced-motion:reduce){.ep-tile{transition:none}}\n"], dependencies: [{ kind: "component", type: PaymentMethodIconComponent, selector: "easy-payment-method-icon", inputs: ["method", "theme"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentMethodTileComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-payment-method-tile', standalone: true, imports: [PaymentMethodIconComponent], template: `
    <button
      type="button"
      class="ep-tile"
      role="radio"
      [class.ep-tile--selected]="selected()"
      [class.ep-tile--mock]="isMock()"
      [class.ep-tile--fallback]="presentation().source === 'text-fallback'"
      [attr.aria-checked]="selected()"
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled()"
      (click)="select.emit()"
      (keydown.enter)="select.emit()"
      (keydown.space)="$event.preventDefault(); select.emit()"
    >
      @if (isMock()) {
        <span class="ep-tile__demo" aria-hidden="true">{{ msgs().demoBadge }}</span>
      }
      @if (selected()) {
        <span class="ep-tile__check" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <path
              d="M3.5 8.2 6.4 11l6.1-6.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      }
      <span class="ep-tile__icon">
        <easy-payment-method-icon [method]="method()" [theme]="theme()" />
      </span>
      @if (showVisibleLabel()) {
        <span class="ep-tile__label">{{ presentation().label }}</span>
      } @else {
        <!-- Reserve label row so mark-only tiles align with Card (icon + label). -->
        <span class="ep-tile__label ep-tile__label--spacer" aria-hidden="true"></span>
      }
    </button>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;min-width:0;font-family:var(--ep-font-family, inherit)}.ep-tile{box-sizing:border-box;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;height:88px;min-height:88px;padding:18px 8px 12px;border:1px solid var(--ep-border, #e2e8f0);border-radius:var(--ep-radius-md, 10px);background:var(--ep-surface, #fff);color:var(--ep-text, #0f172a);box-shadow:var(--ep-shadow-sm, 0 1px 2px rgba(15, 23, 42, .04));cursor:pointer;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}.ep-tile:hover:not(:disabled){border-color:var(--ep-border-strong, #cbd5e1);background:var(--ep-surface-hover, #f8fafc)}.ep-tile:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-tile--selected{border-color:var(--ep-accent, #2563eb);background:var(--ep-accent-soft, #eff6ff);box-shadow:var(--ep-shadow-sm, 0 1px 2px rgba(15, 23, 42, .04)),inset 0 0 0 1px var(--ep-accent, #2563eb)}.ep-tile:disabled{opacity:.5;cursor:not-allowed}.ep-tile__demo{position:absolute;top:6px;left:6px;z-index:1;padding:1px 5px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.2;background:var(--ep-demo-bg, #f1f5f9);color:var(--ep-demo-text, #64748b);pointer-events:none}.ep-tile__check{position:absolute;top:6px;right:6px;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:var(--ep-accent, #2563eb);color:#fff;pointer-events:none}.ep-tile__icon{display:flex;align-items:center;justify-content:center;flex:0 0 36px;height:36px;width:100%;max-width:100%;color:var(--ep-text, #0f172a)}.ep-tile__label{font-size:12px;font-weight:600;line-height:1.2;text-align:center;color:var(--ep-text-secondary, #64748b);min-height:1.2em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ep-tile__label--spacer{visibility:hidden}.ep-tile--selected .ep-tile__label{color:var(--ep-text, #0f172a)}@media(prefers-reduced-motion:reduce){.ep-tile{transition:none}}\n"] }]
        }], propDecorators: { method: [{ type: i0.Input, args: [{ isSignal: true, alias: "method", required: true }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }], selected: [{ type: i0.Input, args: [{ isSignal: true, alias: "selected", required: false }] }], isMock: [{ type: i0.Input, args: [{ isSignal: true, alias: "isMock", required: false }] }], disabled: [{ type: i0.Input, args: [{ isSignal: true, alias: "disabled", required: false }] }], select: [{ type: i0.Output, args: ["select"] }] } });

class PaymentMethodSelectorComponent {
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    methods = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "methods" }] : /* istanbul ignore next */ []));
    selected = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selected" }] : /* istanbul ignore next */ []));
    theme = input('light', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    disabled = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "disabled" }] : /* istanbul ignore next */ []));
    /** Methods that render their own provider button in place of a selectable tile. */
    expressTemplates = input({}, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "expressTemplates" }] : /* istanbul ignore next */ []));
    methodSelect = output();
    tiles = viewChildren(PaymentMethodTileComponent, { ...(ngDevMode ? { debugName: "tiles" } : /* istanbul ignore next */ {}), read: ElementRef });
    /** Express slots are not radio options, so they stay out of keyboard navigation. */
    selectableMethods = computed(() => {
        const express = this.expressTemplates();
        return this.methods().filter((entry) => !express[entry.method]);
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectableMethods" }] : /* istanbul ignore next */ []));
    onTileSelect(method) {
        if (this.disabled()) {
            return;
        }
        this.methodSelect.emit(method);
    }
    onKeydown(event) {
        if (this.disabled()) {
            return;
        }
        const items = this.selectableMethods();
        if (items.length === 0) {
            return;
        }
        const currentIndex = Math.max(0, items.findIndex((entry) => entry.method === this.selected()));
        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % items.length;
        }
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + items.length) % items.length;
        }
        else if (event.key === 'Home') {
            nextIndex = 0;
        }
        else if (event.key === 'End') {
            nextIndex = items.length - 1;
        }
        else {
            return;
        }
        event.preventDefault();
        this.methodSelect.emit(items[nextIndex].method);
        queueMicrotask(() => {
            const button = this.tiles()
                .at(nextIndex)
                ?.nativeElement?.querySelector('button');
            button?.focus();
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentMethodSelectorComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: PaymentMethodSelectorComponent, isStandalone: true, selector: "easy-payment-method-selector", inputs: { methods: { classPropertyName: "methods", publicName: "methods", isSignal: true, isRequired: true, transformFunction: null }, selected: { classPropertyName: "selected", publicName: "selected", isSignal: true, isRequired: false, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null }, disabled: { classPropertyName: "disabled", publicName: "disabled", isSignal: true, isRequired: false, transformFunction: null }, expressTemplates: { classPropertyName: "expressTemplates", publicName: "expressTemplates", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { methodSelect: "methodSelect" }, viewQueries: [{ propertyName: "tiles", predicate: PaymentMethodTileComponent, descendants: true, read: ElementRef, isSignal: true }], ngImport: i0, template: `
    <div class="ep-selector">
      <p class="ep-selector__label" id="ep-payment-methods-label">{{ msgs().paymentMethodsLabel }}</p>
      <div
        class="ep-selector__grid"
        role="radiogroup"
        aria-labelledby="ep-payment-methods-label"
        (keydown)="onKeydown($event)"
      >
        @for (entry of methods(); track entry.method) {
          @if (expressTemplates()[entry.method]; as expressTemplate) {
            <div class="ep-selector__express">
              <ng-container [ngTemplateOutlet]="expressTemplate" />
            </div>
          } @else {
            <easy-payment-method-tile
              [method]="entry.method"
              [theme]="theme()"
              [isMock]="entry.isMock"
              [selected]="entry.method === selected()"
              [disabled]="disabled()"
              (select)="onTileSelect(entry.method)"
            />
          }
        }
      </div>
    </div>
  `, isInline: true, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-selector__label{margin:0 0 var(--ep-spacing-sm, 10px);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ep-text-secondary, #64748b)}.ep-selector__grid{display:grid;gap:var(--ep-spacing-sm, 10px);width:100%;grid-template-columns:minmax(0,1fr)}.ep-selector__express{display:flex;align-items:center;justify-content:center;box-sizing:border-box;height:88px;min-height:88px;padding:12px 10px;border-radius:var(--ep-radius-md, 10px);border:1px solid var(--ep-border, #e2e8f0);background:var(--ep-surface, #ffffff)}.ep-selector__express>*{display:flex;align-items:center;justify-content:center;width:100%;max-width:100%}@container ep-checkout (min-width: 360px){.ep-selector__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@container ep-checkout (min-width: 520px){.ep-selector__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@container ep-checkout (min-width: 880px){.ep-selector__grid{grid-template-columns:repeat(6,minmax(0,1fr))}}\n"], dependencies: [{ kind: "component", type: PaymentMethodTileComponent, selector: "easy-payment-method-tile", inputs: ["method", "theme", "selected", "isMock", "disabled"], outputs: ["select"] }, { kind: "directive", type: NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: PaymentMethodSelectorComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-payment-method-selector', standalone: true, imports: [PaymentMethodTileComponent, NgTemplateOutlet], template: `
    <div class="ep-selector">
      <p class="ep-selector__label" id="ep-payment-methods-label">{{ msgs().paymentMethodsLabel }}</p>
      <div
        class="ep-selector__grid"
        role="radiogroup"
        aria-labelledby="ep-payment-methods-label"
        (keydown)="onKeydown($event)"
      >
        @for (entry of methods(); track entry.method) {
          @if (expressTemplates()[entry.method]; as expressTemplate) {
            <div class="ep-selector__express">
              <ng-container [ngTemplateOutlet]="expressTemplate" />
            </div>
          } @else {
            <easy-payment-method-tile
              [method]="entry.method"
              [theme]="theme()"
              [isMock]="entry.isMock"
              [selected]="entry.method === selected()"
              [disabled]="disabled()"
              (select)="onTileSelect(entry.method)"
            />
          }
        }
      </div>
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-selector__label{margin:0 0 var(--ep-spacing-sm, 10px);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ep-text-secondary, #64748b)}.ep-selector__grid{display:grid;gap:var(--ep-spacing-sm, 10px);width:100%;grid-template-columns:minmax(0,1fr)}.ep-selector__express{display:flex;align-items:center;justify-content:center;box-sizing:border-box;height:88px;min-height:88px;padding:12px 10px;border-radius:var(--ep-radius-md, 10px);border:1px solid var(--ep-border, #e2e8f0);background:var(--ep-surface, #ffffff)}.ep-selector__express>*{display:flex;align-items:center;justify-content:center;width:100%;max-width:100%}@container ep-checkout (min-width: 360px){.ep-selector__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@container ep-checkout (min-width: 520px){.ep-selector__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@container ep-checkout (min-width: 880px){.ep-selector__grid{grid-template-columns:repeat(6,minmax(0,1fr))}}\n"] }]
        }], propDecorators: { methods: [{ type: i0.Input, args: [{ isSignal: true, alias: "methods", required: true }] }], selected: [{ type: i0.Input, args: [{ isSignal: true, alias: "selected", required: false }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }], disabled: [{ type: i0.Input, args: [{ isSignal: true, alias: "disabled", required: false }] }], expressTemplates: [{ type: i0.Input, args: [{ isSignal: true, alias: "expressTemplates", required: false }] }], methodSelect: [{ type: i0.Output, args: ["methodSelect"] }], tiles: [{ type: i0.ViewChildren, args: [i0.forwardRef(() => PaymentMethodTileComponent), { ...{ read: ElementRef }, isSignal: true }] }] } });

/**
 * Detail panel for mock / non-Stripe payment methods after selection,
 * or a compact strip stand-in for wallet methods in Buttons Only mock mode.
 */
class MockMethodPanelComponent {
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    method = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "method" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    theme = input('light', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    isMock = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "isMock" }] : /* istanbul ignore next */ []));
    loading = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []));
    /** Visual density. Default `panel` preserves full-checkout mock chrome. */
    presentation = input('panel', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "presentation" }] : /* istanbul ignore next */ []));
    pay = output();
    label = computed(() => {
        const method = this.method();
        return method === 'card' ? this.msgs().methodCard : PAYMENT_METHOD_LABELS[method];
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "label" }] : /* istanbul ignore next */ []));
    amountLabel = computed(() => this.i18n
        ? this.i18n.formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1)
        : formatMoney(this.product().amount, this.product().currency, this.product().quantity ?? 1, 'en'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "amountLabel" }] : /* istanbul ignore next */ []));
    title = computed(() => interpolate(this.msgs().payWithMethod, { method: this.label() }), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "title" }] : /* istanbul ignore next */ []));
    payLabel = computed(() => interpolate(this.msgs().payAmount, { amount: this.amountLabel() }), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "payLabel" }] : /* istanbul ignore next */ []));
    ctaAriaLabel() {
        return interpolate(this.msgs().payAmountWithMethodAria, {
            amount: this.amountLabel(),
            method: this.label(),
        });
    }
    expandLabel = computed(() => this.isMock() ? this.msgs().completeDemoPayment : this.msgs().confirmPayment, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "expandLabel" }] : /* istanbul ignore next */ []));
    expandAriaLabel() {
        return interpolate(this.isMock()
            ? this.msgs().completeDemoPaymentWithMethodAria
            : this.msgs().confirmPaymentWithMethodAria, { method: this.label() });
    }
    stripAriaLabel() {
        if (this.isMock()) {
            return interpolate(this.msgs().demoWalletButtonAria, { method: this.label() });
        }
        return interpolate(this.msgs().payWithMethod, { method: this.label() });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: MockMethodPanelComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: MockMethodPanelComponent, isStandalone: true, selector: "easy-mock-method-panel", inputs: { method: { classPropertyName: "method", publicName: "method", isSignal: true, isRequired: true, transformFunction: null }, product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null }, isMock: { classPropertyName: "isMock", publicName: "isMock", isSignal: true, isRequired: false, transformFunction: null }, loading: { classPropertyName: "loading", publicName: "loading", isSignal: true, isRequired: false, transformFunction: null }, presentation: { classPropertyName: "presentation", publicName: "presentation", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { pay: "pay" }, ngImport: i0, template: `
    @if (presentation() === 'strip') {
      <button
        type="button"
        class="ep-mock-panel__strip"
        [disabled]="loading()"
        [attr.aria-busy]="loading()"
        [attr.aria-label]="stripAriaLabel()"
        data-testid="easy-mock-strip-button"
        (click)="pay.emit()"
      >
        <span class="ep-mock-panel__strip-icon" aria-hidden="true">
          <easy-payment-method-icon [method]="method()" [theme]="theme()" />
        </span>
        @if (loading()) {
          <span class="ep-mock-panel__spinner" aria-hidden="true"></span>
        }
      </button>
    } @else if (presentation() === 'expand') {
      <div class="ep-mock-panel ep-mock-panel--expand">
        <button
          type="button"
          class="ep-mock-panel__cta"
          [disabled]="loading()"
          [attr.aria-busy]="loading()"
          [attr.aria-label]="expandAriaLabel()"
          (click)="pay.emit()"
        >
          @if (loading()) {
            <span class="ep-mock-panel__spinner" aria-hidden="true"></span>
            {{ msgs().processingPayment }}
          } @else {
            {{ expandLabel() }}
          }
        </button>
      </div>
    } @else {
      <div class="ep-mock-panel">
        <div class="ep-mock-panel__header">
          <easy-payment-method-icon [method]="method()" [theme]="theme()" />
          <div>
            <h3 class="ep-mock-panel__title">{{ title() }}</h3>
            @if (isMock()) {
              <p class="ep-mock-panel__hint">{{ msgs().demoCheckoutHint }}</p>
            } @else {
              <p class="ep-mock-panel__hint">{{ msgs().continuePaymentHint }}</p>
            }
          </div>
        </div>

        <button
          type="button"
          class="ep-mock-panel__cta"
          [disabled]="loading()"
          [attr.aria-busy]="loading()"
          [attr.aria-label]="ctaAriaLabel()"
          (click)="pay.emit()"
        >
          @if (loading()) {
            <span class="ep-mock-panel__spinner" aria-hidden="true"></span>
            {{ msgs().processingPayment }}
          } @else {
            {{ payLabel() }}
          }
        </button>
      </div>
    }
  `, isInline: true, styles: [":host{display:block;width:100%;box-sizing:border-box;font-family:var(--ep-font-family, inherit)}.ep-mock-panel{display:flex;flex-direction:column;gap:16px}.ep-mock-panel--expand{gap:10px}.ep-mock-panel__header{display:flex;align-items:center;gap:12px}.ep-mock-panel__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-mock-panel__hint{margin:4px 0 0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-mock-panel--expand .ep-mock-panel__hint{margin:0}.ep-mock-panel__cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;width:100%;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-mock-panel__cta:hover:not(:disabled){background:var(--ep-cta-bg-hover, #1e293b)}.ep-mock-panel__cta:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-mock-panel__cta:disabled{opacity:.6;cursor:not-allowed}.ep-mock-panel__strip{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;width:var(--ep-buttons-width, 100%);max-width:100%;min-width:var(--ep-buttons-min-width, 100px);height:var(--ep-buttons-height, 40px);min-height:var(--ep-buttons-height, 40px);padding:0 12px;border:var(--ep-buttons-border-width, 1px) solid var(--ep-buttons-border-color, var(--ep-border, #e2e8f0));border-radius:var(--ep-buttons-radius, var(--ep-radius-md, 10px));background:var(--ep-surface, #fff);color:var(--ep-text, #0f172a);font:inherit;cursor:pointer;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}.ep-mock-panel__strip:hover:not(:disabled){border-color:var(--ep-border-strong, #cbd5e1)}.ep-mock-panel__strip:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-mock-panel__strip:disabled{opacity:.55;cursor:not-allowed}.ep-mock-panel__strip-icon{display:inline-flex;align-items:center;justify-content:center;flex:1 1 auto;width:100%;max-width:100%;max-height:calc(var(--ep-buttons-height, 40px) - 8px);min-height:0}.ep-mock-panel__strip-icon ::ng-deep .ep-mark{height:100%;max-height:calc(var(--ep-buttons-height, 40px) - 8px)}.ep-mock-panel__strip-icon ::ng-deep img,.ep-mock-panel__strip-icon ::ng-deep svg{max-height:calc(var(--ep-buttons-height, 40px) - 8px);width:auto}.ep-mock-panel__spinner{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:ep-spin .6s linear infinite}@keyframes ep-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.ep-mock-panel__spinner{animation:none;border-right-color:currentColor;opacity:.7}.ep-mock-panel__strip{transition:none}}\n"], dependencies: [{ kind: "component", type: PaymentMethodIconComponent, selector: "easy-payment-method-icon", inputs: ["method", "theme"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: MockMethodPanelComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-mock-method-panel', standalone: true, imports: [PaymentMethodIconComponent], template: `
    @if (presentation() === 'strip') {
      <button
        type="button"
        class="ep-mock-panel__strip"
        [disabled]="loading()"
        [attr.aria-busy]="loading()"
        [attr.aria-label]="stripAriaLabel()"
        data-testid="easy-mock-strip-button"
        (click)="pay.emit()"
      >
        <span class="ep-mock-panel__strip-icon" aria-hidden="true">
          <easy-payment-method-icon [method]="method()" [theme]="theme()" />
        </span>
        @if (loading()) {
          <span class="ep-mock-panel__spinner" aria-hidden="true"></span>
        }
      </button>
    } @else if (presentation() === 'expand') {
      <div class="ep-mock-panel ep-mock-panel--expand">
        <button
          type="button"
          class="ep-mock-panel__cta"
          [disabled]="loading()"
          [attr.aria-busy]="loading()"
          [attr.aria-label]="expandAriaLabel()"
          (click)="pay.emit()"
        >
          @if (loading()) {
            <span class="ep-mock-panel__spinner" aria-hidden="true"></span>
            {{ msgs().processingPayment }}
          } @else {
            {{ expandLabel() }}
          }
        </button>
      </div>
    } @else {
      <div class="ep-mock-panel">
        <div class="ep-mock-panel__header">
          <easy-payment-method-icon [method]="method()" [theme]="theme()" />
          <div>
            <h3 class="ep-mock-panel__title">{{ title() }}</h3>
            @if (isMock()) {
              <p class="ep-mock-panel__hint">{{ msgs().demoCheckoutHint }}</p>
            } @else {
              <p class="ep-mock-panel__hint">{{ msgs().continuePaymentHint }}</p>
            }
          </div>
        </div>

        <button
          type="button"
          class="ep-mock-panel__cta"
          [disabled]="loading()"
          [attr.aria-busy]="loading()"
          [attr.aria-label]="ctaAriaLabel()"
          (click)="pay.emit()"
        >
          @if (loading()) {
            <span class="ep-mock-panel__spinner" aria-hidden="true"></span>
            {{ msgs().processingPayment }}
          } @else {
            {{ payLabel() }}
          }
        </button>
      </div>
    }
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;box-sizing:border-box;font-family:var(--ep-font-family, inherit)}.ep-mock-panel{display:flex;flex-direction:column;gap:16px}.ep-mock-panel--expand{gap:10px}.ep-mock-panel__header{display:flex;align-items:center;gap:12px}.ep-mock-panel__title{margin:0;font-size:1rem;font-weight:650;color:var(--ep-text, #0f172a)}.ep-mock-panel__hint{margin:4px 0 0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-mock-panel--expand .ep-mock-panel__hint{margin:0}.ep-mock-panel__cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;width:100%;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-mock-panel__cta:hover:not(:disabled){background:var(--ep-cta-bg-hover, #1e293b)}.ep-mock-panel__cta:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-mock-panel__cta:disabled{opacity:.6;cursor:not-allowed}.ep-mock-panel__strip{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;width:var(--ep-buttons-width, 100%);max-width:100%;min-width:var(--ep-buttons-min-width, 100px);height:var(--ep-buttons-height, 40px);min-height:var(--ep-buttons-height, 40px);padding:0 12px;border:var(--ep-buttons-border-width, 1px) solid var(--ep-buttons-border-color, var(--ep-border, #e2e8f0));border-radius:var(--ep-buttons-radius, var(--ep-radius-md, 10px));background:var(--ep-surface, #fff);color:var(--ep-text, #0f172a);font:inherit;cursor:pointer;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}.ep-mock-panel__strip:hover:not(:disabled){border-color:var(--ep-border-strong, #cbd5e1)}.ep-mock-panel__strip:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-mock-panel__strip:disabled{opacity:.55;cursor:not-allowed}.ep-mock-panel__strip-icon{display:inline-flex;align-items:center;justify-content:center;flex:1 1 auto;width:100%;max-width:100%;max-height:calc(var(--ep-buttons-height, 40px) - 8px);min-height:0}.ep-mock-panel__strip-icon ::ng-deep .ep-mark{height:100%;max-height:calc(var(--ep-buttons-height, 40px) - 8px)}.ep-mock-panel__strip-icon ::ng-deep img,.ep-mock-panel__strip-icon ::ng-deep svg{max-height:calc(var(--ep-buttons-height, 40px) - 8px);width:auto}.ep-mock-panel__spinner{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:ep-spin .6s linear infinite}@keyframes ep-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.ep-mock-panel__spinner{animation:none;border-right-color:currentColor;opacity:.7}.ep-mock-panel__strip{transition:none}}\n"] }]
        }], propDecorators: { method: [{ type: i0.Input, args: [{ isSignal: true, alias: "method", required: true }] }], product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }], isMock: [{ type: i0.Input, args: [{ isSignal: true, alias: "isMock", required: false }] }], loading: [{ type: i0.Input, args: [{ isSignal: true, alias: "loading", required: false }] }], presentation: [{ type: i0.Input, args: [{ isSignal: true, alias: "presentation", required: false }] }], pay: [{ type: i0.Output, args: ["pay"] }] } });

/**
 * Safe, truncated transaction reference for customer UI.
 * Never displays tokens or secrets — only a shortened id when present.
 */
function formatTransactionReference(transactionId) {
    const value = transactionId?.trim();
    if (!value) {
        return null;
    }
    if (value.length <= 8) {
        return value;
    }
    return `••••${value.slice(-4)}`;
}

class CheckoutOutcomeComponent {
    i18n = inject(EasyPaymentsI18nService, { optional: true });
    msgs = computed(() => this.i18n?.messages() ?? EN_TRANSLATIONS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    state = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "state" }] : /* istanbul ignore next */ []));
    product = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    result = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "result" }] : /* istanbul ignore next */ []));
    paymentError = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "paymentError" }] : /* istanbul ignore next */ []));
    action = output();
    heading = viewChild('heading', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "heading" }] : /* istanbul ignore next */ []));
    constructor() {
        effect(() => {
            // Re-focus the heading whenever the outcome state changes.
            void this.state();
            queueMicrotask(() => this.heading()?.nativeElement.focus());
        });
    }
    title = computed(() => {
        const copy = this.msgs();
        switch (this.state()) {
            case 'processing':
                return copy.processingTitle;
            case 'success':
                return copy.successTitle;
            case 'error':
                return copy.errorTitle;
            case 'cancelled':
                return copy.cancelledTitle;
        }
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "title" }] : /* istanbul ignore next */ []));
    body = computed(() => {
        const copy = this.msgs();
        switch (this.state()) {
            case 'processing':
                return copy.processingHint;
            case 'success':
                return copy.successBody;
            case 'error':
                return copy.errorBody;
            case 'cancelled':
                return copy.cancelledBody;
        }
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "body" }] : /* istanbul ignore next */ []));
    actionLabel = computed(() => {
        const copy = this.msgs();
        switch (this.state()) {
            case 'success':
                return copy.successContinue;
            case 'error':
                return copy.errorTryAgain;
            case 'cancelled':
                return copy.cancelledReturn;
            default:
                return '';
        }
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "actionLabel" }] : /* istanbul ignore next */ []));
    methodLabel = computed(() => {
        const method = this.result()?.method;
        if (!method) {
            return null;
        }
        if (method === 'card') {
            return this.msgs().methodCard;
        }
        return PAYMENT_METHOD_LABELS[method];
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "methodLabel" }] : /* istanbul ignore next */ []));
    transactionRef = computed(() => formatTransactionReference(this.result()?.transactionId), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "transactionRef" }] : /* istanbul ignore next */ []));
    totalLabel = computed(() => {
        const item = this.product();
        if (!item) {
            return '';
        }
        const amount = this.i18n
            ? this.i18n.formatMoney(item.amount, item.currency, item.quantity ?? 1)
            : formatMoney(item.amount, item.currency, item.quantity ?? 1, 'en');
        return `${amount} ${item.currency.trim().toUpperCase()}`;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "totalLabel" }] : /* istanbul ignore next */ []));
    safeErrorMessage = computed(() => {
        if (this.state() !== 'error') {
            return null;
        }
        const code = this.paymentError()?.code;
        if (!code) {
            return null;
        }
        const localized = localizePaymentError(code, this.msgs());
        // Avoid repeating the same sentence as the generic error body.
        if (localized === this.msgs().errorBody) {
            return null;
        }
        return localized;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "safeErrorMessage" }] : /* istanbul ignore next */ []));
    onAction() {
        this.action.emit();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutOutcomeComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: CheckoutOutcomeComponent, isStandalone: true, selector: "easy-checkout-outcome", inputs: { state: { classPropertyName: "state", publicName: "state", isSignal: true, isRequired: true, transformFunction: null }, product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: false, transformFunction: null }, result: { classPropertyName: "result", publicName: "result", isSignal: true, isRequired: false, transformFunction: null }, paymentError: { classPropertyName: "paymentError", publicName: "paymentError", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { action: "action" }, viewQueries: [{ propertyName: "heading", first: true, predicate: ["heading"], descendants: true, isSignal: true }], ngImport: i0, template: `
    <div
      class="ep-outcome"
      [attr.data-state]="state()"
      [attr.aria-live]="state() === 'processing' ? 'assertive' : 'polite'"
      role="status"
    >
      <div class="ep-outcome__icon" aria-hidden="true">
        @switch (state()) {
          @case ('processing') {
            <span class="ep-outcome__spinner"></span>
          }
          @case ('success') {
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" />
              <path
                d="M14 24.5 20.5 31 34 17"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
          @case ('error') {
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" />
              <path
                d="M24 14v14M24 34h.01"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
          }
          @case ('cancelled') {
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" />
              <path
                d="M16 24h16"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
          }
        }
      </div>

      <h2 #heading class="ep-outcome__title" tabindex="-1">{{ title() }}</h2>
      <p class="ep-outcome__body">{{ body() }}</p>

      @if (state() === 'success' && product(); as item) {
        <p class="ep-outcome__product">{{ item.name }}</p>
        <dl class="ep-outcome__details">
          <div class="ep-outcome__row">
            <dt>{{ msgs().successTotal }}</dt>
            <dd>{{ totalLabel() }}</dd>
          </div>
          @if (methodLabel()) {
            <div class="ep-outcome__row">
              <dt>{{ msgs().successPaidWith }}</dt>
              <dd>{{ methodLabel() }}</dd>
            </div>
          }
          @if (transactionRef()) {
            <div class="ep-outcome__row">
              <dt>{{ msgs().successTransaction }}</dt>
              <dd class="ep-outcome__mono">{{ transactionRef() }}</dd>
            </div>
          }
        </dl>
      }

      @if (state() === 'error' && safeErrorMessage()) {
        <p class="ep-outcome__detail-message">{{ safeErrorMessage() }}</p>
      }

      @if (state() !== 'processing') {
        <button type="button" class="ep-outcome__action" (click)="onAction()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `, isInline: true, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-outcome{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:12px 4px 4px;animation:ep-outcome-in .18s ease-out}.ep-outcome__icon{display:inline-flex;color:var(--ep-text-secondary, #64748b);margin-bottom:4px}.ep-outcome[data-state=success] .ep-outcome__icon{color:var(--ep-success, #15803d)}.ep-outcome[data-state=error] .ep-outcome__icon{color:var(--ep-danger, #b91c1c)}.ep-outcome[data-state=cancelled] .ep-outcome__icon{color:var(--ep-text-secondary, #64748b)}.ep-outcome[data-state=processing] .ep-outcome__icon{color:var(--ep-accent, #2563eb)}.ep-outcome__spinner{width:40px;height:40px;border-radius:50%;border:3px solid var(--ep-border, #e2e8f0);border-top-color:var(--ep-accent, #2563eb);animation:ep-spin .8s linear infinite}.ep-outcome__title{margin:0;font-size:1.25rem;font-weight:700;letter-spacing:-.02em;color:var(--ep-text, #0f172a)}.ep-outcome__title:focus{outline:none}.ep-outcome__title:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px}.ep-outcome__body{margin:0;max-width:28rem;font-size:14px;line-height:1.45;color:var(--ep-text-secondary, #64748b)}.ep-outcome__product{margin:4px 0 0;font-size:15px;font-weight:650;color:var(--ep-text, #0f172a)}.ep-outcome__details{width:100%;margin:8px 0 0;padding:12px 14px;border:1px solid var(--ep-border, #e2e8f0);border-radius:var(--ep-radius-md, 10px);background:var(--ep-surface-muted, #f8fafc);text-align:left}.ep-outcome__row{display:flex;justify-content:space-between;gap:12px;padding:6px 0}.ep-outcome__row+.ep-outcome__row{border-top:1px solid var(--ep-border, #e2e8f0)}.ep-outcome__row dt{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-outcome__row dd{margin:0;font-size:13px;font-weight:600;color:var(--ep-text, #0f172a);text-align:right;overflow-wrap:anywhere}.ep-outcome__mono{font-variant-numeric:tabular-nums;letter-spacing:.02em}.ep-outcome__detail-message{margin:0;max-width:28rem;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-outcome__action{margin-top:8px;min-height:48px;min-width:160px;padding:0 20px;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-outcome__action:hover{background:var(--ep-cta-bg-hover, #1e293b)}.ep-outcome__action:focus-visible{box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent);outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px}@keyframes ep-spin{to{transform:rotate(360deg)}}@keyframes ep-outcome-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.ep-outcome,.ep-outcome__spinner{animation:none}}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: CheckoutOutcomeComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-checkout-outcome', standalone: true, template: `
    <div
      class="ep-outcome"
      [attr.data-state]="state()"
      [attr.aria-live]="state() === 'processing' ? 'assertive' : 'polite'"
      role="status"
    >
      <div class="ep-outcome__icon" aria-hidden="true">
        @switch (state()) {
          @case ('processing') {
            <span class="ep-outcome__spinner"></span>
          }
          @case ('success') {
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" />
              <path
                d="M14 24.5 20.5 31 34 17"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
          @case ('error') {
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" />
              <path
                d="M24 14v14M24 34h.01"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
          }
          @case ('cancelled') {
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" />
              <path
                d="M16 24h16"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
          }
        }
      </div>

      <h2 #heading class="ep-outcome__title" tabindex="-1">{{ title() }}</h2>
      <p class="ep-outcome__body">{{ body() }}</p>

      @if (state() === 'success' && product(); as item) {
        <p class="ep-outcome__product">{{ item.name }}</p>
        <dl class="ep-outcome__details">
          <div class="ep-outcome__row">
            <dt>{{ msgs().successTotal }}</dt>
            <dd>{{ totalLabel() }}</dd>
          </div>
          @if (methodLabel()) {
            <div class="ep-outcome__row">
              <dt>{{ msgs().successPaidWith }}</dt>
              <dd>{{ methodLabel() }}</dd>
            </div>
          }
          @if (transactionRef()) {
            <div class="ep-outcome__row">
              <dt>{{ msgs().successTransaction }}</dt>
              <dd class="ep-outcome__mono">{{ transactionRef() }}</dd>
            </div>
          }
        </dl>
      }

      @if (state() === 'error' && safeErrorMessage()) {
        <p class="ep-outcome__detail-message">{{ safeErrorMessage() }}</p>
      }

      @if (state() !== 'processing') {
        <button type="button" class="ep-outcome__action" (click)="onAction()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;font-family:var(--ep-font-family, inherit)}.ep-outcome{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:12px 4px 4px;animation:ep-outcome-in .18s ease-out}.ep-outcome__icon{display:inline-flex;color:var(--ep-text-secondary, #64748b);margin-bottom:4px}.ep-outcome[data-state=success] .ep-outcome__icon{color:var(--ep-success, #15803d)}.ep-outcome[data-state=error] .ep-outcome__icon{color:var(--ep-danger, #b91c1c)}.ep-outcome[data-state=cancelled] .ep-outcome__icon{color:var(--ep-text-secondary, #64748b)}.ep-outcome[data-state=processing] .ep-outcome__icon{color:var(--ep-accent, #2563eb)}.ep-outcome__spinner{width:40px;height:40px;border-radius:50%;border:3px solid var(--ep-border, #e2e8f0);border-top-color:var(--ep-accent, #2563eb);animation:ep-spin .8s linear infinite}.ep-outcome__title{margin:0;font-size:1.25rem;font-weight:700;letter-spacing:-.02em;color:var(--ep-text, #0f172a)}.ep-outcome__title:focus{outline:none}.ep-outcome__title:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px}.ep-outcome__body{margin:0;max-width:28rem;font-size:14px;line-height:1.45;color:var(--ep-text-secondary, #64748b)}.ep-outcome__product{margin:4px 0 0;font-size:15px;font-weight:650;color:var(--ep-text, #0f172a)}.ep-outcome__details{width:100%;margin:8px 0 0;padding:12px 14px;border:1px solid var(--ep-border, #e2e8f0);border-radius:var(--ep-radius-md, 10px);background:var(--ep-surface-muted, #f8fafc);text-align:left}.ep-outcome__row{display:flex;justify-content:space-between;gap:12px;padding:6px 0}.ep-outcome__row+.ep-outcome__row{border-top:1px solid var(--ep-border, #e2e8f0)}.ep-outcome__row dt{margin:0;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-outcome__row dd{margin:0;font-size:13px;font-weight:600;color:var(--ep-text, #0f172a);text-align:right;overflow-wrap:anywhere}.ep-outcome__mono{font-variant-numeric:tabular-nums;letter-spacing:.02em}.ep-outcome__detail-message{margin:0;max-width:28rem;font-size:13px;color:var(--ep-text-secondary, #64748b)}.ep-outcome__action{margin-top:8px;min-height:48px;min-width:160px;padding:0 20px;border:0;border-radius:var(--ep-radius-md, 10px);background:var(--ep-cta-bg, #0f172a);color:var(--ep-cta-text, #f8fafc);font:inherit;font-size:15px;font-weight:650;cursor:pointer}.ep-outcome__action:hover{background:var(--ep-cta-bg-hover, #1e293b)}.ep-outcome__action:focus-visible{box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent);outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px}@keyframes ep-spin{to{transform:rotate(360deg)}}@keyframes ep-outcome-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.ep-outcome,.ep-outcome__spinner{animation:none}}\n"] }]
        }], ctorParameters: () => [], propDecorators: { state: [{ type: i0.Input, args: [{ isSignal: true, alias: "state", required: true }] }], product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: false }] }], result: [{ type: i0.Input, args: [{ isSignal: true, alias: "result", required: false }] }], paymentError: [{ type: i0.Input, args: [{ isSignal: true, alias: "paymentError", required: false }] }], action: [{ type: i0.Output, args: ["action"] }], heading: [{ type: i0.ViewChild, args: ['heading', { isSignal: true }] }] } });

/**
 * Checkout width limits for the embeddable <easy-payments> component.
 *
 * Consumers control overall checkout size via [maxWidth].
 * The library clamps to these bounds and decides internal grid columns
 * from the component's own container width (not the viewport).
 */
const MIN_CHECKOUT_WIDTH = 320;
const DEFAULT_CHECKOUT_MAX_WIDTH = 640;
const MAX_CHECKOUT_WIDTH = 1200;
/**
 * Internal planning constant for payment tiles (not a public API).
 * Used to reason about container-query breakpoints; tiles remain equal-width
 * within each row via CSS Grid.
 */
const MIN_PAYMENT_TILE_WIDTH = 112;
/**
 * Normalize a consumer [maxWidth] value into a safe pixel max-width.
 * Invalid / missing values fall back to the default.
 */
function resolveCheckoutMaxWidth(value) {
    if (value === null || value === undefined || value === '') {
        return DEFAULT_CHECKOUT_MAX_WIDTH;
    }
    const numeric = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return DEFAULT_CHECKOUT_MAX_WIDTH;
    }
    return Math.min(MAX_CHECKOUT_WIDTH, Math.max(MIN_CHECKOUT_WIDTH, Math.round(numeric)));
}

class EasyPaymentsComponent {
    orchestrator = inject(PaymentOrchestratorService);
    themeService = inject(ThemeService);
    stripeRedirectRecovery = inject(StripeRedirectRecoveryService);
    applePayAdapter = inject(ApplePayAdapter);
    i18n = inject(EasyPaymentsI18nService);
    destroyRef = inject(DestroyRef);
    ngZone = inject(NgZone);
    hostContext = inject(CheckoutHostContext);
    pendingTasks = inject(PendingTasks);
    destroyed = false;
    /** True while this component owns the availability ECE mount (Minimal-style host). */
    applePayBootstrapOwned = false;
    applePayBootstrapGeneration = 0;
    /**
     * Instance-local availability. Updated from orchestrator.refreshAvailability
     * return values; stale async completions are ignored via generation counter.
     */
    availabilitySession = new CheckoutAvailabilitySession();
    availabilityGeneration = 0;
    /** Per-instance contrast warning dedupe (dev console only; never buyer-facing). */
    contrastWarnings = new VisualStyleContrastWarningTracker();
    applePayBootstrapHost = viewChild('applePayBootstrapHost', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "applePayBootstrapHost" }] : /* istanbul ignore next */ []));
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    methods = input(['apple-pay', 'google-pay', 'paypal', 'card'], /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "methods" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    /**
     * Optional stable id for this checkout host on pages with several instances.
     * Used to attribute Stripe Klarna/Affirm redirect returns after reload or reorder.
     * Omit on single-host pages. Values: 1–64 chars `[a-zA-Z0-9_.:-]`.
     */
    checkoutInstanceId = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "checkoutInstanceId" }] : /* istanbul ignore next */ []));
    theme = input('system', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    /**
     * Outer shell style. `default` draws the built-in card chrome;
     * `transparent` removes it so a merchant parent background shows through.
     */
    appearance = input('default', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "appearance" }] : /* istanbul ignore next */ []));
    /**
     * Optional Easy Payments–owned visual overrides (font, text/surface colors,
     * accent, radius, spacing). Independent of `theme` and `appearance`.
     * Invalid or omitted fields leave built-in tokens unchanged. Does not restyle
     * official provider SDK buttons or marks.
     */
    visualStyle = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "visualStyle" }] : /* istanbul ignore next */ []));
    /**
     * Optional Easy Payments–owned Stripe Card confirmation CTA presentation
     * (label, colors, typography, border, size, hover/disabled/loading/focus).
     * Does not restyle the Stripe Payment Element iframe or other providers.
     */
    cardButtonAppearance = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "cardButtonAppearance" }] : /* istanbul ignore next */ []));
    /**
     * Maximum checkout width in pixels. The component stays fluid (`width: 100%`)
     * up to this cap. Values are clamped to library-safe limits (320–1200).
     * Defaults to 640.
     */
    maxWidth = input(DEFAULT_CHECKOUT_MAX_WIDTH, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "maxWidth" }] : /* istanbul ignore next */ []));
    /**
     * Built-in confirmation UI after success. Defaults to confirmation.
     * Can also be set via checkout.successBehavior.
     */
    successBehavior = input('confirmation', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "successBehavior" }] : /* istanbul ignore next */ []));
    /**
     * UI locale. `auto` detects from the browser (es-*, pt-*, en-* → matching base;
     * anything else → English). Defaults to `auto`.
     */
    locale = input('auto', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "locale" }] : /* istanbul ignore next */ []));
    /**
     * Partial overrides for Easy Payments-owned UI text.
     * Priority: override → effective locale dictionary → English.
     */
    translations = input({}, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "translations" }] : /* istanbul ignore next */ []));
    success = output();
    cancel = output();
    error = output();
    /**
     * Fired when a PaymentIntent is still `processing` (not yet succeeded or failed).
     * Not a success and not a definitive failure. Do not retry; await backend/webhook.
     */
    pending = output();
    /** Fired when the customer clicks Continue on the built-in success screen. */
    successContinue = output();
    /**
     * Fired once when a payment attempt begins.
     * Selecting a method tile does not start an attempt.
     */
    started = output();
    /** Fired when the selected method changes, including when it becomes unavailable. */
    methodChange = output();
    effectiveLocale = this.i18n.effectiveLocale;
    checkoutAriaLabel = computed(() => this.i18n.messages().checkoutAriaLabel, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "checkoutAriaLabel" }] : /* istanbul ignore next */ []));
    paymentMethodSelectionAria = computed(() => this.i18n.messages().paymentMethodSelectionAria, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "paymentMethodSelectionAria" }] : /* istanbul ignore next */ []));
    checkoutTitle = computed(() => this.i18n.messages().checkoutTitle, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "checkoutTitle" }] : /* istanbul ignore next */ []));
    checkoutSubtitle = computed(() => this.i18n.messages().checkoutSubtitle, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "checkoutSubtitle" }] : /* istanbul ignore next */ []));
    noPaymentMethodsAvailable = computed(() => this.i18n.messages().noPaymentMethodsAvailable, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "noPaymentMethodsAvailable" }] : /* istanbul ignore next */ []));
    resolvedTheme = this.themeService.resolvedTheme;
    /** Per-instance readiness — not the root orchestrator snapshot. */
    availableMethods = this.availabilitySession.availableMethods;
    loading = this.orchestrator.loading;
    /** Clamped max-width applied to the host (and used by container queries). */
    effectiveMaxWidth = computed(() => resolveCheckoutMaxWidth(this.maxWidth()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "effectiveMaxWidth" }] : /* istanbul ignore next */ []));
    checkoutMaxWidthCss = computed(() => `${this.effectiveMaxWidth()}px`, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "checkoutMaxWidthCss" }] : /* istanbul ignore next */ []));
    /** Sanitized host CSS variable overrides from `[visualStyle]` (null = use SCSS defaults). */
    visualStyleCssVars = computed(() => resolveVisualStyleCssVars(this.visualStyle()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "visualStyleCssVars" }] : /* istanbul ignore next */ []));
    selectedMethod = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectedMethod" }] : /* istanbul ignore next */ []));
    processingMethod = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "processingMethod" }] : /* istanbul ignore next */ []));
    /** Real provider is mid-flow (3DS / PayPal approval / Google Pay sheet). */
    providerBusy = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "providerBusy" }] : /* istanbul ignore next */ []));
    viewState = signal('checkout', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "viewState" }] : /* istanbul ignore next */ []));
    lastResult = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "lastResult" }] : /* istanbul ignore next */ []));
    lastError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "lastError" }] : /* istanbul ignore next */ []));
    /** Bumped on reset so real provider panels remount with a fresh session. */
    providerMountKey = signal(0, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "providerMountKey" }] : /* istanbul ignore next */ []));
    /** Prevents duplicate Stripe BNPL return recovery / success emits on one page load. */
    stripeReturnRecoveryStarted = false;
    /** Method of a Stripe BNPL return seen at construction, until ownership is claimed. */
    stripeReturnMethod = null;
    stripeReturnClaimed = false;
    /** Re-runs default method selection after a non-owned return releases this host. */
    selectionRefresh = signal(0, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectionRefresh" }] : /* istanbul ignore next */ []));
    terminalSuccessEmitted = false;
    /** One in-flight attempt. `settled` drops duplicate terminal callbacks until the next attempt. */
    paymentAttempt = 'idle';
    /** Terminal/mock-processing screens that replace the checkout form. */
    showOutcome = computed(() => {
        const state = this.viewState();
        return state === 'success' || state === 'error' || state === 'cancelled' || state === 'processing';
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showOutcome" }] : /* istanbul ignore next */ []));
    showCheckoutForm = computed(() => !this.showOutcome(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showCheckoutForm" }] : /* istanbul ignore next */ []));
    methodsLocked = computed(() => this.showOutcome() || this.providerBusy() || this.processingMethod() !== null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "methodsLocked" }] : /* istanbul ignore next */ []));
    resolvedSuccessBehavior = computed(() => {
        return this.checkout()?.successBehavior ?? this.successBehavior();
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "resolvedSuccessBehavior" }] : /* istanbul ignore next */ []));
    outcomeState = computed(() => {
        const state = this.viewState();
        if (state === 'checkout') {
            return 'processing';
        }
        return state;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "outcomeState" }] : /* istanbul ignore next */ []));
    visibleMethods = computed(() => {
        const requested = this.methods();
        const availability = this.availableMethods();
        return requested
            .map((method) => availability.find((a) => a.method === method))
            .filter((entry) => !!entry && entry.available);
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "visibleMethods" }] : /* istanbul ignore next */ []));
    selectedEntry = computed(() => {
        const selected = this.selectedMethod();
        if (!selected) {
            return null;
        }
        return this.visibleMethods().find((entry) => entry.method === selected) ?? null;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectedEntry" }] : /* istanbul ignore next */ []));
    hasRealCardMethod = computed(() => this.visibleMethods().some((entry) => entry.method === 'card' && !entry.isMock), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasRealCardMethod" }] : /* istanbul ignore next */ []));
    hasRealPayPalMethod = computed(() => this.visibleMethods().some((entry) => entry.method === 'paypal' && !entry.isMock), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasRealPayPalMethod" }] : /* istanbul ignore next */ []));
    hasRealGooglePayMethod = computed(() => this.visibleMethods().some((entry) => entry.method === 'google-pay' && !entry.isMock), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasRealGooglePayMethod" }] : /* istanbul ignore next */ []));
    hasRealApplePayMethod = computed(() => this.visibleMethods().some((entry) => entry.method === 'apple-pay' && !entry.isMock), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasRealApplePayMethod" }] : /* istanbul ignore next */ []));
    hasRealKlarnaMethod = computed(() => this.visibleMethods().some((entry) => entry.method === 'klarna' && !entry.isMock), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasRealKlarnaMethod" }] : /* istanbul ignore next */ []));
    hasRealAffirmMethod = computed(() => this.visibleMethods().some((entry) => entry.method === 'affirm' && !entry.isMock), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasRealAffirmMethod" }] : /* istanbul ignore next */ []));
    showMockPanel = computed(() => {
        if (!this.showCheckoutForm()) {
            return false;
        }
        const entry = this.selectedEntry();
        if (!entry) {
            return false;
        }
        if (entry.method === 'card' && !entry.isMock) {
            return false;
        }
        if (entry.method === 'paypal' && !entry.isMock) {
            return false;
        }
        if (entry.method === 'google-pay' && !entry.isMock) {
            return false;
        }
        if (entry.method === 'apple-pay' && !entry.isMock) {
            return false;
        }
        if (entry.method === 'klarna' && !entry.isMock) {
            return false;
        }
        if (entry.method === 'affirm' && !entry.isMock) {
            return false;
        }
        return true;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showMockPanel" }] : /* istanbul ignore next */ []));
    showStripePanel = computed(() => this.hasRealCardMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showStripePanel" }] : /* istanbul ignore next */ []));
    showPayPalPanel = computed(() => this.hasRealPayPalMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showPayPalPanel" }] : /* istanbul ignore next */ []));
    showGooglePayPanel = computed(() => this.hasRealGooglePayMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showGooglePayPanel" }] : /* istanbul ignore next */ []));
    /**
     * Dedicated Minimal-ECE-style host: mounts while Apple Pay availability is unknown.
     * Independent of tile/panel visibility so Stripe can fire `ready` on iOS Safari.
     */
    showApplePayBootstrap = computed(() => {
        if (!this.methods().includes('apple-pay')) {
            return false;
        }
        // Reactive — recomputes when ApplePayAdapter finishes initialize().
        if (!this.applePayAdapter.configured()) {
            return false;
        }
        const entry = this.availableMethods().find((e) => e.method === 'apple-pay');
        if (entry?.isMock) {
            return false;
        }
        if (entry?.available === true || entry?.status === 'available') {
            return false;
        }
        // Only stop after Stripe ready said applePay is not available (or load error).
        if (entry?.status === 'unavailable' || entry?.status === 'error') {
            return false;
        }
        return true;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showApplePayBootstrap" }] : /* istanbul ignore next */ []));
    /**
     * Payment panel after Stripe reports Apple Pay available.
     * Only mount when selected so ECE is not remounted into a clipped inactive panel.
     */
    /**
     * Real Apple Pay renders Stripe's own button inside the methods list, so it is an
     * express action rather than a selectable tile. Mock Apple Pay keeps the tile + panel.
     */
    applePayExpressInList = computed(() => this.hasRealApplePayMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "applePayExpressInList" }] : /* istanbul ignore next */ []));
    showApplePayPanel = computed(() => this.showCheckoutForm() &&
        this.hasRealApplePayMethod() &&
        !this.applePayExpressInList() &&
        this.selectedMethod() === 'apple-pay', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showApplePayPanel" }] : /* istanbul ignore next */ []));
    showKlarnaPanel = computed(() => this.hasRealKlarnaMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showKlarnaPanel" }] : /* istanbul ignore next */ []));
    showAffirmPanel = computed(() => this.hasRealAffirmMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showAffirmPanel" }] : /* istanbul ignore next */ []));
    /**
     * Keep the active real-provider panel interactive while its own UI is needed
     * (including during providerBusy / 3DS / sheets). Clip only when another method
     * is selected or a terminal/mock-processing outcome replaced the form.
     */
    stripePanelActive = computed(() => this.showCheckoutForm() &&
        this.selectedMethod() === 'card' &&
        this.hasRealCardMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "stripePanelActive" }] : /* istanbul ignore next */ []));
    paypalPanelActive = computed(() => this.showCheckoutForm() &&
        this.selectedMethod() === 'paypal' &&
        this.hasRealPayPalMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "paypalPanelActive" }] : /* istanbul ignore next */ []));
    googlePayPanelActive = computed(() => this.showCheckoutForm() &&
        this.selectedMethod() === 'google-pay' &&
        this.hasRealGooglePayMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "googlePayPanelActive" }] : /* istanbul ignore next */ []));
    applePayPanelActive = computed(() => this.showCheckoutForm() &&
        this.selectedMethod() === 'apple-pay' &&
        this.hasRealApplePayMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "applePayPanelActive" }] : /* istanbul ignore next */ []));
    klarnaPanelActive = computed(() => this.showCheckoutForm() &&
        this.selectedMethod() === 'klarna' &&
        this.hasRealKlarnaMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "klarnaPanelActive" }] : /* istanbul ignore next */ []));
    affirmPanelActive = computed(() => this.showCheckoutForm() &&
        this.selectedMethod() === 'affirm' &&
        this.hasRealAffirmMethod(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "affirmPanelActive" }] : /* istanbul ignore next */ []));
    constructor() {
        // Stripe ECE `ready` often fires outside NgZone — re-enter so tile filtering updates.
        // One listener per host, so concurrent checkouts each refresh their own tiles.
        const removeApplePayListener = this.applePayAdapter.addAvailabilityListener(() => {
            this.ngZone.run(() => {
                if (this.destroyed) {
                    return;
                }
                const product = untracked(() => this.product());
                const methods = untracked(() => this.methods());
                const checkout = untracked(() => this.checkout());
                void this.refreshInstanceAvailability(methods, product, checkout, this.resolvedTheme()).catch(() => {
                    // Availability refresh errors are non-fatal for checkout UI.
                });
            });
        });
        this.destroyRef.onDestroy(() => {
            this.destroyed = true;
            removeApplePayListener();
        });
        // Avoid flashing fresh checkout when Stripe redirects back from Klarna/Affirm.
        // Recovery is owned by exactly one host on the page (decided by the recovery
        // service), so Processing always resolves even if the panel has not mounted yet.
        if (typeof window !== 'undefined' && isStripeReturnAttempt()) {
            const method = detectStripeReturnMethod() ?? 'klarna';
            this.stripeReturnMethod = method;
            this.hostContext.setReturnPhase('pending', method);
            this.viewState.set('processing');
            this.updateSelectedMethod(method);
            this.providerBusy.set(true);
        }
        effect(() => {
            const product = this.product();
            const methods = this.methods();
            const checkoutInstanceId = this.checkoutInstanceId();
            untracked(() => {
                this.hostContext.setCheckoutInstanceId(checkoutInstanceId);
                this.hostContext.setProductId(product.id);
                this.claimStripeReturnOnce(methods);
            });
        });
        effect(() => {
            this.themeService.setTheme(this.theme());
        });
        // Developer-only contrast diagnostics for EP-owned colors. Never mutates
        // colors, never blocks checkout, never touches provider SDK chrome.
        effect(() => {
            const style = this.visualStyle();
            const appearance = this.appearance();
            const theme = this.resolvedTheme();
            untracked(() => {
                this.contrastWarnings.report(evaluateVisualStyleContrast({ theme, appearance, style }));
            });
        });
        effect(() => {
            this.i18n.setRequestedLocale(this.locale());
            this.i18n.setOverrides(this.translations());
        });
        // Merchant removed apple-pay from allowed methods — drop this checkout's preserved
        // ECE ready state only (sibling hosts keep their own Apple Pay availability).
        let allowedApplePay = false;
        effect(() => {
            const allowsApplePay = this.methods().includes('apple-pay');
            if (allowedApplePay && !allowsApplePay) {
                const product = untracked(() => this.product());
                untracked(() => this.applePayAdapter.clearAvailability(product));
            }
            allowedApplePay = allowsApplePay;
        });
        effect(() => {
            const product = this.product();
            const methods = this.methods();
            const checkout = this.checkout();
            const theme = this.resolvedTheme();
            untracked(() => {
                void this.refreshInstanceAvailability(methods, product, checkout, theme).catch((err) => {
                    // Config/availability errors emit only — do not take over the checkout UI.
                    this.error.emit(normalizeError(err));
                });
            });
        });
        effect(() => {
            this.selectionRefresh();
            const express = this.applePayExpressInList();
            // Express methods own their own button and are never the selected tile.
            const visible = this.visibleMethods().filter((entry) => !(express && entry.method === 'apple-pay'));
            const current = untracked(() => this.selectedMethod());
            const state = untracked(() => this.viewState());
            // Do not steal method selection during Stripe BNPL return recovery / outcomes.
            if (state !== 'checkout') {
                return;
            }
            if (visible.length === 0) {
                if (current !== null) {
                    this.updateSelectedMethod(null);
                }
                return;
            }
            if (!current || !visible.some((entry) => entry.method === current)) {
                this.updateSelectedMethod(visible[0].method);
            }
        });
        // Mount Apple Pay ECE once on an in-flow visible host (Minimal ECE parity).
        effect((onCleanup) => {
            const show = this.showApplePayBootstrap();
            const hostRef = this.applePayBootstrapHost();
            const product = this.product();
            if (!show || !hostRef) {
                return;
            }
            // Depend on the value of the session key, never on object identity: a remount
            // before Stripe reports `ready` (~500ms) permanently keeps availability at
            // `checking`, which is exactly what hides the tile.
            const elementsLocale = toStripeElementsLocale(this.i18n.effectiveLocale());
            const sessionKey = appendMetadataSessionPart([product.id, product.quantity ?? 1, product.currency, product.amount, elementsLocale].join('|'), product.metadata);
            const host = hostRef.nativeElement;
            if (this.applePayBootstrapOwned &&
                this.applePayBootstrapSessionKey === sessionKey &&
                this.applePayBootstrapHostElement === host) {
                return;
            }
            const generation = ++this.applePayBootstrapGeneration;
            untracked(() => {
                void this.mountApplePayBootstrap(host, this.product(), this.checkout(), this.resolvedTheme(), generation, sessionKey);
            });
            onCleanup(() => {
                if (generation !== this.applePayBootstrapGeneration) {
                    return;
                }
                if (this.applePayBootstrapOwned) {
                    this.applePayAdapter.unmountExpressCheckout({ preserveAvailability: true });
                    this.applePayBootstrapOwned = false;
                    this.applePayBootstrapSessionKey = null;
                    this.applePayBootstrapHostElement = null;
                }
            });
        });
    }
    /**
     * Minimal-ECE-parity availability mount. Tile appears only after ready + applePay:true.
     */
    applePayBootstrapSessionKey = null;
    applePayBootstrapHostElement = null;
    /**
     * Evaluate availability through the root orchestrator (adapters + global diagnostics
     * projection), then store the returned snapshot on this instance only.
     */
    async refreshInstanceAvailability(methods, product, checkout, theme) {
        const generation = ++this.availabilityGeneration;
        try {
            const results = await this.orchestrator.refreshAvailability(methods, product, checkout, theme);
            if (this.destroyed || generation !== this.availabilityGeneration) {
                return results;
            }
            this.availabilitySession.apply(results);
            return results;
        }
        catch (error) {
            if (!this.destroyed && generation === this.availabilityGeneration) {
                // Keep prior tiles if any; do not clear on transient failures.
            }
            throw error;
        }
    }
    async mountApplePayBootstrap(host, product, checkout, theme, generation, sessionKey) {
        try {
            this.applePayBootstrapOwned = true;
            this.applePayBootstrapSessionKey = sessionKey;
            this.applePayBootstrapHostElement = host;
            await this.applePayAdapter.mountExpressCheckout(host, {
                product,
                checkout,
                theme,
                locale: toStripeElementsLocale(this.i18n.effectiveLocale()),
                onSuccess: () => undefined,
                onCancel: () => undefined,
                onError: () => undefined,
                onAttempt: () => this.onPaymentStarted('apple-pay'),
            });
            if (this.destroyed || generation !== this.applePayBootstrapGeneration) {
                return;
            }
        }
        catch {
            if (generation === this.applePayBootstrapGeneration) {
                this.applePayBootstrapOwned = false;
                this.applePayBootstrapSessionKey = null;
                this.applePayBootstrapHostElement = null;
            }
        }
    }
    claimStripeReturnOnce(methods) {
        const method = this.stripeReturnMethod;
        if (!method || this.stripeReturnClaimed) {
            return;
        }
        this.stripeReturnClaimed = true;
        const done = this.pendingTasks.add();
        void this.stripeRedirectRecovery
            .claimReturn(this.hostContext, methods)
            .then(async (claim) => {
            if (this.destroyed) {
                return;
            }
            if (claim === 'owner') {
                this.hostContext.setReturnPhase('owner', method);
                await this.recoverStripeReturn(method);
            }
            else {
                this.releaseStripeReturn();
            }
        })
            .finally(done);
    }
    /** Another host owns the return (or it was unattributable): show a normal checkout. */
    releaseStripeReturn() {
        this.stripeReturnMethod = null;
        this.hostContext.setReturnPhase('none');
        this.providerBusy.set(false);
        this.viewState.set('checkout');
        // The provisional selection was set before outputs were subscribed; revert it silently
        // and let default selection run as on a fresh load.
        this.selectedMethod.set(null);
        this.selectionRefresh.update((value) => value + 1);
    }
    /**
     * Library-owned Stripe BNPL redirect recovery (Klarna / Affirm). Always leaves
     * processing for a terminal state (success / error / cancelled). Idempotent per page load.
     */
    async recoverStripeReturn(method) {
        if (this.stripeReturnRecoveryStarted) {
            return;
        }
        this.stripeReturnRecoveryStarted = true;
        this.viewState.set('processing');
        this.updateSelectedMethod(method);
        this.providerBusy.set(true);
        const label = method === 'affirm' ? 'Affirm' : 'Klarna';
        try {
            const result = await this.stripeRedirectRecovery.consumeReturn();
            if (this.destroyed) {
                return;
            }
            if (!result) {
                this.handlePaymentError(new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: `${label} return could not be verified.`,
                    method,
                    provider: method,
                }));
                return;
            }
            if (result.status === 'success' || result.status === 'processing') {
                this.handleSuccess(result);
            }
            else if (result.status === 'cancelled') {
                this.handleCancelled(result);
            }
            else {
                this.handlePaymentError(new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: result.message ?? `${label} payment failed.`,
                    method,
                    provider: method,
                }));
            }
        }
        catch (err) {
            if (this.destroyed) {
                return;
            }
            const paymentError = normalizeError(err, { method, provider: method });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.handleCancelled({
                    status: 'cancelled',
                    method,
                    provider: method,
                    message: paymentError.message,
                });
            }
            else {
                this.handlePaymentError(paymentError);
            }
        }
        finally {
            this.stripeReturnMethod = null;
            if (!this.destroyed) {
                this.providerBusy.set(false);
                // After cancel/error the panel may create a fresh PaymentIntent for retry.
                // After success/pending, keep a non-creating phase so panels do not recreate —
                // but do not leave `owner` (which forces Affirm/Klarna into perpetual Processing UI).
                const state = this.viewState();
                if (state === 'success' || this.terminalSuccessEmitted) {
                    this.hostContext.setReturnPhase('settled', method);
                }
                else if (state === 'processing') {
                    this.hostContext.setReturnPhase('awaiting', method);
                }
                else {
                    this.hostContext.setReturnPhase('none');
                }
            }
        }
    }
    selectMethod(method) {
        if (this.methodsLocked()) {
            return;
        }
        if (method === 'apple-pay' && this.applePayExpressInList()) {
            // The express button owns the interaction; there is no tile to select.
            return;
        }
        this.updateSelectedMethod(method);
    }
    isMethodLoading(method) {
        return this.loading() && this.processingMethod() === method;
    }
    onProviderBusy(busy) {
        this.providerBusy.set(busy);
    }
    onStripeSuccess(result) {
        this.handleSuccess(result);
    }
    onStripeCancel(result) {
        this.handleCancelled(result);
    }
    onStripeError(error) {
        this.handlePaymentError(error);
    }
    onPayPalSuccess(result) {
        this.handleSuccess(result);
    }
    onPayPalCancel(result) {
        this.handleCancelled(result);
    }
    onPayPalError(error) {
        this.handlePaymentError(error);
    }
    onGooglePaySuccess(result) {
        this.handleSuccess(result);
    }
    onGooglePayCancel(result) {
        this.handleCancelled(result);
    }
    onGooglePayError(error) {
        this.handlePaymentError(error);
    }
    onApplePaySuccess(result) {
        this.handleSuccess(result);
    }
    onApplePayCancel(result) {
        this.handleCancelled(result);
    }
    onApplePayError(error) {
        this.handlePaymentError(error);
    }
    onKlarnaSuccess(result) {
        // Parent owns redirect recovery; ignore duplicate panel success for the same load.
        if (this.stripeRedirectRecovery.wasReturnConsumed() && this.terminalSuccessEmitted) {
            return;
        }
        this.handleSuccess(result);
    }
    onKlarnaCancel(result) {
        this.handleCancelled(result);
    }
    onKlarnaError(error) {
        this.handlePaymentError(error);
    }
    /**
     * Klarna panel busy/returning signals (in-page confirm). Redirect recovery is
     * owned by recoverStripeReturn() so Processing cannot hang without a panel.
     */
    onKlarnaReturning(active) {
        if (active) {
            this.updateSelectedMethod('klarna');
            if (this.viewState() === 'checkout') {
                this.viewState.set('processing');
            }
            this.providerBusy.set(true);
            return;
        }
        this.providerBusy.set(false);
    }
    onAffirmSuccess(result) {
        if (this.stripeRedirectRecovery.wasReturnConsumed() && this.terminalSuccessEmitted) {
            return;
        }
        this.handleSuccess(result);
    }
    onAffirmCancel(result) {
        this.handleCancelled(result);
    }
    onAffirmError(error) {
        this.handlePaymentError(error);
    }
    onAffirmReturning(active) {
        if (active) {
            this.updateSelectedMethod('affirm');
            if (this.viewState() === 'checkout') {
                this.viewState.set('processing');
            }
            this.providerBusy.set(true);
            return;
        }
        this.providerBusy.set(false);
    }
    async onPay(method) {
        if (this.methodsLocked() || this.processingMethod()) {
            return;
        }
        this.processingMethod.set(method);
        this.viewState.set('processing');
        this.lastError.set(null);
        this.lastResult.set(null);
        this.onPaymentStarted(method);
        try {
            const result = await this.orchestrator.processPayment(method, this.product(), this.checkout());
            if (result.status === 'success' || result.status === 'processing') {
                this.handleSuccess(result);
            }
            else if (result.status === 'cancelled') {
                this.handleCancelled(result);
            }
            else {
                this.handlePaymentError(new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: result.message ?? 'Payment failed.',
                    method,
                    provider: result.provider,
                }));
            }
        }
        catch (err) {
            const paymentError = normalizeError(err, { method });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.handleCancelled({
                    status: 'cancelled',
                    method,
                    provider: paymentError.provider ?? 'stripe',
                    message: paymentError.message,
                });
            }
            else {
                this.handlePaymentError(paymentError);
            }
        }
        finally {
            this.processingMethod.set(null);
        }
    }
    onOutcomeAction() {
        const state = this.viewState();
        if (state === 'success') {
            const result = this.lastResult();
            if (result) {
                this.successContinue.emit(result);
            }
            this.resetCheckoutView();
            return;
        }
        if (state === 'error' || state === 'cancelled') {
            this.resetCheckoutView();
        }
    }
    /** Public helper for hosts (e.g. demo Continue) to restore a fresh checkout UI. */
    resetCheckoutView() {
        this.viewState.set('checkout');
        this.lastResult.set(null);
        this.lastError.set(null);
        this.processingMethod.set(null);
        this.providerBusy.set(false);
        this.terminalSuccessEmitted = false;
        this.paymentAttempt = 'idle';
        this.hostContext.setReturnPhase('none');
        this.providerMountKey.update((value) => value + 1);
    }
    /** Provider panels call this when a real attempt starts. Tile selection does not. */
    onPaymentStarted(method) {
        if (this.destroyed || this.paymentAttempt === 'active') {
            return;
        }
        this.paymentAttempt = 'active';
        const product = this.product();
        this.started.emit({
            method,
            provider: PAYMENT_METHOD_PROVIDER_MAP[method],
            amount: product.amount,
            currency: product.currency,
        });
    }
    updateSelectedMethod(method) {
        const previousMethod = this.selectedMethod();
        if (previousMethod === method) {
            return;
        }
        this.selectedMethod.set(method);
        if (this.destroyed) {
            return;
        }
        this.methodChange.emit({
            method,
            previousMethod,
            provider: method ? PAYMENT_METHOD_PROVIDER_MAP[method] : null,
        });
    }
    /** False when this terminal callback repeats an attempt that already finished. */
    acceptTerminalEvent() {
        if (this.destroyed) {
            return false;
        }
        if (this.paymentAttempt === 'settled') {
            return false;
        }
        if (this.paymentAttempt === 'active') {
            this.paymentAttempt = 'settled';
        }
        return true;
    }
    handleSuccess(result) {
        if (this.destroyed) {
            return;
        }
        if (result.status === 'processing') {
            this.handlePending(result);
            return;
        }
        if (this.terminalSuccessEmitted &&
            (result.method === 'klarna' || result.method === 'affirm')) {
            return;
        }
        if (!this.acceptTerminalEvent()) {
            return;
        }
        if (result.method === 'klarna' || result.method === 'affirm') {
            this.terminalSuccessEmitted = true;
        }
        this.success.emit(result);
        this.lastResult.set(result);
        this.lastError.set(null);
        this.providerBusy.set(false);
        if (this.resolvedSuccessBehavior() === 'confirmation') {
            this.viewState.set('success');
        }
        else {
            this.viewState.set('checkout');
        }
    }
    /**
     * Asynchronous pending PaymentIntent: not success, not failure.
     * Locks retry (settles the attempt) and keeps the processing screen.
     */
    handlePending(result) {
        if (this.destroyed) {
            return;
        }
        if (!this.acceptTerminalEvent()) {
            return;
        }
        this.pending.emit(result);
        this.lastResult.set(result);
        this.lastError.set(null);
        this.providerBusy.set(false);
        this.processingMethod.set(result.method);
        this.viewState.set('processing');
    }
    handleCancelled(result) {
        if (!this.acceptTerminalEvent()) {
            return;
        }
        this.cancel.emit(result);
        this.lastResult.set(result);
        this.lastError.set(null);
        this.providerBusy.set(false);
        this.viewState.set('cancelled');
    }
    handlePaymentError(error) {
        if (this.destroyed) {
            return;
        }
        if (error.code === 'PAYMENT_CANCELLED') {
            this.handleCancelled({
                status: 'cancelled',
                method: error.method ?? 'card',
                provider: error.provider ?? 'stripe',
                message: error.message,
            });
            return;
        }
        if (!this.acceptTerminalEvent()) {
            return;
        }
        this.error.emit(error);
        if (isIsolatedProviderFailure(error.code)) {
            // Log the stable code only. PaymentError.message may contain a backend
            // response body, a client secret, or a credential-bearing SDK URL.
            if (error.code !== 'BACKEND_ERROR') {
                warnProviderDiagnostic(error.provider ?? error.method ?? 'checkout', error.code);
            }
            this.lastError.set(error);
            this.providerBusy.set(false);
            this.processingMethod.set(null);
            if (this.viewState() === 'processing') {
                this.viewState.set('checkout');
            }
            return;
        }
        this.lastError.set(error);
        this.lastResult.set(null);
        this.providerBusy.set(false);
        this.viewState.set('error');
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: EasyPaymentsComponent, isStandalone: true, selector: "easy-payments", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, methods: { classPropertyName: "methods", publicName: "methods", isSignal: true, isRequired: false, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, checkoutInstanceId: { classPropertyName: "checkoutInstanceId", publicName: "checkoutInstanceId", isSignal: true, isRequired: false, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null }, appearance: { classPropertyName: "appearance", publicName: "appearance", isSignal: true, isRequired: false, transformFunction: null }, visualStyle: { classPropertyName: "visualStyle", publicName: "visualStyle", isSignal: true, isRequired: false, transformFunction: null }, cardButtonAppearance: { classPropertyName: "cardButtonAppearance", publicName: "cardButtonAppearance", isSignal: true, isRequired: false, transformFunction: null }, maxWidth: { classPropertyName: "maxWidth", publicName: "maxWidth", isSignal: true, isRequired: false, transformFunction: null }, successBehavior: { classPropertyName: "successBehavior", publicName: "successBehavior", isSignal: true, isRequired: false, transformFunction: null }, locale: { classPropertyName: "locale", publicName: "locale", isSignal: true, isRequired: false, transformFunction: null }, translations: { classPropertyName: "translations", publicName: "translations", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { success: "success", cancel: "cancel", error: "error", pending: "pending", successContinue: "successContinue", started: "started", methodChange: "methodChange" }, host: { attributes: { "role": "region" }, properties: { "class.ep-theme-light": "resolvedTheme() === \"light\"", "class.ep-theme-dark": "resolvedTheme() === \"dark\"", "class.ep-appearance-transparent": "appearance() === \"transparent\"", "attr.data-theme": "resolvedTheme()", "attr.data-appearance": "appearance()", "attr.data-locale": "effectiveLocale()", "attr.lang": "effectiveLocale()", "style.--ep-checkout-max-width": "checkoutMaxWidthCss()", "style.--ep-font-family": "visualStyleCssVars().fontFamily", "style.--ep-text": "visualStyleCssVars().textColor", "style.--ep-text-secondary": "visualStyleCssVars().textSecondaryColor", "style.--ep-background": "visualStyleCssVars().backgroundColor", "style.--ep-surface": "visualStyleCssVars().surfaceColor", "style.--ep-accent": "visualStyleCssVars().accentColor", "style.--ep-accent-soft": "visualStyleCssVars().accentSoft", "style.--ep-focus": "visualStyleCssVars().accentColor", "style.--ep-radius": "visualStyleCssVars().borderRadius", "style.--ep-spacing": "visualStyleCssVars().spacing", "style.max-width.px": "effectiveMaxWidth()", "attr.aria-label": "checkoutAriaLabel()" } }, providers: [EasyPaymentsI18nService, ThemeService, CheckoutHostContext], viewQueries: [{ propertyName: "applePayBootstrapHost", first: true, predicate: ["applePayBootstrapHost"], descendants: true, isSignal: true }], ngImport: i0, template: "<div class=\"ep-checkout\" [attr.data-view]=\"viewState()\">\r\n  @if (showOutcome()) {\r\n    <easy-checkout-outcome\r\n      [state]=\"outcomeState()\"\r\n      [product]=\"product()\"\r\n      [result]=\"lastResult()\"\r\n      [paymentError]=\"lastError()\"\r\n      (action)=\"onOutcomeAction()\"\r\n    />\r\n  } @else {\r\n    <header class=\"ep-checkout__header\">\r\n      <h2 class=\"ep-checkout__title\">{{ checkoutTitle() }}</h2>\r\n      <p class=\"ep-checkout__subtitle\">{{ checkoutSubtitle() }}</p>\r\n    </header>\r\n\r\n    <easy-checkout-product-summary [product]=\"product()\" />\r\n\r\n    <!--\r\n      IN-FLOW Minimal-ECE host (not fixed under Safari chrome).\r\n      Stripe only fires ready+applePay on iPhone when this host is on-screen.\r\n      When ready succeeds, the Apple Pay tile appears in the list below and this host is removed.\r\n    -->\r\n    @if (showApplePayBootstrap()) {\r\n      <div class=\"ep-apay-bootstrap\" aria-hidden=\"true\">\r\n        <div #applePayBootstrapHost class=\"ep-apay-bootstrap__host\"></div>\r\n      </div>\r\n    }\r\n\r\n    @if (visibleMethods().length === 0) {\r\n      <p class=\"ep-checkout__empty\" role=\"status\">\r\n        {{ noPaymentMethodsAvailable() }}\r\n      </p>\r\n    } @else {\r\n      <!--\r\n        Apple Pay renders Stripe's own button in its list position: tapping it opens\r\n        the Apple Pay sheet directly instead of selecting a tile and a second panel.\r\n      -->\r\n      <ng-template #applePayExpress>\r\n        <easy-apple-pay-payment\r\n          [product]=\"product()\"\r\n          [checkout]=\"checkout()\"\r\n          [resolvedTheme]=\"resolvedTheme()\"\r\n          [compact]=\"true\"\r\n          (success)=\"onApplePaySuccess($event)\"\r\n          (cancel)=\"onApplePayCancel($event)\"\r\n          (error)=\"onApplePayError($event)\"\r\n          (started)=\"onPaymentStarted('apple-pay')\"\r\n          (busyChange)=\"onProviderBusy($event)\"\r\n        />\r\n      </ng-template>\r\n\r\n  <section class=\"ep-checkout__methods\" [attr.aria-label]=\"paymentMethodSelectionAria()\">\r\n        <easy-payment-method-selector\r\n          [methods]=\"visibleMethods()\"\r\n          [selected]=\"selectedMethod()\"\r\n          [theme]=\"resolvedTheme()\"\r\n          [disabled]=\"methodsLocked()\"\r\n          [expressTemplates]=\"applePayExpressInList() ? { 'apple-pay': applePayExpress } : {}\"\r\n          (methodSelect)=\"selectMethod($event)\"\r\n        />\r\n      </section>\r\n\r\n      <div class=\"ep-checkout__divider\" aria-hidden=\"true\"></div>\r\n    }\r\n  }\r\n\r\n  <!--\r\n    Keep real provider panels mounted (clipped when inactive / outcome visible)\r\n    so SDKs and Elements are not destroyed mid-flow. Remount via providerMountKey\r\n    only after Continue / Try again / Return to checkout.\r\n  -->\r\n  <section\r\n    class=\"ep-checkout__detail\"\r\n    [attr.aria-hidden]=\"showOutcome()\"\r\n    [inert]=\"showOutcome()\"\r\n  >\r\n    @if (showStripePanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!stripePanelActive()\"\r\n          [attr.aria-hidden]=\"!stripePanelActive()\"\r\n          [inert]=\"!stripePanelActive()\"\r\n        >\r\n          <easy-stripe-card-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            [cardButtonAppearance]=\"cardButtonAppearance()\"\r\n            (success)=\"onStripeSuccess($event)\"\r\n            (cancel)=\"onStripeCancel($event)\"\r\n            (error)=\"onStripeError($event)\"\r\n            (started)=\"onPaymentStarted('card')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showPayPalPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!paypalPanelActive()\"\r\n          [attr.aria-hidden]=\"!paypalPanelActive()\"\r\n          [inert]=\"!paypalPanelActive()\"\r\n        >\r\n          <easy-paypal-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onPayPalSuccess($event)\"\r\n            (cancel)=\"onPayPalCancel($event)\"\r\n            (error)=\"onPayPalError($event)\"\r\n            (started)=\"onPaymentStarted('paypal')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showGooglePayPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!googlePayPanelActive()\"\r\n          [attr.aria-hidden]=\"!googlePayPanelActive()\"\r\n          [inert]=\"!googlePayPanelActive()\"\r\n        >\r\n          <easy-google-pay-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onGooglePaySuccess($event)\"\r\n            (cancel)=\"onGooglePayCancel($event)\"\r\n            (error)=\"onGooglePayError($event)\"\r\n            (started)=\"onPaymentStarted('google-pay')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showApplePayPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!applePayPanelActive()\"\r\n          [attr.aria-hidden]=\"!applePayPanelActive()\"\r\n          [inert]=\"!applePayPanelActive()\"\r\n        >\r\n          <easy-apple-pay-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onApplePaySuccess($event)\"\r\n            (cancel)=\"onApplePayCancel($event)\"\r\n            (error)=\"onApplePayError($event)\"\r\n            (started)=\"onPaymentStarted('apple-pay')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showKlarnaPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!klarnaPanelActive()\"\r\n          [attr.aria-hidden]=\"!klarnaPanelActive()\"\r\n          [inert]=\"!klarnaPanelActive()\"\r\n        >\r\n          <easy-klarna-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onKlarnaSuccess($event)\"\r\n            (cancel)=\"onKlarnaCancel($event)\"\r\n            (error)=\"onKlarnaError($event)\"\r\n            (started)=\"onPaymentStarted('klarna')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n            (returning)=\"onKlarnaReturning($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showAffirmPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!affirmPanelActive()\"\r\n          [attr.aria-hidden]=\"!affirmPanelActive()\"\r\n          [inert]=\"!affirmPanelActive()\"\r\n        >\r\n          <easy-affirm-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onAffirmSuccess($event)\"\r\n            (cancel)=\"onAffirmCancel($event)\"\r\n            (error)=\"onAffirmError($event)\"\r\n            (started)=\"onPaymentStarted('affirm')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n            (returning)=\"onAffirmReturning($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showMockPanel()) {\r\n      @if (selectedEntry(); as entry) {\r\n        <div class=\"ep-checkout__panel\">\r\n          <easy-mock-method-panel\r\n            [method]=\"entry.method\"\r\n            [product]=\"product()\"\r\n            [theme]=\"resolvedTheme()\"\r\n            [isMock]=\"entry.isMock\"\r\n            [loading]=\"isMethodLoading(entry.method)\"\r\n            (pay)=\"onPay(entry.method)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n  </section>\r\n</div>\r\n", styles: ["@charset \"UTF-8\";:host{display:block;width:100%;max-width:var(--ep-checkout-max-width, 640px);box-sizing:border-box;container-type:inline-size;container-name:ep-checkout;--ep-font-family: \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;font-family:var(--ep-font-family);color:var(--ep-text);background:var(--ep-background);--ep-background: transparent;--ep-surface: #ffffff;--ep-surface-muted: #f8fafc;--ep-surface-hover: #f8fafc;--ep-text: #0f172a;--ep-text-secondary: #64748b;--ep-border: #e2e8f0;--ep-border-strong: #cbd5e1;--ep-accent: #2563eb;--ep-accent-soft: #eff6ff;--ep-focus: #2563eb;--ep-radius: 16px;--ep-radius-md: calc(var(--ep-radius) * .625);--ep-spacing: 16px;--ep-padding: calc(var(--ep-spacing) * 1.25);--ep-spacing-sm: calc(var(--ep-spacing) * .625);--ep-shadow-sm: 0 1px 2px rgba(15, 23, 42, .04);--ep-shadow: 0 8px 24px rgba(15, 23, 42, .06);--ep-cta-bg: #0f172a;--ep-cta-bg-hover: #1e293b;--ep-cta-text: #f8fafc;--ep-demo-bg: #f1f5f9;--ep-demo-text: #64748b;--ep-success: #15803d;--ep-danger: #b91c1c;--ep-bg: var(--ep-surface);--ep-focus-color: var(--ep-focus);--ep-card-bg: var(--ep-cta-bg);--ep-card-text: var(--ep-cta-text);--ep-card-border: var(--ep-border);--ep-mock-border: var(--ep-border-strong);--ep-mock-badge-bg: var(--ep-demo-bg);--ep-mock-badge-text: var(--ep-demo-text)}:host(.ep-theme-dark){--ep-background: transparent;--ep-surface: #111827;--ep-surface-muted: #0b1220;--ep-surface-hover: #1f2937;--ep-text: #f8fafc;--ep-text-secondary: #94a3b8;--ep-border: #243044;--ep-border-strong: #334155;--ep-accent: #60a5fa;--ep-accent-soft: rgba(96, 165, 250, .12);--ep-focus: #93c5fd;--ep-shadow-sm: 0 1px 2px rgba(0, 0, 0, .25);--ep-shadow: 0 10px 28px rgba(0, 0, 0, .35);--ep-cta-bg: color-mix(in srgb, var(--ep-accent, #60a5fa) 42%, #0b3a82);--ep-cta-bg-hover: color-mix(in srgb, var(--ep-accent, #60a5fa) 55%, #1d4ed8);--ep-cta-text: #f8fafc;--ep-demo-bg: #1e293b;--ep-demo-text: #94a3b8;--ep-success: #4ade80;--ep-danger: #f87171}.ep-checkout{display:flex;flex-direction:column;gap:var(--ep-spacing);padding:var(--ep-padding);border:1px solid var(--ep-border);border-radius:var(--ep-radius);background:var(--ep-surface);color:var(--ep-text);box-shadow:var(--ep-shadow);box-sizing:border-box;width:100%}:host(.ep-appearance-transparent) .ep-checkout{padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}.ep-checkout__header{display:flex;flex-direction:column;gap:4px}.ep-checkout__title{margin:0;font-size:1.25rem;font-weight:700;letter-spacing:-.02em;line-height:1.25}.ep-checkout__subtitle{margin:0;font-size:14px;color:var(--ep-text-secondary)}.ep-checkout__methods{margin-top:4px}.ep-checkout__divider{height:1px;background:var(--ep-border);margin:4px 0}.ep-checkout__detail{position:relative;min-height:4px}.ep-checkout__panel{display:block}.ep-checkout__panel--inactive{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;pointer-events:none}.ep-apay-bootstrap{display:block;width:100%;max-width:320px;min-height:44px;margin:0 0 12px;padding:0;overflow:visible;opacity:1;visibility:visible;pointer-events:none}.ep-apay-bootstrap__host{display:block;width:100%;min-width:140px;max-width:320px;min-height:44px;height:44px}.ep-checkout__empty{margin:0;padding:var(--ep-spacing);text-align:center;color:var(--ep-text-secondary);font-size:14px;border:1px dashed var(--ep-border);border-radius:var(--ep-radius-md)}@container ep-checkout (max-width: 420px){.ep-checkout{padding:var(--ep-spacing);border-radius:calc(var(--ep-radius) * .875)}.ep-checkout__title{font-size:1.125rem}}@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}\n"], dependencies: [{ kind: "component", type: CheckoutProductSummaryComponent, selector: "easy-checkout-product-summary", inputs: ["product"] }, { kind: "component", type: PaymentMethodSelectorComponent, selector: "easy-payment-method-selector", inputs: ["methods", "selected", "theme", "disabled", "expressTemplates"], outputs: ["methodSelect"] }, { kind: "component", type: MockMethodPanelComponent, selector: "easy-mock-method-panel", inputs: ["method", "product", "theme", "isMock", "loading", "presentation"], outputs: ["pay"] }, { kind: "component", type: StripeCardPaymentComponent, selector: "easy-stripe-card-payment", inputs: ["product", "checkout", "resolvedTheme", "chrome", "cardButtonAppearance"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: PayPalPaymentComponent, selector: "easy-paypal-payment", inputs: ["product", "checkout", "resolvedTheme", "compact"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: GooglePayPaymentComponent, selector: "easy-google-pay-payment", inputs: ["product", "checkout", "resolvedTheme", "compact"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: ApplePayPaymentComponent, selector: "easy-apple-pay-payment", inputs: ["product", "checkout", "resolvedTheme", "compact"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: KlarnaPaymentComponent, selector: "easy-klarna-payment", inputs: ["product", "checkout", "resolvedTheme", "chrome"], outputs: ["success", "cancel", "error", "started", "busyChange", "returning"] }, { kind: "component", type: AffirmPaymentComponent, selector: "easy-affirm-payment", inputs: ["product", "checkout", "resolvedTheme", "chrome"], outputs: ["success", "cancel", "error", "started", "busyChange", "returning"] }, { kind: "component", type: CheckoutOutcomeComponent, selector: "easy-checkout-outcome", inputs: ["state", "product", "result", "paymentError"], outputs: ["action"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-payments', standalone: true, imports: [
                        CheckoutProductSummaryComponent,
                        PaymentMethodSelectorComponent,
                        MockMethodPanelComponent,
                        StripeCardPaymentComponent,
                        PayPalPaymentComponent,
                        GooglePayPaymentComponent,
                        ApplePayPaymentComponent,
                        KlarnaPaymentComponent,
                        AffirmPaymentComponent,
                        CheckoutOutcomeComponent,
                    ], changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        '[class.ep-theme-light]': 'resolvedTheme() === "light"',
                        '[class.ep-theme-dark]': 'resolvedTheme() === "dark"',
                        '[class.ep-appearance-transparent]': 'appearance() === "transparent"',
                        '[attr.data-theme]': 'resolvedTheme()',
                        '[attr.data-appearance]': 'appearance()',
                        '[attr.data-locale]': 'effectiveLocale()',
                        '[attr.lang]': 'effectiveLocale()',
                        '[style.--ep-checkout-max-width]': 'checkoutMaxWidthCss()',
                        '[style.--ep-font-family]': 'visualStyleCssVars().fontFamily',
                        '[style.--ep-text]': 'visualStyleCssVars().textColor',
                        '[style.--ep-text-secondary]': 'visualStyleCssVars().textSecondaryColor',
                        '[style.--ep-background]': 'visualStyleCssVars().backgroundColor',
                        '[style.--ep-surface]': 'visualStyleCssVars().surfaceColor',
                        '[style.--ep-accent]': 'visualStyleCssVars().accentColor',
                        '[style.--ep-accent-soft]': 'visualStyleCssVars().accentSoft',
                        '[style.--ep-focus]': 'visualStyleCssVars().accentColor',
                        '[style.--ep-radius]': 'visualStyleCssVars().borderRadius',
                        '[style.--ep-spacing]': 'visualStyleCssVars().spacing',
                        '[style.max-width.px]': 'effectiveMaxWidth()',
                        role: 'region',
                        '[attr.aria-label]': 'checkoutAriaLabel()',
                    }, providers: [EasyPaymentsI18nService, ThemeService, CheckoutHostContext], template: "<div class=\"ep-checkout\" [attr.data-view]=\"viewState()\">\r\n  @if (showOutcome()) {\r\n    <easy-checkout-outcome\r\n      [state]=\"outcomeState()\"\r\n      [product]=\"product()\"\r\n      [result]=\"lastResult()\"\r\n      [paymentError]=\"lastError()\"\r\n      (action)=\"onOutcomeAction()\"\r\n    />\r\n  } @else {\r\n    <header class=\"ep-checkout__header\">\r\n      <h2 class=\"ep-checkout__title\">{{ checkoutTitle() }}</h2>\r\n      <p class=\"ep-checkout__subtitle\">{{ checkoutSubtitle() }}</p>\r\n    </header>\r\n\r\n    <easy-checkout-product-summary [product]=\"product()\" />\r\n\r\n    <!--\r\n      IN-FLOW Minimal-ECE host (not fixed under Safari chrome).\r\n      Stripe only fires ready+applePay on iPhone when this host is on-screen.\r\n      When ready succeeds, the Apple Pay tile appears in the list below and this host is removed.\r\n    -->\r\n    @if (showApplePayBootstrap()) {\r\n      <div class=\"ep-apay-bootstrap\" aria-hidden=\"true\">\r\n        <div #applePayBootstrapHost class=\"ep-apay-bootstrap__host\"></div>\r\n      </div>\r\n    }\r\n\r\n    @if (visibleMethods().length === 0) {\r\n      <p class=\"ep-checkout__empty\" role=\"status\">\r\n        {{ noPaymentMethodsAvailable() }}\r\n      </p>\r\n    } @else {\r\n      <!--\r\n        Apple Pay renders Stripe's own button in its list position: tapping it opens\r\n        the Apple Pay sheet directly instead of selecting a tile and a second panel.\r\n      -->\r\n      <ng-template #applePayExpress>\r\n        <easy-apple-pay-payment\r\n          [product]=\"product()\"\r\n          [checkout]=\"checkout()\"\r\n          [resolvedTheme]=\"resolvedTheme()\"\r\n          [compact]=\"true\"\r\n          (success)=\"onApplePaySuccess($event)\"\r\n          (cancel)=\"onApplePayCancel($event)\"\r\n          (error)=\"onApplePayError($event)\"\r\n          (started)=\"onPaymentStarted('apple-pay')\"\r\n          (busyChange)=\"onProviderBusy($event)\"\r\n        />\r\n      </ng-template>\r\n\r\n  <section class=\"ep-checkout__methods\" [attr.aria-label]=\"paymentMethodSelectionAria()\">\r\n        <easy-payment-method-selector\r\n          [methods]=\"visibleMethods()\"\r\n          [selected]=\"selectedMethod()\"\r\n          [theme]=\"resolvedTheme()\"\r\n          [disabled]=\"methodsLocked()\"\r\n          [expressTemplates]=\"applePayExpressInList() ? { 'apple-pay': applePayExpress } : {}\"\r\n          (methodSelect)=\"selectMethod($event)\"\r\n        />\r\n      </section>\r\n\r\n      <div class=\"ep-checkout__divider\" aria-hidden=\"true\"></div>\r\n    }\r\n  }\r\n\r\n  <!--\r\n    Keep real provider panels mounted (clipped when inactive / outcome visible)\r\n    so SDKs and Elements are not destroyed mid-flow. Remount via providerMountKey\r\n    only after Continue / Try again / Return to checkout.\r\n  -->\r\n  <section\r\n    class=\"ep-checkout__detail\"\r\n    [attr.aria-hidden]=\"showOutcome()\"\r\n    [inert]=\"showOutcome()\"\r\n  >\r\n    @if (showStripePanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!stripePanelActive()\"\r\n          [attr.aria-hidden]=\"!stripePanelActive()\"\r\n          [inert]=\"!stripePanelActive()\"\r\n        >\r\n          <easy-stripe-card-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            [cardButtonAppearance]=\"cardButtonAppearance()\"\r\n            (success)=\"onStripeSuccess($event)\"\r\n            (cancel)=\"onStripeCancel($event)\"\r\n            (error)=\"onStripeError($event)\"\r\n            (started)=\"onPaymentStarted('card')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showPayPalPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!paypalPanelActive()\"\r\n          [attr.aria-hidden]=\"!paypalPanelActive()\"\r\n          [inert]=\"!paypalPanelActive()\"\r\n        >\r\n          <easy-paypal-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onPayPalSuccess($event)\"\r\n            (cancel)=\"onPayPalCancel($event)\"\r\n            (error)=\"onPayPalError($event)\"\r\n            (started)=\"onPaymentStarted('paypal')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showGooglePayPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!googlePayPanelActive()\"\r\n          [attr.aria-hidden]=\"!googlePayPanelActive()\"\r\n          [inert]=\"!googlePayPanelActive()\"\r\n        >\r\n          <easy-google-pay-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onGooglePaySuccess($event)\"\r\n            (cancel)=\"onGooglePayCancel($event)\"\r\n            (error)=\"onGooglePayError($event)\"\r\n            (started)=\"onPaymentStarted('google-pay')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showApplePayPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!applePayPanelActive()\"\r\n          [attr.aria-hidden]=\"!applePayPanelActive()\"\r\n          [inert]=\"!applePayPanelActive()\"\r\n        >\r\n          <easy-apple-pay-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onApplePaySuccess($event)\"\r\n            (cancel)=\"onApplePayCancel($event)\"\r\n            (error)=\"onApplePayError($event)\"\r\n            (started)=\"onPaymentStarted('apple-pay')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showKlarnaPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!klarnaPanelActive()\"\r\n          [attr.aria-hidden]=\"!klarnaPanelActive()\"\r\n          [inert]=\"!klarnaPanelActive()\"\r\n        >\r\n          <easy-klarna-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onKlarnaSuccess($event)\"\r\n            (cancel)=\"onKlarnaCancel($event)\"\r\n            (error)=\"onKlarnaError($event)\"\r\n            (started)=\"onPaymentStarted('klarna')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n            (returning)=\"onKlarnaReturning($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showAffirmPanel()) {\r\n      @for (key of [providerMountKey()]; track key) {\r\n        <div\r\n          class=\"ep-checkout__panel\"\r\n          [class.ep-checkout__panel--inactive]=\"!affirmPanelActive()\"\r\n          [attr.aria-hidden]=\"!affirmPanelActive()\"\r\n          [inert]=\"!affirmPanelActive()\"\r\n        >\r\n          <easy-affirm-payment\r\n            [product]=\"product()\"\r\n            [checkout]=\"checkout()\"\r\n            [resolvedTheme]=\"resolvedTheme()\"\r\n            (success)=\"onAffirmSuccess($event)\"\r\n            (cancel)=\"onAffirmCancel($event)\"\r\n            (error)=\"onAffirmError($event)\"\r\n            (started)=\"onPaymentStarted('affirm')\"\r\n            (busyChange)=\"onProviderBusy($event)\"\r\n            (returning)=\"onAffirmReturning($event)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n\r\n    @if (showMockPanel()) {\r\n      @if (selectedEntry(); as entry) {\r\n        <div class=\"ep-checkout__panel\">\r\n          <easy-mock-method-panel\r\n            [method]=\"entry.method\"\r\n            [product]=\"product()\"\r\n            [theme]=\"resolvedTheme()\"\r\n            [isMock]=\"entry.isMock\"\r\n            [loading]=\"isMethodLoading(entry.method)\"\r\n            (pay)=\"onPay(entry.method)\"\r\n          />\r\n        </div>\r\n      }\r\n    }\r\n  </section>\r\n</div>\r\n", styles: ["@charset \"UTF-8\";:host{display:block;width:100%;max-width:var(--ep-checkout-max-width, 640px);box-sizing:border-box;container-type:inline-size;container-name:ep-checkout;--ep-font-family: \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;font-family:var(--ep-font-family);color:var(--ep-text);background:var(--ep-background);--ep-background: transparent;--ep-surface: #ffffff;--ep-surface-muted: #f8fafc;--ep-surface-hover: #f8fafc;--ep-text: #0f172a;--ep-text-secondary: #64748b;--ep-border: #e2e8f0;--ep-border-strong: #cbd5e1;--ep-accent: #2563eb;--ep-accent-soft: #eff6ff;--ep-focus: #2563eb;--ep-radius: 16px;--ep-radius-md: calc(var(--ep-radius) * .625);--ep-spacing: 16px;--ep-padding: calc(var(--ep-spacing) * 1.25);--ep-spacing-sm: calc(var(--ep-spacing) * .625);--ep-shadow-sm: 0 1px 2px rgba(15, 23, 42, .04);--ep-shadow: 0 8px 24px rgba(15, 23, 42, .06);--ep-cta-bg: #0f172a;--ep-cta-bg-hover: #1e293b;--ep-cta-text: #f8fafc;--ep-demo-bg: #f1f5f9;--ep-demo-text: #64748b;--ep-success: #15803d;--ep-danger: #b91c1c;--ep-bg: var(--ep-surface);--ep-focus-color: var(--ep-focus);--ep-card-bg: var(--ep-cta-bg);--ep-card-text: var(--ep-cta-text);--ep-card-border: var(--ep-border);--ep-mock-border: var(--ep-border-strong);--ep-mock-badge-bg: var(--ep-demo-bg);--ep-mock-badge-text: var(--ep-demo-text)}:host(.ep-theme-dark){--ep-background: transparent;--ep-surface: #111827;--ep-surface-muted: #0b1220;--ep-surface-hover: #1f2937;--ep-text: #f8fafc;--ep-text-secondary: #94a3b8;--ep-border: #243044;--ep-border-strong: #334155;--ep-accent: #60a5fa;--ep-accent-soft: rgba(96, 165, 250, .12);--ep-focus: #93c5fd;--ep-shadow-sm: 0 1px 2px rgba(0, 0, 0, .25);--ep-shadow: 0 10px 28px rgba(0, 0, 0, .35);--ep-cta-bg: color-mix(in srgb, var(--ep-accent, #60a5fa) 42%, #0b3a82);--ep-cta-bg-hover: color-mix(in srgb, var(--ep-accent, #60a5fa) 55%, #1d4ed8);--ep-cta-text: #f8fafc;--ep-demo-bg: #1e293b;--ep-demo-text: #94a3b8;--ep-success: #4ade80;--ep-danger: #f87171}.ep-checkout{display:flex;flex-direction:column;gap:var(--ep-spacing);padding:var(--ep-padding);border:1px solid var(--ep-border);border-radius:var(--ep-radius);background:var(--ep-surface);color:var(--ep-text);box-shadow:var(--ep-shadow);box-sizing:border-box;width:100%}:host(.ep-appearance-transparent) .ep-checkout{padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}.ep-checkout__header{display:flex;flex-direction:column;gap:4px}.ep-checkout__title{margin:0;font-size:1.25rem;font-weight:700;letter-spacing:-.02em;line-height:1.25}.ep-checkout__subtitle{margin:0;font-size:14px;color:var(--ep-text-secondary)}.ep-checkout__methods{margin-top:4px}.ep-checkout__divider{height:1px;background:var(--ep-border);margin:4px 0}.ep-checkout__detail{position:relative;min-height:4px}.ep-checkout__panel{display:block}.ep-checkout__panel--inactive{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;pointer-events:none}.ep-apay-bootstrap{display:block;width:100%;max-width:320px;min-height:44px;margin:0 0 12px;padding:0;overflow:visible;opacity:1;visibility:visible;pointer-events:none}.ep-apay-bootstrap__host{display:block;width:100%;min-width:140px;max-width:320px;min-height:44px;height:44px}.ep-checkout__empty{margin:0;padding:var(--ep-spacing);text-align:center;color:var(--ep-text-secondary);font-size:14px;border:1px dashed var(--ep-border);border-radius:var(--ep-radius-md)}@container ep-checkout (max-width: 420px){.ep-checkout{padding:var(--ep-spacing);border-radius:calc(var(--ep-radius) * .875)}.ep-checkout__title{font-size:1.125rem}}@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}\n"] }]
        }], ctorParameters: () => [], propDecorators: { applePayBootstrapHost: [{ type: i0.ViewChild, args: ['applePayBootstrapHost', { isSignal: true }] }], product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], methods: [{ type: i0.Input, args: [{ isSignal: true, alias: "methods", required: false }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], checkoutInstanceId: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkoutInstanceId", required: false }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }], appearance: [{ type: i0.Input, args: [{ isSignal: true, alias: "appearance", required: false }] }], visualStyle: [{ type: i0.Input, args: [{ isSignal: true, alias: "visualStyle", required: false }] }], cardButtonAppearance: [{ type: i0.Input, args: [{ isSignal: true, alias: "cardButtonAppearance", required: false }] }], maxWidth: [{ type: i0.Input, args: [{ isSignal: true, alias: "maxWidth", required: false }] }], successBehavior: [{ type: i0.Input, args: [{ isSignal: true, alias: "successBehavior", required: false }] }], locale: [{ type: i0.Input, args: [{ isSignal: true, alias: "locale", required: false }] }], translations: [{ type: i0.Input, args: [{ isSignal: true, alias: "translations", required: false }] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], pending: [{ type: i0.Output, args: ["pending"] }], successContinue: [{ type: i0.Output, args: ["successContinue"] }], started: [{ type: i0.Output, args: ["started"] }], methodChange: [{ type: i0.Output, args: ["methodChange"] }] } });

const ISO_COUNTRY = /^[A-Za-z]{2}$/;
function trimText(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function hasText(value) {
    return trimText(value).length > 0;
}
function isValidCountryCode(value) {
    return ISO_COUNTRY.test(trimText(value));
}
/**
 * Completeness for library Direct readiness (not a claim about Stripe's absolute API).
 * Requires line1, city, postalCode, and a valid ISO alpha-2 country.
 */
function inspectAddress(address, prefix) {
    if (address == null || typeof address !== 'object') {
        return {
            present: false,
            complete: false,
            invalidCountry: false,
            missingFields: [prefix],
        };
    }
    const missingFields = [];
    if (!hasText(address.line1)) {
        missingFields.push(`${prefix}.line1`);
    }
    if (!hasText(address.city)) {
        missingFields.push(`${prefix}.city`);
    }
    if (!hasText(address.postalCode)) {
        missingFields.push(`${prefix}.postalCode`);
    }
    const country = trimText(address.country);
    let invalidCountry = false;
    if (!country) {
        missingFields.push(`${prefix}.country`);
    }
    else if (!isValidCountryCode(country)) {
        invalidCountry = true;
        missingFields.push(`${prefix}.country`);
    }
    return {
        present: true,
        complete: missingFields.length === 0 && !invalidCountry,
        invalidCountry,
        missingFields,
    };
}
function uniquePreserveOrder(values) {
    const seen = new Set();
    const out = [];
    for (const value of values) {
        if (seen.has(value)) {
            continue;
        }
        seen.add(value);
        out.push(value);
    }
    return out;
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
function evaluateBnplDirectReadiness(input) {
    const mode = input.mode ?? 'auto';
    const checkout = input.checkout ?? null;
    const customer = checkout?.customer;
    const shipping = checkout?.shipping;
    if (mode === 'element') {
        return {
            ready: false,
            selectedFlow: 'element',
            missingFields: [],
            reasonCodes: ['mode_element'],
        };
    }
    const missingFields = [];
    const reasonCodes = [];
    if (!hasText(customer?.email)) {
        missingFields.push('customer.email');
        reasonCodes.push('missing_email');
    }
    if (!hasText(customer?.name)) {
        missingFields.push('customer.name');
        reasonCodes.push('missing_name');
    }
    if (input.provider === 'affirm') {
        const billing = inspectAddress(customer?.address, 'customer.address');
        if (!billing.present) {
            reasonCodes.push('missing_billing_address');
            missingFields.push(...billing.missingFields);
        }
        else if (billing.invalidCountry) {
            reasonCodes.push('invalid_billing_country');
            missingFields.push(...billing.missingFields);
        }
        else if (!billing.complete) {
            reasonCodes.push('incomplete_billing_address');
            missingFields.push(...billing.missingFields);
        }
    }
    else if (customer?.address != null) {
        // Klarna: billing optional; if supplied, reject malformed country / incomplete shapes.
        const billing = inspectAddress(customer.address, 'customer.address');
        if (billing.invalidCountry) {
            reasonCodes.push('invalid_billing_country');
            missingFields.push(...billing.missingFields);
        }
        else if (!billing.complete) {
            reasonCodes.push('incomplete_billing_address');
            missingFields.push(...billing.missingFields);
        }
    }
    if (shipping?.required === true) {
        if (!hasText(shipping.name)) {
            missingFields.push('shipping.name');
            reasonCodes.push('missing_shipping_name');
        }
        const shipAddr = inspectAddress(shipping.address, 'shipping.address');
        if (!shipAddr.present) {
            reasonCodes.push('missing_shipping_address');
            missingFields.push(...shipAddr.missingFields);
        }
        else if (shipAddr.invalidCountry) {
            reasonCodes.push('invalid_shipping_country');
            missingFields.push(...shipAddr.missingFields);
        }
        else if (!shipAddr.complete) {
            reasonCodes.push('incomplete_shipping_address');
            missingFields.push(...shipAddr.missingFields);
        }
    }
    const ready = missingFields.length === 0 && reasonCodes.length === 0;
    const uniqueMissing = uniquePreserveOrder(missingFields);
    const uniqueReasons = uniquePreserveOrder(reasonCodes);
    if (ready) {
        return {
            ready: true,
            selectedFlow: 'direct',
            missingFields: [],
            reasonCodes: ['ready'],
        };
    }
    if (mode === 'direct') {
        return {
            ready: false,
            selectedFlow: 'configuration-error',
            missingFields: uniqueMissing,
            reasonCodes: uniquePreserveOrder([...uniqueReasons, 'direct_not_ready']),
        };
    }
    // auto → Payment Element fallback when Direct readiness is incomplete.
    return {
        ready: false,
        selectedFlow: 'element',
        missingFields: uniqueMissing,
        reasonCodes: uniqueReasons,
    };
}

const SELECTOR_SLOT_KINDS = new Set([
    'card-selector',
    'klarna-selector',
    'affirm-selector',
]);
const DEFAULT_BUTTON_METHODS = [
    'card',
    'paypal',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
];
/**
 * Payment Buttons Only — compact payment strip + shared expanded panel.
 *
 * Wallets (Apple Pay / Google Pay / PayPal) mount official SDK buttons in the strip.
 * Card / Klarna / Affirm use compact selectors; their secure forms open in one shared
 * region below the entire strip. Mock wallet stand-ins are development-only.
 */
class EasyPaymentButtonsComponent {
    orchestrator = inject(PaymentOrchestratorService);
    themeService = inject(ThemeService);
    i18n = inject(EasyPaymentsI18nService);
    configService = inject(EasyPaymentsConfigService);
    applePayAdapter = inject(ApplePayAdapter);
    klarnaAdapter = inject(KlarnaAdapter);
    affirmAdapter = inject(AffirmAdapter);
    confirmationGate = inject(StripeConfirmationGate);
    stripeRedirectRecovery = inject(StripeRedirectRecoveryService);
    hostContext = inject(CheckoutHostContext);
    pendingTasks = inject(PendingTasks);
    ngZone = inject(NgZone);
    destroyRef = inject(DestroyRef);
    destroyed = false;
    klarnaDirectOwnerId = createPaymentOwnerId('klarna-direct');
    affirmDirectOwnerId = createPaymentOwnerId('affirm-direct');
    directAttemptGeneration = 0;
    /**
     * Page-level mutex for Buttons Only Direct Intent create+confirm.
     * Prevents parallel Klarna/Affirm Direct attempts across multiple hosts
     * before `StripeConfirmationGate` is acquired inside the adapter.
     */
    static directPageLock = null;
    availabilitySession = new CheckoutAvailabilitySession();
    availabilityGeneration = 0;
    /** One in-flight attempt. Prevents duplicate terminal emits. */
    paymentAttempt = 'idle';
    /** Idempotent Klarna/Affirm redirect recovery per host instance. */
    stripeReturnRecoveryStarted = false;
    /** True while a Stripe BNPL return is pending ownership or being recovered (blocks selection clears). */
    stripeReturnRecovering = false;
    /** Method of a Stripe BNPL return seen at construction, until ownership is claimed. */
    stripeReturnMethod = null;
    stripeReturnClaimed = false;
    /** A recovered return succeeded: its panel must not create another PaymentIntent. */
    successAfterReturn = false;
    product = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "product" }] : /* istanbul ignore next */ []));
    methods = input(DEFAULT_BUTTON_METHODS, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "methods" }] : /* istanbul ignore next */ []));
    checkout = input(/* @ts-ignore */
    ...(ngDevMode ? [undefined, { debugName: "checkout" }] : /* istanbul ignore next */ []));
    /**
     * Optional stable id for this buttons host on pages with several instances.
     * Used to attribute Stripe Klarna/Affirm redirect returns after reload or reorder.
     * Omit on single-host pages. Values: 1–64 chars `[a-zA-Z0-9_.:-]`.
     */
    checkoutInstanceId = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "checkoutInstanceId" }] : /* istanbul ignore next */ []));
    /** Method row orientation. Order always follows `[methods]`. */
    layout = input('vertical', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "layout" }] : /* istanbul ignore next */ []));
    theme = input('system', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []));
    locale = input('auto', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "locale" }] : /* istanbul ignore next */ []));
    translations = input({}, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "translations" }] : /* istanbul ignore next */ []));
    /**
     * Optional EP-owned token overrides for list chrome.
     * Host background remains permanently transparent regardless of `backgroundColor`.
     * Use `[buttonsAppearance].background` for an optional strip fill.
     */
    visualStyle = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "visualStyle" }] : /* istanbul ignore next */ []));
    /**
     * Optional strip presentation (gap, separators, borders, radius, dimensions).
     * Defaults to a transparent compact payment strip.
     */
    buttonsAppearance = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsAppearance" }] : /* istanbul ignore next */ []));
    /**
     * Optional Easy Payments–owned Stripe Card confirmation CTA presentation
     * (label, colors, typography, border, size, hover/disabled/loading/focus).
     * Independent of `[buttonsAppearance]` (strip chrome). Does not restyle the
     * Stripe Payment Element iframe or official wallet SDK buttons.
     */
    cardButtonAppearance = input(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "cardButtonAppearance" }] : /* istanbul ignore next */ []));
    /**
     * Klarna/Affirm confirmation strategy for Buttons Only only.
     * Default `element` preserves Payment Element + Continue for existing merchants.
     * Opt in to `auto` / `direct` for one-click Stripe Direct when checkout customer
     * data satisfies {@link evaluateBnplDirectReadiness}.
     */
    bnplConfirmMode = input('element', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "bnplConfirmMode" }] : /* istanbul ignore next */ []));
    /**
     * `library` (default) renders Easy Payments Card / Klarna / Affirm selectors.
     * `merchant` hides those selectors so the host app calls {@link requestPayment}.
     * PayPal, Google Pay, and Apple Pay stay official SDK buttons either way.
     */
    selectorVisibility = input('library', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorVisibility" }] : /* istanbul ignore next */ []));
    started = output();
    methodChange = output();
    success = output();
    cancel = output();
    error = output();
    /**
     * Fired when a PaymentIntent is still `processing` (not yet succeeded or failed).
     * Not a success and not a definitive failure. Do not retry; await backend/webhook.
     */
    pending = output();
    resolvedTheme = this.themeService.resolvedTheme;
    effectiveLocale = this.i18n.effectiveLocale;
    availableMethods = this.availabilitySession.availableMethods;
    availabilityPublished = this.availabilitySession.availabilityPublished;
    loading = this.orchestrator.loading;
    selectedMethod = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectedMethod" }] : /* istanbul ignore next */ []));
    providerBusy = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "providerBusy" }] : /* istanbul ignore next */ []));
    processingMethod = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "processingMethod" }] : /* istanbul ignore next */ []));
    /** True while Buttons Only is running (or has locked) a Direct BNPL attempt — suppresses PE panels. */
    bnplDirectActive = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "bnplDirectActive" }] : /* istanbul ignore next */ []));
    visualStyleCssVars = computed(() => resolveVisualStyleCssVars(this.visualStyle()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "visualStyleCssVars" }] : /* istanbul ignore next */ []));
    msgs = computed(() => this.i18n.messages(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "msgs" }] : /* istanbul ignore next */ []));
    regionAriaLabel = computed(() => {
        const msgs = this.msgs();
        return msgs.paymentMethodSelectionAria || 'Payment methods';
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "regionAriaLabel" }] : /* istanbul ignore next */ []));
    separatorsEnabled = computed(() => (this.buttonsAppearance()?.separators ?? 'none') === 'line', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "separatorsEnabled" }] : /* istanbul ignore next */ []));
    borderlessSelectors = computed(() => (this.buttonsAppearance()?.border ?? 'default') === 'none', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "borderlessSelectors" }] : /* istanbul ignore next */ []));
    buttonsGapCss = computed(() => this.buttonsAppearance()?.gap ??
        this.visualStyleCssVars().spacing ??
        '8px', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsGapCss" }] : /* istanbul ignore next */ []));
    buttonsPaddingCss = computed(() => this.buttonsAppearance()?.padding ?? '0px', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsPaddingCss" }] : /* istanbul ignore next */ []));
    buttonsHeightCss = computed(() => this.buttonsAppearance()?.buttonHeight ?? '40px', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsHeightCss" }] : /* istanbul ignore next */ []));
    buttonsMinWidthCss = computed(() => this.buttonsAppearance()?.buttonMinWidth ?? '100px', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsMinWidthCss" }] : /* istanbul ignore next */ []));
    buttonsWidthCss = computed(() => this.buttonsAppearance()?.buttonWidth ?? '100%', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsWidthCss" }] : /* istanbul ignore next */ []));
    /** Horizontal slot width; `null` keeps the stylesheet default. */
    buttonsSlotWidthCss = computed(() => {
        const width = this.buttonsAppearance()?.buttonWidth?.trim();
        return width && width !== '100%' && width !== 'auto' ? width : null;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsSlotWidthCss" }] : /* istanbul ignore next */ []));
    buttonsRadiusCss = computed(() => this.buttonsAppearance()?.borderRadius ??
        this.visualStyleCssVars().borderRadius ??
        null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsRadiusCss" }] : /* istanbul ignore next */ []));
    buttonsBorderWidthCss = computed(() => {
        if (this.borderlessSelectors()) {
            return '0px';
        }
        return this.buttonsAppearance()?.borderWidth ?? '1px';
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsBorderWidthCss" }] : /* istanbul ignore next */ []));
    buttonsBorderColorCss = computed(() => this.buttonsAppearance()?.borderColor ?? null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsBorderColorCss" }] : /* istanbul ignore next */ []));
    buttonsSeparatorColorCss = computed(() => this.buttonsAppearance()?.separatorColor ?? null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsSeparatorColorCss" }] : /* istanbul ignore next */ []));
    buttonsStripBackgroundCss = computed(() => {
        const bg = this.buttonsAppearance()?.background;
        if (bg == null || bg === 'transparent') {
            return 'transparent';
        }
        return bg;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "buttonsStripBackgroundCss" }] : /* istanbul ignore next */ []));
    selectorBackgroundCss = computed(() => cssToken(this.buttonsAppearance()?.selectorBackgroundColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorBackgroundCss" }] : /* istanbul ignore next */ []));
    selectorTextCss = computed(() => cssToken(this.buttonsAppearance()?.selectorTextColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorTextCss" }] : /* istanbul ignore next */ []));
    selectorFontFamilyCss = computed(() => cssToken(this.buttonsAppearance()?.selectorFontFamily, 120), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorFontFamilyCss" }] : /* istanbul ignore next */ []));
    selectorFontSizeCss = computed(() => cssToken(this.buttonsAppearance()?.selectorFontSize), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorFontSizeCss" }] : /* istanbul ignore next */ []));
    selectorFontWeightCss = computed(() => cssToken(this.buttonsAppearance()?.selectorFontWeight), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorFontWeightCss" }] : /* istanbul ignore next */ []));
    selectorPaddingCss = computed(() => cssToken(this.buttonsAppearance()?.selectorPadding), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorPaddingCss" }] : /* istanbul ignore next */ []));
    selectorHoverBackgroundCss = computed(() => cssToken(this.buttonsAppearance()?.selectorHoverBackgroundColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorHoverBackgroundCss" }] : /* istanbul ignore next */ []));
    selectorHoverTextCss = computed(() => cssToken(this.buttonsAppearance()?.selectorHoverTextColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorHoverTextCss" }] : /* istanbul ignore next */ []));
    selectorHoverBorderCss = computed(() => cssToken(this.buttonsAppearance()?.selectorHoverBorderColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorHoverBorderCss" }] : /* istanbul ignore next */ []));
    selectorSelectedBackgroundCss = computed(() => cssToken(this.buttonsAppearance()?.selectorSelectedBackgroundColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorSelectedBackgroundCss" }] : /* istanbul ignore next */ []));
    selectorSelectedTextCss = computed(() => cssToken(this.buttonsAppearance()?.selectorSelectedTextColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorSelectedTextCss" }] : /* istanbul ignore next */ []));
    selectorSelectedBorderCss = computed(() => cssToken(this.buttonsAppearance()?.selectorSelectedBorderColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorSelectedBorderCss" }] : /* istanbul ignore next */ []));
    selectorDisabledBackgroundCss = computed(() => cssToken(this.buttonsAppearance()?.selectorDisabledBackgroundColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorDisabledBackgroundCss" }] : /* istanbul ignore next */ []));
    selectorDisabledTextCss = computed(() => cssToken(this.buttonsAppearance()?.selectorDisabledTextColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorDisabledTextCss" }] : /* istanbul ignore next */ []));
    selectorLoadingBackgroundCss = computed(() => cssToken(this.buttonsAppearance()?.selectorLoadingBackgroundColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorLoadingBackgroundCss" }] : /* istanbul ignore next */ []));
    selectorLoadingTextCss = computed(() => cssToken(this.buttonsAppearance()?.selectorLoadingTextColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorLoadingTextCss" }] : /* istanbul ignore next */ []));
    selectorFocusOutlineCss = computed(() => cssToken(this.buttonsAppearance()?.selectorFocusOutlineColor), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectorFocusOutlineCss" }] : /* istanbul ignore next */ []));
    methodsLocked = computed(() => this.providerBusy() || this.processingMethod() !== null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "methodsLocked" }] : /* istanbul ignore next */ []));
    /**
     * Slots in exact developer `[methods]` order.
     * Availability filters state only — never reorders.
     */
    methodSlots = computed(() => {
        const requested = this.methods();
        const published = this.availabilityPublished();
        const availability = this.availableMethods();
        const theme = this.resolvedTheme();
        const msgs = this.msgs();
        return requested.map((method) => {
            const entry = availability.find((item) => item.method === method);
            let state = 'loading';
            if (published) {
                state = entry?.available ? 'available' : 'unavailable';
            }
            const isMock = entry?.isMock ?? false;
            const kind = this.resolveSlotKind(method, state, isMock);
            const presentation = getPaymentMethodPresentation(method, theme);
            const brandLabel = presentation.label || PAYMENT_METHOD_LABELS[method];
            const customLabel = selectorLabel(this.buttonsAppearance()?.selectorLabels, method);
            // Card is library-owned copy; wallet brand names stay provider trademarks.
            const label = customLabel ?? (method === 'card' ? msgs.methodCard : brandLabel);
            // Brand marks already name the provider — never duplicate visible text.
            // Card's generic icon does not include the name; show a compact "Card" label
            // so the selector stays visible in light/dark and selected states.
            const showVisibleLabel = method === 'card' || customLabel != null;
            const showBrandIcon = this.buttonsAppearance()?.showSelectorIcon !== false;
            return {
                method,
                state,
                isMock,
                label,
                kind,
                interactive: SELECTOR_SLOT_KINDS.has(kind),
                showVisibleLabel,
                showBrandIcon,
            };
        });
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "methodSlots" }] : /* istanbul ignore next */ []));
    /**
     * Methods followed by a separator. Unavailable slots are collapsed, so a
     * separator only sits between two visible slots.
     */
    separatorAfter = computed(() => {
        const visible = this.methodSlots().filter((slot) => slot.state !== 'unavailable');
        return new Set(visible.slice(0, -1).map((slot) => slot.method));
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "separatorAfter" }] : /* istanbul ignore next */ []));
    /** Availability is known and no requested method can be shown. */
    noMethodsAvailable = computed(() => this.availabilityPublished() &&
        this.methodSlots().every((slot) => slot.state === 'unavailable'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "noMethodsAvailable" }] : /* istanbul ignore next */ []));
    /** One notice above the strip when any mock stand-in is present (not per-button). */
    showDemoModeNotice = computed(() => this.methodSlots().some((slot) => slot.isMock && slot.state === 'available'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showDemoModeNotice" }] : /* istanbul ignore next */ []));
    hasAvailableCard = computed(() => this.methodSlots().some((slot) => slot.method === 'card' && slot.state === 'available'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasAvailableCard" }] : /* istanbul ignore next */ []));
    hasAvailablePayPal = computed(() => this.methodSlots().some((slot) => slot.method === 'paypal' && slot.state === 'available'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasAvailablePayPal" }] : /* istanbul ignore next */ []));
    hasAvailableGooglePay = computed(() => this.methodSlots().some((slot) => slot.method === 'google-pay' && slot.state === 'available'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasAvailableGooglePay" }] : /* istanbul ignore next */ []));
    hasAvailableApplePay = computed(() => this.methodSlots().some((slot) => slot.method === 'apple-pay' && slot.state === 'available'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasAvailableApplePay" }] : /* istanbul ignore next */ []));
    hasAvailableKlarna = computed(() => this.methodSlots().some((slot) => slot.method === 'klarna' && slot.state === 'available'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasAvailableKlarna" }] : /* istanbul ignore next */ []));
    hasAvailableAffirm = computed(() => this.methodSlots().some((slot) => slot.method === 'affirm' && slot.state === 'available'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "hasAvailableAffirm" }] : /* istanbul ignore next */ []));
    selectedCardEntry = computed(() => {
        if (this.selectedMethod() !== 'card') {
            return null;
        }
        return this.availableMethods().find((entry) => entry.method === 'card' && entry.available) ?? null;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectedCardEntry" }] : /* istanbul ignore next */ []));
    showStripeCardPanel = computed(() => {
        const entry = this.selectedCardEntry();
        return !!entry && !entry.isMock;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showStripeCardPanel" }] : /* istanbul ignore next */ []));
    showMockCardPanel = computed(() => {
        const entry = this.selectedCardEntry();
        return !!entry && entry.isMock;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showMockCardPanel" }] : /* istanbul ignore next */ []));
    selectedKlarnaEntry = computed(() => {
        if (this.selectedMethod() !== 'klarna') {
            return null;
        }
        return (this.availableMethods().find((entry) => entry.method === 'klarna' && entry.available) ?? null);
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectedKlarnaEntry" }] : /* istanbul ignore next */ []));
    showKlarnaPanel = computed(() => {
        const entry = this.selectedKlarnaEntry();
        return !!entry && !entry.isMock && this.shouldShowBnplElementPanel('klarna');
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showKlarnaPanel" }] : /* istanbul ignore next */ []));
    showMockKlarnaPanel = computed(() => {
        const entry = this.selectedKlarnaEntry();
        return !!entry && entry.isMock;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showMockKlarnaPanel" }] : /* istanbul ignore next */ []));
    selectedAffirmEntry = computed(() => {
        if (this.selectedMethod() !== 'affirm') {
            return null;
        }
        return (this.availableMethods().find((entry) => entry.method === 'affirm' && entry.available) ?? null);
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "selectedAffirmEntry" }] : /* istanbul ignore next */ []));
    showAffirmPanel = computed(() => {
        const entry = this.selectedAffirmEntry();
        return !!entry && !entry.isMock && this.shouldShowBnplElementPanel('affirm');
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showAffirmPanel" }] : /* istanbul ignore next */ []));
    showMockAffirmPanel = computed(() => {
        const entry = this.selectedAffirmEntry();
        return !!entry && entry.isMock;
    }, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "showMockAffirmPanel" }] : /* istanbul ignore next */ []));
    /**
     * True when at least one configured method is still loading (placeholder, not unavailable).
     */
    foundationOnly = computed(() => this.methodSlots().some((slot) => slot.kind === 'placeholder' && slot.state !== 'unavailable'), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "foundationOnly" }] : /* istanbul ignore next */ []));
    constructor() {
        this.hostContext.kind = 'buttons';
        // Stripe ECE `ready` often fires outside NgZone — refresh instance availability
        // so apple-pay slots update after wallet eligibility is known. One listener per host.
        const removeApplePayListener = this.applePayAdapter.addAvailabilityListener(() => {
            this.ngZone.run(() => {
                if (this.destroyed) {
                    return;
                }
                const product = untracked(() => this.product());
                const methods = untracked(() => this.methods());
                const checkout = untracked(() => this.checkout());
                void this.refreshInstanceAvailability(methods, product, checkout, this.resolvedTheme()).catch(() => {
                    // Availability refresh errors are non-fatal for button UI.
                });
            });
        });
        this.destroyRef.onDestroy(() => {
            this.destroyed = true;
            this.directAttemptGeneration += 1;
            if (EasyPaymentButtonsComponent.directPageLock === this.klarnaDirectOwnerId ||
                EasyPaymentButtonsComponent.directPageLock === this.affirmDirectOwnerId) {
                EasyPaymentButtonsComponent.directPageLock = null;
            }
            void this.klarnaAdapter.destroy(this.klarnaDirectOwnerId);
            void this.affirmAdapter.destroy(this.affirmDirectOwnerId);
            removeApplePayListener();
        });
        // Klarna/Affirm redirect return: hold the UI until the recovery service decides
        // which host on the page owns it. Only the owner recovers and emits.
        if (typeof window !== 'undefined' && isStripeReturnAttempt()) {
            const method = detectStripeReturnMethod() ?? 'klarna';
            this.stripeReturnMethod = method;
            this.stripeReturnRecovering = true;
            this.hostContext.setReturnPhase('pending', method);
            this.updateSelectedMethod(method);
            this.providerBusy.set(true);
        }
        effect(() => {
            const product = this.product();
            const methods = this.methods();
            const checkoutInstanceId = this.checkoutInstanceId();
            untracked(() => {
                this.hostContext.setCheckoutInstanceId(checkoutInstanceId);
                this.hostContext.setProductId(product.id);
                this.claimStripeReturnOnce(methods);
            });
        });
        effect(() => {
            this.themeService.setTheme(this.theme());
        });
        effect(() => {
            this.i18n.setRequestedLocale(this.locale());
            this.i18n.setOverrides(this.translations());
        });
        effect(() => {
            const product = this.product();
            const methods = this.methods();
            const checkout = this.checkout();
            const theme = this.resolvedTheme();
            untracked(() => {
                void this.refreshInstanceAvailability(methods, product, checkout, theme).catch((err) => {
                    this.error.emit(normalizeError(err));
                });
            });
        });
        // Clear selector methods if they leave the allow-list or become unavailable.
        // Skip while busy / BNPL redirect recovery so availability publish cannot steal selection.
        effect(() => {
            const selected = this.selectedMethod();
            if (selected !== 'card' && selected !== 'klarna' && selected !== 'affirm') {
                return;
            }
            if (untracked(() => this.stripeReturnRecovering ||
                this.providerBusy() ||
                this.processingMethod() !== null)) {
                return;
            }
            const slot = this.methodSlots().find((entry) => entry.method === selected);
            if (!slot || slot.state !== 'available') {
                untracked(() => this.updateSelectedMethod(null));
            }
        });
    }
    /** Merchant-owned mode hides library Card / Klarna / Affirm triggers. Wallets stay visible. */
    merchantOwnsSelector(slot) {
        return this.selectorVisibility() === 'merchant' && slot.interactive;
    }
    /**
     * Custom disabled/loading fills apply only when the merchant set them.
     * Otherwise the default selected fill and opacity stay in place.
     */
    selectorStateBackground(method) {
        if (this.processingMethod() === method && this.selectorLoadingBackgroundCss()) {
            return this.selectorLoadingBackgroundCss();
        }
        if (this.methodsLocked() && this.selectorDisabledBackgroundCss()) {
            return this.selectorDisabledBackgroundCss();
        }
        return null;
    }
    selectorStateColor(method) {
        if (this.processingMethod() === method && this.selectorLoadingTextCss()) {
            return this.selectorLoadingTextCss();
        }
        if (this.methodsLocked() && this.selectorDisabledTextCss()) {
            return this.selectorDisabledTextCss();
        }
        return null;
    }
    slotAriaLabel(slot) {
        const base = slot.label;
        const msgs = this.msgs();
        if (slot.state === 'loading') {
            return `${base}, ${msgs.methodLoadingStatus}`;
        }
        if (slot.state === 'unavailable') {
            return `${base}, ${msgs.methodUnavailableStatus}`;
        }
        if (slot.kind === 'paypal-express') {
            return msgs.paypalCheckoutAria;
        }
        if (slot.kind === 'google-pay-express') {
            return msgs.googlePayCheckoutAria;
        }
        if (slot.kind === 'apple-pay-express') {
            return msgs.applePayCheckoutAria;
        }
        if (slot.kind === 'paypal-mock' ||
            slot.kind === 'google-pay-mock' ||
            slot.kind === 'apple-pay-mock') {
            return interpolate(msgs.demoWalletButtonAria, { method: base });
        }
        if (!slot.interactive) {
            return `${base}, ${msgs.methodUnavailableStatus}`;
        }
        if (this.selectedMethod() === slot.method) {
            return `${base}, selected`;
        }
        return base;
    }
    /**
     * Merchant-owned trigger for Card, Klarna, and Affirm.
     * Runs only when the host application calls it from a user action.
     * PayPal, Google Pay, and Apple Pay are refused: those methods stay on official SDK buttons.
     */
    requestPayment(method) {
        if (this.destroyed) {
            return;
        }
        if (method === 'paypal' || method === 'google-pay' || method === 'apple-pay') {
            this.error.emit(new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'PayPal, Google Pay, and Apple Pay require their official SDK buttons. Merchant HTML cannot start these methods.',
                method,
            }));
            return;
        }
        if (method !== 'card' && method !== 'klarna' && method !== 'affirm') {
            this.error.emit(new PaymentError({
                code: 'CONFIG_INVALID',
                message: `Unsupported payment method "${String(method)}".`,
                method,
            }));
            return;
        }
        if (this.methodsLocked()) {
            return;
        }
        if (!this.canRequestPayment(method)) {
            this.error.emit(new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `${method} is not available for this checkout.`,
                method,
            }));
            return;
        }
        this.selectMethod(method);
    }
    /** True when a merchant click may call {@link requestPayment} for this method. */
    canRequestPayment(method) {
        if (this.destroyed || this.methodsLocked()) {
            return false;
        }
        if (method !== 'card' && method !== 'klarna' && method !== 'affirm') {
            return false;
        }
        const slot = this.methodSlots().find((entry) => entry.method === method);
        return !!slot && slot.state === 'available' && SELECTOR_SLOT_KINDS.has(slot.kind);
    }
    selectMethod(method) {
        if (this.methodsLocked() || this.destroyed) {
            return;
        }
        const slot = this.methodSlots().find((entry) => entry.method === method);
        if (!slot || !SELECTOR_SLOT_KINDS.has(slot.kind)) {
            return;
        }
        if ((method === 'klarna' || method === 'affirm') &&
            slot.state === 'available' &&
            !slot.isMock &&
            this.beginBnplSelectorClick(method)) {
            return;
        }
        this.bnplDirectActive.set(false);
        this.updateSelectedMethod(method);
    }
    onCardStarted() {
        this.onPaymentStarted('card');
    }
    onCardBusy(busy) {
        this.providerBusy.set(busy);
    }
    onCardSuccess(result) {
        this.handleSuccess(result);
    }
    onCardCancel(result) {
        this.handleCancelled(result);
    }
    onCardError(error) {
        this.handlePaymentError(error);
    }
    onKlarnaStarted() {
        this.onPaymentStarted('klarna');
    }
    onKlarnaBusy(busy) {
        this.providerBusy.set(busy);
    }
    onKlarnaSuccess(result) {
        this.handleSuccess(result);
    }
    onKlarnaCancel(result) {
        this.handleCancelled(result);
    }
    onKlarnaError(error) {
        this.handlePaymentError(error);
    }
    onAffirmStarted() {
        this.onPaymentStarted('affirm');
    }
    onAffirmBusy(busy) {
        this.providerBusy.set(busy);
    }
    onAffirmSuccess(result) {
        this.handleSuccess(result);
    }
    onAffirmCancel(result) {
        this.handleCancelled(result);
    }
    onAffirmError(error) {
        this.handlePaymentError(error);
    }
    /**
     * Official PayPal has no separate selector — engaging the SDK (order create)
     * selects PayPal for methodChange, then emits started.
     */
    onPayPalStarted() {
        this.updateSelectedMethod('paypal');
        this.onPaymentStarted('paypal');
    }
    onPayPalBusy(busy) {
        this.providerBusy.set(busy);
    }
    onPayPalSuccess(result) {
        this.handleSuccess(result);
    }
    onPayPalCancel(result) {
        this.handleCancelled(result);
    }
    onPayPalError(error) {
        this.handlePaymentError(error);
    }
    /**
     * Official Google Pay has no separate selector — buyer click selects the method
     * for methodChange, then emits started.
     */
    onGooglePayStarted() {
        this.updateSelectedMethod('google-pay');
        this.onPaymentStarted('google-pay');
    }
    onGooglePayBusy(busy) {
        this.providerBusy.set(busy);
    }
    onGooglePaySuccess(result) {
        this.handleSuccess(result);
    }
    onGooglePayCancel(result) {
        this.handleCancelled(result);
    }
    onGooglePayError(error) {
        this.handlePaymentError(error);
    }
    /**
     * Official Apple Pay has no separate selector — wallet confirm selects the method
     * for methodChange, then emits started (not on ECE mount / ready).
     */
    onApplePayStarted() {
        this.updateSelectedMethod('apple-pay');
        this.onPaymentStarted('apple-pay');
    }
    onApplePayBusy(busy) {
        this.providerBusy.set(busy);
    }
    onApplePaySuccess(result) {
        this.handleSuccess(result);
    }
    onApplePayCancel(result) {
        this.handleCancelled(result);
    }
    onApplePayError(error) {
        this.handlePaymentError(error);
    }
    async onMockCardPay() {
        await this.runMockPayment('card');
    }
    async onMockKlarnaPay() {
        await this.runMockPayment('klarna');
    }
    async onMockAffirmPay() {
        await this.runMockPayment('affirm');
    }
    async onMockPayPalPay() {
        if (this.methodsLocked() || this.destroyed) {
            return;
        }
        this.updateSelectedMethod('paypal');
        await this.runMockPayment('paypal');
    }
    async onMockGooglePayPay() {
        if (this.methodsLocked() || this.destroyed) {
            return;
        }
        this.updateSelectedMethod('google-pay');
        await this.runMockPayment('google-pay');
    }
    async onMockApplePayPay() {
        if (this.methodsLocked() || this.destroyed) {
            return;
        }
        this.updateSelectedMethod('apple-pay');
        await this.runMockPayment('apple-pay');
    }
    resolveSlotKind(method, state, isMock) {
        // Apple Pay ECE must mount to learn wallet eligibility (`ready`).
        // After publish, live apple-pay always gets an express slot; the component
        // hides the button when Stripe reports Apple Pay unavailable (no fake CTA).
        if (method === 'apple-pay') {
            if (state === 'loading') {
                return 'placeholder';
            }
            if (isMock) {
                return state === 'available' ? 'apple-pay-mock' : 'placeholder';
            }
            return 'apple-pay-express';
        }
        if (state !== 'available') {
            return 'placeholder';
        }
        if (method === 'card') {
            return 'card-selector';
        }
        if (method === 'klarna') {
            return 'klarna-selector';
        }
        if (method === 'affirm') {
            return 'affirm-selector';
        }
        if (method === 'paypal') {
            return isMock ? 'paypal-mock' : 'paypal-express';
        }
        if (method === 'google-pay') {
            return isMock ? 'google-pay-mock' : 'google-pay-express';
        }
        return 'placeholder';
    }
    claimStripeReturnOnce(methods) {
        const method = this.stripeReturnMethod;
        if (!method || this.stripeReturnClaimed) {
            return;
        }
        this.stripeReturnClaimed = true;
        const done = this.pendingTasks.add();
        void this.stripeRedirectRecovery
            .claimReturn(this.hostContext, methods)
            .then(async (claim) => {
            if (this.destroyed) {
                return;
            }
            if (claim === 'owner') {
                this.hostContext.setReturnPhase('owner', method);
                await this.recoverStripeReturn(method);
            }
            else {
                this.releaseStripeReturn();
            }
        })
            .finally(done);
    }
    /** Another host owns the return (or it was unattributable): resume a normal, idle list. */
    releaseStripeReturn() {
        this.stripeReturnRecovering = false;
        this.stripeReturnMethod = null;
        this.hostContext.setReturnPhase('none');
        this.providerBusy.set(false);
        // The provisional selection was set before outputs were subscribed; revert it silently.
        this.selectedMethod.set(null);
    }
    /**
     * Library-owned Stripe BNPL redirect recovery (Klarna / Affirm).
     * Always leaves busy for a terminal success / cancel / error. Idempotent per host.
     * Does not emit `started` — confirmation already happened before redirect.
     */
    async recoverStripeReturn(method) {
        if (this.stripeReturnRecoveryStarted) {
            return;
        }
        this.stripeReturnRecoveryStarted = true;
        this.updateSelectedMethod(method);
        this.providerBusy.set(true);
        const label = method === 'affirm' ? 'Affirm' : 'Klarna';
        try {
            const result = await this.stripeRedirectRecovery.consumeReturn();
            if (this.destroyed) {
                return;
            }
            if (!result) {
                this.handlePaymentError(new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: `${label} return could not be verified.`,
                    method,
                    provider: method,
                }));
                return;
            }
            if (result.status === 'success' || result.status === 'processing') {
                this.successAfterReturn = true;
                this.handleSuccess(result);
            }
            else if (result.status === 'cancelled') {
                this.handleCancelled(result);
            }
            else {
                this.handlePaymentError(new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: result.message ?? `${label} payment failed.`,
                    method,
                    provider: method,
                }));
            }
        }
        catch (err) {
            if (this.destroyed) {
                return;
            }
            const paymentError = normalizeError(err, { method, provider: method });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.handleCancelled({
                    status: 'cancelled',
                    method,
                    provider: method,
                    message: paymentError.message,
                });
            }
            else {
                this.handlePaymentError(paymentError);
            }
        }
        finally {
            this.stripeReturnRecovering = false;
            this.stripeReturnMethod = null;
            if (!this.destroyed) {
                this.providerBusy.set(false);
                if (this.successAfterReturn) {
                    // Keep the panel from creating a new PaymentIntent, but clear active-submit UX.
                    // `processingMethod` remains set only for genuine pending (awaiting provider).
                    if (this.processingMethod() !== null) {
                        this.hostContext.setReturnPhase('awaiting', method);
                    }
                    else {
                        this.hostContext.setReturnPhase('settled', method);
                    }
                }
                else {
                    // Cancel / error: allow the panel to create a fresh PaymentIntent for retry.
                    this.hostContext.setReturnPhase('none');
                }
            }
        }
    }
    async runMockPayment(method) {
        if (this.methodsLocked() || this.destroyed) {
            return;
        }
        this.processingMethod.set(method);
        this.onPaymentStarted(method);
        try {
            const result = await this.orchestrator.processPayment(method, this.product(), this.checkout());
            if (result.status === 'success' || result.status === 'processing') {
                this.handleSuccess(result);
            }
            else if (result.status === 'cancelled') {
                this.handleCancelled(result);
            }
            else {
                this.handlePaymentError(new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: result.message ?? 'Payment failed.',
                    method,
                    provider: PAYMENT_METHOD_PROVIDER_MAP[method],
                }));
            }
        }
        catch (err) {
            const paymentError = normalizeError(err, {
                method,
                provider: PAYMENT_METHOD_PROVIDER_MAP[method],
            });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.handleCancelled({
                    status: 'cancelled',
                    method,
                    provider: PAYMENT_METHOD_PROVIDER_MAP[method],
                    message: paymentError.message,
                });
            }
            else {
                this.handlePaymentError(paymentError);
            }
        }
        finally {
            if (!this.destroyed) {
                this.processingMethod.set(null);
            }
        }
    }
    onPaymentStarted(method) {
        if (this.destroyed || this.paymentAttempt === 'active') {
            return;
        }
        this.paymentAttempt = 'active';
        const product = this.product();
        this.started.emit({
            method,
            provider: PAYMENT_METHOD_PROVIDER_MAP[method],
            amount: product.amount,
            currency: product.currency,
        });
    }
    updateSelectedMethod(method) {
        const previousMethod = this.selectedMethod();
        if (previousMethod === method) {
            return;
        }
        this.selectedMethod.set(method);
        if (this.destroyed) {
            return;
        }
        this.methodChange.emit({
            method,
            previousMethod,
            provider: method ? PAYMENT_METHOD_PROVIDER_MAP[method] : null,
        });
    }
    acceptTerminalEvent() {
        if (this.destroyed) {
            return false;
        }
        if (this.paymentAttempt === 'settled') {
            return false;
        }
        if (this.paymentAttempt === 'active') {
            this.paymentAttempt = 'settled';
        }
        return true;
    }
    handleSuccess(result) {
        if (result.status === 'processing') {
            this.handlePending(result);
            return;
        }
        if (!this.acceptTerminalEvent()) {
            return;
        }
        this.providerBusy.set(false);
        this.processingMethod.set(null);
        this.bnplDirectActive.set(false);
        this.success.emit(result);
        this.paymentAttempt = 'idle';
    }
    /** Asynchronous pending PaymentIntent — lock retry; do not emit success or error. */
    handlePending(result) {
        if (!this.acceptTerminalEvent()) {
            return;
        }
        this.providerBusy.set(false);
        // Keep processingMethod set so methodsLocked stays true (no retry / double charge).
        this.processingMethod.set(result.method);
        this.pending.emit(result);
    }
    handleCancelled(result) {
        if (!this.acceptTerminalEvent()) {
            return;
        }
        this.providerBusy.set(false);
        this.processingMethod.set(null);
        this.bnplDirectActive.set(false);
        this.cancel.emit(result);
        this.paymentAttempt = 'idle';
    }
    handlePaymentError(error) {
        if (!this.acceptTerminalEvent()) {
            return;
        }
        this.providerBusy.set(false);
        this.processingMethod.set(null);
        this.bnplDirectActive.set(false);
        this.error.emit(error);
        this.paymentAttempt = 'idle';
    }
    /**
     * Payment Element panels are shown for `element` / `auto` fallback only.
     * `direct` never mounts PE (config error or one-click Direct).
     */
    shouldShowBnplElementPanel(_provider) {
        if (this.bnplDirectActive()) {
            return false;
        }
        return this.bnplConfirmMode() !== 'direct';
    }
    /**
     * Klarna/Affirm selector click: Direct, PE fallback, or configuration error.
     * @returns true when the click was fully handled (caller must not open PE).
     */
    beginBnplSelectorClick(method) {
        const mode = this.bnplConfirmMode();
        if (mode === 'element') {
            return false;
        }
        const readiness = evaluateBnplDirectReadiness({
            provider: method,
            mode,
            checkout: this.checkout(),
        });
        if (readiness.selectedFlow === 'element') {
            return false;
        }
        if (readiness.selectedFlow === 'configuration-error') {
            this.bnplDirectActive.set(false);
            this.updateSelectedMethod(method);
            this.emitBnplDirectConfigurationError(method, readiness);
            return true;
        }
        void this.runBnplDirectPayment(method);
        return true;
    }
    emitBnplDirectConfigurationError(method, readiness) {
        const label = method === 'affirm' ? 'Affirm' : 'Klarna';
        const reasons = readiness.reasonCodes.join(', ');
        const fields = readiness.missingFields.join(', ');
        const detailParts = [
            reasons ? `reasons=${reasons}` : null,
            fields ? `fields=${fields}` : null,
        ].filter((part) => !!part);
        this.handlePaymentError(new PaymentError({
            code: 'CONFIG_INVALID',
            message: `${label} Direct confirmation is not ready (${detailParts.join('; ')}).`,
            method,
            provider: method,
            originalError: {
                selectedFlow: readiness.selectedFlow,
                reasonCodes: readiness.reasonCodes,
                missingFields: readiness.missingFields,
            },
        }));
    }
    async runBnplDirectPayment(method) {
        if (this.methodsLocked() || this.destroyed || this.stripeReturnRecovering) {
            return;
        }
        const ownerId = method === 'klarna' ? this.klarnaDirectOwnerId : this.affirmDirectOwnerId;
        const adapter = method === 'klarna' ? this.klarnaAdapter : this.affirmAdapter;
        const product = this.product();
        const checkout = this.checkout();
        const validation = validatePaymentProduct(product);
        if (!validation.valid) {
            this.updateSelectedMethod(method);
            this.handlePaymentError(new PaymentError({
                code: 'PRODUCT_INVALID',
                message: validation.errors.join(' '),
                method,
                provider: method,
            }));
            return;
        }
        if (this.confirmationGate.isHeld() ||
            EasyPaymentButtonsComponent.directPageLock !== null) {
            // Do not select the method — that would mount Payment Element and create another Intent.
            this.handlePaymentError(new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Another payment is already being confirmed on this page. Wait for it to finish, then try again.',
                method,
                provider: method,
            }));
            return;
        }
        EasyPaymentButtonsComponent.directPageLock = ownerId;
        // Lock before any await so double-clicks and alternating BNPL clicks cannot race.
        this.bnplDirectActive.set(true);
        this.updateSelectedMethod(method);
        this.processingMethod.set(method);
        this.providerBusy.set(true);
        this.onPaymentStarted(method);
        const generation = ++this.directAttemptGeneration;
        const attemptId = createStripeReturnAttemptId();
        let intentCreated = false;
        let confirmStarted = false;
        try {
            await adapter.ensureStripeLoaded();
            if (this.destroyed || generation !== this.directAttemptGeneration) {
                return;
            }
            const preferredLocale = this.resolveBnplPreferredLocale(method);
            const session = await adapter.createPaymentSession(product, checkout, preferredLocale, ownerId);
            if (this.destroyed || generation !== this.directAttemptGeneration) {
                return;
            }
            intentCreated = true;
            // Stamp ownership only when this host is allowed to confirm (mirrors PE Continue).
            if (!this.confirmationGate.isHeld()) {
                markStripePendingReturn(method, product.id, undefined, this.hostContext.describeReturnOrigin(attemptId));
            }
            const returnUrl = buildStripeReturnUrl(method, checkout?.successUrl, undefined, attemptId);
            confirmStarted = true;
            const result = await adapter.confirmDirectPayment({
                clientSecret: session.clientSecret,
                returnUrl,
                customer: checkout?.customer,
                shipping: checkout?.shipping,
            }, ownerId);
            // Redirect-based BNPL typically unloads before this resolves. When it does resolve,
            // clear our marker and emit the terminal outcome (never treat initiation as success).
            clearStripePendingReturnFor(attemptId);
            if (this.destroyed || generation !== this.directAttemptGeneration) {
                return;
            }
            if (result.status === 'success' || result.status === 'processing') {
                this.handleSuccess(result);
            }
            else if (result.status === 'cancelled') {
                this.handleCancelled(result);
            }
            else {
                this.handlePaymentError(new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: result.message ?? `${method === 'affirm' ? 'Affirm' : 'Klarna'} payment failed.`,
                    method,
                    provider: method,
                }));
            }
        }
        catch (err) {
            clearStripePendingReturnFor(attemptId);
            if (this.destroyed || generation !== this.directAttemptGeneration) {
                return;
            }
            const paymentError = normalizeError(err, { method, provider: method });
            // Ambiguous: Intent created and confirm was invoked, but outcome is unclear (e.g. network).
            // Do not auto-retry or fall back to PE. Keep methods locked for merchant-driven recovery.
            if (intentCreated &&
                confirmStarted &&
                (paymentError.code === 'NETWORK_ERROR' || paymentError.code === 'UNKNOWN')) {
                this.providerBusy.set(false);
                if (this.acceptTerminalEvent()) {
                    this.error.emit(paymentError);
                    // Keep processingMethod so a second click cannot create another Intent.
                    this.paymentAttempt = 'settled';
                }
                return;
            }
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.handleCancelled({
                    status: 'cancelled',
                    method,
                    provider: method,
                    message: paymentError.message,
                });
            }
            else {
                this.handlePaymentError(paymentError);
            }
        }
        finally {
            if (!this.destroyed && generation === this.directAttemptGeneration) {
                this.providerBusy.set(false);
                // Definitive cancel/error clears processingMethod inside handlers; ambiguous keeps it.
                if (this.paymentAttempt === 'idle') {
                    this.bnplDirectActive.set(false);
                    if (this.processingMethod() === method) {
                        this.processingMethod.set(null);
                    }
                    // Clear selection so Payment Element cannot mount and create a new Intent
                    // after a completed Direct attempt on this host.
                    if (this.selectedMethod() === method) {
                        this.updateSelectedMethod(null);
                    }
                }
            }
            // Keep the page lock after ambiguous confirm outcomes so no host creates another Intent.
            const retainLockForAmbiguous = this.paymentAttempt === 'settled' && this.processingMethod() === method;
            if (!retainLockForAmbiguous &&
                EasyPaymentButtonsComponent.directPageLock === ownerId) {
                EasyPaymentButtonsComponent.directPageLock = null;
            }
        }
    }
    resolveBnplPreferredLocale(method) {
        const locale = this.effectiveLocale();
        const snapshot = this.configService.getSnapshot();
        if (method === 'klarna') {
            const klarna = snapshot.providers?.klarna;
            const configured = klarna?.locale?.trim();
            if (configured) {
                return configured;
            }
            return toKlarnaPreferredLocale(locale, klarna?.purchaseCountry ?? 'US');
        }
        const affirm = snapshot.providers?.affirm;
        const configured = affirm?.locale?.trim();
        if (configured) {
            return configured;
        }
        return toAffirmPreferredLocale(locale, affirm?.purchaseCountry ?? 'US');
    }
    async refreshInstanceAvailability(methods, product, checkout, theme) {
        const generation = ++this.availabilityGeneration;
        const results = await this.orchestrator.refreshAvailability(methods, product, checkout, theme);
        if (this.destroyed || generation !== this.availabilityGeneration) {
            return results;
        }
        this.availabilitySession.apply(results);
        return results;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentButtonsComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "22.1.5", type: EasyPaymentButtonsComponent, isStandalone: true, selector: "easy-payment-buttons", inputs: { product: { classPropertyName: "product", publicName: "product", isSignal: true, isRequired: true, transformFunction: null }, methods: { classPropertyName: "methods", publicName: "methods", isSignal: true, isRequired: false, transformFunction: null }, checkout: { classPropertyName: "checkout", publicName: "checkout", isSignal: true, isRequired: false, transformFunction: null }, checkoutInstanceId: { classPropertyName: "checkoutInstanceId", publicName: "checkoutInstanceId", isSignal: true, isRequired: false, transformFunction: null }, layout: { classPropertyName: "layout", publicName: "layout", isSignal: true, isRequired: false, transformFunction: null }, theme: { classPropertyName: "theme", publicName: "theme", isSignal: true, isRequired: false, transformFunction: null }, locale: { classPropertyName: "locale", publicName: "locale", isSignal: true, isRequired: false, transformFunction: null }, translations: { classPropertyName: "translations", publicName: "translations", isSignal: true, isRequired: false, transformFunction: null }, visualStyle: { classPropertyName: "visualStyle", publicName: "visualStyle", isSignal: true, isRequired: false, transformFunction: null }, buttonsAppearance: { classPropertyName: "buttonsAppearance", publicName: "buttonsAppearance", isSignal: true, isRequired: false, transformFunction: null }, cardButtonAppearance: { classPropertyName: "cardButtonAppearance", publicName: "cardButtonAppearance", isSignal: true, isRequired: false, transformFunction: null }, bnplConfirmMode: { classPropertyName: "bnplConfirmMode", publicName: "bnplConfirmMode", isSignal: true, isRequired: false, transformFunction: null }, selectorVisibility: { classPropertyName: "selectorVisibility", publicName: "selectorVisibility", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { started: "started", methodChange: "methodChange", success: "success", cancel: "cancel", error: "error", pending: "pending" }, host: { attributes: { "role": "region" }, properties: { "class.ep-theme-light": "resolvedTheme() === \"light\"", "class.ep-theme-dark": "resolvedTheme() === \"dark\"", "class.ep-payment-buttons-host--horizontal": "layout() === \"horizontal\"", "class.ep-payment-buttons-host--vertical": "layout() === \"vertical\"", "attr.data-theme": "resolvedTheme()", "attr.data-layout": "layout()", "attr.data-locale": "effectiveLocale()", "attr.lang": "effectiveLocale()", "attr.data-separators": "separatorsEnabled() ? \"line\" : \"none\"", "attr.data-card-ready": "hasAvailableCard() ? \"true\" : \"false\"", "attr.data-paypal-ready": "hasAvailablePayPal() ? \"true\" : \"false\"", "attr.data-google-pay-ready": "hasAvailableGooglePay() ? \"true\" : \"false\"", "attr.data-apple-pay-ready": "hasAvailableApplePay() ? \"true\" : \"false\"", "attr.data-klarna-ready": "hasAvailableKlarna() ? \"true\" : \"false\"", "attr.data-affirm-ready": "hasAvailableAffirm() ? \"true\" : \"false\"", "attr.data-bnpl-confirm-mode": "bnplConfirmMode()", "attr.data-bnpl-direct-active": "bnplDirectActive() ? \"true\" : \"false\"", "attr.data-selector-visibility": "selectorVisibility()", "style.--ep-buttons-selector-bg": "selectorBackgroundCss()", "style.--ep-buttons-selector-text": "selectorTextCss()", "style.--ep-buttons-selector-font-family": "selectorFontFamilyCss()", "style.--ep-buttons-selector-font-size": "selectorFontSizeCss()", "style.--ep-buttons-selector-font-weight": "selectorFontWeightCss()", "style.--ep-buttons-selector-padding": "selectorPaddingCss()", "style.--ep-buttons-selector-hover-bg": "selectorHoverBackgroundCss()", "style.--ep-buttons-selector-hover-text": "selectorHoverTextCss()", "style.--ep-buttons-selector-hover-border": "selectorHoverBorderCss()", "style.--ep-buttons-selector-selected-bg": "selectorSelectedBackgroundCss()", "style.--ep-buttons-selector-selected-text": "selectorSelectedTextCss()", "style.--ep-buttons-selector-selected-border": "selectorSelectedBorderCss()", "style.--ep-buttons-selector-disabled-bg": "selectorDisabledBackgroundCss()", "style.--ep-buttons-selector-disabled-text": "selectorDisabledTextCss()", "style.--ep-buttons-selector-loading-bg": "selectorLoadingBackgroundCss()", "style.--ep-buttons-selector-loading-text": "selectorLoadingTextCss()", "style.--ep-buttons-selector-focus-color": "selectorFocusOutlineCss()", "style.--ep-font-family": "visualStyleCssVars().fontFamily", "style.--ep-text": "visualStyleCssVars().textColor", "style.--ep-text-secondary": "visualStyleCssVars().textSecondaryColor", "style.--ep-surface": "visualStyleCssVars().surfaceColor", "style.--ep-accent": "visualStyleCssVars().accentColor", "style.--ep-accent-soft": "visualStyleCssVars().accentSoft", "style.--ep-focus": "visualStyleCssVars().accentColor", "style.--ep-radius": "visualStyleCssVars().borderRadius", "style.--ep-spacing": "visualStyleCssVars().spacing", "style.--ep-buttons-gap": "buttonsGapCss()", "style.--ep-buttons-padding": "buttonsPaddingCss()", "style.--ep-buttons-height": "buttonsHeightCss()", "style.--ep-buttons-min-width": "buttonsMinWidthCss()", "style.--ep-buttons-width": "buttonsWidthCss()", "style.--ep-buttons-slot-width": "buttonsSlotWidthCss()", "style.--ep-buttons-radius": "buttonsRadiusCss()", "style.--ep-buttons-border-width": "buttonsBorderWidthCss()", "style.--ep-buttons-border-color": "buttonsBorderColorCss()", "style.--ep-buttons-separator-color": "buttonsSeparatorColorCss()", "style.--ep-buttons-strip-bg": "buttonsStripBackgroundCss()", "attr.aria-label": "regionAriaLabel()" }, classAttribute: "ep-payment-buttons-host" }, providers: [EasyPaymentsI18nService, ThemeService, CheckoutHostContext], ngImport: i0, template: "<div\r\n  class=\"ep-payment-buttons\"\r\n  [class.ep-payment-buttons--horizontal]=\"layout() === 'horizontal'\"\r\n  [class.ep-payment-buttons--vertical]=\"layout() === 'vertical'\"\r\n  [class.ep-payment-buttons--separators]=\"separatorsEnabled()\"\r\n  [class.ep-payment-buttons--borderless]=\"borderlessSelectors()\"\r\n  data-testid=\"easy-payment-buttons-root\"\r\n>\r\n  @if (showDemoModeNotice()) {\r\n    <p class=\"ep-payment-buttons__demo-notice\" role=\"status\" data-testid=\"easy-payment-buttons-demo-notice\">\r\n      {{ msgs().buttonsDemoModeNotice }}\r\n    </p>\r\n  }\r\n\r\n  @if (noMethodsAvailable()) {\r\n    <p class=\"ep-payment-buttons__empty\" role=\"status\" data-testid=\"easy-payment-buttons-empty\">\r\n      {{ msgs().noPaymentMethodsAvailable }}\r\n    </p>\r\n  }\r\n\r\n  <p class=\"ep-payment-buttons__status\" role=\"status\" aria-live=\"polite\" data-testid=\"easy-payment-buttons-status\">\r\n    @if (processingMethod(); as activeMethod) {\r\n      {{ activeMethod }} busy\r\n    }\r\n  </p>\r\n\r\n  <div\r\n    class=\"ep-payment-buttons__list\"\r\n    role=\"group\"\r\n    [attr.aria-label]=\"regionAriaLabel()\"\r\n  >\r\n    @for (slot of methodSlots(); track slot.method) {\r\n      <!--\r\n        Unavailable slots collapse instead of unmounting: Apple Pay's Stripe\r\n        Express Checkout Element must stay mounted to report eligibility.\r\n      -->\r\n      <div\r\n        class=\"ep-payment-buttons__item\"\r\n        [class.ep-payment-buttons__item--collapsed]=\"slot.state === 'unavailable' || merchantOwnsSelector(slot)\"\r\n        [attr.aria-hidden]=\"slot.state === 'unavailable' || merchantOwnsSelector(slot) ? 'true' : null\"\r\n        [attr.data-method]=\"slot.method\"\r\n        [attr.data-state]=\"slot.state\"\r\n        [attr.data-kind]=\"slot.kind\"\r\n        [attr.data-interactive]=\"slot.interactive ? 'true' : 'false'\"\r\n        [attr.data-mock]=\"slot.isMock ? 'true' : null\"\r\n      >\r\n        @if (\r\n          selectorVisibility() === 'library' &&\r\n          (slot.kind === 'card-selector' ||\r\n            slot.kind === 'klarna-selector' ||\r\n            slot.kind === 'affirm-selector')\r\n        ) {\r\n          <button\r\n            type=\"button\"\r\n            class=\"ep-payment-buttons__selector\"\r\n            [class.ep-payment-buttons__selector--selected]=\"selectedMethod() === slot.method\"\r\n            [class.ep-payment-buttons__selector--mock]=\"slot.isMock\"\r\n            [class.ep-payment-buttons__selector--labeled]=\"slot.showVisibleLabel\"\r\n            [attr.aria-pressed]=\"selectedMethod() === slot.method\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n            [attr.aria-busy]=\"processingMethod() === slot.method ? 'true' : null\"\r\n            [style.background]=\"selectorStateBackground(slot.method)\"\r\n            [style.color]=\"selectorStateColor(slot.method)\"\r\n            [disabled]=\"methodsLocked()\"\r\n            (click)=\"selectMethod(slot.method)\"\r\n          >\r\n            @if (slot.showBrandIcon) {\r\n              <span class=\"ep-payment-buttons__mark\" aria-hidden=\"true\">\r\n                <easy-payment-method-icon [method]=\"slot.method\" [theme]=\"resolvedTheme()\" />\r\n              </span>\r\n            }\r\n            @if (slot.showVisibleLabel) {\r\n              <span class=\"ep-payment-buttons__label\">{{ slot.label }}</span>\r\n            }\r\n          </button>\r\n        } @else if (slot.kind === 'paypal-express') {\r\n          <div\r\n            class=\"ep-payment-buttons__express\"\r\n            data-testid=\"easy-payment-buttons-paypal-express\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-paypal-payment\r\n              [product]=\"product()\"\r\n              [checkout]=\"checkout()\"\r\n              [resolvedTheme]=\"resolvedTheme()\"\r\n              [compact]=\"true\"\r\n              (started)=\"onPayPalStarted()\"\r\n              (busyChange)=\"onPayPalBusy($event)\"\r\n              (success)=\"onPayPalSuccess($event)\"\r\n              (cancel)=\"onPayPalCancel($event)\"\r\n              (error)=\"onPayPalError($event)\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'paypal-mock') {\r\n          <div\r\n            class=\"ep-payment-buttons__mock\"\r\n            data-testid=\"easy-payment-buttons-paypal-mock\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-mock-method-panel\r\n              method=\"paypal\"\r\n              presentation=\"strip\"\r\n              [product]=\"product()\"\r\n              [theme]=\"resolvedTheme()\"\r\n              [isMock]=\"true\"\r\n              [loading]=\"processingMethod() === 'paypal'\"\r\n              (pay)=\"onMockPayPalPay()\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'google-pay-express') {\r\n          <div\r\n            class=\"ep-payment-buttons__express\"\r\n            data-testid=\"easy-payment-buttons-google-pay-express\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-google-pay-payment\r\n              [product]=\"product()\"\r\n              [checkout]=\"checkout()\"\r\n              [resolvedTheme]=\"resolvedTheme()\"\r\n              [compact]=\"true\"\r\n              (started)=\"onGooglePayStarted()\"\r\n              (busyChange)=\"onGooglePayBusy($event)\"\r\n              (success)=\"onGooglePaySuccess($event)\"\r\n              (cancel)=\"onGooglePayCancel($event)\"\r\n              (error)=\"onGooglePayError($event)\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'google-pay-mock') {\r\n          <div\r\n            class=\"ep-payment-buttons__mock\"\r\n            data-testid=\"easy-payment-buttons-google-pay-mock\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-mock-method-panel\r\n              method=\"google-pay\"\r\n              presentation=\"strip\"\r\n              [product]=\"product()\"\r\n              [theme]=\"resolvedTheme()\"\r\n              [isMock]=\"true\"\r\n              [loading]=\"processingMethod() === 'google-pay'\"\r\n              (pay)=\"onMockGooglePayPay()\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'apple-pay-express') {\r\n          <div\r\n            class=\"ep-payment-buttons__express\"\r\n            data-testid=\"easy-payment-buttons-apple-pay-express\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-apple-pay-payment\r\n              [product]=\"product()\"\r\n              [checkout]=\"checkout()\"\r\n              [resolvedTheme]=\"resolvedTheme()\"\r\n              [compact]=\"true\"\r\n              (started)=\"onApplePayStarted()\"\r\n              (busyChange)=\"onApplePayBusy($event)\"\r\n              (success)=\"onApplePaySuccess($event)\"\r\n              (cancel)=\"onApplePayCancel($event)\"\r\n              (error)=\"onApplePayError($event)\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'apple-pay-mock') {\r\n          <div\r\n            class=\"ep-payment-buttons__mock\"\r\n            data-testid=\"easy-payment-buttons-apple-pay-mock\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-mock-method-panel\r\n              method=\"apple-pay\"\r\n              presentation=\"strip\"\r\n              [product]=\"product()\"\r\n              [theme]=\"resolvedTheme()\"\r\n              [isMock]=\"true\"\r\n              [loading]=\"processingMethod() === 'apple-pay'\"\r\n              (pay)=\"onMockApplePayPay()\"\r\n            />\r\n          </div>\r\n        } @else {\r\n          <div\r\n            class=\"ep-payment-buttons__placeholder\"\r\n            [class.ep-payment-buttons__placeholder--loading]=\"slot.state === 'loading'\"\r\n            [class.ep-payment-buttons__placeholder--unavailable]=\"slot.state === 'unavailable'\"\r\n            [class.ep-payment-buttons__placeholder--mock]=\"slot.isMock\"\r\n            role=\"status\"\r\n            aria-disabled=\"true\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <span class=\"ep-payment-buttons__mark\" aria-hidden=\"true\">\r\n              <easy-payment-method-icon [method]=\"slot.method\" [theme]=\"resolvedTheme()\" />\r\n            </span>\r\n          </div>\r\n        }\r\n      </div>\r\n      @if (separatorsEnabled() && separatorAfter().has(slot.method)) {\r\n        <div class=\"ep-payment-buttons__separator\" aria-hidden=\"true\"></div>\r\n      }\r\n    }\r\n  </div>\r\n\r\n  @if (showStripeCardPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-card-panel\"\r\n      [attr.aria-label]=\"msgs().cardPaymentRegionAria\"\r\n    >\r\n      <easy-stripe-card-payment\r\n        [product]=\"product()\"\r\n        [checkout]=\"checkout()\"\r\n        [resolvedTheme]=\"resolvedTheme()\"\r\n        [cardButtonAppearance]=\"cardButtonAppearance()\"\r\n        chrome=\"minimal\"\r\n        (started)=\"onCardStarted()\"\r\n        (busyChange)=\"onCardBusy($event)\"\r\n        (success)=\"onCardSuccess($event)\"\r\n        (cancel)=\"onCardCancel($event)\"\r\n        (error)=\"onCardError($event)\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showMockCardPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-card-mock-panel\"\r\n      [attr.aria-label]=\"msgs().cardPaymentRegionAria\"\r\n    >\r\n      <easy-mock-method-panel\r\n        method=\"card\"\r\n        presentation=\"expand\"\r\n        [product]=\"product()\"\r\n        [theme]=\"resolvedTheme()\"\r\n        [isMock]=\"true\"\r\n        [loading]=\"processingMethod() === 'card'\"\r\n        (pay)=\"onMockCardPay()\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showKlarnaPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-klarna-panel\"\r\n      [attr.aria-label]=\"msgs().klarnaPaymentRegionAria\"\r\n    >\r\n      <easy-klarna-payment\r\n        [product]=\"product()\"\r\n        [checkout]=\"checkout()\"\r\n        [resolvedTheme]=\"resolvedTheme()\"\r\n        chrome=\"minimal\"\r\n        (started)=\"onKlarnaStarted()\"\r\n        (busyChange)=\"onKlarnaBusy($event)\"\r\n        (success)=\"onKlarnaSuccess($event)\"\r\n        (cancel)=\"onKlarnaCancel($event)\"\r\n        (error)=\"onKlarnaError($event)\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showMockKlarnaPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-klarna-mock-panel\"\r\n      [attr.aria-label]=\"msgs().klarnaPaymentRegionAria\"\r\n    >\r\n      <easy-mock-method-panel\r\n        method=\"klarna\"\r\n        presentation=\"expand\"\r\n        [product]=\"product()\"\r\n        [theme]=\"resolvedTheme()\"\r\n        [isMock]=\"true\"\r\n        [loading]=\"processingMethod() === 'klarna'\"\r\n        (pay)=\"onMockKlarnaPay()\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showAffirmPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-affirm-panel\"\r\n      [attr.aria-label]=\"msgs().affirmPaymentRegionAria\"\r\n    >\r\n      <easy-affirm-payment\r\n        [product]=\"product()\"\r\n        [checkout]=\"checkout()\"\r\n        [resolvedTheme]=\"resolvedTheme()\"\r\n        chrome=\"minimal\"\r\n        (started)=\"onAffirmStarted()\"\r\n        (busyChange)=\"onAffirmBusy($event)\"\r\n        (success)=\"onAffirmSuccess($event)\"\r\n        (cancel)=\"onAffirmCancel($event)\"\r\n        (error)=\"onAffirmError($event)\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showMockAffirmPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-affirm-mock-panel\"\r\n      [attr.aria-label]=\"msgs().affirmPaymentRegionAria\"\r\n    >\r\n      <easy-mock-method-panel\r\n        method=\"affirm\"\r\n        presentation=\"expand\"\r\n        [product]=\"product()\"\r\n        [theme]=\"resolvedTheme()\"\r\n        [isMock]=\"true\"\r\n        [loading]=\"processingMethod() === 'affirm'\"\r\n        (pay)=\"onMockAffirmPay()\"\r\n      />\r\n    </section>\r\n  }\r\n</div>\r\n", styles: ["@charset \"UTF-8\";:host{display:block;width:100%;box-sizing:border-box;background:transparent!important;color:var(--ep-text, #0f172a);font-family:var(--ep-font-family, \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif);--ep-surface: #ffffff;--ep-text: #0f172a;--ep-text-secondary: #64748b;--ep-border: #e2e8f0;--ep-border-strong: #cbd5e1;--ep-accent: #2563eb;--ep-accent-soft: #eff6ff;--ep-focus: #2563eb;--ep-radius: 12px;--ep-radius-md: calc(var(--ep-radius) * .625);--ep-spacing: 12px;--ep-cta-bg: #0f172a;--ep-cta-bg-hover: #1e293b;--ep-cta-text: #f8fafc;--ep-success: #15803d;--ep-danger: #b91c1c;--ep-demo-bg: #f1f5f9;--ep-demo-text: #64748b;--ep-buttons-gap: 8px;--ep-buttons-padding: 0px;--ep-buttons-height: 40px;--ep-buttons-min-width: 100px;--ep-buttons-width: auto;--ep-buttons-slot-width: 160px;--ep-buttons-radius: var(--ep-radius-md, 10px);--ep-buttons-border-width: 1px;--ep-buttons-border-color: var(--ep-border, #e2e8f0);--ep-buttons-separator-color: var(--ep-border, #e2e8f0);--ep-buttons-strip-bg: transparent}:host(.ep-theme-dark){--ep-surface: #111827;--ep-text: #f8fafc;--ep-text-secondary: #94a3b8;--ep-border: #243044;--ep-border-strong: #334155;--ep-accent: #60a5fa;--ep-accent-soft: rgba(96, 165, 250, .12);--ep-focus: #93c5fd;--ep-cta-bg: color-mix(in srgb, var(--ep-accent, #60a5fa) 42%, #0b3a82);--ep-cta-bg-hover: color-mix(in srgb, var(--ep-accent, #60a5fa) 55%, #1d4ed8);--ep-cta-text: #f8fafc;--ep-demo-bg: #1e293b;--ep-demo-text: #94a3b8;--ep-buttons-border-color: var(--ep-border, #243044);--ep-buttons-separator-color: var(--ep-border, #243044)}.ep-payment-buttons{display:flex;flex-direction:column;gap:var(--ep-buttons-gap, 8px);width:100%;margin:0;padding:var(--ep-buttons-padding, 0);background:var(--ep-buttons-strip-bg, transparent);border:0;box-shadow:none;box-sizing:border-box}.ep-payment-buttons__demo-notice{margin:0;padding:0;font-size:12px;line-height:1.35;color:var(--ep-text-secondary, #64748b)}.ep-payment-buttons__empty{margin:0;font-size:13px;line-height:1.4;color:var(--ep-text-secondary, #64748b)}.ep-payment-buttons__list{list-style:none;margin:0;padding:0;display:flex;gap:var(--ep-buttons-gap, 8px);width:100%;position:relative;container-type:inline-size;background:transparent;align-items:center}.ep-payment-buttons--vertical .ep-payment-buttons__list{flex-direction:column;align-items:stretch}.ep-payment-buttons--horizontal .ep-payment-buttons__list{flex-direction:row;flex-wrap:wrap;align-items:center}.ep-payment-buttons__item{margin:0;padding:0;min-width:0;display:flex;align-items:center;position:relative;z-index:0}.ep-payment-buttons--horizontal .ep-payment-buttons__item{flex:0 1 var(--ep-buttons-slot-width, 160px);max-width:100%}.ep-payment-buttons--horizontal .ep-payment-buttons__item[data-kind=paypal-express]{min-width:min(100%,150px)}@container (min-width: 308px) and (max-width: 359px){.ep-payment-buttons--horizontal .ep-payment-buttons__item{flex-basis:calc((100% - var(--ep-buttons-gap, 8px)) / 2)}}@container (max-width: 307px){.ep-payment-buttons--horizontal .ep-payment-buttons__item{flex-basis:100%}}.ep-payment-buttons__item--collapsed{position:absolute;inset-inline-start:0;top:0;width:var(--ep-buttons-slot-width, 160px);height:0;min-height:0;overflow:hidden;pointer-events:none}.ep-payment-buttons--vertical .ep-payment-buttons__item{width:100%}.ep-payment-buttons__separator{flex:0 0 auto;align-self:stretch;background:var(--ep-buttons-separator-color, var(--ep-border, #e2e8f0));pointer-events:none}.ep-payment-buttons--horizontal .ep-payment-buttons__separator{width:1px;min-height:calc(var(--ep-buttons-height, 40px) * .5);align-self:center}.ep-payment-buttons--vertical .ep-payment-buttons__separator{width:100%;height:1px}.ep-payment-buttons__selector,.ep-payment-buttons__placeholder{box-sizing:border-box;display:inline-flex;flex-direction:row;align-items:center;justify-content:center;gap:0;width:var(--ep-buttons-width, 100%);min-width:var(--ep-buttons-min-width, 100px);height:var(--ep-buttons-height, 40px);min-height:var(--ep-buttons-height, 40px);padding:0 10px;border-radius:var(--ep-buttons-radius, var(--ep-radius-md, 10px));background:var(--ep-surface, #fff);color:var(--ep-text, #0f172a);font:inherit}.ep-payment-buttons__selector--labeled{gap:8px;padding:0 12px}.ep-payment-buttons__placeholder{border:var(--ep-buttons-border-width, 1px) dashed var(--ep-buttons-border-color, var(--ep-border, #e2e8f0));opacity:.55;pointer-events:none;-webkit-user-select:none;user-select:none}.ep-payment-buttons--borderless .ep-payment-buttons__selector,.ep-payment-buttons--borderless .ep-payment-buttons__placeholder{border-width:0;box-shadow:none}.ep-payment-buttons__placeholder--loading{opacity:.4}.ep-payment-buttons__placeholder--unavailable{opacity:.35}.ep-payment-buttons__selector{border:var(--ep-buttons-border-width, 1px) solid var(--ep-buttons-border-color, var(--ep-border, #e2e8f0));cursor:pointer;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}.ep-payment-buttons__selector:hover:not(:disabled){border-color:var(--ep-border-strong, #cbd5e1)}.ep-payment-buttons__selector--selected{border-color:var(--ep-accent, #2563eb);background:color-mix(in srgb,var(--ep-accent, #2563eb) 12%,var(--ep-surface, #fff));color:var(--ep-text, #0f172a);box-shadow:0 0 0 1px var(--ep-accent, #2563eb)}.ep-payment-buttons__selector:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-payment-buttons__selector:disabled{opacity:.55;cursor:not-allowed}.ep-payment-buttons__mark{display:inline-flex;align-items:center;justify-content:center;flex:0 1 auto;max-height:calc(var(--ep-buttons-height, 40px) - 8px);max-width:100%;line-height:0;color:inherit}.ep-payment-buttons__mark ::ng-deep .ep-mark{max-height:calc(var(--ep-buttons-height, 40px) - 8px)}.ep-payment-buttons__mark ::ng-deep img,.ep-payment-buttons__mark ::ng-deep svg{max-height:calc(var(--ep-buttons-height, 40px) - 8px);width:auto;display:block}.ep-payment-buttons__mark ::ng-deep .ep-mark__generic rect[opacity=\"0.12\"]{opacity:.22}.ep-payment-buttons__mark ::ng-deep .ep-mark__generic rect[opacity=\"0.35\"]{opacity:.55}.ep-payment-buttons__mark ::ng-deep .ep-mark__generic rect[opacity=\"0.55\"]{opacity:.78}.ep-payment-buttons__label{font-size:13px;font-weight:650;line-height:1.2;white-space:nowrap;color:inherit}.ep-payment-buttons__selector--selected .ep-payment-buttons__label{font-weight:700}.ep-payment-buttons__express,.ep-payment-buttons__mock{box-sizing:border-box;display:flex;align-items:center;width:100%;margin:0;padding:0;background:transparent;border:0;min-height:var(--ep-buttons-height, 40px);overflow:visible}.ep-payment-buttons__mock>*{flex:1 1 auto;width:100%;min-width:0;box-sizing:border-box}.ep-payment-buttons__express:focus,.ep-payment-buttons__express:focus-visible,.ep-payment-buttons__express:focus-within,.ep-payment-buttons__item[data-kind=paypal-express]:focus-within{outline:none;box-shadow:none}.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep iframe,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep iframe:focus,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep iframe:focus-visible,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep .paypal-buttons:focus,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep .paypal-buttons:focus-visible{outline:none!important;box-shadow:none!important}.ep-payment-buttons__item[data-kind=paypal-express] .ep-payment-buttons__express{height:var(--ep-buttons-height, 40px);min-height:var(--ep-buttons-height, 40px);align-items:stretch}.ep-payment-buttons__express ::ng-deep .ep-paypal,.ep-payment-buttons__express ::ng-deep .ep-gpay,.ep-payment-buttons__express ::ng-deep .ep-apay{width:100%}.ep-payment-buttons__panel{width:100%;margin:0;padding:10px 0 0;background:transparent;border:0;border-top:1px solid var(--ep-border, #e2e8f0)}@media(prefers-reduced-motion:reduce){.ep-payment-buttons__selector{transition:none}}\n", ".ep-payment-buttons{position:relative}.ep-payment-buttons__selector,.ep-payment-buttons__placeholder{background:var(--ep-buttons-selector-bg, var(--ep-surface, #fff));color:var(--ep-buttons-selector-text, var(--ep-text, #0f172a));font-family:var(--ep-buttons-selector-font-family, inherit);font-size:var(--ep-buttons-selector-font-size, inherit);font-weight:var(--ep-buttons-selector-font-weight, inherit)}.ep-payment-buttons__selector{padding:var(--ep-buttons-selector-padding, 0 10px)}.ep-payment-buttons__selector--labeled{padding:var(--ep-buttons-selector-padding, 0 12px)}.ep-payment-buttons__selector:hover:not(:disabled){border-color:var(--ep-buttons-selector-hover-border, var(--ep-border-strong, #cbd5e1));background-color:var(--ep-buttons-selector-hover-bg, var(--ep-buttons-selector-bg, var(--ep-surface, #fff)));color:var(--ep-buttons-selector-hover-text, var(--ep-buttons-selector-text, var(--ep-text, #0f172a)))}.ep-payment-buttons__selector--selected{border-color:var(--ep-buttons-selector-selected-border, var(--ep-accent, #2563eb));background:var(--ep-buttons-selector-selected-bg, color-mix(in srgb, var(--ep-accent, #2563eb) 12%, var(--ep-surface, #fff)));color:var(--ep-buttons-selector-selected-text, var(--ep-buttons-selector-text, var(--ep-text, #0f172a)));box-shadow:0 0 0 1px var(--ep-buttons-selector-selected-border, var(--ep-accent, #2563eb))}.ep-payment-buttons__selector:focus-visible{outline:2px solid var(--ep-buttons-selector-focus-color, var(--ep-focus, #2563eb));outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-buttons-selector-focus-color, var(--ep-focus, #2563eb)) 28%,transparent)}.ep-payment-buttons__status{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}\n"], dependencies: [{ kind: "component", type: PaymentMethodIconComponent, selector: "easy-payment-method-icon", inputs: ["method", "theme"] }, { kind: "component", type: StripeCardPaymentComponent, selector: "easy-stripe-card-payment", inputs: ["product", "checkout", "resolvedTheme", "chrome", "cardButtonAppearance"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: PayPalPaymentComponent, selector: "easy-paypal-payment", inputs: ["product", "checkout", "resolvedTheme", "compact"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: GooglePayPaymentComponent, selector: "easy-google-pay-payment", inputs: ["product", "checkout", "resolvedTheme", "compact"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: ApplePayPaymentComponent, selector: "easy-apple-pay-payment", inputs: ["product", "checkout", "resolvedTheme", "compact"], outputs: ["success", "cancel", "error", "started", "busyChange"] }, { kind: "component", type: KlarnaPaymentComponent, selector: "easy-klarna-payment", inputs: ["product", "checkout", "resolvedTheme", "chrome"], outputs: ["success", "cancel", "error", "started", "busyChange", "returning"] }, { kind: "component", type: AffirmPaymentComponent, selector: "easy-affirm-payment", inputs: ["product", "checkout", "resolvedTheme", "chrome"], outputs: ["success", "cancel", "error", "started", "busyChange", "returning"] }, { kind: "component", type: MockMethodPanelComponent, selector: "easy-mock-method-panel", inputs: ["method", "product", "theme", "isMock", "loading", "presentation"], outputs: ["pay"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentButtonsComponent, decorators: [{
            type: Component,
            args: [{ selector: 'easy-payment-buttons', standalone: true, imports: [
                        PaymentMethodIconComponent,
                        StripeCardPaymentComponent,
                        PayPalPaymentComponent,
                        GooglePayPaymentComponent,
                        ApplePayPaymentComponent,
                        KlarnaPaymentComponent,
                        AffirmPaymentComponent,
                        MockMethodPanelComponent,
                    ], changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        class: 'ep-payment-buttons-host',
                        '[class.ep-theme-light]': 'resolvedTheme() === "light"',
                        '[class.ep-theme-dark]': 'resolvedTheme() === "dark"',
                        '[class.ep-payment-buttons-host--horizontal]': 'layout() === "horizontal"',
                        '[class.ep-payment-buttons-host--vertical]': 'layout() === "vertical"',
                        '[attr.data-theme]': 'resolvedTheme()',
                        '[attr.data-layout]': 'layout()',
                        '[attr.data-locale]': 'effectiveLocale()',
                        '[attr.lang]': 'effectiveLocale()',
                        '[attr.data-separators]': 'separatorsEnabled() ? "line" : "none"',
                        '[attr.data-card-ready]': 'hasAvailableCard() ? "true" : "false"',
                        '[attr.data-paypal-ready]': 'hasAvailablePayPal() ? "true" : "false"',
                        '[attr.data-google-pay-ready]': 'hasAvailableGooglePay() ? "true" : "false"',
                        '[attr.data-apple-pay-ready]': 'hasAvailableApplePay() ? "true" : "false"',
                        '[attr.data-klarna-ready]': 'hasAvailableKlarna() ? "true" : "false"',
                        '[attr.data-affirm-ready]': 'hasAvailableAffirm() ? "true" : "false"',
                        '[attr.data-bnpl-confirm-mode]': 'bnplConfirmMode()',
                        '[attr.data-bnpl-direct-active]': 'bnplDirectActive() ? "true" : "false"',
                        '[attr.data-selector-visibility]': 'selectorVisibility()',
                        '[style.--ep-buttons-selector-bg]': 'selectorBackgroundCss()',
                        '[style.--ep-buttons-selector-text]': 'selectorTextCss()',
                        '[style.--ep-buttons-selector-font-family]': 'selectorFontFamilyCss()',
                        '[style.--ep-buttons-selector-font-size]': 'selectorFontSizeCss()',
                        '[style.--ep-buttons-selector-font-weight]': 'selectorFontWeightCss()',
                        '[style.--ep-buttons-selector-padding]': 'selectorPaddingCss()',
                        '[style.--ep-buttons-selector-hover-bg]': 'selectorHoverBackgroundCss()',
                        '[style.--ep-buttons-selector-hover-text]': 'selectorHoverTextCss()',
                        '[style.--ep-buttons-selector-hover-border]': 'selectorHoverBorderCss()',
                        '[style.--ep-buttons-selector-selected-bg]': 'selectorSelectedBackgroundCss()',
                        '[style.--ep-buttons-selector-selected-text]': 'selectorSelectedTextCss()',
                        '[style.--ep-buttons-selector-selected-border]': 'selectorSelectedBorderCss()',
                        '[style.--ep-buttons-selector-disabled-bg]': 'selectorDisabledBackgroundCss()',
                        '[style.--ep-buttons-selector-disabled-text]': 'selectorDisabledTextCss()',
                        '[style.--ep-buttons-selector-loading-bg]': 'selectorLoadingBackgroundCss()',
                        '[style.--ep-buttons-selector-loading-text]': 'selectorLoadingTextCss()',
                        '[style.--ep-buttons-selector-focus-color]': 'selectorFocusOutlineCss()',
                        '[style.--ep-font-family]': 'visualStyleCssVars().fontFamily',
                        '[style.--ep-text]': 'visualStyleCssVars().textColor',
                        '[style.--ep-text-secondary]': 'visualStyleCssVars().textSecondaryColor',
                        '[style.--ep-surface]': 'visualStyleCssVars().surfaceColor',
                        '[style.--ep-accent]': 'visualStyleCssVars().accentColor',
                        '[style.--ep-accent-soft]': 'visualStyleCssVars().accentSoft',
                        '[style.--ep-focus]': 'visualStyleCssVars().accentColor',
                        '[style.--ep-radius]': 'visualStyleCssVars().borderRadius',
                        '[style.--ep-spacing]': 'visualStyleCssVars().spacing',
                        '[style.--ep-buttons-gap]': 'buttonsGapCss()',
                        '[style.--ep-buttons-padding]': 'buttonsPaddingCss()',
                        '[style.--ep-buttons-height]': 'buttonsHeightCss()',
                        '[style.--ep-buttons-min-width]': 'buttonsMinWidthCss()',
                        '[style.--ep-buttons-width]': 'buttonsWidthCss()',
                        '[style.--ep-buttons-slot-width]': 'buttonsSlotWidthCss()',
                        '[style.--ep-buttons-radius]': 'buttonsRadiusCss()',
                        '[style.--ep-buttons-border-width]': 'buttonsBorderWidthCss()',
                        '[style.--ep-buttons-border-color]': 'buttonsBorderColorCss()',
                        '[style.--ep-buttons-separator-color]': 'buttonsSeparatorColorCss()',
                        '[style.--ep-buttons-strip-bg]': 'buttonsStripBackgroundCss()',
                        role: 'region',
                        '[attr.aria-label]': 'regionAriaLabel()',
                    }, providers: [EasyPaymentsI18nService, ThemeService, CheckoutHostContext], template: "<div\r\n  class=\"ep-payment-buttons\"\r\n  [class.ep-payment-buttons--horizontal]=\"layout() === 'horizontal'\"\r\n  [class.ep-payment-buttons--vertical]=\"layout() === 'vertical'\"\r\n  [class.ep-payment-buttons--separators]=\"separatorsEnabled()\"\r\n  [class.ep-payment-buttons--borderless]=\"borderlessSelectors()\"\r\n  data-testid=\"easy-payment-buttons-root\"\r\n>\r\n  @if (showDemoModeNotice()) {\r\n    <p class=\"ep-payment-buttons__demo-notice\" role=\"status\" data-testid=\"easy-payment-buttons-demo-notice\">\r\n      {{ msgs().buttonsDemoModeNotice }}\r\n    </p>\r\n  }\r\n\r\n  @if (noMethodsAvailable()) {\r\n    <p class=\"ep-payment-buttons__empty\" role=\"status\" data-testid=\"easy-payment-buttons-empty\">\r\n      {{ msgs().noPaymentMethodsAvailable }}\r\n    </p>\r\n  }\r\n\r\n  <p class=\"ep-payment-buttons__status\" role=\"status\" aria-live=\"polite\" data-testid=\"easy-payment-buttons-status\">\r\n    @if (processingMethod(); as activeMethod) {\r\n      {{ activeMethod }} busy\r\n    }\r\n  </p>\r\n\r\n  <div\r\n    class=\"ep-payment-buttons__list\"\r\n    role=\"group\"\r\n    [attr.aria-label]=\"regionAriaLabel()\"\r\n  >\r\n    @for (slot of methodSlots(); track slot.method) {\r\n      <!--\r\n        Unavailable slots collapse instead of unmounting: Apple Pay's Stripe\r\n        Express Checkout Element must stay mounted to report eligibility.\r\n      -->\r\n      <div\r\n        class=\"ep-payment-buttons__item\"\r\n        [class.ep-payment-buttons__item--collapsed]=\"slot.state === 'unavailable' || merchantOwnsSelector(slot)\"\r\n        [attr.aria-hidden]=\"slot.state === 'unavailable' || merchantOwnsSelector(slot) ? 'true' : null\"\r\n        [attr.data-method]=\"slot.method\"\r\n        [attr.data-state]=\"slot.state\"\r\n        [attr.data-kind]=\"slot.kind\"\r\n        [attr.data-interactive]=\"slot.interactive ? 'true' : 'false'\"\r\n        [attr.data-mock]=\"slot.isMock ? 'true' : null\"\r\n      >\r\n        @if (\r\n          selectorVisibility() === 'library' &&\r\n          (slot.kind === 'card-selector' ||\r\n            slot.kind === 'klarna-selector' ||\r\n            slot.kind === 'affirm-selector')\r\n        ) {\r\n          <button\r\n            type=\"button\"\r\n            class=\"ep-payment-buttons__selector\"\r\n            [class.ep-payment-buttons__selector--selected]=\"selectedMethod() === slot.method\"\r\n            [class.ep-payment-buttons__selector--mock]=\"slot.isMock\"\r\n            [class.ep-payment-buttons__selector--labeled]=\"slot.showVisibleLabel\"\r\n            [attr.aria-pressed]=\"selectedMethod() === slot.method\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n            [attr.aria-busy]=\"processingMethod() === slot.method ? 'true' : null\"\r\n            [style.background]=\"selectorStateBackground(slot.method)\"\r\n            [style.color]=\"selectorStateColor(slot.method)\"\r\n            [disabled]=\"methodsLocked()\"\r\n            (click)=\"selectMethod(slot.method)\"\r\n          >\r\n            @if (slot.showBrandIcon) {\r\n              <span class=\"ep-payment-buttons__mark\" aria-hidden=\"true\">\r\n                <easy-payment-method-icon [method]=\"slot.method\" [theme]=\"resolvedTheme()\" />\r\n              </span>\r\n            }\r\n            @if (slot.showVisibleLabel) {\r\n              <span class=\"ep-payment-buttons__label\">{{ slot.label }}</span>\r\n            }\r\n          </button>\r\n        } @else if (slot.kind === 'paypal-express') {\r\n          <div\r\n            class=\"ep-payment-buttons__express\"\r\n            data-testid=\"easy-payment-buttons-paypal-express\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-paypal-payment\r\n              [product]=\"product()\"\r\n              [checkout]=\"checkout()\"\r\n              [resolvedTheme]=\"resolvedTheme()\"\r\n              [compact]=\"true\"\r\n              (started)=\"onPayPalStarted()\"\r\n              (busyChange)=\"onPayPalBusy($event)\"\r\n              (success)=\"onPayPalSuccess($event)\"\r\n              (cancel)=\"onPayPalCancel($event)\"\r\n              (error)=\"onPayPalError($event)\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'paypal-mock') {\r\n          <div\r\n            class=\"ep-payment-buttons__mock\"\r\n            data-testid=\"easy-payment-buttons-paypal-mock\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-mock-method-panel\r\n              method=\"paypal\"\r\n              presentation=\"strip\"\r\n              [product]=\"product()\"\r\n              [theme]=\"resolvedTheme()\"\r\n              [isMock]=\"true\"\r\n              [loading]=\"processingMethod() === 'paypal'\"\r\n              (pay)=\"onMockPayPalPay()\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'google-pay-express') {\r\n          <div\r\n            class=\"ep-payment-buttons__express\"\r\n            data-testid=\"easy-payment-buttons-google-pay-express\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-google-pay-payment\r\n              [product]=\"product()\"\r\n              [checkout]=\"checkout()\"\r\n              [resolvedTheme]=\"resolvedTheme()\"\r\n              [compact]=\"true\"\r\n              (started)=\"onGooglePayStarted()\"\r\n              (busyChange)=\"onGooglePayBusy($event)\"\r\n              (success)=\"onGooglePaySuccess($event)\"\r\n              (cancel)=\"onGooglePayCancel($event)\"\r\n              (error)=\"onGooglePayError($event)\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'google-pay-mock') {\r\n          <div\r\n            class=\"ep-payment-buttons__mock\"\r\n            data-testid=\"easy-payment-buttons-google-pay-mock\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-mock-method-panel\r\n              method=\"google-pay\"\r\n              presentation=\"strip\"\r\n              [product]=\"product()\"\r\n              [theme]=\"resolvedTheme()\"\r\n              [isMock]=\"true\"\r\n              [loading]=\"processingMethod() === 'google-pay'\"\r\n              (pay)=\"onMockGooglePayPay()\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'apple-pay-express') {\r\n          <div\r\n            class=\"ep-payment-buttons__express\"\r\n            data-testid=\"easy-payment-buttons-apple-pay-express\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-apple-pay-payment\r\n              [product]=\"product()\"\r\n              [checkout]=\"checkout()\"\r\n              [resolvedTheme]=\"resolvedTheme()\"\r\n              [compact]=\"true\"\r\n              (started)=\"onApplePayStarted()\"\r\n              (busyChange)=\"onApplePayBusy($event)\"\r\n              (success)=\"onApplePaySuccess($event)\"\r\n              (cancel)=\"onApplePayCancel($event)\"\r\n              (error)=\"onApplePayError($event)\"\r\n            />\r\n          </div>\r\n        } @else if (slot.kind === 'apple-pay-mock') {\r\n          <div\r\n            class=\"ep-payment-buttons__mock\"\r\n            data-testid=\"easy-payment-buttons-apple-pay-mock\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <easy-mock-method-panel\r\n              method=\"apple-pay\"\r\n              presentation=\"strip\"\r\n              [product]=\"product()\"\r\n              [theme]=\"resolvedTheme()\"\r\n              [isMock]=\"true\"\r\n              [loading]=\"processingMethod() === 'apple-pay'\"\r\n              (pay)=\"onMockApplePayPay()\"\r\n            />\r\n          </div>\r\n        } @else {\r\n          <div\r\n            class=\"ep-payment-buttons__placeholder\"\r\n            [class.ep-payment-buttons__placeholder--loading]=\"slot.state === 'loading'\"\r\n            [class.ep-payment-buttons__placeholder--unavailable]=\"slot.state === 'unavailable'\"\r\n            [class.ep-payment-buttons__placeholder--mock]=\"slot.isMock\"\r\n            role=\"status\"\r\n            aria-disabled=\"true\"\r\n            [attr.aria-label]=\"slotAriaLabel(slot)\"\r\n          >\r\n            <span class=\"ep-payment-buttons__mark\" aria-hidden=\"true\">\r\n              <easy-payment-method-icon [method]=\"slot.method\" [theme]=\"resolvedTheme()\" />\r\n            </span>\r\n          </div>\r\n        }\r\n      </div>\r\n      @if (separatorsEnabled() && separatorAfter().has(slot.method)) {\r\n        <div class=\"ep-payment-buttons__separator\" aria-hidden=\"true\"></div>\r\n      }\r\n    }\r\n  </div>\r\n\r\n  @if (showStripeCardPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-card-panel\"\r\n      [attr.aria-label]=\"msgs().cardPaymentRegionAria\"\r\n    >\r\n      <easy-stripe-card-payment\r\n        [product]=\"product()\"\r\n        [checkout]=\"checkout()\"\r\n        [resolvedTheme]=\"resolvedTheme()\"\r\n        [cardButtonAppearance]=\"cardButtonAppearance()\"\r\n        chrome=\"minimal\"\r\n        (started)=\"onCardStarted()\"\r\n        (busyChange)=\"onCardBusy($event)\"\r\n        (success)=\"onCardSuccess($event)\"\r\n        (cancel)=\"onCardCancel($event)\"\r\n        (error)=\"onCardError($event)\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showMockCardPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-card-mock-panel\"\r\n      [attr.aria-label]=\"msgs().cardPaymentRegionAria\"\r\n    >\r\n      <easy-mock-method-panel\r\n        method=\"card\"\r\n        presentation=\"expand\"\r\n        [product]=\"product()\"\r\n        [theme]=\"resolvedTheme()\"\r\n        [isMock]=\"true\"\r\n        [loading]=\"processingMethod() === 'card'\"\r\n        (pay)=\"onMockCardPay()\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showKlarnaPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-klarna-panel\"\r\n      [attr.aria-label]=\"msgs().klarnaPaymentRegionAria\"\r\n    >\r\n      <easy-klarna-payment\r\n        [product]=\"product()\"\r\n        [checkout]=\"checkout()\"\r\n        [resolvedTheme]=\"resolvedTheme()\"\r\n        chrome=\"minimal\"\r\n        (started)=\"onKlarnaStarted()\"\r\n        (busyChange)=\"onKlarnaBusy($event)\"\r\n        (success)=\"onKlarnaSuccess($event)\"\r\n        (cancel)=\"onKlarnaCancel($event)\"\r\n        (error)=\"onKlarnaError($event)\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showMockKlarnaPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-klarna-mock-panel\"\r\n      [attr.aria-label]=\"msgs().klarnaPaymentRegionAria\"\r\n    >\r\n      <easy-mock-method-panel\r\n        method=\"klarna\"\r\n        presentation=\"expand\"\r\n        [product]=\"product()\"\r\n        [theme]=\"resolvedTheme()\"\r\n        [isMock]=\"true\"\r\n        [loading]=\"processingMethod() === 'klarna'\"\r\n        (pay)=\"onMockKlarnaPay()\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showAffirmPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-affirm-panel\"\r\n      [attr.aria-label]=\"msgs().affirmPaymentRegionAria\"\r\n    >\r\n      <easy-affirm-payment\r\n        [product]=\"product()\"\r\n        [checkout]=\"checkout()\"\r\n        [resolvedTheme]=\"resolvedTheme()\"\r\n        chrome=\"minimal\"\r\n        (started)=\"onAffirmStarted()\"\r\n        (busyChange)=\"onAffirmBusy($event)\"\r\n        (success)=\"onAffirmSuccess($event)\"\r\n        (cancel)=\"onAffirmCancel($event)\"\r\n        (error)=\"onAffirmError($event)\"\r\n      />\r\n    </section>\r\n  }\r\n\r\n  @if (showMockAffirmPanel()) {\r\n    <section\r\n      class=\"ep-payment-buttons__panel\"\r\n      data-testid=\"easy-payment-buttons-affirm-mock-panel\"\r\n      [attr.aria-label]=\"msgs().affirmPaymentRegionAria\"\r\n    >\r\n      <easy-mock-method-panel\r\n        method=\"affirm\"\r\n        presentation=\"expand\"\r\n        [product]=\"product()\"\r\n        [theme]=\"resolvedTheme()\"\r\n        [isMock]=\"true\"\r\n        [loading]=\"processingMethod() === 'affirm'\"\r\n        (pay)=\"onMockAffirmPay()\"\r\n      />\r\n    </section>\r\n  }\r\n</div>\r\n", styles: ["@charset \"UTF-8\";:host{display:block;width:100%;box-sizing:border-box;background:transparent!important;color:var(--ep-text, #0f172a);font-family:var(--ep-font-family, \"Segoe UI\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif);--ep-surface: #ffffff;--ep-text: #0f172a;--ep-text-secondary: #64748b;--ep-border: #e2e8f0;--ep-border-strong: #cbd5e1;--ep-accent: #2563eb;--ep-accent-soft: #eff6ff;--ep-focus: #2563eb;--ep-radius: 12px;--ep-radius-md: calc(var(--ep-radius) * .625);--ep-spacing: 12px;--ep-cta-bg: #0f172a;--ep-cta-bg-hover: #1e293b;--ep-cta-text: #f8fafc;--ep-success: #15803d;--ep-danger: #b91c1c;--ep-demo-bg: #f1f5f9;--ep-demo-text: #64748b;--ep-buttons-gap: 8px;--ep-buttons-padding: 0px;--ep-buttons-height: 40px;--ep-buttons-min-width: 100px;--ep-buttons-width: auto;--ep-buttons-slot-width: 160px;--ep-buttons-radius: var(--ep-radius-md, 10px);--ep-buttons-border-width: 1px;--ep-buttons-border-color: var(--ep-border, #e2e8f0);--ep-buttons-separator-color: var(--ep-border, #e2e8f0);--ep-buttons-strip-bg: transparent}:host(.ep-theme-dark){--ep-surface: #111827;--ep-text: #f8fafc;--ep-text-secondary: #94a3b8;--ep-border: #243044;--ep-border-strong: #334155;--ep-accent: #60a5fa;--ep-accent-soft: rgba(96, 165, 250, .12);--ep-focus: #93c5fd;--ep-cta-bg: color-mix(in srgb, var(--ep-accent, #60a5fa) 42%, #0b3a82);--ep-cta-bg-hover: color-mix(in srgb, var(--ep-accent, #60a5fa) 55%, #1d4ed8);--ep-cta-text: #f8fafc;--ep-demo-bg: #1e293b;--ep-demo-text: #94a3b8;--ep-buttons-border-color: var(--ep-border, #243044);--ep-buttons-separator-color: var(--ep-border, #243044)}.ep-payment-buttons{display:flex;flex-direction:column;gap:var(--ep-buttons-gap, 8px);width:100%;margin:0;padding:var(--ep-buttons-padding, 0);background:var(--ep-buttons-strip-bg, transparent);border:0;box-shadow:none;box-sizing:border-box}.ep-payment-buttons__demo-notice{margin:0;padding:0;font-size:12px;line-height:1.35;color:var(--ep-text-secondary, #64748b)}.ep-payment-buttons__empty{margin:0;font-size:13px;line-height:1.4;color:var(--ep-text-secondary, #64748b)}.ep-payment-buttons__list{list-style:none;margin:0;padding:0;display:flex;gap:var(--ep-buttons-gap, 8px);width:100%;position:relative;container-type:inline-size;background:transparent;align-items:center}.ep-payment-buttons--vertical .ep-payment-buttons__list{flex-direction:column;align-items:stretch}.ep-payment-buttons--horizontal .ep-payment-buttons__list{flex-direction:row;flex-wrap:wrap;align-items:center}.ep-payment-buttons__item{margin:0;padding:0;min-width:0;display:flex;align-items:center;position:relative;z-index:0}.ep-payment-buttons--horizontal .ep-payment-buttons__item{flex:0 1 var(--ep-buttons-slot-width, 160px);max-width:100%}.ep-payment-buttons--horizontal .ep-payment-buttons__item[data-kind=paypal-express]{min-width:min(100%,150px)}@container (min-width: 308px) and (max-width: 359px){.ep-payment-buttons--horizontal .ep-payment-buttons__item{flex-basis:calc((100% - var(--ep-buttons-gap, 8px)) / 2)}}@container (max-width: 307px){.ep-payment-buttons--horizontal .ep-payment-buttons__item{flex-basis:100%}}.ep-payment-buttons__item--collapsed{position:absolute;inset-inline-start:0;top:0;width:var(--ep-buttons-slot-width, 160px);height:0;min-height:0;overflow:hidden;pointer-events:none}.ep-payment-buttons--vertical .ep-payment-buttons__item{width:100%}.ep-payment-buttons__separator{flex:0 0 auto;align-self:stretch;background:var(--ep-buttons-separator-color, var(--ep-border, #e2e8f0));pointer-events:none}.ep-payment-buttons--horizontal .ep-payment-buttons__separator{width:1px;min-height:calc(var(--ep-buttons-height, 40px) * .5);align-self:center}.ep-payment-buttons--vertical .ep-payment-buttons__separator{width:100%;height:1px}.ep-payment-buttons__selector,.ep-payment-buttons__placeholder{box-sizing:border-box;display:inline-flex;flex-direction:row;align-items:center;justify-content:center;gap:0;width:var(--ep-buttons-width, 100%);min-width:var(--ep-buttons-min-width, 100px);height:var(--ep-buttons-height, 40px);min-height:var(--ep-buttons-height, 40px);padding:0 10px;border-radius:var(--ep-buttons-radius, var(--ep-radius-md, 10px));background:var(--ep-surface, #fff);color:var(--ep-text, #0f172a);font:inherit}.ep-payment-buttons__selector--labeled{gap:8px;padding:0 12px}.ep-payment-buttons__placeholder{border:var(--ep-buttons-border-width, 1px) dashed var(--ep-buttons-border-color, var(--ep-border, #e2e8f0));opacity:.55;pointer-events:none;-webkit-user-select:none;user-select:none}.ep-payment-buttons--borderless .ep-payment-buttons__selector,.ep-payment-buttons--borderless .ep-payment-buttons__placeholder{border-width:0;box-shadow:none}.ep-payment-buttons__placeholder--loading{opacity:.4}.ep-payment-buttons__placeholder--unavailable{opacity:.35}.ep-payment-buttons__selector{border:var(--ep-buttons-border-width, 1px) solid var(--ep-buttons-border-color, var(--ep-border, #e2e8f0));cursor:pointer;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}.ep-payment-buttons__selector:hover:not(:disabled){border-color:var(--ep-border-strong, #cbd5e1)}.ep-payment-buttons__selector--selected{border-color:var(--ep-accent, #2563eb);background:color-mix(in srgb,var(--ep-accent, #2563eb) 12%,var(--ep-surface, #fff));color:var(--ep-text, #0f172a);box-shadow:0 0 0 1px var(--ep-accent, #2563eb)}.ep-payment-buttons__selector:focus-visible{outline:2px solid var(--ep-focus, #2563eb);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-focus, #2563eb) 28%,transparent)}.ep-payment-buttons__selector:disabled{opacity:.55;cursor:not-allowed}.ep-payment-buttons__mark{display:inline-flex;align-items:center;justify-content:center;flex:0 1 auto;max-height:calc(var(--ep-buttons-height, 40px) - 8px);max-width:100%;line-height:0;color:inherit}.ep-payment-buttons__mark ::ng-deep .ep-mark{max-height:calc(var(--ep-buttons-height, 40px) - 8px)}.ep-payment-buttons__mark ::ng-deep img,.ep-payment-buttons__mark ::ng-deep svg{max-height:calc(var(--ep-buttons-height, 40px) - 8px);width:auto;display:block}.ep-payment-buttons__mark ::ng-deep .ep-mark__generic rect[opacity=\"0.12\"]{opacity:.22}.ep-payment-buttons__mark ::ng-deep .ep-mark__generic rect[opacity=\"0.35\"]{opacity:.55}.ep-payment-buttons__mark ::ng-deep .ep-mark__generic rect[opacity=\"0.55\"]{opacity:.78}.ep-payment-buttons__label{font-size:13px;font-weight:650;line-height:1.2;white-space:nowrap;color:inherit}.ep-payment-buttons__selector--selected .ep-payment-buttons__label{font-weight:700}.ep-payment-buttons__express,.ep-payment-buttons__mock{box-sizing:border-box;display:flex;align-items:center;width:100%;margin:0;padding:0;background:transparent;border:0;min-height:var(--ep-buttons-height, 40px);overflow:visible}.ep-payment-buttons__mock>*{flex:1 1 auto;width:100%;min-width:0;box-sizing:border-box}.ep-payment-buttons__express:focus,.ep-payment-buttons__express:focus-visible,.ep-payment-buttons__express:focus-within,.ep-payment-buttons__item[data-kind=paypal-express]:focus-within{outline:none;box-shadow:none}.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep iframe,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep iframe:focus,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep iframe:focus-visible,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep .paypal-buttons:focus,.ep-payment-buttons__item[data-kind=paypal-express] ::ng-deep .paypal-buttons:focus-visible{outline:none!important;box-shadow:none!important}.ep-payment-buttons__item[data-kind=paypal-express] .ep-payment-buttons__express{height:var(--ep-buttons-height, 40px);min-height:var(--ep-buttons-height, 40px);align-items:stretch}.ep-payment-buttons__express ::ng-deep .ep-paypal,.ep-payment-buttons__express ::ng-deep .ep-gpay,.ep-payment-buttons__express ::ng-deep .ep-apay{width:100%}.ep-payment-buttons__panel{width:100%;margin:0;padding:10px 0 0;background:transparent;border:0;border-top:1px solid var(--ep-border, #e2e8f0)}@media(prefers-reduced-motion:reduce){.ep-payment-buttons__selector{transition:none}}\n", ".ep-payment-buttons{position:relative}.ep-payment-buttons__selector,.ep-payment-buttons__placeholder{background:var(--ep-buttons-selector-bg, var(--ep-surface, #fff));color:var(--ep-buttons-selector-text, var(--ep-text, #0f172a));font-family:var(--ep-buttons-selector-font-family, inherit);font-size:var(--ep-buttons-selector-font-size, inherit);font-weight:var(--ep-buttons-selector-font-weight, inherit)}.ep-payment-buttons__selector{padding:var(--ep-buttons-selector-padding, 0 10px)}.ep-payment-buttons__selector--labeled{padding:var(--ep-buttons-selector-padding, 0 12px)}.ep-payment-buttons__selector:hover:not(:disabled){border-color:var(--ep-buttons-selector-hover-border, var(--ep-border-strong, #cbd5e1));background-color:var(--ep-buttons-selector-hover-bg, var(--ep-buttons-selector-bg, var(--ep-surface, #fff)));color:var(--ep-buttons-selector-hover-text, var(--ep-buttons-selector-text, var(--ep-text, #0f172a)))}.ep-payment-buttons__selector--selected{border-color:var(--ep-buttons-selector-selected-border, var(--ep-accent, #2563eb));background:var(--ep-buttons-selector-selected-bg, color-mix(in srgb, var(--ep-accent, #2563eb) 12%, var(--ep-surface, #fff)));color:var(--ep-buttons-selector-selected-text, var(--ep-buttons-selector-text, var(--ep-text, #0f172a)));box-shadow:0 0 0 1px var(--ep-buttons-selector-selected-border, var(--ep-accent, #2563eb))}.ep-payment-buttons__selector:focus-visible{outline:2px solid var(--ep-buttons-selector-focus-color, var(--ep-focus, #2563eb));outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--ep-buttons-selector-focus-color, var(--ep-focus, #2563eb)) 28%,transparent)}.ep-payment-buttons__status{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}\n"] }]
        }], ctorParameters: () => [], propDecorators: { product: [{ type: i0.Input, args: [{ isSignal: true, alias: "product", required: true }] }], methods: [{ type: i0.Input, args: [{ isSignal: true, alias: "methods", required: false }] }], checkout: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkout", required: false }] }], checkoutInstanceId: [{ type: i0.Input, args: [{ isSignal: true, alias: "checkoutInstanceId", required: false }] }], layout: [{ type: i0.Input, args: [{ isSignal: true, alias: "layout", required: false }] }], theme: [{ type: i0.Input, args: [{ isSignal: true, alias: "theme", required: false }] }], locale: [{ type: i0.Input, args: [{ isSignal: true, alias: "locale", required: false }] }], translations: [{ type: i0.Input, args: [{ isSignal: true, alias: "translations", required: false }] }], visualStyle: [{ type: i0.Input, args: [{ isSignal: true, alias: "visualStyle", required: false }] }], buttonsAppearance: [{ type: i0.Input, args: [{ isSignal: true, alias: "buttonsAppearance", required: false }] }], cardButtonAppearance: [{ type: i0.Input, args: [{ isSignal: true, alias: "cardButtonAppearance", required: false }] }], bnplConfirmMode: [{ type: i0.Input, args: [{ isSignal: true, alias: "bnplConfirmMode", required: false }] }], selectorVisibility: [{ type: i0.Input, args: [{ isSignal: true, alias: "selectorVisibility", required: false }] }], started: [{ type: i0.Output, args: ["started"] }], methodChange: [{ type: i0.Output, args: ["methodChange"] }], success: [{ type: i0.Output, args: ["success"] }], cancel: [{ type: i0.Output, args: ["cancel"] }], error: [{ type: i0.Output, args: ["error"] }], pending: [{ type: i0.Output, args: ["pending"] }] } });
function selectorLabel(labels, method) {
    if (!labels || (method !== 'card' && method !== 'klarna' && method !== 'affirm')) {
        return null;
    }
    return sanitizeSelectorLabel(labels[method]);
}
/** Plain text only. Rejects markup so a label cannot inject HTML. */
function sanitizeSelectorLabel(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
    if (!trimmed || trimmed.length > 64 || /[<>]/.test(trimmed)) {
        return null;
    }
    return trimmed;
}
/** CSS custom-property values. Rejects urls, expressions, and stylesheet breaks. */
function cssToken(value, max = 64) {
    if (value == null || value === '') {
        return null;
    }
    const trimmed = String(value).trim();
    if (!trimmed || trimmed.length > max) {
        return null;
    }
    if (/url\s*\(|expression\s*\(|javascript:|[;{}]|[<>]/i.test(trimmed)) {
        return null;
    }
    if (!/^[#%(),.'"+\-\s\w]+$/.test(trimmed)) {
        return null;
    }
    return trimmed;
}

/**
 * Stable diagnostic codes Easy Payments may attach to a method snapshot.
 * `BACKEND_BASE_URL_INVALID` and `BACKEND_ENDPOINT_INVALID` are also emitted as
 * development-console warnings. Availability currently reports the affected
 * method as `PROVIDER_MISCONFIGURED` and does not include the raw URL.
 */
const EASY_PAYMENTS_DIAGNOSTIC_CODES = [
    'PROVIDER_AVAILABILITY_PENDING',
    'PROVIDER_UNAVAILABLE',
    'PROVIDER_MISCONFIGURED',
    'PROVIDER_NOT_CONFIGURED',
    'STRIPE_INITIALIZATION_FAILED',
    'CONFIG_MISSING',
    'CONFIG_INVALID',
    'SDK_LOAD_FAILED',
    'BACKEND_ERROR',
    'BACKEND_BASE_URL_INVALID',
    'BACKEND_ENDPOINT_INVALID',
    'PROVIDER_NOT_IMPLEMENTED',
    'NETWORK_ERROR',
    'AUTHENTICATION_REQUIRED',
    'AUTHENTICATION_FAILED',
    'PRODUCT_INVALID',
    'PAYMENT_FAILED',
    'CARD_DECLINED',
    'PAYMENT_CANCELLED',
    'UNKNOWN',
];
const DIAGNOSTIC_CODE_SET = new Set(EASY_PAYMENTS_DIAGNOSTIC_CODES);
const DIAGNOSTIC_MESSAGES = {
    PROVIDER_AVAILABILITY_PENDING: 'This payment method is still checking availability.',
    PROVIDER_UNAVAILABLE: 'This payment method is unavailable in the current environment.',
    PROVIDER_MISCONFIGURED: 'This payment method is misconfigured.',
    PROVIDER_NOT_CONFIGURED: 'No payment provider is configured for this method.',
    STRIPE_INITIALIZATION_FAILED: 'Stripe failed to initialize. Other providers are unaffected.',
    CONFIG_MISSING: 'Required provider configuration is missing.',
    CONFIG_INVALID: 'Provider configuration is invalid.',
    SDK_LOAD_FAILED: 'The payment provider SDK could not be loaded.',
    BACKEND_ERROR: 'The payment backend could not complete the request.',
    BACKEND_BASE_URL_INVALID: 'backend.baseUrl must be an absolute http or https URL.',
    BACKEND_ENDPOINT_INVALID: 'A backend endpoint must be a relative path or an absolute http(s) URL.',
    PROVIDER_NOT_IMPLEMENTED: 'This payment provider is not implemented.',
    NETWORK_ERROR: 'A network error occurred while preparing this payment method.',
    AUTHENTICATION_REQUIRED: 'Additional authentication is required for this payment method.',
    AUTHENTICATION_FAILED: 'Authentication failed for this payment method.',
    PRODUCT_INVALID: 'The payment product is invalid.',
    PAYMENT_FAILED: 'The payment could not be completed.',
    CARD_DECLINED: 'The card was declined.',
    PAYMENT_CANCELLED: 'The payment was cancelled.',
    UNKNOWN: 'This payment method is unavailable.',
};
const READY_MESSAGE = 'This payment method is ready.';
const LOADING_MESSAGE = 'This payment method is still loading.';
const UNAVAILABLE_MESSAGE = 'This payment method is unavailable.';
const MISCONFIGURED_MESSAGE = 'This payment method is misconfigured.';
/**
 * Public, read-only view of payment-method readiness.
 *
 * Projects the root `PaymentOrchestratorService` availability snapshot (the
 * latest `refreshAvailability` call in the app). It does not calculate a
 * second readiness result, poll, or read browser globals. Per-checkout tile
 * visibility is owned by each component's local availability session and may
 * differ from this global projection when multiple hosts are mounted.
 */
class EasyPaymentsDiagnosticsService {
    orchestrator = inject(PaymentOrchestratorService);
    /** Updates when availability is published or cleared. */
    diagnostics = computed(() => this.freezeSnapshot(this.projectSnapshot()), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "diagnostics" }] : /* istanbul ignore next */ []));
    /** Frozen copy of the current snapshot. */
    snapshot() {
        return this.freezeSnapshot(this.diagnostics());
    }
    /** Frozen copy of one method, or undefined when that method is not in the snapshot. */
    method(method) {
        const found = this.diagnostics().methods.find((entry) => entry.method === method);
        return found ? this.cloneDiagnostic(found) : undefined;
    }
    projectSnapshot() {
        return {
            published: this.orchestrator.availabilityPublished(),
            methods: this.orchestrator.availableMethods().map((entry) => this.toDiagnostic(entry)),
        };
    }
    toDiagnostic(entry) {
        const readiness = this.readinessOf(entry);
        const code = readiness === 'ready' ? undefined : this.knownCode(entry.diagnosticCode);
        return {
            method: entry.method,
            provider: PAYMENT_METHOD_PROVIDER_MAP[entry.method],
            readiness,
            ...(code ? { code } : {}),
            message: this.messageFor(readiness, code),
            mock: entry.isMock,
        };
    }
    readinessOf(entry) {
        if (entry.readiness) {
            return entry.readiness;
        }
        if (entry.status === 'checking') {
            return 'loading';
        }
        if (entry.available || entry.status === 'available') {
            return 'ready';
        }
        return 'unavailable';
    }
    knownCode(code) {
        if (code && DIAGNOSTIC_CODE_SET.has(code)) {
            return code;
        }
        return undefined;
    }
    messageFor(readiness, code) {
        if (readiness === 'ready') {
            return READY_MESSAGE;
        }
        if (code) {
            return sanitizeDiagnosticText(DIAGNOSTIC_MESSAGES[code]);
        }
        if (readiness === 'loading') {
            return LOADING_MESSAGE;
        }
        if (readiness === 'misconfigured') {
            return MISCONFIGURED_MESSAGE;
        }
        return UNAVAILABLE_MESSAGE;
    }
    cloneDiagnostic(entry) {
        return Object.freeze({
            method: entry.method,
            provider: entry.provider,
            readiness: entry.readiness,
            ...(entry.code ? { code: entry.code } : {}),
            message: entry.message,
            mock: entry.mock,
        });
    }
    freezeSnapshot(snapshot) {
        return Object.freeze({
            published: snapshot.published,
            methods: Object.freeze(snapshot.methods.map((entry) => this.cloneDiagnostic(entry))),
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsDiagnosticsService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsDiagnosticsService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsDiagnosticsService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

const ALL_METHODS = new Set([
    'apple-pay',
    'google-pay',
    'paypal',
    'klarna',
    'affirm',
    'card',
]);
function isKnownPaymentMethod(value) {
    return ALL_METHODS.has(value);
}
function interactionForMethod(method, isMock) {
    if (isMock) {
        return 'mock';
    }
    switch (method) {
        case 'paypal':
            return 'paypal-buttons';
        case 'google-pay':
        case 'apple-pay':
            return 'wallet-button';
        case 'card':
        case 'klarna':
        case 'affirm':
            return 'confirm';
        default: {
            const _exhaustive = method;
            return _exhaustive;
        }
    }
}
function readinessOf(entry) {
    if (entry.readiness) {
        return entry.readiness;
    }
    if (entry.status === 'checking') {
        return 'loading';
    }
    if (entry.available || entry.status === 'available') {
        return 'ready';
    }
    if (entry.diagnosticCode === 'CONFIG_MISSING' ||
        entry.diagnosticCode === 'CONFIG_INVALID' ||
        entry.diagnosticCode === 'PROVIDER_NOT_CONFIGURED' ||
        entry.diagnosticCode === 'PROVIDER_MISCONFIGURED') {
        return 'misconfigured';
    }
    return 'unavailable';
}
/**
 * Maps orchestrator availability into Headless method status.
 * Apple Pay `checking` / loading is preserved — H2 does not invent unavailability.
 */
function toHeadlessMethodStatus(entry) {
    const readiness = readinessOf(entry);
    const interaction = interactionForMethod(entry.method, entry.isMock);
    const status = {
        method: entry.method,
        provider: PAYMENT_METHOD_PROVIDER_MAP[entry.method],
        readiness,
        available: entry.available === true && readiness === 'ready',
        requiresMount: true,
        interaction,
        mock: entry.isMock,
    };
    if (entry.diagnosticCode) {
        status.diagnosticCode = entry.diagnosticCode;
    }
    if (entry.method === 'apple-pay' && (readiness === 'loading' || entry.status === 'checking')) {
        status.readinessNote =
            'Apple Pay eligibility is confirmed after mount("apple-pay") renders the Stripe Express Checkout Element.';
    }
    return status;
}

/**
 * True when the Headless availability projection says this method runs on a mock adapter
 * (`enableMockMode`). Mock methods never touch Stripe.js, the PayPal SDK, wallet SDKs,
 * or any backend URL — see {@link renderHeadlessMockSurface}.
 */
function isMockHeadlessStatus(status) {
    return !!status && (status.mock === true || status.interaction === 'mock');
}
/** Wallet-style mock methods start payment from the mounted DEMO control (buyer click). */
function isMockWalletMethod(method) {
    return method === 'paypal' || method === 'google-pay' || method === 'apple-pay';
}
/**
 * Renders a DEMO consumer surface into a merchant-owned container.
 *
 * - Confirm-style methods: a non-interactive DEMO panel (merchant CTA calls `confirm()`).
 * - Wallet-style methods: a compact DEMO button with the same default sizing tokens as the
 *   Buttons Only mock strip (`--ep-buttons-height` / `--ep-buttons-width`, 40px default).
 *
 * Uses DOM APIs with `textContent` only. No SDKs, no network.
 */
function renderHeadlessMockSurface(container, options) {
    const { method, theme, messages, onActivate } = options;
    const doc = container.ownerDocument;
    const label = method === 'card' ? messages.methodCard : PAYMENT_METHOD_LABELS[method];
    const dark = theme === 'dark';
    const text = dark ? '#f8fafc' : '#0f172a';
    const secondary = dark ? '#94a3b8' : '#64748b';
    const surface = dark ? '#1e293b' : '#ffffff';
    const border = dark ? '#334155' : '#e2e8f0';
    const root = doc.createElement('div');
    root.setAttribute('data-easy-headless-mock', method);
    root.setAttribute('data-testid', 'easy-headless-mock');
    root.style.cssText = [
        'box-sizing:border-box',
        'font-family:var(--ep-font-family, inherit)',
        `color:var(--ep-text, ${text})`,
    ].join(';');
    let button = null;
    let busyLabel = null;
    let idleNodes = [];
    const badge = () => {
        const el = doc.createElement('span');
        el.textContent = 'DEMO';
        el.setAttribute('data-testid', 'easy-headless-mock-badge');
        el.style.cssText = [
            'display:inline-block',
            'padding:1px 6px',
            'border-radius:999px',
            'font-size:10px',
            'font-weight:700',
            'letter-spacing:0.06em',
            `color:var(--ep-text-secondary, ${secondary})`,
            `border:1px solid var(--ep-border, ${border})`,
        ].join(';');
        return el;
    };
    if (onActivate && isMockWalletMethod(method)) {
        button = doc.createElement('button');
        button.type = 'button';
        button.setAttribute('data-testid', 'easy-headless-mock-pay');
        button.setAttribute('aria-label', interpolate(messages.demoWalletButtonAria, { method: label }));
        button.style.cssText = [
            'box-sizing:border-box',
            'display:inline-flex',
            'align-items:center',
            'justify-content:center',
            'gap:8px',
            'width:var(--ep-buttons-width, 100%)',
            'min-width:var(--ep-buttons-min-width, 100px)',
            'height:var(--ep-buttons-height, 40px)',
            'min-height:var(--ep-buttons-height, 40px)',
            'padding:0 12px',
            `border:var(--ep-buttons-border-width, 1px) solid var(--ep-buttons-border-color, var(--ep-border, ${border}))`,
            `border-radius:var(--ep-buttons-radius, var(--ep-radius-md, 10px))`,
            `background:var(--ep-surface, ${surface})`,
            `color:var(--ep-text, ${text})`,
            'font:inherit',
            'font-weight:600',
            'cursor:pointer',
        ].join(';');
        const name = doc.createElement('span');
        name.textContent = label;
        idleNodes = [name, badge()];
        for (const node of idleNodes) {
            button.appendChild(node);
        }
        busyLabel = doc.createElement('span');
        busyLabel.textContent = messages.processingPayment;
        busyLabel.hidden = true;
        button.appendChild(busyLabel);
        button.addEventListener('click', () => {
            if (button?.disabled) {
                return;
            }
            onActivate();
        });
        root.appendChild(button);
    }
    else {
        root.style.cssText += [
            ';display:flex',
            'flex-direction:column',
            'gap:6px',
            'padding:12px 14px',
            `border:1px solid var(--ep-border, ${border})`,
            `border-radius:var(--ep-radius-md, 10px)`,
            `background:var(--ep-surface, ${surface})`,
        ].join(';');
        const header = doc.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:650';
        const title = doc.createElement('span');
        title.textContent = interpolate(messages.payWithMethod, { method: label });
        header.append(title, badge());
        const hint = doc.createElement('p');
        hint.textContent = messages.demoCheckoutHint;
        hint.style.cssText = `margin:0;font-size:13px;color:var(--ep-text-secondary, ${secondary})`;
        root.append(header, hint);
    }
    container.appendChild(root);
    let destroyed = false;
    return {
        element: root,
        setBusy(busy) {
            if (!button || destroyed) {
                return;
            }
            button.disabled = busy;
            button.setAttribute('aria-busy', String(busy));
            button.style.opacity = busy ? '0.6' : '';
            button.style.cursor = busy ? 'not-allowed' : 'pointer';
            for (const node of idleNodes) {
                node.hidden = busy;
            }
            if (busyLabel) {
                busyLabel.hidden = !busy;
            }
        },
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            root.remove();
        },
    };
}

/**
 * Resolves a Headless session theme without mutating the root ThemeService
 * (multi-session isolation).
 */
function resolveHeadlessTheme(theme, prefersDark) {
    if (theme === 'light' || theme === 'dark') {
        return theme;
    }
    // `system` or omitted
    return prefersDark ? 'dark' : 'light';
}

function isStripeElementMethod(method) {
    return method === 'card' || method === 'klarna' || method === 'affirm';
}
function isMountableMethod(method) {
    return (isStripeElementMethod(method) ||
        method === 'paypal' ||
        method === 'google-pay' ||
        method === 'apple-pay');
}
/**
 * Independently owned Headless session.
 * H3.1: Stripe Card. H3.2: Klarna + Affirm. H3.3: PayPal Buttons.
 * H3.4: Google Pay button. H3.5: Apple Pay Express Checkout Element.
 * H4.3: Klarna/Affirm redirect recovery via {@link StripeRedirectRecoveryService}.
 */
class HeadlessCheckoutSessionImpl {
    id;
    /** Stripe redirect ownership host kind — Headless only (never checkout/buttons). */
    kind = 'headless';
    product;
    methods;
    checkout;
    locale;
    /** Retained for future localized Headless chrome / H3.x providers. */
    translations;
    theme;
    orchestrator;
    sessionRegistry;
    browser;
    config;
    stripeCard;
    klarna;
    affirm;
    paypal;
    googlePay;
    applePay;
    stripeRedirectRecovery;
    availability = new CheckoutAvailabilitySession();
    /** Stripe Element / PayPal / Google Pay owner — equals Headless session id for isolation. */
    stripeOwnerId;
    /**
     * Merchant-stable id for Klarna/Affirm pending markers; null when auto-generated.
     * Distinct from runtime session id — never invent a recovery identity after redirect.
     */
    stableCheckoutIdentity;
    /** Same as session id — scopes PayPal createOrder concurrency to this session. */
    paypalOrderOwnerId;
    /** Same as session id — scopes Google Pay payWithGooglePay concurrency to this session. */
    googlePayOwnerId;
    _state = signal('idle', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_state" }] : /* istanbul ignore next */ []));
    _selectedMethod = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_selectedMethod" }] : /* istanbul ignore next */ []));
    _availableMethods = signal([], /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_availableMethods" }] : /* istanbul ignore next */ []));
    _lastError = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_lastError" }] : /* istanbul ignore next */ []));
    _lastResult = signal(null, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "_lastResult" }] : /* istanbul ignore next */ []));
    state = this._state.asReadonly();
    selectedMethod = this._selectedMethod.asReadonly();
    availableMethods = this._availableMethods.asReadonly();
    lastError = this._lastError.asReadonly();
    lastResult = this._lastResult.asReadonly();
    started$ = new Subject();
    methodChange$ = new Subject();
    pending$ = new Subject();
    success$ = new Subject();
    cancel$ = new Subject();
    error$ = new Subject();
    events = {
        started: this.started$.asObservable(),
        methodChange: this.methodChange$.asObservable(),
        pending: this.pending$.asObservable(),
        success: this.success$.asObservable(),
        cancel: this.cancel$.asObservable(),
        error: this.error$.asObservable(),
    };
    initPromise = null;
    refreshGeneration = 0;
    released = false;
    mountGeneration = 0;
    mountedMethod = null;
    confirmGeneration = 0;
    terminalEmittedForConfirm = 0;
    /** Ownership-scoped PayPal Buttons mount id from {@link PayPalAdapter.renderButtons}. */
    paypalButtonsMountId = null;
    /** This session's most recent PayPal order id (never a sibling's). */
    paypalCurrentOrderId = null;
    paypalCaptureEmitted = false;
    paypalAttemptAnnounced = false;
    /** Ownership-scoped Google Pay button mount id from {@link GooglePayAdapter.renderOfficialButton}. */
    googlePayButtonMountId = null;
    googlePayAttemptAnnounced = false;
    /** Guards duplicate in-flight click handling for this mount generation. */
    googlePayClickInFlight = false;
    /** Ownership-scoped Apple Pay ECE mount id from {@link ApplePayAdapter.mountExpressCheckout}. */
    applePayEceMountId = null;
    applePayAttemptAnnounced = false;
    /**
     * DEMO surface mounted for a mock-adapter method (`enableMockMode`). Non-null only while a
     * mock mount is active; real Stripe / PayPal / wallet adapters are never used for it.
     */
    mockSurface = null;
    /** Guards duplicate in-flight DEMO wallet clicks for this mount generation. */
    mockClickInFlight = false;
    /** In-flight recoverReturn() promise (idempotent concurrent callers). */
    recoverPromise = null;
    /** True after this session owned and applied (or failed) a consume for the current page load. */
    recoverSettled = false;
    /** True while registered with {@link StripeRedirectRecoveryService}. */
    returnHostRegistered = false;
    constructor(deps) {
        this.id = deps.id;
        this.stripeOwnerId = deps.id;
        this.stableCheckoutIdentity = deps.stableCheckoutIdentity;
        this.paypalOrderOwnerId = deps.id;
        this.googlePayOwnerId = deps.id;
        this.product = deps.product;
        this.methods = deps.methods;
        this.checkout = deps.checkout;
        this.locale = deps.locale ?? 'auto';
        this.translations = deps.translations;
        this.theme = deps.theme;
        this.orchestrator = deps.orchestrator;
        this.sessionRegistry = deps.registry;
        this.browser = deps.browser;
        this.config = deps.config;
        this.stripeCard = deps.stripeCard;
        this.klarna = deps.klarna;
        this.affirm = deps.affirm;
        this.paypal = deps.paypal;
        this.googlePay = deps.googlePay;
        this.applePay = deps.applePay;
        this.stripeRedirectRecovery = deps.stripeRedirectRecovery;
        void this.translations;
        this.stripeRedirectRecovery.registerHost(this);
        this.returnHostRegistered = true;
    }
    /** {@link StripeReturnHost} — product correlated with the pending Headless marker. */
    productId() {
        return this.product.id;
    }
    /**
     * {@link StripeReturnHost} — merchant-stable id when present; otherwise the runtime session id
     * (which cannot match a Headless BNPL marker by design).
     */
    instanceId() {
        return this.stableCheckoutIdentity ?? this.id;
    }
    async initialize() {
        this.assertNotDestroyed('initialize');
        if (this._state() === 'ready') {
            return;
        }
        if (this.initPromise) {
            return this.initPromise;
        }
        this._state.set('initializing');
        this._lastError.set(null);
        const generation = this.refreshGeneration;
        this.initPromise = (async () => {
            try {
                this.assertProduct();
                await this.orchestrator.initialize();
                this.throwIfDestroyedOrStale(generation, 'initialize');
                await this.publishAvailability(generation);
                this.throwIfDestroyedOrStale(generation, 'initialize');
                this._state.set('ready');
            }
            catch (error) {
                if (this._state() === 'destroyed' || generation !== this.refreshGeneration) {
                    if (this._state() === 'destroyed') {
                        throw new PaymentError({
                            code: 'PROVIDER_UNAVAILABLE',
                            message: 'Headless checkout session was destroyed during initialize().',
                        });
                    }
                    throw normalizeError(error);
                }
                const paymentError = normalizeError(error);
                this._lastError.set(paymentError);
                this._state.set('error');
                this.emitError(paymentError);
                throw paymentError;
            }
            finally {
                this.initPromise = null;
            }
        })();
        return this.initPromise;
    }
    async refreshAvailability() {
        this.assertNotDestroyed('refreshAvailability');
        if (this.initPromise) {
            await this.initPromise;
            this.assertNotDestroyed('refreshAvailability');
        }
        if (this._state() === 'idle') {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Call initialize() before refreshAvailability().',
            });
        }
        if (this._state() === 'error' && !this.mountedMethod) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Session is in error state. Call initialize() to retry.',
            });
        }
        const generation = ++this.refreshGeneration;
        return this.publishAvailability(generation);
    }
    selectMethod(method) {
        this.assertNotDestroyed('selectMethod');
        this.assertNotPaymentLocked('selectMethod');
        if (method !== null && !this.methods.includes(method)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: `Payment method "${method}" is not configured for this Headless session.`,
                method,
                provider: PAYMENT_METHOD_PROVIDER_MAP[method],
            });
        }
        this.applySelection(method);
    }
    async mount(method, container) {
        this.assertNotDestroyed('mount');
        // Lock before yielding. Otherwise initialize() flushing claim microtasks can
        // finish recovery and let mount/confirm start against a return already in flight.
        this.assertNotPaymentLocked('mount', method);
        if (this.initPromise) {
            await this.initPromise;
            this.assertNotDestroyed('mount');
            this.assertNotPaymentLocked('mount', method);
        }
        if (this._state() === 'idle' || this._state() === 'initializing') {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Call initialize() before mount().',
            });
        }
        this.assertNotPaymentLocked('mount', method);
        if (!isMountableMethod(method)) {
            throw new PaymentError({
                code: 'PROVIDER_NOT_IMPLEMENTED',
                message: 'Headless mount currently supports "card", "klarna", "affirm", "paypal", "google-pay", and "apple-pay".',
                method,
                provider: PAYMENT_METHOD_PROVIDER_MAP[method],
            });
        }
        if (!this.methods.includes(method)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: `Payment method "${method}" is not configured for this Headless session.`,
                method,
                provider: this.providerOf(method),
            });
        }
        if (!container || typeof container !== 'object' || container.nodeType !== 1) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'mount() requires a valid HTMLElement container.',
                method,
                provider: this.providerOf(method),
            });
        }
        const methodStatus = this._availableMethods().find((entry) => entry.method === method);
        // enableMockMode: the registered adapter is a mock. Availability comes from the mock
        // controller, so skip the real Apple Pay ECE config gate (which would report unconfigured).
        const isMock = isMockHeadlessStatus(methodStatus);
        if (method === 'apple-pay' && !isMock) {
            this.assertApplePayMountable(methodStatus);
        }
        else if (!methodStatus?.available) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `${methodLabel(method)} is not available for this Headless session configuration.`,
                method,
                provider: this.providerOf(method),
            });
        }
        this.applySelection(method);
        const mountGen = ++this.mountGeneration;
        this.mountedMethod = null;
        this.paypalCaptureEmitted = false;
        this.paypalAttemptAnnounced = false;
        this.paypalCurrentOrderId = null;
        this.googlePayAttemptAnnounced = false;
        this.googlePayClickInFlight = false;
        this.applePayAttemptAnnounced = false;
        this.mockClickInFlight = false;
        await this.teardownActiveMounts();
        // WHY mock bypasses the real adapters: `enableMockMode` registers mock adapters in the
        // orchestrator, but Headless owns its own provider instances (Stripe / PayPal / wallets)
        // for mount/confirm. Using them here would call real SDK + backend paths
        // (createPaymentSession → affirmCreatePaymentUrl, PayPal clientId, …) and fail with
        // CONFIG_MISSING even though availability correctly reported `interaction: 'mock'`.
        // Mock methods mount a DEMO surface and settle through `orchestrator.processPayment`
        // (MockPaymentController outcomes) instead. No fake endpoints; errors are surfaced as-is.
        if (isMock) {
            return this.mountMock(method, container, mountGen);
        }
        if (method === 'paypal') {
            return this.mountPayPal(container, mountGen);
        }
        if (method === 'google-pay') {
            return this.mountGooglePay(container, mountGen);
        }
        if (method === 'apple-pay') {
            return this.mountApplePay(container, mountGen);
        }
        return this.mountStripeElement(method, container, mountGen);
    }
    /**
     * Mock mount: DEMO surface only (no Stripe.js / PayPal SDK / backend URLs).
     * - card / klarna / affirm: DEMO panel; the merchant CTA calls `confirm()`.
     * - paypal / google-pay / apple-pay: DEMO button; the buyer click starts payment.
     */
    async mountMock(method, container, mountGen) {
        this.throwIfDestroyedOrMountStale(mountGen, 'mount', method);
        const prefersDark = this.browser.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
        const theme = resolveHeadlessTheme(this.theme, prefersDark);
        const messages = resolveMessages(resolveEffectiveLocale(this.locale), this.translations);
        const surface = renderHeadlessMockSurface(container, {
            method,
            theme,
            messages,
            onActivate: isMockWalletMethod(method)
                ? () => {
                    void this.onMockWalletClick(method, mountGen);
                }
                : undefined,
        });
        this.mockSurface = surface;
        this.mountedMethod = method;
        this._lastError.set(null);
        if (this._state() === 'error' || this._state() === 'cancelled' || this._state() === 'success') {
            this._state.set('ready');
        }
        let unmounted = false;
        return {
            method,
            unmount: () => {
                if (unmounted) {
                    return;
                }
                unmounted = true;
                if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                    surface.destroy();
                    return;
                }
                this.mountGeneration += 1;
                this.mountedMethod = null;
                this.mockClickInFlight = false;
                if (this.mockSurface === surface) {
                    this.mockSurface = null;
                }
                surface.destroy();
                // An in-flight mock payment is now stale and will not settle; do not leave the
                // session locked in `processing`.
                if (this._state() === 'processing') {
                    this._state.set('ready');
                }
            },
        };
    }
    /** DEMO wallet click: starts payment through the orchestrator (mock adapter), once per click. */
    async onMockWalletClick(method, mountGen) {
        if (this._state() === 'destroyed' ||
            mountGen !== this.mountGeneration ||
            this.mockClickInFlight ||
            this._state() === 'processing' ||
            this._state() === 'success' ||
            this._state() === 'pending') {
            return;
        }
        this.mockClickInFlight = true;
        const confirmGen = ++this.confirmGeneration;
        this.terminalEmittedForConfirm = 0;
        this._lastError.set(null);
        this._state.set('processing');
        this.emitStarted(method);
        this.mockSurface?.setBusy(true);
        try {
            await this.settleMockPayment(method, mountGen, confirmGen);
        }
        catch {
            // Already surfaced via lastError / events.error.
        }
        finally {
            if (mountGen === this.mountGeneration) {
                this.mockClickInFlight = false;
                this.mockSurface?.setBusy(false);
                this.restoreMockReadyAfterTerminal(mountGen);
            }
        }
    }
    /** `confirm()` for a mounted mock card / klarna / affirm. */
    async confirmMock(method) {
        const mountGen = this.mountGeneration;
        const confirmGen = ++this.confirmGeneration;
        this.terminalEmittedForConfirm = 0;
        this._lastError.set(null);
        this._state.set('processing');
        this.emitStarted(method);
        await this.settleMockPayment(method, mountGen, confirmGen);
    }
    /**
     * Runs the mock payment through the orchestrator and emits exactly one terminal event
     * (success / pending / cancel / error). Throws on failure after emitting, like real confirm().
     */
    async settleMockPayment(method, mountGen, confirmGen) {
        try {
            const result = await this.orchestrator.processPayment(method, this.product, this.checkout);
            if (this.isConfirmStale(mountGen, confirmGen)) {
                return;
            }
            // applyPaymentResult maps success / processing / cancelled / failed and dedupes terminals.
            this.applyPaymentResult(result, confirmGen, method);
        }
        catch (error) {
            if (this.isConfirmStale(mountGen, confirmGen)) {
                return;
            }
            const paymentError = normalizeError(error, {
                method,
                provider: this.providerOf(method),
            });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.applyPaymentResult({
                    status: 'cancelled',
                    method,
                    provider: this.providerOf(method),
                    message: paymentError.message,
                }, confirmGen, method);
                return;
            }
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, confirmGen);
            throw paymentError;
        }
    }
    /** DEMO wallet control stays mounted after cancel/error so the buyer can retry. */
    restoreMockReadyAfterTerminal(mountGen) {
        queueMicrotask(() => {
            if (this._state() === 'destroyed' ||
                mountGen !== this.mountGeneration ||
                !this.mockSurface ||
                this.mountedMethod === null ||
                !isMockWalletMethod(this.mountedMethod)) {
                return;
            }
            if (this._state() === 'cancelled' || this._state() === 'error') {
                this._state.set('ready');
            }
        });
    }
    async mountStripeElement(method, container, mountGen) {
        const adapter = this.adapterFor(method);
        try {
            const prefersDark = this.browser.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
            const resolvedTheme = resolveHeadlessTheme(this.theme, prefersDark);
            const effectiveLocale = resolveEffectiveLocale(this.locale);
            const elementsLocale = toStripeElementsLocale(effectiveLocale);
            const paymentSession = await this.createStripeElementSession(method, effectiveLocale);
            this.throwIfDestroyedOrMountStale(mountGen, 'mount', method);
            await adapter.mountPaymentElement(container, paymentSession.clientSecret, resolvedTheme, elementsLocale, this.stripeOwnerId);
            this.throwIfDestroyedOrMountStale(mountGen, 'mount', method);
            if (!adapter.hasMountedElement(this.stripeOwnerId)) {
                throw new PaymentError({
                    code: 'SDK_LOAD_FAILED',
                    message: `${methodLabel(method)} Payment Element failed to mount.`,
                    method,
                    provider: this.providerOf(method),
                });
            }
            this.mountedMethod = method;
            this._lastError.set(null);
            if (this._state() === 'error' || this._state() === 'cancelled' || this._state() === 'success') {
                this._state.set('ready');
            }
            return this.createStripeMountHandle(method, mountGen);
        }
        catch (error) {
            if (this._state() !== 'destroyed' && mountGen === this.mountGeneration) {
                this.mountedMethod = null;
                adapter.unmountPaymentElement(this.stripeOwnerId);
            }
            if (this._state() === 'destroyed') {
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Headless checkout session was destroyed during mount().',
                    method,
                    provider: this.providerOf(method),
                });
            }
            const paymentError = normalizeError(error, {
                method,
                provider: this.providerOf(method),
            });
            this._lastError.set(paymentError);
            this.emitError(paymentError);
            throw paymentError;
        }
    }
    async mountPayPal(container, mountGen) {
        try {
            const effectiveLocale = resolveEffectiveLocale(this.locale);
            await this.paypal.ensureSdkLoaded(effectiveLocale);
            this.throwIfDestroyedOrMountStale(mountGen, 'mount', 'paypal');
            const mountId = await this.paypal.renderButtons(container, {
                createOrder: () => this.onPayPalCreateOrder(mountGen),
                onApprove: (data) => this.onPayPalApprove(data.orderID, mountGen),
                onCancel: () => this.onPayPalCancel(mountGen),
                onError: (err) => this.onPayPalSdkError(err, mountGen),
                onClick: async (_data, actions) => {
                    if (this._state() === 'destroyed' ||
                        mountGen !== this.mountGeneration ||
                        this.paypal.isBusy(this.paypalOrderOwnerId, this.paypalCurrentOrderId) ||
                        this._state() === 'success' ||
                        this._state() === 'pending') {
                        await actions.reject();
                        return;
                    }
                    await actions.resolve();
                },
            }, effectiveLocale, this.paypalButtonsMountId ?? undefined);
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                await this.paypal.destroyButtons(mountId);
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Headless checkout session was destroyed during mount().',
                    method: 'paypal',
                    provider: 'paypal',
                });
            }
            this.paypalButtonsMountId = mountId;
            this.mountedMethod = 'paypal';
            this._lastError.set(null);
            if (this._state() === 'error' || this._state() === 'cancelled' || this._state() === 'success') {
                this._state.set('ready');
            }
            return this.createPayPalMountHandle(mountGen, mountId);
        }
        catch (error) {
            if (this._state() !== 'destroyed' && mountGen === this.mountGeneration) {
                this.mountedMethod = null;
                const id = this.paypalButtonsMountId;
                this.paypalButtonsMountId = null;
                if (id) {
                    await this.paypal.destroyButtons(id);
                }
            }
            if (this._state() === 'destroyed') {
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Headless checkout session was destroyed during mount().',
                    method: 'paypal',
                    provider: 'paypal',
                });
            }
            const paymentError = error instanceof PaymentError
                ? error
                : mapPayPalError(error, 'PROVIDER_UNAVAILABLE', 'PayPal Buttons failed to initialize.');
            this._lastError.set(paymentError);
            this.emitError(paymentError);
            throw paymentError;
        }
    }
    async mountGooglePay(container, mountGen) {
        try {
            const prefersDark = this.browser.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
            const resolvedTheme = resolveHeadlessTheme(this.theme, prefersDark);
            const effectiveLocale = resolveEffectiveLocale(this.locale);
            const buttonLocale = toGooglePayButtonLocale(effectiveLocale);
            this.throwIfDestroyedOrMountStale(mountGen, 'mount', 'google-pay');
            const mountId = await this.googlePay.renderOfficialButton(container, {
                theme: resolvedTheme,
                buttonLocale,
                onClick: () => this.onGooglePayClick(mountGen),
            }, this.googlePayButtonMountId ?? undefined);
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                this.googlePay.destroyButtonMount(mountId);
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Headless checkout session was destroyed during mount().',
                    method: 'google-pay',
                    provider: 'googlePay',
                });
            }
            this.googlePayButtonMountId = mountId;
            this.mountedMethod = 'google-pay';
            this._lastError.set(null);
            if (this._state() === 'error' || this._state() === 'cancelled' || this._state() === 'success') {
                this._state.set('ready');
            }
            return this.createGooglePayMountHandle(mountGen, mountId);
        }
        catch (error) {
            if (this._state() !== 'destroyed' && mountGen === this.mountGeneration) {
                this.mountedMethod = null;
                const id = this.googlePayButtonMountId;
                this.googlePayButtonMountId = null;
                if (id) {
                    this.googlePay.destroyButtonMount(id);
                }
            }
            if (this._state() === 'destroyed') {
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Headless checkout session was destroyed during mount().',
                    method: 'google-pay',
                    provider: 'googlePay',
                });
            }
            const paymentError = error instanceof PaymentError
                ? error
                : mapGooglePayError(error, 'SDK_LOAD_FAILED', 'Failed to initialize Google Pay.');
            this._lastError.set(paymentError);
            this.emitError(paymentError);
            throw paymentError;
        }
    }
    /**
     * Apple Pay eligibility is decided by the Express Checkout Element `ready` event.
     * Allow mount while still `loading`/`checking` so Headless can discover availability
     * the same way Full Checkout bootstrap does — never mount a fake button after a
     * definitive unavailable/misconfigured result.
     */
    assertApplePayMountable(methodStatus) {
        if (!this.applePay.isConfigured()) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Apple Pay is not available for this Headless session configuration.',
                method: 'apple-pay',
                provider: 'applePay',
            });
        }
        const readiness = methodStatus?.readiness;
        if (readiness === 'unavailable' || readiness === 'misconfigured') {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Apple Pay is not available for this Headless session configuration.',
                method: 'apple-pay',
                provider: 'applePay',
            });
        }
    }
    async mountApplePay(container, mountGen) {
        const mountId = this.applePayEceMountId ?? this.applePay.createMountId();
        try {
            const prefersDark = this.browser.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
            const resolvedTheme = resolveHeadlessTheme(this.theme, prefersDark);
            const effectiveLocale = resolveEffectiveLocale(this.locale);
            const elementsLocale = toStripeElementsLocale(effectiveLocale);
            this.throwIfDestroyedOrMountStale(mountGen, 'mount', 'apple-pay');
            await new Promise((resolve, reject) => {
                let settled = false;
                const settleOk = () => {
                    if (!settled) {
                        settled = true;
                        resolve();
                    }
                };
                const settleErr = (error) => {
                    if (!settled) {
                        settled = true;
                        reject(error);
                    }
                };
                void this.applePay
                    .mountExpressCheckout(container, {
                    product: this.product,
                    checkout: this.checkout,
                    theme: resolvedTheme,
                    locale: elementsLocale,
                    onReady: () => settleOk(),
                    onUnavailable: () => settleErr(new PaymentError({
                        code: 'PROVIDER_UNAVAILABLE',
                        message: 'Apple Pay is not available in this browser, device, or wallet configuration.',
                        method: 'apple-pay',
                        provider: 'applePay',
                    })),
                    onSuccess: (result) => this.onApplePaySuccess(result, mountGen),
                    onCancel: () => this.onApplePayCancel(mountGen),
                    onError: (error) => {
                        if (!settled) {
                            settleErr(error);
                            return;
                        }
                        this.onApplePayError(error, mountGen);
                    },
                    onAttempt: () => this.onApplePayAttempt(mountGen),
                }, mountId)
                    .then((id) => {
                    if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                        this.applePay.unmountExpressCheckout({ mountId: id });
                        settleErr(new PaymentError({
                            code: 'PROVIDER_UNAVAILABLE',
                            message: 'Headless checkout session was destroyed during mount().',
                            method: 'apple-pay',
                            provider: 'applePay',
                        }));
                        return;
                    }
                    this.applePayEceMountId = id;
                    // ready may already have settled synchronously inside mount().
                    if (this.applePay.getAvailabilityStatus(this.product) === 'available') {
                        settleOk();
                    }
                    else if (this.applePay.getAvailabilityStatus(this.product) === 'unavailable') {
                        settleErr(new PaymentError({
                            code: 'PROVIDER_UNAVAILABLE',
                            message: 'Apple Pay is not available in this browser, device, or wallet configuration.',
                            method: 'apple-pay',
                            provider: 'applePay',
                        }));
                    }
                    else if (this.applePay.getAvailabilityStatus(this.product) === 'error') {
                        settleErr(new PaymentError({
                            code: 'SDK_LOAD_FAILED',
                            message: 'Failed to initialize Apple Pay.',
                            method: 'apple-pay',
                            provider: 'applePay',
                        }));
                    }
                })
                    .catch(settleErr);
            });
            this.throwIfDestroyedOrMountStale(mountGen, 'mount', 'apple-pay');
            this.applePayEceMountId = mountId;
            this.mountedMethod = 'apple-pay';
            this._lastError.set(null);
            if (this._state() === 'error' || this._state() === 'cancelled' || this._state() === 'success') {
                this._state.set('ready');
            }
            // ECE ready may have flipped availability — refresh Headless projection.
            void this.refreshAvailability().catch(() => undefined);
            return this.createApplePayMountHandle(mountGen, mountId);
        }
        catch (error) {
            if (this._state() !== 'destroyed' && mountGen === this.mountGeneration) {
                this.mountedMethod = null;
                const id = this.applePayEceMountId ?? mountId;
                this.applePayEceMountId = null;
                // Keep ECE-decided unavailable/error so remount fails closed without a fake button.
                this.applePay.unmountExpressCheckout({
                    mountId: id,
                    preserveAvailability: true,
                });
            }
            if (this._state() === 'destroyed') {
                throw new PaymentError({
                    code: 'PROVIDER_UNAVAILABLE',
                    message: 'Headless checkout session was destroyed during mount().',
                    method: 'apple-pay',
                    provider: 'applePay',
                });
            }
            const paymentError = error instanceof PaymentError
                ? error
                : mapApplePayError(error, 'SDK_LOAD_FAILED', 'Failed to initialize Apple Pay.');
            this._lastError.set(paymentError);
            this.emitError(paymentError);
            throw paymentError;
        }
    }
    async confirm() {
        this.assertNotDestroyed('confirm');
        const selected = this._selectedMethod();
        const selectedMeta = {
            method: selected ?? undefined,
            provider: selected ? PAYMENT_METHOD_PROVIDER_MAP[selected] : undefined,
        };
        this.assertNotPaymentLocked('confirm', selected ?? undefined);
        if (this._state() === 'idle' || this._state() === 'initializing') {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Call initialize() and mount() before confirm().',
                ...selectedMeta,
            });
        }
        if (selected === 'paypal') {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'PayPal is confirmed through the official PayPal Buttons, not session.confirm(). Mount PayPal and let the buyer click the PayPal button.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        if (selected === 'google-pay') {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Google Pay is confirmed through the official Google Pay button, not session.confirm(). Mount Google Pay and let the buyer click the Google Pay button.',
                method: 'google-pay',
                provider: 'googlePay',
            });
        }
        if (selected === 'apple-pay') {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Apple Pay is confirmed through the official Apple Pay control, not session.confirm(). Mount Apple Pay and let the buyer authorize payment.',
                method: 'apple-pay',
                provider: 'applePay',
            });
        }
        if (!selected || !isStripeElementMethod(selected)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'confirm() requires selectedMethod() to be "card", "klarna", or "affirm" with an active Stripe Payment Element mount.',
                ...selectedMeta,
            });
        }
        if (this.mountedMethod !== selected) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `Mount the Payment Element with mount("${selected}", container) before confirm().`,
                method: selected,
                provider: this.providerOf(selected),
            });
        }
        // Mock mount (enableMockMode): settle through the orchestrator's mock adapter — never the
        // real Stripe Payment Element, and no redirect-ownership / stable-identity requirement.
        if (this.mockSurface) {
            return this.confirmMock(selected);
        }
        const adapter = this.adapterFor(selected);
        if (!adapter.hasMountedElement(this.stripeOwnerId)) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `Mount the Payment Element with mount("${selected}", container) before confirm().`,
                method: selected,
                provider: this.providerOf(selected),
            });
        }
        const mountGen = this.mountGeneration;
        const confirmGen = ++this.confirmGeneration;
        this.terminalEmittedForConfirm = 0;
        this._lastError.set(null);
        this._state.set('processing');
        this.emitStarted(selected);
        let pendingAttemptId = null;
        try {
            const prepared = this.prepareStripeConfirm(selected);
            pendingAttemptId = prepared.attemptId;
            const result = await adapter.confirmPayment(prepared.returnUrl, this.stripeOwnerId);
            if (this.isConfirmStale(mountGen, confirmGen)) {
                // Leave unresolved redirect ownership intact — a newer attempt may own storage.
                return;
            }
            // Same-page settle (no leave-page redirect): clear only this attempt's marker.
            if (pendingAttemptId) {
                clearStripePendingReturnFor(pendingAttemptId);
                pendingAttemptId = null;
            }
            this.applyPaymentResult(result, confirmGen, selected);
        }
        catch (error) {
            if (this.isConfirmStale(mountGen, confirmGen)) {
                return;
            }
            const paymentError = normalizeError(error, {
                method: selected,
                provider: this.providerOf(selected),
            });
            // Same-page cancel / error / AUTHENTICATION_REQUIRED settle — clear matching attempt only.
            if (pendingAttemptId) {
                clearStripePendingReturnFor(pendingAttemptId);
                pendingAttemptId = null;
            }
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.applyPaymentResult({
                    status: 'cancelled',
                    method: selected,
                    provider: this.providerOf(selected),
                    message: paymentError.message,
                }, confirmGen, selected);
                return;
            }
            // BNPL may still require a redirect / customer action. Do not treat as success.
            // After a leave-page redirect, recreate the session and call recoverReturn().
            if (paymentError.code === 'AUTHENTICATION_REQUIRED') {
                this.applyPaymentResult({
                    status: 'processing',
                    method: selected,
                    provider: this.providerOf(selected),
                    message: paymentError.message +
                        ' If the buyer left the page, recreate this session with the same checkoutInstanceId and call recoverReturn(). Confirm final fulfillment on your backend.',
                }, confirmGen, selected);
                return;
            }
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, confirmGen);
            throw paymentError;
        }
    }
    /**
     * Recover Klarna/Affirm Stripe redirect returns for this stable checkout identity.
     * No Payment Element mount or confirmPayment — uses {@link StripeRedirectRecoveryService}.
     */
    async recoverReturn() {
        this.assertNotDestroyed('recoverReturn');
        if (this._state() === 'idle' || this._state() === 'initializing') {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Call initialize() before recoverReturn().',
            });
        }
        if (!this.stableCheckoutIdentity) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Klarna/Affirm Headless return recovery requires a stable merchant checkoutInstanceId that matches the identity used before the redirect.',
            });
        }
        if (this.recoverPromise) {
            return this.recoverPromise;
        }
        if (this.recoverSettled) {
            const priorError = this._lastError();
            if (priorError && this._state() === 'error') {
                throw priorError;
            }
            return this._lastResult();
        }
        // Do not start recovery while another payment operation is active.
        // Transient verification errors leave state `error` with recoverSettled=false (retry allowed).
        if (this._state() === 'processing' || this._state() === 'pending') {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: this._state() === 'processing'
                    ? 'A payment operation is already in progress.'
                    : 'A payment is already pending. Do not start another recovery or confirmation — confirm the final status on your backend.',
            });
        }
        this.recoverPromise = this.doRecoverReturn().finally(() => {
            this.recoverPromise = null;
        });
        return this.recoverPromise;
    }
    async doRecoverReturn() {
        if (!this.browser.isBrowser || !isStripeReturnAttempt()) {
            return null;
        }
        const claim = await this.stripeRedirectRecovery.claimReturn(this, this.methods);
        if (this._state() === 'destroyed') {
            return null;
        }
        if (claim !== 'owner') {
            // Unrelated / wait / not ours — do not mutate session state or clear another host's return.
            return null;
        }
        const method = detectStripeReturnMethod() ??
            (this.methods.includes('affirm') && !this.methods.includes('klarna') ? 'affirm' : 'klarna');
        const recoverGen = ++this.confirmGeneration;
        this.terminalEmittedForConfirm = 0;
        this._lastError.set(null);
        this.applySelection(method);
        this._state.set('processing');
        this.emitStarted(method);
        try {
            const result = await this.stripeRedirectRecovery.consumeReturn();
            if (this._state() === 'destroyed' || recoverGen !== this.confirmGeneration) {
                return null;
            }
            if (!result) {
                const paymentError = new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: `${method === 'affirm' ? 'Affirm' : 'Klarna'} return could not be verified.`,
                    method,
                    provider: method,
                });
                this.recoverSettled = true;
                this._lastError.set(paymentError);
                this._state.set('error');
                this.emitTerminalError(paymentError, recoverGen);
                throw paymentError;
            }
            this.recoverSettled = true;
            this.applyPaymentResult(result, recoverGen, method);
            return result;
        }
        catch (error) {
            if (this._state() === 'destroyed' || recoverGen !== this.confirmGeneration) {
                return null;
            }
            const paymentError = normalizeError(error, { method, provider: method });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.recoverSettled = true;
                const cancelled = {
                    status: 'cancelled',
                    method,
                    provider: method,
                    message: paymentError.message,
                };
                this.applyPaymentResult(cancelled, recoverGen, method);
                return cancelled;
            }
            // Requires action / confirmation — not success and not ordinary async processing.
            if (paymentError.code === 'AUTHENTICATION_REQUIRED') {
                this.recoverSettled = true;
                this._lastError.set(paymentError);
                this._state.set('error');
                this.emitTerminalError(paymentError, recoverGen);
                throw paymentError;
            }
            // Transient verification failure: leave correlation data, allow recoverReturn() retry.
            if (isTransientStripeVerificationError(paymentError)) {
                this.recoverSettled = false;
                this._lastError.set(paymentError);
                this._state.set('error');
                this.emitTerminalError(paymentError, recoverGen);
                throw paymentError;
            }
            this.recoverSettled = true;
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, recoverGen);
            throw paymentError;
        }
    }
    async destroy() {
        if (this._state() === 'destroyed') {
            return;
        }
        this.refreshGeneration += 1;
        this.mountGeneration += 1;
        this.confirmGeneration += 1;
        this.mountedMethod = null;
        this.paypalCaptureEmitted = false;
        this.paypalAttemptAnnounced = false;
        this.paypalCurrentOrderId = null;
        this.googlePayAttemptAnnounced = false;
        this.googlePayClickInFlight = false;
        this.applePayAttemptAnnounced = false;
        this.mockClickInFlight = false;
        this.destroyMockSurfaceOnly();
        this._state.set('destroyed');
        this._selectedMethod.set(null);
        this._availableMethods.set([]);
        this.availability.clear();
        this.initPromise = null;
        if (this.returnHostRegistered) {
            this.stripeRedirectRecovery.unregisterHost(this);
            this.returnHostRegistered = false;
        }
        try {
            await Promise.all([
                this.stripeCard.destroy(this.stripeOwnerId),
                this.klarna.destroy(this.stripeOwnerId),
                this.affirm.destroy(this.stripeOwnerId),
                this.destroyPayPalButtonsOnly(),
                Promise.resolve(this.destroyGooglePayButtonOnly()),
                Promise.resolve(this.destroyApplePayEceOnly()),
            ]);
        }
        catch {
            // Ignore teardown failures.
        }
        this.completeEvents();
        this.releaseId();
    }
    createStripeMountHandle(method, mountGen) {
        let unmounted = false;
        return {
            method,
            unmount: () => {
                if (unmounted) {
                    return;
                }
                unmounted = true;
                if (this._state() === 'destroyed') {
                    return;
                }
                if (mountGen !== this.mountGeneration) {
                    return;
                }
                this.mountGeneration += 1;
                this.mountedMethod = null;
                this.adapterFor(method).unmountPaymentElement(this.stripeOwnerId);
            },
        };
    }
    createPayPalMountHandle(mountGen, mountId) {
        let unmounted = false;
        return {
            method: 'paypal',
            unmount: () => {
                if (unmounted) {
                    return;
                }
                unmounted = true;
                if (this._state() === 'destroyed') {
                    return;
                }
                if (mountGen !== this.mountGeneration) {
                    return;
                }
                this.mountGeneration += 1;
                this.mountedMethod = null;
                this.paypalCurrentOrderId = null;
                this.paypalCaptureEmitted = false;
                this.paypalAttemptAnnounced = false;
                if (this.paypalButtonsMountId === mountId) {
                    this.paypalButtonsMountId = null;
                }
                void this.paypal.destroyButtons(mountId);
            },
        };
    }
    async onPayPalCreateOrder(mountGen) {
        if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: 'PayPal checkout was superseded.',
                method: 'paypal',
                provider: 'paypal',
            });
        }
        this._lastError.set(null);
        this.paypalCaptureEmitted = false;
        const confirmGen = ++this.confirmGeneration;
        this.terminalEmittedForConfirm = 0;
        this._state.set('processing');
        if (!this.paypalAttemptAnnounced) {
            this.paypalAttemptAnnounced = true;
            this.emitStarted('paypal');
        }
        try {
            const orderId = await this.paypal.createOrder(this.product, this.checkout, this.paypalOrderOwnerId);
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                throw new PaymentError({
                    code: 'PAYMENT_FAILED',
                    message: 'PayPal checkout was superseded.',
                    method: 'paypal',
                    provider: 'paypal',
                });
            }
            this.paypalCurrentOrderId = orderId;
            return orderId;
        }
        catch (error) {
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                throw mapPayPalError(error, 'BACKEND_ERROR', 'Failed to create PayPal order.');
            }
            const paymentError = mapPayPalError(error, 'BACKEND_ERROR', 'Failed to create PayPal order.');
            this.paypalAttemptAnnounced = false;
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, confirmGen);
            // Buttons remain mounted — allow another buyer attempt.
            this._state.set('ready');
            throw paymentError;
        }
    }
    async onPayPalApprove(orderId, mountGen) {
        if (this._state() === 'destroyed' ||
            mountGen !== this.mountGeneration ||
            this.paypalCaptureEmitted) {
            return;
        }
        this.paypalCaptureEmitted = true;
        const confirmGen = this.confirmGeneration;
        this._state.set('processing');
        this._lastError.set(null);
        try {
            const result = await this.paypal.captureOrder(orderId);
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                return;
            }
            if (result.status === 'success') {
                this.paypalAttemptAnnounced = false;
                this.applyPaymentResult(result, confirmGen, 'paypal');
                return;
            }
            if (result.status === 'processing') {
                this.paypalAttemptAnnounced = false;
                this.applyPaymentResult(result, confirmGen, 'paypal');
                return;
            }
            if (result.status === 'cancelled') {
                this.paypalAttemptAnnounced = false;
                this.applyPaymentResult(result, confirmGen, 'paypal');
                this.restorePayPalReadyAfterTerminal(mountGen);
                return;
            }
            const paymentError = new PaymentError({
                code: 'PAYMENT_FAILED',
                message: result.message ?? 'PayPal payment failed.',
                method: 'paypal',
                provider: 'paypal',
            });
            this.paypalAttemptAnnounced = false;
            this.paypalCaptureEmitted = false;
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, confirmGen);
            this.restorePayPalReadyAfterTerminal(mountGen);
        }
        catch (error) {
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                return;
            }
            const paymentError = normalizeError(error, { method: 'paypal', provider: 'paypal' });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.paypalAttemptAnnounced = false;
                this.paypalCaptureEmitted = false;
                this.applyPaymentResult({
                    status: 'cancelled',
                    method: 'paypal',
                    provider: 'paypal',
                    message: paymentError.message,
                    sessionId: orderId,
                }, confirmGen, 'paypal');
                this.restorePayPalReadyAfterTerminal(mountGen);
                return;
            }
            this.paypalAttemptAnnounced = false;
            this.paypalCaptureEmitted = false;
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, confirmGen);
            this.restorePayPalReadyAfterTerminal(mountGen);
        }
    }
    onPayPalCancel(mountGen) {
        if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
            return;
        }
        const confirmGen = this.confirmGeneration || ++this.confirmGeneration;
        this.paypalAttemptAnnounced = false;
        this.paypalCaptureEmitted = false;
        this.applyPaymentResult({
            status: 'cancelled',
            method: 'paypal',
            provider: 'paypal',
            message: 'PayPal checkout was cancelled.',
            sessionId: this.paypalCurrentOrderId ?? undefined,
        }, confirmGen, 'paypal');
        this.restorePayPalReadyAfterTerminal(mountGen);
    }
    onPayPalSdkError(err, mountGen) {
        if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
            return;
        }
        const paymentError = mapPayPalError(err);
        if (paymentError.code === 'PAYMENT_CANCELLED') {
            this.onPayPalCancel(mountGen);
            return;
        }
        const confirmGen = this.confirmGeneration || ++this.confirmGeneration;
        this.paypalAttemptAnnounced = false;
        this.paypalCaptureEmitted = false;
        this._lastError.set(paymentError);
        this._state.set('error');
        this.emitTerminalError(paymentError, confirmGen);
        this.restorePayPalReadyAfterTerminal(mountGen);
    }
    /** Official Buttons stay mounted after cancel/error so the buyer can retry. */
    restorePayPalReadyAfterTerminal(mountGen) {
        queueMicrotask(() => {
            if (this._state() === 'destroyed' ||
                mountGen !== this.mountGeneration ||
                this.mountedMethod !== 'paypal') {
                return;
            }
            if (this._state() === 'cancelled' ||
                this._state() === 'error' ||
                this._state() === 'processing') {
                this._state.set('ready');
            }
        });
    }
    createGooglePayMountHandle(mountGen, mountId) {
        let unmounted = false;
        return {
            method: 'google-pay',
            unmount: () => {
                if (unmounted) {
                    return;
                }
                unmounted = true;
                if (this._state() === 'destroyed') {
                    return;
                }
                if (mountGen !== this.mountGeneration) {
                    return;
                }
                this.mountGeneration += 1;
                this.mountedMethod = null;
                this.googlePayAttemptAnnounced = false;
                this.googlePayClickInFlight = false;
                if (this.googlePayButtonMountId === mountId) {
                    this.googlePayButtonMountId = null;
                }
                this.googlePay.destroyButtonMount(mountId);
            },
        };
    }
    async onGooglePayClick(mountGen) {
        if (this._state() === 'destroyed' ||
            mountGen !== this.mountGeneration ||
            this.googlePayClickInFlight ||
            this.googlePay.isProcessing(this.googlePayOwnerId) ||
            this._state() === 'success' ||
            this._state() === 'pending') {
            return;
        }
        this.googlePayClickInFlight = true;
        this._lastError.set(null);
        const confirmGen = ++this.confirmGeneration;
        this.terminalEmittedForConfirm = 0;
        this._state.set('processing');
        if (!this.googlePayAttemptAnnounced) {
            this.googlePayAttemptAnnounced = true;
            this.emitStarted('google-pay');
        }
        try {
            const result = await this.googlePay.payWithGooglePay(this.product, this.checkout, this.googlePayOwnerId);
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                return;
            }
            if (result.status === 'success') {
                this.googlePayAttemptAnnounced = false;
                this.applyPaymentResult(result, confirmGen, 'google-pay');
                return;
            }
            if (result.status === 'processing') {
                this.googlePayAttemptAnnounced = false;
                this.applyPaymentResult(result, confirmGen, 'google-pay');
                return;
            }
            if (result.status === 'cancelled') {
                this.googlePayAttemptAnnounced = false;
                this.applyPaymentResult(result, confirmGen, 'google-pay');
                this.restoreGooglePayReadyAfterTerminal(mountGen);
                return;
            }
            const paymentError = new PaymentError({
                code: 'PAYMENT_FAILED',
                message: result.message ?? 'Google Pay payment failed.',
                method: 'google-pay',
                provider: 'googlePay',
            });
            this.googlePayAttemptAnnounced = false;
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, confirmGen);
            this.restoreGooglePayReadyAfterTerminal(mountGen);
        }
        catch (error) {
            if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
                return;
            }
            const paymentError = normalizeError(error, {
                method: 'google-pay',
                provider: 'googlePay',
            });
            if (paymentError.code === 'PAYMENT_CANCELLED') {
                this.googlePayAttemptAnnounced = false;
                this.applyPaymentResult({
                    status: 'cancelled',
                    method: 'google-pay',
                    provider: 'googlePay',
                    message: paymentError.message,
                }, confirmGen, 'google-pay');
                this.restoreGooglePayReadyAfterTerminal(mountGen);
                return;
            }
            this.googlePayAttemptAnnounced = false;
            this._lastError.set(paymentError);
            this._state.set('error');
            this.emitTerminalError(paymentError, confirmGen);
            this.restoreGooglePayReadyAfterTerminal(mountGen);
        }
        finally {
            if (mountGen === this.mountGeneration) {
                this.googlePayClickInFlight = false;
            }
        }
    }
    /** Official Google Pay button stays mounted after cancel/error for another attempt. */
    restoreGooglePayReadyAfterTerminal(mountGen) {
        queueMicrotask(() => {
            if (this._state() === 'destroyed' ||
                mountGen !== this.mountGeneration ||
                this.mountedMethod !== 'google-pay') {
                return;
            }
            if (this._state() === 'cancelled' ||
                this._state() === 'error' ||
                this._state() === 'processing') {
                this._state.set('ready');
            }
        });
    }
    destroyMockSurfaceOnly() {
        const surface = this.mockSurface;
        this.mockSurface = null;
        surface?.destroy();
    }
    async teardownActiveMounts() {
        this.destroyMockSurfaceOnly();
        this.unmountAllStripeElements();
        await this.destroyPayPalButtonsOnly();
        this.destroyGooglePayButtonOnly();
        this.destroyApplePayEceOnly();
    }
    async destroyPayPalButtonsOnly() {
        const id = this.paypalButtonsMountId;
        this.paypalButtonsMountId = null;
        if (id) {
            await this.paypal.destroyButtons(id);
        }
    }
    destroyGooglePayButtonOnly() {
        const id = this.googlePayButtonMountId;
        this.googlePayButtonMountId = null;
        if (id) {
            this.googlePay.destroyButtonMount(id);
        }
    }
    destroyApplePayEceOnly() {
        const id = this.applePayEceMountId;
        this.applePayEceMountId = null;
        if (id) {
            this.applePay.unmountExpressCheckout({
                mountId: id,
                preserveAvailability: true,
            });
        }
    }
    createApplePayMountHandle(mountGen, mountId) {
        let unmounted = false;
        return {
            method: 'apple-pay',
            unmount: () => {
                if (unmounted) {
                    return;
                }
                unmounted = true;
                if (this._state() === 'destroyed') {
                    return;
                }
                if (mountGen !== this.mountGeneration) {
                    return;
                }
                this.mountGeneration += 1;
                this.mountedMethod = null;
                this.applePayAttemptAnnounced = false;
                if (this.applePayEceMountId === mountId) {
                    this.applePayEceMountId = null;
                }
                this.applePay.unmountExpressCheckout({
                    mountId,
                    preserveAvailability: true,
                });
            },
        };
    }
    onApplePayAttempt(mountGen) {
        if (this._state() === 'destroyed' ||
            mountGen !== this.mountGeneration ||
            this._state() === 'success' ||
            this._state() === 'pending') {
            return;
        }
        this._lastError.set(null);
        this.confirmGeneration += 1;
        this.terminalEmittedForConfirm = 0;
        this._state.set('processing');
        if (!this.applePayAttemptAnnounced) {
            this.applePayAttemptAnnounced = true;
            this.emitStarted('apple-pay');
        }
    }
    onApplePaySuccess(result, mountGen) {
        if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
            return;
        }
        const confirmGen = this.confirmGeneration;
        this.applePayAttemptAnnounced = false;
        if (result.status === 'cancelled') {
            this.applyPaymentResult(result, confirmGen, 'apple-pay');
            this.restoreApplePayReadyAfterTerminal(mountGen);
            return;
        }
        if (result.status === 'success' || result.status === 'processing') {
            this.applyPaymentResult(result, confirmGen, 'apple-pay');
            return;
        }
        const paymentError = new PaymentError({
            code: 'PAYMENT_FAILED',
            message: result.message ?? 'Apple Pay payment failed.',
            method: 'apple-pay',
            provider: 'applePay',
        });
        this._lastError.set(paymentError);
        this._state.set('error');
        this.emitTerminalError(paymentError, confirmGen);
        this.restoreApplePayReadyAfterTerminal(mountGen);
    }
    onApplePayCancel(mountGen) {
        if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
            return;
        }
        const confirmGen = this.confirmGeneration || ++this.confirmGeneration;
        this.applePayAttemptAnnounced = false;
        this.applyPaymentResult({
            status: 'cancelled',
            method: 'apple-pay',
            provider: 'applePay',
            message: 'Apple Pay was cancelled.',
        }, confirmGen, 'apple-pay');
        this.restoreApplePayReadyAfterTerminal(mountGen);
    }
    onApplePayError(error, mountGen) {
        if (this._state() === 'destroyed' || mountGen !== this.mountGeneration) {
            return;
        }
        const paymentError = normalizeError(error, {
            method: 'apple-pay',
            provider: 'applePay',
        });
        if (paymentError.code === 'PAYMENT_CANCELLED') {
            this.onApplePayCancel(mountGen);
            return;
        }
        const confirmGen = this.confirmGeneration || ++this.confirmGeneration;
        this.applePayAttemptAnnounced = false;
        this._lastError.set(paymentError);
        this._state.set('error');
        this.emitTerminalError(paymentError, confirmGen);
        this.restoreApplePayReadyAfterTerminal(mountGen);
    }
    /** Official Apple Pay control stays mounted after cancel/error for another attempt. */
    restoreApplePayReadyAfterTerminal(mountGen) {
        queueMicrotask(() => {
            if (this._state() === 'destroyed' ||
                mountGen !== this.mountGeneration ||
                this.mountedMethod !== 'apple-pay') {
                return;
            }
            if (this._state() === 'cancelled' ||
                this._state() === 'error' ||
                this._state() === 'processing') {
                this._state.set('ready');
            }
        });
    }
    async createStripeElementSession(method, effectiveLocale) {
        if (method === 'card') {
            return this.stripeCard.createPaymentSession(this.product, this.checkout, this.stripeOwnerId);
        }
        const snapshot = this.config.getSnapshot();
        if (method === 'klarna') {
            const configured = snapshot.providers?.klarna?.locale?.trim();
            const preferred = configured ||
                toKlarnaPreferredLocale(effectiveLocale, snapshot.providers?.klarna?.purchaseCountry ?? 'US');
            return this.klarna.createPaymentSession(this.product, this.checkout, preferred, this.stripeOwnerId);
        }
        const configured = snapshot.providers?.affirm?.locale?.trim();
        const preferred = configured ||
            toAffirmPreferredLocale(effectiveLocale, snapshot.providers?.affirm?.purchaseCountry ?? 'US');
        return this.affirm.createPaymentSession(this.product, this.checkout, preferred, this.stripeOwnerId);
    }
    /**
     * Card: optional successUrl only.
     * Klarna/Affirm: require merchant-stable identity, write `hostKind: 'headless'`
     * pending marker, stamp `ep_method` + `ep_attempt` on return_url before confirm.
     */
    prepareStripeConfirm(method) {
        const base = this.checkout?.successUrl;
        if (method === 'card') {
            return { returnUrl: base, attemptId: null };
        }
        if (!this.stableCheckoutIdentity) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'Klarna/Affirm Headless redirect confirmation requires a stable merchant checkoutInstanceId that can be reused after page reload. Auto-generated session ids cannot own redirect returns.',
                method,
                provider: this.providerOf(method),
            });
        }
        if (!this.browser.isBrowser) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Klarna/Affirm Headless confirmation requires a browser context.',
                method,
                provider: this.providerOf(method),
            });
        }
        const attemptId = createStripeReturnAttemptId();
        const redirectMethod = method;
        const returnUrl = buildStripeReturnUrl(redirectMethod, base, undefined, attemptId);
        markHeadlessPendingReturn(redirectMethod, this.product.id, {
            attemptId,
            checkoutInstanceId: this.stableCheckoutIdentity,
        });
        return { returnUrl, attemptId };
    }
    adapterFor(method) {
        switch (method) {
            case 'card':
                return this.stripeCard;
            case 'klarna':
                return this.klarna;
            case 'affirm':
                return this.affirm;
        }
    }
    unmountAllStripeElements() {
        this.stripeCard.unmountPaymentElement(this.stripeOwnerId);
        this.klarna.unmountPaymentElement(this.stripeOwnerId);
        this.affirm.unmountPaymentElement(this.stripeOwnerId);
    }
    providerOf(method) {
        return PAYMENT_METHOD_PROVIDER_MAP[method];
    }
    applyPaymentResult(result, confirmGen, method) {
        if (confirmGen !== this.confirmGeneration || this._state() === 'destroyed') {
            return;
        }
        this._lastResult.set(result);
        if (result.status === 'success') {
            this._state.set('success');
            this.emitTerminalSuccess(result, confirmGen);
            return;
        }
        if (result.status === 'processing') {
            this._state.set('pending');
            this.emitTerminalPending(result, confirmGen);
            return;
        }
        if (result.status === 'cancelled') {
            this._state.set('cancelled');
            this.emitTerminalCancel(result, confirmGen);
            return;
        }
        const paymentError = new PaymentError({
            code: 'PAYMENT_FAILED',
            message: result.message ?? 'Payment failed.',
            method,
            provider: this.providerOf(method),
        });
        this._lastError.set(paymentError);
        this._state.set('error');
        this.emitTerminalError(paymentError, confirmGen);
    }
    emitStarted(method) {
        if (this.started$.closed) {
            return;
        }
        this.started$.next({
            method,
            provider: this.providerOf(method),
            amount: this.product.amount,
            currency: this.product.currency,
        });
    }
    emitTerminalSuccess(result, confirmGen) {
        if (this.terminalEmittedForConfirm === confirmGen || this.success$.closed) {
            return;
        }
        this.terminalEmittedForConfirm = confirmGen;
        this.success$.next(result);
    }
    emitTerminalPending(result, confirmGen) {
        if (this.terminalEmittedForConfirm === confirmGen || this.pending$.closed) {
            return;
        }
        this.terminalEmittedForConfirm = confirmGen;
        this.pending$.next(result);
    }
    emitTerminalCancel(result, confirmGen) {
        if (this.terminalEmittedForConfirm === confirmGen || this.cancel$.closed) {
            return;
        }
        this.terminalEmittedForConfirm = confirmGen;
        this.cancel$.next(result);
    }
    emitTerminalError(error, confirmGen) {
        if (this.terminalEmittedForConfirm === confirmGen || this.error$.closed) {
            return;
        }
        this.terminalEmittedForConfirm = confirmGen;
        this.error$.next(error);
    }
    emitError(error) {
        if (!this.error$.closed) {
            this.error$.next(error);
        }
    }
    async publishAvailability(generation) {
        const prefersDark = this.browser.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
        const resolvedTheme = resolveHeadlessTheme(this.theme, prefersDark);
        const results = await this.orchestrator.refreshAvailability([...this.methods], this.product, this.checkout, resolvedTheme);
        if (this.isStale(generation)) {
            return this._availableMethods();
        }
        this.availability.apply(results);
        const projected = results.map(toHeadlessMethodStatus);
        this._availableMethods.set(projected);
        const selected = this._selectedMethod();
        if (selected && !this.methods.includes(selected)) {
            this.applySelection(null);
        }
        return projected;
    }
    assertProduct() {
        const result = validatePaymentProduct(this.product);
        if (!result.valid) {
            throw new PaymentError({
                code: 'PRODUCT_INVALID',
                message: result.errors.join(' '),
            });
        }
    }
    applySelection(method) {
        const previous = this._selectedMethod();
        if (previous === method) {
            return;
        }
        this._selectedMethod.set(method);
        if (!this.methodChange$.closed) {
            this.methodChange$.next({
                method,
                previousMethod: previous,
                provider: method ? PAYMENT_METHOD_PROVIDER_MAP[method] : null,
            });
        }
    }
    assertNotDestroyed(operation) {
        if (this._state() === 'destroyed') {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `Cannot ${operation}() on a destroyed Headless checkout session.`,
            });
        }
    }
    /**
     * Blocks mount / select / confirm while a payment is in-flight or unresolved pending.
     * Includes in-flight recoverReturn before state flips to `processing` (after claim).
     * Does not block destroy, recoverReturn retry after transient error, or availability refresh.
     */
    assertNotPaymentLocked(operation, method) {
        const state = this._state();
        const meta = method
            ? { method, provider: PAYMENT_METHOD_PROVIDER_MAP[method] }
            : {};
        if (this.recoverPromise || state === 'processing') {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: `Cannot ${operation}() while a payment operation is already in progress.`,
                ...meta,
            });
        }
        if (state === 'pending') {
            throw new PaymentError({
                code: 'PAYMENT_FAILED',
                message: `Cannot ${operation}() while a payment is pending. Do not start another payment — confirm the final status on your backend.`,
                ...meta,
            });
        }
    }
    throwIfDestroyedOrStale(generation, operation) {
        if (this._state() === 'destroyed') {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `Headless checkout session was destroyed during ${operation}().`,
            });
        }
        if (generation !== this.refreshGeneration) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `Headless checkout ${operation}() was superseded by a newer operation.`,
            });
        }
    }
    throwIfDestroyedOrMountStale(mountGen, operation, method) {
        if (this._state() === 'destroyed') {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `Headless checkout session was destroyed during ${operation}().`,
                method,
                provider: this.providerOf(method),
            });
        }
        if (mountGen !== this.mountGeneration) {
            throw new PaymentError({
                code: 'PROVIDER_UNAVAILABLE',
                message: `Headless checkout ${operation}() was superseded by a newer mount/unmount.`,
                method,
                provider: this.providerOf(method),
            });
        }
    }
    isConfirmStale(mountGen, confirmGen) {
        return (this._state() === 'destroyed' ||
            confirmGen !== this.confirmGeneration ||
            mountGen !== this.mountGeneration);
    }
    isStale(generation) {
        return this._state() === 'destroyed' || generation !== this.refreshGeneration;
    }
    completeEvents() {
        this.started$.complete();
        this.methodChange$.complete();
        this.pending$.complete();
        this.success$.complete();
        this.cancel$.complete();
        this.error$.complete();
    }
    releaseId() {
        if (this.released) {
            return;
        }
        this.released = true;
        this.sessionRegistry.release(this.id);
    }
}
function methodLabel(method) {
    switch (method) {
        case 'card':
            return 'Card';
        case 'klarna':
            return 'Klarna';
        case 'affirm':
            return 'Affirm';
        case 'paypal':
            return 'PayPal';
        case 'google-pay':
            return 'Google Pay';
        case 'apple-pay':
            return 'Apple Pay';
    }
}

/**
 * Tracks live Headless session ids so two sessions cannot claim the same
 * merchant `checkoutInstanceId` (or resolved auto id) at once.
 * Root-scoped; does not hold session objects.
 */
class HeadlessSessionRegistry {
    liveIds = new Set();
    claim(id) {
        if (this.liveIds.has(id)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: `A Headless checkout session with id "${id}" is already active.`,
            });
        }
        this.liveIds.add(id);
    }
    release(id) {
        this.liveIds.delete(id);
    }
    /** Test / diagnostics. */
    has(id) {
        return this.liveIds.has(id);
    }
    /** Test helper — clears all claims. */
    clearForTests() {
        this.liveIds.clear();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: HeadlessSessionRegistry, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: HeadlessSessionRegistry, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: HeadlessSessionRegistry, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

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
class EasyPaymentsHeadless {
    orchestrator = inject(PaymentOrchestratorService);
    registry = inject(HeadlessSessionRegistry);
    browser = inject(BrowserGuard);
    config = inject(EasyPaymentsConfigService);
    stripeCard = inject(StripeCardAdapter);
    klarna = inject(KlarnaAdapter);
    affirm = inject(AffirmAdapter);
    paypal = inject(PayPalAdapter);
    googlePay = inject(GooglePayAdapter);
    applePay = inject(ApplePayAdapter);
    stripeRedirectRecovery = inject(StripeRedirectRecoveryService);
    createSession(options) {
        if (!options || typeof options !== 'object') {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: 'HeadlessSessionOptions are required.',
            });
        }
        const productResult = validatePaymentProduct(options.product);
        if (!productResult.valid) {
            throw new PaymentError({
                code: 'PRODUCT_INVALID',
                message: productResult.errors.join(' '),
            });
        }
        const methods = normalizeSessionMethods(options.methods);
        const { id, stableCheckoutIdentity } = resolveSessionIdentity(options.checkoutInstanceId);
        this.registry.claim(id);
        try {
            return new HeadlessCheckoutSessionImpl({
                id,
                stableCheckoutIdentity,
                product: options.product,
                methods,
                checkout: options.checkout,
                locale: options.locale,
                translations: options.translations,
                theme: options.theme,
                orchestrator: this.orchestrator,
                registry: this.registry,
                browser: this.browser,
                config: this.config,
                stripeCard: this.stripeCard,
                klarna: this.klarna,
                affirm: this.affirm,
                paypal: this.paypal,
                googlePay: this.googlePay,
                applePay: this.applePay,
                stripeRedirectRecovery: this.stripeRedirectRecovery,
            });
        }
        catch (error) {
            this.registry.release(id);
            throw error;
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsHeadless, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsHeadless, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.1.5", ngImport: i0, type: EasyPaymentsHeadless, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
/**
 * Session `id` may be merchant-stable or auto-generated.
 * Klarna/Affirm redirect ownership only uses {@link stableCheckoutIdentity}
 * (merchant-supplied) — never a freshly minted runtime id after reload.
 */
function resolveSessionIdentity(checkoutInstanceId) {
    if (checkoutInstanceId === null || checkoutInstanceId === undefined || checkoutInstanceId === '') {
        return { id: createPaymentOwnerId('headless'), stableCheckoutIdentity: null };
    }
    if (!isValidCheckoutInstanceId(checkoutInstanceId)) {
        throw new PaymentError({
            code: 'CONFIG_INVALID',
            message: 'checkoutInstanceId must match ^[a-zA-Z0-9_.:-]{1,64}$ when provided.',
        });
    }
    return { id: checkoutInstanceId, stableCheckoutIdentity: checkoutInstanceId };
}
function normalizeSessionMethods(methods) {
    if (!Array.isArray(methods) || methods.length === 0) {
        throw new PaymentError({
            code: 'CONFIG_INVALID',
            message: 'HeadlessSessionOptions.methods must be a non-empty array.',
        });
    }
    const seen = new Set();
    const normalized = [];
    for (const method of methods) {
        if (typeof method !== 'string' || !isKnownPaymentMethod(method)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: `Unsupported payment method "${String(method)}".`,
            });
        }
        if (seen.has(method)) {
            throw new PaymentError({
                code: 'CONFIG_INVALID',
                message: `Duplicate payment method "${method}" in HeadlessSessionOptions.methods.`,
                method,
            });
        }
        seen.add(method);
        normalized.push(method);
    }
    return normalized;
}

/*
 * Public API Surface of easy-payments
 */

/**
 * Generated bundle index. Do not edit.
 */

export { ApplePayAdapter, DEFAULT_CHECKOUT_MAX_WIDTH, EASY_PAYMENTS_DEFAULT_LOCALE, EASY_PAYMENTS_DIAGNOSTIC_CODES, EASY_PAYMENTS_SUPPORTED_LOCALES, EasyPaymentButtonsComponent, EasyPaymentsComponent, EasyPaymentsConfigService, EasyPaymentsConfigValidator, EasyPaymentsDiagnosticsService, EasyPaymentsHeadless, MAX_CHECKOUT_WIDTH, MERCHANT_METADATA_LIMITS, MERCHANT_METADATA_RESERVED_KEYS, MIN_CHECKOUT_WIDTH, MockPaymentController, PAYMENT_METHOD_LABELS, PAYPAL_ORDER_REFERENCE_KEY, PAYPAL_ORDER_REFERENCE_MAX_LENGTH, PaymentError, PaymentOrchestratorService, detectBrowserLocale, detectStripeReturnMethod, evaluateBnplDirectReadiness, formatTransactionReference, interpolate, isAnyStripeBnplReturnAttempt, isKlarnaReturnAttempt, isKlarnaStripeReturn, isStripeReturnAttempt, localizePaymentError, normalizeError, normalizeLanguageTag, normalizePaymentResult, provideEasyPayments, resolveCardButtonAppearance, resolveCheckoutMaxWidth, resolveEffectiveLocale, resolveMessages, toAffirmCreatePaymentRequest, toAffirmPreferredLocale, toGooglePayButtonLocale, toKlarnaCreatePaymentRequest, toKlarnaPreferredLocale, toPayPalCreateOrderRequest, toPayPalSdkLocale, toStripeBnplLocale, toStripeElementsLocale, validateMerchantMetadata, validatePaymentProduct };
//# sourceMappingURL=easy-payments-angular.mjs.map
