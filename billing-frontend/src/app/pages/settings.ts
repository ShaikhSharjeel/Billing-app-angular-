import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api';
import { Auth } from '../core/auth';
import { STATES } from '../core/states';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  template: `
    <div class="page-head"><h1>Business settings</h1></div>
    @if (loaded()) {
      <form class="card form-grid" (ngSubmit)="save()">
        <label>Business name<input name="businessName" [(ngModel)]="f.businessName" required [disabled]="!auth.isAdmin()" /></label>
        <label>Phone<input name="phone" [(ngModel)]="f.phone" [disabled]="!auth.isAdmin()" /></label>
        <label>Email<input name="email" [(ngModel)]="f.email" [disabled]="!auth.isAdmin()" /></label>
        <label>GSTIN<input name="gstin" [(ngModel)]="f.gstin" maxlength="15" [disabled]="!auth.isAdmin()" /></label>
        <label>State
          <select name="stateCode" [(ngModel)]="f.stateCode" [disabled]="!auth.isAdmin()">
            @for (s of states; track s.code) { <option [ngValue]="s.code">{{ s.code }} - {{ s.name }}</option> }
          </select>
        </label>
        <label>Invoice prefix<input name="invoicePrefix" [(ngModel)]="f.invoicePrefix" maxlength="10" required [disabled]="!auth.isAdmin()" /></label>
        <label class="wide">Address<input name="address" [(ngModel)]="f.address" [disabled]="!auth.isAdmin()" /></label>
        @if (error()) { <p class="err wide">{{ error() }}</p> }
        @if (saved()) { <p class="ok wide">Save ho gaya.</p> }
        @if (auth.isAdmin()) {
          <div class="actions wide"><button class="btn primary">Save</button></div>
        } @else {
          <p class="muted wide">Sirf Admin badal sakta hai.</p>
        }
      </form>
    }
  `,
})
export class Settings implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  states = STATES;
  f: any = {};
  loaded = signal(false);
  saved = signal(false);
  error = signal('');

  ngOnInit() {
    this.api.get<any>('/settings').subscribe((r) => {
      this.f = {
        businessName: r.BusinessName, phone: r.Phone, email: r.Email, gstin: r.Gstin,
        stateCode: r.StateCode, invoicePrefix: r.InvoicePrefix, address: r.Address,
      };
      this.loaded.set(true);
    });
  }

  save() {
    this.error.set(''); this.saved.set(false);
    this.api.put('/settings', this.f).subscribe({
      next: () => this.saved.set(true),
      error: (e) => this.error.set(errMsg(e)),
    });
  }
}
