-- LinenFlow™ Database Schema
-- Migration 004: Customers module
--
-- ลูกค้าของโรงซัก: โรงแรม / โรงพยาบาล / รีสอร์ท / ร้านอาหาร / ลูกค้าทั่วไป (รับหน้าร้าน)
-- หมายเหตุ: ยังไม่บังคับ FK จาก linen_items.customer_id -> customers(id) เพราะข้อมูลเดิม
--   อาจมี customer_id ที่ยังไม่มีใน customers (จะทำให้ migration ที่ re-run พังได้)
--   ผูก FK ทีหลังเมื่อมั่นใจว่าข้อมูลสะอาดแล้ว

DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM (
    'hotel',      -- โรงแรม
    'hospital',   -- โรงพยาบาล
    'resort',     -- รีสอร์ท
    'restaurant', -- ร้านอาหาร
    'individual', -- ลูกค้าทั่วไป / รับหน้าร้าน
    'other'       -- อื่นๆ
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customers (
  id              VARCHAR(50) PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  contact_person  VARCHAR(255),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  address         TEXT,
  customer_type   customer_type NOT NULL DEFAULT 'other',
  tax_id          VARCHAR(50),
  credit_limit    NUMERIC(14,2),
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_terms   INT,                              -- เครดิตกี่วัน
  branch_id       VARCHAR(50) NOT NULL REFERENCES branches(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);

-- reuse ฟังก์ชัน trigger updated_at เดิม
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
