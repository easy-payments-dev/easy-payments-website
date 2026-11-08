import { SiteLanguage } from './site-locale';

export type SiteMessageKey =
  | 'nav.frameworks'
  | 'nav.documentation'
  | 'nav.playground'
  | 'nav.github'
  | 'nav.security'
  | 'nav.contact'
  | 'nav.primary'
  | 'nav.mobile'
  | 'theme.label'
  | 'theme.light'
  | 'theme.dark'
  | 'theme.system'
  | 'lang.label'
  | 'menu.open'
  | 'menu.close'
  | 'footer.product'
  | 'footer.trust'
  | 'footer.githubOrg'
  | 'footer.angularLib'
  | 'footer.license'
  | 'footer.statement'
  | 'footer.copy'
  | 'newTab'
  | 'playground.eyebrow'
  | 'playground.title'
  | 'playground.lede'
  | 'playground.badge.demo'
  | 'playground.badge.live'
  | 'playground.alertTitle'
  | 'playground.alertBody'
  | 'playground.config'
  | 'playground.reset'
  | 'playground.version'
  | 'playground.versionLatest'
  | 'playground.versionPublished'
  | 'playground.versionUnpublished'
  | 'playground.versionHint'
  | 'playground.product'
  | 'playground.name'
  | 'playground.description'
  | 'playground.price'
  | 'playground.currency'
  | 'playground.quantity'
  | 'playground.methods'
  | 'playground.checkoutOptions'
  | 'playground.themeHint'
  | 'playground.theme'
  | 'playground.appearance'
  | 'playground.successBehavior'
  | 'playground.maxWidth'
  | 'playground.locale'
  | 'playground.localeUnavailable'
  | 'playground.otherFrameworks'
  | 'playground.otherFrameworksHint'
  | 'playground.demoMode'
  | 'playground.demoModeHint'
  | 'playground.demo.full'
  | 'playground.demo.buttons'
  | 'playground.demo.headless'
  | 'playground.buttonsLayout'
  | 'playground.preview'
  | 'playground.previewBadge'
  | 'playground.previewHint'
  | 'playground.previewHint.full'
  | 'playground.previewHint.buttons'
  | 'playground.previewHint.headless'
  | 'playground.livePackageNote'
  | 'playground.mockOutcome'
  | 'playground.mockOutcomeHint'
  | 'playground.outcomeSuccess'
  | 'playground.outcomeCancelled'
  | 'playground.outcomeFailed'
  | 'playground.eventLog'
  | 'playground.clear'
  | 'playground.noEvents'
  | 'playground.code'
  | 'playground.codeHint'
  | 'playground.docsLink'
  | 'playground.unpublishedTitle'
  | 'playground.unpublishedBody'
  | 'playground.buttonsOnly'
  | 'playground.headless'
  | 'playground.unpublishedBadge'
  | 'playground.headless.region'
  | 'playground.headless.consumerUiNotice'
  | 'playground.headless.starting'
  | 'playground.headless.mountLabel'
  | 'playground.headless.confirm'
  | 'playground.headless.state'
  | 'playground.headless.noMethods'
  | 'playground.headless.bootFailed'
  | 'home.playgroundTitle'
  | 'home.playgroundBody'
  | 'home.playgroundCta'
  | 'contact.title'
  | 'contact.lede'
  | 'contact.notice'
  | 'contact.privacy'
  | 'contact.noSensitive'
  | 'contact.fields.name'
  | 'contact.fields.email'
  | 'contact.fields.type'
  | 'contact.fields.message'
  | 'contact.types.suggestion'
  | 'contact.types.problem'
  | 'contact.types.inquiry'
  | 'contact.types.other'
  | 'contact.submit'
  | 'contact.submitting'
  | 'contact.successTitle'
  | 'contact.success'
  | 'contact.sendAnother'
  | 'contact.errorTitle'
  | 'contact.error'
  | 'contact.rateLimitedTitle'
  | 'contact.rateLimited'
  | 'contact.notConfiguredTitle'
  | 'contact.notConfigured'
  | 'contact.required'
  | 'contact.tooLong'
  | 'contact.invalidEmail'
  | 'contact.verification'
  | 'contact.verifyRequired'
  | 'contact.verifyFailed'
  | 'contact.verifyLoading'
  | 'contact.formLabel';

