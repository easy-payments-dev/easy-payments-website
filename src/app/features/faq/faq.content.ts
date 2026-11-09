import { SiteLanguage } from '../../core/i18n/site-locale';

export interface FaqItem {
  id: string;
  question: string;
  /** Plain paragraphs; keep short. */
  answer: readonly string[];
  /** Optional internal links shown after the answer. */
  links?: readonly { href: string; label: string }[];
}

const en: readonly FaqItem[] = [
  {
    id: 'what-it-solves',
    question: 'What does Easy Payments solve?',
    answer: [
      'It is an open-source Angular integration library that helps you present Card, PayPal, Apple Pay, Google Pay, Klarna, and Affirm with your own merchant accounts.',
      'It is not a payment processor and does not move or hold funds.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/getting-started', label: 'Getting started' },
    ],
  },
  {
    id: 'which-mode',
    question: 'When should I use Full Checkout, Buttons Only, or Headless?',
    answer: [
      'Full Checkout (1.2.0) gives you the complete library UI.',
      'Buttons Only and Headless are also available in 1.2.0: use Buttons Only for a compact strip, Headless when you own the entire layout.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/checkout-modes', label: 'Checkout modes' },
      { href: '/playground', label: 'Playground' },
    ],
  },
  {
    id: 'backend-accounts',
    question: 'Do I need a backend or an account with each provider?',
    answer: [
      'For real payments, yes: you need merchant accounts with the providers you enable, and HTTPS backends you control for create/capture/confirm and webhooks.',
      'Mock mode can demo UI without provider charges, but it is never a substitute for production backends.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/configuration', label: 'Configuration' },
      { href: '/docs/angular/1.2.0/security', label: 'Security' },
    ],
  },
  {
    id: 'methods-status',
    question: 'Which methods work in real, sandbox, or demo only?',
    answer: [
      'Card, PayPal, Apple Pay, and Google Pay have documented real/TEST paths. Klarna and Affirm have documented real paths plus mock adapters.',
      'Klarna’s simulated Playground flow is labeled DEMO — it is not an official Klarna checkout window.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/payment-methods', label: 'Payment methods' },
    ],
  },
  {
    id: 'demo-charges',
    question: 'Does the demo charge money?',
    answer: [
      'No. The website Playground and enableMockMode adapters do not process real charges.',
    ],
    links: [{ href: '/docs/angular/1.2.0/mock-mode', label: 'Mock mode' }],
  },
  {
    id: 'price-order',
    question: 'Who controls price, currency, and method order?',
    answer: [
      'You do. Pass product amount (major units), currency, and the methods array in the order you want them shown.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/configuration', label: 'Configuration' },
    ],
  },
  {
    id: 'locale-theme',
    question: 'How do I change language and theme?',
    answer: [
      'Checkout: theme light / dark / system; on 1.1.0 also locale auto / en / es / pt (and optional translations).',
      'This website chrome uses the same three theme preferences and en / es / pt site languages.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/theming', label: 'Theming' },
      { href: '/docs/angular/1.2.0/localization', label: 'Localization' },
    ],
  },
  {
    id: 'wallets-missing',
    question: 'Why might Apple Pay or Google Pay not appear?',
    answer: [
      'They depend on device, browser, HTTPS, provider environment, and merchant/domain onboarding. Configured methods can still stay hidden when the wallet is unavailable.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/troubleshooting', label: 'Troubleshooting' },
      { href: '/docs/angular/1.2.0/apple-pay', label: 'Apple Pay' },
      { href: '/docs/angular/1.2.0/google-pay', label: 'Google Pay' },
    ],
  },
  {
    id: 'keys',
    question: 'Where do I configure public and secret keys?',
    answer: [
      'Public values only in Angular (Stripe publishable key, PayPal Client ID). Secret keys, client secrets, and webhook secrets stay on your server — never in the frontend bundle.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/installation', label: 'Installation' },
      { href: '/docs/angular/1.2.0/security', label: 'Security' },
    ],
  },
  {
    id: 'events',
    question: 'How do I handle success, cancel, and errors?',
    answer: [
      'Listen to success, cancel, and error outputs for UX. Fulfill orders only after server-side verification or provider webhooks — browser success alone is not proof of payment.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/error-handling', label: 'Error handling' },
    ],
  },
  {
    id: 'angular-versions',
    question: 'Which Angular versions are verified?',
    answer: [
      'The published package peer range is >=20.3.0 <23.0.0. Consumer mock-mode smoke tests cover Angular 20, 21, and 22.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/getting-started', label: 'Getting started' },
    ],
  },
  {
    id: 'cost',
    question: 'How much does the library cost, and where do I check provider fees?',
    answer: [
      'Easy Payments is free and open source under the MIT license.',
      'Card networks and providers (Stripe, PayPal, Klarna, Affirm, and others) charge their own fees — check each provider’s pricing pages for your account and region.',
    ],
  },
  {
    id: 'report-issue',
    question: 'Where do I report a problem or suggest an improvement?',
    answer: [
      'Open an issue or discussion on the Angular library GitHub repository, or use the website contact form when it is configured.',
    ],
    links: [
      {
        href: 'https://github.com/easy-payments-dev/easy-payments-angular/issues',
        label: 'GitHub issues',
      },
      { href: '/contact', label: 'Contact' },
      { href: '/support', label: 'Support the project' },
    ],
  },
];

