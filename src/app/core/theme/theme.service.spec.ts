import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { THEME_STORAGE_KEY } from './theme.types';

describe('ThemeService', () => {
  let service: ThemeService;
  let matchMediaSpy: ReturnType<typeof vi.fn>;
  let listeners: Array<(event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    listeners = [];

    matchMediaSpy = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(
        (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          listeners.push(listener);
        },
      ),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: matchMediaSpy,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    service.destroy();
    localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it('defaults to system preference for first-time visitors', () => {
    service.init();
    expect(service.preference()).toBe('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('persists an explicit theme preference and restores it', () => {
    service.init();
    service.setPreference('dark');
    expect(service.preference()).toBe('dark');
    expect(service.resolvedTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    service.destroy();
    const again = TestBed.inject(ThemeService);
    again.init();
    expect(again.preference()).toBe('dark');
    expect(again.resolvedTheme()).toBe('dark');
    again.destroy();
  });

  it('follows operating-system changes while system is selected', () => {
    service.init();
    expect(service.preference()).toBe('system');
    expect(service.resolvedTheme()).toBe('light');

    listeners[0]?.({ matches: true } as MediaQueryListEvent);
    expect(service.resolvedTheme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('ignores operating-system changes when an explicit theme is set', () => {
    service.init();
    service.setPreference('light');
    listeners[0]?.({ matches: true } as MediaQueryListEvent);
    expect(service.resolvedTheme()).toBe('light');
  });
});
