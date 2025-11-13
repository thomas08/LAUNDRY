'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const [isPending, startTransition] = useTransition()

  // Extract current locale directly from pathname - this is the source of truth
  // pathname is like "/th/customers" or "/en/dashboard"
  const currentLocale = pathname.split('/')[1] || 'en'

  const switchLanguage = (newLocale: string) => {
    // Avoid switching to same locale
    if (newLocale === currentLocale) return

    // Get path without current locale
    const pathWithoutLocale = pathname.replace(new RegExp(`^/${currentLocale}`), '') || '/'

    // Create new path with new locale
    const newPath = `/${newLocale}${pathWithoutLocale}`

    // Use startTransition for smooth navigation
    startTransition(() => {
      router.replace(newPath)
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