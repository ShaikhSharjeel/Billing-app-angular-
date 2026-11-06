import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  db: {
    server: process.env.DB_SERVER ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 1433),
    database: process.env.DB_NAME ?? 'BillingDB',
    user: process.env.DB_USER ?? 'billing_app',
    password: process.env.DB_PASSWORD ?? '',
  },
};
