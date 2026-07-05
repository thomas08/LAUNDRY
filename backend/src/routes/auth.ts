import { Router } from 'express';
import { login, refresh, getCurrentUser, changePassword } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/v1/auth/login - User login
router.post('/login', login);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', refresh);

// GET /api/v1/auth/me - Get current user (requires authentication)
router.get('/me', authMiddleware, getCurrentUser);

// POST /api/v1/auth/change-password - Change own password (requires authentication)
router.post('/change-password', authMiddleware, changePassword);

export default router;
