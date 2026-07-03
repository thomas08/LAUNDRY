/**
 * Central API client for the LinenFlow™ backend.
 *
 * - Prefixes requests with NEXT_PUBLIC_API_URL (defaults to local dev backend).
 * - Attaches the Bearer access token for authenticated requests.
 * - On a 401, transparently tries to refresh the access token once and retries.
 */

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './token-storage'

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8080/v1'

export interface ApiErrorShape {
  error?: string
  message?: string
  code?: string
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Attach the Bearer access token (default true). */
  auth?: boolean
  /** JSON-serializable request body. */
  body?: unknown
  /** Internal: whether a 401 may trigger a refresh+retry (default true). */
  _retryOn401?: boolean
}

// De-duplicate concurrent refreshes so parallel 401s only refresh once.
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) {
          clearTokens()
          return false
        }
        const data = (await res.json()) as { token?: string }
        if (!data.token) {
          clearTokens()
          return false
        }
        setTokens(data.token)
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = true, body, _retryOn401 = true, headers, ...rest } = options

  const finalHeaders: Record<string, string> = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string> | undefined),
  }

  if (auth) {
    const token = getAccessToken()
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Attempt a single silent refresh + retry on expired/invalid access token.
  if (res.status === 401 && auth && _retryOn401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retryOn401: false })
    }
  }

  if (res.status === 204) {
    return undefined as T
  }

  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const err = (data ?? {}) as ApiErrorShape
    throw new ApiError(
      res.status,
      err.message || err.error || `Request failed with status ${res.status}`,
      err.code
    )
  }

  return data as T
}
