import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.number === 2627 || err?.number === 2601) {
    return res.status(409).json({ error: 'Duplicate value already exists' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
