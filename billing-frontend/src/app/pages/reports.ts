import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';

@Component({
  selector: 'app-reports',
  imports: [FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="page-head"><h1>Reports</h1></div>
    <div class="toolbar">
      From <input type="date" [(ngModel)]="from" /> To <input type="date" [(ngModel)]="to" />
      <button class="btn primary" (click)="load()">Show</button>
      <small class="muted">Khaali chhodo to last 30 din.</small>
    </div>

    <div class="card">
      <h3>Day-wise sales</h3>
      <table>
        <thead><tr><th>Date</th><th class="r">Invoices</th><th class="r">Total</th></tr></thead>
        <tbody>
          @for (d of sales(); track d.date) {
            <tr><td>{{ d.date | date: 'dd MMM yyyy' }}</td><td class="r">{{ d.invoices }}</td><td class="r">₹ {{ d.total | number: '1.2-2' }}</td></tr>
          } @empty { <tr><td colspan="3" class="muted">Is period mein koi sale nahi.</td></tr> }
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3>GST summary</h3>
      <table>
        <thead><tr><th>GST %</th><th class="r">Taxable</th><th class="r">CGST</th><th class="r">SGST</th><th class="r">IGST</th></tr></thead>
        <tbody>
          @for (g of gst(); track g.gstRate) {
            <tr>
              <td>{{ g.gstRate }}</td>
              <td class="r">{{ g.taxable | number: '1.2-2' }}</td>
              <td class="r">{{ g.cgst | number: '1.2-2' }}</td>
              <td class="r">{{ g.sgst | number: '1.2-2' }}</td>
              <td class="r">{{ g.igst | number: '1.2-2' }}</td>
            </tr>
          } @empty { <tr><td colspan="5" class="muted">Koi data nahi.</td></tr> }
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3>Top products</h3>
      <table>
        <thead><tr><th>Product</th><th class="r">Qty sold</th><th class="r">Revenue</th></tr></thead>
        <tbody>
          @for (p of top(); track p.ProductId) {
            <tr><td>{{ p.name }}</td><td class="r">{{ p.quantity }}</td><td class="r">₹ {{ p.revenue | number: '1.2-2' }}</td></tr>
          } @empty { <tr><td colspan="3" class="muted">Koi data nahi.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class Reports implements OnInit {
  private api = inject(Api);
  from = ''; to = '';
  sales = signal<any[]>([]);
  gst = signal<any[]>([]);
  top = signal<any[]>([]);

  ngOnInit() { this.load(); }

  load() {
    const p = { from: this.from, to: this.to };
    this.api.get<any[]>('/reports/sales', p).subscribe((r) => this.sales.set(r));
    this.api.get<any[]>('/reports/gst', p).subscribe((r) => this.gst.set(r));
    this.api.get<any[]>('/reports/top-products', p).subscribe((r) => this.top.set(r));
  }
}
