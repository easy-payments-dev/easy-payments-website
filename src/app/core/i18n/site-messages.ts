import { SiteLanguage } from './site-locale';

export type SiteMessageKey =
  | 'a11y.skipToContent'
  | 'a11y.home'
  | 'brand.tagline'
  | 'copy.label'
  | 'copy.copied'
  | 'copy.failed'
  | 'copy.aria'
  | 'copy.ariaCopied'
  | 'copy.live'
  | 'payment.card.summary'
  | 'payment.paypal.summary'
  | 'payment.applePay.summary'
  | 'payment.googlePay.summary'
  | 'payment.klarna.summary'
  | 'payment.affirm.summary'
  | 'payment.card.markAlt'
  | 'playground.product.name'
  | 'playground.product.description'
  | 'docs.search.matchTitle'
  | 'docs.search.matchHeading'
  | 'docs.search.matchContent'
  | 'docs.releaseNote.121'
  | 'docs.releaseNote.121Label'
  | 'docs.pager.previous'
  | 'docs.pager.next'
  | 'docs.pager.aria'
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
  | 'home.previewCaption'
  | 'home.previewAlt'
  | 'home.gallery.eyebrow'
  | 'home.gallery.title'
  | 'home.gallery.description'
  | 'home.gallery.enlarge'
  | 'home.gallery.desktop'
  | 'home.gallery.mobile'
  | 'home.gallery.dark'
  | 'home.gallery.light'
  | 'home.gallery.methods'
  | 'home.gallery.desktopAlt'
  | 'home.gallery.mobileAlt'
  | 'home.gallery.darkAlt'
  | 'home.gallery.lightAlt'
  | 'home.gallery.methodsAlt'
  | 'lightbox.close'
  | 'lightbox.closeAria'
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
  | 'support.github'
  | 'support.issues'
  | 'status.available'
  | 'status.comingSoon'
  | 'status.releaseCandidate'
  | 'status.availableWithConfig'
  | 'status.providerSetupRequired'
  | 'status.notSupported'
  | 'status.published'
  | 'status.availableInAngular'
  | 'home.hero.title'
  | 'home.hero.lede'
  | 'home.hero.getStarted'
  | 'home.hero.angularLibrary'
  | 'home.hero.package'
  | 'home.frameworks.eyebrow'
  | 'home.frameworks.title'
  | 'home.frameworks.description'
  | 'home.frameworks.versionPackage'
  | 'home.frameworks.docsCta'
  | 'home.frameworks.notReleased'
  | 'home.benefits.eyebrow'
  | 'home.benefits.title'
  | 'home.benefits.description'
  | 'home.benefits.reusable.title'
  | 'home.benefits.reusable.body'
  | 'home.benefits.flexible.title'
  | 'home.benefits.flexible.body'
  | 'home.benefits.typescript.title'
  | 'home.benefits.typescript.body'
  | 'home.benefits.theme.title'
  | 'home.benefits.theme.body'
  | 'home.benefits.localization.title'
  | 'home.benefits.localization.body'
  | 'home.benefits.providers.title'
  | 'home.benefits.providers.body'
  | 'home.benefits.opensource.title'
  | 'home.benefits.opensource.body'
  | 'home.methods.eyebrow'
  | 'home.methods.title'
  | 'home.methods.description'
  | 'home.methods.alertTitle'
  | 'home.methods.alertBody'
  | 'home.methods.via'
  | 'home.methods.cardFallback'
  | 'home.methods.notSupported'
  | 'home.methods.marksNote'
  | 'home.experiences.eyebrow'
  | 'home.experiences.title'
  | 'home.experiences.description'
  | 'home.experiences.full.name'
  | 'home.experiences.full.body'
  | 'home.experiences.buttons.name'
  | 'home.experiences.buttons.body'
  | 'home.experiences.headless.name'
  | 'home.experiences.headless.body'
  | 'home.experiences.docsAlertTitle'
  | 'home.experiences.docsAlertBody'
  | 'home.install.eyebrow'
  | 'home.install.title'
  | 'home.install.description'
  | 'home.install.readDocs'
  | 'home.install.viewNpm'
  | 'home.docs.eyebrow'
  | 'home.docs.title'
  | 'home.docs.description'
  | 'home.docs.angularLink'
  | 'home.docs.frameworksLink'
  | 'home.docs.securityLink'
  | 'home.oss.eyebrow'
  | 'home.oss.title'
  | 'home.oss.description'
  | 'home.oss.org.title'
  | 'home.oss.org.body'
  | 'home.oss.angular.title'
  | 'home.oss.angular.body'
  | 'home.oss.website.title'
  | 'home.oss.website.body'
  | 'home.oss.license.body'
  | 'home.trust.eyebrow'
  | 'home.trust.title'
  | 'home.trust.description'
  | 'home.trust.alertTitle'
  | 'home.trust.alertBody'
  | 'home.trust.securityCta'
  | 'home.trust.angularSecurityCta'
  | 'home.final.eyebrow'
  | 'home.final.title'
  | 'home.final.body'
  | 'home.final.getStarted'
  | 'home.final.githubCta'
  | 'frameworks.eyebrow'
  | 'frameworks.title'
  | 'frameworks.description'
  | 'frameworks.versionPackage'
  | 'frameworks.viewDocs'
  | 'frameworks.notAvailable'
  | 'security.eyebrow'
  | 'security.title'
  | 'security.description'
  | 'security.alertTitle'
  | 'security.alertBody'
  | 'security.principle.noSecrets.title'
  | 'security.principle.noSecrets.body'
  | 'security.principle.noProcessing.title'
  | 'security.principle.noProcessing.body'
  | 'security.principle.versioning.title'
  | 'security.principle.versioning.body'
  | 'security.repoDocs.title'
  | 'security.repoDocs.body'
  | 'security.githubCta'
  | 'docs.toolbar.framework'
  | 'docs.toolbar.frameworkAria'
  | 'docs.toolbar.version'
  | 'docs.toolbar.versionAria'
  | 'docs.toolbar.search'
  | 'docs.toc.title'
  | 'docs.mobile.showMenu'
  | 'docs.mobile.hideMenu'
  | 'docs.sidebar.aria'
  | 'docs.missing.eyebrow'
  | 'docs.missing.comingSoonTitle'
  | 'docs.missing.comingSoonBody'
  | 'docs.missing.notFoundTitle'
  | 'docs.missing.notFoundBody'
  | 'docs.missing.openLatest'
  | 'docs.missing.viewFrameworks'
  | 'docs.search.title'
  | 'docs.search.close'
  | 'docs.search.queryAria'
  | 'docs.search.placeholder'
  | 'docs.search.scope'
  | 'docs.search.scopeAll'
  | 'docs.search.empty'
  | 'meta.title.home'
  | 'meta.title.frameworks'
  | 'meta.title.security'
  | 'meta.title.playground'
  | 'meta.title.contact'
  | 'meta.title.faq'
  | 'meta.title.support'
  | 'meta.title.docs'
  | 'meta.title.notFound'
  | 'meta.title.docsPage';