type Catalog = Record<SiteMessageKey, string>;

const en: Catalog = {
  'nav.frameworks': 'Frameworks',
  'nav.documentation': 'Documentation',
  'nav.playground': 'Playground',
  'nav.github': 'GitHub',
  'nav.security': 'Security',
  'nav.primary': 'Primary',
  'nav.mobile': 'Mobile',
  'theme.label': 'Color theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'lang.label': 'Website language',
  'menu.open': 'Open menu',
  'menu.close': 'Close menu',
  'footer.product': 'Product',
  'footer.trust': 'Trust',
  'footer.githubOrg': 'GitHub organization',
  'footer.angularLib': 'Angular library',
  'footer.license': 'license',
  'footer.statement':
    'Easy Payments is an open-source integration library ecosystem for developers. It is not a payment processor and does not move money, hold funds, or replace Stripe, PayPal, or other providers.',
  'footer.copy': 'Official ecosystem website.',
  'newTab': '(opens in a new tab)',
  'playground.eyebrow': 'Interactive demo',
  'playground.title': 'Angular Checkout Playground',
  'playground.lede':
    'Configure product options, preview real Angular library demos in mock mode, and copy integration code for published npm APIs. Demo payments never process charges and do not load provider payment SDKs.',
  'playground.badge.demo': 'Simulation only',
  'playground.badge.live': 'Live component · mock mode',
  'playground.alertTitle': 'Easy Payments demo — no payment is processed',
  'playground.alertBody':
    'This playground mounts real `@easy-payments/angular` APIs with `enableMockMode`. Outcomes are local mock adapters only. A simulated success is not a verified payment. Klarna uses the library mock DEMO flow — not an official Klarna checkout.',
  'playground.config': 'Configuration',
  'playground.reset': 'Reset defaults',
  'playground.version': 'Snippet package version (codegen)',
  'playground.versionLatest': '1.1.0 — Latest Published',
  'playground.versionPublished': '1.0.0 — Published',
  'playground.versionUnpublished': '1.2.0 — Unpublished',
  'playground.versionHint':
    'Generated code follows verified npm APIs for the selected version. Live demos use local unpublished 1.2.0 (not npm 1.1.0).',
  'playground.product': 'Product',
  'playground.name': 'Name',
  'playground.description': 'Description',
  'playground.price': 'Price (major units)',
  'playground.currency': 'Currency',
  'playground.quantity': 'Quantity',
  'playground.methods': 'Payment methods',
  'playground.checkoutOptions': 'Checkout options',
  'playground.themeHint':
    'These controls configure the checkout component theme, not the website theme switcher.',
  'playground.theme': 'Theme',
  'playground.appearance': 'Appearance',
  'playground.successBehavior': 'successBehavior',
  'playground.maxWidth': 'maxWidth (320–1200)',
  'playground.locale': 'Checkout locale (1.1.0+)',
  'playground.localeUnavailable':
    'Locale inputs are unavailable in Angular 1.0.0 snippets. Switch to 1.1.0 for localization codegen.',
  'playground.otherFrameworks': 'Other frameworks',
  'playground.otherFrameworksHint': 'React, Vue, and Svelte playgrounds remain Coming Soon.',
  'playground.demoMode': 'Demo experience',
  'playground.demoModeHint':
    'Full Checkout, Buttons Only, and Headless mount real public APIs from local unpublished 1.2.0.',
  'playground.demo.full': 'Full Checkout',
  'playground.demo.buttons': 'Buttons Only',
  'playground.demo.headless': 'Headless',
  'playground.buttonsLayout': 'Buttons layout',
  'playground.preview': 'Checkout preview',
  'playground.previewBadge': 'Real API · mock',
  'playground.previewHint':
    'Official library UI in mock mode. Marks and layout come from the library where the demo provides them.',
  'playground.previewHint.full':
    'Official Full Checkout (`<easy-payments>`). Select Klarna (or any method) inside the component to exercise the mock DEMO flow.',
  'playground.previewHint.buttons':
    'Official Buttons Only (`<easy-payment-buttons>`). Library logos and strip presentation. Unpublished — 1.2.0.',
  'playground.previewHint.headless':
    'Headless API with a consumer-built example UI. Headless does not ship a checkout design — this layout is website-owned. Unpublished — 1.2.0.',
  'playground.livePackageNote':
    'Live binary: local unpublished `@easy-payments/angular@1.2.0` (vendor). Not available from npm 1.1.0. Snippets below still target published npm versions.',
  'playground.mockOutcome': 'Mock payment outcome',
  'playground.mockOutcomeHint':
    'Sets `MockPaymentController` before you pay. Applies to Klarna DEMO and every other mock method.',
  'playground.outcomeSuccess': 'success',
  'playground.outcomeCancelled': 'cancelled',
  'playground.outcomeFailed': 'failed',
  'playground.eventLog': 'Event log',
  'playground.clear': 'Clear',
  'playground.noEvents': 'No events yet. Complete a mock payment inside the preview.',
  'playground.code': 'Generated Angular code',
  'playground.codeHint':
    'Snippets use verified public exports for the selected published version. Replace placeholder TEST credentials. Never put secret keys in Angular.',
  'playground.docsLink': 'Docs for Angular',
  'playground.unpublishedTitle': 'Unpublished — 1.2.0',
  'playground.unpublishedBody':
    'Buttons Only and Headless demos use local unpublished 1.2.0. They are not part of npm `@easy-payments/angular@1.1.0`.',
  'playground.buttonsOnly': 'Buttons Only',
  'playground.headless': 'Headless',
  'playground.unpublishedBadge': 'Unpublished — 1.2.0',
  'playground.headless.region': 'Headless demo',
  'playground.headless.consumerUiNotice':
    'Custom consumer UI example — headless mode does not provide this design.',
  'playground.headless.starting': 'Starting headless session…',
  'playground.headless.mountLabel': 'Payment method mount',
  'playground.headless.confirm': 'Confirm payment',
  'playground.headless.state': 'Session state',
  'playground.headless.noMethods': 'Select at least one payment method.',
  'playground.headless.bootFailed': 'Could not start the headless session.',
  'home.playgroundTitle': 'Try it safely — checkout playground',
  'home.playgroundBody':
    'Configure a checkout, preview real library demos in mock mode, and copy integration code. The playground never processes payments and never accepts real card data.',
  'home.playgroundCta': 'Open Playground',
  'nav.contact': 'Contact',
  'contact.title': 'Contact',
  'contact.lede':
    'Send a suggestion, report a problem, or ask a question about Easy Payments. We read every message.',
  'contact.notice':
    'Your name, email address, and message are used only to reply to you. We do not send an automatic confirmation email.',
  'contact.privacy':
    'The message is delivered to the Easy Payments maintainers by email. It is protected from automated abuse by Cloudflare Turnstile.',
  'contact.noSensitive':
    'Do not include card numbers, passwords, API keys, secret keys, or other sensitive data in your message.',
  'contact.fields.name': 'Name',
  'contact.fields.email': 'Reply email',
  'contact.fields.type': 'Type',
  'contact.fields.message': 'Message',
  'contact.types.suggestion': 'Suggestion',
  'contact.types.problem': 'Problem',
  'contact.types.inquiry': 'Inquiry',
  'contact.types.other': 'Other',
  'contact.submit': 'Send message',
  'contact.submitting': 'Sending…',
  'contact.successTitle': 'Message sent',
  'contact.success':
    'Thank you. Your message was accepted for delivery. If a reply is needed, we will write to the email address you provided.',
  'contact.sendAnother': 'Send another message',
  'contact.errorTitle': 'Message not sent',
  'contact.error':
    'Something went wrong and your message was not sent. Your text is still here — please try again in a moment.',
  'contact.rateLimitedTitle': 'Too many messages',
  'contact.rateLimited':
    'You have sent several messages recently. Please wait a few minutes and try again. Your text is still here.',
  'contact.notConfiguredTitle': 'Contact form not operational',
  'contact.notConfigured':
    'The contact form is not available yet on this site, so nothing can be sent from this page. Please check back later or reach the project through GitHub.',
  'contact.required': 'This field is required.',
  'contact.tooLong': 'This is too long.',
  'contact.invalidEmail': 'Enter a valid email address.',
  'contact.verification': 'Spam protection',
  'contact.verifyRequired': 'Complete the spam protection check before sending.',
  'contact.verifyFailed':
    'The spam protection check failed or expired. Complete it again and resend.',
  'contact.verifyLoading': 'Loading spam protection check…',
  'contact.formLabel': 'Contact form',
};

