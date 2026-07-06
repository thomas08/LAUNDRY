import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ExpenseModel, ExpenseCategory, PaymentMethod } from '../models/expense';
import { branchScopeFor, canUseBranch } from '../utils/branchScope';

const CATEGORIES: ExpenseCategory[] = [
  'materials', 'utilities', 'labor', 'rent', 'maintenance',
  'transportation', 'office_supplies', 'marketing', 'other',
];
const METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'credit_card', 'cheque', 'promissory_note'];

export async function listExpenses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const category = req.query.category as ExpenseCategory | undefined;
    const paymentMethod = req.query.paymentMethod as PaymentMethod | undefined;
    if (category && !CATEGORIES.includes(category)) { res.status(400).json({ error: 'Bad Request', message: 'invalid category', code: 'INVALID_CATEGORY' }); return; }
    const expenses = await ExpenseModel.list(branchScopeFor(req.user!), { category, paymentMethod });
    res.status(200).json({ expenses });
  } catch (error: any) {
    console.error('List expenses error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'EXPENSES_ERROR' });
  }
}

export async function createExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body;
    if (!b.category || !CATEGORIES.includes(b.category)) { res.status(400).json({ error: 'Bad Request', message: 'valid category is required', code: 'INVALID_CATEGORY' }); return; }
    if (!b.description || !b.branchId) { res.status(400).json({ error: 'Bad Request', message: 'description and branchId are required', code: 'INVALID_INPUT' }); return; }
    if (b.paymentMethod && !METHODS.includes(b.paymentMethod)) { res.status(400).json({ error: 'Bad Request', message: 'invalid paymentMethod', code: 'INVALID_PAYMENT_METHOD' }); return; }
    if (!canUseBranch(req.user!, b.branchId)) { res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' }); return; }
    const expense = await ExpenseModel.create(b, req.user!.id);
    res.status(201).json(expense);
  } catch (error: any) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'EXPENSE_CREATE_ERROR' });
  }
}

async function loadWithAccess(req: AuthRequest, res: Response) {
  const e = await ExpenseModel.findById(req.params.id);
  if (!e) { res.status(404).json({ error: 'Not Found', message: 'Expense not found', code: 'EXPENSE_NOT_FOUND' }); return null; }
  if (!canUseBranch(req.user!, e.branchId)) { res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' }); return null; }
  return e;
}

export async function updateExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    if (req.body.category && !CATEGORIES.includes(req.body.category)) { res.status(400).json({ error: 'Bad Request', message: 'invalid category', code: 'INVALID_CATEGORY' }); return; }
    const e = await ExpenseModel.update(req.params.id, req.body);
    res.status(200).json(e);
  } catch (error: any) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'EXPENSE_UPDATE_ERROR' });
  }
}

export async function deleteExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!(await loadWithAccess(req, res))) return;
    await ExpenseModel.remove(req.params.id);
    res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'EXPENSE_DELETE_ERROR' });
  }
}
