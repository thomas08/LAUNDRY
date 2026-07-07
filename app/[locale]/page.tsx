'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { KPICard } from "@/components/kpi-card"
import { AttentionCard } from "@/components/attention-card"
import { ActivitiesTable } from "@/components/activities-table"
import { Link } from '@/lib/navigation'
import {
  ShoppingBag, Users, DollarSign, TrendingUp, Building2,
  AlertTriangle, Clock, Boxes, Receipt, Plus, UserPlus, FileText,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { fetchSummary, type ReportSummary } from '@/lib/api/reports'
import { fetchInventoryItems, type InventoryItemWithAlert } from '@/lib/api/inventory-items'
import { fetchInvoices, type InvoiceRow } from '@/lib/api/invoices'
import { fetchJobOrders } from '@/lib/api/job-orders'
import type { JobOrder } from '@/lib/types'

const OPEN_ORDER_STATUSES: JobOrder['status'][] = [
  'pending', 'in_progress', 'washing', 'drying', 'ironing', 'quality_check', 'completed',
]
const UNPAID_INVOICE_STATUSES: InvoiceRow['status'][] = ['issued', 'partially_paid', 'overdue']

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const { user, hasPermission } = useAuth()
  const { currentBranch } = useBranch()

  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [inventory, setInventory] = useState<InventoryItemWithAlert[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.allSettled([
      fetchSummary({ period: 'monthly', branchId: currentBranch?.id }),
      fetchInventoryItems(),
      fetchInvoices(),
      fetchJobOrders(),
    ]).then(([s, inv, invc, jo]) => {
      if (cancelled) return
      if (s.status === 'fulfilled') setSummary(s.value)
      else setError(s.reason?.message || 'Failed to load dashboard')
      setInventory(inv.status === 'fulfilled' ? inv.value : [])
      setInvoices(invc.status === 'fulfilled' ? invc.value : [])
      setJobOrders(jo.status === 'fulfilled' ? jo.value : [])
    }).finally(() => { if (!cancelled) setLoading(false) })
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

  // ---- "Needs attention" figures, all computed from real backend data ----
  const now = Date.now()
  const overdueOrders = jobOrders.filter(
    (o) => o.dueDate && new Date(o.dueDate).getTime() < now && OPEN_ORDER_STATUSES.includes(o.status),
  ).length
  const lowStock = inventory.filter((i) => i.alertLevel !== 'ok').length
  const outOfStock = inventory.filter((i) => i.alertLevel === 'out_of_stock').length
  const unpaid = invoices.filter((i) => UNPAID_INVOICE_STATUSES.includes(i.status))
  const outstanding = unpaid.reduce((sum, i) => sum + (i.remainingAmount || 0), 0)
  const pendingOrders = summary?.pendingOrders ?? 0
  const activeOrders = summary?.activeJobOrders ?? 0

  const header = (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>
      {currentBranch ? (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="text-sm">{currentBranch.code} - {currentBranch.name}</Badge>
        </div>
      ) : user?.role === 'superadmin' ? (
        <Badge variant="secondary" className="text-sm">{tCommon('allBranches')}</Badge>
      ) : null}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        {header}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  const revenue = change(summary?.revenueChange ?? null)
  const orders = change(summary?.ordersChange ?? null)

  const quickActions = [
    { key: 'newJobOrder', href: '/operations/job-orders', icon: FileText },
    { key: 'addCustomer', href: '/customers', icon: UserPlus },
    { key: 'registerLinen', href: '/add-item', icon: Plus },
    { key: 'newInvoice', href: '/finance/invoices', icon: Receipt },
  ] as const

  return (
    <div className="min-h-screen p-8">
      {header}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick actions — jump straight into the common create flows */}
      {hasPermission('create') && (
        <div className="mb-8 flex flex-wrap gap-3">
          {quickActions.map(({ key, href, icon: Icon }) => (
            <Button key={key} variant="outline" className="gap-2" asChild>
              <Link href={href}><Icon className="h-4 w-4" />{t(key)}</Link>
            </Button>
          ))}
        </div>
      )}

      {/* Needs attention — actionable, real data, each tile links to its list */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t('needsAttention')}
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AttentionCard
          title={t('overdueOrders')} count={overdueOrders} tone="danger"
          href="/operations/job-orders" icon={AlertTriangle}
          detail={`${activeOrders.toLocaleString()} ${t('activeLower')}`}
        />
        <AttentionCard
          title={t('pendingPickupTitle')} count={pendingOrders} tone="warning"
          href="/operations/job-orders" icon={Clock}
        />
        <AttentionCard
          title={t('lowStockTitle')} count={lowStock} tone="warning"
          href="/inventory/stock" icon={Boxes}
          detail={outOfStock > 0 ? `${outOfStock} ${t('outLower')}` : undefined}
        />
        <AttentionCard
          title={t('unpaidInvoices')} count={unpaid.length} tone="danger"
          href="/finance/invoices" icon={Receipt}
          detail={outstanding > 0 ? `฿${outstanding.toLocaleString()} ${t('outstanding')}` : undefined}
        />
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t('totalOrders')} value={(summary?.totalOrders ?? 0).toLocaleString()}
          change={orders.text} changeType={orders.type} icon={ShoppingBag} iconColor="text-primary"
        />
        <KPICard
          title={t('activeOrders')} value={activeOrders.toString()}
          change={`${pendingOrders} ${t('pendingPickup')}`} changeType="neutral" icon={TrendingUp} iconColor="text-chart-2"
        />
        <KPICard
          title={t('monthlyRevenue')} value={`฿${(summary?.totalRevenue ?? 0).toLocaleString()}`}
          change={revenue.text} changeType={revenue.type} icon={DollarSign} iconColor="text-chart-3"
        />
        <KPICard
          title={t('totalCustomers')} value={(summary?.totalCustomers ?? 0).toString()}
          change={`+${summary?.newCustomers ?? 0} ${t('newThisMonth')}`} changeType="positive" icon={Users} iconColor="text-accent"
        />
      </div>

      {/* Recent activity (real job orders, branch-scoped) */}
      <ActivitiesTable branchId={currentBranch?.id} />
    </div>
  )
}
