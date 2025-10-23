import { KPICard } from "@/components/kpi-card"
import { ActivitiesTable } from "@/components/activities-table"
import { ShoppingBag, Users, DollarSign, TrendingUp } from "lucide-react"

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
async function fetchKPIData(): Promise<KPIData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    totalOrders: {
      value: "1,284",
      change: "+12.5% from last month",
      changeType: "positive"
    },
    activeOrders: {
      value: "48",
      change: "8 pending pickup",
      changeType: "neutral"
    },
    monthlyRevenue: {
      value: "$12,450",
      change: "+8.2% from last month",
      changeType: "positive"
    },
    totalCustomers: {
      value: "342",
      change: "+23 new this month",
      changeType: "positive"
    }
  }
}

export default async function DashboardPage() {
  // Server Component can directly await data
  const kpiData = await fetchKPIData()

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Overview of your laundry business performance</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Orders"
          value={kpiData.totalOrders.value}
          change={kpiData.totalOrders.change}
          changeType={kpiData.totalOrders.changeType}
          icon={ShoppingBag}
          iconColor="text-primary"
        />
        <KPICard
          title="Active Orders"
          value={kpiData.activeOrders.value}
          change={kpiData.activeOrders.change}
          changeType={kpiData.activeOrders.changeType}
          icon={TrendingUp}
          iconColor="text-chart-2"
        />
        <KPICard
          title="Monthly Revenue"
          value={kpiData.monthlyRevenue.value}
          change={kpiData.monthlyRevenue.change}
          changeType={kpiData.monthlyRevenue.changeType}
          icon={DollarSign}
          iconColor="text-chart-3"
        />
        <KPICard
          title="Total Customers"
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