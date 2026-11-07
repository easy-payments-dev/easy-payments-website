import { routes } from './app.routes';

describe('app routes', () => {
  const paths = routes.map((route) => route.path);

  it('defines the W1 marketing routes', () => {
    expect(paths).toContain('');
    expect(paths).toContain('frameworks');
    expect(paths).toContain('docs/angular');
    expect(paths).toContain('security');
    expect(paths).toContain('playground');
    expect(paths).toContain('**');
  });

  it('lazy-loads every route component', () => {
    for (const route of routes) {
      expect(typeof route.loadComponent).toBe('function');
    }
  });

  it('uses lowercase easy payments branding in document titles', () => {
    expect(routes.find((route) => route.path === '')?.title).toBe(
      'easy payments | Payments Made Simple',
    );
    expect(routes.find((route) => route.path === 'frameworks')?.title).toBe(
      'Frameworks | easy payments',
    );
    expect(routes.find((route) => route.path === 'docs/angular')?.title).toBe(
      'Documentation | easy payments',
    );
  });
});
