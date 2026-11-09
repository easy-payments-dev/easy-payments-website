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

  it('hides PayPal when paypalSupportUrl is not configured', () => {
    expect(environment.paypalSupportUrl).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Support Easy Payments');
    expect(text).toContain('View on GitHub');
    expect(text).not.toContain('Support with PayPal');
  });
});
