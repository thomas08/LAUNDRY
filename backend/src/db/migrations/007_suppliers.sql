-- LinenFlow™ Database Schema
-- Migration 007: Suppliers (ผู้จัดจำหน่าย) — ผู้ขายวัสดุ / เคมี / บริการให้โรงซัก
--
-- การตัดสินใจเรื่องขอบเขต (scope):
--   suppliers เป็น "ระดับองค์กร" (org-global) *ไม่* ผูกกับสาขา ต่างจาก customers
--   ที่ scope ตามสาขา เพราะผู้จัดจำหน่ายมักใช้ร่วมกันทุกสาขา และ type `Supplier`
--   ใน lib/types.ts ไม่มี branchId
--   -> ตารางนี้จึงไม่มีคอลัมน์ branch_id และ RBAC คุมด้วย permission เท่านั้น
--      (read/create/update/delete) โดยไม่มีการตรวจสิทธิ์ระดับสาขา

-- ลำดับเลขรหัสผู้จัดจำหน่าย (ใช้ต่อท้าย SUP-) เช่น SUP-0001
CREATE SEQUENCE IF NOT EXISTS supplier_number_seq;

CREATE TABLE IF NOT EXISTS suppliers (
  id             VARCHAR(50) PRIMARY KEY,
  code           VARCHAR(50) UNIQUE NOT NULL,   -- รหัสผู้จัดจำหน่าย เช่น SUP-0001 (จาก sequence)
  name           VARCHAR(255) NOT NULL,          -- ชื่อบริษัท (default / ชื่อหลัก)
  name_th        VARCHAR(255),                   -- ชื่อภาษาไทย
  name_en        VARCHAR(255),                   -- ชื่อภาษาอังกฤษ
  contact_person VARCHAR(255),
  email          VARCHAR(255),
  phone          VARCHAR(50),
  address        TEXT,
  tax_id         VARCHAR(50),                    -- เลขประจำตัวผู้เสียภาษี
  payment_terms  INT,                            -- เครดิต (วัน)
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);

-- reuse ฟังก์ชัน trigger updated_at เดิม (นิยามใน schema.sql)
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ผูก FK expenses.supplier_id -> suppliers(id)
--   migration 006 (finance) ยังไม่ผูก FK นี้ เพราะตอนนั้น suppliers ยังไม่มี
--   expenses เป็นตารางใหม่ ข้อมูลจริงยังว่าง/สะอาด จึงเพิ่ม FK ได้อย่างปลอดภัย
--   หมายเหตุ (data-cleanliness): ถ้ามี expenses.supplier_id ที่ไม่ตรงกับ suppliers.id
--     อยู่ก่อน คำสั่งนี้จะ error (foreign_key_violation) ต้องล้างข้อมูลให้สะอาดก่อน
--   เขียนแบบ idempotent: กัน duplicate_object ตอน re-run migration
DO $$ BEGIN
  ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;   -- constraint มีอยู่แล้ว (re-run) -> ข้าม
END $$;