const es: readonly FaqItem[] = [
  {
    id: 'what-it-solves',
    question: '¿Qué resuelve Easy Payments?',
    answer: [
      'Es una librería Angular de código abierto que ayuda a presentar Card, PayPal, Apple Pay, Google Pay, Klarna y Affirm con tus propias cuentas de comercio.',
      'No es un procesador de pagos y no mueve ni custodia fondos.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/getting-started', label: 'Primeros pasos' },
    ],
  },
  {
    id: 'which-mode',
    question: '¿Cuándo uso Full Checkout, Buttons Only o Headless?',
    answer: [
      'Full Checkout (1.2.0) ofrece la UI completa de la librería.',
      'Buttons Only y Headless también están disponibles en 1.2.0: strip compacto vs layout totalmente tuyo.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/checkout-modes', label: 'Modos de checkout' },
      { href: '/playground', label: 'Playground' },
    ],
  },
  {
    id: 'backend-accounts',
    question: '¿Necesito backend o una cuenta con cada proveedor?',
    answer: [
      'Para pagos reales, sí: cuentas de comercio y backends HTTPS propios para create/capture/confirm y webhooks.',
      'El modo mock demuestra la UI sin cargos, pero no sustituye backends de producción.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/configuration', label: 'Configuración' },
      { href: '/docs/angular/1.2.0/security', label: 'Seguridad' },
    ],
  },
  {
    id: 'methods-status',
    question: '¿Qué métodos funcionan en real, sandbox o solo demo?',
    answer: [
      'Card, PayPal, Apple Pay y Google Pay tienen rutas reales/TEST documentadas. Klarna y Affirm tienen ruta real documentada y adaptadores mock.',
      'El flujo simulado de Klarna en el Playground está etiquetado DEMO — no es el checkout oficial de Klarna.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/payment-methods', label: 'Métodos de pago' },
    ],
  },
  {
    id: 'demo-charges',
    question: '¿La demo cobra dinero?',
    answer: [
      'No. El Playground y enableMockMode no procesan cargos reales.',
    ],
    links: [{ href: '/docs/angular/1.2.0/mock-mode', label: 'Modo mock' }],
  },
  {
    id: 'price-order',
    question: '¿Quién controla el precio, la moneda y el orden de los métodos?',
    answer: [
      'Tú. Pasas el producto (importe en unidades mayores), la moneda y el array methods en el orden deseado.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/configuration', label: 'Configuración' },
    ],
  },
  {
    id: 'locale-theme',
    question: '¿Cómo cambio el idioma y el tema?',
    answer: [
      'Checkout: theme light / dark / system; en 1.1.0 también locale auto / en / es / pt.',
      'Este sitio usa las mismas tres preferencias de tema e idiomas en / es / pt.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/theming', label: 'Temas' },
      { href: '/docs/angular/1.2.0/localization', label: 'Localización' },
    ],
  },
  {
    id: 'wallets-missing',
    question: '¿Por qué Apple Pay o Google Pay podrían no aparecer?',
    answer: [
      'Dependen del dispositivo, navegador, HTTPS, entorno del proveedor y onboarding. Un método configurado puede ocultarse si el wallet no está disponible.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/troubleshooting', label: 'Solución de problemas' },
    ],
  },
  {
    id: 'keys',
    question: '¿Dónde configuro las claves públicas y las secretas?',
    answer: [
      'Solo valores públicos en Angular (clave publicable de Stripe, Client ID de PayPal). Los secretos viven en tu servidor.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/security', label: 'Seguridad' },
    ],
  },
  {
    id: 'events',
    question: '¿Cómo manejo éxito, cancelación y errores?',
    answer: [
      'Usa los outputs success, cancel y error para UX. Cumple pedidos solo tras verificación en servidor o webhooks.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/error-handling', label: 'Errores' },
    ],
  },
  {
    id: 'angular-versions',
    question: '¿Qué versiones de Angular están verificadas?',
    answer: [
      'Peers: >=20.3.0 <23.0.0. Pruebas mock de consumidor en Angular 20, 21 y 22.',
    ],
  },
  {
    id: 'cost',
    question: '¿Cuánto cuesta la librería y dónde consulto las tarifas del proveedor?',
    answer: [
      'Easy Payments es gratuita y MIT.',
      'Stripe, PayPal, Klarna, Affirm y demás cobran sus propias tarifas — consulta la pricing de cada proveedor.',
    ],
  },
  {
    id: 'report-issue',
    question: '¿Dónde reporto un problema o propongo una mejora?',
    answer: [
      'Abre un issue en el repositorio Angular de GitHub, o usa el formulario de contacto cuando esté configurado.',
    ],
    links: [
      {
        href: 'https://github.com/easy-payments-dev/easy-payments-angular/issues',
        label: 'Issues en GitHub',
      },
      { href: '/contact', label: 'Contacto' },
      { href: '/support', label: 'Apoya el proyecto' },
    ],
  },
];

