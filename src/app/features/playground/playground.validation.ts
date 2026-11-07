import {
  PlaygroundConfig,
  PlaygroundValidationIssue,
} from './playground.types';

const NAME_MAX = 80;
const DESCRIPTION_MAX = 160;

export function validatePlaygroundConfig(
  config: PlaygroundConfig,
): PlaygroundValidationIssue[] {
  const issues: PlaygroundValidationIssue[] = [];
  const name = config.product.name.trim();
  const description = config.product.description.trim();

  if (!name) {
    issues.push({ field: 'product.name', message: 'Product name is required.' });
  } else if (name.length > NAME_MAX) {
    issues.push({
      field: 'product.name',
      message: `Product name must be ${NAME_MAX} characters or fewer.`,
    });
  }

  if (description.length > DESCRIPTION_MAX) {
    issues.push({
      field: 'product.description',
      message: `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
    });
  }

  if (!Number.isFinite(config.product.amount) || config.product.amount <= 0) {
    issues.push({
      field: 'product.amount',
      message: 'Price must be a number greater than 0.',
    });
  } else if (config.product.amount > 1_000_000) {
    issues.push({
      field: 'product.amount',
      message: 'Price must be 1,000,000 or less.',
    });
  }

  if (!/^[A-Z]{3}$/.test(config.product.currency)) {
    issues.push({
      field: 'product.currency',
      message: 'Currency must be a 3-letter ISO code.',
    });
  }

  if (
    !Number.isInteger(config.product.quantity) ||
    config.product.quantity < 1 ||
    config.product.quantity > 99
  ) {
    issues.push({
      field: 'product.quantity',
      message: 'Quantity must be an integer from 1 to 99.',
    });
  }

  if (config.methods.length === 0) {
    issues.push({
      field: 'methods',
      message: 'Select at least one payment method.',
    });
  }

  if (config.maxWidth < 320 || config.maxWidth > 1200) {
    issues.push({
      field: 'maxWidth',
      message: 'Max width must be between 320 and 1200.',
    });
  }

  return issues;
}
