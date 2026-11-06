import { Router } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../db';
import { requireRole } from '../middleware/auth';
import { writeInvoicePdf } from '../pdf/invoicePdf';
import { calculateInvoice, r2 } from '../services/invoiceCalc';
import { asyncHandler, clean, HttpError, idParam, paging, qs } from '../utils/http';

export const invoicesRouter = Router();

/* ---------------- Create ---------------- */

const createSchema = z.object({
  customerId: z.number().int().positive(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  notes: z.string().max(500).nullish(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0).optional(), // na diya to product ka price lagega
        discountPct: z.number().min(0).max(100).default(0),
      }),
    )
    .min(1),
});

invoicesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const rq = () => new sql.Request(tx);

      const settings = (await rq().query('SELECT StateCode, InvoicePrefix FROM BusinessSettings')).recordset[0];
      if (!settings) throw new HttpError(500, 'BusinessSettings row missing');

      const customer = (
        await rq()
          .input('id', sql.Int, body.customerId)
          .query('SELECT CustomerId, StateCode FROM Customers WHERE CustomerId = @id AND IsActive = 1')
      ).recordset[0];
      if (!customer) throw new HttpError(404, 'Customer not found');

      // Products ek saath fetch
      const ids = [...new Set(body.items.map((i) => i.productId))];
      const pr = rq();
      ids.forEach((id, i) => pr.input(`p${i}`, sql.Int, id));
      const prods = (
        await pr.query(
          `SELECT ProductId, Name, Price, GstRate FROM Products
           WHERE IsActive = 1 AND ProductId IN (${ids.map((_, i) => '@p' + i).join(',')})`,
        )
      ).recordset;
      const byId = new Map<number, any>(prods.map((p: any) => [p.ProductId, p] as [number, any]));

      const inputs = body.items.map((it) => {
        const p = byId.get(it.productId);
        if (!p) throw new HttpError(400, `Product ${it.productId} not found`);
        return {
          productId: p.ProductId as number,
          description: p.Name as string,
          quantity: it.quantity,
          unitPrice: it.unitPrice ?? Number(p.Price),
          discountPct: it.discountPct,
          gstRate: Number(p.GstRate),
        };
      });

      const isInterState = settings.StateCode !== customer.StateCode;
      const calc = calculateInvoice(inputs, isInterState);

      const seq = (await rq().query('SELECT NEXT VALUE FOR InvoiceNumberSeq AS n')).recordset[0].n;
      const year = (body.invoiceDate ?? new Date().toISOString()).slice(0, 4);
      const invoiceNo = `${settings.InvoicePrefix}-${year}-${String(seq).padStart(5, '0')}`;

      const inv = (
        await rq()
          .input('no', sql.NVarChar(30), invoiceNo)
          .input('date', sql.VarChar(10), body.invoiceDate ?? null)
          .input('due', sql.VarChar(10), body.dueDate ?? null)
          .input('cust', sql.Int, body.customerId)
          .input('inter', sql.Bit, isInterState)
          .input('sub', sql.Decimal(18, 2), calc.subTotal)
          .input('disc', sql.Decimal(18, 2), calc.discountTotal)
          .input('cgst', sql.Decimal(18, 2), calc.cgstTotal)
          .input('sgst', sql.Decimal(18, 2), calc.sgstTotal)
          .input('igst', sql.Decimal(18, 2), calc.igstTotal)
          .input('round', sql.Decimal(18, 2), calc.roundOff)
          .input('grand', sql.Decimal(18, 2), calc.grandTotal)
          .input('notes', sql.NVarChar(500), clean(body.notes))
          .input('user', sql.Int, req.user!.userId)
          .query(
            `INSERT INTO Invoices
               (InvoiceNo, InvoiceDate, DueDate, CustomerId, IsInterState, SubTotal, DiscountTotal,
                CgstTotal, SgstTotal, IgstTotal, RoundOff, GrandTotal, Notes, CreatedBy)
             OUTPUT INSERTED.InvoiceId
             VALUES
               (@no, ISNULL(CAST(@date AS DATE), CAST(SYSDATETIME() AS DATE)), CAST(@due AS DATE), @cust, @inter,
                @sub, @disc, @cgst, @sgst, @igst, @round, @grand, @notes, @user)`,
          )
      ).recordset[0];

      for (const l of calc.lines) {
        await rq()
          .input('inv', sql.Int, inv.InvoiceId)
          .input('prod', sql.Int, l.productId)
          .input('desc', sql.NVarChar(200), l.description)
          .input('qty', sql.Decimal(18, 2), l.quantity)
          .input('price', sql.Decimal(18, 2), l.unitPrice)
          .input('dpct', sql.Decimal(5, 2), l.discountPct)
          .input('taxable', sql.Decimal(18, 2), l.taxableAmount)
          .input('gst', sql.Decimal(5, 2), l.gstRate)
          .input('cgst', sql.Decimal(18, 2), l.cgstAmount)
          .input('sgst', sql.Decimal(18, 2), l.sgstAmount)
          .input('igst', sql.Decimal(18, 2), l.igstAmount)
          .input('total', sql.Decimal(18, 2), l.lineTotal)
          .query(
            `INSERT INTO InvoiceItems
               (InvoiceId, ProductId, Description, Quantity, UnitPrice, DiscountPct, TaxableAmount,
                GstRate, CgstAmount, SgstAmount, IgstAmount, LineTotal)
             VALUES (@inv, @prod, @desc, @qty, @price, @dpct, @taxable, @gst, @cgst, @sgst, @igst, @total)`,
          );
      }

      // Stock kam karo (stock negative ho sakta hai, block nahi karte)
      await rq()
        .input('inv', sql.Int, inv.InvoiceId)
        .query(
          `UPDATE p SET p.StockQty = p.StockQty - x.Qty
           FROM Products p
           JOIN (SELECT ProductId, SUM(Quantity) AS Qty FROM InvoiceItems WHERE InvoiceId = @inv GROUP BY ProductId) x
             ON x.ProductId = p.ProductId`,
        );

      await tx.commit();
      res.status(201).json({ invoiceId: inv.InvoiceId, invoiceNo, grandTotal: calc.grandTotal });
    } catch (e) {
      await tx.rollback().catch(() => undefined);
      throw e;
    }
  }),
);

