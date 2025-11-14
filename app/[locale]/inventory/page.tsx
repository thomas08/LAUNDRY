'use client'

import { useState, useMemo } from "react"
import { useTranslations } from 'next-intl'
import { useAuth, useUser } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { filterByBranchAccess } from '@/lib/auth'
import { LinenItem } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Package, TrendingUp, AlertCircle, Plus, Edit, Trash2, Eye } from "lucide-react"

// Mock linen inventory data with branches
const mockLinenItems: (LinenItem & { branchId: string; customerName?: string })[] = [
  // Bangkok Central (branch-1)
  {
    id: "linen-001",
    tagId: "LN001",
    type: "bed_sheet",
    customerId: "cust-001",
    customerName: "Riverside Hotel Bangkok",
    status: "in_stock",
    washCycles: 12,
    branchId: "branch-1",
    createdAt: "2023-06-15T10:00:00Z"
  },
  {
    id: "linen-002",
    tagId: "LN002",
    type: "towel",
    customerId: "cust-002",
    customerName: "Grand Palace Hotel",
    status: "on_rent",
    washCycles: 8,
    branchId: "branch-1",
    createdAt: "2023-07-20T11:30:00Z"
  },
  {
    id: "linen-003",
    tagId: "LN003",
    type: "tablecloth",
    customerId: "cust-003",
    customerName: "Bangkok Suites",
    status: "washing",
    washCycles: 15,
    branchId: "branch-1",
    createdAt: "2023-08-10T09:15:00Z"
  },
  {
    id: "linen-004",
    tagId: "LN004",
    type: "bed_sheet",
    customerId: "cust-001",
    customerName: "Riverside Hotel Bangkok",
    status: "in_stock",
    washCycles: 5,
    branchId: "branch-1",
    createdAt: "2023-09-05T14:00:00Z"
  },
  {
    id: "linen-005",
    tagId: "LN005",
    type: "pillow_case",
    customerId: "cust-004",
    customerName: "Silom Business Hotel",
    status: "on_rent",
    washCycles: 22,
    branchId: "branch-1",
    createdAt: "2023-10-12T16:20:00Z"
  },
  {
    id: "linen-006",
    tagId: "LN006",
    type: "towel",
    customerId: "cust-002",
    customerName: "Grand Palace Hotel",
    status: "in_stock",
    washCycles: 18,
    branchId: "branch-1",
    createdAt: "2023-11-08T10:45:00Z"
  },

  // Chiang Mai (branch-2)
  {
    id: "linen-007",
    tagId: "LN007",
    type: "uniform",
    customerId: "cust-006",
    customerName: "Nimman Heritage Hotel",
    status: "washing",
    washCycles: 9,
    branchId: "branch-2",
    createdAt: "2023-07-18T13:00:00Z"
  },
  {
    id: "linen-008",
    tagId: "LN008",
    type: "tablecloth",
    customerId: "cust-007",
    customerName: "Old City Resort",
    status: "in_stock",
    washCycles: 7,
    branchId: "branch-2",
    createdAt: "2023-08-25T15:30:00Z"
  },
  {
    id: "linen-009",
    tagId: "LN009",
    type: "bed_sheet",
    customerId: "cust-008",
    customerName: "Ping River View Hotel",
    status: "on_rent",
    washCycles: 14,
    branchId: "branch-2",
    createdAt: "2023-09-30T11:00:00Z"
  },
  {
    id: "linen-010",
    tagId: "LN010",
    type: "towel",
    customerId: "cust-009",
    customerName: "Mountain Spa Resort",
    status: "in_stock",
    washCycles: 11,
    branchId: "branch-2",
    createdAt: "2023-10-20T09:30:00Z"
  },

  // Phuket (branch-3)
  {
    id: "linen-011",
    tagId: "LN011",
    type: "bed_sheet",
    customerId: "cust-011",
    customerName: "Patong Beach Resort",
    status: "on_rent",
    washCycles: 20,
    branchId: "branch-3",
    createdAt: "2023-06-28T14:15:00Z"
  },
  {
    id: "linen-012",
    tagId: "LN012",
    type: "towel",
    customerId: "cust-012",
    customerName: "Kata View Hotel",
    status: "washing",
    washCycles: 16,
    branchId: "branch-3",
    createdAt: "2023-07-15T12:00:00Z"
  },
  {
    id: "linen-013",
    tagId: "LN013",
    type: "pillow_case",
    customerId: "cust-013",
    customerName: "Phuket Wellness Spa",
    status: "in_stock",
    washCycles: 6,
    branchId: "branch-3",
    createdAt: "2023-08-10T10:20:00Z"
  },
  {
    id: "linen-014",
    tagId: "LN014",
    type: "uniform",
    customerId: "cust-015",
    customerName: "Island Fitness Center",
    status: "on_rent",
    washCycles: 13,
    branchId: "branch-3",
    createdAt: "2023-09-05T16:45:00Z"
  }
]

