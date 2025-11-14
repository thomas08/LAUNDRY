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
import { DollarSign, TrendingUp, Calendar, CreditCard, Plus, Edit, Trash2, Eye } from 'lucide-react'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/lib/types'

// Mock expense data
const mockExpenses: Expense[] = [
  {
    id: 'exp-001',
    expenseNumber: 'EXP-2024-001',
    category: 'materials',
    description: 'Purchase detergent powder - 50kg',
    amount: 15000,
    vatAmount: 1050,
    totalAmount: 16050,
    date: '2024-01-15',
    paymentMethod: 'bank_transfer',
    paymentDate: '2024-01-15',
    branchId: 'branch-1',
    costCenterId: 'cc-lau',
    supplierId: 'sup-001',
    createdBy: 'user-1',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'exp-002',
    expenseNumber: 'EXP-2024-002',
    category: 'utilities',
    description: 'Electricity bill - December 2023',
    amount: 28500,
    vatAmount: 1995,
    totalAmount: 30495,
    date: '2024-01-10',
    paymentMethod: 'bank_transfer',
    paymentDate: '2024-01-10',
    branchId: 'branch-1',
    costCenterId: 'cc-por',
    createdBy: 'user-1',
    createdAt: '2024-01-10T14:30:00Z'
  },
  {
    id: 'exp-003',
    expenseNumber: 'EXP-2024-003',
    category: 'labor',
    description: 'Operator salary - January 2024',
    amount: 45000,
    totalAmount: 45000,
    date: '2024-01-25',
    paymentMethod: 'cash',
    paymentDate: '2024-01-25',
    branchId: 'branch-1',
    costCenterId: 'cc-por',
    createdBy: 'user-1',
    createdAt: '2024-01-25T09:00:00Z'
  },
  {
    id: 'exp-004',
    expenseNumber: 'EXP-2024-004',
    category: 'maintenance',
    description: 'Washer machine repair - Machine WM-03',
    amount: 12000,
    vatAmount: 840,
    totalAmount: 12840,
    date: '2024-01-20',
    paymentMethod: 'cash',
    paymentDate: '2024-01-20',
    branchId: 'branch-2',
    costCenterId: 'cc-por',
    createdBy: 'user-2',
    createdAt: '2024-01-20T11:15:00Z'
  },
  {
    id: 'exp-005',
    expenseNumber: 'EXP-2024-005',
    category: 'rent',
    description: 'Office rent - January 2024',
    amount: 35000,
    totalAmount: 35000,
    date: '2024-01-01',
    paymentMethod: 'bank_transfer',
    paymentDate: '2024-01-01',
    branchId: 'branch-2',
    costCenterId: 'cc-adm',
    createdBy: 'user-2',
    createdAt: '2024-01-01T08:00:00Z'
  },
  {
    id: 'exp-006',
    expenseNumber: 'EXP-2024-006',
    category: 'transportation',
    description: 'Delivery van fuel - January week 1',
    amount: 3500,
    vatAmount: 245,
    totalAmount: 3745,
    date: '2024-01-08',
    paymentMethod: 'credit_card',
    paymentDate: '2024-01-08',
    branchId: 'branch-3',
    costCenterId: 'cc-log',
    createdBy: 'user-3',
    createdAt: '2024-01-08T16:00:00Z'
  },
  {
    id: 'exp-007',
    expenseNumber: 'EXP-2024-007',
    category: 'office_supplies',
    description: 'Printer paper and toner',
    amount: 2500,
    vatAmount: 175,
    totalAmount: 2675,
    date: '2024-01-12',
    paymentMethod: 'cash',
    paymentDate: '2024-01-12',
    branchId: 'branch-3',
    costCenterId: 'cc-adm',
    createdBy: 'user-3',
    createdAt: '2024-01-12T13:30:00Z'
  },
  {
    id: 'exp-008',
    expenseNumber: 'EXP-2024-008',
    category: 'marketing',
    description: 'Facebook Ads campaign - January',
    amount: 8000,
    vatAmount: 560,
    totalAmount: 8560,
    date: '2024-01-05',
    paymentMethod: 'credit_card',
    paymentDate: '2024-01-05',
    branchId: 'branch-1',
    costCenterId: 'cc-sal',
    createdBy: 'user-1',
    createdAt: '2024-01-05T10:00:00Z'
  }
]

