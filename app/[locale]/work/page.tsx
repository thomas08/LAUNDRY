'use client'

/**
 * Operator home — the "mode-first" screen the single-scanner MVP calls for.
 *
 * The dashboard answers "how is the business doing"; this answers "what am I
 * doing right now". Floor staff land here and get large, labelled targets with
 * a one-line explanation of each job, so nobody has to decode the sidebar.
 */

import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Plus, FileText, Package, Users, Boxes, Receipt, Building2, ChevronRight,
  type LucideIcon,
} from 'lucide-react'

type Task = {
  key: string
  href: string
  icon: LucideIcon
  /** Accent colour for the icon chip — helps staff recognise a task by shape+colour. */
  tone: string
}

/** Ordered by how often floor staff actually do them. */
const TASKS: Task[] = [
  { key: 'register', href: '/add-item', icon: Plus, tone: 'bg-primary/15 text-primary' },
  { key: 'jobOrder', href: '/operations/job-orders', icon: FileText, tone: 'bg-chart-2/15 text-chart-2' },
  { key: 'findLinen', href: '/inventory', icon: Package, tone: 'bg-chart-1/15 text-chart-1' },
  { key: 'customers', href: '/customers', icon: Users, tone: 'bg-chart-4/15 text-chart-4' },
  { key: 'supplies', href: '/inventory/stock', icon: Boxes, tone: 'bg-chart-5/15 text-chart-5' },
  { key: 'invoice', href: '/finance/invoices', icon: Receipt, tone: 'bg-chart-3/15 text-chart-3' },
]

export default function WorkPage() {
  const t = useTranslations('work')
  const { user } = useAuth()
  const { currentBranch } = useBranch()

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {user?.name ? t('greetingNamed', { name: user.name }) : t('greeting')}
          </h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        {currentBranch && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm">
              {currentBranch.code} - {currentBranch.name}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TASKS.map(({ key, href, icon: Icon, tone }) => (
          <Link key={key} href={href} className="group block focus:outline-none">
            <Card
              className={cn(
                // flex-row is explicit: Card's own base class is flex-col.
                'flex h-full flex-row items-start gap-4 p-5 transition-colors',
                'hover:border-primary/60 hover:bg-accent/40',
                'group-focus-visible:border-primary group-focus-visible:ring-2 group-focus-visible:ring-ring',
              )}
            >
              <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl', tone)}>
                <Icon className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-tight text-foreground">{t(`tasks.${key}.title`)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(`tasks.${key}.desc`)}</p>
              </div>

              <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        {t('dashboardHint')}{' '}
        <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('dashboardLink')}
        </Link>
      </p>
    </div>
  )
}
