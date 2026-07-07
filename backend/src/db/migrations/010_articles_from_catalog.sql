-- LinenFlow™ Migration 010: Seed ประเภทผ้า (linen_articles) จาก SKU catalog ของลูกค้า
-- 1 product (catalog_products ที่ active) = 1 article. ไม่รวมมิติ size/activity
-- (จัดการระดับชิ้นตอนลงทะเบียนผ้า) — ตรงกับที่ตกลงไว้: เอา 83 ประเภทหลัก
--
-- category ของ catalog เป็น core/extended/service/fixed_size ซึ่งไม่ตรงกับ enum
-- linen_category เชิงความหมาย จึง map แบบ best-effort จากชื่อไทย (แก้เพิ่มได้ในหน้า UI)
--
-- idempotent: ON CONFLICT (code) อัปเดตชื่อ/หมวด/สถานะ — รันซ้ำได้ปลอดภัย

INSERT INTO linen_articles
  (id, code, name, name_th, category, default_ownership, branch_id, is_active)
SELECT
  'art-cat-' || p.code,
  p.code,
  p.name_th,
  p.name_th,
  (CASE
    WHEN p.name_th LIKE '%ปลอกหมอน%' OR p.name_th LIKE '%ถุงหมอน%'          THEN 'pillow_case'
    WHEN p.name_th LIKE '%ผ้าปูที่นอน%' OR p.name_th LIKE '%คลุมเตียง%'
      OR p.name_th LIKE '%คาดเตียง%' OR p.name_th LIKE '%สเกิร์ตเตียง%'      THEN 'bed_sheet'
    WHEN p.name_th LIKE '%ปูโต๊ะ%' OR p.name_th LIKE '%คลุมโต๊ะ%'
      OR p.name_th LIKE '%สเกิร์ตโต๊ะ%'                                     THEN 'tablecloth'
    WHEN p.name_th LIKE '%Napkin%' OR p.name_th LIKE '%เช็ดปาก%'            THEN 'napkin'
    WHEN p.name_th LIKE '%ม่าน%'                                           THEN 'curtain'
    WHEN p.name_th LIKE '%กันเปื้อน%' OR p.name_th LIKE '%Apron%'           THEN 'apron'
    WHEN p.name_th LIKE '%นวม%' OR p.name_th LIKE '%ผ้าห่ม%'                THEN 'blanket'
    WHEN p.name_th LIKE '%เช็ด%'                                           THEN 'towel'
    WHEN p.name_th LIKE '%เสื้อ%' OR p.name_th LIKE '%กางเกง%'
      OR p.name_th LIKE '%ชุด%'                                            THEN 'uniform'
    ELSE 'other'
  END)::linen_category,
  'rental',
  NULL,
  p.is_active
FROM catalog_products p
WHERE p.is_active = true
ON CONFLICT (code) DO UPDATE SET
  name     = EXCLUDED.name,
  name_th  = EXCLUDED.name_th,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  updated_at = now();
