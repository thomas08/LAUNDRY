import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SupplierModel, SupplierInput } from '../models/supplier';

// suppliers เป็น org-global -> ไม่มี branch scope / branch check
// RBAC คุมด้วย requirePermission ที่ชั้น route เท่านั้น

// GET /v1/suppliers?includeInactive=true
export async function listSuppliers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const suppliers = await SupplierModel.list(includeInactive);
    res.status(200).json({ suppliers });
  } catch (error: any) {
    console.error('List suppliers error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'SUPPLIERS_ERROR' });
  }
}

// GET /v1/suppliers/:id
export async function getSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const supplier = await SupplierModel.findById(req.params.id);
    if (!supplier) {
      res.status(404).json({ error: 'Not Found', message: 'Supplier not found', code: 'SUPPLIER_NOT_FOUND' });
      return;
    }
    res.status(200).json(supplier);
  } catch (error: any) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'SUPPLIER_ERROR' });
  }
}

// validate: name จำเป็นเสมอตอน create; ตอน update (partial) เช็คเฉพาะเมื่อส่ง name มา
function validate(body: any, partial: boolean): string | null {
  if (!partial || 'name' in body) {
    if (!body.name || typeof body.name !== 'string') return 'name is required';
  }
  if ('paymentTerms' in body && body.paymentTerms != null) {
    if (typeof body.paymentTerms !== 'number' || Number.isNaN(body.paymentTerms) || body.paymentTerms < 0) {
      return 'paymentTerms must be a non-negative number';
    }
  }
  return null;
}

// POST /v1/suppliers — code ออกให้อัตโนมัติจาก sequence (client ห้ามส่ง)
export async function createSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, false);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }
    const input: SupplierInput = req.body;
    const supplier = await SupplierModel.create(input);
    res.status(201).json(supplier);
  } catch (error: any) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'SUPPLIER_CREATE_ERROR' });
  }
}

// PUT /v1/suppliers/:id
export async function updateSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, true);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }
    const existing = await SupplierModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Supplier not found', code: 'SUPPLIER_NOT_FOUND' });
      return;
    }
    const supplier = await SupplierModel.update(req.params.id, req.body);
    res.status(200).json(supplier);
  } catch (error: any) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'SUPPLIER_UPDATE_ERROR' });
  }
}

// DELETE /v1/suppliers/:id — soft delete (deactivate)
export async function deleteSupplier(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await SupplierModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Supplier not found', code: 'SUPPLIER_NOT_FOUND' });
      return;
    }
    const supplier = await SupplierModel.deactivate(req.params.id);
    res.status(200).json(supplier);
  } catch (error: any) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'SUPPLIER_DELETE_ERROR' });
  }
}
