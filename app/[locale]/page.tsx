'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { KPICard } from "@/components/kpi-card"
import { ActivitiesTable } from "@/components/activities-table"
import { ShoppingBag, Users, DollarSign, TrendingUp, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Mock data for all branches
const mockBranchData = {
  'branch-1': {
    totalOrders: 1284,
    activeOrders: 48,
    monthlyRevenue: 412450,
    totalCustomers: 342,
    ordersChange: 12.5,
    pendingPickup: 8,
    revenueChange: 8.2,
    newCustomers: 23
  },
  'branch-2': {
    totalOrders: 892,
    activeOrders: 32,
    monthlyRevenue: 298760,
    totalCustomers: 218,
    ordersChange: 9.3,
    pendingPickup: 5,
    revenueChange: 11.7,
    newCustomers: 15
  },
  'branch-3': {
    totalOrders: 645,
    activeOrders: 21,
    monthlyRevenue: 187320,
    totalCustomers: 156,
    ordersChange: 15.8,
    pendingPickup: 3,
    revenueChange: 6.5,
    newCustomers: 12
  }
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const user = useUser()
  const { currentBranch, availableBranches } = useBranch()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(timer)
  }, [currentBranch])

  // Calculate KPI data based on user's branch access
  const kpiData = useMemo(() => {
    if (!user) {
      return {
        totalOrders: 0,
        activeOrders: 0,
        monthlyRevenue: 0,
        totalCustomers: 0,
        ordersChange: 0,
        pendingPickup: 0,
        revenueChange: 0,
        newCustomers: 0
      }
    }

    // If superadmin or viewing all branches, aggregate all accessible data
    if (user.role === 'superadmin' && !currentBranch) {
      const allBranches = availableBranches
      return allBranches.reduce((acc, branch) => {
        const data = mockBranchData[branch.id as keyof typeof mockBranchData]
        if (!data) return acc

        return {
          totalOrders: acc.totalOrders + data.totalOrders,
          activeOrders: acc.activeOrders + data.activeOrders,
          monthlyRevenue: acc.monthlyRevenue + data.monthlyRevenue,
          totalCustomers: acc.totalCustomers + data.totalCustomers,
          ordersChange: (acc.ordersChange + data.ordersChange) / 2,
          pendingPickup: acc.pendingPickup + data.pendingPickup,
          revenueChange: (acc.revenueChange + data.revenueChange) / 2,
          newCustomers: acc.newCustomers + data.newCustomers
        }
      }, {
        totalOrders: 0,
        activeOrders: 0,
        monthlyRevenue: 0,
        totalCustomers: 0,
        ordersChange: 0,
        pendingPickup: 0,
        revenueChange: 0,
        newCustomers: 0
      })
    }

    // Show data for current branch
    const branchId = currentBranch?.id || user.branchId
    return mockBranchData[branchId as keyof typeof mockBranchData] || {
      totalOrders: 0,
      activeOrders: 0,
      monthlyRevenue: 0,
      totalCustomers: 0,
      ordersChange: 0,
      pendingPickup: 0,
      revenueChange: 0,
      newCustomers: 0
    }
  }, [user, currentBranch, availableBranches])

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

      {/* KPI Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t('totalOrders')}
          value={kpiData.totalOrders.toLocaleString()}
          change={`+${kpiData.ordersChange.toFixed(1)}% ${t('fromLastMonth')}`}
          changeType="positive"
          icon={ShoppingBag}
          iconColor="text-primary"
        />
        <KPICard
          title={t('activeOrders')}
          value={kpiData.activeOrders.toString()}
          change={`${kpiData.pendingPickup} ${t('pendingPickup')}`}
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-chart-2"
        />
        <KPICard
          title={t('monthlyRevenue')}
          value={`฿${kpiData.monthlyRevenue.toLocaleString()}`}
          change={`+${kpiData.revenueChange.toFixed(1)}% ${t('fromLastMonth')}`}
          changeType="positive"
          icon={DollarSign}
          iconColor="text-chart-3"
        />
        <KPICard
          title={t('totalCustomers')}
          value={kpiData.totalCustomers.toString()}
          change={`+${kpiData.newCustomers} ${t('newThisMonth')}`}
          changeType="positive"
          icon={Users}
          iconColor="text-accent"
        />
      </div>

      {/* Activities Table */}
      <ActivitiesTable />
    </div>
  )
}