import { Routes } from '@angular/router';
import { getLatestPublishedAngularVersion } from './data/frameworks';

const latestAngularVersion = getLatestPublishedAngularVersion();
const latestAngularDocs = `/docs/angular/${latestAngularVersion}/getting-started`;

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
    path: 'docs',
    pathMatch: 'full',
    redirectTo: latestAngularDocs,
  },
  {
    path: 'docs/angular',
    pathMatch: 'full',
    redirectTo: latestAngularDocs,
  },
  {
    path: 'docs/angular/:version',
    pathMatch: 'full',
    redirectTo: '/docs/angular/:version/getting-started',
  },
  {
    path: 'docs/:framework/:version/:slug',
    loadComponent: () =>
      import('./features/docs/docs-viewer.page').then((m) => m.DocsViewerPage),
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
    title: 'Playground | Angular checkout simulation | easy payments',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Not Found | easy payments',
  },
];
