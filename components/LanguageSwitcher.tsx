'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
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
  const t = useTranslations('common')
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currentLocale, setCurrentLocale] = useState('en')

  // Get current locale from URL
  const getCurrentLocaleFromUrl = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path.startsWith('/th')) return 'th'
      if (path.startsWith('/en')) return 'en'
    }
    return 'en'
  }

  // Update locale when component mounts or URL changes
  useEffect(() => {
    const updateLocale = () => {
      const locale = getCurrentLocaleFromUrl()
      setCurrentLocale(locale)
      console.log('LanguageSwitcher locale updated:', locale)
    }

    updateLocale()

    // Listen for URL changes
    const handleUrlChange = () => updateLocale()
    window.addEventListener('popstate', handleUrlChange)

    return () => window.removeEventListener('popstate', handleUrlChange)
  }, [pathname])

  const switchLanguage = (newLocale: string) => {
    setIsOpen(false)

    // Avoid switching to same locale
    if (newLocale === currentLocale) return

    // Get current path from window.location to be more reliable
    const currentPath = window.location.pathname

    // Remove locale prefix more reliably
    let pathWithoutLocale = currentPath

    // Check all possible locales and remove them
    const allLocales = ['en', 'th']
    for (const locale of allLocales) {
      if (currentPath.startsWith(`/${locale}`) || currentPath.startsWith(`/${locale}/`)) {
        pathWithoutLocale = currentPath.substring(`/${locale}`.length)
        break
      }
    }

    // Ensure path starts with / or is empty
    if (pathWithoutLocale && !pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = '/' + pathWithoutLocale
    }
    if (!pathWithoutLocale) {
      pathWithoutLocale = ''
    }

    // Create new URL with new locale
    const newPath = `/${newLocale}${pathWithoutLocale}`

    // Optional: Add smooth transition
    document.body.style.opacity = '0.8'

    // Use window.location for reliable navigation
    window.location.href = newPath
  }

  const currentLanguage = locales.find(locale => locale.code === currentLocale)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
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