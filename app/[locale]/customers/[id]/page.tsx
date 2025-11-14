'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { canAccessBranch } from '@/lib/auth'
import { getCustomerById, getJobOrdersByCustomerId, getCustomerStats } from '@/lib/mockData'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Phone, MapPin, Calendar, Edit, Trash2, ArrowLeft, AlertTriangle, Building2, CreditCard, TrendingUp, ShoppingBag } from "lucide-react"
import type { JobOrderStatus } from '@/lib/types'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const tOperations = useTranslations('operations')
  const { user, hasPermission } = useAuth()

  const customerId = params.id as string

  // Get customer data
  const customer = useMemo(() => getCustomerById(customerId), [customerId])

  // Check branch access
  const hasAccess = useMemo(() => {
    if (!user || !customer) return false
    return canAccessBranch(user, customer.branchId)
  }, [user, customer])

  // Get job orders and stats
  const jobOrders = useMemo(() => {
    if (!customer || !hasAccess) return []
    return getJobOrdersByCustomerId(customerId)
  }, [customerId, customer, hasAccess])

  const stats = useMemo(() => {
    if (!customer || !hasAccess) return null
    return getCustomerStats(customerId)
  }, [customerId, customer, hasAccess])

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen p-8">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">{tCommon('loading')}</div>
        </div>
      </div>
    )
  }

  // Customer not found
  if (!customer) {
    return (
      <div className="min-h-screen p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('customerNotFound')} (ID: {customerId})
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon('back')}
        </Button>
      </div>
    )
  }

  // No access to this branch
  if (!hasAccess) {
    return (
      <div className="min-h-screen p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {tCommon('noAccessToBranch')}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon('back')}
        </Button>
      </div>
    )
  }

  const getStatusBadgeVariant = (status: JobOrderStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'default'
      case 'washing':
      case 'drying':
      case 'ironing':
      case 'quality_check':
        return 'secondary'
      case 'in_progress':
        return 'outline'
      case 'pending':
        return 'outline'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getBranchName = (branchId: string) => {
    switch (branchId) {
      case 'branch-1':
        return 'Bangkok Central (BKK01)'
      case 'branch-2':
        return 'Chiang Mai (CNX01)'
      case 'branch-3':
        return 'Phuket (HKT01)'
      default:
        return branchId
    }
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon('back')}
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-muted-foreground">{t('customerDetails')}</p>
              {user.role !== 'user' && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{getBranchName(customer.branchId)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {hasPermission('update') && (
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                {tCommon('edit')}
              </Button>
            )}
            {hasPermission('delete') && (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive bg-transparent">
                <Trash2 className="mr-2 h-4 w-4" />
                {tCommon('delete')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tCommon('total')} {tOperations('jobOrders')}</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedOrders} {tCommon('completed')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tCommon('active')} {tOperations('jobOrders')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeOrders}</div>
              <p className="text-xs text-muted-foreground">
                {tCommon('inProgress')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tCommon('total')} {tCommon('spent')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{stats.totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {tCommon('allTime')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tCommon('average')} {tCommon('value')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{stats.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">
                {tCommon('perOrder')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Information */}
        <div className="lg:col-span-1">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">
                {t('contactInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{tCommon('email')}</p>
                  <a
                    href={`mailto:${customer.email}`}
                    className="mt-1 text-sm text-foreground hover:underline"
                  >
                    {customer.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                  <Phone className="h-5 w-5 text-chart-2" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{tCommon('phone')}</p>
                  <a
                    href={`tel:${customer.phone}`}
                    className="mt-1 text-sm text-foreground hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
              </div>

              {customer.address && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                    <MapPin className="h-5 w-5 text-chart-3" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{tCommon('address')}</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{customer.address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{t('customerSince')}</p>
                  <p className="mt-1 text-sm text-foreground">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="mt-6 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">
                {tCommon('additionalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.contactPerson && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('contactPerson')}</span>
                  <span className="text-sm font-medium text-foreground">{customer.contactPerson}</span>
                </div>
              )}
              {customer.customerType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tCommon('type')}</span>
                  <Badge variant="outline">{customer.customerType}</Badge>
                </div>
              )}
              {customer.paymentTerms && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tCommon('paymentTerms')}</span>
                  <span className="text-sm font-medium text-foreground">{customer.paymentTerms} {tCommon('days')}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tCommon('status')}</span>
                <Badge variant={customer.isActive ? 'default' : 'outline'}>
                  {customer.isActive ? tCommon('active') : tCommon('inactive')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">
                {tOperations('jobOrders')} {tCommon('history')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">{tOperations('orderNumber')}</TableHead>
                        <TableHead className="text-muted-foreground">{tCommon('date')}</TableHead>
                        <TableHead className="text-muted-foreground">{tOperations('serviceType')}</TableHead>
                        <TableHead className="text-muted-foreground">{tOperations('weight')}</TableHead>
                        <TableHead className="text-muted-foreground">{tCommon('amount')}</TableHead>
                        <TableHead className="text-muted-foreground">{tCommon('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobOrders.map((order) => (
                        <TableRow key={order.id} className="border-border hover:bg-accent/50">
                          <TableCell className="font-mono text-sm text-foreground">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(order.receivedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-foreground">
                            <Badge variant="outline">
                              {tOperations(`serviceTypes.${order.serviceType === 'wash_fold' ? 'washFold' : order.serviceType === 'dry_clean' ? 'dryClean' : order.serviceType === 'iron_only' ? 'ironOnly' : order.serviceType === 'wash_iron' ? 'washIron' : order.serviceType}` as any)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {order.weight} kg
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            ฿{order.totalPrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {tOperations(`jobStatus.${order.status === 'in_progress' ? 'inProgress' : order.status === 'quality_check' ? 'qualityCheck' : order.status}` as any)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
