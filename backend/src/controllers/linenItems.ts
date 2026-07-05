import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { LinenItemModel } from '../models/linenItem';
import { LinenItemStatus, LinenOwnership } from '../models/sync';
import { branchScopeFor } from '../utils/branchScope';

const VALID_STATUS: LinenItemStatus[] = ['In Stock', 'Washing', 'On-Rent'];
const VALID_OWNERSHIP: LinenOwnership[] = ['rental', 'customer_owned'];

// GET /v1/linen-items?status=In Stock&ownership=rental — scoped to caller's branches
export async function listLinenItems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const status = req.query.status as LinenItemStatus | undefined;
    const ownership = req.query.ownership as LinenOwnership | undefined;

    if (status && !VALID_STATUS.includes(status)) {
      res.status(400).json({ error: 'Bad Request', message: `status must be one of: ${VALID_STATUS.join(', ')}`, code: 'INVALID_STATUS' });
      return;
    }
    if (ownership && !VALID_OWNERSHIP.includes(ownership)) {
      res.status(400).json({ error: 'Bad Request', message: `ownership must be one of: ${VALID_OWNERSHIP.join(', ')}`, code: 'INVALID_OWNERSHIP' });
      return;
    }

    const scope = branchScopeFor(req.user!);
    const items = await LinenItemModel.list(scope, { status, ownership });
    res.status(200).json({ items });
  } catch (error: any) {
    console.error('List linen items error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'LINEN_ITEMS_ERROR' });
  }
}
