'use client'

/**
 * AuthGuard - client-side route protection.
 *
 * - While the initial /me check runs, shows a full-screen loader.
 * - Unauthenticated users are redirected to /login (except on /login itself).
 * - Authenticated users on /login are sent to the dashboard.
 * - The login page renders without the sidebar chrome; everything else renders
 *   inside the app shell (Sidebar + main).
 */

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/sidebar'

const LOGIN_PATH = '/login'

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      {label}
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('common')

  const isLoginPage = pathname === LOGIN_PATH

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated && !isLoginPage) {
      router.replace(LOGIN_PATH)
    } else if (isAuthenticated && isLoginPage) {
      router.replace('/')
    }
  }, [isLoading, isAuthenticated, isLoginPage, router])

  // Still resolving the stored token.
  if (isLoading) {
    return <FullScreenLoader label={t('loading')} />
  }

  // Login page: render bare (no sidebar), regardless of auth state.
  if (isLoginPage) {
    return <>{children}</>
  }

  // Protected route but not authenticated yet — redirect is in flight.
  if (!isAuthenticated) {
    return <FullScreenLoader label={t('loading')} />
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full md:pl-64 pt-16 md:pt-0">{children}</main>
    </div>
  )
}
