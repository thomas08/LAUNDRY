import { query } from '../config/database';
import { BranchScope } from '../utils/branchScope';
import { PeriodRange, pctChange, ReportPeriod } from '../utils/reportPeriod';

// ============================================================
// รายงาน / วิเคราะห์ (READ-ONLY, aggregate ล้วน — ไม่มีตารางใหม่)
//   รวมยอดจากตารางที่มีอยู่: invoices, expenses, job_orders,
//   inventory_items, customers  โดย scope ตามสาขาที่ผู้ใช้เข้าถึงได้
//   pg คืน NUMERIC/COUNT มาเป็น string เสมอ -> Number() ทุกค่าก่อนคำนวณ/ส่งออก
// ============================================================

// สถานะ job order ที่ถือว่า "กำลังทำงานอยู่" (active) — ใช้กับ activeJobOrders + pending
const ACTIVE_JOB_STATUSES = [
  'pending', 'in_progress', 'washing', 'drying', 'ironing', 'quality_check',
];
// สถานะที่ถือว่าเสร็จงานแล้ว (นับ completionRate)
const COMPLETED_JOB_STATUSES = ['completed', 'delivered'];

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

// ---- ชนิดผลลัพธ์ (frontend api-module อ้างอิงรูปเดียวกัน) ----

// superset ของ DashboardMetrics (lib/types.ts) + ฟิลด์เสริมที่หน้า reports ต้องใช้
export interface ReportSummary {
  period: ReportPeriod;
  periodStart: string;      // ISO
  periodEnd: string;        // ISO (exclusive)
  prevPeriodStart: string;
  prevPeriodEnd: string;
  branchId: string | null;  // ระบุถ้า narrow ด้วย ?branchId ; null = ทุกสาขาที่เข้าถึงได้

  // รายได้ (invoices.total_amount, issued_date ในช่วง, ไม่รวม cancelled)
  totalRevenue: number;
  previousRevenue: number;
  revenueChange: number | null;

  // ต้นทุน (expenses.total_amount, payment_date ในช่วง)
  totalCosts: number;
  previousCosts: number;
  costsChange: number | null;

  // กำไร
  grossProfit: number;         // totalRevenue - totalCosts
  grossProfitMargin: number;   // % ของ totalRevenue (0 ถ้า revenue=0)

  // งาน/ปฏิบัติการ (job_orders)
  totalOrders: number;         // received_at ในช่วง, ไม่รวม cancelled
  ordersChange: number | null;
  itemsProcessed: number;      // SUM(item_count) ในช่วง
  itemsProcessedChange: number | null;
  completedOrders: number;     // status completed/delivered, received_at ในช่วง
  pendingOrders: number;       // status active, received_at ในช่วง
  activeJobOrders: number;     // snapshot ปัจจุบัน (status active, ไม่กรองวันที่)
  completionRate: number;      // completedOrders / totalOrders * 100
  onTimeDeliveryRate: number;  // ของที่ส่งมอบ(มี due_date) ในช่วง: % ที่ส่งทันกำหนด
  averageProcessingTime: number;       // ชม. เฉลี่ย completed_at-received_at (completed_at ในช่วง)
  averageProcessingTimeChange: number | null;
  averageOrderValue: number;   // SUM(total_price)/นับ ในช่วง (มูลค่างาน, ไม่ใช่ยอดบิล)

  // ลูกค้า
  totalCustomers: number;      // snapshot ปัจจุบัน (is_active)
  activeCustomers: number;     // ลูกค้าที่มี job order ในช่วง (distinct)
  newCustomers: number;        // customers.created_at ในช่วง
  returningCustomers: number;  // max(0, activeCustomers - newCustomers)
  customerRetentionRate: number; // returningCustomers / activeCustomers * 100

  // วัสดุสิ้นเปลือง (inventory_items — snapshot ปัจจุบัน)
  inventoryValue: number;      // SUM(current_stock * unit_cost)
  lowStockItems: number;       // 0 < current_stock <= reorder_point
  outOfStockItems: number;     // current_stock <= 0
  totalInventoryItems: number;
}

export interface SalesByServiceRow {
  serviceType: string;
  orderCount: number;
  revenue: number;
  percentage: number;  // % ของ revenue รวมทุกบริการ
}

