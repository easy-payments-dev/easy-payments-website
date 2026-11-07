import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.page').then((m) => m.HomePage),
    title: 'Easy Payments',
  },
  {
    path: 'frameworks',
    loadComponent: () =>
      import('./features/frameworks/frameworks.page').then((m) => m.FrameworksPage),
    title: 'Frameworks · Easy Payments',
  },
  {
    path: 'docs/angular',
    loadComponent: () =>
      import('./features/docs/docs-angular.page').then((m) => m.DocsAngularPage),
    title: 'Angular Docs · Easy Payments',
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./features/security/security.page').then((m) => m.SecurityPage),
    title: 'Security · Easy Payments',
  },
  {
    path: 'playground',
    loadComponent: () =>
      import('./features/playground/playground.page').then((m) => m.PlaygroundPage),
    title: 'Playground · Easy Payments',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Not Found · Easy Payments',
  },
];
