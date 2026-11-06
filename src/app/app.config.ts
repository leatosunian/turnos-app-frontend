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
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { tokenInterceptor } from './core/interceptors/token-interceptor';
import { AuthService } from './core/services/auth-service';

registerLocaleData(localeEsAr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-AR' },
    // Al recargar, recupera el usuario antes de que corran los guards.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).restaurarSesion())),
  ],
};