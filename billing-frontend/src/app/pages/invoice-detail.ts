import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api';
import { Auth } from '../core/auth';

@Component({
  selector: 'app-invoice-detail',
  imports: [FormsModule, RouterLink, DecimalPipe, DatePipe],
  template: `
    @if (inv(); as i) {
      <div class="page-head">
        <h1>{{ i.InvoiceNo }} <span [class]="'tag ' + i.Status">{{ i.Status }}</span></h1>
        <div class="actions">
          <a class="btn" routerLink="/invoices">Back</a>
          <button class="btn primary" (click)="openPdf()">Print / PDF</button>
          @if (auth.isAdmin() && i.Status !== 'Cancelled' && i.PaidAmount == 0) {
            <button class="btn danger" (click)="cancel()">Cancel invoice</button>
          }
        </div>
      </div>

      <div class="card">
        <div class="two-col">
          <div>
            <b>{{ i.CustomerName }}</b><br />
            {{ i.CustomerAddress }}<br />
            @if (i.CustomerGstin) { GSTIN: {{ i.CustomerGstin }} }
          </div>
          <div class="r">
            Date: {{ i.InvoiceDate | date: 'dd MMM yyyy' }}<br />
            @if (i.DueDate) { Due: {{ i.DueDate | date: 'dd MMM yyyy' }}<br /> }
            {{ i.IsInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)' }}
          </div>
        </div>
      </div>

      <div class="card">
        <table>
          <thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Disc %</th><th class="r">Taxable</th><th class="r">GST %</th><th class="r">Total</th></tr></thead>
          <tbody>
            @for (it of i.items; track it.InvoiceItemId; let n = $index) {
              <tr>
                <td>{{ n + 1 }}</td><td>{{ it.Description }}</td>
                <td class="r">{{ it.Quantity }}</td>
                <td class="r">{{ it.UnitPrice | number: '1.2-2' }}</td>
                <td class="r">{{ it.DiscountPct }}</td>
                <td class="r">{{ it.TaxableAmount | number: '1.2-2' }}</td>
                <td class="r">{{ it.GstRate }}</td>
                <td class="r">{{ it.LineTotal | number: '1.2-2' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="totals">
          <div><span>Sub total</span><b>₹ {{ i.SubTotal | number: '1.2-2' }}</b></div>
          @if (i.DiscountTotal > 0) { <div><span>Discount</span><b>- ₹ {{ i.DiscountTotal | number: '1.2-2' }}</b></div> }
          @if (i.IsInterState) {
            <div><span>IGST</span><b>₹ {{ i.IgstTotal | number: '1.2-2' }}</b></div>
          } @else {
            <div><span>CGST</span><b>₹ {{ i.CgstTotal | number: '1.2-2' }}</b></div>
            <div><span>SGST</span><b>₹ {{ i.SgstTotal | number: '1.2-2' }}</b></div>
          }
          <div><span>Round off</span><b>₹ {{ i.RoundOff | number: '1.2-2' }}</b></div>
          <div class="grand"><span>Grand total</span><b>₹ {{ i.GrandTotal | number: '1.2-2' }}</b></div>
          <div><span>Paid</span><b>₹ {{ i.PaidAmount | number: '1.2-2' }}</b></div>
          <div class="grand"><span>Balance</span><b>₹ {{ i.GrandTotal - i.PaidAmount | number: '1.2-2' }}</b></div>
        </div>
      </div>

      <div class="card">
        <h3>Payments</h3>
        <table>
          <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead>
          <tbody>
            @for (p of i.payments; track p.PaymentId) {
              <tr><td>{{ p.PaidOn | date: 'dd MMM yyyy' }}</td><td>{{ p.Method }}</td><td>{{ p.Reference }}</td><td class="r">₹ {{ p.Amount | number: '1.2-2' }}</td></tr>
            } @empty { <tr><td colspan="4" class="muted">Abhi koi payment nahi.</td></tr> }
          </tbody>
        </table>

        @if (i.Status !== 'Cancelled' && i.Status !== 'Paid') {
          <h4>Payment add karo</h4>
          <div class="form-grid">
            <label>Amount (₹)<input type="number" step="0.01" min="0" [(ngModel)]="pay.amount" /></label>
            <label>Method
              <select [(ngModel)]="pay.method">
                <option>Cash</option><option>UPI</option><option>Card</option><option>BankTransfer</option><option>Cheque</option>
              </select>
            </label>
            <label>Reference<input [(ngModel)]="pay.reference" /></label>
            <label>Date<input type="date" [(ngModel)]="pay.paidOn" /></label>
          </div>
          @if (error()) { <p class="err">{{ error() }}</p> }
          <button class="btn primary" (click)="addPayment()">Save payment</button>
        }
      </div>
    }
  `,
})
export class InvoiceDetail implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  auth = inject(Auth);

  inv = signal<any>(null);
  error = signal('');
  id = Number(this.route.snapshot.paramMap.get('id'));
  pay: any = { amount: 0, method: 'Cash', reference: '', paidOn: new Date().toISOString().slice(0, 10) };

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any>(`/invoices/${this.id}`).subscribe((r) => {
      this.pay.amount = Math.round((r.GrandTotal - r.PaidAmount) * 100) / 100;
      this.inv.set(r);
    });
  }

  openPdf() {
    this.api.blob(`/invoices/${this.id}/pdf`).subscribe({
      next: (b) => window.open(URL.createObjectURL(b), '_blank'),
      error: () => alert('PDF nahi khul paya'),
    });
  }

  addPayment() {
    this.error.set('');
    this.api.post(`/invoices/${this.id}/payments`, { ...this.pay, reference: this.pay.reference || null }).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(errMsg(e)),
    });
  }

  cancel() {
    if (!confirm('Is invoice ko cancel karna hai? Stock wapas add ho jayega.')) return;
    this.api.post(`/invoices/${this.id}/cancel`).subscribe({
      next: () => this.load(),
      error: (e) => alert(errMsg(e)),
    });
  }
}
