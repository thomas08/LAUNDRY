import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type Tone = "danger" | "warning" | "ok"

interface AttentionCardProps {
  title: string
  count: number
  /** Small secondary line under the number (e.g. "3 out of stock"). */
  detail?: string
  href: string
  icon: LucideIcon
  /** Severity when count > 0. A zero count always renders calm/green. */
  tone: Tone
}

const toneStyles: Record<Tone, { text: string; bg: string; border: string }> = {
  danger: { text: "text-red-500", bg: "bg-red-500/10", border: "hover:border-red-500/50" },
  warning: { text: "text-amber-500", bg: "bg-amber-500/10", border: "hover:border-amber-500/50" },
  ok: { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/40" },
}

/**
 * A clickable "needs attention" tile for the dashboard. Navigates to the
 * relevant list page. Renders calm (green, muted number) when count is 0 so a
 * healthy business reads as reassuring rather than alarming.
 */
export function AttentionCard({ title, count, detail, href, icon: Icon, tone }: AttentionCardProps) {
  const s = toneStyles[count > 0 ? tone : "ok"]
  return (
    <Link href={href} className="block focus:outline-none">
      <Card className={cn("border-border bg-card transition-colors", s.border)}>
        <CardContent className="flex items-center gap-4 p-5">
          <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg", s.bg, s.text)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold leading-tight", count > 0 ? s.text : "text-foreground")}>
              {count.toLocaleString()}
            </p>
          </div>
          {detail && <span className="flex-shrink-0 text-right text-xs text-muted-foreground">{detail}</span>}
        </CardContent>
      </Card>
    </Link>
  )
}
