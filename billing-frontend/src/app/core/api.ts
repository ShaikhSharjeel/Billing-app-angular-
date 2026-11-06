import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// Backend ka address. Production mein ise badalna.
export const API = 'http://localhost:3000/api';

export function errMsg(e: any): string {
  if (e?.status === 0) return 'Server se connect nahi ho pa raha (backend chal raha hai?)';
  const d = e?.error?.details;
  if (Array.isArray(d) && d.length) return d.map((x: any) => `${x.path}: ${x.message}`).join(', ');
  return e?.error?.error ?? 'Kuch galat ho gaya';
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  get<T>(path: string, params: Record<string, any> = {}) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<T>(API + path, { params: p });
  }
  post<T>(path: string, body: any = {}) { return this.http.post<T>(API + path, body); }
  put<T>(path: string, body: any) { return this.http.put<T>(API + path, body); }
  patch<T>(path: string, body: any) { return this.http.patch<T>(API + path, body); }
  delete<T>(path: string) { return this.http.delete<T>(API + path); }
  blob(path: string) { return this.http.get(API + path, { responseType: 'blob' }); }
}
