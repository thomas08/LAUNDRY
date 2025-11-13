import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from '@/i18n/config';

export const { Link, usePathname, useRouter, redirect, permanentRedirect } =
  createNavigation({
    locales,
    defaultLocale,
    localePrefix: 'always'
  });
