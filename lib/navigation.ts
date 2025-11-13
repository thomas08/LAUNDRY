import { createNavigation } from 'next-intl/navigation';
import { locales } from '@/i18n/config';

export const { Link, usePathname, useRouter, redirect, permanentRedirect } =
  createNavigation({
    locales,
    localePrefix: 'always'
  });
