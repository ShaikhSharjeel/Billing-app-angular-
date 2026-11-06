# Billing Backend (Node.js + Express + TypeScript + SQL Server)

## Setup (ek baar)

1. **SSMS mein** `database/01_schema.sql` run kar chuke ho. Ab `database/02_sql_login.sql` bhi run karo.
   (Isse pehle: Server right-click -> Properties -> Security -> "SQL Server and Windows Authentication mode", phir SQL Server (SQL2022) service restart.)
2. **TCP/IP enable karo**: Start menu -> *SQL Server 2022 Configuration Manager*
   - SQL Server Network Configuration -> Protocols for SQL2022 -> **TCP/IP = Enabled**
   - TCP/IP -> Properties -> IP Addresses -> sabse neeche **IPAll**: `TCP Dynamic Ports` khaali karo, `TCP Port` = `1433`
   - SQL Server (SQL2022) service restart karo.
3. Folder `backend` mein:
   ```
   copy .env.example .env      (aur .env mein JWT_SECRET badlo)
   npm install
   npm run seed                (pehla admin user banata hai)
   npm run dev
   ```
4. Test: browser mein `http://localhost:3000/api/health` -> `{"ok":true}`

Default admin: `admin@billing.com` / `Admin@123`

## API (login/health ko chhodkar sab `Authorization: Bearer <token>` maangte hain)

| Method | URL | Kaam |
|---|---|---|
| POST | /api/auth/login | `{email, password}` -> `{token, user}` |
| GET | /api/auth/me | current user |
| GET/POST | /api/customers | list (`?q=&page=&pageSize=`) / naya |
| GET/PUT/DELETE | /api/customers/:id | DELETE sirf Admin |
| GET/POST | /api/products | list / naya |
| GET/PUT/DELETE | /api/products/:id | DELETE sirf Admin |
| POST | /api/invoices | invoice banao (GST auto calculate) |
| GET | /api/invoices | list (`?status=&customerId=&from=&to=&q=`) |
| GET | /api/invoices/:id | detail + items + payments |
| GET | /api/invoices/:id/pdf | PDF |
| POST | /api/invoices/:id/payments | payment add |
| POST | /api/invoices/:id/cancel | Admin only, stock wapas |
| GET | /api/reports/summary, /sales, /top-products, /gst | dashboard & reports |
| GET/PUT | /api/settings | business details (PUT Admin) |
| GET/POST/PATCH | /api/users | Admin only |

### Invoice create example
```json
POST /api/invoices
{
  "customerId": 1,
  "notes": "Thank you",
  "items": [
    { "productId": 1, "quantity": 2, "discountPct": 5 },
    { "productId": 2, "quantity": 1 }
  ]
}
```
GST: customer ka `stateCode` business ke `stateCode` se alag ho to IGST, warna CGST+SGST.
