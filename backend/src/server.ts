import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { getPool } from './db';
import { authenticate, requireRole } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { invoicesRouter } from './routes/invoices';
import { productsRouter } from './routes/products';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';
import { usersRouter } from './routes/users';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/customers', authenticate, customersRouter);
app.use('/api/products', authenticate, productsRouter);
app.use('/api/invoices', authenticate, invoicesRouter);
app.use('/api/reports', authenticate, reportsRouter);
app.use('/api/settings', authenticate, settingsRouter);
app.use('/api/users', authenticate, requireRole('Admin'), usersRouter);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await getPool(); // DB connect fail ho to yahin pata chal jayega
  console.log(`Connected to SQL Server (${config.db.server}/${config.db.database})`);
  app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
}

start().catch((e) => {
  console.error('Startup failed:', e.message);
  process.exit(1);
});
