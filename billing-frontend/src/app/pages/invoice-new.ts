import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, errMsg } from '../core/api';
import { calculate } from '../core/calc';

interface Line { productId: number | null; quantity: number; unitPrice: number; discountPct: number; gstRate: number; }

@Component({
  selector: 'app-invoice-new',
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="page-head"><h1>New Invoice</h1></div>

    <div class="card form-grid">
      <label>Customer
        <select [(ngModel)]="customerId">
          <option [ngValue]="null">-- select --</option>
          @for (c of customers(); track c.CustomerId) { <option [ngValue]="c.CustomerId">{{ c.Name }}</option> }
        </select>
      </label>
      <label>Invoice date<input type="date" [(ngModel)]="invoiceDate" /></label>
      <label>Due date<input type="date" [(ngModel)]="dueDate" /></label>
      <label>Notes<input [(ngModel)]="notes" /></label>
    </div>

    <div class="card">
      <h3>Items</h3>
      @let t = calc;
      <table>
        <thead>
          <tr><th style="width:32%">Product</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Disc %</th><th class="r">GST %</th><th class="r">Amount</th><th></th></tr>
        </thead>
        <tbody>
          @for (l of lines; track $index; let i = $index) {
            <tr>
              <td>
                <select [ngModel]="l.productId" (ngModelChange)="pick(l, $event)">
                  <option [ngValue]="null">-- select --</option>
                  @for (p of products(); track p.ProductId) { <option [ngValue]="p.ProductId">{{ p.Name }}</option> }
                </select>
              </td>
              <td class="r"><input class="num" type="number" min="0" step="0.01" [(ngModel)]="l.quantity" /></td>
              <td class="r"><input class="num" type="number" min="0" step="0.01" [(ngModel)]="l.unitPrice" /></td>
              <td class="r"><input class="num" type="number" min="0" max="100" [(ngModel)]="l.discountPct" /></td>
              <td class="r">{{ l.gstRate }}</td>
              <td class="r">₹ {{ t.rows[i]?.total | number: '1.2-2' }}</td>
              <td class="r"><button class="btn sm danger" (click)="removeLine(i)">✕</button></td>
            </tr>
          }
        </tbody>
      </table>
      <button class="btn" (click)="addLine()">+ Add item</button>

      <div class="totals">
        <div><span>Sub total</span><b>₹ {{ t.subTotal | number: '1.2-2' }}</b></div>
        @if (t.discount > 0) { <div><span>Discount</span><b>- ₹ {{ t.discount | number: '1.2-2' }}</b></div> }
        @if (interState) {
          <div><span>IGST</span><b>₹ {{ t.igst | number: '1.2-2' }}</b></div>
        } @else {
          <div><span>CGST</span><b>₹ {{ t.cgst | number: '1.2-2' }}</b></div>
          <div><span>SGST</span><b>₹ {{ t.sgst | number: '1.2-2' }}</b></div>
        }
        <div><span>Round off</span><b>₹ {{ t.roundOff | number: '1.2-2' }}</b></div>
        <div class="grand"><span>Grand total</span><b>₹ {{ t.grand | number: '1.2-2' }}</b></div>
      </div>

      @if (error()) { <p class="err">{{ error() }}</p> }
      <div class="actions">
        <button class="btn primary" [disabled]="busy()" (click)="submit()">{{ busy() ? 'Saving...' : 'Save invoice' }}</button>
      </div>
    </div>
  `,
})
export class InvoiceNew implements OnInit {
  private api = inject(Api);
  private router = inject(Router);

  customers = signal<any[]>([]);
  products = signal<any[]>([]);
  biz = signal<any>(null);
  error = signal('');
  busy = signal(false);

  customerId: number | null = null;
  invoiceDate = new Date().toISOString().slice(0, 10);
  dueDate = '';
  notes = '';
  lines: Line[] = [this.blank()];

  ngOnInit() {
    this.api.get<any>('/customers', { pageSize: 100 }).subscribe((r) => this.customers.set(r.data));
    this.api.get<any>('/products', { pageSize: 100 }).subscribe((r) => this.products.set(r.data));
    this.api.get<any>('/settings').subscribe((r) => this.biz.set(r));
  }

  blank(): Line { return { productId: null, quantity: 1, unitPrice: 0, discountPct: 0, gstRate: 0 }; }
  addLine() { this.lines.push(this.blank()); }
  removeLine(i: number) { this.lines.splice(i, 1); if (!this.lines.length) this.addLine(); }

  pick(l: Line, id: number | null) {
    l.productId = id;
    const p = this.products().find((x) => x.ProductId === id);
    if (p) { l.unitPrice = Number(p.Price); l.gstRate = Number(p.GstRate); }
  }

  get interState(): boolean {
    const c = this.customers().find((x) => x.CustomerId === this.customerId);
    const b = this.biz();
    return !!c && !!b && c.StateCode !== b.StateCode;
  }

  get calc() { return calculate(this.lines, this.interState); }

  submit() {
    const items = this.lines.filter((l) => l.productId && l.quantity > 0);
    if (!this.customerId) return this.error.set('Customer select karo');
    if (!items.length) return this.error.set('Kam se kam ek item daalo');

    this.busy.set(true);
    this.error.set('');
    this.api
      .post<any>('/invoices', {
        customerId: this.customerId,
        invoiceDate: this.invoiceDate || null,
        dueDate: this.dueDate || null,
        notes: this.notes || null,
        items: items.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct || 0 })),
      })
      .subscribe({
        next: (r) => this.router.navigate(['/invoices', r.invoiceId]),
        error: (e) => { this.error.set(errMsg(e)); this.busy.set(false); },
      });
  }
}
