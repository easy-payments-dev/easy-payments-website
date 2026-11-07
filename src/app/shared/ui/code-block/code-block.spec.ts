import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EpCodeBlock } from './code-block';

describe('EpCodeBlock', () => {
  let fixture: ComponentFixture<EpCodeBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EpCodeBlock],
    }).compileComponents();

    fixture = TestBed.createComponent(EpCodeBlock);
    fixture.componentRef.setInput('code', 'const answer = 42;');
    fixture.componentRef.setInput('language', 'typescript');
    fixture.detectChanges();
  });

  it('renders language label and code', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('typescript');
    expect(el.textContent).toContain('const answer = 42;');
  });

  it('copies code and announces success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith('const answer = 42;');
    expect(button.textContent?.trim()).toBe('Copied');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Code copied to clipboard',
    );
  });
});
