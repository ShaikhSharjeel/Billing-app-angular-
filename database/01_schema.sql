/* ============================================================
   Billing App - SQL Server schema
   Run in SSMS: New Query -> paste -> Execute (F5)
   ============================================================ */

IF DB_ID('BillingDB') IS NULL
    CREATE DATABASE BillingDB;
GO
USE BillingDB;
GO

/* ---------- Roles & Users ---------- */
CREATE TABLE Roles (
    RoleId      INT IDENTITY(1,1) PRIMARY KEY,
    RoleName    NVARCHAR(50) NOT NULL UNIQUE      -- Admin, Staff
);

CREATE TABLE Users (
    UserId       INT IDENTITY(1,1) PRIMARY KEY,
    FullName     NVARCHAR(100) NOT NULL,
    Email        NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    RoleId       INT NOT NULL REFERENCES Roles(RoleId),
    IsActive     BIT NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

/* ---------- Business settings (seller details printed on invoice) ---------- */
CREATE TABLE BusinessSettings (
    SettingId     INT PRIMARY KEY DEFAULT 1 CHECK (SettingId = 1),  -- single row
    BusinessName  NVARCHAR(150) NOT NULL,
    Address       NVARCHAR(300) NULL,
    Phone         NVARCHAR(20)  NULL,
    Email         NVARCHAR(150) NULL,
    Gstin         NVARCHAR(15)  NULL,
    StateCode     NVARCHAR(2)   NOT NULL,         -- e.g. 27 = Maharashtra
    InvoicePrefix NVARCHAR(10)  NOT NULL DEFAULT 'INV'
);

/* ---------- Customers ---------- */
CREATE TABLE Customers (
    CustomerId  INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(150) NOT NULL,
    Phone       NVARCHAR(20)  NULL,
    Email       NVARCHAR(150) NULL,
    Address     NVARCHAR(300) NULL,
    Gstin       NVARCHAR(15)  NULL,
    StateCode   NVARCHAR(2)   NOT NULL,           -- decides CGST+SGST vs IGST
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

/* ---------- Products ---------- */
CREATE TABLE Products (
    ProductId   INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(150) NOT NULL,
    Sku         NVARCHAR(50)  NULL UNIQUE,
    HsnCode     NVARCHAR(10)  NULL,
    Unit        NVARCHAR(20)  NOT NULL DEFAULT 'pcs',
    Price       DECIMAL(18,2) NOT NULL CHECK (Price >= 0),
    GstRate     DECIMAL(5,2)  NOT NULL DEFAULT 18 CHECK (GstRate IN (0,0.25,3,5,12,18,28)),
    StockQty    DECIMAL(18,2) NOT NULL DEFAULT 0,
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

/* ---------- Invoice number sequence ---------- */
CREATE SEQUENCE InvoiceNumberSeq AS INT START WITH 1 INCREMENT BY 1;

/* ---------- Invoices ---------- */
CREATE TABLE Invoices (
    InvoiceId     INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceNo     NVARCHAR(30) NOT NULL UNIQUE,   -- e.g. INV-2026-00001
    InvoiceDate   DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    DueDate       DATE NULL,
    CustomerId    INT NOT NULL REFERENCES Customers(CustomerId),
    IsInterState  BIT NOT NULL,                   -- 1 = IGST, 0 = CGST+SGST
    SubTotal      DECIMAL(18,2) NOT NULL,
    DiscountTotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    CgstTotal     DECIMAL(18,2) NOT NULL DEFAULT 0,
    SgstTotal     DECIMAL(18,2) NOT NULL DEFAULT 0,
    IgstTotal     DECIMAL(18,2) NOT NULL DEFAULT 0,
    RoundOff      DECIMAL(18,2) NOT NULL DEFAULT 0,
    GrandTotal    DECIMAL(18,2) NOT NULL,
    PaidAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    Status        NVARCHAR(20) NOT NULL DEFAULT 'Unpaid'
                  CHECK (Status IN ('Unpaid','PartiallyPaid','Paid','Cancelled')),
    Notes         NVARCHAR(500) NULL,
    CreatedBy     INT NOT NULL REFERENCES Users(UserId),
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE InvoiceItems (
    InvoiceItemId INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceId     INT NOT NULL REFERENCES Invoices(InvoiceId) ON DELETE CASCADE,
    ProductId     INT NOT NULL REFERENCES Products(ProductId),
    Description   NVARCHAR(200) NOT NULL,         -- product name snapshot
    Quantity      DECIMAL(18,2) NOT NULL CHECK (Quantity > 0),
    UnitPrice     DECIMAL(18,2) NOT NULL,
    DiscountPct   DECIMAL(5,2)  NOT NULL DEFAULT 0,
    TaxableAmount DECIMAL(18,2) NOT NULL,
    GstRate       DECIMAL(5,2)  NOT NULL,
    CgstAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    SgstAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    IgstAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    LineTotal     DECIMAL(18,2) NOT NULL
);

/* ---------- Payments ---------- */
CREATE TABLE Payments (
    PaymentId   INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceId   INT NOT NULL REFERENCES Invoices(InvoiceId),
    PaidOn      DATE NOT NULL DEFAULT CAST(SYSDATETIME() AS DATE),
    Amount      DECIMAL(18,2) NOT NULL CHECK (Amount > 0),
    Method      NVARCHAR(20) NOT NULL CHECK (Method IN ('Cash','UPI','Card','BankTransfer','Cheque')),
    Reference   NVARCHAR(100) NULL,
    CreatedBy   INT NOT NULL REFERENCES Users(UserId),
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

/* ---------- Indexes ---------- */
CREATE INDEX IX_Invoices_Customer ON Invoices(CustomerId);
CREATE INDEX IX_Invoices_Date     ON Invoices(InvoiceDate);
CREATE INDEX IX_InvoiceItems_Inv  ON InvoiceItems(InvoiceId);
CREATE INDEX IX_Payments_Invoice  ON Payments(InvoiceId);
GO

/* ---------- Seed data ---------- */
INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Staff');

INSERT INTO BusinessSettings (BusinessName, Address, StateCode, InvoicePrefix)
VALUES ('My Business', 'Navi Mumbai, Maharashtra', '27', 'INV');
GO

