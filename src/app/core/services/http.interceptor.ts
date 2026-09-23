import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, finalize, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr'; // Import ToastrService
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { NgxSpinnerService } from 'ngx-spinner';

// Every shape this backend's error responses can take carries the real,
// human-readable message as a string somewhere — either the top-level
// `message` (StatusError-thrown errors, see handleErrors.js), a celebrate
// validation message, or a `title`/`error` string on older endpoints. None
// of them is ever the raw `error` object itself (e.g. { statusCode,
// errorData }), so this never hands toastr anything but a string —
// avoiding a literal "[object Object]" toast.
function extractErrorMessage(error: any, fallback: string): string {
  const body = error?.error;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (typeof body?.validation?.body?.message === 'string') {
    return body.validation.body.message;
  }
  if (typeof body?.message === 'string' && body.message.trim()) {
    return body.message;
  }
  if (typeof body?.error === 'string' && body.error.trim()) {
    return body.error;
  }
  if (typeof body?.title === 'string' && body.title.trim()) {
    return body.title;
  }

  return fallback;
}

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastr = inject(ToastrService);
  const spinner = inject(NgxSpinnerService);
  const authReq = req.clone({
    setHeaders: {
      'x-api-key': environment.X_API_KEY,
      Authorization: `Bearer ${authService.getUserToken()}`,
    },
  });
  spinner.show();
  return next(authReq).pipe(
    catchError((error) => {
      // A blob-response request (e.g. invoice PDF download) gets its error
      // body back as a Blob too, not parsed JSON — every branch below
      // would only ever show a generic "Something went wrong." The caller
      // already reads the Blob itself and shows a specific toast, so skip
      // the generic one here to avoid a stacked double-toast.
      if (req.responseType === 'blob') {
        return throwError(() => error);
      }
      if (error?.status === 401) {
        toastr.error(extractErrorMessage(error, 'Unauthorized'));
        authService.userLogout();
      } else if (error?.status === 403) {
        toastr.error(extractErrorMessage(error, 'Forbidden'));
        authService.userLogout();
      } else if (error?.status === 409) {
        toastr.error(extractErrorMessage(error, 'Conflict Error'));
      } else if (error?.status === 415) {
        toastr.error(extractErrorMessage(error, 'Validation Error'));
      } else if (error?.status === 404) {
        toastr.error(extractErrorMessage(error, '404 Not Found'));
      } else if (error?.status === 400) {
        toastr.error(extractErrorMessage(error, 'Validation failed'));
      } else {
        toastr.error(extractErrorMessage(error, 'Something went wrong.'));
      }
      return throwError(() => error);
    }),
    finalize(() => {
      spinner.hide();
    })
  );
};
