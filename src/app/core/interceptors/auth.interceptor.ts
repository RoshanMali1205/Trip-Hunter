import {
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { getAppConfig } from '../config/app-config';

/** Attach Bearer token to Trip Hunter API requests. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.session()?.accessToken;
  const apiBase = getAppConfig().apiBaseUrl;

  if (!token || !shouldAttach(req, apiBase)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};

function shouldAttach(req: HttpRequest<unknown>, apiBase: string): boolean {
  if (req.url.startsWith('/api/') || req.url.includes('/api/v1/')) {
    return true;
  }
  if (apiBase.startsWith('http') && req.url.startsWith(apiBase)) {
    return true;
  }
  return false;
}
