import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { Pager } from '../core/pager';

@Component({
  selector: 'app-invoices',
  imports: [FormsModule, RouterLink, Pager, DecimalPipe, DatePipe],
  template: `
    <div class="page-head">
      <h1>Invoices</h1>
      <a class="btn primary" routerLink="/invoices/new">+ New Invoice</a>
    </div>

    <div class="toolbar">
      <input placeholder="Invoice no / customer" [(ngModel)]="q" (keyup.enter)="load(1)" />
      <select [(ngModel)]="status" (ngModelChange)="load(1)">
        <option value="">All status</option>
        <option>Unpaid</option><option>PartiallyPaid</option><option>Paid</option><option>Cancelled</option>
      </select>
      <input type="date" [(ngModel)]="from" /> <input type="date" [(ngModel)]="to" />
      <button class="btn" (click)="load(1)">Filter</button>
    </div>

    <div class="card">
      <table>
        <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="r">Total</th><th class="r">Paid</th><th>Status</th></tr></thead>
        <tbody>
          @for (i of rows(); track i.InvoiceId) {
            <tr>
              <td><a [routerLink]="['/invoices', i.InvoiceId]">{{ i.InvoiceNo }}</a></td>
              <td>{{ i.InvoiceDate | date: 'dd MMM yyyy' }}</td>
              <td>{{ i.CustomerName }}</td>
              <td class="r">₹ {{ i.GrandTotal | number: '1.2-2' }}</td>
              <td class="r">₹ {{ i.PaidAmount | number: '1.2-2' }}</td>
              <td><span class="tag" [class]="'tag ' + i.Status">{{ i.Status }}</span></td>
            </tr>
          } @empty { <tr><td colspan="6" class="muted">Koi invoice nahi mila.</td></tr> }
        </tbody>
      </table>
      <app-pager [page]="page()" [total]="total()" [size]="15" (go)="load($event)" />
    </div>
  `,
})
export class Invoices implements OnInit {
  private api = inject(Api);
  rows = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  q = ''; status = ''; from = ''; to = '';

  ngOnInit() { this.load(1); }

  load(page: number) {
    this.api
      .get<any>('/invoices', { q: this.q, status: this.status, from: this.from, to: this.to, page, pageSize: 15 })
      .subscribe((r) => { this.rows.set(r.data); this.total.set(r.total); this.page.set(page); });
  }
}
