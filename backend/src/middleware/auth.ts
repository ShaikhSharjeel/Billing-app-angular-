import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../utils/http';

export interface AuthUser {
  userId: number;
  role: 'Admin' | 'Staff';
  name: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Login required');
  try {
    req.user = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  next();
}

export const requireRole =
  (...roles: AuthUser['role'][]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw new HttpError(403, 'Not allowed');
    next();
  };
