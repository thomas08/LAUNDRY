'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Loader2, KeyRound, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from '@/lib/navigation'
import { changePasswordRequest } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AccountPage() {
  const t = useTranslations('account')
  const { user, logout } = useAuth()
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const schema = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
      confirmPassword: z.string().min(1),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ['confirmPassword'],
      message: 'mismatch',
    })

  type Form = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (values: Form) => {
    setFormError(null)
    try {
      await changePasswordRequest(values.currentPassword, values.newPassword)
      setDone(true)
      // Backend revoked all refresh tokens — force a clean re-login.
      setTimeout(() => {
        logout()
        router.replace('/login')
      }, 1800)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFormError(t('incorrectCurrent'))
      } else if (err instanceof ApiError && err.code === 'WEAK_PASSWORD') {
        setFormError(t('tooShort'))
      } else if (err instanceof ApiError && err.code === 'SAME_PASSWORD') {
        setFormError(t('sameAsOld'))
      } else {
        setFormError(t('genericError'))
      }
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="h-5 w-5" />
              {t('changePassword')}
            </CardTitle>
            <CardDescription>{t('changePasswordHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <Alert className="border-chart-3 bg-chart-3/10">
                <CheckCircle className="h-4 w-4 text-chart-3" />
                <AlertDescription className="text-chart-3">
                  {t('changed')} {t('mustRelogin')}
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.currentPassword}
                    {...register('currentPassword')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('newPassword')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.newPassword}
                    {...register('newPassword')}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">{t('tooShort')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{t('mismatch')}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? t('submitting') : t('submit')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('accountInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">{t('name')}</span>
              <span className="font-medium">{user?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">{t('email')}</span>
              <span className="font-medium">{user?.email ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('role')}</span>
              <span className="font-medium capitalize">{user?.role ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
