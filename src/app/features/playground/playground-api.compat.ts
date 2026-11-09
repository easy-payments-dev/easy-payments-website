import { HISTORICAL_ANGULAR_API } from '../../core/docs/historical-api.evidence';
import { generatePlaygroundCode } from './playground-code.generator';
import { createDefaultPlaygroundConfig } from './playground.defaults';
import { PlaygroundConfig, PlaygroundVersion } from './playground.types';

const FORBIDDEN_SNIPPET_MARKERS = [
  'baseUrl',
  'visualStyle',
  'checkoutInstanceId',
  'EasyPaymentsHeadless',
  'easy-payment-buttons',
  '(started)',
  'Buttons Only',
  'Headless',
] as const;

/** Outputs bound by the Full Checkout snippet (verified in every published version). */
const FULL_CHECKOUT_SNIPPET_OUTPUTS = [
  'success',
  'cancel',
  'error',
  'successContinue',
] as const;

/**
 * Structural compatibility checks against W4.1 historical npm evidence.
 * Does not install published packages into the website dependency tree.
 */
export function assertPlaygroundConfigMatchesPublishedApi(
  config: PlaygroundConfig,
): string[] {
  const evidence = HISTORICAL_ANGULAR_API[config.version];
  const problems: string[] = [];

  for (const method of config.methods) {
    if (!evidence.paymentMethods.includes(method)) {
      problems.push(`Unsupported method for ${config.version}: ${method}`);
    }
  }

  if (!evidence.themes.includes(config.theme)) {
    problems.push(`Unsupported theme for ${config.version}: ${config.theme}`);
  }

  if (!evidence.appearances.includes(config.appearance)) {
    problems.push(
      `Unsupported appearance for ${config.version}: ${config.appearance}`,
    );
  }

  if (!evidence.successBehaviors.includes(config.successBehavior)) {
    problems.push(
      `Unsupported successBehavior for ${config.version}: ${config.successBehavior}`,
    );
  }

  if (!evidence.localization && config.locale !== 'auto') {
    problems.push(`Locale is not published for Angular ${config.version}`);
  }

  return problems;
}

export function assertGeneratedCodeMatchesPublishedApi(
  version: PlaygroundVersion,
): string[] {
  const config = createDefaultPlaygroundConfig(version);
  const evidence = HISTORICAL_ANGULAR_API[version];
  const code = generatePlaygroundCode(config);
  const blob = `${code.install}\n${code.appConfig}\n${code.componentTs}\n${code.componentHtml}`;
  const problems: string[] = [];

  if (!blob.includes(evidence.providerFn)) {
    problems.push(`Missing provider export ${evidence.providerFn}`);
  }

  if (!blob.includes(evidence.componentClass)) {
    problems.push(`Missing component export ${evidence.componentClass}`);
  }

  if (!blob.includes(`<${evidence.componentSelector}`)) {
    problems.push(`Missing selector <${evidence.componentSelector}>`);
  }

  for (const output of FULL_CHECKOUT_SNIPPET_OUTPUTS) {
    if (!evidence.componentOutputs.includes(output)) {
      problems.push(`Evidence missing expected output ${output}`);
      continue;
    }
    if (!code.componentHtml.includes(`(${output})`)) {
      problems.push(`Missing verified output (${output})`);
    }
  }

  for (const input of [
    'product',
    'methods',
    'theme',
    'appearance',
    'maxWidth',
    'successBehavior',
  ]) {
    if (!evidence.componentInputs.includes(input)) {
      problems.push(`Evidence missing expected input ${input}`);
      continue;
    }
  }

  if (evidence.localization) {
    if (!code.componentHtml.includes('locale=')) {
      problems.push(`Expected locale input for ${version} generated HTML`);
    }
  } else if (code.componentHtml.includes('locale=')) {
    problems.push(`Locale must not appear in ${version} generated HTML`);
  }

  // Newer-only APIs must never leak into snippets for versions that lack them.
  const forbiddenMarkers = evidence.hasButtonsOnly
    ? (['baseUrl', 'visualStyle'] as const)
    : FORBIDDEN_SNIPPET_MARKERS;
  for (const marker of forbiddenMarkers) {
    if (blob.includes(marker)) {
      problems.push(`Generated code contains unpublished marker: ${marker}`);
    }
  }

  return problems;
}
