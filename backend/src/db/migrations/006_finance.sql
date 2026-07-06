-- LinenFlow™ Database Schema
-- Migration 006: Finance — Expenses (รายจ่าย) + Invoices (ใบแจ้งหนี้)

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'materials', 'utilities', 'labor', 'rent', 'maintenance',
    'transportation', 'office_supplies', 'marketing', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash', 'bank_transfer', 'credit_card', 'cheque', 'promissory_note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS expense_number_seq;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

-- รายจ่าย
CREATE TABLE IF NOT EXISTS expenses (
  id             VARCHAR(50) PRIMARY KEY,
  expense_number VARCHAR(50) UNIQUE NOT NULL,
  category       expense_category NOT NULL,
  description    TEXT NOT NULL,
  amount         NUMERIC(14,2) NOT NULL DEFAULT 0,   -- ก่อน VAT
  vat_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,   -- รวม VAT
  branch_id      VARCHAR(50) NOT NULL REFERENCES branches(id),
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_date   DATE,
  supplier_id    VARCHAR(50),                        -- ยังไม่มี suppliers table -> ไม่ผูก FK
  job_order_id   VARCHAR(50) REFERENCES job_orders(id),
  notes          TEXT,
  recorded_by    VARCHAR(50) REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ใบแจ้งหนี้ (job_order_ids เก็บเป็น JSONB array ของ id)
CREATE TABLE IF NOT EXISTS invoices (
  id               VARCHAR(50) PRIMARY KEY,
  invoice_number   VARCHAR(50) UNIQUE NOT NULL,
  customer_id      VARCHAR(50) NOT NULL REFERENCES customers(id),
  branch_id        VARCHAR(50) NOT NULL REFERENCES branches(id),
  job_order_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal         NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_rate         NUMERIC(5,4) NOT NULL DEFAULT 0.07,
  vat_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  status           invoice_status NOT NULL DEFAULT 'issued',
  issued_date      DATE DEFAULT CURRENT_DATE,
  due_date         DATE,
  paid_date        DATE,
  paid_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  created_by       VARCHAR(50) REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_id ON invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
