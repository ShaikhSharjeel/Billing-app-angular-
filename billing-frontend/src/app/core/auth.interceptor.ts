import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    tap({
      error: (e) => {
        if (e?.status === 401 && !req.url.endsWith('/auth/login')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.navigate(['/login']);
        }
      },
    }),
  );
};
