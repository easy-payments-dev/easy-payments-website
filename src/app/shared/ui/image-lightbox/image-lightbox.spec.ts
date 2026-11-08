import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EpImageLightbox } from './image-lightbox';

describe('EpImageLightbox', () => {
  let fixture: ComponentFixture<EpImageLightbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EpImageLightbox],
    }).compileComponents();

    fixture = TestBed.createComponent(EpImageLightbox);
  });

  it('moves focus into the dialog and restores it on close', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);
    trigger.focus();

    fixture.componentRef.setInput('image', {
      src: 'screenshots/checkout-desktop.png',
      alt: 'Checkout',
      caption: 'Checkout',
    });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const close = (fixture.nativeElement as HTMLElement).querySelector(
      '.ep-lightbox__close',
    ) as HTMLButtonElement | null;
    expect(close).toBeTruthy();
    expect(document.activeElement).toBe(close);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await Promise.resolve();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('emits closed on Escape while open', () => {
    const spy = vi.fn();
    fixture.componentInstance.closed.subscribe(spy);
    fixture.componentRef.setInput('image', {
      src: 'screenshots/checkout-desktop.png',
      alt: 'Checkout',
    });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(spy).toHaveBeenCalled();
  });
});
