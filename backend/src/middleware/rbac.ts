import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../models/user';

export type Permission = 'read' | 'create' | 'update' | 'delete' | 'view_reports';

// Role-Permission Matrix (from lib/auth.ts)
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: ['read', 'create', 'update', 'delete', 'view_reports'],
  admin: ['read', 'create', 'update', 'delete', 'view_reports'],
  user: ['read', 'create', 'view_reports'],
};

// Check if role has permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

// Middleware to require specific permission
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasRequiredPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions to perform this action',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        available: userPermissions,
      });
      return;
    }

    next();
  };
}

// Middleware to require specific role
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient role to perform this action',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

// Middleware to check branch access
export function requireBranchAccess(branchIdParam: string = 'branchId') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const branchId = req.params[branchIdParam] || req.query[branchIdParam] || req.body[branchIdParam];

    if (!branchId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Branch ID is required',
        code: 'BRANCH_ID_REQUIRED',
      });
      return;
    }

    // Superadmin has access to all branches
    if (req.user.role === 'superadmin') {
      next();
      return;
    }

    // Check if user has access to the branch
    const accessibleBranches = req.user.role === 'admin'
      ? (req.user.branchIds || [])
      : (req.user.branchId ? [req.user.branchId] : []);

    if (!accessibleBranches.includes(branchId as string)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this branch',
        code: 'BRANCH_ACCESS_DENIED',
        requestedBranch: branchId,
        accessibleBranches,
      });
      return;
    }

    next();
  };
}
