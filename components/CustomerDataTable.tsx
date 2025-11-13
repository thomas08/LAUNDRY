'use client'

/**
 * CustomerDataTable - Advanced table with search, filter, and pagination
 * Integrates with AuthContext and BranchContext for RBAC and multi-tenancy
 */

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Customer } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { filterByBranchAccess } from '@/lib/auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronLeft, ChevronRight, Filter, Eye, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface CustomerDataTableProps {
  customers: Customer[]
}

export function CustomerDataTable({ customers }: CustomerDataTableProps) {
  const t = useTranslations('customers')
  const { user, hasPermission } = useAuth()
  const { currentBranch, availableBranches } = useBranch()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter customers by branch access
  const accessibleCustomers = useMemo(() => {
    if (!user) return []
    return filterByBranchAccess(user, customers)
  }, [user, customers])

  // Apply search and branch filter
  const filteredCustomers = useMemo(() => {
    let result = accessibleCustomers

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (customer) =>
          customer.name.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.phone.toLowerCase().includes(query) ||
          customer.contactPerson?.toLowerCase().includes(query)
      )
    }

    // Branch filter (only show if user has access to multiple branches)
    if (selectedBranchId !== 'all') {
      result = result.filter((customer) => customer.branchId === selectedBranchId)
    }

    return result
  }, [accessibleCustomers, searchQuery, selectedBranchId])

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCustomers, currentPage])

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleBranchChange = (value: string) => {
    setSelectedBranchId(value)
    setCurrentPage(1)
  }

  // Get branch name by ID
  const getBranchName = (branchId: string) => {
    const branch = availableBranches.find((b) => b.id === branchId)
    return branch?.name || branch?.code || branchId
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters')}
          </CardTitle>
          <CardDescription>
            {t('filterDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Branch Filter - Only show if user has access to multiple branches */}
            {availableBranches.length > 1 && (
              <Select value={selectedBranchId} onValueChange={handleBranchChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('selectBranch')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allBranches')}</SelectItem>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            {t('showingResults', {
              count: filteredCustomers.length,
              total: accessibleCustomers.length
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('contactPerson')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('phone')}</TableHead>
              {user?.role !== 'user' && <TableHead>{t('branch')}</TableHead>}
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCustomers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={user?.role !== 'user' ? 6 : 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery || selectedBranchId !== 'all'
                    ? t('noResultsFound')
                    : t('noCustomers')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.contactPerson}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  {user?.role !== 'user' && (
                    <TableCell>
                      <Badge variant="outline">
                        {getBranchName(customer.branchId)}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* View Button */}
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/customers/${customer.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>

                      {/* Edit Button - Only for users with 'update' permission */}
                      {hasPermission('update') && (
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete Button - Only for users with 'delete' permission */}
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
        {filteredCustomers.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              {t('page')} {currentPage} {t('of')} {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t('next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
