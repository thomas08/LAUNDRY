'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { KPICard } from "@/components/kpi-card"
import { ActivitiesTable } from "@/components/activities-table"
import { ShoppingBag, Users, DollarSign, TrendingUp, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { fetchSummary, type ReportSummary } from '@/lib/api/reports'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const user = useUser()
  const { currentBranch } = useBranch()
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchSummary({ period: 'monthly', branchId: currentBranch?.id })
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Failed to load dashboard') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentBranch?.id])

  // Format a nullable %-change into KPICard's { text, type }. null -> em-dash / neutral.
  const change = (pct: number | null) => {
    if (pct == null) return { text: '—', type: 'neutral' as const }
    const sign = pct >= 0 ? '+' : ''
    return {
      text: `${sign}${pct.toFixed(1)}% ${t('fromLastMonth')}`,
      type: (pct >= 0 ? 'positive' : 'negative') as 'positive' | 'negative',
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const revenue = change(summary?.revenueChange ?? null)
  const orders = change(summary?.ordersChange ?? null)

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Branch indicator */}
        {currentBranch ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm">
              {currentBranch.code} - {currentBranch.name}
            </Badge>
          </div>
        ) : user?.role === 'superadmin' ? (
          <Badge variant="secondary" className="text-sm">
            {tCommon('allBranches')}
          </Badge>
        ) : null}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t('totalOrders')}
          value={(summary?.totalOrders ?? 0).toLocaleString()}
          change={`${orders.text}`}
          changeType={orders.type}
          icon={ShoppingBag}
          iconColor="text-primary"
        />
        <KPICard
          title={t('activeOrders')}
          value={(summary?.activeJobOrders ?? 0).toString()}
          change={`${summary?.pendingOrders ?? 0} ${t('pendingPickup')}`}
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-chart-2"
        />
        <KPICard
          title={t('monthlyRevenue')}
          value={`฿${(summary?.totalRevenue ?? 0).toLocaleString()}`}
          change={`${revenue.text}`}
          changeType={revenue.type}
          icon={DollarSign}
          iconColor="text-chart-3"
        />
        <KPICard
          title={t('totalCustomers')}
          value={(summary?.totalCustomers ?? 0).toString()}
          change={`+${summary?.newCustomers ?? 0} ${t('newThisMonth')}`}
          changeType="positive"
          icon={Users}
          iconColor="text-accent"
        />
      </div>

      {/* Recent activity (real job orders, branch-scoped) */}
      <ActivitiesTable branchId={currentBranch?.id} />
    </div>
  )
}
