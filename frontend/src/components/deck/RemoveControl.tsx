import { useState } from 'react'
import { XIcon } from 'lucide-react'
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
  confirmClassName?: string
  className?: string
}

// The row must be the positioned parent, since the question covers it.
export function RemoveControl({
  label,
  question,
  detail,
  blockedBy,
  pending,
  error,
  onOpen,
  onConfirm,
  confirmClassName,
  className,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const close = () => setConfirming(false)

  return (
    <>
      <IconButton
        variant="remove"
        size="icon-sm"
        label={blockedBy ?? label}
        aria-label={label}
        disabled={blockedBy !== undefined}
        className={className}
        onClick={() => {
          onOpen?.()
          setConfirming(true)
        }}
      >
        <XIcon />
      </IconButton>
      <InlineConfirm
        open={confirming}
        question={question}
        detail={detail}
        error={error}
        pending={pending}
        onConfirm={() => onConfirm(close)}
        onCancel={close}
        className={confirmClassName}
      />
    </>
  )
}
