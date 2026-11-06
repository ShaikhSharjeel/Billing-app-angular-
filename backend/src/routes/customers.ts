import { Router } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler, clean, HttpError, idParam, paging, qs } from '../utils/http';

export const customersRouter = Router();

const schema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().max(20).nullish(),
  email: z.string().max(150).nullish(),
  address: z.string().max(300).nullish(),
  gstin: z.string().max(15).nullish(),
  stateCode: z.string().length(2),
});

const bind = (r: sql.Request, b: z.infer<typeof schema>) =>
  r
    .input('name', sql.NVarChar(150), b.name)
    .input('phone', sql.NVarChar(20), clean(b.phone))
    .input('email', sql.NVarChar(150), clean(b.email))
    .input('address', sql.NVarChar(300), clean(b.address))
    .input('gstin', sql.NVarChar(15), clean(b.gstin)?.toUpperCase() ?? null)
    .input('stateCode', sql.NVarChar(2), b.stateCode);

customersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = qs(req.query.q);
    const { page, size, offset } = paging(req);
    const pool = await getPool();
    const filter = `IsActive = 1 AND (@q IS NULL OR Name LIKE '%' + @q + '%' OR Phone LIKE '%' + @q + '%')`;

    const [count, rows] = await Promise.all([
      pool.request().input('q', sql.NVarChar(100), q).query(`SELECT COUNT(*) AS total FROM Customers WHERE ${filter}`),
      pool
        .request()
        .input('q', sql.NVarChar(100), q)
        .input('off', sql.Int, offset)
        .input('size', sql.Int, size)
        .query(
          `SELECT * FROM Customers WHERE ${filter}
           ORDER BY Name OFFSET @off ROWS FETCH NEXT @size ROWS ONLY`,
        ),
    ]);
    res.json({ data: rows.recordset, total: count.recordset[0].total, page, pageSize: size });
  }),
);

customersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const r = await (await getPool())
      .request()
      .input('id', sql.Int, idParam(req))
      .query('SELECT * FROM Customers WHERE CustomerId = @id AND IsActive = 1');
    if (!r.recordset[0]) throw new HttpError(404, 'Customer not found');
    res.json(r.recordset[0]);
  }),
);

customersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = schema.parse(req.body);
    const r = await bind((await getPool()).request(), b).query(
      `INSERT INTO Customers (Name, Phone, Email, Address, Gstin, StateCode)
       OUTPUT INSERTED.*
       VALUES (@name, @phone, @email, @address, @gstin, @stateCode)`,
    );
    res.status(201).json(r.recordset[0]);
  }),
);

customersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const b = schema.parse(req.body);
    const r = await bind((await getPool()).request(), b)
      .input('id', sql.Int, idParam(req))
      .query(
        `UPDATE Customers
         SET Name=@name, Phone=@phone, Email=@email, Address=@address, Gstin=@gstin, StateCode=@stateCode
         OUTPUT INSERTED.*
         WHERE CustomerId=@id AND IsActive=1`,
      );
    if (!r.recordset[0]) throw new HttpError(404, 'Customer not found');
    res.json(r.recordset[0]);
  }),
);

// Soft delete (purane invoices ka data safe rahe)
customersRouter.delete(
  '/:id',
  requireRole('Admin'),
  asyncHandler(async (req, res) => {
    const r = await (await getPool())
      .request()
      .input('id', sql.Int, idParam(req))
      .query('UPDATE Customers SET IsActive = 0 WHERE CustomerId = @id AND IsActive = 1');
    if (!r.rowsAffected[0]) throw new HttpError(404, 'Customer not found');
    res.status(204).end();
  }),
);
