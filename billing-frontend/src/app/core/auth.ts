import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { Api } from './api';

export interface User { userId: number; role: 'Admin' | 'Staff'; name: string; }

function readUser(): User | null {
  try { return JSON.parse(localStorage.getItem('user') ?? 'null'); } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api);
  private router = inject(Router);

  user = signal<User | null>(readUser());
  isAdmin = computed(() => this.user()?.role === 'Admin');

  loggedIn(): boolean { return !!localStorage.getItem('token'); }

  private store = (r: { token: string; user: User }) => {
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    this.user.set(r.user);
  };

  login(email: string, password: string) {
    return this.api.post<{ token: string; user: User }>('/auth/login', { email, password }).pipe(tap(this.store));
  }

  register(fullName: string, email: string, password: string) {
    return this.api
      .post<{ token: string; user: User }>('/auth/register', { fullName, email, password })
      .pipe(tap(this.store));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}