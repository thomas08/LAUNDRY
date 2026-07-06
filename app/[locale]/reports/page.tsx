'use client'

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrentBranchId } from "@/contexts/BranchContext"
import {
  fetchSummary,
  fetchSalesByService,
  fetchCostByCategory,
  type ReportSummary,
  type SalesByServiceRow,
  type CostByCategoryRow,
  type ReportFilters,
} from "@/lib/api/reports"
import { ApiError } from "@/lib/api/client"
import type { ReportPeriod } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  Loader2,
  AlertCircle,
} from "lucide-react"

// Fixed-period selector — 'custom' omitted in v1 (5 fixed periods satisfy the page).
const PERIOD_OPTIONS: ReportPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']

// service_type values that have a reporting.serviceTypes.* i18n key; anything else
// (should not happen) falls back to the raw string.
const KNOWN_SERVICE_TYPES = new Set([
  'wash_fold',
  'dry_clean',
  'iron_only',
  'wash_iron',
  'express',
])

const baht = (n: number) =>
  `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ReportsPage() {
  const t = useTranslations('reporting')
  const tCommon = useTranslations('common')
  const { hasPermission } = useAuth()
  const branchId = useCurrentBranchId()

  const canView = hasPermission('view_reports')

  const [period, setPeriod] = useState<ReportPeriod>('monthly')
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [sales, setSales] = useState<SalesByServiceRow[]>([])
  const [costs, setCosts] = useState<CostByCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Branch scoping is enforced server-side — branchId only triggers a refetch and
  // rides along as the ?branchId filter. Never filter client-side.
  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    const filters: ReportFilters = { period, branchId: branchId || undefined }
    Promise.all([
      fetchSummary(filters),
      fetchSalesByService(filters),
      fetchCostByCategory(filters),
    ])
      .then(([s, sv, c]) => {
        if (!alive) return
        setSummary(s)
        setSales(sv)
        setCosts(c)
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : t('loadError'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, branchId, canView])

  const serviceLabel = (st: string) =>
    KNOWN_SERVICE_TYPES.has(st) ? t(`serviceTypes.${st}` as any) : st

  // Render a nullable %-change: null -> em-dash (no baseline), else signed + colored.
  const renderChange = (value: number | null) => {
    if (value == null) return <span className="text-muted-foreground">—</span>
    const positive = value >= 0
    return (
      <span className={positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
        {positive ? '+' : ''}
        {value}% {t('vsPrevPeriod')}
      </span>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {canView && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-period">{t('period')}</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
              <SelectTrigger id="report-period" className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!canView ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('noAccess')}</AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <div className="mt-3 text-sm text-muted-foreground">{tCommon('loading')}</div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : summary ? (
        <>
          {/* KPI cards */}
          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{t('kpi.totalRevenue')}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{baht(summary.totalRevenue)}</p>
                    <p className="mt-2 text-sm font-medium">{renderChange(summary.revenueChange)}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{t('kpi.itemsProcessed')}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {summary.itemsProcessed.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium">{renderChange(summary.itemsProcessedChange)}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                    <Package className="h-6 w-6 text-chart-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{t('kpi.activeCustomers')}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {summary.activeCustomers.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      {t('newThisPeriod', { count: summary.newCustomers })}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
                    <Users className="h-6 w-6 text-chart-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{t('kpi.avgProcessingTime')}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">
                      {summary.averageProcessingTime}h
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {renderChange(summary.averageProcessingTimeChange)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                    <BarChart3 className="h-6 w-6 text-chart-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panels */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Analytics — billed invoices basis (issued_date). */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">
                  {t('panels.revenueAnalytics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.thisPeriod')}</span>
                    <span className="font-medium text-foreground">{baht(summary.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.previousPeriod')}</span>
                    <span className="font-medium text-foreground">{baht(summary.previousRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.grossProfit')}</span>
                    <span className="font-medium text-foreground">{baht(summary.grossProfit)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm font-medium text-foreground">{t('labels.growthRate')}</span>
                    <span className="font-bold">{renderChange(summary.revenueChange)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Insights */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">
                  {t('panels.customerInsights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.newCustomers')}</span>
                    <span className="font-medium text-foreground">
                      {summary.newCustomers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.returningCustomers')}</span>
                    <span className="font-medium text-foreground">
                      {summary.returningCustomers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.retention')}</span>
                    <span className="font-medium text-foreground">
                      {summary.customerRetentionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm font-medium text-foreground">{t('labels.avgOrderValue')}</span>
                    <span className="font-bold text-chart-2">{baht(summary.averageOrderValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Status — CONSUMABLES (inventory_items snapshot), NOT linen items.
                Linen In-Stock/On-Rent/Washing utilization is out of scope in v1 (no report
                data source). */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">
                  {t('panels.inventoryStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.inventoryValue')}</span>
                    <span className="font-medium text-foreground">{baht(summary.inventoryValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.lowStock')}</span>
                    <span className="font-medium text-orange-500">
                      {summary.lowStockItems.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.outOfStock')}</span>
                    <span className="font-medium text-red-500">
                      {summary.outOfStockItems.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm font-medium text-foreground">{t('labels.totalItems')}</span>
                    <span className="font-bold text-foreground">
                      {summary.totalInventoryItems.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operational Performance */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">
                  {t('panels.operationalPerformance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.ordersCompleted')}</span>
                    <span className="font-medium text-foreground">
                      {summary.completedOrders.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.ordersPending')}</span>
                    <span className="font-medium text-foreground">
                      {summary.pendingOrders.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('labels.onTimeDelivery')}</span>
                    <span className="font-medium text-foreground">{summary.onTimeDeliveryRate}%</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm font-medium text-foreground">{t('labels.completionRate')}</span>
                    <span className="font-bold text-foreground">{summary.completionRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales by Service — single-series bar chart (revenue by job-order service_type,
              received_at basis). Order-value basis, distinct from summary.totalRevenue by
              design. Guarded on non-empty data. */}
          {sales.length > 0 && (
            <Card className="mt-6 border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">
                  {t('panels.salesByService')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sales.map((r) => ({
                        name: serviceLabel(r.serviceType),
                        revenue: r.revenue,
                      }))}
                      margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                        tickFormatter={(v: number) => `฿${v.toLocaleString()}`}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.5rem",
                          color: "var(--foreground)",
                        }}
                        formatter={(value: number) => [baht(value), t('metrics.totalRevenue')]}
                      />
                      <Bar dataKey="revenue" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost by Category — SUM(expenses.total_amount) by category (payment_date basis). */}
          {costs.length > 0 && (
            <Card className="mt-6 border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">
                  {t('panels.costByCategory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costs.map((c) => (
                    <div key={c.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{c.category}</span>
                        <span className="text-muted-foreground">
                          {baht(c.amount)} · {c.percentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-chart-4"
                          style={{ width: `${Math.min(100, Math.max(0, c.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
