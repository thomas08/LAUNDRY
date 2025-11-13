import type React from "react"
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Sidebar } from "@/components/sidebar"
import { Suspense } from "react"
import { locales } from '../../i18n/config';

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
      <NextIntlClientProvider messages={messages}>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 w-full md:pl-64 pt-16 md:pt-0">{children}</main>
          </div>
        </Suspense>
        <Analytics />
      </NextIntlClientProvider>
    </div>
  )
}