type Catalog = Record<SiteMessageKey, string>;

const en: Catalog = {
  'a11y.skipToContent': 'Skip to content',
  'a11y.home': 'easy payments home',
  'brand.tagline': 'Payments Made Simple',
  'copy.label': 'Copy',
  'copy.copied': 'Copied',
  'copy.failed': 'Copy failed',
  'copy.aria': 'Copy code to clipboard',
  'copy.ariaCopied': 'Copied to clipboard',
  'copy.live': 'Code copied to clipboard',
  'payment.card.summary': 'Card payments via Stripe Payment Element. Requires your Stripe account and backend confirmation.',
  'payment.paypal.summary': 'Official PayPal buttons. Requires PayPal merchant configuration and sandbox/live credentials.',
  'payment.applePay.summary': 'Official Apple Pay mark and wallet flow. Device, domain, and merchant setup required.',
  'payment.googlePay.summary': 'Official Google Pay acceptance mark. Merchant and environment configuration required.',
  'payment.klarna.summary': 'Klarna checkout integration. Availability depends on merchant country, currency, and Klarna setup.',
  'payment.affirm.summary': 'Affirm installment payments. Requires Affirm merchant onboarding and product eligibility.',
  'payment.card.markAlt': 'Card payment',
  'playground.product.name': 'Premium Plan',
  'playground.product.description': 'One year subscription',
  'docs.search.matchTitle': 'title',
  'docs.search.matchHeading': 'heading',
  'docs.search.matchContent': 'content',
  'docs.releaseNote.121': 'This release updates website links and package metadata. The same checkout guides from 1.2.0 still apply — Full Checkout, Buttons Only, and Headless are unchanged.',
  'docs.releaseNote.121Label': '1.2.1 notes:',
  'docs.pager.previous': 'Previous',
  'docs.pager.next': 'Next',
  'docs.pager.aria': 'Documentation pagination',
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
  'playground.otherFrameworksHint': 'React, Vue, and Svelte playgrounds remain coming soon.',
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
  'home.previewCaption':
    'Real Easy Payments checkout screenshot · demo mode, no live charges',
  'home.previewAlt':
    'Easy Payments Angular checkout on desktop with Card, PayPal, Apple Pay, Google Pay, Klarna, and Affirm options labeled DEMO',
  'home.gallery.eyebrow': 'Product',
  'home.gallery.title': 'Real checkout screenshots',
  'home.gallery.description':
    'Captured from the Easy Payments Angular demo. Click any preview to enlarge.',
  'home.gallery.enlarge': 'Enlarge screenshot: {{label}}',
  'home.gallery.desktop': 'Desktop',
  'home.gallery.mobile': 'Mobile',
  'home.gallery.dark': 'Dark',
  'home.gallery.light': 'Light',
  'home.gallery.methods': 'Methods',
  'home.gallery.desktopAlt':
    'Easy Payments full checkout on desktop showing payment method selection in light mode',
  'home.gallery.mobileAlt':
    'Easy Payments full checkout on a mobile viewport with stacked payment methods',
  'home.gallery.darkAlt':
    'Easy Payments checkout in dark appearance with Card selected',
  'home.gallery.lightAlt': 'Easy Payments checkout in light appearance',
  'home.gallery.methodsAlt':
    'Easy Payments checkout highlighting payment method order and DEMO labels',
  'lightbox.close': 'Close',
  'lightbox.closeAria': 'Close image preview',
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
  'status.available': 'Available',
  'status.comingSoon': 'Coming soon',
  'status.releaseCandidate': 'Release candidate',
  'status.availableWithConfig': 'Available with config',
  'status.providerSetupRequired': 'Provider setup required',
  'status.notSupported': 'Not supported',
  'status.published': 'Published',
  'status.availableInAngular': 'Available in Angular {{version}}',
  'home.hero.title': 'Multi-provider checkout for modern web apps',
  'home.hero.lede':
    'Easy Payments is an open-source integration library ecosystem. Start with Angular today — React, Vue, and Svelte are on the roadmap — and connect your own Stripe, PayPal, and wallet merchant accounts with one consistent developer experience.',
  'home.hero.getStarted': 'Get Started',
  'home.hero.angularLibrary': 'Angular library:',
  'home.hero.package': 'Package',
  'home.frameworks.eyebrow': 'Ecosystem',
  'home.frameworks.title': 'Choose your framework',
  'home.frameworks.description':
    'Easy Payments is framework-aware. Angular is available now. React, Vue, and Svelte adapters are coming soon.',
  'home.frameworks.versionPackage':
    'Version {{version}}. Package {{package}}.',
  'home.frameworks.docsCta': 'Angular docs (v{{version}})',
  'home.frameworks.notReleased':
    'Not released yet. No package install and no documentation route until a published release exists.',
  'home.benefits.eyebrow': 'Why Easy Payments',
  'home.benefits.title': 'Built for developers who own the checkout',
  'home.benefits.description':
    'Claims below reflect capabilities of the current published Angular library. Preview-only features are labeled elsewhere.',
  'home.benefits.reusable.title': 'Reusable payment integrations',
  'home.benefits.reusable.body':
    'One Angular API for card, wallets, PayPal, Klarna, and Affirm instead of stitching every provider SDK yourself.',
  'home.benefits.flexible.title': 'Flexible checkout experiences',
  'home.benefits.flexible.body':
    'Full Checkout, Buttons Only, and Headless are all available in Angular {{version}}.',
  'home.benefits.typescript.title': 'TypeScript-friendly APIs',
  'home.benefits.typescript.body':
    'Strongly typed configuration and events designed for Angular applications on modern TypeScript.',
  'home.benefits.theme.title': 'Theme customization',
  'home.benefits.theme.body':
    'Light and dark checkout surfaces with appearance controls that fit your product UI.',
  'home.benefits.localization.title': 'Localization',
  'home.benefits.localization.body':
    'Built-in UI localization for English, Spanish, and Portuguese, including auto locale detection.',
  'home.benefits.providers.title': 'Provider integrations',
  'home.benefits.providers.body':
    'Works with your Stripe, PayPal, and related merchant accounts — Easy Payments is not a processor.',
  'home.benefits.opensource.title': 'Open-source MIT licensing',
  'home.benefits.opensource.body':
    'Inspect the code, contribute improvements, and ship under the MIT license.',
  'home.methods.eyebrow': 'Providers',
  'home.methods.title': 'Supported payment methods',
  'home.methods.description':
    'Marks identify supported options. Availability depends on your merchant accounts, provider configuration, and TEST/Sandbox environments.',
  'home.methods.alertTitle': 'Configuration and sandbox limitations',
  'home.methods.alertBody':
    'These methods are not universally production-ready out of the box. Each provider needs credentials, domain verification where required, and a secure backend. Demo screenshots show DEMO labels — no real payment is processed on this website.',
  'home.methods.via': 'via {{provider}}',
  'home.methods.cardFallback': 'Card',
  'home.methods.notSupported': 'Not supported:',
  'home.methods.marksNote':
    'Third-party logos remain the property of their respective owners — see payment-marks/SOURCES.md.',
  'home.experiences.eyebrow': 'Integration modes',
  'home.experiences.title': 'Checkout experiences',
  'home.experiences.description':
    'Full Checkout, Buttons Only, and Headless are all available in Angular {{version}}.',
  'home.experiences.full.name': 'Full Checkout',
  'home.experiences.full.body':
    'Complete checkout UI with order summary, payment method selection, and confirm actions.',
  'home.experiences.buttons.name': 'Buttons Only',
  'home.experiences.buttons.body':
    'Render provider buttons and card expansion without the full checkout shell.',
  'home.experiences.headless.name': 'Headless',
  'home.experiences.headless.body':
    'Programmatic checkout control for custom UI shells.',
  'home.experiences.docsAlertTitle': 'Current docs version',
  'home.experiences.docsAlertBody':
    'Angular {{version}} is the default documentation version. Checkout guides match 1.2.0; this release updates website links and package metadata.',
  'home.install.eyebrow': 'Get started',
  'home.install.title': 'Install the published Angular library',
  'home.install.description':
    'Use the current npm package. This example does not reference unreleased APIs.',
  'home.install.readDocs': 'Read Angular docs (v{{version}})',
  'home.install.viewNpm': 'View on npm',
  'home.docs.eyebrow': 'Documentation',
  'home.docs.title': 'Find the right guide',
  'home.docs.description':
    'Documentation currently tracks Angular {{version}}. Framework and version selectors in the docs UI show coming-soon frameworks as disabled.',
  'home.docs.angularLink': 'Angular documentation (v{{version}})',
  'home.docs.frameworksLink': 'Framework availability',
  'home.docs.securityLink': 'Security overview',
  'home.oss.eyebrow': 'Open source',
  'home.oss.title': 'Built in the open',
  'home.oss.description':
    'Easy Payments is an MIT-licensed ecosystem. Inspect the libraries, follow the organization, and contribute.',
  'home.oss.org.title': 'GitHub organization',
  'home.oss.org.body':
    'Source of truth for framework libraries and ecosystem planning.',
  'home.oss.angular.title': 'Angular library',
  'home.oss.angular.body': 'Published package repository for {{package}}.',
  'home.oss.website.title': 'Website repository',
  'home.oss.website.body': 'This marketing and documentation site.',
  'home.oss.license.body':
    'Use, modify, and distribute under the MIT license terms published with each package.',
  'home.trust.eyebrow': 'Production trust',
  'home.trust.title': 'Integration library — not a payment processor',
  'home.trust.description':
    'Easy Payments helps your application talk to your provider accounts. It does not move money, hold funds, or replace Stripe, PayPal, or wallet providers.',
  'home.trust.alertTitle': 'Backend verification required',
  'home.trust.alertBody':
    'Payment completion and fulfillment require secure backend verification, server-side pricing, webhook handling, and provider credentials that never belong in the browser or on this website.',
  'home.trust.securityCta': 'Security overview',
  'home.trust.angularSecurityCta': 'Angular security docs',
  'home.final.eyebrow': 'Ready when you are',
  'home.final.title': 'Start with Angular {{version}}',
  'home.final.body':
    'Install the package, read the docs, and keep provider secrets on your backend. Full Checkout, Buttons Only, and Headless are all available in Angular {{version}}.',
  'home.final.getStarted': 'Get Started',
  'home.final.githubCta': 'Angular on GitHub',
  'frameworks.eyebrow': 'Integrations',
  'frameworks.title': 'Frameworks',
  'frameworks.description':
    'Easy Payments starts with Angular. React, Vue, and Svelte adapters are planned and listed here as coming soon.',
  'frameworks.versionPackage':
    'Version {{version}}. Package: {{package}}.',
  'frameworks.viewDocs': 'View documentation',
  'frameworks.notAvailable':
    'Not available yet. This framework will appear here when a published release is ready.',
  'security.eyebrow': 'Trust',
  'security.title': 'Security',
  'security.description':
    'An honest overview of how this website fits into the Easy Payments security posture. Detailed library guidance lives in the existing repository documentation.',
  'security.alertTitle': 'Security notice',
  'security.alertBody':
    'Easy Payments libraries help applications integrate with payment providers. This website itself never accepts card data or performs live payment operations.',
  'security.principle.noSecrets.title': 'No secrets on this site',
  'security.principle.noSecrets.body':
    'This website is a static marketing and documentation surface. It does not embed payment credentials, provider secret keys, or private environment values.',
  'security.principle.noProcessing.title': 'No payment processing here',
  'security.principle.noProcessing.body':
    'Checkout, tokenization, and provider calls belong in consumer applications that integrate the Easy Payments libraries — not on this public website.',
  'security.principle.versioning.title': 'Honest versioning',
  'security.principle.versioning.body':
    'Only published package versions are presented as current. Release candidates are labeled clearly and are not treated as production releases.',
  'security.repoDocs.title': 'Repository documentation',
  'security.repoDocs.body':
    'Prefer the security and contribution docs in the Easy Payments repositories for implementation-level guidance and reporting expectations.',
  'security.githubCta': 'Easy Payments on GitHub',
  'docs.toolbar.framework': 'Framework',
  'docs.toolbar.frameworkAria': 'Framework selector',
  'docs.toolbar.version': 'Version',
  'docs.toolbar.versionAria': 'Version selector',
  'docs.toolbar.search': 'Search docs',
  'docs.toc.title': 'On this page',
  'docs.mobile.showMenu': 'Show documentation menu',
  'docs.mobile.hideMenu': 'Hide documentation menu',
  'docs.sidebar.aria': 'Documentation sections',
  'docs.missing.eyebrow': 'Documentation',
  'docs.missing.comingSoonTitle': 'Framework documentation coming soon',
  'docs.missing.comingSoonBody':
    'React, Vue, and Svelte adapters are not released yet. Angular documentation is available now.',
  'docs.missing.notFoundTitle': 'Documentation page not found',
  'docs.missing.notFoundBody':
    'This framework, version, or page is not part of the documentation set.',
  'docs.missing.openLatest': 'Open latest Angular docs',
  'docs.missing.viewFrameworks': 'View framework status',
  'docs.search.title': 'Search documentation',
  'docs.search.close': 'Close',
  'docs.search.queryAria': 'Search query',
  'docs.search.placeholder': 'Search titles, headings, and content',
  'docs.search.scope': 'Scope',
  'docs.search.scopeAll': 'All published documentation',
  'docs.search.empty': 'No results for “{{query}}”.',
  'meta.title.home': 'easy payments | Payments Made Simple',
  'meta.title.frameworks': 'Frameworks | easy payments',
  'meta.title.security': 'Security | easy payments',
  'meta.title.playground':
    'Playground | Angular checkout mock demo | easy payments',
  'meta.title.contact': 'Contact | easy payments',
  'meta.title.faq': 'FAQ | easy payments',
  'meta.title.support': 'Support Easy Payments | easy payments',
  'meta.title.docs': 'Documentation | easy payments',
  'meta.title.notFound': 'Not Found | easy payments',
  'meta.title.docsPage':
    '{{page}} · Angular {{version}} | easy payments',
};

