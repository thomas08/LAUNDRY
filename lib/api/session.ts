/**
 * Registration Station API — web creates a session (holding the article/ownership
 * context) that the C72 handheld links into by code; the web then polls the tags
 * the gun registers under that session, live. Backend: /v1/sync/session*.
 */
import { apiFetch } from './client'

export interface RegistrationSession {
  code: string
  branchId: string
  articleId: string | null
  articleName: string | null
  ownership: string
  customerId: string | null
  status: string
  expiresAt: string
}

export interface SessionScan {
  tagId: string
  scannedAt: string
}

export interface SessionEvents {
  events: SessionScan[]
  count: number
  active: boolean
}

export interface CreateSessionInput {
  branchId: string
  articleId?: string | null
  articleName?: string | null
  ownership: string
  customerId?: string | null
}

/** POST /v1/sync/session — open a station (admin/superadmin). Returns the code + context. */
export function createSession(input: CreateSessionInput): Promise<RegistrationSession> {
  return apiFetch<RegistrationSession>('/sync/session', { method: 'POST', body: input })
}

/** GET /v1/sync/session/:code/events — tags registered under the session, live. */
export function fetchSessionEvents(code: string, since?: string): Promise<SessionEvents> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  return apiFetch<SessionEvents>(`/sync/session/${code}/events${qs}`)
}

/** POST /v1/sync/session/:code/close — stop the station. */
export function closeSession(code: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/sync/session/${code}/close`, { method: 'POST' })
}
