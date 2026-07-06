-- LinenFlow™ Database Schema
-- Migration 005: Job Orders (ใบสั่งงาน) — งานซัก/บริการต่อลูกค้า

DO $$ BEGIN
  CREATE TYPE job_order_status AS ENUM (
    'pending',        -- รอดำเนินการ
    'in_progress',    -- กำลังดำเนินการ
    'washing',        -- กำลังซัก
    'drying',         -- กำลังอบ
    'ironing',        -- กำลังรีด
    'quality_check',  -- ตรวจสอบคุณภาพ
    'completed',      -- เสร็จสิ้น
    'delivered',      -- ส่งมอบแล้ว
    'cancelled'       -- ยกเลิก
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_type AS ENUM (
    'wash_fold',  -- ซักพับ
    'dry_clean',  -- ซักแห้ง
    'iron_only',  -- รีดอย่างเดียว
    'wash_iron',  -- ซักและรีด
    'express'     -- บริการด่วน
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ลำดับเลขที่ใบสั่งงาน (ใช้ต่อท้าย JO-YYYY-)
CREATE SEQUENCE IF NOT EXISTS job_order_number_seq;

-- customers table มีแล้ว (migration 004) -> ผูก FK customer_id ได้จริง
CREATE TABLE IF NOT EXISTS job_orders (
  id                 VARCHAR(50) PRIMARY KEY,
  order_number       VARCHAR(50) UNIQUE NOT NULL,
  customer_id        VARCHAR(50) NOT NULL REFERENCES customers(id),
  branch_id          VARCHAR(50) NOT NULL REFERENCES branches(id),
  service_type       service_type NOT NULL,
  status             job_order_status NOT NULL DEFAULT 'pending',
  weight             NUMERIC(10,2) NOT NULL DEFAULT 0,   -- น้ำหนัก (kg)
  item_count         INT NOT NULL DEFAULT 0,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date           TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  service_price      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- ราคาต่อหน่วย (บาท/kg)
  additional_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  assigned_to        VARCHAR(50) REFERENCES users(id),
  created_by         VARCHAR(50) REFERENCES users(id),
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_orders_customer_id ON job_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_branch_id ON job_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);

DROP TRIGGER IF EXISTS update_job_orders_updated_at ON job_orders;
CREATE TRIGGER update_job_orders_updated_at BEFORE UPDATE ON job_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
