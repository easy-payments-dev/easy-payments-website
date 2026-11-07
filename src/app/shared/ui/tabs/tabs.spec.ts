import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EpTabPanel } from './tab-panel';
import { EpTabs } from './tabs';

@Component({
  imports: [EpTabs, EpTabPanel],
  template: `
    <ep-tabs ariaLabel="Example tabs">
      <ep-tab-panel id="one" label="One">First panel</ep-tab-panel>
      <ep-tab-panel id="two" label="Two">Second panel</ep-tab-panel>
    </ep-tabs>
  `,
})
class TabsHost {}

describe('EpTabs', () => {
  let fixture: ComponentFixture<TabsHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TabsHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('selects the first tab by default', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(el.textContent).toContain('First panel');
  });

  it('moves selection with arrow keys', () => {
    const el = fixture.nativeElement as HTMLElement;
    const tablist = el.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    const tabs = el.querySelectorAll('[role="tab"]');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(el.textContent).toContain('Second panel');
  });
});
