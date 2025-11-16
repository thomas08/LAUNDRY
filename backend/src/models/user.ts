import { query } from '../config/database';
import bcrypt from 'bcryptjs';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId: string | null;
  branchIds?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  branchId: string;
  branchIds?: string[];
}

export class UserModel {
  // Find user by email
  static async findByEmail(email: string): Promise<UserWithPassword | null> {
    const results = await query<any>(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.branch_id as "branchId",
              u.is_active as "isActive", u.created_at as "createdAt",
              u.updated_at as "updatedAt", u.last_login_at as "lastLoginAt",
              ARRAY_AGG(ub.branch_id) FILTER (WHERE ub.branch_id IS NOT NULL) as "branchIds"
       FROM users u
       LEFT JOIN user_branches ub ON u.id = ub.user_id
       WHERE u.email = $1
       GROUP BY u.id, u.email, u.password_hash, u.name, u.role, u.branch_id, u.is_active, u.created_at, u.updated_at, u.last_login_at`,
      [email]
    );
    return results[0] || null;
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    const results = await query<User>(
      `SELECT u.id, u.email, u.name, u.role, u.branch_id as "branchId",
              u.is_active as "isActive", u.created_at as "createdAt",
              u.updated_at as "updatedAt", u.last_login_at as "lastLoginAt",
              ARRAY_AGG(ub.branch_id) FILTER (WHERE ub.branch_id IS NOT NULL) as "branchIds"
       FROM users u
       LEFT JOIN user_branches ub ON u.id = ub.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );
    return results[0] || null;
  }

  // Verify password
  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Update last login
  static async updateLastLogin(userId: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  // Get user's accessible branches
  static getUserBranches(user: User): string[] {
    if (user.role === 'superadmin') {
      // Superadmin has access to all branches (will be fetched separately)
      return user.branchIds || [];
    } else if (user.role === 'admin') {
      // Admin has access to assigned branches
      return user.branchIds || [];
    } else {
      // Regular user has access to their primary branch only
      return user.branchId ? [user.branchId] : [];
    }
  }

  // Check if user can access branch
  static canAccessBranch(user: User, branchId: string): boolean {
    if (user.role === 'superadmin') {
      return true; // Superadmin can access all branches
    }

    const accessibleBranches = this.getUserBranches(user);
    return accessibleBranches.includes(branchId);
  }
}
