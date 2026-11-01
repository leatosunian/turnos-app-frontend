import { Routes } from '@angular/router';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { PrivateLayout } from './layouts/private-layout/private-layout';
import { HomePage } from './pages/public/home-page/home-page';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [{ path: '', component: HomePage }],
  },
  {
    path: 'panel',
    component: PrivateLayout,
    children: [],
  },
  { path: '**', redirectTo: '' },
];