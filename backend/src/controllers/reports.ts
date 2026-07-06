import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ReportModel } from '../models/report';
import { branchScopeFor, canUseBranch, BranchScope } from '../utils/branchScope';
import {
  resolvePeriodRange,
  ReportPeriod,
  ReportPeriodError,
  VALID_PERIODS,
  PeriodRange,
} from '../utils/reportPeriod';

// ============================================================
// รายงาน (read-only aggregate) — ทุก endpoint ต้อง view_reports
//   1) validate period (+ start/end กรณี custom)
//   2) resolve branch scope: ถ้ามี ?branchId ต้องเป็นสาขาที่เข้าถึงได้ (มิฉะนั้น 403)
//      ถ้าไม่ระบุ -> รวมทุกสาขาที่ผู้ใช้เข้าถึงได้ (branchScopeFor)
// ============================================================

interface ResolvedContext {
  scope: BranchScope;
  range: PeriodRange;
  period: ReportPeriod;
  branchId: string | null;
}

// แปลง query -> context ; ส่ง response error เองแล้วคืน null ถ้าไม่ผ่าน
function resolveContext(req: AuthRequest, res: Response): ResolvedContext | null {
  const period = (req.query.period as ReportPeriod) || 'monthly';
  if (!VALID_PERIODS.includes(period)) {
    res.status(400).json({
      error: 'Bad Request',
      message: `period must be one of: ${VALID_PERIODS.join(', ')}`,
      code: 'INVALID_PERIOD',
    });
    return null;
  }

  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;

  let range: PeriodRange;
  try {
    range = resolvePeriodRange(period, start, end);
  } catch (e: any) {
    if (e instanceof ReportPeriodError) {
      res.status(400).json({ error: 'Bad Request', message: e.message, code: e.code });
      return null;
    }
    throw e;
  }

  // branch scope: narrow ด้วย ?branchId ถ้าเข้าถึงได้
  const branchId = (req.query.branchId as string | undefined) || null;
  let scope: BranchScope;
  if (branchId) {
    if (!canUseBranch(req.user!, branchId)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this branch',
        code: 'BRANCH_ACCESS_DENIED',
      });
      return null;
    }
    scope = [branchId];
  } else {
    scope = branchScopeFor(req.user!);
  }

  return { scope, range, period, branchId };
}

// GET /v1/reports/summary?period=&start=&end=&branchId=
export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const ctx = resolveContext(req, res);
    if (!ctx) return;
    const summary = await ReportModel.summary(ctx.scope, ctx.range, ctx.period, ctx.branchId);
    res.status(200).json(summary);
  } catch (error: any) {
    console.error('Report summary error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'REPORT_SUMMARY_ERROR' });
  }
}

// GET /v1/reports/sales-by-service?period=&start=&end=&branchId=
export async function getSalesByService(req: AuthRequest, res: Response): Promise<void> {
  try {
    const ctx = resolveContext(req, res);
    if (!ctx) return;
    const rows = await ReportModel.salesByService(ctx.scope, ctx.range);
    res.status(200).json({ salesByService: rows });
  } catch (error: any) {
    console.error('Sales by service error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'REPORT_SALES_ERROR' });
  }
}

// GET /v1/reports/cost-by-category?period=&start=&end=&branchId=
export async function getCostByCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const ctx = resolveContext(req, res);
    if (!ctx) return;
    const rows = await ReportModel.costByCategory(ctx.scope, ctx.range);
    res.status(200).json({ costByCategory: rows });
  } catch (error: any) {
    console.error('Cost by category error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'REPORT_COST_ERROR' });
  }
}
