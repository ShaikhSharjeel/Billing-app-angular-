import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  return auth.loggedIn() ? true : inject(Router).parseUrl('/login');
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  return auth.isAdmin() ? true : inject(Router).parseUrl('/dashboard');
};
