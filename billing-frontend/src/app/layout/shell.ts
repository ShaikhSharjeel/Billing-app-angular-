import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../core/auth';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <!-- mobile top bar -->
      <header class="topbar">
        <button class="btn sm" (click)="open.set(!open())" aria-label="Menu">☰</button>
        <span>Billing App</span>
      </header>

      @if (open()) {
        <div class="backdrop" (click)="open.set(false)"></div>
      }

      <aside class="side" [class.open]="open()">
        <div class="brand">Billing App</div>
        <nav (click)="open.set(false)">
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/invoices/new" routerLinkActive="active">New Invoice</a>
          <a routerLink="/invoices" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Invoices</a>
          <a routerLink="/customers" routerLinkActive="active">Customers</a>
          <a routerLink="/products" routerLinkActive="active">Products</a>
          <a routerLink="/reports" routerLinkActive="active">Reports</a>
          <a routerLink="/settings" routerLinkActive="active">Settings</a>
          @if (auth.isAdmin()) {
            <a routerLink="/users" routerLinkActive="active">Users</a>
          }
        </nav>
        <div class="who">
          <div>{{ auth.user()?.name }}</div>
          <small>{{ auth.user()?.role }}</small>
          <button class="btn" (click)="auth.logout()">Logout</button>
        </div>
      </aside>

      <main class="main"><router-outlet /></main>
    </div>
  `,
})
export class Shell {
  auth = inject(Auth);
  open = signal(false);
}