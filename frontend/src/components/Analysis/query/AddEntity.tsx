import { AnimatePresence, motion } from 'motion/react'
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react'
import { Button } from '@/components/deck'
import { swap } from '@/design/motion'
import type { LoadedNode } from '@/types'
import { KnownSearch } from './KnownSearch'

interface Props {
  spaceId: string
  /** Entities in the question already, left out of the search. */
  inside: ReadonlySet<string>
  /** The button's words, and the field's name once it turns into one. */
  label: string
  icon?: ReactNode
  open: boolean
  disabled?: boolean
  /** Hits over what is below, for a bar; under the field, inside a panel that scrolls. */
  floating?: boolean
  onOpen: (open: boolean) => void
  onPick: (entity: LoadedNode) => void
  /** A button of its own in place of the plain one; it opens the field when pressed. */
  trigger?: (open: () => void) => ReactNode
}

/** A button that turns into its search field in place, hits listed right under it. */
export function AddEntity({
  spaceId,
  inside,
  label,
  icon,
  open,
  disabled,
  floating = false,
  onOpen,
  onPick,
  trigger,
}: Props) {
  // Escape or a click elsewhere turns the field back into its button; the modal stays open.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    onOpen(false)
  }
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) onOpen(false)
  }
  // The button turns into its field in place, and back.
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {open ? (
        <motion.div
          key="field"
          {...swap}
          className="w-64"
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          data-add-entity
        >
          <KnownSearch
            spaceId={spaceId}
            inside={inside}
            onPick={onPick}
            floating={floating}
            label={label}
          />
        </motion.div>
      ) : (
        <motion.div key="button" {...swap}>
          {trigger ? (
            trigger(() => onOpen(true))
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onOpen(true)} disabled={disabled}>
              {icon}
              {label}
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
