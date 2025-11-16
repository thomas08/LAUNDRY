'use client'

import { useTranslations } from "next-intl"
import { useState, useMemo } from "react"
import { Supplier } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react"

export default function SuppliersPage() {
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')
  const { user, hasPermission } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Mock data - Will be replaced with API calls
  const mockSuppliers: Supplier[] = [
    {
      id: "sup-001",
      code: "SUP-001",
      name: "Prima Plus Co., Ltd.",
      nameTh: "บริษัท พรีมา พลัส จำกัด",
      nameEn: "Prima Plus Co., Ltd.",
      contactPerson: "คุณสมชาย วงศ์สุวรรณ",
      email: "sales@primaplus.co.th",
      phone: "+66-2-555-1234",
      address: "123 ถนนพระราม 4 แขวงพระโขนง เขตคลองเตย กรุงเทพฯ 10110",
      taxId: "0105558123456",
      paymentTerms: 30,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "sup-002",
      code: "SUP-002",
      name: "ChemClean Solutions",
      nameTh: "เคมคลีน โซลูชั่น",
      nameEn: "ChemClean Solutions",
      contactPerson: "Ms. Sunisa Tanaka",
      email: "contact@chemclean.com",
      phone: "+66-2-666-5678",
      address: "456 Sukhumvit Road, Bangkok 10110",
      taxId: "0105559234567",
      paymentTerms: 45,
      isActive: true,
      createdAt: "2024-01-05T00:00:00Z",
      updatedAt: "2024-01-20T14:20:00Z"
    },
    {
      id: "sup-003",
      code: "SUP-003",
      name: "Thai Packaging Industry",
      nameTh: "ไทยแพ็คเกจจิ้ง อินดัสทรี",
      nameEn: "Thai Packaging Industry",
      contactPerson: "Mr. Wichai Mongkol",
      email: "info@thaipack.co.th",
      phone: "+66-2-777-9012",
      address: "789 Rama 9 Road, Bangkok 10320",
      taxId: "0105560345678",
      paymentTerms: 30,
      isActive: true,
      createdAt: "2024-01-10T00:00:00Z",
      updatedAt: "2024-01-25T09:15:00Z"
    },
    {
      id: "sup-004",
      code: "SUP-004",
      name: "PTT LPG Distribution",
      nameTh: "พีทีที แอลพีจี",
      nameEn: "PTT LPG Distribution",
      contactPerson: "Ms. Kanokwan Srisai",
      email: "service@pttlpg.com",
      phone: "+66-2-888-3456",
      address: "555 Energy Complex, Bangkok 10900",
      taxId: "0105561456789",
      paymentTerms: 15,
      isActive: true,
      createdAt: "2024-01-12T00:00:00Z",
      updatedAt: "2024-01-28T11:40:00Z"
    },
    {
      id: "sup-005",
      code: "SUP-005",
      name: "Global Hanger Manufacturing",
      nameTh: "โกลบอล แฮงเกอร์ แมนูแฟคเจอริ่ง",
      nameEn: "Global Hanger Manufacturing",
      contactPerson: "Mr. Somchai Prasert",
      email: "sales@globalhanger.com",
      phone: "+66-2-999-7890",
      address: "321 Industrial Estate, Samut Prakan 10280",
      taxId: "0105562567890",
      paymentTerms: 60,
      isActive: true,
      createdAt: "2024-01-18T00:00:00Z",
      updatedAt: "2024-02-01T16:20:00Z"
    },
    {
      id: "sup-006",
      code: "SUP-006",
      name: "Eco Bleach Solutions (Inactive)",
      nameTh: "อีโค บลีช โซลูชั่น (ไม่ใช้งาน)",
      nameEn: "Eco Bleach Solutions (Inactive)",
      contactPerson: "Mr. Prasit Khamwan",
      email: "old@ecobleach.com",
      phone: "+66-2-111-2222",
      address: "999 Old Street, Bangkok 10400",
      taxId: "0105563678901",
      paymentTerms: 30,
      isActive: false,
      createdAt: "2023-06-01T00:00:00Z",
      updatedAt: "2023-12-31T23:59:00Z"
    },
  ]

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    let result = mockSuppliers

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.code.toLowerCase().includes(query) ||
          supplier.contactPerson.toLowerCase().includes(query) ||
          supplier.email.toLowerCase().includes(query) ||
          supplier.phone.includes(query) ||
          supplier.nameTh?.toLowerCase().includes(query) ||
          supplier.nameEn?.toLowerCase().includes(query)
      )
    }

    // Filter out inactive suppliers by default
    result = result.filter((s) => s.isActive)

    return result
  }, [searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSuppliers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSuppliers, currentPage])

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalSuppliers = mockSuppliers.filter((s) => s.isActive).length
    const inactiveSuppliers = mockSuppliers.filter((s) => !s.isActive).length
    const avgPaymentTerms = Math.round(
      mockSuppliers
        .filter((s) => s.isActive)
        .reduce((sum, s) => sum + (s.paymentTerms || 0), 0) / totalSuppliers
    )

    return { totalSuppliers, inactiveSuppliers, avgPaymentTerms }
  }, [])

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        {hasPermission('create') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('addSupplier')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeSuppliers')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              {t('inactiveCount', { count: metrics.inactiveSuppliers })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgPaymentTerms')}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgPaymentTerms} {t('days')}</div>
            <p className="text-xs text-muted-foreground">{t('creditPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalContacts')}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">{t('supplierContacts')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('searchAndFilter')}</CardTitle>
          <CardDescription>{t('searchPlaceholder')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${t('supplierName')}, ${t('supplierCode')}, ${t('email')}...`}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {t('showingOf', { count: filteredSuppliers.length, total: metrics.totalSuppliers })}
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('supplierCode')}</TableHead>
              <TableHead>{t('supplierName')}</TableHead>
              <TableHead>{t('contactPerson')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('phone')}</TableHead>
              <TableHead className="text-right">{t('paymentTerms')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? t('noMatchingSuppliers') : t('noSuppliersFound')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono font-medium">{supplier.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.nameTh && supplier.nameTh !== supplier.name && (
                        <div className="text-xs text-muted-foreground">{supplier.nameTh}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{supplier.contactPerson}</TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${supplier.email}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {supplier.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`tel:${supplier.phone}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {supplier.phone}
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{supplier.paymentTerms} {t('days')}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* View Button */}
                      <Button variant="ghost" size="icon" title={t('viewDetails')}>
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Edit Button */}
                      {hasPermission('update') && (
                        <Button variant="ghost" size="icon" title={t('editSupplier')}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete Button */}
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
        {filteredSuppliers.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              {t('pageOf', { current: currentPage, total: totalPages })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {tCommon('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {tCommon('next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tax ID and Address Info */}
      {paginatedSuppliers.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('additionalInfo')}</CardTitle>
            <CardDescription>{t('taxIdAndAddresses')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paginatedSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{supplier.name}</div>
                    <div className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{supplier.address}</span>
                    </div>
                    {supplier.taxId && (
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">{t('taxId')}:</span>{" "}
                        <span className="font-mono">{supplier.taxId}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
