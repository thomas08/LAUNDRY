'use client'

import { useTranslations } from 'next-intl'
import { DispatchLabel } from "@/components/DispatchLabel"

export default function DispatchPage() {
  const t = useTranslations('dispatch')
  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <DispatchLabel />
    </div>
  )
}
