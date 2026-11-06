import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api';
import { Auth } from '../core/auth';

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <h1>Users</h1>
      <button class="btn primary" (click)="openForm()">+ New user</button>
    </div>

    @if (showForm()) {
      <form class="card form-grid" (ngSubmit)="save()">
        <h3>New user</h3>
        <label>Full name<input name="fullName" [(ngModel)]="f.fullName" required /></label>
        <label>Email<input name="email" type="email" [(ngModel)]="f.email" required /></label>
        <label>Password (min 8)<input name="password" type="password" minlength="8" [(ngModel)]="f.password" required /></label>
        <label>Role
          <select name="role" [(ngModel)]="f.role"><option>Staff</option><option>Admin</option></select>
        </label>
        @if (error()) { <p class="err wide">{{ error() }}</p> }
        <div class="actions wide">
          <button class="btn primary">Create</button>
          <button type="button" class="btn" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    }

    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (u of rows(); track u.UserId) {
            <tr>
              <td>{{ u.FullName }}</td><td>{{ u.Email }}</td><td>{{ u.Role }}</td>
              <td><span [class]="'tag ' + (u.IsActive ? 'Paid' : 'Cancelled')">{{ u.IsActive ? 'Active' : 'Disabled' }}</span></td>
              <td class="r">
                @if (u.UserId !== auth.user()?.userId) {
                  <button class="btn sm" (click)="toggle(u)">{{ u.IsActive ? 'Disable' : 'Enable' }}</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Users implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  rows = signal<any[]>([]);
  showForm = signal(false);
  error = signal('');
  f: any = {};

  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/users').subscribe((r) => this.rows.set(r)); }

  openForm() {
    this.f = { fullName: '', email: '', password: '', role: 'Staff' };
    this.error.set(''); this.showForm.set(true);
  }

  save() {
    this.api.post('/users', this.f).subscribe({
      next: () => { this.showForm.set(false); this.load(); },
      error: (e) => this.error.set(errMsg(e)),
    });
  }

  toggle(u: any) {
    this.api.patch(`/users/${u.UserId}`, { isActive: !u.IsActive }).subscribe({
      next: () => this.load(),
      error: (e) => alert(errMsg(e)),
    });
  }
}
