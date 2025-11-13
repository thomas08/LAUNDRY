import { KPICard } from "@/components/kpi-card"
import { ActivitiesTable } from "@/components/activities-table"
import { ShoppingBag, Users, DollarSign, TrendingUp } from "lucide-react"
import { getTranslations } from 'next-intl/server'

interface KPIData {
  totalOrders: {
    value: string
    change: string
    changeType: "positive" | "negative" | "neutral"
  }
  activeOrders: {
    value: string
    change: string
    changeType: "positive" | "negative" | "neutral"
  }
  monthlyRevenue: {
    value: string
    change: string
    changeType: "positive" | "negative" | "neutral"
  }
  totalCustomers: {
    value: string
    change: string
    changeType: "positive" | "negative" | "neutral"
  }
}

// Mock async function - in production this would fetch from your API
async function fetchKPIData(t: any): Promise<KPIData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    totalOrders: {
      value: "1,284",
      change: `+12.5% ${t('fromLastMonth')}`,
      changeType: "positive"
    },
    activeOrders: {
      value: "48",
      change: `8 ${t('pendingPickup')}`,
      changeType: "neutral"
    },
    monthlyRevenue: {
      value: "$12,450",
      change: `+8.2% ${t('fromLastMonth')}`,
      changeType: "positive"
    },
    totalCustomers: {
      value: "342",
      change: `+23 ${t('newThisMonth')}`,
      changeType: "positive"
    }
  }
}

export default async function DashboardPage() {
  // Get translations for Server Component
  const t = await getTranslations('dashboard')

  // Server Component can directly await data
  const kpiData = await fetchKPIData(t)

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t('totalOrders')}
          value={kpiData.totalOrders.value}
          change={kpiData.totalOrders.change}
          changeType={kpiData.totalOrders.changeType}
          icon={ShoppingBag}
          iconColor="text-primary"
        />
        <KPICard
          title={t('activeOrders')}
          value={kpiData.activeOrders.value}
          change={kpiData.activeOrders.change}
          changeType={kpiData.activeOrders.changeType}
          icon={TrendingUp}
          iconColor="text-chart-2"
        />
        <KPICard
          title={t('monthlyRevenue')}
          value={kpiData.monthlyRevenue.value}
          change={kpiData.monthlyRevenue.change}
          changeType={kpiData.monthlyRevenue.changeType}
          icon={DollarSign}
          iconColor="text-chart-3"
        />
        <KPICard
          title={t('totalCustomers')}
          value={kpiData.totalCustomers.value}
          change={kpiData.totalCustomers.change}
          changeType={kpiData.totalCustomers.changeType}
          icon={Users}
          iconColor="text-accent"
        />
      </div>

      {/* Activities Table */}
      <ActivitiesTable />
    </div>
  )
}