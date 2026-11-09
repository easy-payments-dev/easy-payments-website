import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "testing",
  "slug": "testing",
  "title": "Testing",
  "description": "Test keys, sandbox, and verification limits.",
  "order": 140,
  "groupId": "guides",
  "groupTitle": "Guides",
  "markdown": "# Testing\n\n## Recommended layers\n\n1. **Mock mode** for UI and event wiring\n2. Provider **TEST / Sandbox** credentials for integration rehearsals\n3. Backend contract tests against your create/capture endpoints\n4. Webhook signature verification tests on the server\n\n## What local verification does not prove\n\n- Live production charges\n- Apple Pay on a verified live domain\n- Google Pay `PRODUCTION` end-to-end\n- Real provider → your server webhook delivery across environments\n\nDocument environment differences explicitly in your runbooks.\n"
};
