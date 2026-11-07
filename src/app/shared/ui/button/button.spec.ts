import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EpButton } from './button';

describe('EpButton', () => {
  let fixture: ComponentFixture<EpButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EpButton],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EpButton);
  });

  it('renders a native button by default', () => {
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(false);
  });

  it('disables while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders a router link when routerLink is provided', () => {
    fixture.componentRef.setInput('routerLink', '/frameworks');
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toContain('frameworks');
  });
});
