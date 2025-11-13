'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from '@/lib/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'

const locales = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
] as const

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()
  const [isPending, startTransition] = useTransition()

  const switchLanguage = (newLocale: string) => {
    // Avoid switching to same locale
    if (newLocale === currentLocale) return

    // Use startTransition for smooth navigation
    // next-intl's router automatically handles locale switching
    startTransition(() => {
      router.replace(pathname, { locale: newLocale as any })
    })
  }

  const currentLanguage = locales.find(locale => locale.code === currentLocale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.flag} {currentLanguage?.name}
          </span>
          <span className="sm:hidden">
            {currentLanguage?.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => switchLanguage(locale.code)}
            disabled={isPending || locale.code === currentLocale}
            className={`cursor-pointer gap-2 ${
              locale.code === currentLocale
                ? 'bg-accent text-accent-foreground'
                : ''
            }`}
          >
            <span>{locale.flag}</span>
            <span>{locale.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}