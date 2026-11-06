import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api';
import { Auth } from '../core/auth';
import { Pager } from '../core/pager';
import { GST_RATES } from '../core/states';

@Component({
  selector: 'app-products',
  imports: [FormsModule, Pager, DecimalPipe],
  template: `
    <div class="page-head">
      <h1>Products</h1>
      <button class="btn primary" (click)="add()">+ New product</button>
    </div>

    @if (showForm()) {
      <form class="card form-grid" (ngSubmit)="save()">
        <h3>{{ editId ? 'Edit' : 'New' }} product</h3>
        <label>Name<input name="name" [(ngModel)]="f.name" required /></label>
        <label>SKU / Code<input name="sku" [(ngModel)]="f.sku" /></label>
        <label>HSN code<input name="hsnCode" [(ngModel)]="f.hsnCode" /></label>
        <label>Unit<input name="unit" [(ngModel)]="f.unit" required /></label>
        <label>Price (₹)<input name="price" type="number" step="0.01" min="0" [(ngModel)]="f.price" required /></label>
        <label>GST %
          <select name="gstRate" [(ngModel)]="f.gstRate">
            @for (g of rates; track g) { <option [ngValue]="g">{{ g }}</option> }
          </select>
        </label>
        <label>Stock<input name="stockQty" type="number" step="0.01" [(ngModel)]="f.stockQty" /></label>
        @if (error()) { <p class="err wide">{{ error() }}</p> }
        <div class="actions wide">
          <button class="btn primary">Save</button>
          <button type="button" class="btn" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    }

    <div class="toolbar">
      <input placeholder="Search name / SKU" [(ngModel)]="q" (keyup.enter)="load(1)" />
      <button class="btn" (click)="load(1)">Search</button>
    </div>

    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>SKU</th><th>HSN</th><th class="r">Price</th><th class="r">GST %</th><th class="r">Stock</th><th></th></tr></thead>
        <tbody>
          @for (p of rows(); track p.ProductId) {
            <tr>
              <td>{{ p.Name }}</td><td>{{ p.Sku }}</td><td>{{ p.HsnCode }}</td>
              <td class="r">₹ {{ p.Price | number: '1.2-2' }}</td>
              <td class="r">{{ p.GstRate }}</td>
              <td class="r" [class.low]="p.StockQty <= 0">{{ p.StockQty }} {{ p.Unit }}</td>
              <td class="r">
                <button class="btn sm" (click)="edit(p)">Edit</button>
                @if (auth.isAdmin()) { <button class="btn sm danger" (click)="remove(p)">Delete</button> }
              </td>
            </tr>
          } @empty { <tr><td colspan="7" class="muted">Koi product nahi mila.</td></tr> }
        </tbody>
      </table>
      <app-pager [page]="page()" [total]="total()" (go)="load($event)" />
    </div>
  `,
})
export class Products implements OnInit {
  private api = inject(Api);
  auth = inject(Auth);
  rates = GST_RATES;
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
    this.api.get<any>('/products', { q: this.q, page, pageSize: 15 }).subscribe((r) => {
      this.rows.set(r.data); this.total.set(r.total); this.page.set(page);
    });
  }

  add() {
    this.editId = null;
    this.f = { name: '', sku: '', hsnCode: '', unit: 'pcs', price: 0, gstRate: 18, stockQty: 0 };
    this.error.set(''); this.showForm.set(true);
  }

  edit(p: any) {
    this.editId = p.ProductId;
    this.f = { name: p.Name, sku: p.Sku, hsnCode: p.HsnCode, unit: p.Unit, price: p.Price, gstRate: p.GstRate, stockQty: p.StockQty };
    this.error.set(''); this.showForm.set(true);
  }

  save() {
    const req = this.editId ? this.api.put(`/products/${this.editId}`, this.f) : this.api.post('/products', this.f);
    req.subscribe({
      next: () => { this.showForm.set(false); this.load(this.page()); },
      error: (e) => this.error.set(errMsg(e)),
    });
  }

  remove(p: any) {
    if (!confirm(`"${p.Name}" ko delete karna hai?`)) return;
    this.api.delete(`/products/${p.ProductId}`).subscribe({
      next: () => this.load(this.page()),
      error: (e) => alert(errMsg(e)),
    });
  }
}
