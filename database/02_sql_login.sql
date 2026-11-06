/* ============================================================
   Backend ke liye SQL login (SSMS mein run karo)
   Pehle: Server (right-click) -> Properties -> Security ->
   "SQL Server and Windows Authentication mode" select karo,
   phir SQL Server service restart karo.
   ============================================================ */
USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'billing_app')
    CREATE LOGIN billing_app WITH PASSWORD = 'Billing@12345', CHECK_POLICY = OFF;
GO
USE BillingDB;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'billing_app')
    CREATE USER billing_app FOR LOGIN billing_app;
GO
ALTER ROLE db_datareader ADD MEMBER billing_app;
ALTER ROLE db_datawriter ADD MEMBER billing_app;
GRANT UPDATE ON OBJECT::dbo.InvoiceNumberSeq TO billing_app;   -- NEXT VALUE FOR ke liye
GO
