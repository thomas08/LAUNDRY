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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Scan, Plus, CheckCircle, AlertCircle, Users, TrendingUp } from "lucide-react"

// Mock linen inventory data for check-in (items currently on rent)
const mockRentedItems: (LinenItem & { branchId: string; customerName?: string })[] = [
  // Bangkok Central (branch-1)
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

  // Chiang Mai (branch-2)
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

export default function CheckInPage() {
  const t = useTranslations('checkin')
  const tCommon = useTranslations('common')
  const tInventory = useTranslations('inventory')
  const { hasPermission } = useAuth()
  const user = useUser()
  const { currentBranch } = useBranch()

  const [tagId, setTagId] = useState("")
  const [checkedInItems, setCheckedInItems] = useState<(LinenItem & { branchId: string; customerName?: string })[]>([])
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filter items by branch access
  const accessibleItems = useMemo(() => {
    if (!user) return []
    return filterByBranchAccess(user, mockRentedItems)
  }, [user])

  const handleCheckIn = () => {
    if (!hasPermission('create')) {
      setAlert({ type: 'error', message: t('noPermission') })
      setTimeout(() => setAlert(null), 3000)
      return
    }

    if (!tagId.trim()) {
      setAlert({ type: 'error', message: t('enterTagId') })
      return
    }

    // Check if item already checked in
    if (checkedInItems.some(item => item.tagId === tagId)) {
      setAlert({ type: 'error', message: t('alreadyCheckedIn', { tagId }) })
      return
    }

    // Find item in accessible inventory
    const item = accessibleItems.find(item => item.tagId === tagId)

    if (!item) {
      setAlert({ type: 'error', message: t('itemNotFound', { tagId }) })
      return
    }

    if (item.status !== 'on_rent') {
      setAlert({ type: 'error', message: t('notOnRent', { tagId, status: item.status }) })
      return
    }

    // Create checked-in item with updated status
    const checkedInItem = {
      ...item,
      status: 'washing' as const
    }

    setCheckedInItems(prev => [...prev, checkedInItem])
    setAlert({ type: 'success', message: t('successMessage', { tagId }) })
    setTagId("")

    // Clear alert after 3 seconds
    setTimeout(() => setAlert(null), 3000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheckIn()
    }
  }

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

  // Calculate stats
  const stats = useMemo(() => {
    const itemsCount = checkedInItems.length
    const customersCount = new Set(checkedInItems.map(item => item.customerId)).size
    const avgWashCycles = itemsCount > 0
      ? Math.round(checkedInItems.reduce((sum, item) => sum + item.washCycles, 0) / itemsCount)
      : 0

    return { itemsCount, customersCount, avgWashCycles }
  }, [checkedInItems])

  if (!user) {
    return (
      <div className="min-h-screen p-8">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">{tCommon('loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Check-in Form */}
      <Card className="mb-8 border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Scan className="h-5 w-5" />
            {t('scanOrEnter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('placeholder')}
                value={tagId}
                onChange={(e) => setTagId(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="text-lg"
                autoFocus
                disabled={!hasPermission('create')}
              />
            </div>
            <Button
              onClick={handleCheckIn}
              className="px-6"
              size="lg"
              disabled={!hasPermission('create')}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('checkIn')}
            </Button>
          </div>

          {!hasPermission('create') && (
            <Alert className="mt-4 border-destructive bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                {t('noPermission')}
              </AlertDescription>
            </Alert>
          )}

          {alert && (
            <Alert className={`mt-4 ${alert.type === 'success' ? 'border-chart-3 bg-chart-3/10' : 'border-destructive bg-destructive/10'}`}>
              {alert.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-chart-3" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription className={alert.type === 'success' ? 'text-chart-3' : 'text-destructive'}>
                {alert.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Checked-in Items */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            {t('checkedInItems')} ({checkedInItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkedInItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">{tInventory('tagId')}</TableHead>
                    <TableHead className="text-muted-foreground">{tCommon('type')}</TableHead>
                    <TableHead className="text-muted-foreground">{tCommon('customer')}</TableHead>
                    <TableHead className="text-muted-foreground">{t('previousStatus')}</TableHead>
                    <TableHead className="text-muted-foreground">{t('newStatus')}</TableHead>
                    <TableHead className="text-muted-foreground">{tInventory('washCycles')}</TableHead>
                    {user.role !== 'user' && <TableHead className="text-muted-foreground">{tCommon('branch')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedInItems.map((item, index) => (
                    <TableRow key={`${item.tagId}-${index}`} className="border-border hover:bg-accent/50">
                      <TableCell className="font-mono text-sm text-foreground">{item.tagId}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        <Badge variant="outline">
                          {tInventory(`types.${getLinenTypeKey(item.type)}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {item.customerName || item.customerId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-chart-4/20 text-chart-4 border-chart-4/30">
                          {tInventory('status.onRent')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {tInventory('status.washing')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.washCycles}</TableCell>
                      {user.role !== 'user' && (
                        <TableCell>
                          <Badge variant="outline">
                            {item.branchId === 'branch-1' ? 'BKK01' :
                             item.branchId === 'branch-2' ? 'CNX01' : 'HKT01'}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('noItemsYet')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {checkedInItems.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.itemsCount}</div>
                  <div className="text-sm text-muted-foreground">{t('itemsCheckedIn')}</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.customersCount}</div>
                  <div className="text-sm text-muted-foreground">{tCommon('customers')}</div>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.avgWashCycles}</div>
                  <div className="text-sm text-muted-foreground">{tCommon('average')} {tInventory('washCycles')}</div>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