export default function InventoryPage() {
  const t = useTranslations('inventory')
  const tCommon = useTranslations('common')
  const { hasPermission } = useAuth()
  const user = useUser()
  const { currentBranch } = useBranch()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter items by branch access
  const accessibleItems = useMemo(() => {
    if (!user) return []
    return filterByBranchAccess(user, mockLinenItems)
  }, [user])

  // Apply search and status filters
  const filteredItems = useMemo(() => {
    return accessibleItems.filter((item) => {
      const matchesSearch =
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tagId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [accessibleItems, searchTerm, statusFilter])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredItems.length
    const inStock = filteredItems.filter(item => item.status === 'in_stock').length
    const onRent = filteredItems.filter(item => item.status === 'on_rent').length
    const washing = filteredItems.filter(item => item.status === 'washing').length
    const avgWashCycles = filteredItems.reduce((sum, item) => sum + item.washCycles, 0) / total || 0

    return { total, inStock, onRent, washing, avgWashCycles }
  }, [filteredItems])

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Status color mapping
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'in_stock':
        return "default"
      case 'washing':
        return "secondary"
      case 'on_rent':
        return "outline"
      default:
        return "outline"
    }
  }

  // Linen type translation helper
  const getLinenTypeKey = (type: string) => {
    const typeMap: Record<string, string> = {
      'bed_sheet': 'bedSheet',
      'pillow_case': 'pillowCase',
      'duvet_cover': 'duvetCover',
      'tablecloth': 'tablecloth',
      'towel': 'towel',
      'bathrobe': 'bathrobe',
      'uniform': 'uniform',
      'napkin': 'napkin',
      'curtain': 'curtain'
    }
    return typeMap[type] || type
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        {hasPermission('create') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {tCommon('add')} {t('item')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('total')} {t('items')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {tCommon('all')} {t('items').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('status.inStock')}</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryMetrics.inStock}</div>
            <p className="text-xs text-muted-foreground">
              {tCommon('available')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('status.onRent')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryMetrics.onRent}</div>
            <p className="text-xs text-muted-foreground">
              {tCommon('withCustomers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tCommon('average')} {t('washCycles')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryMetrics.avgWashCycles.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              {tCommon('cycles')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{tCommon('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={tCommon('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')} {tCommon('status')}</SelectItem>
                  <SelectItem value="in_stock">{t('status.inStock')}</SelectItem>
                  <SelectItem value="on_rent">{t('status.onRent')}</SelectItem>
                  <SelectItem value="washing">{t('status.washing')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            {t('inventoryItems')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">{t('tagId')}</TableHead>
                  <TableHead className="text-muted-foreground">{tCommon('type')}</TableHead>
                  <TableHead className="text-muted-foreground">{tCommon('customer')}</TableHead>
                  <TableHead className="text-muted-foreground">{tCommon('status')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('washCycles')}</TableHead>
                  {user?.role !== 'user' && <TableHead className="text-muted-foreground">{tCommon('branch')}</TableHead>}
                  <TableHead className="text-right text-muted-foreground">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((item) => (
                    <TableRow key={item.tagId} className="border-border hover:bg-accent/50">
                      <TableCell className="font-mono text-sm font-medium text-foreground">
                        {item.tagId}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <Badge variant="outline">
                          {t(`types.${getLinenTypeKey(item.type)}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {item.customerName || item.customerId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {t(`status.${item.status === 'in_stock' ? 'inStock' : item.status === 'on_rent' ? 'onRent' : item.status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.washCycles}</TableCell>
                      {user?.role !== 'user' && (
                        <TableCell>
                          <Badge variant="outline">
                            {item.branchId === 'branch-1' ? 'BKK01' :
                             item.branchId === 'branch-2' ? 'CNX01' : 'HKT01'}
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
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {tCommon('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {tCommon('showing')} {paginatedItems.length} {tCommon('of')} {filteredItems.length} {t('items').toLowerCase()}
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
                <div className="flex items-center px-3 text-sm">
                  {tCommon('page')} {currentPage} {tCommon('of')} {totalPages}
                </div>
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