/* ---------------- List ---------------- */

invoicesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, size, offset } = paging(req);
    const status = qs(req.query.status);
    const q = qs(req.query.q);
    const from = qs(req.query.from);
    const to = qs(req.query.to);
    const customerId = Number(req.query.customerId) || null;

    const filter = `(@status IS NULL OR i.Status = @status)
      AND (@cust IS NULL OR i.CustomerId = @cust)
      AND (@from IS NULL OR i.InvoiceDate >= CAST(@from AS DATE))
      AND (@to IS NULL OR i.InvoiceDate <= CAST(@to AS DATE))
      AND (@q IS NULL OR i.InvoiceNo LIKE '%' + @q + '%' OR c.Name LIKE '%' + @q + '%')`;

    const pool = await getPool();
    const withFilters = (r: sql.Request) =>
      r
        .input('status', sql.NVarChar(20), status)
        .input('cust', sql.Int, customerId)
        .input('from', sql.VarChar(10), from)
        .input('to', sql.VarChar(10), to)
        .input('q', sql.NVarChar(100), q);

    const [count, rows] = await Promise.all([
      withFilters(pool.request()).query(
        `SELECT COUNT(*) AS total FROM Invoices i JOIN Customers c ON c.CustomerId = i.CustomerId WHERE ${filter}`,
      ),
      withFilters(pool.request())
        .input('off', sql.Int, offset)
        .input('size', sql.Int, size)
        .query(
          `SELECT i.InvoiceId, i.InvoiceNo, i.InvoiceDate, i.DueDate, i.GrandTotal, i.PaidAmount, i.Status,
                  c.CustomerId, c.Name AS CustomerName
           FROM Invoices i JOIN Customers c ON c.CustomerId = i.CustomerId
           WHERE ${filter}
           ORDER BY i.InvoiceDate DESC, i.InvoiceId DESC
           OFFSET @off ROWS FETCH NEXT @size ROWS ONLY`,
        ),
    ]);

    res.json({ data: rows.recordset, total: count.recordset[0].total, page, pageSize: size });
  }),
);

/* ---------------- Detail helper ---------------- */

async function loadInvoice(id: number) {
  const pool = await getPool();
  const inv = (
    await pool
      .request()
      .input('id', sql.Int, id)
      .query(
        `SELECT i.*, c.Name AS CustomerName, c.Address AS CustomerAddress, c.Gstin AS CustomerGstin,
                c.Phone AS CustomerPhone, c.StateCode AS CustomerStateCode
         FROM Invoices i JOIN Customers c ON c.CustomerId = i.CustomerId
         WHERE i.InvoiceId = @id`,
      )
  ).recordset[0];
  if (!inv) throw new HttpError(404, 'Invoice not found');

  const [items, payments] = await Promise.all([
    pool.request().input('id', sql.Int, id).query('SELECT * FROM InvoiceItems WHERE InvoiceId = @id ORDER BY InvoiceItemId'),
    pool.request().input('id', sql.Int, id).query('SELECT * FROM Payments WHERE InvoiceId = @id ORDER BY PaidOn, PaymentId'),
  ]);
  return { inv, items: items.recordset, payments: payments.recordset };
}

invoicesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { inv, items, payments } = await loadInvoice(idParam(req));
    res.json({ ...inv, items, payments });
  }),
);

/* ---------------- PDF ---------------- */

invoicesRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const { inv, items } = await loadInvoice(idParam(req));
    const biz = (await (await getPool()).request().query('SELECT * FROM BusinessSettings')).recordset[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.InvoiceNo}.pdf"`);
    writeInvoicePdf(res, inv, items, biz);
  }),
);

/* ---------------- Payments ---------------- */

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['Cash', 'UPI', 'Card', 'BankTransfer', 'Cheque']),
  reference: z.string().max(100).nullish(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

invoicesRouter.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const b = paymentSchema.parse(req.body);
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const inv = (
        await new sql.Request(tx)
          .input('id', sql.Int, id)
          .query(
            `SELECT GrandTotal, PaidAmount, Status FROM Invoices WITH (UPDLOCK, ROWLOCK) WHERE InvoiceId = @id`,
          )
      ).recordset[0];
      if (!inv) throw new HttpError(404, 'Invoice not found');
      if (inv.Status === 'Cancelled') throw new HttpError(400, 'Invoice is cancelled');

      const balance = r2(Number(inv.GrandTotal) - Number(inv.PaidAmount));
      if (b.amount > balance + 0.001) throw new HttpError(400, `Amount exceeds balance (${balance})`);

      await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('amt', sql.Decimal(18, 2), b.amount)
        .input('method', sql.NVarChar(20), b.method)
        .input('ref', sql.NVarChar(100), clean(b.reference))
        .input('paidOn', sql.VarChar(10), b.paidOn ?? null)
        .input('user', sql.Int, req.user!.userId)
        .query(
          `INSERT INTO Payments (InvoiceId, PaidOn, Amount, Method, Reference, CreatedBy)
           VALUES (@id, ISNULL(CAST(@paidOn AS DATE), CAST(SYSDATETIME() AS DATE)), @amt, @method, @ref, @user)`,
        );

      const newPaid = r2(Number(inv.PaidAmount) + b.amount);
      const status = newPaid >= Number(inv.GrandTotal) ? 'Paid' : 'PartiallyPaid';
      await new sql.Request(tx)
        .input('id', sql.Int, id)
        .input('paid', sql.Decimal(18, 2), newPaid)
        .input('status', sql.NVarChar(20), status)
        .query('UPDATE Invoices SET PaidAmount = @paid, Status = @status WHERE InvoiceId = @id');

      await tx.commit();
      res.status(201).json({ paidAmount: newPaid, status });
    } catch (e) {
      await tx.rollback().catch(() => undefined);
      throw e;
    }
  }),
);

/* ---------------- Cancel (Admin) ---------------- */

invoicesRouter.post(
  '/:id/cancel',
  requireRole('Admin'),
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const inv = (
        await new sql.Request(tx)
          .input('id', sql.Int, id)
          .query('SELECT Status, PaidAmount FROM Invoices WITH (UPDLOCK, ROWLOCK) WHERE InvoiceId = @id')
      ).recordset[0];
      if (!inv) throw new HttpError(404, 'Invoice not found');
      if (inv.Status === 'Cancelled') throw new HttpError(400, 'Already cancelled');
      if (Number(inv.PaidAmount) > 0) throw new HttpError(400, 'Payments exist on this invoice');

      await new sql.Request(tx)
        .input('id', sql.Int, id)
        .query(
          `UPDATE Invoices SET Status = 'Cancelled' WHERE InvoiceId = @id;
           UPDATE p SET p.StockQty = p.StockQty + x.Qty
           FROM Products p
           JOIN (SELECT ProductId, SUM(Quantity) AS Qty FROM InvoiceItems WHERE InvoiceId = @id GROUP BY ProductId) x
             ON x.ProductId = p.ProductId;`,
        );

      await tx.commit();
      res.json({ status: 'Cancelled' });
    } catch (e) {
      await tx.rollback().catch(() => undefined);
      throw e;
    }
  }),
);
