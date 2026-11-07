import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EpImageLightbox, LightboxImage } from './image-lightbox';

@Component({
  imports: [EpImageLightbox],
  template: `
    <button type="button" #trigger (click)="open = true; selected = image">
      Open
    </button>
    <ep-image-lightbox
      [open]="open"
      [image]="selected"
      (closed)="open = false; selected = null"
    />
  `,
})
class LightboxHost {
  open = false;
  selected: LightboxImage | null = null;
  readonly image: LightboxImage = {
    src: 'screenshots/checkout-desktop.png',
    alt: 'Desktop checkout',
    caption: 'Desktop',
  };
}

describe('EpImageLightbox', () => {
  let fixture: ComponentFixture<LightboxHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightboxHost],
    }).compileComponents();

    fixture = TestBed.createComponent(LightboxHost);
    fixture.detectChanges();
  });

  it('opens with dialog semantics and closes on escape', async () => {
    const host = fixture.componentInstance;
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="dialog"]',
    );
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(host.open).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]'),
    ).toBeNull();
  });

  it('closes from the close button', async () => {
    const host = fixture.componentInstance;
    const openButton = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    )!;
    openButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const close = (fixture.nativeElement as HTMLElement).querySelector(
      '.ep-lightbox__close',
    ) as HTMLButtonElement;
    expect(close).toBeTruthy();
    close.click();
    fixture.detectChanges();
    expect(host.open).toBe(false);
  });
});
