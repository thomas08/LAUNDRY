import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CustomerModel, CustomerInput, CustomerType } from '../models/customer';
import { branchScopeFor, canUseBranch } from '../utils/branchScope';

const VALID_TYPES: CustomerType[] = [
  'hotel', 'hospital', 'resort', 'restaurant', 'individual', 'other',
];

// GET /v1/customers?includeInactive=true — scoped to the caller's branches
export async function listCustomers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const scope = branchScopeFor(req.user!);
    const customers = await CustomerModel.list(scope, includeInactive);
    res.status(200).json({ customers });
  } catch (error: any) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'CUSTOMERS_ERROR' });
  }
}

// GET /v1/customers/:id
export async function getCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const customer = await CustomerModel.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ error: 'Not Found', message: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
      return;
    }
    // กันข้ามสาขา
    if (!canUseBranch(req.user!, customer.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    res.status(200).json(customer);
  } catch (error: any) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'CUSTOMER_ERROR' });
  }
}

function validate(body: any, partial: boolean): string | null {
  if (!partial || 'name' in body) {
    if (!body.name || typeof body.name !== 'string') return 'name is required';
  }
  if (!partial || 'branchId' in body) {
    if (!body.branchId || typeof body.branchId !== 'string') return 'branchId is required';
  }
  if ('customerType' in body && body.customerType != null && !VALID_TYPES.includes(body.customerType)) {
    return `customerType must be one of: ${VALID_TYPES.join(', ')}`;
  }
  return null;
}

// POST /v1/customers
export async function createCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, false);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }
    if (!canUseBranch(req.user!, req.body.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    const input: CustomerInput = req.body;
    const customer = await CustomerModel.create(input);
    res.status(201).json(customer);
  } catch (error: any) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'CUSTOMER_CREATE_ERROR' });
  }
}

// PUT /v1/customers/:id
export async function updateCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, true);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }
    // ตรวจสิทธิ์สาขาปัจจุบันของลูกค้าก่อนแก้
    const existing = await CustomerModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
      return;
    }
    if (!canUseBranch(req.user!, existing.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    // ถ้าจะย้ายสาขา ต้องเข้าถึงสาขาปลายทางได้ด้วย
    if (req.body.branchId && !canUseBranch(req.user!, req.body.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to target branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    const customer = await CustomerModel.update(req.params.id, req.body);
    res.status(200).json(customer);
  } catch (error: any) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'CUSTOMER_UPDATE_ERROR' });
  }
}

// DELETE /v1/customers/:id — soft delete
export async function deleteCustomer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await CustomerModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
      return;
    }
    if (!canUseBranch(req.user!, existing.branchId)) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this branch', code: 'BRANCH_ACCESS_DENIED' });
      return;
    }
    const customer = await CustomerModel.deactivate(req.params.id);
    res.status(200).json(customer);
  } catch (error: any) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'CUSTOMER_DELETE_ERROR' });
  }
}
