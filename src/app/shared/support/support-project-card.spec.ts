import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SupportProjectCard } from './support-project-card';

describe('SupportProjectCard', () => {
  let fixture: ComponentFixture<SupportProjectCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportProjectCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(SupportProjectCard);
    fixture.detectChanges();
  });

  it('hides PayPal when paypalSupportUrl is not configured (local env)', () => {
    // Production sets paypalSupportUrl via environment.production.ts file replacement.
    expect(environment.paypalSupportUrl).toBeNull();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';
    expect(text).toContain('Support Easy Payments');
    expect(text).toContain('View on GitHub');
    expect(text).toContain('Report an issue');
    expect(text).not.toContain('Support with PayPal');
    expect(text).not.toMatch(/coming later|aparecerán|aparecerão/i);
    expect(root.querySelector('a.support-card__paypal')).toBeNull();
  });
});
