import { Router } from 'express';
import { z } from 'zod';
import { getPool, sql } from '../db';
import { requireRole } from '../middleware/auth';
import { asyncHandler, clean } from '../utils/http';

export const settingsRouter = Router();

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const r = await (await getPool()).request().query('SELECT * FROM BusinessSettings');
    res.json(r.recordset[0]);
  }),
);

const schema = z.object({
  businessName: z.string().trim().min(1).max(150),
  address: z.string().max(300).nullish(),
  phone: z.string().max(20).nullish(),
  email: z.string().max(150).nullish(),
  gstin: z.string().max(15).nullish(),
  stateCode: z.string().length(2),
  invoicePrefix: z.string().trim().min(1).max(10),
});

settingsRouter.put(
  '/',
  requireRole('Admin'),
  asyncHandler(async (req, res) => {
    const b = schema.parse(req.body);
    const r = await (await getPool())
      .request()
      .input('name', sql.NVarChar(150), b.businessName)
      .input('addr', sql.NVarChar(300), clean(b.address))
      .input('phone', sql.NVarChar(20), clean(b.phone))
      .input('email', sql.NVarChar(150), clean(b.email))
      .input('gstin', sql.NVarChar(15), clean(b.gstin)?.toUpperCase() ?? null)
      .input('state', sql.NVarChar(2), b.stateCode)
      .input('prefix', sql.NVarChar(10), b.invoicePrefix)
      .query(
        `UPDATE BusinessSettings
         SET BusinessName=@name, Address=@addr, Phone=@phone, Email=@email,
             Gstin=@gstin, StateCode=@state, InvoicePrefix=@prefix
         OUTPUT INSERTED.*`,
      );
    res.json(r.recordset[0]);
  }),
);
