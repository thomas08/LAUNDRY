/**
 * Auth API calls against the backend /v1/auth endpoints.
 */

import type { User } from '@/lib/types'
import { apiFetch } from './client'

export interface LoginResponse {
  token: string
  refreshToken: string
  expiresIn: number
  user: User
}

/** POST /v1/auth/login — no auth header, no refresh-retry. */
export async function loginRequest(
  email: string,
  password: string
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    _retryOn401: false,
    body: { email, password },
  })
}

/** GET /v1/auth/me — returns the current user for the stored access token. */
export async function getMeRequest(): Promise<User> {
  return apiFetch<User>('/auth/me', { method: 'GET' })
}

/**
 * POST /v1/auth/change-password — change the logged-in user's password.
 * The backend revokes all refresh tokens on success, so the caller should
 * force a re-login afterwards.
 */
export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}
