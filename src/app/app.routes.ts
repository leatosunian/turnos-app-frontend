import { Routes } from '@angular/router';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { PrivateLayout } from './layouts/private-layout/private-layout';
import { HomePage } from './pages/public/home-page/home-page';
import { invitadoGuard } from './core/guards/invitado-guard';
import { rolGuard } from './core/guards/rol-guard';

// catálogo interno para el equipo: existe con ng serve, no en el build de producción
const soloDesarrollo: Routes = ngDevMode
  ? [
      {
        path: 'componentes',
        loadComponent: () =>
          import('./pages/dev/componentes-page/componentes-page').then((m) => m.ComponentesPage),
      },
    ]
  : [];

// Las pantallas del panel que son solo del dueño. El layout deja pasar a OWNER y EMPLOYEE, pero
// un empleado solo tiene Mis turnos y Mi actividad: si escribe a mano por ejemplo /panel/turnos,
// el guard lo manda a su ruta inicial (/panel/actividad) en vez de mostrarle la pantalla con el
// error 403
const soloDueno = [rolGuard(['OWNER'])];

// panel y admin van antes que el layout público porque ':slug' matchea cualquier ruta
export const routes: Routes = [
  {
    path: 'panel',
    component: PrivateLayout,
    canActivate: [rolGuard(['OWNER', 'EMPLOYEE'])],
    children: [
      {
        path: '',
        canActivate: soloDueno,
        loadComponent: () => import('./pages/panel/hoy-page/hoy-page').then((m) => m.HoyPage),
      },
      {
        path: 'agenda',
        canActivate: soloDueno,
        loadComponent: () =>
          import('./pages/panel/agenda-page/agenda-page').then((m) => m.AgendaPage),
      },
      {
        path: 'turnos',
        canActivate: soloDueno,
        loadComponent: () =>
          import('./pages/panel/turnos-page/turnos-page').then((m) => m.TurnosPage),
      },
      {
        path: 'horarios',
        canActivate: soloDueno,
        loadComponent: () =>
          import('./pages/panel/horarios-page/horarios-page').then((m) => m.HorariosPage),
      },
      {
        path: 'servicios',
        canActivate: soloDueno,
        loadComponent: () =>
          import('./pages/panel/servicios-page/servicios-page').then((m) => m.ServiciosPage),
      },
      {
        path: 'estadisticas',
        canActivate: soloDueno,
        loadComponent: () =>
          import('./pages/panel/estadisticas-page/estadisticas-page').then(
            (m) => m.EstadisticasPage,
          ),
      },
      {
        path: 'negocio',
        canActivate: soloDueno,
        loadComponent: () =>
          import('./pages/panel/mi-negocio-page/mi-negocio-page').then((m) => m.MiNegocioPage),
      },
      {
        path: 'mis-turnos',
        canActivate: [rolGuard(['EMPLOYEE'])],
        loadComponent: () =>
          import('./pages/panel/turnos-empleado-page/turnos-empleado-page').then(
            (m) => m.TurnosEmpleadoPage,
          ),
      },
      {
        path: 'actividad',
        canActivate: [rolGuard(['EMPLOYEE'])],
        loadComponent: () =>
          import('./pages/panel/actividad-page/actividad-page').then((m) => m.ActividadPage),
      },
    ],
  },
  {
    path: 'admin',
    component: PrivateLayout,
    canActivate: [rolGuard(['ADMIN'])],
    data: { admin: true },
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
        canActivate: [invitadoGuard],
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
        canActivate: [rolGuard(['CLIENT'])],
        loadComponent: () =>
          import('./pages/public/mis-turnos-page/mis-turnos-page').then((m) => m.MisTurnosPage),
      },
      ...soloDesarrollo,
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