export interface CostByCategoryRow {
  category: string;
  amount: number;
  count: number;
  percentage: number;  // % ของต้นทุนรวมทุกหมวด
}

// ---- helper: ผูก branch scope เข้ากับ WHERE ----
// คืน { clause, params } โดย clause = '' หรือ 'branch_id = ANY($n)' (ใช้ prefix ตาราง)
function scopeClause(scope: BranchScope, col: string, params: any[]): string {
  if (scope === 'all') return '';
  // scope.length === 0 จัดการก่อนเรียก (คืนค่าศูนย์ทั้งหมด)
  params.push(scope);
  return `${col} = ANY($${params.length})`;
}

// true ถ้า scope นี้ไม่มีสาขาให้ดูเลย (admin/user ที่ไม่มี branch) -> ผลลัพธ์เป็นศูนย์
function scopeIsEmpty(scope: BranchScope): boolean {
  return scope !== 'all' && scope.length === 0;
}

export class ReportModel {
  /**
   * สรุปตัวชี้วัดทั้งหมดสำหรับหน้า reports (DashboardMetrics + ฟิลด์เสริม)
   *   รันหลาย aggregate query (invoices / expenses / job_orders / customers / inventory_items)
   *   แล้วประกอบผล + คำนวณ % เปลี่ยนแปลงด้วย pctChange (กติกาหารศูนย์อยู่ในนั้น)
   */
  static async summary(
    scope: BranchScope,
    range: PeriodRange,
    period: ReportPeriod,
    branchId: string | null
  ): Promise<ReportSummary> {
    const S = range.start.toISOString();
    const E = range.end.toISOString();
    const PS = range.prevStart.toISOString();
    const PE = range.prevEnd.toISOString();

    const base: ReportSummary = {
      period, periodStart: S, periodEnd: E, prevPeriodStart: PS, prevPeriodEnd: PE, branchId,
      totalRevenue: 0, previousRevenue: 0, revenueChange: null,
      totalCosts: 0, previousCosts: 0, costsChange: null,
      grossProfit: 0, grossProfitMargin: 0,
      totalOrders: 0, ordersChange: null, itemsProcessed: 0, itemsProcessedChange: null,
      completedOrders: 0, pendingOrders: 0, activeJobOrders: 0,
      completionRate: 0, onTimeDeliveryRate: 0,
      averageProcessingTime: 0, averageProcessingTimeChange: null, averageOrderValue: 0,
      totalCustomers: 0, activeCustomers: 0, newCustomers: 0, returningCustomers: 0,
      customerRetentionRate: 0,
      inventoryValue: 0, lowStockItems: 0, outOfStockItems: 0, totalInventoryItems: 0,
    };
    // admin/user ที่ไม่มีสาขา -> ทุกค่าเป็นศูนย์
    if (scopeIsEmpty(scope)) return base;

    // ---- 1) รายได้ (invoices) ----
    {
      const params: any[] = [S, E, PS, PE];
      const sc = scopeClause(scope, 'branch_id', params);
      const where = ["status <> 'cancelled'", sc].filter(Boolean).join(' AND ');
      const rows = await query<{ current: string; previous: string }>(
        `SELECT
           COALESCE(SUM(total_amount) FILTER (WHERE issued_date >= $1 AND issued_date < $2), 0) AS current,
           COALESCE(SUM(total_amount) FILTER (WHERE issued_date >= $3 AND issued_date < $4), 0) AS previous
         FROM invoices
         WHERE ${where}`,
        params
      );
      base.totalRevenue = round2(Number(rows[0].current));
      base.previousRevenue = round2(Number(rows[0].previous));
    }

    // ---- 2) ต้นทุน (expenses) ----
    {
      const params: any[] = [S, E, PS, PE];
      const sc = scopeClause(scope, 'branch_id', params);
      const where = sc ? sc : 'TRUE';
      const rows = await query<{ current: string; previous: string }>(
        `SELECT
           COALESCE(SUM(total_amount) FILTER (WHERE payment_date >= $1 AND payment_date < $2), 0) AS current,
           COALESCE(SUM(total_amount) FILTER (WHERE payment_date >= $3 AND payment_date < $4), 0) AS previous
         FROM expenses
         WHERE ${where}`,
        params
      );
      base.totalCosts = round2(Number(rows[0].current));
      base.previousCosts = round2(Number(rows[0].previous));
    }

    // ---- 3) งาน/ปฏิบัติการ (job_orders) ----
    {
      const params: any[] = [S, E, PS, PE];
      const sc = scopeClause(scope, 'branch_id', params);
      const where = sc ? sc : 'TRUE';
      const active = ACTIVE_JOB_STATUSES.map((s) => `'${s}'`).join(',');
      const done = COMPLETED_JOB_STATUSES.map((s) => `'${s}'`).join(',');
      const rows = await query<any>(
        `SELECT
           COUNT(*) FILTER (WHERE received_at >= $1 AND received_at < $2 AND status <> 'cancelled') AS total_orders,
           COUNT(*) FILTER (WHERE received_at >= $3 AND received_at < $4 AND status <> 'cancelled') AS prev_orders,
           COALESCE(SUM(item_count) FILTER (WHERE received_at >= $1 AND received_at < $2 AND status <> 'cancelled'), 0) AS items,
           COALESCE(SUM(item_count) FILTER (WHERE received_at >= $3 AND received_at < $4 AND status <> 'cancelled'), 0) AS prev_items,
           COUNT(*) FILTER (WHERE received_at >= $1 AND received_at < $2 AND status IN (${done})) AS completed,
           COUNT(*) FILTER (WHERE received_at >= $1 AND received_at < $2 AND status IN (${active})) AS pending,
           COUNT(*) FILTER (WHERE status IN (${active})) AS active_now,
           COALESCE(SUM(total_price) FILTER (WHERE received_at >= $1 AND received_at < $2 AND status <> 'cancelled'), 0) AS revenue_orders,
           COUNT(DISTINCT customer_id) FILTER (WHERE received_at >= $1 AND received_at < $2 AND status <> 'cancelled') AS active_customers,
           COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - received_at)) / 3600.0)
             FILTER (WHERE completed_at IS NOT NULL AND completed_at >= $1 AND completed_at < $2 AND status <> 'cancelled'), 0) AS avg_proc,
           COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - received_at)) / 3600.0)
             FILTER (WHERE completed_at IS NOT NULL AND completed_at >= $3 AND completed_at < $4 AND status <> 'cancelled'), 0) AS prev_avg_proc,
           COUNT(*) FILTER (WHERE delivered_at IS NOT NULL AND delivered_at >= $1 AND delivered_at < $2 AND due_date IS NOT NULL) AS delivered_cnt,
           COUNT(*) FILTER (WHERE delivered_at IS NOT NULL AND delivered_at >= $1 AND delivered_at < $2 AND due_date IS NOT NULL AND delivered_at <= due_date) AS ontime_cnt
         FROM job_orders
         WHERE ${where}`,
        params
      );
      const r = rows[0];
      base.totalOrders = Number(r.total_orders);
      base.itemsProcessed = Number(r.items);
      base.completedOrders = Number(r.completed);
      base.pendingOrders = Number(r.pending);
      base.activeJobOrders = Number(r.active_now);
      base.activeCustomers = Number(r.active_customers);
      base.averageProcessingTime = round1(Number(r.avg_proc));
      base.averageProcessingTimeChange = pctChange(Number(r.avg_proc), Number(r.prev_avg_proc));
      base.ordersChange = pctChange(Number(r.total_orders), Number(r.prev_orders));
      base.itemsProcessedChange = pctChange(Number(r.items), Number(r.prev_items));

      const revenueOrders = Number(r.revenue_orders);
      base.averageOrderValue = base.totalOrders > 0 ? round2(revenueOrders / base.totalOrders) : 0;
      base.completionRate = base.totalOrders > 0
        ? round1((base.completedOrders / base.totalOrders) * 100) : 0;
      const deliveredCnt = Number(r.delivered_cnt);
      base.onTimeDeliveryRate = deliveredCnt > 0
        ? round1((Number(r.ontime_cnt) / deliveredCnt) * 100) : 0;
    }

    // ---- 4) ลูกค้า (customers) ----
    {
      const params: any[] = [S, E];
      const sc = scopeClause(scope, 'branch_id', params);
      const where = ['is_active = true', sc].filter(Boolean).join(' AND ');
      const rows = await query<{ total: string; new_cust: string }>(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2) AS new_cust
         FROM customers
         WHERE ${where}`,
        params
      );
      base.totalCustomers = Number(rows[0].total);
      base.newCustomers = Number(rows[0].new_cust);
      base.returningCustomers = Math.max(0, base.activeCustomers - base.newCustomers);
      base.customerRetentionRate = base.activeCustomers > 0
        ? round1((base.returningCustomers / base.activeCustomers) * 100) : 0;
    }

    // ---- 5) วัสดุสิ้นเปลือง (inventory_items — snapshot ปัจจุบัน) ----
    {
      const params: any[] = [];
      const sc = scopeClause(scope, 'branch_id', params);
      const where = ['is_active = true', sc].filter(Boolean).join(' AND ');
      const rows = await query<any>(
        `SELECT
           COALESCE(SUM(current_stock * unit_cost), 0) AS inv_value,
           COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= reorder_point) AS low,
           COUNT(*) FILTER (WHERE current_stock <= 0) AS oos,
           COUNT(*) AS total_items
         FROM inventory_items
         WHERE ${where}`,
        params
      );
      base.inventoryValue = round2(Number(rows[0].inv_value));
      base.lowStockItems = Number(rows[0].low);
      base.outOfStockItems = Number(rows[0].oos);
      base.totalInventoryItems = Number(rows[0].total_items);
    }

    // ---- คำนวณอนุพันธ์ ----
    base.grossProfit = round2(base.totalRevenue - base.totalCosts);
    base.grossProfitMargin = base.totalRevenue > 0
      ? round1((base.grossProfit / base.totalRevenue) * 100) : 0;
    base.revenueChange = pctChange(base.totalRevenue, base.previousRevenue);
    base.costsChange = pctChange(base.totalCosts, base.previousCosts);

    return base;
  }

  /**
   * ยอดขาย + จำนวนงาน แยกตามประเภทบริการ (job_orders.service_type)
   *   ใช้ received_at ในช่วง, ไม่รวม cancelled ; percentage = % ของ revenue รวม
   *   เลือก job_orders (ไม่ใช่ invoices) เพราะ invoices ไม่มี service_type
   */
  static async salesByService(scope: BranchScope, range: PeriodRange): Promise<SalesByServiceRow[]> {
    if (scopeIsEmpty(scope)) return [];
    const params: any[] = [range.start.toISOString(), range.end.toISOString()];
    const sc = scopeClause(scope, 'branch_id', params);
    const where = ["status <> 'cancelled'", 'received_at >= $1', 'received_at < $2', sc]
      .filter(Boolean).join(' AND ');
    const rows = await query<any>(
      `SELECT service_type AS "serviceType",
              COUNT(*) AS "orderCount",
              COALESCE(SUM(total_price), 0) AS "revenue"
         FROM job_orders
        WHERE ${where}
        GROUP BY service_type
        ORDER BY "revenue" DESC`,
      params
    );
    const total = rows.reduce((acc, r) => acc + Number(r.revenue), 0);
    return rows.map((r) => ({
      serviceType: r.serviceType,
      orderCount: Number(r.orderCount),
      revenue: round2(Number(r.revenue)),
      percentage: total > 0 ? round1((Number(r.revenue) / total) * 100) : 0,
    }));
  }

  /**
   * ต้นทุนแยกตามหมวด (expenses.category), payment_date ในช่วง
   *   percentage = % ของต้นทุนรวมทุกหมวด
   */
  static async costByCategory(scope: BranchScope, range: PeriodRange): Promise<CostByCategoryRow[]> {
    if (scopeIsEmpty(scope)) return [];
    const params: any[] = [range.start.toISOString(), range.end.toISOString()];
    const sc = scopeClause(scope, 'branch_id', params);
    const where = ['payment_date >= $1', 'payment_date < $2', sc].filter(Boolean).join(' AND ');
    const rows = await query<any>(
      `SELECT category,
              COALESCE(SUM(total_amount), 0) AS amount,
              COUNT(*) AS count
         FROM expenses
        WHERE ${where}
        GROUP BY category
        ORDER BY amount DESC`,
      params
    );
    const total = rows.reduce((acc, r) => acc + Number(r.amount), 0);
    return rows.map((r) => ({
      category: r.category,
      amount: round2(Number(r.amount)),
      count: Number(r.count),
      percentage: total > 0 ? round1((Number(r.amount) / total) * 100) : 0,
    }));
  }
}
