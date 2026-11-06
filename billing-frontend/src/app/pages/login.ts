import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errMsg } from '../core/api';
import { Auth } from '../core/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-wrap">
      <form class="card login" (ngSubmit)="submit()">
        <img src="logo.png" alt="Billing App" class="mx-auto h-16 w-16" />
        <h2 class="text-center text-xl font-semibold">Billing App</h2>
        <label>Email<input name="email" type="email" [(ngModel)]="email" required /></label>
        <label>Password<input name="password" type="password" [(ngModel)]="password" required /></label>
        @if (error()) { <p class="err">{{ error() }}</p> }
        <button class="btn primary" [disabled]="busy()">{{ busy() ? 'Wait...' : 'Login' }}</button>
        <p class="muted">Account nahi hai? <a routerLink="/signup">Sign up</a></p>
      </form>
    </div>
  `,
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);
  email = '';
  password = '';
  error = signal('');
  busy = signal(false);

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error.set(errMsg(e)); this.busy.set(false); },
    });
  }
}