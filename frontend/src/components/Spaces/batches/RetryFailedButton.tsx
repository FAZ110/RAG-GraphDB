import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RotateCwIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { EASE_DECK } from '@/design/motion'
import { useRetryArticles } from '@/hooks/useBatches'
import { cn } from '@/lib/utils'

interface Props {
  spaceId: string
  /** The failed articles of the tab on screen. */
  articleIds: string[]
}

// Grows from nothing so the buttons before it slide aside; the negative margin cancels the
// toolbar's gap while closed. Not clipped, which would cut off its offset shadow.
const hidden = { width: 0, marginLeft: -8, opacity: 0 }

export function RetryFailedButton({ spaceId, articleIds }: Props) {
  const retry = useRetryArticles(spaceId)
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence initial={false}>
      {articleIds.length > 0 && (
        <motion.div
          initial={hidden}
          animate={{ width: 'auto', marginLeft: 0, opacity: 1 }}
          exit={hidden}
          transition={{ duration: reducedMotion ? 0 : 0.25, ease: EASE_DECK }}
        >
          <IconButton
            variant="danger-outline"
            size="icon-lg"
            label={retry.error?.message ?? 'Ponów nieudane artykuły'}
            disabled={retry.isPending}
            onClick={() => retry.mutate(articleIds)}
          >
            <RotateCwIcon className={cn(retry.isPending && 'animate-spin')} />
          </IconButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
