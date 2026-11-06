import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errMsg } from '../core/api';
import { Auth } from '../core/auth';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-wrap">
      <form class="card login" (ngSubmit)="submit()">
        <img src="logo.png" alt="Billing App" class="mx-auto h-16 w-16" />
        <h2 class="text-center text-xl font-semibold">Sign up</h2>
        <label>Full name<input name="fullName" [(ngModel)]="fullName" required /></label>
        <label>Email<input name="email" type="email" [(ngModel)]="email" required /></label>
        <label>Password (min 8 characters)
          <input name="password" type="password" minlength="8" [(ngModel)]="password" required />
        </label>
        <label>Confirm password<input name="confirm" type="password" [(ngModel)]="confirm" required /></label>
        @if (error()) { <p class="err">{{ error() }}</p> }
        <button class="btn primary" [disabled]="busy()">{{ busy() ? 'Wait...' : 'Create account' }}</button>
        <p class="muted">Pehle se account hai? <a routerLink="/login">Login</a></p>
      </form>
    </div>
  `,
})
export class Signup {
  private auth = inject(Auth);
  private router = inject(Router);
  fullName = '';
  email = '';
  password = '';
  confirm = '';
  error = signal('');
  busy = signal(false);

  submit() {
    if (this.password.length < 8) return this.error.set('Password kam se kam 8 characters ka rakho');
    if (this.password !== this.confirm) return this.error.set('Dono password match nahi kar rahe');

    this.busy.set(true);
    this.error.set('');
    this.auth.register(this.fullName, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error.set(errMsg(e)); this.busy.set(false); },
    });
  }
}