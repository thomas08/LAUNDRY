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
