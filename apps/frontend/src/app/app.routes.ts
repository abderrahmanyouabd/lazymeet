import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'products',
    pathMatch: 'full',
  },
  {
    path: 'products',
    pathMatch: 'full',
    redirectTo: 'products',
  },
  {
    path: '**',
    redirectTo: 'products',
  },
];
