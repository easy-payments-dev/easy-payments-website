import { DocsLocaleBundle } from '../types';

export const angular120Pt: DocsLocaleBundle = {
  'getting-started': {
    title: 'Primeiros passos',
    description: 'O que é o Easy Payments, requisitos e como começar.',
    groupTitle: 'Primeiros passos',
    markdown: `# Primeiros passos

O Easy Payments para Angular (\`@easy-payments/angular\` **1.2.0**) é uma **biblioteca de integração** de código aberto para checkout com vários provedores.

Ela ajuda sua aplicação Angular a apresentar Card, PayPal, Apple Pay, Google Pay, Klarna e Affirm usando **suas** contas de lojista.

## O que é

- APIs standalone do Angular em torno dos SDKs dos provedores (Full Checkout, Buttons Only, Headless)
- Eventos normalizados de sucesso / cancelamento / erro para a experiência do usuário
- Modo mock opcional para demos locais sem cobranças reais
- Localização do checkout integrada (en / es / pt)

## O que não é

- Não é um processador de pagamentos
- Não é um banco nem um provedor de carteiras
- Não substitui a verificação no backend nem os webhooks
- **Não** movimenta dinheiro nem retém fundos

## Requisitos

| Requisito | Detalhe |
|-----------|---------|
| Angular | \`>=20.3.0 <23.0.0\` |
| Pacote | \`@easy-payments/angular@1.2.0\` |
| Stripe JS | Peer \`@stripe/stripe-js\` (\`^8.0.0\` conforme a orientação de peers publicada) |
| Backend | Endpoints HTTPS sob seu controle para os fluxos de criação/captura/confirmação |

As instalações de consumidor foram validadas em Angular **20**, **21** e **22** em testes de fumaça no modo mock.

## Modos no 1.2.0

| Superfície | API pública | Guia |
|------------|-------------|------|
| **Full Checkout** | \`<easy-payments>\` | [Full Checkout](./full-checkout) |
| **Buttons Only** | \`<easy-payment-buttons>\` | [Buttons Only](./buttons-only) |
| **Headless** | \`EasyPaymentsHeadless\` | [Headless](./headless) |

Veja [Modos de checkout](./checkout-modes). Perguntas frequentes: [FAQ](/faq).

> A documentação da revisão de lançamento é validada com o pacote local \`vendor/@easy-payments/angular@1.2.0\`. O comando de instalação público é \`npm install @easy-payments/angular@1.2.0\`.

## Experimente o playground do site

Use o [Angular Checkout Playground](/playground) para visualizar os três modos no modo mock. Os fluxos mock do Klarna são rotulados como **DEMO**.

## Próximos passos

1. [Instalação](./installation)
2. [Início rápido](./quick-start): primeiro Full Checkout em modo mock
3. [Modos de checkout](./checkout-modes)
4. [Configuração](./configuration)
5. [Segurança](./security)
`,
  },
  'installation': {
    title: 'Instalação',
    description: 'Instale o pacote Angular publicado e seus peers.',
    groupTitle: 'Primeiros passos',
    markdown: `# Instalação

Instale o pacote publicado e o peer Stripe.js:

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

## Dependências peer

| Pacote | Faixa |
|--------|-------|
| \`@angular/core\` | \`>=20.3.0 <23.0.0\` |
| \`@angular/common\` | \`>=20.3.0 <23.0.0\` |
| \`@stripe/stripe-js\` | \`^8.0.0\` |

## Providers da aplicação

O Easy Payments é **somente standalone** (sem NgModule). Registre o HTTP e o Easy Payments na configuração da sua aplicação:

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        stripe: { publishableKey: 'pk_test_your_key' },
        // Add PayPal / wallets / BNPL only when configured
      },
      // enableMockMode: true // local demos only — never in production
    }),
  ],
};
\`\`\`

## Credenciais

| Permitido no Angular | Nunca no Angular |
|----------------------|------------------|
| Chave **publicável** do Stripe (\`pk_test_\` / \`pk_live_\`) | Chave **secreta** do Stripe (\`sk_\`) |
| **Client ID** do PayPal | **Client Secret** do PayPal |
| Nomes públicos do lojista | Segredos de webhook (\`whsec_\`) |
| As URLs HTTPS do seu backend | Tokens de acesso / chaves privadas |

Veja [Segurança](./security).
`,
  },
  'quick-start': {
    title: 'Início rápido',
    description: 'Instale o 1.2.0, ative o modo mock e renderize seu primeiro Full Checkout.',
    groupTitle: 'Primeiros passos',
    markdown: `# Início rápido

**Pacote de destino:** \`@easy-payments/angular@1.2.0\`.
Este guia usa o **Full Checkout** (\`<easy-payments>\`) com \`enableMockMode\` para que você conclua uma primeira demo sem cobranças reais.

> Prefira um guia dedicado quando você já souber o formato da sua interface: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless). Visão geral: [Modos de checkout](./checkout-modes).

## 1. Instalar

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

Peers: Angular \`>=20.3.0 <23.0.0\`, \`@stripe/stripe-js\` \`^8.0.0\`. Os testes de fumaça verificados de consumidor cobrem Angular **20**, **21** e **22**.

> **Nota de revisão local:** este site valida os exemplos com o pacote local \`vendor/@easy-payments/angular@1.2.0\`. O comando de instalação acima é o comando público do npm para o dia do lançamento.

## 2. Registrar os providers (mock)

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      // Mock adapters — no real charges. Never enable in production.
      enableMockMode: true,
      providers: {},
    }),
  ],
};
\`\`\`

Para uma integração real com o Stripe em modo TEST mais adiante, adicione \`providers.stripe.publishableKey\` (\`pk_test_...\`) e suas URLs HTTPS em \`backend\`. Mantenha as chaves **secretas** apenas no servidor; veja [Segurança](./security).

## 3. Montar o Full Checkout

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
} from '@easy-payments/angular';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [EasyPaymentsComponent],
  template: \`
    <easy-payments
      [product]="product"
      [methods]="methods"
      theme="system"
      locale="auto"
      (success)="onSuccess($event)"
      (cancel)="onCancel($event)"
      (error)="onError($event)"
    />
  \`,
})
export class CheckoutComponent {
  readonly product: PaymentProduct = {
    id: 'premium',
    name: 'Premium Plan',
    description: 'Mock checkout example',
    amount: 99, // major units ($99.00)
    currency: 'USD',
    quantity: 1,
  };

  /** Allow-list and display order — controlled by you. */
  readonly methods: PaymentMethod[] = [
    'card',
    'paypal',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
  ];

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification
  }

  onCancel(result: PaymentResult): void {}

  onError(error: PaymentError): void {}
}
\`\`\`

## 4. O que você controla e o que a biblioteca oferece

| Você configura | A biblioteca oferece (Full Checkout) |
|----------------|--------------------------------------|
| Nome do produto, valor (unidades principais), moeda, quantidade | Estrutura do checkout, interface da lista de métodos, marcas dos provedores |
| Lista de métodos permitidos e ordem | Eventos normalizados \`success\` / \`cancel\` / \`error\` |
| \`theme\` (\`light\` \\| \`dark\` \\| \`system\`) e \`locale\` | Textos do checkout integrados em en / es / pt |

## Resultados mock

Injete \`MockPaymentController\` para forçar \`success\`, \`cancelled\` ou \`failed\` antes de pagar. Detalhes: [Modo mock](./mock-mode).

O Klarna no modo mock é um fluxo **DEMO** dos adaptadores da biblioteca, e não um checkout hospedado oficial do Klarna. Experimente no [Playground](/playground?demo=full).

## Em seguida

- [Modos de checkout](./checkout-modes): Full vs Buttons Only vs Headless
- [Guia do Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless)
- [Métodos de pagamento](./payment-methods): status real / sandbox / mock
- [Referência da API](./api-reference) · [Exemplos](./examples)
`,
  },
  'checkout-modes': {
    title: 'Modos de checkout',
    description: 'Compare Full Checkout, Buttons Only e Headless no Easy Payments 1.2.0.',
    groupTitle: 'Primeiros passos',
    markdown: `# Modos de checkout

O Easy Payments **1.2.0** traz três formatos de integração. Escolha o que corresponde a quanto da interface você quer que a biblioteca gerencie. Cada cartão responde às mesmas três perguntas na mesma ordem.

::: mode-cards
::: mode-card
## Full Checkout

- **Quando usar:** você quer o caminho mais rápido para um checkout completo: resumo do pedido, métodos de pagamento e confirmação em um único componente.
- **Quem controla a interface:** a biblioteca.
- **API pública:** \`<easy-payments>\` (\`EasyPaymentsComponent\`).

[Testar demo](/playground?demo=full) · [Ver guia](./full-checkout)
:::
::: mode-card
## Buttons Only

- **Quando usar:** você já tem a estrutura do carrinho ou do checkout e só precisa de uma faixa compacta de métodos de pagamento dentro dela.
- **Quem controla a interface:** compartilhada. A biblioteca renderiza a faixa e seu painel expansível; você controla tudo ao redor dela.
- **API pública:** \`<easy-payment-buttons>\` (\`EasyPaymentButtonsComponent\`) com \`[buttonsAppearance]\` para o estilo da faixa.

[Testar demo](/playground?demo=buttons) · [Ver guia](./buttons-only)
:::
::: mode-card
## Headless

- **Quando usar:** você precisa de um layout totalmente personalizado e só quer a sessão de pagamento e as superfícies dos provedores.
- **Quem controla a interface:** você. A biblioteca monta a interface do provedor nos seus contêineres e nunca entrega um design de checkout.
- **API pública:** \`EasyPaymentsHeadless\` (\`createSession()\`, \`mount()\`, \`confirm()\`).

[Testar demo](/playground?demo=headless) · [Ver guia](./headless)
:::
:::

## Como escolher rapidamente

1. Precisa de uma página de checkout completa amanhã → **Full Checkout**.
2. Já tem a estrutura do carrinho e precisa de uma faixa de pagamento → **Buttons Only**.
3. Precisa de um design totalmente personalizado → **Headless**.

Os três modos neste site funcionam com \`enableMockMode\`, então nenhum dinheiro é movimentado. Os fluxos mock do Klarna são rotulados como **DEMO**. Veja [Modo mock](./mock-mode) e a [FAQ](/faq#which-mode).

## Instale uma vez

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

Depois siga o guia do modo que corresponde à interface do seu produto.
`,
  },
  'full-checkout': {
    title: 'Full Checkout',
    description: 'Interface de checkout completa gerenciada pela biblioteca, com resumo do produto, métodos e resultados.',
    groupTitle: 'Primeiros passos',
    markdown: `# Full Checkout

**Quando escolher:** você quer que o Easy Payments controle a estrutura do checkout (resumo do produto, lista de métodos, confirmação e estados de sucesso) para lançar um checkout com vários provedores sem projetar a interface de pagamento.

**Demo mock executável:** [Playground → Full Checkout](/playground?demo=full)

## Instalação e providers

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true, // local demos only — never in production
      providers: {},
    }),
  ],
};
\`\`\`

## Exemplo completo de Full Checkout

Você define o produto, o preço (em unidades principais), a moeda, os métodos de pagamento e a ordem deles. A biblioteca renderiza a interface completa do checkout e emite resultados normalizados.

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
} from '@easy-payments/angular';

@Component({
  selector: 'app-store-checkout',
  standalone: true,
  imports: [EasyPaymentsComponent],
  template: \`
    <h1>Complete your purchase</h1>
    <easy-payments
      [product]="product"
      [methods]="methods"
      theme="system"
      appearance="default"
      [maxWidth]="640"
      successBehavior="confirmation"
      locale="auto"
      (success)="onSuccess($event)"
      (cancel)="onCancel($event)"
      (error)="onError($event)"
      (successContinue)="onContinue()"
    />
  \`,
})
export class StoreCheckoutComponent {
  /** Product + price + currency are owned by your app. */
  readonly product: PaymentProduct = {
    id: 'annual-pro',
    name: 'Annual Pro',
    description: 'Full library checkout for a subscription SKU',
    amount: 149, // major units → $149.00
    currency: 'USD',
    quantity: 1,
  };

  /** Allow-list + display order — Klarna is DEMO in mock mode. */
  readonly methods: PaymentMethod[] = [
    'card',
    'paypal',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
  ];

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification
    console.log('success', result.status, result.method);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result.method);
  }

  onError(error: PaymentError): void {
    console.error(error.code, error.message);
  }

  onContinue(): void {
    // Shopper dismissed the built-in success confirmation
  }
}
\`\`\`

## Resultados que você trata

| Saída | Significado |
|-------|-------------|
| \`success\` | O provedor/mock informou sucesso para a experiência do usuário; ainda assim, verifique no seu backend |
| \`cancel\` | O comprador cancelou |
| \`error\` | Falha no pagamento ou no SDK |
| \`successContinue\` | O comprador continuou a partir da interface de sucesso da biblioteca |

## Notas

- Os fluxos mock do Klarna são rotulados como **DEMO**; não são um checkout hospedado oficial do Klarna.
- Desative \`enableMockMode\` e forneça chaves publicáveis + backends HTTPS para sandbox/TEST ou suporte em produção verificado. Veja [Métodos de pagamento](./payment-methods).
- Compare os modos: [Modos de checkout](./checkout-modes) · [Buttons Only](./buttons-only) · [Headless](./headless)
`,
  },
  'buttons-only': {
    title: 'Buttons Only',
    description: 'Incorpore a faixa de pagamento da biblioteca no seu próprio carrinho ou checkout.',
    groupTitle: 'Primeiros passos',
    markdown: `# Buttons Only

**Quando escolher:** você já controla os totais do carrinho, o frete e o layout; só precisa da faixa compacta de pagamento do Easy Payments (\`<easy-payment-buttons>\`) com botões oficiais de carteiras e painéis expansíveis compartilhados para cartão / BNPL.

**Demo mock executável:** [Playground → Buttons Only](/playground?demo=buttons)

## Instalação e providers

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true, // local demos only — never in production
      providers: {},
    }),
  ],
};
\`\`\`

## Exemplo completo de Buttons Only

Sua aplicação mantém o resumo do pedido. O Easy Payments gerencia a faixa de pagamento. Você continua definindo produto, preço, moeda, métodos e ordem.

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentButtonsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
  PaymentStartedEvent,
} from '@easy-payments/angular';

@Component({
  selector: 'app-cart-payments',
  standalone: true,
  imports: [EasyPaymentButtonsComponent],
  template: \`
    <aside class="cart">
      <h2>{{ product.name }}</h2>
      <p>{{ product.amount }} {{ product.currency }}</p>
      <p>Shipping: Free · Taxes calculated at capture</p>
    </aside>

    <section aria-label="Pay with">
      <easy-payment-buttons
        [product]="product"
        [methods]="methods"
        layout="vertical"
        theme="system"
        locale="auto"
        checkoutInstanceId="store-cart-payments"
        (started)="onStarted($event)"
        (success)="onSuccess($event)"
        (cancel)="onCancel($event)"
        (error)="onError($event)"
      />
    </section>
  \`,
})
export class CartPaymentsComponent {
  readonly product: PaymentProduct = {
    id: 'hoodie-navy',
    name: 'Navy hoodie',
    description: 'Buttons Only strip inside a custom cart',
    amount: 68,
    currency: 'USD',
    quantity: 1,
  };

  /** Compact strip: wallets first, then card — order is yours. */
  readonly methods: PaymentMethod[] = [
    'apple-pay',
    'google-pay',
    'paypal',
    'card',
    'klarna',
  ];

  onStarted(event: PaymentStartedEvent): void {
    console.log('started', event.method);
  }

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification
    console.log('success', result.status, result.method);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result.method);
  }

  onError(error: PaymentError): void {
    console.error(error.code, error.message);
  }
}
\`\`\`

## Destaques de configuração

| Você define | A biblioteca oferece |
|-------------|----------------------|
| \`product\`, ordem de \`methods\` | Faixa compacta + botões oficiais de carteiras |
| \`layout\` (\`vertical\` \\| \`horizontal\`) | Painel expansível compartilhado para cartão / BNPL |
| \`theme\`, \`locale\`, \`checkoutInstanceId\` opcional | \`started\` / \`success\` / \`cancel\` / \`error\` normalizados |

## Notas

- O Klarna no modo mock continua sendo um adaptador **DEMO**; não é a interface oficial do Klarna.
- Prefira o Full Checkout quando você ainda não tiver a estrutura de um carrinho: [Full Checkout](./full-checkout).
- Precisa de controle visual total? [Headless](./headless). Visão geral: [Modos de checkout](./checkout-modes).
`,
  },
  'headless': {
    title: 'Headless',
    description: 'Crie uma interface de checkout personalizada sobre o EasyPaymentsHeadless enquanto a biblioteca monta as superfícies dos provedores.',
    groupTitle: 'Primeiros passos',
    markdown: `# Headless

**Quando escolher:** você controla cada pixel da interface do checkout (chips de métodos, rótulos e botões de confirmação) e só precisa que o Easy Payments monte as superfícies dos provedores (Payment Element para Card / Klarna / Affirm, PayPal Buttons, Google Pay, Apple Pay) e emita resultados normalizados.

**Demo mock executável:** [Playground → Headless](/playground?demo=headless)
O layout Headless do Playground é uma **interface de exemplo criada pelo consumidor**; o Headless em si não entrega estrutura de checkout.

## Instalação e providers

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true, // local demos only — never in production
      providers: {},
    }),
  ],
};
\`\`\`

## Exemplo completo de Headless

Sua aplicação define produto, preço, moeda, métodos e ordem; constrói a interface; e depois usa \`EasyPaymentsHeadless.createSession\` → \`initialize\` → \`selectMethod\` → \`mount\` → \`confirm\` (para métodos do tipo confirmação).

\`\`\`typescript
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  EasyPaymentsHeadless,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  type HeadlessCheckoutSession,
  type HeadlessMountHandle,
} from '@easy-payments/angular';

@Component({
  selector: 'app-custom-checkout',
  standalone: true,
  template: \`
    <h1>Custom branded checkout</h1>
    <p>{{ product.name }} — {{ product.amount }} {{ product.currency }}</p>

    <div role="list">
      @for (method of methods; track method) {
        <button type="button" role="listitem" (click)="select(method)">
          {{ method }}
        </button>
      }
    </div>

    <div #mountHost aria-label="Payment surface"></div>

    <button type="button" (click)="pay()" [disabled]="!canConfirm">
      Pay now
    </button>
  \`,
})
export class CustomCheckoutComponent implements OnInit, OnDestroy {
  private readonly headless = inject(EasyPaymentsHeadless);
  private readonly mountHost = viewChild.required<ElementRef<HTMLElement>>('mountHost');
  private session: HeadlessCheckoutSession | null = null;
  private mountHandle: HeadlessMountHandle | null = null;
  private events = new Subscription();
  protected canConfirm = false;

  readonly product: PaymentProduct = {
    id: 'studio-seat',
    name: 'Design studio seat',
    description: 'Headless custom UI example',
    amount: 220,
    currency: 'EUR',
    quantity: 1,
  };

  /** You choose methods and order for your brand experience. */
  readonly methods: PaymentMethod[] = ['card', 'paypal', 'klarna', 'affirm'];

  async ngOnInit(): Promise<void> {
    const session = this.headless.createSession({
      product: this.product,
      methods: this.methods,
      theme: 'system',
      locale: 'auto',
      // Stable id required if you recover Klarna/Affirm Stripe redirects after reload.
      checkoutInstanceId: 'store-custom-checkout',
    });
    this.session = session;

    this.events.add(
      session.events.success.subscribe((result) => {
        console.log('success', result.status, result.method);
      }),
    );
    this.events.add(
      session.events.cancel.subscribe((result) => {
        console.log('cancel', result.method);
      }),
    );
    this.events.add(
      session.events.error.subscribe((error: PaymentError) => {
        console.error(error.code, error.message);
      }),
    );

    await session.initialize();
    const first = session.availableMethods().find((entry) => entry.available);
    if (first) {
      await this.select(first.method);
    }
  }

  async select(method: PaymentMethod): Promise<void> {
    if (!this.session) return;
    this.session.selectMethod(method);
    if (this.mountHandle) {
      await this.mountHandle.unmount();
      this.mountHandle = null;
    }
    const host = this.mountHost().nativeElement;
    host.replaceChildren();
    this.mountHandle = await this.session.mount(method, host);
    const interaction = this.session
      .availableMethods()
      .find((entry) => entry.method === method)?.interaction;
    // PayPal / wallets own the gesture; card / BNPL / mock use confirm().
    this.canConfirm = interaction === 'confirm' || interaction === 'mock';
  }

  async pay(): Promise<void> {
    if (!this.session || !this.canConfirm) return;
    await this.session.confirm();
  }

  async ngOnDestroy(): Promise<void> {
    this.events.unsubscribe();
    if (this.mountHandle) await this.mountHandle.unmount();
    if (this.session) await this.session.destroy();
  }
}
\`\`\`

## Fluxo público do Headless

1. \`createSession({ product, methods, ... })\`
2. Inscreva-se em \`events.success\` / \`cancel\` / \`error\` (e, opcionalmente, \`started\`, \`pending\`, \`methodChange\`)
3. \`initialize()\` e depois leia \`availableMethods()\`
4. \`selectMethod\` + \`mount(method, container)\`
5. \`confirm()\` para \`card\` / \`klarna\` / \`affirm\` / mock; carteiras e PayPal usam seus botões oficiais
6. \`destroy()\` ao sair da página

## Notas

- As montagens mock do Klarna são adaptadores **DEMO**; não são a interface oficial do Klarna.
- Prefira o Buttons Only quando uma faixa da biblioteca for suficiente: [Buttons Only](./buttons-only).
- Prefira o Full Checkout para obter a estrutura completa: [Full Checkout](./full-checkout). Visão geral: [Modos de checkout](./checkout-modes).
`,
  },
  'configuration': {
    title: 'Configuração',
    description: 'Providers, URLs do backend e opções do checkout.',
    groupTitle: 'Configuração',
    markdown: `# Configuração

Configure o Easy Payments uma única vez com \`provideEasyPayments\`. O **consumidor** sempre controla o preço do produto, a moeda, a lista de métodos permitidos e a ordem, o tema e o idioma; a biblioteca não inventa preços de catálogo.

## Entradas do checkout controladas pelo consumidor

| Aspecto | Como |
|---------|------|
| Produto / preço / moeda | \`[product]\` (\`amount\` em **unidades principais**) |
| Conjunto e ordem dos métodos | Ordem do array \`[methods]\` |
| Tema | \`theme="light" \\| "dark" \\| "system"\` |
| Idioma (1.2.0) | \`locale="auto" \\| "en" \\| "es" \\| "pt"\` (+ \`translations\` opcional) |
| Largura / aparência do contêiner | \`maxWidth\`, \`appearance\` |

Veja também [Temas](./theming) e [Localização](./localization).

## EasyPaymentsConfig

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    paypal: { clientId: 'your-paypal-client-id', currency: 'USD', intent: 'capture' },
    applePay: { merchantName: 'Your Store', countryCode: 'US' },
    googlePay: {
      merchantName: 'Your Store',
      environment: 'TEST',
      countryCode: 'US',
    },
    klarna: { purchaseCountry: 'US' },
    affirm: { purchaseCountry: 'US' },
  },
  backend: {
    createPaymentUrl: 'https://api.example.com/api/payments/create',
    paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
    paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
    affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
    // confirmPaymentUrl is optional/reserved — not required for standard Stripe Payment Element flows
  },
  enableMockMode: false,
});
\`\`\`

### Campos de configuração por provedor

| Chave do provedor | Campos principais |
|-------------------|-------------------|
| \`stripe\` | \`publishableKey\` |
| \`paypal\` | \`clientId\`, \`currency\` opcional, \`intent\` (\`capture\` \\| \`authorize\`) |
| \`applePay\` | \`merchantName\`, \`countryCode\` (\`merchantId\` está obsoleto/é ignorado) |
| \`googlePay\` | \`merchantId?\`, \`merchantName?\`, \`environment\` (\`TEST\` \\| \`PRODUCTION\`), \`countryCode?\` |
| \`klarna\` | \`purchaseCountry?\`, \`locale?\` |
| \`affirm\` | \`purchaseCountry?\`, \`locale?\` |

### URLs do backend

Os campos opcionais de \`backend\` apontam para a **sua** API HTTPS. O Easy Payments não hospeda APIs de pagamento.

## Inputs do componente (Full Checkout)

| Input | Finalidade |
|-------|------------|
| \`product\` | \`PaymentProduct\` obrigatório |
| \`methods\` | Lista de métodos permitidos e ordem visual |
| \`checkout\` | \`CheckoutOptions\` opcional (\`successUrl\`, \`cancelUrl\`, \`successBehavior\`, \`customer\`, \`shipping\`) |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | Limitado entre 320 e 1200 (padrão 640) |
| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |

| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` | Idioma da interface (padrão \`auto\`) |
| \`translations\` | mapa parcial | Substituições opcionais de textos |

## Formato do produto

\`\`\`typescript
interface PaymentProduct {
  id: string;
  name: string;
  amount: number; // major units
  currency: string;
  description?: string;
  quantity?: number;
  imageUrl?: string;
  metadata?: Record<string, string>;
}
\`\`\`

Trate o \`amount\` do navegador como uma entrada de exibição não confiável. Seu backend deve derivar um preço confiável.

### Formato de CheckoutOptions (publicado)

\`\`\`typescript
interface CheckoutOptions {
  successUrl?: string;
  cancelUrl?: string;
  successBehavior?: 'confirmation' | 'event-only';
  customer?: { email?: string; name?: string };
  shipping?: { required?: boolean };
}
\`\`\`

**Não** existe o campo \`backend.baseUrl\` na versão publicada 1.2.0. Forneça URLs HTTPS absolutas (ou caminhos relativos à aplicação que sua camada HTTP resolva) em cada propriedade de URL do backend.
`,
  },
  'payment-methods': {
    title: 'Métodos de pagamento',
    description: 'Ids dos métodos, ordem e status real vs sandbox vs mock.',
    groupTitle: 'Configuração',
    markdown: `# Métodos de pagamento

Você controla quais métodos aparecem e em que ordem por meio do input \`methods\`. O Easy Payments não reordena sua lista de métodos permitidos.

\`\`\`typescript
methods: PaymentMethod[] = ['card', 'paypal', 'klarna'];
\`\`\`

## Matriz de status (baseada em evidências)

Os status abaixo descrevem o que este conjunto de documentação pode afirmar com honestidade sobre o Full Checkout do Angular **1.2.0** e o Playground mock do site. Eles **não** são uma garantia de elegibilidade do lojista.

| Id do método | Caminho do provedor | Status da integração | Notas |
|--------------|---------------------|----------------------|-------|
| \`card\` | Stripe Payment Element | **Real + sandbox/TEST** | Chave publicável + seu backend de criação de pagamento; use \`pk_test_\` em TEST |
| \`paypal\` | PayPal Buttons | **Real + sandbox** | Client ID no Angular; Client Secret apenas no seu servidor |
| \`apple-pay\` | Apple Pay via Stripe | **Real + TEST** (depende do dispositivo) | Exige HTTPS, dispositivo/navegador compatível e configuração de domínio no Stripe/Apple; pode ficar oculto quando indisponível |
| \`google-pay\` | Google Pay via Stripe | **Real + TEST** | \`environment: 'TEST' \\| 'PRODUCTION'\`; PRODUCTION exige o cadastro completo do lojista |
| \`klarna\` | Klarna via Stripe BNPL | **Caminho real documentado** + **mock DEMO** | A elegibilidade em produção depende de país/moeda/valor; o mock do site/playground é rotulado como **DEMO** (não é a interface oficial do Klarna) |
| \`affirm\` | Affirm via Stripe | **Caminho real documentado** + mock | Aplicam-se limites de elegibilidade; mock disponível com \`enableMockMode\` |

### Legenda

- **Real + sandbox/TEST**: existem APIs publicadas; você pode integrar com credenciais TEST/sandbox do provedor e seu backend.
- **Mock DEMO**: adaptadores locais de \`enableMockMode\` para demos de interface/eventos; **sem cobranças**.
- **Pendente**: não é afirmado aqui (exemplo: o Samsung Pay **não** está implementado).

## Não suportado

O **Samsung Pay** não está implementado.

## Armadilhas de disponibilidade

As carteiras podem estar configuradas e mesmo assim **não aparecer** quando o navegador, o dispositivo, o registro do domínio ou o cadastro do lojista estão incompletos. Veja [Solução de problemas](./troubleshooting) e a [FAQ](/faq#wallets-missing).

Guias por provedor: [Stripe](./stripe) · [PayPal](./paypal) · [Apple Pay](./apple-pay) · [Google Pay](./google-pay) · [Klarna](./klarna) · [Affirm](./affirm).
`,
  },
  'theming': {
    title: 'Temas',
    description: 'Tema, aparência e estilo visual.',
    groupTitle: 'Configuração',
    markdown: `# Temas

## Tema

\`\`\`html
<easy-payments theme="light" [product]="product" [methods]="methods" />
<easy-payments theme="dark" [product]="product" [methods]="methods" />
<easy-payments theme="system" [product]="product" [methods]="methods" />
\`\`\`

- \`light\` / \`dark\` forçam as cores do Easy Payments
- \`system\` segue \`prefers-color-scheme\` e é atualizado em tempo real

## Aparência

\`\`\`html
<easy-payments appearance="default" ... />
<easy-payments appearance="transparent" ... />
\`\`\`

| Valor | Efeito |
|-------|--------|
| \`default\` | Contêiner externo integrado |
| \`transparent\` | Remove a moldura externa para incorporar ao seu layout |

\`theme\` e \`appearance\` são independentes.

## Largura máxima

\`[maxWidth]\` é limitado entre **320** e **1200** (padrão **640**).
`,
  },
  'localization': {
    title: 'Localização',
    description: 'Idiomas de interface adicionados no Angular 1.2.0.',
    groupTitle: 'Configuração',
    markdown: `# Localização

Adicionado no **Angular 1.2.0**.

## Input de idioma

\`\`\`html
<easy-payments
  locale="auto"
  [product]="product"
  [methods]="methods"
/>
\`\`\`

Valores permitidos: \`auto\` | \`en\` | \`es\` | \`pt\` (padrão \`auto\`).

A detecção automática do navegador mapeia assim:

- \`es-*\` → espanhol
- \`pt-*\` → português
- \`en-*\` → inglês
- outros idiomas → inglês como alternativa

## Traduções

O \`[translations]\` opcional fornece substituições parciais de textos. Ordem de resolução: substituição → dicionário do idioma → inglês.

## Exibição de valores

Os valores usam a formatação \`Intl\` do idioma ativo **sem converter a moeda**. \`product.amount\` e \`product.currency\` permanecem inalterados.

## Superfícies dos provedores

As folhas controladas pelos provedores (carteiras, interfaces de bancos) podem seguir suas próprias regras de idioma e não são totalmente controladas pelo Easy Payments.
`,
  },
  'stripe': {
    title: 'Stripe Card',
    description: 'Pagamentos com cartão via Stripe Payment Element.',
    groupTitle: 'Integrações',
    markdown: `# Stripe Card

O checkout com cartão usa o Stripe Payment Element por meio do Easy Payments.

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_your_publishable_key' },
  },
  backend: {
    createPaymentUrl: 'https://api.example.com/api/payments/create',
  },
});
\`\`\`

## Regras do frontend

- Somente a chave **publicável** pertence ao Angular
- O número do cartão, o CVC e a validade permanecem dentro dos campos hospedados pelo Stripe
- Chaves secretas e segredos de webhook permanecem no servidor

## Backend

Seu endpoint de criação de pagamento deve criar um PaymentIntent (ou equivalente) com valor/moeda **confiáveis no servidor** e devolver o client secret que seu adaptador espera.

Não conclua o pedido apenas com base no evento \`success\` do navegador: confirme o status do PaymentIntent no servidor ou por meio de webhooks assinados.
`,
  },
  'paypal': {
    title: 'PayPal',
    description: 'Botões do PayPal com criação/captura no servidor.',
    groupTitle: 'Integrações',
    markdown: `# PayPal

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    paypal: {
      clientId: 'your-paypal-client-id',
      currency: 'USD',
      intent: 'capture',
    },
  },
  backend: {
    paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
    paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
  },
});
\`\`\`

## Credenciais

| No Angular | Somente no servidor |
|------------|---------------------|
| Client ID do PayPal | Client Secret do PayPal |
| | Credenciais de verificação de webhook |

## Preços

Trate o \`product.amount\` do cliente como não confiável. As rotas de criação/captura devem definir o preço a partir do seu catálogo.
`,
  },
  'apple-pay': {
    title: 'Apple Pay',
    description: 'Apple Pay via Stripe Express Checkout.',
    groupTitle: 'Integrações',
    markdown: `# Apple Pay

O Apple Pay é oferecido por meio de fluxos de carteira com suporte do Stripe.

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    applePay: {
      merchantName: 'Your Store',
      countryCode: 'US',
    },
  },
});
\`\`\`

## Requisitos

- Dispositivo/navegador compatível com Apple Pay
- Verificação de domínio do Apple Pay no Stripe para uso em produção
- Nome de exibição do lojista para a folha de pagamento

\`merchantId\` na configuração do Apple Pay está obsoleto/é ignorado no modelo de configuração público atual; siga a orientação de registro de domínio do Stripe.

O Apple Pay em produção em um domínio verificado pode exigir configuração adicional do lojista, além dos testes locais em modo mock.
`,
  },
  'google-pay': {
    title: 'Google Pay',
    description: 'Botão do Google Pay com confirmação do Stripe.',
    groupTitle: 'Integrações',
    markdown: `# Google Pay

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    googlePay: {
      merchantName: 'Your Store',
      environment: 'TEST',
      countryCode: 'US',
    },
  },
});
\`\`\`

## Ambientes

| Valor | Uso |
|-------|-----|
| \`TEST\` | Desenvolvimento / testes no estilo sandbox |
| \`PRODUCTION\` | Configuração de lojista em produção |

O Google Pay \`PRODUCTION\` e as cobranças reais exigem o cadastro completo do lojista. Demos locais costumam usar o modo mock ou TEST.
`,
  },
  'klarna': {
    title: 'Klarna',
    description: 'Klarna BNPL via Stripe: caminho real e ressalvas do mock DEMO.',
    groupTitle: 'Integrações',
    markdown: `# Klarna

O Klarna é integrado como **BNPL com suporte do Stripe** no Full Checkout do Angular **1.2.0** publicado.

## Configuração real / TEST

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    klarna: {
      purchaseCountry: 'US',
    },
  },
  backend: {
    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
  },
});
\`\`\`

### Frontend

- Inclua \`'klarna'\` em \`[methods]\`
- Somente a chave publicável do Stripe no navegador
- \`checkout.successUrl\` / \`cancelUrl\` opcionais na sua origem para retornos por redirecionamento

### Backend

- Crie/confirme o PaymentIntent (ou equivalente) com chaves **secretas** no servidor
- Verifique os webhooks antes de concluir pedidos; o \`success\` do navegador é apenas experiência do usuário

## Elegibilidade

A disponibilidade depende do país do lojista, da moeda, do valor do produto e da configuração do Klarna/Stripe. Nem todo comprador ou item do catálogo é elegível.

## Mock DEMO (Playground / enableMockMode)

Quando \`enableMockMode: true\`, o Klarna usa o adaptador **mock DEMO** da biblioteca:

- **Sem** janela hospedada real do Klarna
- **Não** é uma interface de checkout sandbox oficial do Klarna
- Os resultados vêm do \`MockPaymentController\` (\`success\` / \`cancelled\` / \`failed\`)

Experimente o fluxo DEMO rotulado no [Playground](/playground). Detalhes: [Modo mock](./mock-mode).
`,
  },
  'affirm': {
    title: 'Affirm',
    description: 'Pagamento parcelado do Affirm por meio de fluxos com suporte do Stripe.',
    groupTitle: 'Integrações',
    markdown: `# Affirm

O Affirm é integrado como pagamento parcelado com suporte do Stripe.

## Configurar

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    affirm: {
      purchaseCountry: 'US',
    },
  },
  backend: {
    affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
  },
});
\`\`\`

## Notas

- A elegibilidade do Affirm (incluindo valores mínimos e moedas compatíveis, como USD/CAD na documentação do provedor) é aplicada pelo Affirm/Stripe; não é inventada por este site
- Trate o sucesso no navegador apenas como experiência do usuário; verifique no servidor
`,
  },
  'mock-mode': {
    title: 'Modo mock',
    description: 'Demos locais sem cobranças reais.',
    groupTitle: 'Guias',
    markdown: `# Modo mock

Ative os adaptadores mock para demos locais da interface:

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_demo' },
  },
  enableMockMode: true,
});
\`\`\`

## Comportamento

- Todos os métodos configurados usam adaptadores mock
- **Nenhum dinheiro real** é processado
- Útil para capturas de tela, QA de layout e ligação de eventos

## MockPaymentController

Helper publicado para os resultados das demos:

\`\`\`typescript
import { MockPaymentController } from '@easy-payments/angular';

controller.setOutcome('success' | 'cancelled' | 'failed');
controller.setUnavailableMethods(['apple-pay']);
controller.setDelay(500);
controller.reset();
\`\`\`

## Produção

Nunca ative \`enableMockMode\` em builds de produção.
`,
  },
  'testing': {
    title: 'Testes',
    description: 'Chaves de teste, sandbox e limites da verificação.',
    groupTitle: 'Guias',
    markdown: `# Testes

## Camadas recomendadas

1. **Modo mock** para a interface e a ligação de eventos
2. Credenciais **TEST / Sandbox** do provedor para ensaios de integração
3. Testes de contrato do backend contra seus endpoints de criação/captura
4. Testes de verificação de assinatura de webhook no servidor

## O que a verificação local não comprova

- Cobranças reais em produção
- Apple Pay em um domínio de produção verificado
- Google Pay \`PRODUCTION\` de ponta a ponta
- A entrega real de webhooks do provedor para o seu servidor entre ambientes

Documente as diferenças entre ambientes de forma explícita nos seus runbooks.
`,
  },
  'error-handling': {
    title: 'Tratamento de erros',
    description: 'Códigos de PaymentError e eventos de experiência do usuário.',
    groupTitle: 'Guias',
    markdown: `# Tratamento de erros

Escute \`error\` em \`<easy-payments>\` e prefira os valores estáveis de \`PaymentError.code\` ao registrar logs.

## Códigos comuns

| Código | Significado |
|--------|-------------|
| \`CONFIG_MISSING\` | Configuração obrigatória ausente |
| \`CONFIG_INVALID\` | Configuração rejeitada |
| \`PRODUCT_INVALID\` | Payload do produto inválido |
| \`PROVIDER_UNAVAILABLE\` | Método indisponível neste ambiente |
| \`PROVIDER_NOT_CONFIGURED\` | Provedor não configurado |
| \`PAYMENT_CANCELLED\` | O comprador cancelou |
| \`PAYMENT_FAILED\` | O pagamento falhou |
| \`CARD_DECLINED\` | Cartão recusado |
| \`AUTHENTICATION_REQUIRED\` / \`AUTHENTICATION_FAILED\` | Desafios de autenticação |
| \`NETWORK_ERROR\` | Falha de rede |
| \`SDK_LOAD_FAILED\` | Falha ao carregar o SDK do provedor |
| \`BACKEND_ERROR\` | A requisição ao backend falhou |
| \`PROVIDER_NOT_IMPLEMENTED\` | Caminho do provedor não implementado |
| \`UNKNOWN\` | Não classificado |

Prefira \`code\` à \`message\` livre para métricas e alertas.

Falhas de configuração devem aparecer como \`error\`, e não como \`cancel\` do comprador.
`,
  },
  'security': {
    title: 'Segurança',
    description: 'Segredos, verificação e regras de conclusão de pedidos.',
    groupTitle: 'Guias',
    markdown: `# Segurança

O Easy Payments é uma **biblioteca de integração**, não um processador de pagamentos.

## Seguro para o frontend

- Chaves publicáveis do Stripe (\`pk_test_\` / \`pk_live_\`)
- Client ID do PayPal
- Nomes públicos do lojista
- URLs HTTPS do **seu** backend

Os dados do cartão permanecem no Stripe Elements. O Easy Payments **não** afirma conformidade PCI automática: siga as obrigações do Stripe e as suas próprias.

## Nunca no Angular

- Chaves secretas do Stripe (\`sk_\`)
- Segredos de webhook do Stripe (\`whsec_\`)
- Client Secret do PayPal / segredos de verificação de webhook
- Chaves privadas, tokens de acesso, senhas

## Preços

O \`product.amount\` do navegador não é confiável. O backend deve validar a identidade do produto, o valor, a moeda e a quantidade antes de criar ou capturar uma cobrança.

## Conclusão do pedido

Os eventos do Angular (\`success\`, \`cancel\`, \`error\`, \`successContinue\`) são **apenas sinais de experiência do usuário**.

Conclua o pedido a partir de:

1. Webhooks verificados do provedor, ou
2. Consulta no servidor do status do PaymentIntent / da captura

## Modo mock

\`enableMockMode: true\` nunca processa dinheiro real. Desative em produção.

## Metadados

O \`PaymentProduct.metadata\` opcional não deve conter segredos nem dados pessoais (PII). Trate-o como entrada não confiável do navegador; valide novamente no servidor.
`,
  },
  'troubleshooting': {
    title: 'Solução de problemas',
    description: 'Falhas comuns de configuração e verificações.',
    groupTitle: 'Guias',
    markdown: `# Solução de problemas

## O checkout não exibe um método

- Confirme que o id do método está listado em \`[methods]\`
- Confirme que o bloco do provedor correspondente existe em \`provideEasyPayments\`
- Verifique o suporte de dispositivo/navegador para carteiras
- Experimente o modo mock para separar problemas de interface do cadastro no provedor

## Os pagamentos falham imediatamente

- Inspecione \`PaymentError.code\`
- Verifique se as URLs do backend são HTTPS e estão acessíveis
- Confirme que as chaves TEST e de produção correspondem ao ambiente
- Garanta que as chaves secretas não estejam ausentes no servidor

## Sucesso no navegador, mas sem pedido

É o esperado se você conclui pedidos apenas com eventos do cliente. Implemente a verificação de webhooks ou consultas de status no servidor.

## O tema parece errado

- Use \`light\` / \`dark\` / \`system\` (não \`white\`)
- Lembre-se de que a moldura controlada pelo provedor não é totalmente controlada pelos tokens do Easy Payments
`,
  },
  'api-reference': {
    title: 'Referência da API',
    description: 'API pública do Full Checkout, Buttons Only e Headless para o 1.2.0.',
    groupTitle: 'Referência',
    markdown: `# Referência da API

Superfície pública do Angular **1.2.0**. Guias por modo: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless). Mocks executáveis: [Playground](/playground).

## Provider

- \`provideEasyPayments(config: EasyPaymentsConfig)\`
- \`MockPaymentController\`: força resultados mock quando \`enableMockMode: true\`

## Full Checkout

- \`EasyPaymentsComponent\` com seletor \`<easy-payments>\`

### Inputs

| Nome | Tipo / notas |
|------|--------------|
| \`product\` | \`PaymentProduct\` obrigatório |
| \`methods\` | Lista permitida/ordem de \`PaymentMethod[]\` |
| \`checkout\` | Opções de checkout opcionais |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | number \\| string, limitado entre 320 e 1200 (padrão 640) |
| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |
| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` |
| \`translations\` | \`Partial<EasyPaymentsTranslations>\` |

### Outputs

| Nome | Finalidade |
|------|------------|
| \`success\` | O pagamento foi concluído (experiência do usuário) |
| \`cancel\` | Pagamento cancelado |
| \`error\` | Erro de pagamento |
| \`successContinue\` | O comprador continuou a partir da interface de sucesso |

## Buttons Only

- \`EasyPaymentButtonsComponent\` com seletor \`<easy-payment-buttons>\`

### Inputs (resumo)

| Nome | Tipo / notas |
|------|--------------|
| \`product\` | \`PaymentProduct\` obrigatório |
| \`methods\` | Lista permitida/ordem de \`PaymentMethod[]\` |
| \`layout\` | \`vertical\` \\| \`horizontal\` |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`locale\` / \`translations\` | Mesmo modelo de idioma do Full Checkout |
| \`checkoutInstanceId\` | Id de host estável opcional para a posse do redirecionamento BNPL |
| \`buttonsAppearance\` / \`visualStyle\` / \`cardButtonAppearance\` | Apresentação opcional da faixa / CTA |
| \`bnplConfirmMode\` | Estratégia de confirmação do Klarna/Affirm |
| \`selectorVisibility\` | \`library\` \\| \`merchant\` |

### Outputs

| Nome | Finalidade |
|------|------------|
| \`started\` | A tentativa de pagamento começou |
| \`methodChange\` | A seleção mudou |
| \`success\` / \`cancel\` / \`error\` | Eventos terminais de experiência do usuário |

## Headless

- \`EasyPaymentsHeadless\` (injetável) → \`createSession(options)\` → \`HeadlessCheckoutSession\`

### Destaques da sessão

| Membro | Finalidade |
|--------|------------|
| \`initialize()\` | Resolve a disponibilidade |
| \`availableMethods\` / \`selectedMethod\` / \`state\` | Signals |
| \`selectMethod\` / \`mount\` / \`confirm\` | Conduzem o pagamento |
| \`recoverReturn()\` | Recuperação do redirecionamento do Stripe para Klarna/Affirm |
| \`events.success\` / \`cancel\` / \`error\` / \`started\` / \`pending\` / \`methodChange\` | Observables |
| \`destroy()\` | Libera os recursos |

## Tipos principais

- \`PaymentMethod\`: \`card\` \\| \`paypal\` \\| \`apple-pay\` \\| \`google-pay\` \\| \`klarna\` \\| \`affirm\`
- \`PaymentProduct\`, \`PaymentResult\`, \`PaymentError\`, \`CheckoutOptions\`

> Validado com o arquivo de declaração local \`vendor/@easy-payments/angular@1.2.0\` para a revisão de lançamento. A publicação pública no npm é uma etapa separada.
`,
  },
  'examples': {
    title: 'Exemplos',
    description: 'Exemplos de configuração e checkout prontos para copiar.',
    groupTitle: 'Referência',
    markdown: `# Exemplos

## Instalar

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

## Registro dos providers

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        stripe: { publishableKey: 'pk_test_replace_me' },
        paypal: { clientId: 'replace_me' },
      },
      backend: {
        createPaymentUrl: 'https://api.example.com/api/payments/create',
        paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
        paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
      },
    }),
  ],
};
\`\`\`

## Checkout básico

\`\`\`html
<easy-payments
  [product]="product"
  [methods]="['card', 'paypal']"
  theme="system"
  appearance="default"
  [maxWidth]="640"
  (success)="onSuccess($event)"
  (error)="onError($event)"
/>
\`\`\`

## Configuração do tema

\`\`\`html
<easy-payments
  theme="dark"
  appearance="transparent"
  [product]="product"
  [methods]="methods"
/>
\`\`\`

## Modo mock

\`\`\`typescript
provideEasyPayments({
  providers: { stripe: { publishableKey: 'pk_test_demo' } },
  enableMockMode: true,
});
\`\`\`

Substitua as chaves publicáveis e os Client IDs pelas suas próprias credenciais TEST. Mantenha os segredos no servidor.

## Playground interativo

Gere visualmente trechos de código específicos para cada versão no [Angular Checkout Playground](/playground). É uma ferramenta de demonstração com uma simulação local rotulada, e não um fluxo de cobrança real.
`,
  },
  'migration': {
    title: 'Migração',
    description: 'Notas de atualização de 1.0.x / 1.1.0 para 1.2.0.',
    groupTitle: 'Referência',
    markdown: `# Migração

## 1.1.0 → 1.2.0

O 1.2.0 adiciona **Buttons Only** e **Headless** ao lado do Full Checkout.

### O que mudou

- Novo componente \`<easy-payment-buttons>\`
- Nova API de sessão \`EasyPaymentsHeadless\`
- A localização do Full Checkout introduzida no 1.1.0 continua disponível

### Passos de atualização

1. Instale \`@easy-payments/angular@1.2.0\`
2. Mantenha o uso atual de \`<easy-payments>\` ou adote Buttons Only / Headless
3. Faça testes de regressão dos fluxos mock e sandbox dos métodos que você ativar

Guias por modo: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless)

## 1.0.x → 1.2.0

Se você ainda está no 1.0.x, trate como uma atualização combinada de localização + modos:

1. Instale \`@easy-payments/angular@1.2.0\`
2. Opcionalmente defina \`locale\` / \`translations\` no Full Checkout ou no Buttons Only
3. Faça testes de regressão dos textos do checkout em en / es / pt
4. Opcionalmente adote Buttons Only ou Headless

O nome do pacote e a faixa peer do Angular (\`>=20.3.0 <23.0.0\`) continuam iguais. Nenhuma semântica de conversão de moeda foi adicionada.
`,
  },
};
