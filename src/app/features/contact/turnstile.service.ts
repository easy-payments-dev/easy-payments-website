import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  'timeout-callback'?: () => void;
}

export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Loads the Cloudflare Turnstile script on demand. Only the contact page calls `load()`,
 * so the third-party script is never part of the global bundle or initial HTML.
 */
@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private readonly document = inject(DOCUMENT);
  private loading: Promise<TurnstileApi> | null = null;

  load(): Promise<TurnstileApi> {
    const win = this.document.defaultView;
    if (!win) {
      return Promise.reject(new Error('Turnstile requires a browser'));
    }
    if (win.turnstile) {
      return Promise.resolve(win.turnstile);
    }
    if (this.loading) {
      return this.loading;
    }

    this.loading = new Promise<TurnstileApi>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset['epTurnstile'] = 'true';
      script.onload = () => {
        if (win.turnstile) {
          resolve(win.turnstile);
        } else {
          this.loading = null;
          script.remove();
          reject(new Error('Turnstile API unavailable'));
        }
      };
      script.onerror = () => {
        this.loading = null;
        script.remove();
        reject(new Error('Turnstile script failed to load'));
      };
      this.document.head.appendChild(script);
    });
    return this.loading;
  }
}
