import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { InvoiceModel, InvoiceStatus } from '../models/invoice';
import { branchScopeFor, canUseBranch } from '../utils/branchScope';

const STATUSES: InvoiceStatus[] = ['draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled'];

export async function listInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const status = req.query.status as InvoiceStatus | undefined;
    const customerId = req.query.customerId as string | undefined;
    if (status && !STATUSES.includes(status)) { res.status(400).json({ error: 'Bad Request', message: 'invalid status', code: 'INVALID_STATUS' }); return; }
    const invoices = await InvoiceModel.list(branchScopeFor(req.user!), { status, customerId });
    res.status(200).json({ invoices });
  } catch (error: any) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVOICES_ERROR' });
  }
}

export async function getInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const inv = await InvoiceModel.findById(req.params.id);
    if (!inv) { res.status(404).json({ error: 'Not Found', message: 'Invoice not found', code: 'INVOICE_NOT_FOUND' }); return; }
    if (!canUseBranch(req.user!, inv.branchId)) { res.status(403).json({ error: 'Forbidden', message: 'Access denied', code: 'BRANCH_ACCESS_DENIED' }); return; }
    res.status(200).json(inv);
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVOICE_ERROR' });
  }
}

export async function createInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body;
    if (!b.customerId || !b.branchId) { res.status(400).json({ error: 'Bad Request', message: 'customerId and branchId are required', code: 'INVALID_INPUT' }); return; }
    if (b.jobOrderIds && !Array.isArray(b.jobOrderIds)) { res.status(400).json({ error: 'Bad Request', message: 'jobOrderIds must be an array', code: 'INVALID_INPUT' }); return; }
    if (!canUseBranch(req.user!, b.branchId)) { res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' }); return; }
    const inv = await InvoiceModel.create(b, req.user!.id);
    res.status(201).json(inv);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    if (error.code === '23503') { res.status(400).json({ error: 'Bad Request', message: 'customerId or branchId does not exist', code: 'INVALID_REFERENCE' }); return; }
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVOICE_CREATE_ERROR' });
  }
}

async function loadWithAccess(req: AuthRequest, res: Response) {
  const inv = await InvoiceModel.findById(req.params.id);
  if (!inv) { res.status(404).json({ error: 'Not Found', message: 'Invoice not found', code: 'INVOICE_NOT_FOUND' }); return null; }
  if (!canUseBranch(req.user!, inv.branchId)) { res.status(403).json({ error: 'Forbidden', message: 'Access denied', code: 'BRANCH_ACCESS_DENIED' }); return null; }
  return inv;
}

export async function updateInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    const inv = await InvoiceModel.update(req.params.id, req.body);
    res.status(200).json(inv);
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVOICE_UPDATE_ERROR' });
  }
}

// PATCH /:id/payment { amount }
export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const amount = Number(req.body.amount);
    if (!(amount > 0)) { res.status(400).json({ error: 'Bad Request', message: 'amount must be a positive number', code: 'INVALID_AMOUNT' }); return; }
    if (!(await loadWithAccess(req, res))) return;
    const inv = await InvoiceModel.recordPayment(req.params.id, amount);
    res.status(200).json(inv);
  } catch (error: any) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'PAYMENT_ERROR' });
  }
}

// PATCH /:id/status { status }
export async function updateInvoiceStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body as { status: InvoiceStatus };
    if (!status || !STATUSES.includes(status)) { res.status(400).json({ error: 'Bad Request', message: `status must be one of: ${STATUSES.join(', ')}`, code: 'INVALID_STATUS' }); return; }
    if (!(await loadWithAccess(req, res))) return;
    const inv = await InvoiceModel.updateStatus(req.params.id, status);
    res.status(200).json(inv);
  } catch (error: any) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVOICE_STATUS_ERROR' });
  }
}

// DELETE /:id -> cancel
export async function cancelInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    const inv = await InvoiceModel.updateStatus(req.params.id, 'cancelled');
    res.status(200).json(inv);
  } catch (error: any) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'INVOICE_CANCEL_ERROR' });
  }
}
