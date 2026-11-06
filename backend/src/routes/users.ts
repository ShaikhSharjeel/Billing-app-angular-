import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getPool, sql } from '../db';
import { asyncHandler, HttpError, idParam } from '../utils/http';

// Ye router sirf Admin ke liye mount hota hai (server.ts dekho)
export const usersRouter = Router();

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const r = await (await getPool()).request().query(
      `SELECT u.UserId, u.FullName, u.Email, r.RoleName AS Role, u.IsActive, u.CreatedAt
       FROM Users u JOIN Roles r ON r.RoleId = u.RoleId
       ORDER BY u.FullName`,
    );
    res.json(r.recordset);
  }),
);

const createSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().email().max(150),
  password: z.string().min(8).max(100),
  role: z.enum(['Admin', 'Staff']),
});

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = createSchema.parse(req.body);
    const hash = await bcrypt.hash(b.password, 10);
    const r = await (await getPool())
      .request()
      .input('name', sql.NVarChar(100), b.fullName)
      .input('email', sql.NVarChar(150), b.email)
      .input('hash', sql.NVarChar(255), hash)
      .input('role', sql.NVarChar(50), b.role)
      .query(
        `INSERT INTO Users (FullName, Email, PasswordHash, RoleId)
         OUTPUT INSERTED.UserId, INSERTED.FullName, INSERTED.Email, INSERTED.IsActive
         SELECT @name, @email, @hash, RoleId FROM Roles WHERE RoleName = @role`,
      );
    res.status(201).json({ ...r.recordset[0], Role: b.role });
  }),
);

usersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    if (id === req.user!.userId && !isActive) throw new HttpError(400, 'You cannot deactivate yourself');
    const r = await (await getPool())
      .request()
      .input('id', sql.Int, id)
      .input('active', sql.Bit, isActive)
      .query('UPDATE Users SET IsActive = @active WHERE UserId = @id');
    if (!r.rowsAffected[0]) throw new HttpError(404, 'User not found');
    res.json({ userId: id, isActive });
  }),
);
