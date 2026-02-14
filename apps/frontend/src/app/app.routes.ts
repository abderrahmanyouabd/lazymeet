import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'products',
    pathMatch: 'full',
  },
  {
    path: 'products',
    loadComponent: () => import('./app').then((m) => m.App),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./app').then((m) => m.App),
  },
  {
    path: '**',
    redirectTo: 'products',
  },
];
