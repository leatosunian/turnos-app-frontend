import { Routes } from '@angular/router';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { PrivateLayout } from './layouts/private-layout/private-layout';
import { HomePage } from './pages/public/home-page/home-page';

// panel y admin van antes que el layout público porque ':slug' matchea cualquier ruta
export const routes: Routes = [
  {
    path: 'panel',
    component: PrivateLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/panel/hoy-page/hoy-page').then((m) => m.HoyPage),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./pages/panel/agenda-page/agenda-page').then((m) => m.AgendaPage),
      },
      {
        path: 'turnos',
        loadComponent: () =>
          import('./pages/panel/turnos-page/turnos-page').then((m) => m.TurnosPage),
      },
      {
        path: 'horarios',
        loadComponent: () =>
          import('./pages/panel/horarios-page/horarios-page').then((m) => m.HorariosPage),
      },
      {
        path: 'servicios',
        loadComponent: () =>
          import('./pages/panel/servicios-page/servicios-page').then((m) => m.ServiciosPage),
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./pages/panel/estadisticas-page/estadisticas-page').then(
            (m) => m.EstadisticasPage,
          ),
      },
      {
        path: 'negocio',
        loadComponent: () =>
          import('./pages/panel/mi-negocio-page/mi-negocio-page').then((m) => m.MiNegocioPage),
      },
      {
        path: 'actividad',
        loadComponent: () =>
          import('./pages/panel/actividad-page/actividad-page').then((m) => m.ActividadPage),
      },
    ],
  },
  {
    path: 'admin',
    component: PrivateLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin/admin-page/admin-page').then((m) => m.AdminPage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/admin/admin-usuarios-page/admin-usuarios-page').then(
            (m) => m.AdminUsuariosPage,
          ),
      },
      {
        path: 'negocios',
        loadComponent: () =>
          import('./pages/admin/admin-negocios-page/admin-negocios-page').then(
            (m) => m.AdminNegociosPage,
          ),
      },
      {
        path: 'rubros',
        loadComponent: () =>
          import('./pages/admin/admin-rubros-page/admin-rubros-page').then(
            (m) => m.AdminRubrosPage,
          ),
      },
    ],
  },
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '', component: HomePage },
      {
        path: 'ingresar',
        loadComponent: () =>
          import('./pages/public/ingresar-page/ingresar-page').then((m) => m.IngresarPage),
      },
      {
        path: 'reserva/:id',
        loadComponent: () =>
          import('./pages/public/reserva-page/reserva-page').then((m) => m.ReservaPage),
      },
      {
        path: 'mis-turnos',
        loadComponent: () =>
          import('./pages/public/mis-turnos-page/mis-turnos-page').then((m) => m.MisTurnosPage),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./pages/public/negocio-page/negocio-page').then((m) => m.NegocioPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/public/no-encontrado-page/no-encontrado-page').then(
            (m) => m.NoEncontradoPage,
          ),
      },
    ],
  },
];
