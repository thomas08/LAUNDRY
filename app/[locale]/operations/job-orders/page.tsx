'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth, useUser } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { filterByBranchAccess } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Package,
  Loader2
} from 'lucide-react'
import type { JobOrder, JobOrderStatus, ServiceType } from '@/lib/types'

// Mock job order data
const mockJobOrders: JobOrder[] = [
  {
    id: 'job-001',
    orderNumber: 'JO-2024-001',
    customerId: 'cust-001',
    customerName: 'Grand Plaza Hotel',
    branchId: 'branch-1',
    serviceType: 'wash_fold',
    status: 'completed',
    weight: 125.5,
    itemCount: 450,
    receivedAt: '2024-01-15T09:00:00Z',
    dueDate: '2024-01-17T17:00:00Z',
    completedAt: '2024-01-17T14:30:00Z',
    assignedTo: 'user-1',
    servicePrice: 15,
    totalPrice: 1882.5,
    notes: 'Rush order - VIP customer',
    createdBy: 'user-1',
    createdAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'job-002',
    orderNumber: 'JO-2024-002',
    customerId: 'cust-002',
    customerName: 'Riverside Hotel',
    branchId: 'branch-1',
    serviceType: 'dry_clean',
    status: 'washing',
    weight: 45.0,
    itemCount: 120,
    receivedAt: '2024-01-20T10:30:00Z',
    dueDate: '2024-01-23T17:00:00Z',
    assignedTo: 'user-1',
    servicePrice: 35,
    totalPrice: 1575,
    createdBy: 'user-1',
    createdAt: '2024-01-20T10:30:00Z'
  },
  {
    id: 'job-003',
    orderNumber: 'JO-2024-003',
    customerId: 'cust-003',
    customerName: 'City View Restaurant',
    branchId: 'branch-1',
    serviceType: 'wash_iron',
    status: 'ironing',
    weight: 65.0,
    itemCount: 180,
    receivedAt: '2024-01-22T08:00:00Z',
    dueDate: '2024-01-25T17:00:00Z',
    assignedTo: 'user-1',
    servicePrice: 22,
    totalPrice: 1430,
    createdBy: 'user-1',
    createdAt: '2024-01-22T08:00:00Z'
  },
  {
    id: 'job-004',
    orderNumber: 'JO-2024-004',
    customerId: 'cust-005',
    customerName: 'Spa & Wellness Center',
    branchId: 'branch-2',
    serviceType: 'wash_fold',
    status: 'quality_check',
    weight: 88.5,
    itemCount: 250,
    receivedAt: '2024-01-18T11:00:00Z',
    dueDate: '2024-01-21T17:00:00Z',
    assignedTo: 'user-2',
    servicePrice: 18,
    totalPrice: 1593,
    createdBy: 'user-2',
    createdAt: '2024-01-18T11:00:00Z'
  },
  {
    id: 'job-005',
    orderNumber: 'JO-2024-005',
    customerId: 'cust-006',
    customerName: 'Medical Clinic',
    branchId: 'branch-2',
    serviceType: 'dry_clean',
    status: 'delivered',
    weight: 32.0,
    itemCount: 95,
    receivedAt: '2024-01-12T09:30:00Z',
    dueDate: '2024-01-15T17:00:00Z',
    completedAt: '2024-01-15T15:00:00Z',
    deliveredAt: '2024-01-15T16:30:00Z',
    assignedTo: 'user-2',
    servicePrice: 40,
    totalPrice: 1280,
    createdBy: 'user-2',
    createdAt: '2024-01-12T09:30:00Z'
  },
  {
    id: 'job-006',
    orderNumber: 'JO-2024-006',
    customerId: 'cust-007',
    customerName: 'Fitness Gym',
    branchId: 'branch-3',
    serviceType: 'express',
    status: 'drying',
    weight: 55.0,
    itemCount: 160,
    receivedAt: '2024-01-24T13:00:00Z',
    dueDate: '2024-01-25T17:00:00Z',
    assignedTo: 'user-3',
    servicePrice: 50,
    totalPrice: 2750,
    notes: 'Express service - needed by tomorrow',
    createdBy: 'user-3',
    createdAt: '2024-01-24T13:00:00Z'
  },
  {
    id: 'job-007',
    orderNumber: 'JO-2024-007',
    customerId: 'cust-009',
    customerName: 'Hotel Resort',
    branchId: 'branch-3',
    serviceType: 'wash_fold',
    status: 'pending',
    weight: 195.0,
    itemCount: 580,
    receivedAt: '2024-01-25T07:00:00Z',
    dueDate: '2024-01-28T17:00:00Z',
    assignedTo: 'user-3',
    servicePrice: 14,
    totalPrice: 2730,
    createdBy: 'user-3',
    createdAt: '2024-01-25T07:00:00Z'
  },
  {
    id: 'job-008',
    orderNumber: 'JO-2024-008',
    customerId: 'cust-010',
    customerName: 'Beauty Salon',
    branchId: 'branch-1',
    serviceType: 'iron_only',
    status: 'in_progress',
    weight: 18.5,
    itemCount: 65,
    receivedAt: '2024-01-26T10:00:00Z',
    dueDate: '2024-01-27T17:00:00Z',
    assignedTo: 'user-1',
    servicePrice: 25,
    totalPrice: 462.5,
    createdBy: 'user-1',
    createdAt: '2024-01-26T10:00:00Z'
  }
]

