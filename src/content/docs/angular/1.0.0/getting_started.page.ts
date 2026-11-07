import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "getting-started",
  "slug": "getting-started",
  "title": "Getting started",
  "description": "What Easy Payments is, requirements, and how to begin.",
  "order": 10,
  "groupId": "getting-started",
  "groupTitle": "Getting started",
  "markdown": "# Getting started\n\nEasy Payments for Angular (`@easy-payments/angular` **1.0.0**) is an open-source **integration library** for multi-provider checkout.\n\nIt helps your Angular app present Card, PayPal, Apple Pay, Google Pay, Klarna, and Affirm using **your** merchant accounts.\n\n## What it is\n\n- A standalone Angular component API around provider SDKs\n- Normalized success / cancel / error events for UX\n- Optional mock mode for local demos without real charges\n\n## What it is not\n\n- Not a payment processor\n- Not a bank or wallet provider\n- Not a substitute for backend verification or webhooks\n- Does **not** move money or hold funds\n\n## Requirements\n\n| Requirement | Detail |\n|-------------|--------|\n| Angular | `>=20.3.0 <23.0.0` |\n| Package | `@easy-payments/angular@1.0.0` |\n| Stripe JS | Peer `@stripe/stripe-js` (`^8.0.0` per published peer guidance) |\n| Backend | HTTPS endpoints you control for create/capture/confirm flows |\n\nConsumer installs were validated on Angular **20**, **21**, and **22** in mock-mode smoke tests.\n\n## Published experience\n\nVersion **1.0.0** documents the **Full Checkout** experience (`<easy-payments>`).\n\nButtons Only and Headless checkout modes belong to the **1.2.0** release candidate and are **not** part of published 1.0.0 documentation.\n\n\n> **Evidence note:** Verified against the published `@easy-payments/angular@1.0.0` npm tarball (`types/easy-payments-angular.d.ts`). Full Checkout only — Buttons Only / Headless are not present in this published package.\n\n## Next steps\n\n1. [Installation](./installation)\n2. [Quick start](./quick-start)\n3. [Configuration](./configuration)\n4. [Security](./security)\n"
};
