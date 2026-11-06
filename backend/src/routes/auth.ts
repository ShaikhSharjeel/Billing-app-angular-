import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { getPool, sql } from '../db';
import { authenticate, AuthUser } from '../middleware/auth';
import { asyncHandler, HttpError } from '../utils/http';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);

    const result = await (await getPool())
      .request()
      .input('email', sql.NVarChar(150), email)
      .query(
        `SELECT u.UserId, u.FullName, u.PasswordHash, u.IsActive, r.RoleName
         FROM Users u JOIN Roles r ON r.RoleId = u.RoleId
         WHERE u.Email = @email`,
      );

    const u = result.recordset[0];
    const ok = !!u && u.IsActive && (await bcrypt.compare(password, u.PasswordHash));
    if (!ok) throw new HttpError(401, 'Invalid email or password');

    const user: AuthUser = { userId: u.UserId, role: u.RoleName, name: u.FullName };
    const token = jwt.sign(user, config.jwtSecret, { expiresIn: '8h' });
    res.json({ token, user });
  }),
);

// Naya account (hamesha Staff role; Admin sirf seed script ya Users page se banta hai)
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const b = z
      .object({
        fullName: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(150),
        password: z.string().min(8).max(100),
      })
      .parse(req.body);

    const pool = await getPool();
    const exists = await pool
      .request()
      .input('email', sql.NVarChar(150), b.email)
      .query('SELECT 1 AS x FROM Users WHERE Email = @email');
    if (exists.recordset.length) throw new HttpError(409, 'Is email se account pehle se bana hua hai');

    const hash = await bcrypt.hash(b.password, 10);
    const r = await pool
      .request()
      .input('name', sql.NVarChar(100), b.fullName)
      .input('email', sql.NVarChar(150), b.email)
      .input('hash', sql.NVarChar(255), hash)
      .query(
        `INSERT INTO Users (FullName, Email, PasswordHash, RoleId)
         OUTPUT INSERTED.UserId
         SELECT @name, @email, @hash, RoleId FROM Roles WHERE RoleName = 'Staff'`,
      );

    const user: AuthUser = { userId: r.recordset[0].UserId, role: 'Staff', name: b.fullName };
    const token = jwt.sign(user, config.jwtSecret, { expiresIn: '8h' });
    res.status(201).json({ token, user });
  }),
);

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});