import { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function idParam(req: Request, name = 'id'): number {
  const id = Number(req.params[name]);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');
  return id;
}

export function paging(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  return { page, size, offset: (page - 1) * size };
}

/** Empty / whitespace string -> null */
export const clean = (v?: string | null): string | null => (v && v.trim() ? v.trim() : null);

export const qs = (v: unknown): string | null => (typeof v === 'string' ? clean(v) : null);
