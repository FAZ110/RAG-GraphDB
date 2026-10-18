import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PenLineIcon, Trash2Icon } from 'lucide-react'
import { ErrorNote, IconButton } from '@/components/deck'
import { swapX } from '@/design/motion'
import type { Space } from '@/types'
import { DeleteSpaceConfirm } from './DeleteSpaceConfirm'
import { RenameSpaceForm } from './RenameSpaceForm'

type Mode = 'view' | 'rename' | 'delete'

export function SpaceTitle({ space }: { space: Space }) {
  const [mode, setMode] = useState<Mode>('view')
  const [error, setError] = useState<string | null>(null)
  const switchTo = (next: Mode) => {
    setError(null)
    setMode(next)
  }

  return (
    <div>
      <div className="flex h-12 items-center">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'rename' ? (
            <RenameSpaceForm
              key="rename"
              space={space}
              onDone={() => switchTo('view')}
              onError={setError}
            />
          ) : mode === 'delete' ? (
            <DeleteSpaceConfirm
              key="delete"
              space={space}
              onCancel={() => switchTo('view')}
              onError={setError}
            />
          ) : (
            <motion.div key="view" {...swapX} className="flex min-w-0 items-center gap-3">
              <h1
                title={space.name}
                className="min-w-0 truncate text-display text-fg @md:text-display-lg @xl:text-display-xl"
              >
                {space.name}
              </h1>
              <IconButton
                label="Zmień nazwę przestrzeni"
                className="ml-1"
                onClick={() => switchTo('rename')}
              >
                <PenLineIcon />
              </IconButton>
              <IconButton
                variant="danger-outline"
                label="Usuń przestrzeń"
                onClick={() => switchTo('delete')}
              >
                <Trash2Icon />
              </IconButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <ErrorNote inline className="mt-2">
          {error}
        </ErrorNote>
      )}
    </div>
  )
}
