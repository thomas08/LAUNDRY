'use client'

/**
 * EmptyState — a shared "there is nothing here yet" block.
 *
 * Empty tables used to be dead ends ("No customers found") that left the
 * operator guessing what to do. This renders the same information as an
 * explanation plus the one action that actually unblocks them.
 *
 * Drop it inside a full-width <TableCell colSpan={n}> or straight into a card.
 */

import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/lib/navigation'
import { cn } from '@/lib/utils'

type Props = {
  icon?: LucideIcon
  /** Short headline — what is missing. */
  title: string
  /** One line explaining what this list is for, in plain language. */
  description?: string
  /** Primary action. Provide either `actionHref` (navigate) or `onAction` (in-page dialog). */
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  /** Optional secondary link, e.g. "create a linen type first". */
  secondaryLabel?: string
  secondaryHref?: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  className,
}: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {(actionLabel || secondaryLabel) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && actionHref && (
            <Button asChild size="sm">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          )}
          {actionLabel && !actionHref && onAction && (
            <Button size="sm" onClick={onAction}>{actionLabel}</Button>
          )}
          {secondaryLabel && secondaryHref && (
            <Button asChild size="sm" variant="ghost">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
