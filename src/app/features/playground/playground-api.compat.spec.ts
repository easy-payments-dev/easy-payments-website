import {
  assertGeneratedCodeMatchesPublishedApi,
  assertPlaygroundConfigMatchesPublishedApi,
} from './playground-api.compat';
import { createDefaultPlaygroundConfig } from './playground.defaults';

describe('playground historical API compatibility', () => {
  it('accepts default configs for published versions', () => {
    expect(
      assertPlaygroundConfigMatchesPublishedApi(
        createDefaultPlaygroundConfig('1.0.0'),
      ),
    ).toEqual([]);
    expect(
      assertPlaygroundConfigMatchesPublishedApi(
        createDefaultPlaygroundConfig('1.1.0'),
      ),
    ).toEqual([]);
  });

  it('flags locale on 1.0.0 configs', () => {
    const config = createDefaultPlaygroundConfig('1.0.0');
    config.locale = 'es';
    expect(assertPlaygroundConfigMatchesPublishedApi(config)).toContain(
      'Locale is not published for Angular 1.0.0',
    );
  });

  it('validates generated snippets against W4.1 evidence for both versions', () => {
    expect(assertGeneratedCodeMatchesPublishedApi('1.0.0')).toEqual([]);
    expect(assertGeneratedCodeMatchesPublishedApi('1.1.0')).toEqual([]);
  });
});
