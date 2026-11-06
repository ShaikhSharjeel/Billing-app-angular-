import { Router } from 'express';
import { getPool, sql } from '../db';
import { asyncHandler, qs } from '../utils/http';

export const reportsRouter = Router();

const dateRange = (r: sql.Request, from: string | null, to: string | null) =>
  r.input('from', sql.VarChar(10), from).input('to', sql.VarChar(10), to);

// Default range: last 30 days
const RANGE = `i.InvoiceDate BETWEEN ISNULL(CAST(@from AS DATE), DATEADD(DAY, -30, CAST(SYSDATETIME() AS DATE)))
                                 AND ISNULL(CAST(@to AS DATE), CAST(SYSDATETIME() AS DATE))`;

// Dashboard cards
reportsRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const r = await (await getPool()).request().query(
      `SELECT
         (SELECT ISNULL(SUM(GrandTotal), 0) FROM Invoices
            WHERE Status <> 'Cancelled' AND InvoiceDate = CAST(SYSDATETIME() AS DATE)) AS todaySales,
         (SELECT ISNULL(SUM(GrandTotal), 0) FROM Invoices
            WHERE Status <> 'Cancelled'
              AND InvoiceDate >= DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)) AS monthSales,
         (SELECT ISNULL(SUM(GrandTotal - PaidAmount), 0) FROM Invoices
            WHERE Status IN ('Unpaid', 'PartiallyPaid')) AS outstanding,
         (SELECT COUNT(*) FROM Invoices WHERE Status <> 'Cancelled') AS invoiceCount,
         (SELECT COUNT(*) FROM Customers WHERE IsActive = 1) AS customerCount,
         (SELECT COUNT(*) FROM Products WHERE IsActive = 1) AS productCount`,
    );
    res.json(r.recordset[0]);
  }),
);

// Day-wise sales (chart)
reportsRouter.get(
  '/sales',
  asyncHandler(async (req, res) => {
    const r = await dateRange((await getPool()).request(), qs(req.query.from), qs(req.query.to)).query(
      `SELECT i.InvoiceDate AS date, COUNT(*) AS invoices, SUM(i.GrandTotal) AS total
       FROM Invoices i
       WHERE i.Status <> 'Cancelled' AND ${RANGE}
       GROUP BY i.InvoiceDate
       ORDER BY i.InvoiceDate`,
    );
    res.json(r.recordset);
  }),
);

// Top selling products
reportsRouter.get(
  '/top-products',
  asyncHandler(async (req, res) => {
    const r = await dateRange((await getPool()).request(), qs(req.query.from), qs(req.query.to)).query(
      `SELECT TOP 10 ii.ProductId, ii.Description AS name,
              SUM(ii.Quantity) AS quantity, SUM(ii.LineTotal) AS revenue
       FROM InvoiceItems ii JOIN Invoices i ON i.InvoiceId = ii.InvoiceId
       WHERE i.Status <> 'Cancelled' AND ${RANGE}
       GROUP BY ii.ProductId, ii.Description
       ORDER BY revenue DESC`,
    );
    res.json(r.recordset);
  }),
);

// GST summary rate-wise (return filing ke liye kaam aata hai)
reportsRouter.get(
  '/gst',
  asyncHandler(async (req, res) => {
    const r = await dateRange((await getPool()).request(), qs(req.query.from), qs(req.query.to)).query(
      `SELECT ii.GstRate AS gstRate,
              SUM(ii.TaxableAmount) AS taxable,
              SUM(ii.CgstAmount) AS cgst,
              SUM(ii.SgstAmount) AS sgst,
              SUM(ii.IgstAmount) AS igst
       FROM InvoiceItems ii JOIN Invoices i ON i.InvoiceId = ii.InvoiceId
       WHERE i.Status <> 'Cancelled' AND ${RANGE}
       GROUP BY ii.GstRate
       ORDER BY ii.GstRate`,
    );
    res.json(r.recordset);
  }),
);
