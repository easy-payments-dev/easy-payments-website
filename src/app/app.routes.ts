import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.page').then((m) => m.HomePage),
    title: 'easy payments | Payments Made Simple',
  },
  {
    path: 'frameworks',
    loadComponent: () =>
      import('./features/frameworks/frameworks.page').then((m) => m.FrameworksPage),
    title: 'Frameworks | easy payments',
  },
  {
    path: 'docs/angular',
    loadComponent: () =>
      import('./features/docs/docs-angular.page').then((m) => m.DocsAngularPage),
    title: 'Documentation | easy payments',
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./features/security/security.page').then((m) => m.SecurityPage),
    title: 'Security | easy payments',
  },
  {
    path: 'playground',
    loadComponent: () =>
      import('./features/playground/playground.page').then((m) => m.PlaygroundPage),
    title: 'Playground | easy payments',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Not Found | easy payments',
  },
];