export default function ExpensesPage() {
  const t = useTranslations('finance')
  const tCommon = useTranslations('common')
  const { hasPermission } = useAuth()
  const user = useUser()
  const { currentBranch } = useBranch()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter expenses by branch access
  const accessibleExpenses = useMemo(() => {
    if (!user) return []
    return filterByBranchAccess(user, mockExpenses)
  }, [user])

  // Apply search and filters
  const filteredExpenses = useMemo(() => {
    return accessibleExpenses.filter(expense => {
      const matchesSearch =
        expense.expenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
      const matchesPaymentMethod = paymentMethodFilter === 'all' || expense.paymentMethod === paymentMethodFilter

      return matchesSearch && matchesCategory && matchesPaymentMethod
    })
  }, [accessibleExpenses, searchQuery, categoryFilter, paymentMethodFilter])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0)
    const thisMonth = filteredExpenses.filter(exp => {
      const expDate = new Date(exp.date)
      const now = new Date()
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
    })
    const thisMonthTotal = thisMonth.reduce((sum, exp) => sum + exp.totalAmount, 0)

    const categoryCounts = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

    return {
      totalExpenses: total,
      monthlyExpenses: thisMonthTotal,
      expenseCount: filteredExpenses.length,
      topCategory: topCategory ? topCategory[0] : 'N/A'
    }
  }, [filteredExpenses])

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getCategoryBadgeVariant = (category: ExpenseCategory): "default" | "secondary" | "outline" => {
    if (['materials', 'utilities'].includes(category)) return 'default'
    if (['labor', 'rent'].includes(category)) return 'secondary'
    return 'outline'
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return '💵'
      case 'bank_transfer':
        return '🏦'
      case 'credit_card':
        return '💳'
      case 'cheque':
        return '📋'
      case 'promissory_note':
        return '📝'
      default:
        return '💰'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('expenses')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {tCommon('add')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('total')} {t('expenses')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryMetrics.expenseCount} {tCommon('items')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('thisMonth')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summaryMetrics.monthlyExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('current')} {tCommon('month')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('topCategory')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryMetrics.topCategory !== 'N/A'
                ? t(`categories.${summaryMetrics.topCategory}` as any)
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('mostCommon')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('currentBranch')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentBranch?.code || 'ALL'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentBranch?.name || tCommon('allBranches')}
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
                placeholder={tCommon('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('category')}</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  <SelectItem value="materials">{t('categories.materials')}</SelectItem>
                  <SelectItem value="utilities">{t('categories.utilities')}</SelectItem>
                  <SelectItem value="labor">{t('categories.labor')}</SelectItem>
                  <SelectItem value="rent">{t('categories.rent')}</SelectItem>
                  <SelectItem value="maintenance">{t('categories.maintenance')}</SelectItem>
                  <SelectItem value="transportation">{t('categories.transportation')}</SelectItem>
                  <SelectItem value="office_supplies">{t('categories.officeSupplies')}</SelectItem>
                  <SelectItem value="marketing">{t('categories.marketing')}</SelectItem>
                  <SelectItem value="other">{t('categories.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('paymentMethod')}</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  <SelectItem value="cash">{t('paymentMethods.cash')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('paymentMethods.bankTransfer')}</SelectItem>
                  <SelectItem value="credit_card">{t('paymentMethods.creditCard')}</SelectItem>
                  <SelectItem value="cheque">{t('paymentMethods.cheque')}</SelectItem>
                  <SelectItem value="promissory_note">{t('paymentMethods.promissoryNote')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('expenses')} {tCommon('list')}</CardTitle>
          <CardDescription>
            {tCommon('showing')} {paginatedExpenses.length} {tCommon('of')} {filteredExpenses.length} {t('expenses').toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('expenseNumber')}</TableHead>
                <TableHead>{t('category')}</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('paymentMethod')}</TableHead>
                <TableHead>{t('paymentDate')}</TableHead>
                {user?.role !== 'user' && <TableHead>{tCommon('branch')}</TableHead>}
                <TableHead className="text-right">{tCommon('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {tCommon('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.expenseNumber}</TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadgeVariant(expense.category)}>
                        {t(`categories.${expense.category}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                    <TableCell className="font-semibold">
                      ฿{expense.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {getPaymentMethodIcon(expense.paymentMethod)}
                        {t(`paymentMethods.${expense.paymentMethod === 'bank_transfer' ? 'bankTransfer' : expense.paymentMethod === 'credit_card' ? 'creditCard' : expense.paymentMethod === 'promissory_note' ? 'promissoryNote' : expense.paymentMethod === 'office_supplies' ? 'officeSupplies' : expense.paymentMethod}` as any)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {expense.paymentDate ? new Date(expense.paymentDate).toLocaleDateString() : '-'}
                    </TableCell>
                    {user?.role !== 'user' && (
                      <TableCell>
                        <Badge variant="outline">
                          {expense.branchId === 'branch-1' ? 'BKK01' :
                           expense.branchId === 'branch-2' ? 'CNX01' : 'HKT01'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasPermission('update') && (
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('delete') && (
                          <Button variant="ghost" size="icon">
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
