import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { THEME_STORAGE_KEY } from './theme.types';

describe('ThemeService', () => {
  let service: ThemeService;
  let matchMediaSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);

    matchMediaSpy = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
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

  it('defaults to system preference', () => {
    service.init();
    expect(service.preference()).toBe('system');
    expect(matchMediaSpy).toHaveBeenCalled();
  });

  it('persists an explicit theme preference', () => {
    service.init();
    service.setPreference('dark');
    expect(service.preference()).toBe('dark');
    expect(service.resolvedTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
