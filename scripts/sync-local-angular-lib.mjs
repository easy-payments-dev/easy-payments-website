/**
 * Sync built @easy-payments/angular (local unpublished 1.2.0) into
 * vendor/easy-payments-angular for a reproducible file: dependency.
 *
 * Expects sibling checkout:
 *   ../easy-payments-angular/dist/easy-payments
 *
 * Usage:
 *   node scripts/sync-local-angular-lib.mjs
 *   node scripts/sync-local-angular-lib.mjs --build   # runs npm run build:lib first
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = join(__dirname, '..');
const siblingLibRoot = join(websiteRoot, '..', 'easy-payments-angular');
const siblingDist = join(siblingLibRoot, 'dist', 'easy-payments');
const vendorDir = join(websiteRoot, 'vendor', 'easy-payments-angular');

const shouldBuild = process.argv.includes('--build');

if (shouldBuild) {
  console.log('Building sibling easy-payments-angular…');
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build:lib'],
    { cwd: siblingLibRoot, stdio: 'inherit', shell: true },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(join(siblingDist, 'package.json'))) {
  console.error(
    `Missing built package at ${siblingDist}. Run with --build or build the sibling first.`,
  );
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(siblingDist, 'package.json'), 'utf8'));
if (pkg.version !== '1.2.0') {
  console.warn(`Warning: expected package version 1.2.0, found ${pkg.version}`);
}

rmSync(vendorDir, { recursive: true, force: true });
mkdirSync(dirname(vendorDir), { recursive: true });
cpSync(siblingDist, vendorDir, { recursive: true });

const stamp = {
  syncedAt: new Date().toISOString(),
  version: pkg.version,
  source: 'sibling:../easy-payments-angular/dist/easy-payments',
  unpublished: true,
  note: 'Unpublished local 1.2.0 — not an npm registry release',
};
writeFileSync(join(vendorDir, '.vendor-stamp.json'), JSON.stringify(stamp, null, 2));

const fesm = join(vendorDir, 'fesm2022', 'easy-payments-angular.mjs');
const fesmSrc = readFileSync(fesm, 'utf8');
if (!/from ['"]@stripe\/stripe-js\/pure['"]/.test(fesmSrc)) {
  console.error('Vendor FESM does not import @stripe/stripe-js/pure — aborting sync.');
  process.exit(1);
}

console.log(`Synced @easy-payments/angular@${pkg.version} → vendor/easy-payments-angular`);
console.log('Stripe pure import verified in vendor FESM.');
