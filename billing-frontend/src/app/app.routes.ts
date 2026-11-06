import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.Login) },
  { path: 'signup', loadComponent: () => import('./pages/signup').then((m) => m.Signup) },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard) },
      { path: 'customers', loadComponent: () => import('./pages/customers').then((m) => m.Customers) },
      { path: 'products', loadComponent: () => import('./pages/products').then((m) => m.Products) },
      { path: 'invoices', loadComponent: () => import('./pages/invoices').then((m) => m.Invoices) },
      { path: 'invoices/new', loadComponent: () => import('./pages/invoice-new').then((m) => m.InvoiceNew) },
      { path: 'invoices/:id', loadComponent: () => import('./pages/invoice-detail').then((m) => m.InvoiceDetail) },
      { path: 'reports', loadComponent: () => import('./pages/reports').then((m) => m.Reports) },
      { path: 'settings', loadComponent: () => import('./pages/settings').then((m) => m.Settings) },
      { path: 'users', canActivate: [adminGuard], loadComponent: () => import('./pages/users').then((m) => m.Users) },
    ],
  },
  { path: '**', redirectTo: '' },
];