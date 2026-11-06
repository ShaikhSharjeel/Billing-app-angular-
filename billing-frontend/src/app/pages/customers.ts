import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api';
import { Auth } from '../core/auth';
import { Pager } from '../core/pager';
import { STATES } from '../core/states';

@Component({
  selector: 'app-customers',
  imports: [FormsModule, Pager],
  template: `
    <div class="page-head">
      <h1>Customers</h1>
      <button class="btn primary" (click)="add()">+ New customer</button>
    </div>

    @if (showForm()) {
      <form class="card form-grid" (ngSubmit)="save()">
        <h3>{{ editId ? 'Edit' : 'New' }} customer</h3>
        <label>Name<input name="name" [(ngModel)]="f.name" required /></label>
        <label>Phone<input name="phone" [(ngModel)]="f.phone" /></label>
        <label>Email<input name="email" [(ngModel)]="f.email" /></label>
        <label>GSTIN<input name="gstin" [(ngModel)]="f.gstin" maxlength="15" /></label>
        <label>State
          <select name="stateCode" [(ngModel)]="f.stateCode" required>
            @for (s of states; track s.code) { <option [ngValue]="s.code">{{ s.code }} - {{ s.name }}</option> }
          </select>
        </label>
        <label class="wide">Address<input name="address" [(ngModel)]="f.address" /></label>
        @if (error()) { <p class="err wide">{{ error() }}</p> }
        <div class="actions wide">
          <button class="btn primary">Save</button>
          <button type="button" class="btn" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    }

    <div class="toolbar">
      <input placeholder="Search name / phone" [(ngModel)]="q" (keyup.enter)="load(1)" />
      <button class="btn" (click)="load(1)">Search</button>
    </div>

    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>GSTIN</th><th>State</th><th></th></tr></thead>
        <tbody>
          @for (c of rows(); track c.CustomerId) {
            <tr>
              <td>{{ c.Name }}</td><td>{{ c.Phone }}</td><td>{{ c.Gstin }}</td><td>{{ c.StateCode }}</td>
              <td class="r">
                <button class="btn sm" (click)="edit(c)">Edit</button>
                @if (auth.isAdmin()) { <button class="btn sm danger" (click)="remove(c)">Delete</button> }
              </td>
            </tr>
          } @empty { <tr><td colspan="5" class="muted">Koi customer nahi mila.</td></tr> }
        </tbody>
      </table>
      <app-pager [page]="page()" [total]="total()" (go)="load($event)" />
    </div>
  `,
})
export class Customers implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  states = STATES;
  rows = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  showForm = signal(false);
  error = signal('');
  q = '';
  f: any = {};
  editId: number | null = null;

  ngOnInit() { this.load(1); }

  load(page: number) {
    this.api.get<any>('/customers', { q: this.q, page, pageSize: 15 }).subscribe((r) => {
      this.rows.set(r.data); this.total.set(r.total); this.page.set(page);
    });
  }

  add() {
    this.editId = null;
    this.f = { name: '', phone: '', email: '', gstin: '', address: '', stateCode: '27' };
    this.error.set(''); this.showForm.set(true);
  }

  edit(c: any) {
    this.editId = c.CustomerId;
    this.f = { name: c.Name, phone: c.Phone, email: c.Email, gstin: c.Gstin, address: c.Address, stateCode: c.StateCode };
    this.error.set(''); this.showForm.set(true);
  }

  save() {
    const req = this.editId ? this.api.put(`/customers/${this.editId}`, this.f) : this.api.post('/customers', this.f);
    req.subscribe({
      next: () => { this.showForm.set(false); this.load(this.page()); },
      error: (e) => this.error.set(errMsg(e)),
    });
  }

  remove(c: any) {
    if (!confirm(`"${c.Name}" ko delete karna hai?`)) return;
    this.api.delete(`/customers/${c.CustomerId}`).subscribe({
      next: () => this.load(this.page()),
      error: (e) => alert(errMsg(e)),
    });
  }
}
