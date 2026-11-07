import { createDefaultPlaygroundConfig } from './playground.defaults';
import { validatePlaygroundConfig } from './playground.validation';

describe('validatePlaygroundConfig', () => {
  it('accepts defaults', () => {
    expect(validatePlaygroundConfig(createDefaultPlaygroundConfig())).toEqual([]);
  });

  it('requires product name, methods, and valid amount', () => {
    const config = createDefaultPlaygroundConfig();
    config.product.name = '   ';
    config.product.amount = 0;
    config.methods = [];
    const issues = validatePlaygroundConfig(config);
    expect(issues.map((issue) => issue.field).sort()).toEqual([
      'methods',
      'product.amount',
      'product.name',
    ]);
  });
});