export default function JobOrdersPage() {
  const t = useTranslations('operations')
  const tCommon = useTranslations('common')
  const { hasPermission } = useAuth()
  const user = useUser()
  const { currentBranch } = useBranch()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter job orders by branch access
  const accessibleJobOrders = useMemo(() => {
    if (!user) return []
    return filterByBranchAccess(user, mockJobOrders)
  }, [user])

  // Apply search and filters
  const filteredJobOrders = useMemo(() => {
    return accessibleJobOrders.filter(order => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesServiceType = serviceTypeFilter === 'all' || order.serviceType === serviceTypeFilter

      return matchesSearch && matchesStatus && matchesServiceType
    })
  }, [accessibleJobOrders, searchQuery, statusFilter, serviceTypeFilter])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredJobOrders.length
    const active = filteredJobOrders.filter(order =>
      !['completed', 'delivered', 'cancelled'].includes(order.status)
    ).length
    const pending = filteredJobOrders.filter(order => order.status === 'pending').length
    const completed = filteredJobOrders.filter(order =>
      ['completed', 'delivered'].includes(order.status)
    ).length

    return {
      totalOrders: total,
      activeOrders: active,
      pendingOrders: pending,
      completedOrders: completed
    }
  }, [filteredJobOrders])

  // Pagination
  const totalPages = Math.ceil(filteredJobOrders.length / itemsPerPage)
  const paginatedJobOrders = filteredJobOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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

  const getStatusIcon = (status: JobOrderStatus) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'washing':
      case 'drying':
      case 'ironing':
      case 'quality_check':
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('jobOrders')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {tCommon('create')} {t('jobOrder')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('total')} {t('jobOrders')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {tCommon('all')} {t('jobOrders').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('active')}</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summaryMetrics.activeOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('inProgress')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('jobStatus.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryMetrics.pendingOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('waiting')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('completed')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryMetrics.completedOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('finished')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{tCommon('filters')}</CardTitle>
          <CardDescription>{tCommon('filterDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{tCommon('search')}</label>
              <Input
                placeholder={`${tCommon('searchBy')} ${t('orderNumber')} ${tCommon('or')} ${tCommon('customer')}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{tCommon('status')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  <SelectItem value="pending">{t('jobStatus.pending')}</SelectItem>
                  <SelectItem value="in_progress">{t('jobStatus.inProgress')}</SelectItem>
                  <SelectItem value="washing">{t('jobStatus.washing')}</SelectItem>
                  <SelectItem value="drying">{t('jobStatus.drying')}</SelectItem>
                  <SelectItem value="ironing">{t('jobStatus.ironing')}</SelectItem>
                  <SelectItem value="quality_check">{t('jobStatus.qualityCheck')}</SelectItem>
                  <SelectItem value="completed">{t('jobStatus.completed')}</SelectItem>
                  <SelectItem value="delivered">{t('jobStatus.delivered')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('serviceType')}</label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  <SelectItem value="wash_fold">{t('serviceTypes.washFold')}</SelectItem>
                  <SelectItem value="dry_clean">{t('serviceTypes.dryClean')}</SelectItem>
                  <SelectItem value="iron_only">{t('serviceTypes.ironOnly')}</SelectItem>
                  <SelectItem value="wash_iron">{t('serviceTypes.washIron')}</SelectItem>
                  <SelectItem value="express">{t('serviceTypes.express')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('jobOrders')} {tCommon('list')}</CardTitle>
          <CardDescription>
            {tCommon('showing')} {paginatedJobOrders.length} {tCommon('of')} {filteredJobOrders.length} {t('jobOrders').toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orderNumber')}</TableHead>
                <TableHead>{tCommon('customer')}</TableHead>
                <TableHead>{t('serviceType')}</TableHead>
                <TableHead>{t('weight')}</TableHead>
                <TableHead>{t('itemCount')}</TableHead>
                <TableHead>{t('receivedAt')}</TableHead>
                <TableHead>{t('dueDate')}</TableHead>
                <TableHead>{tCommon('price')}</TableHead>
                <TableHead>{tCommon('status')}</TableHead>
                {user?.role !== 'user' && <TableHead>{tCommon('branch')}</TableHead>}
                <TableHead className="text-right">{tCommon('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedJobOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedJobOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`serviceTypes.${order.serviceType === 'wash_fold' ? 'washFold' : order.serviceType === 'dry_clean' ? 'dryClean' : order.serviceType === 'iron_only' ? 'ironOnly' : order.serviceType === 'wash_iron' ? 'washIron' : order.serviceType}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.weight} kg</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {order.itemCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(order.receivedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(order.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ฿{order.totalPrice.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {t(`jobStatus.${order.status === 'in_progress' ? 'inProgress' : order.status === 'quality_check' ? 'qualityCheck' : order.status}` as any)}
                        </Badge>
                      </div>
                    </TableCell>
                    {user?.role !== 'user' && (
                      <TableCell>
                        <Badge variant="outline">
                          {order.branchId === 'branch-1' ? 'BKK01' :
                           order.branchId === 'branch-2' ? 'CNX01' : 'HKT01'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title={tCommon('view')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasPermission('update') && (
                          <Button variant="ghost" size="icon" title={tCommon('edit')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('delete') && (
                          <Button variant="ghost" size="icon" title={tCommon('delete')}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {tCommon('page')} {currentPage} {tCommon('of')} {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {tCommon('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {tCommon('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