const es: Catalog = {
  ...en,
  'a11y.skipToContent': 'Saltar al contenido',
  'a11y.home': 'Inicio de easy payments',
  'brand.tagline': 'Pagos hechos simples',
  'copy.label': 'Copiar',
  'copy.copied': 'Copiado',
  'copy.failed': 'Error al copiar',
  'copy.aria': 'Copiar código al portapapeles',
  'copy.ariaCopied': 'Copiado al portapapeles',
  'copy.live': 'Código copiado al portapapeles',
  'payment.card.summary': 'Pagos con tarjeta vía Stripe Payment Element. Requiere tu cuenta de Stripe y confirmación en el backend.',
  'payment.paypal.summary': 'Botones oficiales de PayPal. Requiere configuración de comercio PayPal y credenciales sandbox/live.',
  'payment.applePay.summary': 'Marca y flujo oficiales de Apple Pay. Requiere dispositivo, dominio y configuración de comercio.',
  'payment.googlePay.summary': 'Marca oficial de aceptación de Google Pay. Requiere configuración de comercio y entorno.',
  'payment.klarna.summary': 'Integración de checkout Klarna. La disponibilidad depende del país del comercio, la moneda y la configuración de Klarna.',
  'payment.affirm.summary': 'Pagos a plazos Affirm. Requiere onboarding de comercio Affirm y elegibilidad del producto.',
  'payment.card.markAlt': 'Pago con tarjeta',
  'playground.product.name': 'Plan Premium',
  'playground.product.description': 'Suscripción de un año',
  'docs.search.matchTitle': 'título',
  'docs.search.matchHeading': 'encabezado',
  'docs.search.matchContent': 'contenido',
  'docs.releaseNote.121': 'Esta versión actualiza enlaces del sitio y metadatos del paquete. Las mismas guías de checkout de 1.2.0 siguen aplicando — Full Checkout, Buttons Only y Headless no cambian.',
  'docs.releaseNote.121Label': 'Notas de 1.2.1:',
  'docs.pager.previous': 'Anterior',
  'docs.pager.next': 'Siguiente',
  'docs.pager.aria': 'Paginación de documentación',
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
  'playground.otherFrameworksHint': 'Los playgrounds de React, Vue y Svelte siguen próximamente.',
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
  'home.previewCaption':
    'Captura real del checkout de Easy Payments · modo demo, sin cargos reales',
  'home.previewAlt':
    'Checkout de Easy Payments para Angular en escritorio con Tarjeta, PayPal, Apple Pay, Google Pay, Klarna y Affirm etiquetados como DEMO',
  'home.gallery.eyebrow': 'Producto',
  'home.gallery.title': 'Capturas reales del checkout',
  'home.gallery.description':
    'Tomadas del demo Angular de Easy Payments. Haz clic en cualquier vista previa para ampliarla.',
  'home.gallery.enlarge': 'Ampliar captura: {{label}}',
  'home.gallery.desktop': 'Escritorio',
  'home.gallery.mobile': 'Móvil',
  'home.gallery.dark': 'Oscuro',
  'home.gallery.light': 'Claro',
  'home.gallery.methods': 'Métodos',
  'home.gallery.desktopAlt':
    'Checkout completo de Easy Payments en escritorio mostrando la selección de métodos de pago en modo claro',
  'home.gallery.mobileAlt':
    'Checkout completo de Easy Payments en un viewport móvil con métodos de pago apilados',
  'home.gallery.darkAlt':
    'Checkout de Easy Payments en apariencia oscura con Tarjeta seleccionada',
  'home.gallery.lightAlt': 'Checkout de Easy Payments en apariencia clara',
  'home.gallery.methodsAlt':
    'Checkout de Easy Payments destacando el orden de métodos de pago y etiquetas DEMO',
  'lightbox.close': 'Cerrar',
  'lightbox.closeAria': 'Cerrar vista previa de la imagen',
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
  'status.available': 'Disponible',
  'status.comingSoon': 'Próximamente',
  'status.releaseCandidate': 'Release candidate',
  'status.availableWithConfig': 'Disponible con configuración',
  'status.providerSetupRequired': 'Requiere configuración del proveedor',
  'status.notSupported': 'No compatible',
  'status.published': 'Publicado',
  'status.availableInAngular': 'Disponible en Angular {{version}}',
  'home.hero.title': 'Checkout multiproveedor para apps web modernas',
  'home.hero.lede':
    'Easy Payments es un ecosistema de bibliotecas de integración de código abierto. Empieza hoy con Angular — React, Vue y Svelte están en la hoja de ruta — y conecta tus propias cuentas de Stripe, PayPal y wallets con una experiencia de desarrollo coherente.',
  'home.hero.getStarted': 'Empezar',
  'home.hero.angularLibrary': 'Biblioteca Angular:',
  'home.hero.package': 'Paquete',
  'home.frameworks.eyebrow': 'Ecosistema',
  'home.frameworks.title': 'Elige tu framework',
  'home.frameworks.description':
    'Easy Payments está pensado por framework. Angular ya está disponible. Los adaptadores de React, Vue y Svelte están próximamente.',
  'home.frameworks.versionPackage':
    'Versión {{version}}. Paquete {{package}}.',
  'home.frameworks.docsCta': 'Docs de Angular (v{{version}})',
  'home.frameworks.notReleased':
    'Aún no publicado. No hay instalación de paquete ni ruta de documentación hasta que exista una versión publicada.',
  'home.benefits.eyebrow': 'Por qué Easy Payments',
  'home.benefits.title': 'Hecho para desarrolladores que controlan el checkout',
  'home.benefits.description':
    'Lo siguiente refleja capacidades de la biblioteca Angular publicada actualmente. Las funciones solo en preview se etiquetan en otras secciones.',
  'home.benefits.reusable.title': 'Integraciones de pago reutilizables',
  'home.benefits.reusable.body':
    'Una API Angular para tarjeta, wallets, PayPal, Klarna y Affirm en lugar de ensamblar cada SDK de proveedor tú mismo.',
  'home.benefits.flexible.title': 'Experiencias de checkout flexibles',
  'home.benefits.flexible.body':
    'Full Checkout, Buttons Only y Headless están disponibles en Angular {{version}}.',
  'home.benefits.typescript.title': 'APIs amigables con TypeScript',
  'home.benefits.typescript.body':
    'Configuración y eventos tipados diseñados para aplicaciones Angular con TypeScript moderno.',
  'home.benefits.theme.title': 'Personalización de tema',
  'home.benefits.theme.body':
    'Superficies de checkout claras y oscuras con controles de apariencia que encajan en tu UI de producto.',
  'home.benefits.localization.title': 'Localización',
  'home.benefits.localization.body':
    'Localización de UI integrada para inglés, español y portugués, incluida la detección automática de locale.',
  'home.benefits.providers.title': 'Integraciones con proveedores',
  'home.benefits.providers.body':
    'Funciona con tus cuentas de Stripe, PayPal y relacionadas — Easy Payments no es un procesador.',
  'home.benefits.opensource.title': 'Licencia MIT de código abierto',
  'home.benefits.opensource.body':
    'Inspecciona el código, aporta mejoras y publica bajo la licencia MIT.',
  'home.methods.eyebrow': 'Proveedores',
  'home.methods.title': 'Métodos de pago compatibles',
  'home.methods.description':
    'Las marcas identifican opciones compatibles. La disponibilidad depende de tus cuentas de comercio, la configuración del proveedor y entornos TEST/Sandbox.',
  'home.methods.alertTitle': 'Limitaciones de configuración y sandbox',
  'home.methods.alertBody':
    'Estos métodos no están listos para producción de forma universal. Cada proveedor necesita credenciales, verificación de dominio cuando aplique y un backend seguro. Las capturas de demo muestran etiquetas DEMO — en este sitio no se procesa ningún pago real.',
  'home.methods.via': 'vía {{provider}}',
  'home.methods.cardFallback': 'Tarjeta',
  'home.methods.notSupported': 'No compatible:',
  'home.methods.marksNote':
    'Los logos de terceros siguen siendo propiedad de sus respectivos dueños — ver payment-marks/SOURCES.md.',
  'home.experiences.eyebrow': 'Modos de integración',
  'home.experiences.title': 'Experiencias de checkout',
  'home.experiences.description':
    'Full Checkout, Buttons Only y Headless están disponibles en Angular {{version}}.',
  'home.experiences.full.name': 'Full Checkout',
  'home.experiences.full.body':
    'UI de checkout completa con resumen del pedido, selección de método de pago y acciones de confirmación.',
  'home.experiences.buttons.name': 'Buttons Only',
  'home.experiences.buttons.body':
    'Renderiza botones de proveedor y expansión de tarjeta sin el shell completo del checkout.',
  'home.experiences.headless.name': 'Headless',
  'home.experiences.headless.body':
    'Control programático del checkout para shells de UI personalizados.',
  'home.experiences.docsAlertTitle': 'Versión actual de docs',
  'home.experiences.docsAlertBody':
    'Angular {{version}} es la versión de documentación por defecto. Las guías de checkout coinciden con 1.2.0; esta versión actualiza enlaces del sitio y metadatos del paquete.',
  'home.install.eyebrow': 'Empezar',
  'home.install.title': 'Instala la biblioteca Angular publicada',
  'home.install.description':
    'Usa el paquete npm actual. Este ejemplo no referencia APIs no publicadas.',
  'home.install.readDocs': 'Leer docs de Angular (v{{version}})',
  'home.install.viewNpm': 'Ver en npm',
  'home.docs.eyebrow': 'Documentación',
  'home.docs.title': 'Encuentra la guía adecuada',
  'home.docs.description':
    'La documentación sigue actualmente Angular {{version}}. Los selectores de framework y versión en la UI de docs muestran frameworks próximamente como deshabilitados.',
  'home.docs.angularLink': 'Documentación de Angular (v{{version}})',
  'home.docs.frameworksLink': 'Disponibilidad de frameworks',
  'home.docs.securityLink': 'Resumen de seguridad',
  'home.oss.eyebrow': 'Código abierto',
  'home.oss.title': 'Construido en abierto',
  'home.oss.description':
    'Easy Payments es un ecosistema con licencia MIT. Inspecciona las bibliotecas, sigue la organización y contribuye.',
  'home.oss.org.title': 'Organización en GitHub',
  'home.oss.org.body':
    'Fuente de verdad para las bibliotecas por framework y la planificación del ecosistema.',
  'home.oss.angular.title': 'Biblioteca Angular',
  'home.oss.angular.body': 'Repositorio del paquete publicado para {{package}}.',
  'home.oss.website.title': 'Repositorio del sitio',
  'home.oss.website.body': 'Este sitio de marketing y documentación.',
  'home.oss.license.body':
    'Usa, modifica y distribuye bajo los términos de la licencia MIT publicados con cada paquete.',
  'home.trust.eyebrow': 'Confianza en producción',
  'home.trust.title': 'Biblioteca de integración — no un procesador de pagos',
  'home.trust.description':
    'Easy Payments ayuda a tu aplicación a hablar con tus cuentas de proveedor. No mueve dinero, custodia fondos ni reemplaza a Stripe, PayPal o proveedores de wallets.',
  'home.trust.alertTitle': 'Se requiere verificación en el backend',
  'home.trust.alertBody':
    'La finalización del pago y el fulfillment requieren verificación segura en el backend, precios en el servidor, webhooks y credenciales de proveedor que nunca deben estar en el navegador ni en este sitio.',
  'home.trust.securityCta': 'Resumen de seguridad',
  'home.trust.angularSecurityCta': 'Docs de seguridad Angular',
  'home.final.eyebrow': 'Listo cuando tú lo estés',
  'home.final.title': 'Empieza con Angular {{version}}',
  'home.final.body':
    'Instala el paquete, lee la documentación y mantén los secretos del proveedor en tu backend. Full Checkout, Buttons Only y Headless están disponibles en Angular {{version}}.',
  'home.final.getStarted': 'Empezar',
  'home.final.githubCta': 'Angular en GitHub',
  'frameworks.eyebrow': 'Integraciones',
  'frameworks.title': 'Frameworks',
  'frameworks.description':
    'Easy Payments empieza con Angular. Los adaptadores de React, Vue y Svelte están planificados y aparecen aquí como próximamente.',
  'frameworks.versionPackage':
    'Versión {{version}}. Paquete: {{package}}.',
  'frameworks.viewDocs': 'Ver documentación',
  'frameworks.notAvailable':
    'Aún no disponible. Este framework aparecerá aquí cuando haya una versión publicada.',
  'security.eyebrow': 'Confianza',
  'security.title': 'Seguridad',
  'security.description':
    'Una visión honesta de cómo este sitio encaja en la postura de seguridad de Easy Payments. La guía detallada de la biblioteca vive en la documentación de los repositorios.',
  'security.alertTitle': 'Aviso de seguridad',
  'security.alertBody':
    'Las bibliotecas de Easy Payments ayudan a las aplicaciones a integrarse con proveedores de pago. Este sitio en sí nunca acepta datos de tarjeta ni realiza operaciones de pago en vivo.',
  'security.principle.noSecrets.title': 'Sin secretos en este sitio',
  'security.principle.noSecrets.body':
    'Este sitio es una superficie estática de marketing y documentación. No incrusta credenciales de pago, claves secretas de proveedores ni valores privados de entorno.',
  'security.principle.noProcessing.title': 'Sin procesamiento de pagos aquí',
  'security.principle.noProcessing.body':
    'El checkout, la tokenización y las llamadas a proveedores pertenecen a las aplicaciones consumidoras que integran las bibliotecas de Easy Payments — no a este sitio público.',
  'security.principle.versioning.title': 'Versionado honesto',
  'security.principle.versioning.body':
    'Solo las versiones publicadas del paquete se presentan como actuales. Los release candidates se etiquetan con claridad y no se tratan como releases de producción.',
  'security.repoDocs.title': 'Documentación del repositorio',
  'security.repoDocs.body':
    'Prefiere la documentación de seguridad y contribución en los repositorios de Easy Payments para orientación a nivel de implementación y expectativas de reporte.',
  'security.githubCta': 'Easy Payments en GitHub',
  'docs.toolbar.framework': 'Framework',
  'docs.toolbar.frameworkAria': 'Selector de framework',
  'docs.toolbar.version': 'Versión',
  'docs.toolbar.versionAria': 'Selector de versión',
  'docs.toolbar.search': 'Buscar docs',
  'docs.toc.title': 'En esta página',
  'docs.mobile.showMenu': 'Mostrar menú de documentación',
  'docs.mobile.hideMenu': 'Ocultar menú de documentación',
  'docs.sidebar.aria': 'Secciones de documentación',
  'docs.missing.eyebrow': 'Documentación',
  'docs.missing.comingSoonTitle': 'Documentación del framework próximamente',
  'docs.missing.comingSoonBody':
    'Los adaptadores de React, Vue y Svelte aún no están publicados. La documentación de Angular ya está disponible.',
  'docs.missing.notFoundTitle': 'Página de documentación no encontrada',
  'docs.missing.notFoundBody':
    'Este framework, versión o página no forma parte del conjunto de documentación.',
  'docs.missing.openLatest': 'Abrir las últimas docs de Angular',
  'docs.missing.viewFrameworks': 'Ver estado de frameworks',
  'docs.search.title': 'Buscar documentación',
  'docs.search.close': 'Cerrar',
  'docs.search.queryAria': 'Consulta de búsqueda',
  'docs.search.placeholder': 'Buscar títulos, encabezados y contenido',
  'docs.search.scope': 'Ámbito',
  'docs.search.scopeAll': 'Toda la documentación publicada',
  'docs.search.empty': 'Sin resultados para “{{query}}”.',
  'meta.title.home': 'easy payments | Pagos hechos simples',
  'meta.title.frameworks': 'Frameworks | easy payments',
  'meta.title.security': 'Seguridad | easy payments',
  'meta.title.playground':
    'Playground | Demo mock de checkout Angular | easy payments',
  'meta.title.contact': 'Contacto | easy payments',
  'meta.title.faq': 'FAQ | easy payments',
  'meta.title.support': 'Apoya Easy Payments | easy payments',
  'meta.title.docs': 'Documentación | easy payments',
  'meta.title.notFound': 'No encontrado | easy payments',
  'meta.title.docsPage':
    '{{page}} · Angular {{version}} | easy payments',
};

