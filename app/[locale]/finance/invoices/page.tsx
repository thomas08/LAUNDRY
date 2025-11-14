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
import { FileText, DollarSign, Clock, CheckCircle, Plus, Edit, Trash2, Eye, Download } from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/lib/types'

// Mock invoice data
const mockInvoices: Invoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2024-001',
    customerId: 'cust-001',
    customerName: 'Grand Plaza Hotel',
    branchId: 'branch-1',
    jobOrderIds: ['job-001', 'job-002'],
    issuedDate: '2024-01-15',
    dueDate: '2024-02-14',
    subtotal: 45000,
    discount: 2250,
    vatRate: 7,
    vatAmount: 2992.5,
    totalAmount: 45742.5,
    paidAmount: 45742.5,
    remainingAmount: 0,
    status: 'paid',
    paidDate: '2024-01-20',
    createdBy: 'user-1',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2024-002',
    customerId: 'cust-002',
    customerName: 'Riverside Hotel',
    branchId: 'branch-1',
    jobOrderIds: ['job-003'],
    issuedDate: '2024-01-18',
    dueDate: '2024-02-17',
    subtotal: 28000,
    discount: 0,
    vatRate: 7,
    vatAmount: 1960,
    totalAmount: 29960,
    paidAmount: 15000,
    remainingAmount: 14960,
    status: 'partially_paid',
    createdBy: 'user-1',
    createdAt: '2024-01-18T14:00:00Z'
  },
  {
    id: 'inv-003',
    invoiceNumber: 'INV-2024-003',
    customerId: 'cust-003',
    customerName: 'City View Restaurant',
    branchId: 'branch-2',
    jobOrderIds: ['job-004', 'job-005'],
    issuedDate: '2024-01-20',
    dueDate: '2024-02-19',
    subtotal: 18500,
    discount: 0,
    vatRate: 7,
    vatAmount: 1295,
    totalAmount: 19795,
    paidAmount: 0,
    remainingAmount: 19795,
    status: 'issued',
    createdBy: 'user-2',
    createdAt: '2024-01-20T09:00:00Z'
  },
  {
    id: 'inv-004',
    invoiceNumber: 'INV-2024-004',
    customerId: 'cust-005',
    customerName: 'Spa & Wellness Center',
    branchId: 'branch-2',
    jobOrderIds: ['job-006'],
    issuedDate: '2024-01-10',
    dueDate: '2024-02-09',
    subtotal: 32000,
    discount: 1600,
    vatRate: 7,
    vatAmount: 2128,
    totalAmount: 32528,
    paidAmount: 0,
    remainingAmount: 32528,
    status: 'overdue',
    createdBy: 'user-2',
    createdAt: '2024-01-10T11:00:00Z'
  },
  {
    id: 'inv-005',
    invoiceNumber: 'INV-2024-005',
    customerId: 'cust-007',
    customerName: 'Fitness Gym',
    branchId: 'branch-3',
    jobOrderIds: ['job-007'],
    issuedDate: '2024-01-25',
    dueDate: '2024-02-24',
    subtotal: 15000,
    discount: 0,
    vatRate: 7,
    vatAmount: 1050,
    totalAmount: 16050,
    paidAmount: 16050,
    remainingAmount: 0,
    status: 'paid',
    paidDate: '2024-01-26',
    createdBy: 'user-3',
    createdAt: '2024-01-25T15:00:00Z'
  },
  {
    id: 'inv-006',
    invoiceNumber: 'DRAFT-2024-001',
    customerId: 'cust-010',
    customerName: 'Beauty Salon',
    branchId: 'branch-3',
    jobOrderIds: ['job-008'],
    issuedDate: '2024-01-28',
    dueDate: '2024-02-27',
    subtotal: 8500,
    discount: 0,
    vatRate: 7,
    vatAmount: 595,
    totalAmount: 9095,
    paidAmount: 0,
    remainingAmount: 9095,
    status: 'draft',
    createdBy: 'user-3',
    createdAt: '2024-01-28T10:00:00Z'
  }
]

