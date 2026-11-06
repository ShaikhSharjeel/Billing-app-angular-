import bcrypt from 'bcryptjs';
import { closePool, getPool, sql } from './db';

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@billing.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123';
  const pool = await getPool();

  const exists = await pool.request().input('email', sql.NVarChar(150), email).query('SELECT 1 AS x FROM Users WHERE Email = @email');
  if (exists.recordset.length) {
    console.log(`Admin already exists: ${email}`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    await pool
      .request()
      .input('email', sql.NVarChar(150), email)
      .input('hash', sql.NVarChar(255), hash)
      .query(
        `INSERT INTO Users (FullName, Email, PasswordHash, RoleId)
         SELECT 'Administrator', @email, @hash, RoleId FROM Roles WHERE RoleName = 'Admin'`,
      );
    console.log(`Admin created: ${email} / ${password}  (login ke baad password badal lena)`);
  }
  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
