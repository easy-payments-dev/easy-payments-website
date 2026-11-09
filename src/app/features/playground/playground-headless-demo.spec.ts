import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PaymentMethod, PaymentProduct } from '@easy-payments/angular';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { PlaygroundHeadlessDemo } from './playground-headless-demo';
import { providePlaygroundEasyPayments } from './playground.providers';

const PRODUCT: PaymentProduct = {
  id: 'headless-spec',
  name: 'Spec Plan',
  description: 'Spec description',
  amount: 25,
  currency: 'USD',
  quantity: 2,
};

describe('PlaygroundHeadlessDemo', () => {
  let fixture: ComponentFixture<PlaygroundHeadlessDemo>;

  async function mount(methods: PaymentMethod[]): Promise<HTMLElement> {
    fixture = TestBed.createComponent(PlaygroundHeadlessDemo);
    fixture.componentRef.setInput('product', PRODUCT);
    fixture.componentRef.setInput('methods', methods);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaygroundHeadlessDemo],
      providers: [
        provideRouter([]),
        providePlaygroundEasyPayments(),
        SiteI18nService,
      ],
    }).compileComponents();
  });

  it('renders a merchant-owned consumer UI with product, mount host, and notice', async () => {
    const root = await mount(['card', 'klarna']);
    expect(root.textContent).toContain('Merchant-owned UI');
    expect(root.querySelector('.headless-demo__notice')?.textContent).toContain(
      'merchant-owned UI',
    );
    expect(root.querySelector('.headless-demo__product')?.textContent).toContain(
      'Spec Plan',
    );
    expect(root.textContent).toContain('$25.00');
    expect(root.textContent).toContain('$50.00');
    expect(root.querySelector('.headless-demo__mount-host')).toBeTruthy();
  });

  it('lists methods with DEMO badges in mock mode', async () => {
    const root = await mount(['card', 'klarna', 'affirm']);
    const rows = root.querySelectorAll('.headless-demo__method');
    expect(rows.length).toBeGreaterThan(0);
    expect(root.querySelectorAll('.headless-demo__badge--demo').length).toBe(
      rows.length,
    );
    expect(root.querySelector('.headless-demo__badge--demo')?.textContent).toContain(
      'DEMO',
    );
  });

  it('shows the confirm CTA for the selected mock/confirm method', async () => {
    const root = await mount(['card']);
    const confirm = root.querySelector(
      '.headless-demo__pay',
    ) as HTMLButtonElement | null;
    expect(confirm).toBeTruthy();
    expect(confirm?.textContent).toContain('Confirm payment');
  });
});
