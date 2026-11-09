import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Vitest (Node ESM) cannot resolve directory imports like `@stripe/stripe-js/pure`.
 * The published `@easy-payments/angular` FESM uses that subpath. App builds resolve
 * it via Angular/Vite; unit tests need an exact rewrite plus inlining so Node does
 * not load the FESM as an untouched external ESM graph.
 */
const require = createRequire(import.meta.url);
const stripePureEntry = join(
  dirname(require.resolve('@stripe/stripe-js/pure')),
  'index.mjs',
);

function stripePureAliasPlugin(): Plugin {
  return {
    name: 'stripe-pure-dir-import',
    enforce: 'pre',
    resolveId(source) {
      if (source === '@stripe/stripe-js/pure') {
        return stripePureEntry;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [stripePureAliasPlugin()],
  resolve: {
    alias: [
      {
        find: /^@stripe\/stripe-js\/pure$/,
        replacement: stripePureEntry,
      },
    ],
  },
  test: {
    server: {
      deps: {
        // Process the published FESM through Vite so the pure-path rewrite applies.
        inline: [/@easy-payments[\\/]angular/],
      },
    },
  },
});
