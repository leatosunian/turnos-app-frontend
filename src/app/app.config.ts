import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEsAr from '@angular/common/locales/es-AR';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { tokenInterceptor } from './core/interceptors/token-interceptor';
import { AuthService } from './core/services/auth-service';

registerLocaleData(localeEsAr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // anchorScrolling hace que los links con fragment (/#como, /#rubros) bajen hasta la
    // seccion de la landing. Sin esto la URL cambia pero la pagina se queda donde estaba.
    // scrollPositionRestoration en enabled sube la pagina arriba de todo cada vez que se navega
    // a otra ruta, y con atras o adelante del navegador vuelve a la altura donde estaba. Sin
    // esto, si bajabas en el home y entrabas a otra pagina, la nueva aparecia scrolleada a la
    // misma altura. Las navegaciones que solo cambian un query param dentro de la misma
    // pantalla (la semana de la agenda, el modo de ingresar) pasan scroll manual para no saltar.
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-AR' },
    // Al recargar, recupera el usuario antes de que corran los guards.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).restaurarSesion())),
  ],
};