const pt: Catalog = {
  ...en,
  'a11y.skipToContent': 'Saltar para o conteúdo',
  'a11y.home': 'Início do easy payments',
  'brand.tagline': 'Pagamentos feitos simples',
  'copy.label': 'Copiar',
  'copy.copied': 'Copiado',
  'copy.failed': 'Falha ao copiar',
  'copy.aria': 'Copiar código para a área de transferência',
  'copy.ariaCopied': 'Copiado para a área de transferência',
  'copy.live': 'Código copiado para a área de transferência',
  'payment.card.summary': 'Pagamentos com cartão via Stripe Payment Element. Requer a sua conta Stripe e confirmação no backend.',
  'payment.paypal.summary': 'Botões oficiais do PayPal. Requer configuração de comerciante PayPal e credenciais sandbox/live.',
  'payment.applePay.summary': 'Marca e fluxo oficiais do Apple Pay. Requer dispositivo, domínio e configuração de comerciante.',
  'payment.googlePay.summary': 'Marca oficial de aceitação do Google Pay. Requer configuração de comerciante e ambiente.',
  'payment.klarna.summary': 'Integração de checkout Klarna. A disponibilidade depende do país do comerciante, da moeda e da configuração Klarna.',
  'payment.affirm.summary': 'Pagamentos parcelados Affirm. Requer onboarding de comerciante Affirm e elegibilidade do produto.',
  'payment.card.markAlt': 'Pagamento com cartão',
  'playground.product.name': 'Plano Premium',
  'playground.product.description': 'Assinatura de um ano',
  'docs.search.matchTitle': 'título',
  'docs.search.matchHeading': 'cabeçalho',
  'docs.search.matchContent': 'conteúdo',
  'docs.releaseNote.121': 'Esta versão atualiza links do site e metadados do pacote. Os mesmos guias de checkout da 1.2.0 ainda se aplicam — Full Checkout, Buttons Only e Headless não mudam.',
  'docs.releaseNote.121Label': 'Notas da 1.2.1:',
  'docs.pager.previous': 'Anterior',
  'docs.pager.next': 'Seguinte',
  'docs.pager.aria': 'Paginação da documentação',
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
  'playground.otherFrameworksHint': 'Playgrounds React, Vue e Svelte continuam em breve.',
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
  'home.previewCaption':
    'Captura real do checkout Easy Payments · modo demo, sem cobranças reais',
  'home.previewAlt':
    'Checkout Easy Payments para Angular no desktop com Cartão, PayPal, Apple Pay, Google Pay, Klarna e Affirm rotulados como DEMO',
  'home.gallery.eyebrow': 'Produto',
  'home.gallery.title': 'Capturas reais do checkout',
  'home.gallery.description':
    'Capturadas da demo Angular do Easy Payments. Clique em qualquer prévia para ampliar.',
  'home.gallery.enlarge': 'Ampliar captura: {{label}}',
  'home.gallery.desktop': 'Desktop',
  'home.gallery.mobile': 'Mobile',
  'home.gallery.dark': 'Escuro',
  'home.gallery.light': 'Claro',
  'home.gallery.methods': 'Métodos',
  'home.gallery.desktopAlt':
    'Checkout completo do Easy Payments no desktop mostrando a seleção de métodos de pagamento no modo claro',
  'home.gallery.mobileAlt':
    'Checkout completo do Easy Payments em um viewport mobile com métodos de pagamento empilhados',
  'home.gallery.darkAlt':
    'Checkout do Easy Payments na aparência escura com Cartão selecionado',
  'home.gallery.lightAlt': 'Checkout do Easy Payments na aparência clara',
  'home.gallery.methodsAlt':
    'Checkout do Easy Payments destacando a ordem dos métodos de pagamento e rótulos DEMO',
  'lightbox.close': 'Fechar',
  'lightbox.closeAria': 'Fechar prévia da imagem',
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
  'status.available': 'Disponível',
  'status.comingSoon': 'Em breve',
  'status.releaseCandidate': 'Release candidate',
  'status.availableWithConfig': 'Disponível com configuração',
  'status.providerSetupRequired': 'Requer configuração do provedor',
  'status.notSupported': 'Não suportado',
  'status.published': 'Publicado',
  'status.availableInAngular': 'Disponível no Angular {{version}}',
  'home.hero.title': 'Checkout multiprovedor para apps web modernas',
  'home.hero.lede':
    'Easy Payments é um ecossistema open-source de bibliotecas de integração. Comece hoje com Angular — React, Vue e Svelte estão no roadmap — e conecte suas próprias contas Stripe, PayPal e wallets com uma experiência de desenvolvimento consistente.',
  'home.hero.getStarted': 'Começar',
  'home.hero.angularLibrary': 'Biblioteca Angular:',
  'home.hero.package': 'Pacote',
  'home.frameworks.eyebrow': 'Ecossistema',
  'home.frameworks.title': 'Escolha seu framework',
  'home.frameworks.description':
    'Easy Payments é consciente de framework. Angular já está disponível. Adaptadores React, Vue e Svelte estão em breve.',
  'home.frameworks.versionPackage':
    'Versão {{version}}. Pacote {{package}}.',
  'home.frameworks.docsCta': 'Docs do Angular (v{{version}})',
  'home.frameworks.notReleased':
    'Ainda não publicado. Sem instalação de pacote e sem rota de documentação até existir uma release publicada.',
  'home.benefits.eyebrow': 'Por que Easy Payments',
  'home.benefits.title': 'Feito para desenvolvedores que controlam o checkout',
  'home.benefits.description':
    'As afirmações abaixo refletem capacidades da biblioteca Angular publicada atualmente. Recursos só em preview são rotulados em outras seções.',
  'home.benefits.reusable.title': 'Integrações de pagamento reutilizáveis',
  'home.benefits.reusable.body':
    'Uma API Angular para cartão, wallets, PayPal, Klarna e Affirm em vez de montar cada SDK de provedor você mesmo.',
  'home.benefits.flexible.title': 'Experiências de checkout flexíveis',
  'home.benefits.flexible.body':
    'Full Checkout, Buttons Only e Headless estão disponíveis no Angular {{version}}.',
  'home.benefits.typescript.title': 'APIs amigáveis ao TypeScript',
  'home.benefits.typescript.body':
    'Configuração e eventos tipados projetados para aplicações Angular com TypeScript moderno.',
  'home.benefits.theme.title': 'Personalização de tema',
  'home.benefits.theme.body':
    'Superfícies de checkout claras e escuras com controles de aparência que se encaixam na UI do seu produto.',
  'home.benefits.localization.title': 'Localização',
  'home.benefits.localization.body':
    'Localização de UI integrada para inglês, espanhol e português, incluindo detecção automática de locale.',
  'home.benefits.providers.title': 'Integrações com provedores',
  'home.benefits.providers.body':
    'Funciona com suas contas Stripe, PayPal e relacionadas — Easy Payments não é um processador.',
  'home.benefits.opensource.title': 'Licenciamento MIT open-source',
  'home.benefits.opensource.body':
    'Inspecione o código, contribua com melhorias e publique sob a licença MIT.',
  'home.methods.eyebrow': 'Provedores',
  'home.methods.title': 'Métodos de pagamento suportados',
  'home.methods.description':
    'As marcas identificam opções suportadas. A disponibilidade depende das suas contas de comerciante, da configuração do provedor e de ambientes TEST/Sandbox.',
  'home.methods.alertTitle': 'Limitações de configuração e sandbox',
  'home.methods.alertBody':
    'Esses métodos não estão prontos para produção de forma universal. Cada provedor precisa de credenciais, verificação de domínio quando necessário e um backend seguro. As capturas de demo mostram rótulos DEMO — nenhum pagamento real é processado neste site.',
  'home.methods.via': 'via {{provider}}',
  'home.methods.cardFallback': 'Cartão',
  'home.methods.notSupported': 'Não suportado:',
  'home.methods.marksNote':
    'Logos de terceiros permanecem propriedade dos respectivos donos — veja payment-marks/SOURCES.md.',
  'home.experiences.eyebrow': 'Modos de integração',
  'home.experiences.title': 'Experiências de checkout',
  'home.experiences.description':
    'Full Checkout, Buttons Only e Headless estão disponíveis no Angular {{version}}.',
  'home.experiences.full.name': 'Full Checkout',
  'home.experiences.full.body':
    'UI de checkout completa com resumo do pedido, seleção de método de pagamento e ações de confirmação.',
  'home.experiences.buttons.name': 'Buttons Only',
  'home.experiences.buttons.body':
    'Renderize botões de provedor e expansão de cartão sem o shell completo do checkout.',
  'home.experiences.headless.name': 'Headless',
  'home.experiences.headless.body':
    'Controle programático do checkout para shells de UI personalizados.',
  'home.experiences.docsAlertTitle': 'Versão atual da documentação',
  'home.experiences.docsAlertBody':
    'Angular {{version}} é a versão padrão da documentação. Os guias de checkout correspondem a 1.2.0; esta release atualiza links do site e metadados do pacote.',
  'home.install.eyebrow': 'Começar',
  'home.install.title': 'Instale a biblioteca Angular publicada',
  'home.install.description':
    'Use o pacote npm atual. Este exemplo não referencia APIs não lançadas.',
  'home.install.readDocs': 'Ler docs do Angular (v{{version}})',
  'home.install.viewNpm': 'Ver no npm',
  'home.docs.eyebrow': 'Documentação',
  'home.docs.title': 'Encontre o guia certo',
  'home.docs.description':
    'A documentação acompanha atualmente o Angular {{version}}. Os seletores de framework e versão na UI de docs mostram frameworks em breve como desabilitados.',
  'home.docs.angularLink': 'Documentação do Angular (v{{version}})',
  'home.docs.frameworksLink': 'Disponibilidade de frameworks',
  'home.docs.securityLink': 'Visão geral de segurança',
  'home.oss.eyebrow': 'Código aberto',
  'home.oss.title': 'Construído em aberto',
  'home.oss.description':
    'Easy Payments é um ecossistema com licença MIT. Inspecione as bibliotecas, acompanhe a organização e contribua.',
  'home.oss.org.title': 'Organização no GitHub',
  'home.oss.org.body':
    'Fonte da verdade para bibliotecas por framework e planejamento do ecossistema.',
  'home.oss.angular.title': 'Biblioteca Angular',
  'home.oss.angular.body': 'Repositório do pacote publicado para {{package}}.',
  'home.oss.website.title': 'Repositório do site',
  'home.oss.website.body': 'Este site de marketing e documentação.',
  'home.oss.license.body':
    'Use, modifique e distribua sob os termos da licença MIT publicados com cada pacote.',
  'home.trust.eyebrow': 'Confiança em produção',
  'home.trust.title': 'Biblioteca de integração — não um processador de pagamentos',
  'home.trust.description':
    'Easy Payments ajuda sua aplicação a falar com suas contas de provedor. Não movimenta dinheiro, guarda fundos nem substitui Stripe, PayPal ou provedores de wallet.',
  'home.trust.alertTitle': 'Verificação no backend obrigatória',
  'home.trust.alertBody':
    'A conclusão do pagamento e o fulfillment exigem verificação segura no backend, preços no servidor, webhooks e credenciais de provedor que nunca devem estar no navegador nem neste site.',
  'home.trust.securityCta': 'Visão geral de segurança',
  'home.trust.angularSecurityCta': 'Docs de segurança Angular',
  'home.final.eyebrow': 'Pronto quando você estiver',
  'home.final.title': 'Comece com Angular {{version}}',
  'home.final.body':
    'Instale o pacote, leia a documentação e mantenha os segredos do provedor no seu backend. Full Checkout, Buttons Only e Headless estão disponíveis no Angular {{version}}.',
  'home.final.getStarted': 'Começar',
  'home.final.githubCta': 'Angular no GitHub',
  'frameworks.eyebrow': 'Integrações',
  'frameworks.title': 'Frameworks',
  'frameworks.description':
    'Easy Payments começa com Angular. Adaptadores React, Vue e Svelte estão planejados e listados aqui como em breve.',
  'frameworks.versionPackage':
    'Versão {{version}}. Pacote: {{package}}.',
  'frameworks.viewDocs': 'Ver documentação',
  'frameworks.notAvailable':
    'Ainda não disponível. Este framework aparecerá aqui quando uma release publicada estiver pronta.',
  'security.eyebrow': 'Confiança',
  'security.title': 'Segurança',
  'security.description':
    'Uma visão honesta de como este site se encaixa na postura de segurança do Easy Payments. A orientação detalhada da biblioteca vive na documentação dos repositórios.',
  'security.alertTitle': 'Aviso de segurança',
  'security.alertBody':
    'As bibliotecas Easy Payments ajudam aplicações a integrar provedores de pagamento. Este site em si nunca aceita dados de cartão nem realiza operações de pagamento ao vivo.',
  'security.principle.noSecrets.title': 'Sem segredos neste site',
  'security.principle.noSecrets.body':
    'Este site é uma superfície estática de marketing e documentação. Ele não incorpora credenciais de pagamento, chaves secretas de provedores nem valores privados de ambiente.',
  'security.principle.noProcessing.title': 'Sem processamento de pagamentos aqui',
  'security.principle.noProcessing.body':
    'Checkout, tokenização e chamadas a provedores pertencem às aplicações consumidoras que integram as bibliotecas Easy Payments — não a este site público.',
  'security.principle.versioning.title': 'Versionamento honesto',
  'security.principle.versioning.body':
    'Somente versões publicadas do pacote são apresentadas como atuais. Release candidates são rotulados com clareza e não são tratados como releases de produção.',
  'security.repoDocs.title': 'Documentação do repositório',
  'security.repoDocs.body':
    'Prefira a documentação de segurança e contribuição nos repositórios Easy Payments para orientação em nível de implementação e expectativas de reporte.',
  'security.githubCta': 'Easy Payments no GitHub',
  'docs.toolbar.framework': 'Framework',
  'docs.toolbar.frameworkAria': 'Seletor de framework',
  'docs.toolbar.version': 'Versão',
  'docs.toolbar.versionAria': 'Seletor de versão',
  'docs.toolbar.search': 'Buscar docs',
  'docs.toc.title': 'Nesta página',
  'docs.mobile.showMenu': 'Mostrar menu de documentação',
  'docs.mobile.hideMenu': 'Ocultar menu de documentação',
  'docs.sidebar.aria': 'Seções da documentação',
  'docs.missing.eyebrow': 'Documentação',
  'docs.missing.comingSoonTitle': 'Documentação do framework em breve',
  'docs.missing.comingSoonBody':
    'Adaptadores React, Vue e Svelte ainda não foram lançados. A documentação do Angular já está disponível.',
  'docs.missing.notFoundTitle': 'Página de documentação não encontrada',
  'docs.missing.notFoundBody':
    'Este framework, versão ou página não faz parte do conjunto de documentação.',
  'docs.missing.openLatest': 'Abrir as docs mais recentes do Angular',
  'docs.missing.viewFrameworks': 'Ver status dos frameworks',
  'docs.search.title': 'Pesquisar documentação',
  'docs.search.close': 'Fechar',
  'docs.search.queryAria': 'Consulta de pesquisa',
  'docs.search.placeholder': 'Pesquisar títulos, cabeçalhos e conteúdo',
  'docs.search.scope': 'Âmbito',
  'docs.search.scopeAll': 'Toda a documentação publicada',
  'docs.search.empty': 'Sem resultados para “{{query}}”.',
  'meta.title.home': 'easy payments | Pagamentos feitos simples',
  'meta.title.frameworks': 'Frameworks | easy payments',
  'meta.title.security': 'Segurança | easy payments',
  'meta.title.playground':
    'Playground | Demo mock de checkout Angular | easy payments',
  'meta.title.contact': 'Contato | easy payments',
  'meta.title.faq': 'FAQ | easy payments',
  'meta.title.support': 'Apoie o Easy Payments | easy payments',
  'meta.title.docs': 'Documentação | easy payments',
  'meta.title.notFound': 'Não encontrado | easy payments',
  'meta.title.docsPage':
    '{{page}} · Angular {{version}} | easy payments',
};

export const SITE_MESSAGE_CATALOGS: Record<SiteLanguage, Catalog> = {
  en,
  es,
  pt,
};
