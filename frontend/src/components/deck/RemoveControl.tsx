import { useState } from 'react'
import type { ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmPopover } from './ConfirmPopover'
import { IconButton } from './IconButton'
import { InlineConfirm } from './InlineConfirm'

interface Props {
  label: string
  question: string
  detail?: string
  blockedBy?: string
  pending: boolean
  error: string | null
  onOpen?: () => void
  /** Call `done` on success to close the question. */
  onConfirm: (done: () => void) => void
  inRow?: boolean
  className?: string
  /** Other controls shown with the button, in a wrapper styled by `groupClassName`. */
  leading?: ReactNode
  groupClassName?: string
}

export function RemoveControl({
  label,
  question,
  detail,
  blockedBy,
  pending,
  error,
  onOpen,
  onConfirm,
  inRow = false,
  className,
  leading,
  groupClassName,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [byKeyboard, setByKeyboard] = useState(false)
  const setOpen = (open: boolean) => {
    if (open) onOpen?.()
    setConfirming(open)
  }
  const close = () => setOpen(false)

  const iconButton = (
    <IconButton
      variant="remove"
      size="icon-sm"
      label={blockedBy ?? label}
      aria-label={label}
      disabled={blockedBy !== undefined}
      className={cn(className, inRow && confirming && 'invisible')}
      onClick={
        inRow
          ? (e) => {
              setByKeyboard(e.detail === 0)
              setOpen(true)
            }
          : undefined
      }
    >
      <XIcon />
    </IconButton>
  )
  const button = inRow ? (
    iconButton
  ) : (
    <ConfirmPopover
      open={confirming}
      onOpenChange={setOpen}
      question={question}
      detail={detail}
      error={error}
      pending={pending}
      onConfirm={() => onConfirm(close)}
    >
      {iconButton}
    </ConfirmPopover>
  )

  return (
    <>
      {leading !== undefined || groupClassName ? (
        <div className={groupClassName}>
          {leading}
          {button}
        </div>
      ) : (
        button
      )}
      {inRow && (
        <InlineConfirm
          open={confirming}
          question={question}
          error={error}
          pending={pending}
          onConfirm={() => onConfirm(close)}
          onCancel={close}
          focusCancel={byKeyboard}
        />
      )}
    </>
  )
}
