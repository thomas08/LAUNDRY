'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import type { Customer, JobOrder, JobOrderStatus, ServiceType } from '@/lib/types'
import { fetchCustomer } from '@/lib/api/customers'
import { fetchJobOrders } from '@/lib/api/job-orders'
import { ApiError } from '@/lib/api/client'
import { CustomerPriceList } from '@/components/CustomerPriceList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Mail, Phone, MapPin, Calendar, ArrowLeft, AlertTriangle, Building2, CreditCard, Loader2,
} from 'lucide-react'

const statusKey = (s: JobOrderStatus) =>
  s === 'in_progress' ? 'inProgress' : s === 'quality_check' ? 'qualityCheck' : s
const serviceKey = (s: ServiceType) =>
  s === 'wash_fold' ? 'washFold' : s === 'dry_clean' ? 'dryClean' : s === 'iron_only' ? 'ironOnly' : s === 'wash_iron' ? 'washIron' : s

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('customers')
  const tc = useTranslations('common')
  const tOps = useTranslations('operations')
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCustomer(customerId)
      .then((c) => {
        if (cancelled) return
        setCustomer(c)
        // load this customer's job orders (best-effort; ignore failures)
        fetchJobOrders({ customerId }).then((o) => { if (!cancelled) setJobOrders(o) }).catch(() => {})
      })
      .catch((err) => { if (!cancelled) setErrorStatus(err instanceof ApiError ? err.status : 500) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [customerId])

  const BackButton = () => (
    <Button variant="ghost" onClick={() => router.push('/customers')} className="mb-4">
      <ArrowLeft className="mr-2 h-4 w-4" />
      {tc('back')}
    </Button>
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (errorStatus || !customer) {
    const forbidden = errorStatus === 403
    return (
      <div className="min-h-screen p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {forbidden ? tc('noAccessToBranch') : `${t('customerNotFound')} (ID: ${customerId})`}
          </AlertDescription>
        </Alert>
        <BackButton />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6">
        <BackButton />
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{customer.name}</h1>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              <p>{t('customerDetails')}</p>
              {customer.customerType && (
                <Badge variant="outline">{t(`customerTypes.${customer.customerType}`)}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t('contactInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {customer.email && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{tc('email')}</p>
                    <a href={`mailto:${customer.email}`} className="mt-1 text-sm hover:underline">{customer.email}</a>
                  </div>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                    <Phone className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{tc('phone')}</p>
                    <a href={`tel:${customer.phone}`} className="mt-1 text-sm hover:underline">{customer.phone}</a>
                  </div>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
                    <MapPin className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('address')}</p>
                    <p className="mt-1 text-sm leading-relaxed">{customer.address}</p>
                  </div>
                </div>
              )}
              {customer.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('customerSince')}</p>
                    <p className="mt-1 text-sm">{new Date(customer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{t('additionalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.contactPerson && (
                <Row label={t('contactPerson')} value={customer.contactPerson} />
              )}
              {customer.taxId && <Row label={t('taxId')} value={customer.taxId} mono />}
              {customer.creditLimit != null && (
                <Row label={t('creditLimit')} value={`฿${customer.creditLimit.toLocaleString()}`} />
              )}
              {customer.currentBalance != null && (
                <Row label={t('currentBalance')} value={`฿${customer.currentBalance.toLocaleString()}`} />
              )}
              {customer.paymentTerms != null && (
                <Row label={t('paymentTerms')} value={`${customer.paymentTerms} ${tc('days')}`} />
              )}
              {customer.vatRate != null && (
                <Row
                  label={t('vatRate')}
                  value={customer.vatRate > 0 ? `${(customer.vatRate * 100).toFixed(0)}%` : t('noVat')}
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tc('status')}</span>
                <Badge variant={customer.isActive ? 'default' : 'outline'}>
                  {customer.isActive ? tc('active') : tc('inactive')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Per-customer rate card — prices are negotiated per account */}
          <CustomerPriceList customerId={customerId} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5" />
                {t('jobOrders')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <CreditCard className="mb-3 h-8 w-8 opacity-50" />
                  <p>{tc('noData')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tOps('orderNumber')}</TableHead>
                        <TableHead>{tOps('serviceType')}</TableHead>
                        <TableHead>{tOps('dueDate')}</TableHead>
                        <TableHead className="text-right">{tOps('totalPrice')}</TableHead>
                        <TableHead>{tc('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-sm">{o.orderNumber}</TableCell>
                          <TableCell><Badge variant="outline">{tOps(`serviceTypes.${serviceKey(o.serviceType)}`)}</Badge></TableCell>
                          <TableCell>{o.dueDate ? new Date(o.dueDate).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-right font-medium">฿{o.totalPrice.toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline">{tOps(`jobStatus.${statusKey(o.status)}`)}</Badge></TableCell>
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