const es: Catalog = {
  ...en,
  'nav.frameworks': 'Frameworks',
  'nav.documentation': 'Documentación',
  'nav.playground': 'Playground',
  'nav.github': 'GitHub',
  'nav.security': 'Seguridad',
  'nav.primary': 'Principal',
  'nav.mobile': 'Móvil',
  'theme.label': 'Tema de color',
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'theme.system': 'Sistema',
  'lang.label': 'Idioma del sitio',
  'menu.open': 'Abrir menú',
  'menu.close': 'Cerrar menú',
  'footer.product': 'Producto',
  'footer.trust': 'Confianza',
  'footer.githubOrg': 'Organización en GitHub',
  'footer.angularLib': 'Biblioteca Angular',
  'footer.license': 'licencia',
  'footer.statement':
    'Easy Payments es un ecosistema de bibliotecas de integración de código abierto para desarrolladores. No es un procesador de pagos y no mueve dinero, custodia fondos ni reemplaza a Stripe, PayPal u otros proveedores.',
  'footer.copy': 'Sitio oficial del ecosistema.',
  'newTab': '(se abre en una pestaña nueva)',
  'playground.eyebrow': 'Demo interactiva',
  'playground.title': 'Playground de checkout Angular',
  'playground.lede':
    'Configura el producto, previsualiza demos reales de la librería Angular en modo mock y copia código de integración para APIs npm publicadas. Los pagos de demostración no procesan cargos ni cargan SDKs de proveedores.',
  'playground.badge.demo': 'Solo simulación',
  'playground.badge.live': 'Componente real · modo mock',
  'playground.alertTitle': 'Demo de Easy Payments — no se procesa ningún pago',
  'playground.alertBody':
    'Este playground monta APIs reales de `@easy-payments/angular` con `enableMockMode`. Los resultados usan solo adaptadores mock locales. Un éxito simulado no es un pago verificado. Klarna usa el flujo mock DEMO de la librería — no un checkout oficial de Klarna.',
  'playground.config': 'Configuración',
  'playground.reset': 'Restablecer valores',
  'playground.version': 'Versión del paquete para snippets',
  'playground.versionHint':
    'El código generado sigue las APIs npm verificadas de la versión seleccionada. Las demos en vivo usan 1.2.0 local no publicada (no npm 1.1.0).',
  'playground.product': 'Producto',
  'playground.name': 'Nombre',
  'playground.description': 'Descripción',
  'playground.price': 'Precio (unidades mayores)',
  'playground.currency': 'Moneda',
  'playground.quantity': 'Cantidad',
  'playground.methods': 'Métodos de pago',
  'playground.checkoutOptions': 'Opciones de checkout',
  'playground.themeHint':
    'Estos controles configuran el tema del componente de checkout, no el selector de tema del sitio.',
  'playground.theme': 'Tema',
  'playground.appearance': 'Apariencia',
  'playground.locale': 'Locale del checkout (1.1.0+)',
  'playground.localeUnavailable':
    'Los inputs de locale no están disponibles en los snippets de Angular 1.0.0. Cambia a 1.1.0 para codegen de localización.',
  'playground.otherFrameworks': 'Otros frameworks',
  'playground.otherFrameworksHint': 'Los playgrounds de React, Vue y Svelte siguen Coming Soon.',
  'playground.demoMode': 'Experiencia demo',
  'playground.demoModeHint':
    'Full Checkout, Buttons Only y Headless montan APIs públicas reales de 1.2.0 local no publicada.',
  'playground.demo.full': 'Full Checkout',
  'playground.demo.buttons': 'Buttons Only',
  'playground.demo.headless': 'Headless',
  'playground.buttonsLayout': 'Diseño de botones',
  'playground.preview': 'Vista previa del checkout',
  'playground.previewBadge': 'API real · mock',
  'playground.previewHint':
    'UI oficial de la librería en modo mock. Los marks y el layout vienen de la librería cuando la demo los aporta.',
  'playground.previewHint.full':
    'Full Checkout oficial (`<easy-payments>`). Selecciona Klarna (u otro método) dentro del componente para probar el flujo mock DEMO.',
  'playground.previewHint.buttons':
    'Buttons Only oficial (`<easy-payment-buttons>`). Logos y presentación de la librería. Unpublished — 1.2.0.',
  'playground.previewHint.headless':
    'API Headless con una UI de ejemplo del consumidor. Headless no aporta diseño de checkout — este layout es del sitio. Unpublished — 1.2.0.',
  'playground.livePackageNote':
    'Binario en vivo: `@easy-payments/angular@1.2.0` local no publicado (vendor). No disponible en npm 1.1.0. Los snippets siguen apuntando a versiones npm publicadas.',
  'playground.mockOutcome': 'Resultado mock del pago',
  'playground.mockOutcomeHint':
    'Configura `MockPaymentController` antes de pagar. Aplica a Klarna DEMO y al resto de métodos mock.',
  'playground.eventLog': 'Registro de eventos',
  'playground.clear': 'Limpiar',
  'playground.noEvents': 'Aún no hay eventos. Completa un pago mock en la vista previa.',
  'playground.code': 'Código Angular generado',
  'playground.codeHint':
    'Los snippets usan exports públicos verificados de la versión publicada seleccionada. Sustituye credenciales TEST. Nunca pongas secret keys en Angular.',
  'playground.docsLink': 'Docs de Angular',
  'playground.unpublishedTitle': 'Unpublished — 1.2.0',
  'playground.unpublishedBody':
    'Las demos Buttons Only y Headless usan 1.2.0 local no publicada. No forman parte de npm `@easy-payments/angular@1.1.0`.',
  'playground.unpublishedBadge': 'Unpublished — 1.2.0',
  'playground.headless.region': 'Demo headless',
  'playground.headless.consumerUiNotice':
    'Ejemplo de UI del consumidor — el modo headless no proporciona este diseño.',
  'playground.headless.starting': 'Iniciando sesión headless…',
  'playground.headless.mountLabel': 'Montaje del método de pago',
  'playground.headless.confirm': 'Confirmar pago',
  'playground.headless.state': 'Estado de la sesión',
  'playground.headless.noMethods': 'Selecciona al menos un método de pago.',
  'playground.headless.bootFailed': 'No se pudo iniciar la sesión headless.',
  'home.playgroundTitle': 'Pruébalo con seguridad — playground de checkout',
  'home.playgroundBody':
    'Configura un checkout, previsualiza demos reales en modo mock y copia el código. El playground nunca procesa pagos ni acepta datos reales de tarjeta.',
  'home.playgroundCta': 'Abrir Playground',
  'nav.contact': 'Contacto',
  'contact.title': 'Contacto',
  'contact.lede':
    'Envía una sugerencia, informa de un problema o haz una consulta sobre Easy Payments. Leemos todos los mensajes.',
  'contact.notice':
    'Tu nombre, correo electrónico y mensaje se usan únicamente para responderte. No enviamos un correo de confirmación automático.',
  'contact.privacy':
    'El mensaje se entrega por correo a los responsables de Easy Payments. Está protegido contra abuso automatizado mediante Cloudflare Turnstile.',
  'contact.noSensitive':
    'No incluyas números de tarjeta, contraseñas, API keys, claves secretas ni otros datos sensibles en tu mensaje.',
  'contact.fields.name': 'Nombre',
  'contact.fields.email': 'Correo de respuesta',
  'contact.fields.type': 'Tipo',
  'contact.fields.message': 'Mensaje',
  'contact.types.suggestion': 'Sugerencia',
  'contact.types.problem': 'Problema',
  'contact.types.inquiry': 'Consulta',
  'contact.types.other': 'Otro',
  'contact.submit': 'Enviar mensaje',
  'contact.submitting': 'Enviando…',
  'contact.successTitle': 'Mensaje enviado',
  'contact.success':
    'Gracias. Tu mensaje fue aceptado para su entrega. Si hace falta responder, te escribiremos al correo que indicaste.',
  'contact.sendAnother': 'Enviar otro mensaje',
  'contact.errorTitle': 'Mensaje no enviado',
  'contact.error':
    'Algo salió mal y tu mensaje no se envió. Tu texto sigue aquí — inténtalo de nuevo en un momento.',
  'contact.rateLimitedTitle': 'Demasiados mensajes',
  'contact.rateLimited':
    'Has enviado varios mensajes recientemente. Espera unos minutos e inténtalo de nuevo. Tu texto sigue aquí.',
  'contact.notConfiguredTitle': 'Formulario de contacto no operativo',
  'contact.notConfigured':
    'El formulario de contacto aún no está disponible en este sitio, por lo que no se puede enviar nada desde esta página. Vuelve más tarde o contacta al proyecto a través de GitHub.',
  'contact.required': 'Este campo es obligatorio.',
  'contact.tooLong': 'Es demasiado largo.',
  'contact.invalidEmail': 'Introduce un correo electrónico válido.',
  'contact.verification': 'Protección anti-spam',
  'contact.verifyRequired': 'Completa la verificación anti-spam antes de enviar.',
  'contact.verifyFailed':
    'La verificación anti-spam falló o caducó. Complétala de nuevo y vuelve a enviar.',
  'contact.verifyLoading': 'Cargando la verificación anti-spam…',
  'contact.formLabel': 'Formulario de contacto',
};

