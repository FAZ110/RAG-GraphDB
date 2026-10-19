import type { ReactNode } from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog'
import { Button } from './Button'
import { ErrorNote } from './ErrorNote'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  error?: string | null
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  confirmLabel,
  pending = false,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="deck-lg max-w-md gap-5 rounded-none border border-line bg-surface p-7 ring-0 data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
        <AlertDialogHeader className="gap-2 text-left sm:text-left">
          {/* shadcn's own cn doesn't know the custom text sizes and would drop them */}
          <AlertDialogPrimitive.Title className="text-title text-balance text-fg">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-base text-fg-muted">
            {description}
          </AlertDialogPrimitive.Description>
        </AlertDialogHeader>
        {error && <ErrorNote>{error}</ErrorNote>}
        <AlertDialogFooter className="mx-0 mb-0 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0 pt-1 sm:justify-end">
          <AlertDialogPrimitive.Cancel asChild>
            <Button variant="secondary">Anuluj</Button>
          </AlertDialogPrimitive.Cancel>
          <Button variant="danger" disabled={pending} onClick={onConfirm}>
            {pending ? 'Usuwam...' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
