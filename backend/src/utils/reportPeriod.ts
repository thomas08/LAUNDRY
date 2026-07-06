// ============================================================
// ตัวช่วยคำนวณช่วงเวลา + เปอร์เซ็นต์การเปลี่ยนแปลง สำหรับรายงาน (PURE)
//   - ไม่มีการแตะ DB — Tester unit-test ฟังก์ชันเหล่านี้ตรงๆ
//   - ขอบเขตทั้งหมดเป็น UTC เพื่อความ deterministic (ทดสอบซ้ำได้)
//   - ทุกช่วงเป็นแบบครึ่งเปิด [start, end) : start รวม, end ไม่รวม
//   - prev = ช่วงก่อนหน้าที่ยาวเท่ากันตามปฏิทิน (วัน/สัปดาห์/เดือน/ไตรมาส/ปี ก่อนหน้า)
// ============================================================

export type ReportPeriod =
  | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export const VALID_PERIODS: ReportPeriod[] = [
  'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom',
];

// ช่วงเวลาที่คำนวณแล้ว: ช่วงปัจจุบัน + ช่วงก่อนหน้า (ทั้งคู่ครึ่งเปิด)
export interface PeriodRange {
  start: Date;      // รวม
  end: Date;        // ไม่รวม (exclusive)
  prevStart: Date;  // รวม
  prevEnd: Date;    // ไม่รวม (โดยปกติ prevEnd === start เพราะสองช่วงติดกัน)
}

// error ที่มี .code เพื่อให้ controller แปลงเป็น HTTP 400 ได้
export class ReportPeriodError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ReportPeriodError';
    this.code = code;
  }
}

// ต้นวัน (UTC) ของวันที่ที่ให้มา
function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// บวกวัน (UTC)
function addUTCDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

// parse 'YYYY-MM-DD' -> ต้นวัน UTC ; โยน error ถ้ารูปแบบผิด
function parseISODate(s: string, field: string): Date {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new ReportPeriodError('INVALID_DATE', `${field} must be an ISO date (YYYY-MM-DD)`);
  }
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new ReportPeriodError('INVALID_DATE', `${field} is not a valid date`);
  }
  return d;
}

/**
 * แปลง period (+ start/end กรณี custom) เป็นช่วงเวลาจริง { start, end, prevStart, prevEnd }
 *   now = จุดอ้างอิง "ตอนนี้" (ฉีดเข้ามาเพื่อทดสอบได้)
 *
 * นิยามขอบเขต (ทั้งหมด UTC, ครึ่งเปิด):
 *   daily     : วันนี้ 00:00 → พรุ่งนี้ 00:00        ; prev = เมื่อวาน
 *   weekly    : จันทร์ของสัปดาห์นี้ 00:00 → จันทร์ถัดไป (สัปดาห์เริ่มวันจันทร์แบบ ISO) ; prev = สัปดาห์ก่อน
 *   monthly   : วันที่ 1 ของเดือนนี้ → วันที่ 1 เดือนถัดไป ; prev = เดือนก่อน
 *   quarterly : ต้นไตรมาส → ต้นไตรมาสถัดไป            ; prev = ไตรมาสก่อน
 *   yearly    : 1 ม.ค. ปีนี้ → 1 ม.ค. ปีถัดไป           ; prev = ปีก่อน
 *   custom    : ต้อง start+end (YYYY-MM-DD, ปลายทางรวมวัน) ; prev = ช่วงยาวเท่ากันที่อยู่ก่อนหน้าติดกัน
 *
 * โยน ReportPeriodError:
 *   - INVALID_PERIOD ถ้า period ไม่รู้จัก
 *   - MISSING_DATES  ถ้า custom แต่ขาด start หรือ end
 *   - INVALID_DATE   ถ้า start/end รูปแบบผิด
 *   - INVALID_RANGE  ถ้า custom แล้ว end < start
 */
export function resolvePeriodRange(
  period: ReportPeriod,
  start?: string,
  end?: string,
  now: Date = new Date()
): PeriodRange {
  const today = startOfUTCDay(now);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();

  switch (period) {
    case 'daily': {
      const s = today;
      const e = addUTCDays(s, 1);
      return { start: s, end: e, prevStart: addUTCDays(s, -1), prevEnd: s };
    }
    case 'weekly': {
      // getUTCDay: 0=อาทิตย์..6=เสาร์ ; อยากให้จันทร์เป็นวันแรก
      const offsetToMonday = (today.getUTCDay() + 6) % 7;
      const s = addUTCDays(today, -offsetToMonday);
      const e = addUTCDays(s, 7);
      return { start: s, end: e, prevStart: addUTCDays(s, -7), prevEnd: s };
    }
    case 'monthly': {
      const s = new Date(Date.UTC(y, m, 1));
      const e = new Date(Date.UTC(y, m + 1, 1));
      const ps = new Date(Date.UTC(y, m - 1, 1));
      return { start: s, end: e, prevStart: ps, prevEnd: s };
    }
    case 'quarterly': {
      const qStartMonth = Math.floor(m / 3) * 3;
      const s = new Date(Date.UTC(y, qStartMonth, 1));
      const e = new Date(Date.UTC(y, qStartMonth + 3, 1));
      const ps = new Date(Date.UTC(y, qStartMonth - 3, 1));
      return { start: s, end: e, prevStart: ps, prevEnd: s };
    }
    case 'yearly': {
      const s = new Date(Date.UTC(y, 0, 1));
      const e = new Date(Date.UTC(y + 1, 0, 1));
      const ps = new Date(Date.UTC(y - 1, 0, 1));
      return { start: s, end: e, prevStart: ps, prevEnd: s };
    }
    case 'custom': {
      if (!start || !end) {
        throw new ReportPeriodError('MISSING_DATES', 'custom period requires both start and end');
      }
      const s = parseISODate(start, 'start');
      const endDay = parseISODate(end, 'end');
      if (endDay.getTime() < s.getTime()) {
        throw new ReportPeriodError('INVALID_RANGE', 'end must be on or after start');
      }
      // ปลายทางรวมวัน -> ทำให้เป็น exclusive โดยบวก 1 วัน
      const e = addUTCDays(endDay, 1);
      const len = e.getTime() - s.getTime();
      return { start: s, end: e, prevStart: new Date(s.getTime() - len), prevEnd: s };
    }
    default:
      throw new ReportPeriodError('INVALID_PERIOD', `unknown period: ${String(period)}`);
  }
}

/**
 * % การเปลี่ยนแปลงจาก previous -> current, ปัด 1 ตำแหน่ง
 *   กติกาหารด้วยศูนย์: previous เป็น 0 (หรือไม่ finite) -> คืน null (ไม่มีฐานเทียบ = N/A)
 *   ให้ UI แสดง "—" แทนค่าอนันต์/หลอกตา  (เช่น 0 -> 5 ไม่ควรเป็น +∞)
 *   ตัวอย่าง: pctChange(120, 100) === 20 ; pctChange(90, 100) === -10 ; pctChange(5, 0) === null
 */
export function pctChange(current: number, previous: number): number | null {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
  return Math.round(((c - p) / p) * 1000) / 10;
}
