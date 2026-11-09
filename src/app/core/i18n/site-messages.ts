import { SiteLanguage } from './site-locale';

export type SiteMessageKey =
  | 'nav.frameworks'
  | 'nav.documentation'
  | 'nav.playground'
  | 'nav.github'
  | 'nav.security'
  | 'nav.contact'
  | 'nav.faq'
  | 'nav.support'
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
  | 'playground.headless.region'
  | 'playground.headless.consumerUiNotice'
  | 'playground.headless.starting'
  | 'playground.headless.mountLabel'
  | 'playground.headless.confirm'
  | 'playground.headless.state'
  | 'playground.headless.noMethods'
  | 'playground.headless.bootFailed'
  | 'playground.headless.kicker'
  | 'playground.headless.title'
  | 'playground.headless.product'
  | 'playground.headless.qty'
  | 'playground.headless.demoBadge'
  | 'playground.headless.unavailable'
  | 'playground.headless.mountTitle'
  | 'playground.headless.mountIdle'
  | 'playground.headless.eventsTitle'
  | 'playground.headless.noEvents'
  | 'playground.headless.processing'
  | 'playground.headless.interaction.confirm'
  | 'playground.headless.interaction.mock'
  | 'playground.headless.interaction.wallet'
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
  | 'contact.formLabel'
  | 'faq.eyebrow'
  | 'faq.title'
  | 'faq.lede'
  | 'faq.jump'
  | 'faq.openInNewTab'
  | 'playground.guideLink'
  | 'support.eyebrow'
  | 'support.title'
  | 'support.lede'
  | 'support.body'
  | 'support.community'
  | 'support.paypal'
  | 'support.paypalPending'
  | 'support.github'
  | 'support.issues';

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
    'Mock mode only: outcomes come from local mock adapters, and a simulated success is not a verified payment. Klarna runs the library DEMO flow, not an official Klarna checkout.',
  'playground.config': 'Configuration',
  'playground.reset': 'Reset defaults',
  'playground.version': 'Package version',
  'playground.versionHint':
    'Generated examples follow the selected version. Buttons Only and Headless are 1.2.0 only.',
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
    'Full Checkout, Buttons Only, and Headless mount real public APIs from 1.2.0.',
  'playground.demo.full': 'Full Checkout',
  'playground.demo.buttons': 'Buttons Only',
  'playground.demo.headless': 'Headless',
  'playground.buttonsLayout': 'Buttons layout',
  'playground.preview': 'Checkout preview',
  'playground.previewBadge': 'Real API · mock',
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
  'playground.guideLink': 'View integration guide',
  'playground.headless.region': 'Headless demo',
  'playground.headless.consumerUiNotice':
    'This panel is merchant-owned UI built by this website. Headless ships no checkout design: the library only runs the session and mounts provider surfaces into your container.',
  'playground.headless.starting': 'Starting headless session…',
  'playground.headless.mountLabel': 'Payment method mount',
  'playground.headless.confirm': 'Confirm payment',
  'playground.headless.state': 'Session state',
  'playground.headless.noMethods': 'Select at least one payment method.',
  'playground.headless.bootFailed': 'Could not start the headless session.',
  'playground.headless.kicker': 'Merchant-owned UI',
  'playground.headless.title': 'Headless checkout',
  'playground.headless.product': 'Product',
  'playground.headless.qty': 'Qty',
  'playground.headless.demoBadge': 'DEMO',
  'playground.headless.unavailable': 'Unavailable',
  'playground.headless.mountTitle': 'Provider surface',
  'playground.headless.mountIdle': 'Select a payment method to mount its UI here.',
  'playground.headless.eventsTitle': 'Lifecycle events',
  'playground.headless.noEvents': 'No lifecycle events yet.',
  'playground.headless.processing': 'Processing…',
  'playground.headless.interaction.confirm': 'Merchant confirm',
  'playground.headless.interaction.mock': 'Mock method',
  'playground.headless.interaction.wallet': 'Wallet button',
  'home.playgroundTitle': 'Try it safely — checkout playground',
  'home.playgroundBody':
    'Configure a checkout, preview real library demos in mock mode, and copy integration code. The playground never processes payments and never accepts real card data.',
  'home.playgroundCta': 'Open Playground',
  'nav.contact': 'Contact',
  'nav.faq': 'FAQ',
  'nav.support': 'Support',
  'faq.eyebrow': 'Help',
  'faq.title': 'Frequently asked questions',
  'faq.lede':
    'Short answers for integrating Easy Payments. Each item links to the matching guide when you need more detail.',
  'faq.jump': 'Jump to a question',
  'faq.openInNewTab': 'Open this question in a new tab',
  'support.eyebrow': 'Community',
  'support.title': 'Support Easy Payments',
  'support.lede':
    'A quiet way to help documentation, maintenance, and new framework work — never required to use the library.',
  'support.body':
    'Easy Payments is a free project. If you find it useful, you can support its development, documentation, and maintenance with a voluntary contribution.',
  'support.community':
    'You can also help by sharing the project, reporting issues, or contributing on GitHub.',
  'support.paypal': 'Support with PayPal',
  'support.paypalPending':
    'PayPal contributions will appear here once the maintainer publishes a support link. GitHub options are available now.',
  'support.github': 'View on GitHub',
  'support.issues': 'Report an issue',
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
    'Solo modo mock: los resultados vienen de adaptadores mock locales y un éxito simulado no es un pago verificado. Klarna ejecuta el flujo DEMO de la librería, no un checkout oficial de Klarna.',
  'playground.config': 'Configuración',
  'playground.reset': 'Restablecer valores',
  'playground.version': 'Versión del paquete',
  'playground.versionHint':
    'Los ejemplos generados siguen la versión elegida. Buttons Only y Headless son solo 1.2.0.',
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
    'Full Checkout, Buttons Only y Headless montan APIs públicas reales de 1.2.0.',
  'playground.demo.full': 'Full Checkout',
  'playground.demo.buttons': 'Buttons Only',
  'playground.demo.headless': 'Headless',
  'playground.buttonsLayout': 'Diseño de botones',
  'playground.preview': 'Vista previa del checkout',
  'playground.previewBadge': 'API real · mock',
  'playground.mockOutcome': 'Resultado mock del pago',
  'playground.mockOutcomeHint':
    'Configura `MockPaymentController` antes de pagar. Aplica a Klarna DEMO y al resto de métodos mock.',
  'playground.outcomeSuccess': 'success',
  'playground.outcomeCancelled': 'cancelled',
  'playground.outcomeFailed': 'failed',
  'playground.eventLog': 'Registro de eventos',
  'playground.clear': 'Limpiar',
  'playground.noEvents': 'Aún no hay eventos. Completa un pago mock en la vista previa.',
  'playground.code': 'Código Angular generado',
  'playground.codeHint':
    'Los snippets usan exports públicos verificados de la versión publicada seleccionada. Sustituye credenciales TEST. Nunca pongas secret keys en Angular.',
  'playground.docsLink': 'Docs de Angular',
  'playground.guideLink': 'Ver guía de integración',
  'playground.headless.region': 'Demo headless',
  'playground.headless.consumerUiNotice':
    'Este panel es UI propia del comercio construida por este sitio. Headless no incluye diseño de checkout: la librería solo ejecuta la sesión y monta superficies del proveedor en tu contenedor.',
  'playground.headless.starting': 'Iniciando sesión headless…',
  'playground.headless.mountLabel': 'Montaje del método de pago',
  'playground.headless.confirm': 'Confirmar pago',
  'playground.headless.state': 'Estado de la sesión',
  'playground.headless.noMethods': 'Selecciona al menos un método de pago.',
  'playground.headless.bootFailed': 'No se pudo iniciar la sesión headless.',
  'playground.headless.kicker': 'UI del comercio',
  'playground.headless.title': 'Checkout headless',
  'playground.headless.product': 'Producto',
  'playground.headless.qty': 'Cant.',
  'playground.headless.demoBadge': 'DEMO',
  'playground.headless.unavailable': 'No disponible',
  'playground.headless.mountTitle': 'Superficie del proveedor',
  'playground.headless.mountIdle': 'Selecciona un método de pago para montar su UI aquí.',
  'playground.headless.eventsTitle': 'Eventos del ciclo de vida',
  'playground.headless.noEvents': 'Aún no hay eventos del ciclo de vida.',
  'playground.headless.processing': 'Procesando…',
  'playground.headless.interaction.confirm': 'Confirmación del comercio',
  'playground.headless.interaction.mock': 'Método mock',
  'playground.headless.interaction.wallet': 'Botón de wallet',
  'home.playgroundTitle': 'Pruébalo con seguridad — playground de checkout',
  'home.playgroundBody':
    'Configura un checkout, previsualiza demos reales en modo mock y copia el código. El playground nunca procesa pagos ni acepta datos reales de tarjeta.',
  'home.playgroundCta': 'Abrir Playground',
  'nav.contact': 'Contacto',
  'nav.faq': 'FAQ',
  'nav.support': 'Apoyo',
  'faq.eyebrow': 'Ayuda',
  'faq.title': 'Preguntas frecuentes',
  'faq.lede':
    'Respuestas breves para integrar Easy Payments. Cada ítem enlaza la guía correspondiente cuando necesites más detalle.',
  'faq.jump': 'Ir a una pregunta',
  'faq.openInNewTab': 'Abrir esta pregunta en una pestaña nueva',
  'support.eyebrow': 'Comunidad',
  'support.title': 'Apoya Easy Payments',
  'support.lede':
    'Una forma discreta de ayudar con documentación, mantenimiento y nuevos frameworks — nunca es obligatorio para usar la librería.',
  'support.body':
    'Easy Payments es un proyecto gratuito. Si te resulta útil, puedes apoyar su desarrollo, documentación y mantenimiento con una contribución voluntaria.',
  'support.community':
    'También puedes ayudar compartiendo el proyecto, reportando problemas o contribuyendo en GitHub.',
  'support.paypal': 'Apoyar con PayPal',
  'support.paypalPending':
    'Las contribuciones con PayPal aparecerán aquí cuando el mantenedor publique un enlace. Las opciones de GitHub ya están disponibles.',
  'support.github': 'Ver en GitHub',
  'support.issues': 'Reportar un problema',
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
    'Somente modo mock: os resultados vêm de adaptadores mock locais e um sucesso simulado não é um pagamento verificado. Klarna executa o fluxo DEMO da biblioteca, não um checkout oficial da Klarna.',
  'playground.config': 'Configuração',
  'playground.reset': 'Restaurar padrões',
  'playground.version': 'Versão do pacote',
  'playground.versionHint':
    'Os exemplos gerados seguem a versão escolhida. Buttons Only e Headless são somente 1.2.0.',
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
    'Full Checkout, Buttons Only e Headless montam APIs públicas reais da 1.2.0.',
  'playground.demo.full': 'Full Checkout',
  'playground.demo.buttons': 'Buttons Only',
  'playground.demo.headless': 'Headless',
  'playground.buttonsLayout': 'Layout dos botões',
  'playground.preview': 'Prévia do checkout',
  'playground.previewBadge': 'API real · mock',
  'playground.mockOutcome': 'Resultado mock do pagamento',
  'playground.mockOutcomeHint':
    'Define `MockPaymentController` antes de pagar. Aplica-se a Klarna DEMO e aos demais métodos mock.',
  'playground.outcomeSuccess': 'success',
  'playground.outcomeCancelled': 'cancelled',
  'playground.outcomeFailed': 'failed',
  'playground.eventLog': 'Registro de eventos',
  'playground.clear': 'Limpar',
  'playground.noEvents': 'Ainda não há eventos. Conclua um pagamento mock na prévia.',
  'playground.code': 'Código Angular gerado',
  'playground.codeHint':
    'Os snippets usam exports públicos verificados da versão publicada selecionada. Substitua credenciais TEST. Nunca coloque secret keys no Angular.',
  'playground.docsLink': 'Docs do Angular',
  'playground.guideLink': 'Ver guia de integração',
  'playground.headless.region': 'Demo headless',
  'playground.headless.consumerUiNotice':
    'Este painel é UI própria do lojista construída por este site. Headless não inclui design de checkout: a biblioteca apenas executa a sessão e monta superfícies do provedor no seu contêiner.',
  'playground.headless.starting': 'Iniciando sessão headless…',
  'playground.headless.mountLabel': 'Montagem do método de pagamento',
  'playground.headless.confirm': 'Confirmar pagamento',
  'playground.headless.state': 'Estado da sessão',
  'playground.headless.noMethods': 'Selecione pelo menos um método de pagamento.',
  'playground.headless.bootFailed': 'Não foi possível iniciar a sessão headless.',
  'playground.headless.kicker': 'UI do lojista',
  'playground.headless.title': 'Checkout headless',
  'playground.headless.product': 'Produto',
  'playground.headless.qty': 'Qtd.',
  'playground.headless.demoBadge': 'DEMO',
  'playground.headless.unavailable': 'Indisponível',
  'playground.headless.mountTitle': 'Superfície do provedor',
  'playground.headless.mountIdle': 'Selecione um método de pagamento para montar sua UI aqui.',
  'playground.headless.eventsTitle': 'Eventos do ciclo de vida',
  'playground.headless.noEvents': 'Ainda não há eventos do ciclo de vida.',
  'playground.headless.processing': 'Processando…',
  'playground.headless.interaction.confirm': 'Confirmação do lojista',
  'playground.headless.interaction.mock': 'Método mock',
  'playground.headless.interaction.wallet': 'Botão de wallet',
  'home.playgroundTitle': 'Experimente com segurança — playground de checkout',
  'home.playgroundBody':
    'Configure um checkout, visualize demos reais em modo mock e copie o código. O playground nunca processa pagamentos nem aceita dados reais de cartão.',
  'home.playgroundCta': 'Abrir Playground',
  'nav.contact': 'Contato',
  'nav.faq': 'FAQ',
  'nav.support': 'Apoio',
  'faq.eyebrow': 'Ajuda',
  'faq.title': 'Perguntas frequentes',
  'faq.lede':
    'Respostas curtas para integrar o Easy Payments. Cada item liga ao guia correspondente quando precisar de mais detalhe.',
  'faq.jump': 'Ir a uma pergunta',
  'faq.openInNewTab': 'Abrir esta pergunta em uma nova aba',
  'support.eyebrow': 'Comunidade',
  'support.title': 'Apoie o Easy Payments',
  'support.lede':
    'Uma forma discreta de ajudar documentação, manutenção e novos frameworks — nunca é obrigatório para usar a biblioteca.',
  'support.body':
    'Easy Payments é um projeto gratuito. Se for útil para si, pode apoiar o desenvolvimento, a documentação e a manutenção com uma contribuição voluntária.',
  'support.community':
    'Também pode ajudar partilhando o projeto, reportando problemas ou contribuindo no GitHub.',
  'support.paypal': 'Apoiar com PayPal',
  'support.paypalPending':
    'Contribuições PayPal aparecerão aqui quando o maintainer publicar um link. As opções GitHub já estão disponíveis.',
  'support.github': 'Ver no GitHub',
  'support.issues': 'Reportar um problema',
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
