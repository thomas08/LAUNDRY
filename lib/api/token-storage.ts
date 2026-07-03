/**
 * Token storage for JWT auth tokens.
 *
 * Uses localStorage — simple and works with the fully client-side auth flow.
 * Trade-off: not readable by Next.js middleware (which runs on the edge/server),
 * so route protection is done client-side in AuthGuard rather than in middleware.
 * If server-side protection is ever needed, move these to httpOnly cookies and
 * add a corresponding backend change.
 */

const ACCESS_TOKEN_KEY = 'linenflow_token'
const REFRESH_TOKEN_KEY = 'linenflow_refresh_token'

const isBrowser = typeof window !== 'undefined'

export function getAccessToken(): string | null {
  if (!isBrowser) return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (!isBrowser) return null
  return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  if (!isBrowser) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearTokens(): void {
  if (!isBrowser) return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