const pt: Catalog = {
  ...en,
  'nav.frameworks': 'Frameworks',
  'nav.documentation': 'Documentação',
  'nav.playground': 'Playground',
  'nav.github': 'GitHub',
  'nav.security': 'Segurança',
  'nav.primary': 'Principal',
  'nav.mobile': 'Mobile',
  'theme.label': 'Tema de cores',
  'theme.light': 'Claro',
  'theme.dark': 'Escuro',
  'theme.system': 'Sistema',
  'lang.label': 'Idioma do site',
  'menu.open': 'Abrir menu',
  'menu.close': 'Fechar menu',
  'footer.product': 'Produto',
  'footer.trust': 'Confiança',
  'footer.githubOrg': 'Organização no GitHub',
  'footer.angularLib': 'Biblioteca Angular',
  'footer.license': 'licença',
  'footer.statement':
    'Easy Payments é um ecossistema open-source de bibliotecas de integração para desenvolvedores. Não é um processador de pagamentos e não movimenta dinheiro, guarda fundos nem substitui Stripe, PayPal ou outros provedores.',
  'footer.copy': 'Site oficial do ecossistema.',
  'newTab': '(abre em uma nova aba)',
  'playground.eyebrow': 'Demo interativa',
  'playground.title': 'Playground de checkout Angular',
  'playground.lede':
    'Configure o produto, visualize demos reais da biblioteca Angular em modo mock e copie código de integração para APIs npm publicadas. Pagamentos de demonstração não cobram e não carregam SDKs de provedores.',
  'playground.badge.demo': 'Somente simulação',
  'playground.badge.live': 'Componente real · modo mock',
  'playground.alertTitle': 'Demo Easy Payments — nenhum pagamento é processado',
  'playground.alertBody':
    'Este playground monta APIs reais de `@easy-payments/angular` com `enableMockMode`. Os resultados usam apenas adaptadores mock locais. Um sucesso simulado não é um pagamento verificado. Klarna usa o fluxo mock DEMO da biblioteca — não um checkout oficial da Klarna.',
  'playground.config': 'Configuração',
  'playground.reset': 'Restaurar padrões',
  'playground.version': 'Versão do pacote para snippets',
  'playground.versionHint':
    'O código gerado segue as APIs npm verificadas da versão selecionada. As demos ao vivo usam 1.2.0 local não publicada (não npm 1.1.0).',
  'playground.product': 'Produto',
  'playground.name': 'Nome',
  'playground.description': 'Descrição',
  'playground.price': 'Preço (unidades principais)',
  'playground.currency': 'Moeda',
  'playground.quantity': 'Quantidade',
  'playground.methods': 'Métodos de pagamento',
  'playground.checkoutOptions': 'Opções de checkout',
  'playground.themeHint':
    'Estes controles configuram o tema do componente de checkout, não o seletor de tema do site.',
  'playground.theme': 'Tema',
  'playground.appearance': 'Aparência',
  'playground.locale': 'Locale do checkout (1.1.0+)',
  'playground.localeUnavailable':
    'Inputs de locale não estão disponíveis nos snippets Angular 1.0.0. Mude para 1.1.0 para codegen de localização.',
  'playground.otherFrameworks': 'Outros frameworks',
  'playground.otherFrameworksHint': 'Playgrounds React, Vue e Svelte continuam Coming Soon.',
  'playground.demoMode': 'Experiência demo',
  'playground.demoModeHint':
    'Full Checkout, Buttons Only e Headless montam APIs públicas reais da 1.2.0 local não publicada.',
  'playground.demo.full': 'Full Checkout',
  'playground.demo.buttons': 'Buttons Only',
  'playground.demo.headless': 'Headless',
  'playground.buttonsLayout': 'Layout dos botões',
  'playground.preview': 'Prévia do checkout',
  'playground.previewBadge': 'API real · mock',
  'playground.previewHint':
    'UI oficial da biblioteca em modo mock. Marks e layout vêm da biblioteca quando a demo os fornece.',
  'playground.previewHint.full':
    'Full Checkout oficial (`<easy-payments>`). Selecione Klarna (ou outro método) dentro do componente para testar o fluxo mock DEMO.',
  'playground.previewHint.buttons':
    'Buttons Only oficial (`<easy-payment-buttons>`). Logos e apresentação da biblioteca. Unpublished — 1.2.0.',
  'playground.previewHint.headless':
    'API Headless com UI de exemplo do consumidor. Headless não fornece design de checkout — este layout é do site. Unpublished — 1.2.0.',
  'playground.livePackageNote':
    'Binário ao vivo: `@easy-payments/angular@1.2.0` local não publicada (vendor). Não disponível no npm 1.1.0. Os snippets ainda apontam para versões npm publicadas.',
  'playground.mockOutcome': 'Resultado mock do pagamento',
  'playground.mockOutcomeHint':
    'Define `MockPaymentController` antes de pagar. Aplica-se a Klarna DEMO e aos demais métodos mock.',
  'playground.eventLog': 'Registro de eventos',
  'playground.clear': 'Limpar',
  'playground.noEvents': 'Ainda não há eventos. Conclua um pagamento mock na prévia.',
  'playground.code': 'Código Angular gerado',
  'playground.codeHint':
    'Os snippets usam exports públicos verificados da versão publicada selecionada. Substitua credenciais TEST. Nunca coloque secret keys no Angular.',
  'playground.docsLink': 'Docs do Angular',
  'playground.unpublishedTitle': 'Unpublished — 1.2.0',
  'playground.unpublishedBody':
    'As demos Buttons Only e Headless usam 1.2.0 local não publicada. Não fazem parte do npm `@easy-payments/angular@1.1.0`.',
  'playground.unpublishedBadge': 'Unpublished — 1.2.0',
  'playground.headless.region': 'Demo headless',
  'playground.headless.consumerUiNotice':
    'Exemplo de UI do consumidor — o modo headless não fornece este design.',
  'playground.headless.starting': 'Iniciando sessão headless…',
  'playground.headless.mountLabel': 'Montagem do método de pagamento',
  'playground.headless.confirm': 'Confirmar pagamento',
  'playground.headless.state': 'Estado da sessão',
  'playground.headless.noMethods': 'Selecione pelo menos um método de pagamento.',
  'playground.headless.bootFailed': 'Não foi possível iniciar a sessão headless.',
  'home.playgroundTitle': 'Experimente com segurança — playground de checkout',
  'home.playgroundBody':
    'Configure um checkout, visualize demos reais em modo mock e copie o código. O playground nunca processa pagamentos nem aceita dados reais de cartão.',
  'home.playgroundCta': 'Abrir Playground',
  'nav.contact': 'Contato',
  'contact.title': 'Contato',
  'contact.lede':
    'Envie uma sugestão, relate um problema ou tire uma dúvida sobre o Easy Payments. Lemos todas as mensagens.',
  'contact.notice':
    'Seu nome, e-mail e mensagem são usados apenas para responder a você. Não enviamos e-mail de confirmação automático.',
  'contact.privacy':
    'A mensagem é entregue por e-mail aos mantenedores do Easy Payments. Ela é protegida contra abuso automatizado pelo Cloudflare Turnstile.',
  'contact.noSensitive':
    'Não inclua números de cartão, senhas, API keys, chaves secretas ou outros dados sensíveis na sua mensagem.',
  'contact.fields.name': 'Nome',
  'contact.fields.email': 'E-mail para resposta',
  'contact.fields.type': 'Tipo',
  'contact.fields.message': 'Mensagem',
  'contact.types.suggestion': 'Sugestão',
  'contact.types.problem': 'Problema',
  'contact.types.inquiry': 'Dúvida',
  'contact.types.other': 'Outro',
  'contact.submit': 'Enviar mensagem',
  'contact.submitting': 'Enviando…',
  'contact.successTitle': 'Mensagem enviada',
  'contact.success':
    'Obrigado. Sua mensagem foi aceita para entrega. Se for preciso responder, escreveremos para o e-mail informado.',
  'contact.sendAnother': 'Enviar outra mensagem',
  'contact.errorTitle': 'Mensagem não enviada',
  'contact.error':
    'Algo deu errado e sua mensagem não foi enviada. Seu texto continua aqui — tente novamente em instantes.',
  'contact.rateLimitedTitle': 'Mensagens demais',
  'contact.rateLimited':
    'Você enviou várias mensagens recentemente. Aguarde alguns minutos e tente novamente. Seu texto continua aqui.',
  'contact.notConfiguredTitle': 'Formulário de contato não operacional',
  'contact.notConfigured':
    'O formulário de contato ainda não está disponível neste site, então nada pode ser enviado a partir desta página. Volte mais tarde ou fale com o projeto pelo GitHub.',
  'contact.required': 'Este campo é obrigatório.',
  'contact.tooLong': 'Está longo demais.',
  'contact.invalidEmail': 'Informe um e-mail válido.',
  'contact.verification': 'Proteção anti-spam',
  'contact.verifyRequired': 'Conclua a verificação anti-spam antes de enviar.',
  'contact.verifyFailed':
    'A verificação anti-spam falhou ou expirou. Conclua novamente e reenvie.',
  'contact.verifyLoading': 'Carregando a verificação anti-spam…',
  'contact.formLabel': 'Formulário de contato',
};

export const SITE_MESSAGE_CATALOGS: Record<SiteLanguage, Catalog> = {
  en,
  es,
  pt,
};
