import { Router } from 'express';
import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
} from '../controllers/articles';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// ทุก endpoint ต้อง login ก่อน
router.use(authMiddleware);

// อ่านได้ทุก role (read); เขียน/แก้/ลบ ตาม permission
router.get('/', requirePermission('read'), listArticles);
router.get('/:id', requirePermission('read'), getArticle);
router.post('/', requirePermission('create'), createArticle);
router.put('/:id', requirePermission('update'), updateArticle);
router.delete('/:id', requirePermission('delete'), deleteArticle);

export default router;