const pt: readonly FaqItem[] = [
  {
    id: 'what-it-solves',
    question: 'O que o Easy Payments resolve?',
    answer: [
      'É uma biblioteca Angular open-source que ajuda a apresentar Card, PayPal, Apple Pay, Google Pay, Klarna e Affirm com as suas contas de comerciante.',
      'Não é um processador de pagamentos e não move nem guarda fundos.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/getting-started', label: 'Primeiros passos' },
    ],
  },
  {
    id: 'which-mode',
    question: 'Quando uso Full Checkout, Buttons Only ou Headless?',
    answer: [
      'Full Checkout (1.2.0) oferece a UI completa da biblioteca.',
      'Buttons Only e Headless também estão disponíveis na 1.2.0: faixa compacta vs layout totalmente seu.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/checkout-modes', label: 'Modos de checkout' },
      { href: '/playground', label: 'Playground' },
    ],
  },
  {
    id: 'backend-accounts',
    question: 'Preciso de backend ou de uma conta com cada provedor?',
    answer: [
      'Para pagamentos reais, sim: contas de comerciante e backends HTTPS seus para create/capture/confirm e webhooks.',
      'O modo mock demonstra a UI sem cobranças, mas não substitui backends de produção.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/configuration', label: 'Configuração' },
      { href: '/docs/angular/1.2.0/security', label: 'Segurança' },
    ],
  },
  {
    id: 'methods-status',
    question: 'Quais métodos funcionam em real, sandbox ou só demo?',
    answer: [
      'Card, PayPal, Apple Pay e Google Pay têm caminhos reais/TEST documentados. Klarna e Affirm têm caminho real e adaptadores mock.',
      'O fluxo simulado da Klarna no Playground é marcado DEMO — não é o checkout oficial da Klarna.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/payment-methods', label: 'Métodos de pagamento' },
    ],
  },
  {
    id: 'demo-charges',
    question: 'A demo cobra dinheiro?',
    answer: [
      'Não. O Playground e o enableMockMode não processam cobranças reais.',
    ],
    links: [{ href: '/docs/angular/1.2.0/mock-mode', label: 'Modo mock' }],
  },
  {
    id: 'price-order',
    question: 'Quem controla o preço, a moeda e a ordem dos métodos?',
    answer: [
      'Você. Passe o produto (valor em unidades principais), a moeda e o array methods na ordem desejada.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/configuration', label: 'Configuração' },
    ],
  },
  {
    id: 'locale-theme',
    question: 'Como mudo o idioma e o tema?',
    answer: [
      'Checkout: theme light / dark / system; na 1.1.0 também locale auto / en / es / pt.',
      'Este site usa as mesmas três preferências de tema e idiomas en / es / pt.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/theming', label: 'Temas' },
      { href: '/docs/angular/1.2.0/localization', label: 'Localização' },
    ],
  },
  {
    id: 'wallets-missing',
    question: 'Por que Apple Pay ou Google Pay podem não aparecer?',
    answer: [
      'Dependem de dispositivo, navegador, HTTPS, ambiente do provedor e onboarding. Um método configurado pode ficar oculto se a carteira estiver indisponível.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/troubleshooting', label: 'Solução de problemas' },
    ],
  },
  {
    id: 'keys',
    question: 'Onde configuro as chaves públicas e as secretas?',
    answer: [
      'Só valores públicos no Angular (chave publicável Stripe, Client ID PayPal). Segredos ficam no servidor.',
    ],
    links: [{ href: '/docs/angular/1.2.0/security', label: 'Segurança' }],
  },
  {
    id: 'events',
    question: 'Como trato sucesso, cancelamento e erros?',
    answer: [
      'Use os outputs success, cancel e error para UX. Cumpra pedidos só após verificação no servidor ou webhooks.',
    ],
    links: [
      { href: '/docs/angular/1.2.0/error-handling', label: 'Erros' },
    ],
  },
  {
    id: 'angular-versions',
    question: 'Quais versões do Angular estão verificadas?',
    answer: [
      'Peers: >=20.3.0 <23.0.0. Testes mock de consumidor no Angular 20, 21 e 22.',
    ],
  },
  {
    id: 'cost',
    question: 'Quanto custa a biblioteca e onde consulto as tarifas do provedor?',
    answer: [
      'Easy Payments é gratuita e MIT.',
      'Stripe, PayPal, Klarna, Affirm e outros cobram as próprias tarifas — consulte a pricing de cada provedor.',
    ],
  },
  {
    id: 'report-issue',
    question: 'Onde reporto um problema ou proponho uma melhoria?',
    answer: [
      'Abra um issue no repositório Angular no GitHub, ou use o formulário de contato quando estiver configurado.',
    ],
    links: [
      {
        href: 'https://github.com/easy-payments-dev/easy-payments-angular/issues',
        label: 'Issues no GitHub',
      },
      { href: '/contact', label: 'Contacto' },
      { href: '/support', label: 'Apoie o projeto' },
    ],
  },
];

export const FAQ_CONTENT: Record<SiteLanguage, readonly FaqItem[]> = {
  en,
  es,
  pt,
};
