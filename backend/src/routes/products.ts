import { Router } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler, clean, HttpError, idParam, paging, qs } from '../utils/http';

export const productsRouter = Router();

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

const schema = z.object({
  name: z.string().trim().min(1).max(150),
  sku: z.string().max(50).nullish(),
  hsnCode: z.string().max(10).nullish(),
  unit: z.string().max(20).default('pcs'),
  price: z.number().min(0),
  gstRate: z.number().refine((v) => GST_RATES.includes(v), 'GST rate must be 0, 0.25, 3, 5, 12, 18 or 28'),
  stockQty: z.number().default(0),
});

const bind = (r: sql.Request, b: z.infer<typeof schema>) =>
  r
    .input('name', sql.NVarChar(150), b.name)
    .input('sku', sql.NVarChar(50), clean(b.sku))
    .input('hsn', sql.NVarChar(10), clean(b.hsnCode))
    .input('unit', sql.NVarChar(20), b.unit)
    .input('price', sql.Decimal(18, 2), b.price)
    .input('gst', sql.Decimal(5, 2), b.gstRate)
    .input('stock', sql.Decimal(18, 2), b.stockQty);

productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = qs(req.query.q);
    const { page, size, offset } = paging(req);
    const pool = await getPool();
    const filter = `IsActive = 1 AND (@q IS NULL OR Name LIKE '%' + @q + '%' OR Sku LIKE '%' + @q + '%')`;

    const [count, rows] = await Promise.all([
      pool.request().input('q', sql.NVarChar(100), q).query(`SELECT COUNT(*) AS total FROM Products WHERE ${filter}`),
      pool
        .request()
        .input('q', sql.NVarChar(100), q)
        .input('off', sql.Int, offset)
        .input('size', sql.Int, size)
        .query(
          `SELECT * FROM Products WHERE ${filter}
           ORDER BY Name OFFSET @off ROWS FETCH NEXT @size ROWS ONLY`,
        ),
    ]);
    res.json({ data: rows.recordset, total: count.recordset[0].total, page, pageSize: size });
  }),
);

productsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const r = await (await getPool())
      .request()
      .input('id', sql.Int, idParam(req))
      .query('SELECT * FROM Products WHERE ProductId = @id AND IsActive = 1');
    if (!r.recordset[0]) throw new HttpError(404, 'Product not found');
    res.json(r.recordset[0]);
  }),
);

productsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = schema.parse(req.body);
    const r = await bind((await getPool()).request(), b).query(
      `INSERT INTO Products (Name, Sku, HsnCode, Unit, Price, GstRate, StockQty)
       OUTPUT INSERTED.*
       VALUES (@name, @sku, @hsn, @unit, @price, @gst, @stock)`,
    );
    res.status(201).json(r.recordset[0]);
  }),
);

productsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const b = schema.parse(req.body);
    const r = await bind((await getPool()).request(), b)
      .input('id', sql.Int, idParam(req))
      .query(
        `UPDATE Products
         SET Name=@name, Sku=@sku, HsnCode=@hsn, Unit=@unit, Price=@price, GstRate=@gst, StockQty=@stock
         OUTPUT INSERTED.*
         WHERE ProductId=@id AND IsActive=1`,
      );
    if (!r.recordset[0]) throw new HttpError(404, 'Product not found');
    res.json(r.recordset[0]);
  }),
);

productsRouter.delete(
  '/:id',
  requireRole('Admin'),
  asyncHandler(async (req, res) => {
    const r = await (await getPool())
      .request()
      .input('id', sql.Int, idParam(req))
      .query('UPDATE Products SET IsActive = 0 WHERE ProductId = @id AND IsActive = 1');
    if (!r.rowsAffected[0]) throw new HttpError(404, 'Product not found');
    res.status(204).end();
  }),
);
