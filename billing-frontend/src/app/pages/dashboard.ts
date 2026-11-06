import { DecimalPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="page-head">
      <h1>Dashboard</h1>
      <a class="btn primary" routerLink="/invoices/new">+ New Invoice</a>
    </div>

    @if (sum(); as x) {
      <div class="cards">
        <div class="stat"><span>Today's sales</span><b>₹ {{ x.todaySales | number: '1.2-2' }}</b></div>
        <div class="stat"><span>This month</span><b>₹ {{ x.monthSales | number: '1.2-2' }}</b></div>
        <div class="stat"><span>Outstanding</span><b>₹ {{ x.outstanding | number: '1.2-2' }}</b></div>
        <div class="stat"><span>Invoices</span><b>{{ x.invoiceCount }}</b></div>
        <div class="stat"><span>Customers</span><b>{{ x.customerCount }}</b></div>
        <div class="stat"><span>Products</span><b>{{ x.productCount }}</b></div>
      </div>
    }

    <div class="two-col">
      <div class="card">
        <h3>Sales - last 30 days</h3>
        @for (d of sales(); track d.date) {
          <div class="bar-row">
            <span class="bar-label">{{ d.date | date: 'dd MMM' }}</span>
            <div class="bar" [style.width.%]="(d.total / maxSale()) * 100"></div>
            <span class="bar-val">₹ {{ d.total | number: '1.0-0' }}</span>
          </div>
        } @empty { <p class="muted">Abhi koi sale nahi.</p> }
      </div>

      <div class="card">
        <h3>Top products</h3>
        <table>
          <thead><tr><th>Product</th><th class="r">Qty</th><th class="r">Revenue</th></tr></thead>
          <tbody>
            @for (p of top(); track p.ProductId) {
              <tr><td>{{ p.name }}</td><td class="r">{{ p.quantity }}</td><td class="r">₹ {{ p.revenue | number: '1.2-2' }}</td></tr>
            } @empty { <tr><td colspan="3" class="muted">Abhi koi data nahi.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class Dashboard implements OnInit {
  private api = inject(Api);
  sum = signal<any>(null);
  sales = signal<any[]>([]);
  top = signal<any[]>([]);
  maxSale = computed(() => Math.max(1, ...this.sales().map((x) => x.total)));

  ngOnInit() {
    this.api.get<any>('/reports/summary').subscribe((r) => this.sum.set(r));
    this.api.get<any[]>('/reports/sales').subscribe((r) => this.sales.set(r));
    this.api.get<any[]>('/reports/top-products').subscribe((r) => this.top.set(r));
  }
}
