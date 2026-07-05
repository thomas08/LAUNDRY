import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ArticleModel, ArticleInput, LinenCategory, LinenOwnership } from '../models/article';

const VALID_CATEGORIES: LinenCategory[] = [
  'bed_sheet', 'pillow_case', 'towel', 'bath_towel', 'tablecloth',
  'napkin', 'uniform', 'apron', 'curtain', 'blanket', 'other',
];
const VALID_OWNERSHIP: LinenOwnership[] = ['rental', 'customer_owned'];

// GET /v1/articles?branchId=...&includeInactive=true
export async function listArticles(req: AuthRequest, res: Response): Promise<void> {
  try {
    const branchId = (req.query.branchId as string) || undefined;
    const includeInactive = req.query.includeInactive === 'true';
    const articles = await ArticleModel.list(branchId, includeInactive);
    res.status(200).json({ articles });
  } catch (error: any) {
    console.error('List articles error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'ARTICLES_ERROR' });
  }
}

// GET /v1/articles/:id
export async function getArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const article = await ArticleModel.findById(req.params.id);
    if (!article) {
      res.status(404).json({ error: 'Not Found', message: 'Article not found', code: 'ARTICLE_NOT_FOUND' });
      return;
    }
    res.status(200).json(article);
  } catch (error: any) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'ARTICLE_ERROR' });
  }
}

// ตรวจ input ที่ใช้ร่วมกันระหว่าง create/update (คืน error string ถ้าไม่ผ่าน)
function validate(body: any, partial: boolean): string | null {
  if (!partial || 'code' in body) {
    if (!body.code || typeof body.code !== 'string') return 'code is required';
  }
  if (!partial || 'name' in body) {
    if (!body.name || typeof body.name !== 'string') return 'name is required';
  }
  if (!partial || 'category' in body) {
    if (!VALID_CATEGORIES.includes(body.category)) return `category must be one of: ${VALID_CATEGORIES.join(', ')}`;
  }
  if ('defaultOwnership' in body && body.defaultOwnership != null && !VALID_OWNERSHIP.includes(body.defaultOwnership)) {
    return `defaultOwnership must be one of: ${VALID_OWNERSHIP.join(', ')}`;
  }
  return null;
}

// POST /v1/articles
export async function createArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, false);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }

    // code ต้องไม่ซ้ำ
    const existing = await ArticleModel.findByCode(req.body.code);
    if (existing) {
      res.status(409).json({ error: 'Conflict', message: `Article code '${req.body.code}' already exists`, code: 'DUPLICATE_CODE' });
      return;
    }

    const input: ArticleInput = req.body;
    const article = await ArticleModel.create(input);
    res.status(201).json(article);
  } catch (error: any) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'ARTICLE_CREATE_ERROR' });
  }
}

// PUT /v1/articles/:id
export async function updateArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const err = validate(req.body, true);
    if (err) {
      res.status(400).json({ error: 'Bad Request', message: err, code: 'INVALID_INPUT' });
      return;
    }

    const article = await ArticleModel.update(req.params.id, req.body);
    if (!article) {
      res.status(404).json({ error: 'Not Found', message: 'Article not found', code: 'ARTICLE_NOT_FOUND' });
      return;
    }
    res.status(200).json(article);
  } catch (error: any) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'ARTICLE_UPDATE_ERROR' });
  }
}

// DELETE /v1/articles/:id — soft delete (is_active=false)
export async function deleteArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const article = await ArticleModel.deactivate(req.params.id);
    if (!article) {
      res.status(404).json({ error: 'Not Found', message: 'Article not found', code: 'ARTICLE_NOT_FOUND' });
      return;
    }
    res.status(200).json(article);
  } catch (error: any) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 'ARTICLE_DELETE_ERROR' });
  }
}
