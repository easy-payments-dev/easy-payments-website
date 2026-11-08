/**
 * Fail fast when vendor/@easy-payments package is missing or not 1.2.0 unpublished.
 * Used by prebuild so CI/local installs stay reproducible via file:vendor/….
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendorPkg = join(root, 'vendor', 'easy-payments-angular', 'package.json');
const fesm = join(
  root,
  'vendor',
  'easy-payments-angular',
  'fesm2022',
  'easy-payments-angular.mjs',
);

if (!existsSync(vendorPkg) || !existsSync(fesm)) {
  console.error(
    'Missing vendor/easy-payments-angular. Run: npm run sync:lib:build (requires sibling easy-payments-angular).',
  );
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(vendorPkg, 'utf8'));
if (pkg.version !== '1.2.0') {
  console.error(`Expected vendor package 1.2.0, found ${pkg.version}`);
  process.exit(1);
}

const src = readFileSync(fesm, 'utf8');
if (!/from ['"]@stripe\/stripe-js\/pure['"]/.test(src)) {
  console.error('Vendor FESM missing @stripe/stripe-js/pure import.');
  process.exit(1);
}

console.log('Vendor @easy-payments/angular@1.2.0 (unpublished local) OK.');
