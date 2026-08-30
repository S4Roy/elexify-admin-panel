import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

/**
 * Real DI wiring every standalone component test needs, mirroring app.config.ts:
 * HttpClient (backed by HttpTestingController, so no test ever hits the network),
 * Toastr's TOAST_CONFIG token, and animations (noop, since jsdom/Karma doesn't
 * need real animation timing). Safe to include unconditionally.
 */
export function sharedTestProviders(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideToastr(),
    provideNoopAnimations(),
  ];
}

/**
 * Minimal ActivatedRoute stub for components that read route params/query params/data.
 * Pass overrides for the specific params a given component under test reads.
 */
export function activatedRouteStub(overrides?: {
  paramMap?: Record<string, string>;
  queryParamMap?: Record<string, string>;
  data?: Record<string, unknown>;
}): Provider {
  const params = overrides?.paramMap ?? {};
  const queryParams = overrides?.queryParamMap ?? {};
  const paramMap = convertToParamMap(params);
  const queryParamMap = convertToParamMap(queryParams);
  const data = overrides?.data ?? {};
  const snapshot = { paramMap, queryParamMap, data, params, queryParams };
  return {
    provide: ActivatedRoute,
    useValue: {
      snapshot,
      paramMap: of(paramMap as ParamMap),
      queryParamMap: of(queryParamMap as ParamMap),
      data: of(data),
      params: of(params),
      queryParams: of(queryParams),
    },
  };
}

/** Spy MatDialogRef for components that are opened as a Material dialog. */
export function matDialogRefStub(): Provider {
  return {
    provide: MatDialogRef,
    useValue: jasmine.createSpyObj('MatDialogRef', ['close', 'afterClosed', 'afterOpened']),
  };
}

/** MAT_DIALOG_DATA provider for components that read injected dialog data. */
export function matDialogDataProvider(data: unknown = {}): Provider {
  return { provide: MAT_DIALOG_DATA, useValue: data };
}
