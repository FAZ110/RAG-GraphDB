import { motion } from 'motion/react'
import { Button } from '@/components/deck'
import { swapX } from '@/design/motion'
import { useDeleteSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'

interface Props {
  space: Space
  onCancel: () => void
  onError: (message: string | null) => void
}

export function DeleteSpaceConfirm({ space, onCancel, onError }: Props) {
  const remove = useDeleteSpace()

  return (
    <motion.div
      {...swapX}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      className="flex w-full items-center gap-3"
    >
      <p className="min-w-0 flex-1 text-sm text-fg-muted">
        <span className="font-semibold text-fg">Usunąć przestrzeń?</span> Tego nie da się cofnąć.
      </p>
      <Button
        variant="danger"
        size="md"
        disabled={remove.isPending}
        onClick={() => {
          onError(null)
          remove.mutate(space.id, { onError: (error) => onError(error.message) })
        }}
      >
        {remove.isPending ? 'Usuwam...' : 'Usuń przestrzeń'}
      </Button>
      <Button size="md" className="px-3" autoFocus onClick={onCancel}>
        Anuluj
      </Button>
    </motion.div>
  )
}
