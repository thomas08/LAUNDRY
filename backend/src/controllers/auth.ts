import { Request, Response } from 'express';
import { UserModel } from '../models/user';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthRequest,
} from '../middleware/auth';
import { query } from '../config/database';

// Login controller
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
        code: 'INVALID_INPUT',
      });
      return;
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(
      password,
      user.password_hash
    );
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User account is inactive',
        code: 'USER_INACTIVE',
      });
      return;
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in database
    const refreshTokenId = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [refreshTokenId, user.id, refreshToken, expiresAt]
    );

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    // Calculate expiresIn in seconds
    const expiresIn = 3600; // 1 hour

    res.status(200).json({
      token: accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        role: userWithoutPassword.role,
        branchId: userWithoutPassword.branchId,
        branchIds: userWithoutPassword.branchIds || (userWithoutPassword.branchId ? [userWithoutPassword.branchId] : []),
        isActive: userWithoutPassword.isActive,
        createdAt: userWithoutPassword.createdAt,
        lastLoginAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
      code: 'LOGIN_ERROR',
    });
  }
}

// Refresh token controller
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
        code: 'INVALID_INPUT',
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database and is not revoked
    const tokenResults = await query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
      [refreshToken, payload.userId]
    );

    if (tokenResults.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
      return;
    }

    // Get user
    const user = await UserModel.findById(payload.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);
    const expiresIn = 3600; // 1 hour

    res.status(200).json({
      token: accessToken,
      expiresIn,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }
}

// Get current user controller
export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Get fresh user data from database
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branchIds: user.branchIds || (user.branchId ? [user.branchId] : []),
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user information',
      code: 'GET_USER_ERROR',
    });
  }
}
