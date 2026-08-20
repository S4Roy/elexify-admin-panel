import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideNativeDateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { provideToastr } from 'ngx-toastr';
import { httpInterceptor } from './core/services/http.interceptor';
import { NgxSpinnerModule } from 'ngx-spinner';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([httpInterceptor])),
    provideToastr({
      preventDuplicates: true,
      closeButton: true,
      progressBar: true,
    }),

    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'en-IN' },
    NgxSpinnerModule,
  ],
};
