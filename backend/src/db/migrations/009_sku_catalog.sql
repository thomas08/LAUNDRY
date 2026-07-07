-- LinenFlow™ Migration 009: Customer SKU Catalog (จากไฟล์ COA.xlsx ของลูกค้า)
-- SKU ประกอบจาก: product_code + size_code + activity_code (เก็บแยก ประกอบตอนแสดงผล)
-- หมายเหตุ: activity 'n/a' (ซัก อบ รีด) = default ไม่มี suffix ในรหัส SKU
--           size ว่าง = Default มาตรฐาน ไม่มี suffix เช่นกัน

CREATE TABLE IF NOT EXISTS catalog_products (
  code       VARCHAR(10) PRIMARY KEY,
  name_th    VARCHAR(200) NOT NULL,
  category   VARCHAR(20) NOT NULL CHECK (category IN ('core','extended','service','fixed_size')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_sizes (
  code       VARCHAR(10) PRIMARY KEY,   -- '' = Default
  name_th    VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog_activities (
  code       VARCHAR(10) PRIMARY KEY,   -- '' = Default (ซัก อบ รีด)
  name_th    VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

-- ===== Products (86 รายการ) =====
INSERT INTO catalog_products (code, name_th, category, is_active) VALUES
  ('1','ผ้าเช็ดตัว','core',true),
  ('2','ผ้าเช็ดมือ','core',true),
  ('3','ผ้าเช็ดหน้า','core',true),
  ('4','ผ้าเช็ดเท้า','core',true),
  ('5','ปลอกหมอน','core',true),
  ('6','ผ้าปูที่นอน ใหญ่','core',true),
  ('7','ผ้าปูที่นอน เล็ก','core',true),
  ('8','ปลอกนวม ใหญ่','core',true),
  ('9','ปลอกนวม เล็ก','core',true),
  ('10','ผ้านวม ใหญ่','core',true),
  ('11','ผ้านวม เล็ก','core',true),
  ('12','ผ้ากันเปื้อน ใหญ่','core',true),
  ('13','ผ้ากันเปื้อน เล็ก','core',true),
  ('14','ผ้าเช็ดตัวสระน้ำ','core',true),
  ('15','ผ้าเช็ดหน้าสระน้ำ','core',true),
  ('16','เสื้อคลุม','core',true),
  ('17','ปลอกหมอนอิง','core',true),
  ('18','หมอน','core',true),
  ('19','ผ้าม่านโปร่ง','core',true),
  ('20','ผ้าม่านทึบ','core',true),
  ('21','ผ้าปูโต๊ะ','core',true),
  ('22','ผ้าคลุมเก้าอี้','core',true),
  ('23','สเกิร์ตโต๊ะ','core',true),
  ('A00','รวม','extended',true),
  ('A01','ไส้นวม','extended',true),
  ('A02','ผ้าห่ม','extended',true),
  ('A03','โบว์','extended',true),
  ('A04','กันเปื้อนหมอน','extended',true),
  ('A06','ผ้าปูที่นอน','extended',true),
  ('A07','Napkin','extended',true),
  ('A08','ปลอกนวม','extended',true),
  ('A09','ผ้าคลุมเตียง','extended',true),
  ('A10','ผ้าคลุมโต๊ะ','extended',true),
  ('A11','ผ้าคลุมโซฟา','extended',true),
  ('A12','รองกันเปื้อน','extended',true),
  ('A13','Topper','extended',true),
  ('A14','ผ้าคาดเตียง','extended',true),
  ('A15','ผ้าห่มขนหนู','extended',true),
  ('A16','Slipper','extended',true),
  ('A17','ผ้าขี้ริ้ว','extended',true),
  ('A18','หมอนอิง','extended',true),
  ('A19','สเกิร์ตเตียง','extended',true),
  ('A20','ผ้าม่านกั้นฉาก','extended',true),
  ('A21','ปลอกหมอนข้าง','extended',true),
  ('A22','หมอนข้าง','extended',true),
  ('A23','ถุงหมอน','extended',true),
  ('A24','เสื้อพร้อมสกรีน','extended',true),
  ('A25','เสื้อพนักงาน','extended',true),
  ('A26','ชุดนวด','extended',true),
  ('A27','เสื้อ','extended',true),
  ('A28','กางเกง','extended',true),
  ('A29','ผ้าถุง','extended',true),
  ('A30','ถุงผ้า','extended',true),
  ('A31','ปลอกโซฟา','extended',true),
  ('A32','ผ้ารองแก้ว','extended',true),
  ('A33','ผ้ารองรีด','extended',true),
  ('A34','ผ้ารองโซฟา','extended',true),
  ('A35','เบาะรองนั่ง','extended',true),
  ('A36','เบาะโซฟา','extended',true),
  ('A37','ปลอกเบาะ','extended',true),
  ('A38','พรมเช็ดเท้า','extended',true),
  ('A39','พรมปูพื้น','extended',true),
  ('A40','ฟูก','extended',true),
  ('A41','ที่นอนสัตว์เลี้ยง','extended',true),
  ('A42','มุ้ง','extended',true),
  ('A43','เปล','extended',true),
  ('A44','ตุ๊กตา','extended',true),
  ('A45','ธง','extended',true),
  ('A46','ผ้าขาวบาง','extended',true),
  ('A47','ผ้าเขียว','extended',true),
  ('A48','ผ้ากันเปื้อน Apron','extended',true),
  ('A49','-','extended',false),
  ('A50','-','extended',false),
  ('B01','ค่าซ่อม','service',true),
  ('R7','ผ้าปูที่นอน เล็ก 100 x 110','fixed_size',true),
  ('R9','ปลอกนวม เล็ก 76 x 96','fixed_size',true),
  ('R6','ผ้าปูที่นอน ใหญ่ 110 x 110','fixed_size',true),
  ('R8','ปลอกนวม ใหญ่ 99 x 91','fixed_size',true),
  ('R6L','ผ้าปูที่นอน ใหญ่ 120 x 120','fixed_size',true),
  ('R8L','ปลอกนวม ใหญ่ 120 x 120','fixed_size',true),
  ('R5L','ปลอกหมอน ใหญ่ 21 x 34','fixed_size',true),
  ('R1','ผ้าเช็ดตัว 32 x 59 x 315','fixed_size',true),
  ('R3','ผ้าเช็ดหน้า 16 x 32 x 71','fixed_size',true),
  ('R4','ผ้าเช็ดเท้า 20 x 31 x 157','fixed_size',true),
  ('R5S','ปลอกหมอน เล็ก 19 x 29','fixed_size',true)
ON CONFLICT (code) DO UPDATE SET name_th=EXCLUDED.name_th, category=EXCLUDED.category, is_active=EXCLUDED.is_active;

-- ===== Sizes =====
INSERT INTO catalog_sizes (code, name_th, sort_order) VALUES
  ('','มาตรฐาน (Default)',0),
  ('S','เล็ก',1),
  ('M','กลาง',2),
  ('L','ใหญ่',3),
  ('XL','ใหญ่พิเศษ',4),
  ('C','สี',5),
  ('B','เด็ก',6),
  ('P','สัตว์เลี้ยง',7),
  ('F3','3 ฟุต',8),
  ('F5','5 ฟุต',9),
  ('F6','6 ฟุต',10)
ON CONFLICT (code) DO UPDATE SET name_th=EXCLUDED.name_th, sort_order=EXCLUDED.sort_order;

-- ===== Activities =====
INSERT INTO catalog_activities (code, name_th, sort_order) VALUES
  ('','ซัก อบ รีด (Default)',0),
  ('w','ซัก',1),
  ('d','อบ',2),
  ('i','รีด',3),
  ('sp','กำจัดพิเศษ',4)
ON CONFLICT (code) DO UPDATE SET name_th=EXCLUDED.name_th, sort_order=EXCLUDED.sort_order;

-- ===== Helper: view ประกอบ SKU เต็ม (product x size x activity ทุก combination ที่ active) =====
-- ใช้สำหรับ lookup/validate ตอนรับผ้า — ตัวรหัสจริงเก็บแยก 3 ส่วนเสมอ
CREATE OR REPLACE VIEW v_sku_catalog AS
SELECT
  p.code || s.code || a.code                        AS sku,
  p.code  AS product_code,  p.name_th AS product_name,
  s.code  AS size_code,     s.name_th AS size_name,
  a.code  AS activity_code, a.name_th AS activity_name,
  p.name_th
    || CASE WHEN s.code <> '' THEN ' ' || s.name_th ELSE '' END
    || CASE WHEN a.code <> '' THEN ' - ' || a.name_th ELSE '' END AS display_name,
  p.category
FROM catalog_products p
CROSS JOIN catalog_sizes s
CROSS JOIN catalog_activities a
WHERE p.is_active = true
  -- กฎสำคัญ: สินค้ากลุ่ม fixed_size (R-series) ระบุขนาดในชื่ออยู่แล้ว ห้ามผสม Size Code
  -- ไม่งั้นรหัสชนกัน เช่น 'R6L' = สินค้า R6L (120x120) vs R6 (110x110) + ไซส์ L
  AND NOT (p.category = 'fixed_size' AND s.code <> '');
