import { routes } from './app.routes';
import { getLatestPublishedAngularVersion } from './data/frameworks';

describe('app routes', () => {
  const paths = routes.map((route) => route.path);
  const latest = getLatestPublishedAngularVersion();

  it('defines the marketing routes', () => {
    expect(paths).toContain('');
    expect(paths).toContain('frameworks');
    expect(paths).toContain('docs');
    expect(paths).toContain('docs/angular');
    expect(paths).toContain('docs/angular/:version');
    expect(paths).toContain('docs/:framework/:version/:slug');
    expect(paths).toContain('security');
    expect(paths).toContain('playground');
    expect(paths).toContain('**');
  });

  it('lazy-loads page components and redirects docs entrypoints', () => {
    for (const route of routes) {
      if (route.redirectTo) {
        continue;
      }
      expect(typeof route.loadComponent).toBe('function');
    }

    expect(routes.find((route) => route.path === 'docs')?.redirectTo).toBe(
      `/docs/angular/${latest}/getting-started`,
    );
    expect(
      routes.find((route) => route.path === 'docs/angular')?.redirectTo,
    ).toBe(`/docs/angular/${latest}/getting-started`);
    expect(
      routes.find((route) => route.path === 'docs/angular/:version')
        ?.redirectTo,
    ).toBe('/docs/angular/:version/getting-started');
  });

  it('uses lowercase easy payments branding in document titles', () => {
    expect(routes.find((route) => route.path === '')?.title).toBe(
      'easy payments | Payments Made Simple',
    );
    expect(routes.find((route) => route.path === 'frameworks')?.title).toBe(
      'Frameworks | easy payments',
    );
    expect(
      routes.find((route) => route.path === 'docs/:framework/:version/:slug')
        ?.title,
    ).toBe('Documentation | easy payments');
  });
});
