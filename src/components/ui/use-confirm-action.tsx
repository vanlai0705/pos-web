import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
}

type PendingConfirm = ConfirmOptions & {
  resolve: (confirmed: boolean) => void
}

let listener: ((pending: PendingConfirm) => void) | null = null

export function confirmAction(options: ConfirmOptions = {}) {
  return new Promise<boolean>(resolve => {
    if (!listener) {
      resolve(false)
      return
    }
    listener({ ...options, resolve })
  })
}

export function ConfirmActionHost() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  useEffect(() => {
    listener = nextPending => {
      setPending(nextPending)
      setOpen(true)
    }
    return () => { listener = null }
  }, [])

  const close = (confirmed: boolean) => {
    setOpen(false)
    pending?.resolve(confirmed)
    setPending(null)
  }

  return (
    <AlertDialog open={open} onOpenChange={nextOpen => { if (!nextOpen) close(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title ?? t('components.confirmDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.description ?? t('components.confirmDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {pending?.cancelText ?? t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>
            {pending?.confirmText ?? t('components.confirmDialog.confirmText')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