export default function InvoicesPage() {
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const { hasPermission } = useAuth()
  const user = useUser()
  const { currentBranch } = useBranch()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter invoices by branch access
  const accessibleInvoices = useMemo(() => {
    if (!user) return []
    return filterByBranchAccess(user, mockInvoices)
  }, [user])

  // Apply search and filters
  const filteredInvoices = useMemo(() => {
    return accessibleInvoices.filter(invoice => {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [accessibleInvoices, searchQuery, statusFilter])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const outstanding = filteredInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0)
    const paid = filteredInvoices.filter(inv => inv.status === 'paid').length
    const overdue = filteredInvoices.filter(inv => inv.status === 'overdue').length

    return {
      totalValue: total,
      outstandingAmount: outstanding,
      paidInvoices: paid,
      overdueInvoices: overdue
    }
  }, [filteredInvoices])

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusBadgeVariant = (status: InvoiceStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'paid':
        return 'default'
      case 'issued':
        return 'secondary'
      case 'partially_paid':
        return 'outline'
      case 'overdue':
        return 'destructive'
      case 'draft':
        return 'outline'
      case 'cancelled':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'overdue':
        return <Clock className="h-4 w-4 text-red-500" />
      case 'partially_paid':
        return <DollarSign className="h-4 w-4 text-yellow-500" />
      case 'issued':
        return <FileText className="h-4 w-4 text-blue-500" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('invoices')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {tCommon('create')} {t('invoice')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('total')} {tCommon('value')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredInvoices.length} {t('invoices').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('outstanding')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.outstandingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('unpaid')} {tCommon('amount')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invoiceStatus.paid')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryMetrics.paidInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('completed')} {t('invoices').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('invoiceStatus.overdue')}</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryMetrics.overdueInvoices}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('needsAttention')}
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{tCommon('search')}</label>
              <Input
                placeholder={`${tCommon('searchBy')} ${t('invoiceNumber')} ${tCommon('or')} ${tCommon('customer')}`}
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
                  <SelectItem value="draft">{t('invoiceStatus.draft')}</SelectItem>
                  <SelectItem value="issued">{t('invoiceStatus.issued')}</SelectItem>
                  <SelectItem value="paid">{t('invoiceStatus.paid')}</SelectItem>
                  <SelectItem value="partially_paid">{t('invoiceStatus.partiallyPaid')}</SelectItem>
                  <SelectItem value="overdue">{t('invoiceStatus.overdue')}</SelectItem>
                  <SelectItem value="cancelled">{t('invoiceStatus.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoices')} {tCommon('list')}</CardTitle>
          <CardDescription>
            {tCommon('showing')} {paginatedInvoices.length} {tCommon('of')} {filteredInvoices.length} {t('invoices').toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoiceNumber')}</TableHead>
                <TableHead>{tCommon('customer')}</TableHead>
                <TableHead>{t('issuedDate')}</TableHead>
                <TableHead>{t('dueDate')}</TableHead>
                <TableHead>{t('totalAmount')}</TableHead>
                <TableHead>{t('paidAmount')}</TableHead>
                <TableHead>{t('remainingAmount')}</TableHead>
                <TableHead>{tCommon('status')}</TableHead>
                {user?.role !== 'user' && <TableHead>{tCommon('branch')}</TableHead>}
                <TableHead className="text-right">{tCommon('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{new Date(invoice.issuedDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                      {invoice.status === 'overdue' && (
                        <span className="ml-2 text-xs text-red-500">
                          ({Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))}d {tCommon('overdue')})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ฿{invoice.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      ฿{invoice.paidAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className={invoice.remainingAmount > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                      ฿{invoice.remainingAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {t(`invoiceStatus.${invoice.status === 'partially_paid' ? 'partiallyPaid' : invoice.status}` as any)}
                        </Badge>
                      </div>
                    </TableCell>
                    {user?.role !== 'user' && (
                      <TableCell>
                        <Badge variant="outline">
                          {invoice.branchId === 'branch-1' ? 'BKK01' :
                           invoice.branchId === 'branch-2' ? 'CNX01' : 'HKT01'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title={tCommon('view')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={tCommon('download')}>
                          <Download className="h-4 w-4" />
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
