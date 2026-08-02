import type React from "react"
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthGuard } from "@/components/AuthGuard"
import { Suspense } from "react"
import { locales } from '../../i18n/config';
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { Toaster } from "@/components/ui/sonner";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params
}: Props) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  // Providing all messages to the client
  const messages = await getMessages({locale});

  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable} dark min-h-screen bg-background`} lang={locale}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <AuthProvider>
          <BranchProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <AuthGuard>{children}</AuthGuard>
            </Suspense>
            {/* Toast feedback for saves/errors — inline alerts alone were easy
                to miss when the operator was scrolled down a long form. */}
            {/* theme is pinned: the app shell is always dark, and there is no
                ThemeProvider for sonner's useTheme() to read. */}
            <Toaster theme="dark" position="top-center" richColors closeButton />
            <Analytics />
          </BranchProvider>
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  )
}
