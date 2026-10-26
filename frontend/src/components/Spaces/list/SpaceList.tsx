import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, LayoutGroup, Reorder } from 'motion/react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { normalize } from '@/lib/text'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { ContourBackdrop } from '../map/ContourBackdrop'
import { filterSpaces } from '../spaceSearch'
import { SPACE_FORMS, pluralForm } from '../spaceText'
import { DraftSpaceItem } from './DraftSpaceItem'
import { NoSpaceMatch } from './NoSpaceMatch'
import { SpaceListItem } from './SpaceListItem'
import { SpaceListToolbar } from './SpaceListToolbar'
import { useSpaceOrder } from './useSpaceOrder'

const ROW_HEIGHT = 68

interface Props {
  spaces: Space[]
  loading: boolean
  selectedId: string | undefined
  query: string
  onQueryChange: (query: string) => void
  /** null when no space is being created. */
  draft: string | null
  onDraftChange: (draft: string | null) => void
  onCreated: (space: Space) => void
  edgeToEdge?: boolean
  onPicked?: () => void
}

export function SpaceList({
  spaces,
  loading,
  selectedId,
  query,
  onQueryChange,
  draft,
  onDraftChange,
  onCreated,
  edgeToEdge = false,
  onPicked,
}: Props) {
  const needle = normalize(query.trim())
  const shown = filterSpaces(spaces, needle)
  const status = needle
    ? `${shown.length} z ${spaces.length}`
    : `${spaces.length} ${pluralForm(spaces.length, SPACE_FORMS)}`
  const noMatch = !loading && draft === null && needle !== '' && shown.length === 0

  // On touch, dragging would take over the list's scrolling.
  const finePointer = useMediaQuery('(pointer: fine)')
  const reorderable = finePointer && !needle && draft === null
  const order = useSpaceOrder(shown)

  // Stays true until the draft's exit animation ends, not just while `draft` is set.
  const [draftShown, setDraftShown] = useState(false)
  if (draft !== null && !draftShown) setDraftShown(true)

  const startDraft = (name = '') => {
    onQueryChange('')
    onDraftChange(name)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <SpaceListToolbar
        query={query}
        onQueryChange={onQueryChange}
        status={status}
        onNewSpace={() => startDraft()}
      />

      <div className={cn('relative min-h-0 flex-1', edgeToEdge && '-mx-3')}>
        <ContourBackdrop color="var(--fg-faint)" className="absolute inset-0 opacity-70" />
        <Reorder.Group
          as="ul"
          axis="y"
          values={order.ordered.map((s) => s.id)}
          onReorder={order.onReorder}
          aria-label="Przestrzenie"
          style={{ '--space-row': `${ROW_HEIGHT}px` } as CSSProperties}
          // Snapping and scroll anchoring would scroll the opening draft out of sight.
          className={cn(
            'relative h-full overflow-y-auto border-t border-line',
            draftShown ? '[overflow-anchor:none]' : 'snap-y snap-mandatory'
          )}
        >
          <AnimatePresence initial={false} onExitComplete={() => setDraftShown(false)}>
            {draft !== null && (
              <DraftSpaceItem
                key="draft"
                initialName={draft}
                onCreated={(space) => {
                  onDraftChange(null)
                  onCreated(space)
                  onPicked?.()
                }}
                onCancel={() => onDraftChange(null)}
              />
            )}
          </AnimatePresence>
          <LayoutGroup>
            {order.ordered.map((space) => (
              <SpaceListItem
                key={space.id}
                space={space}
                selected={space.id === selectedId}
                needle={needle}
                draggable={reorderable}
                layoutKey={order.layoutKey}
                onDragStart={order.onDragStart}
                onDrop={order.onDrop}
                onSelect={() => onPicked?.()}
              />
            ))}
          </LayoutGroup>
          {noMatch && (
            <NoSpaceMatch name={query.trim()} onCreate={() => startDraft(query.trim())} />
          )}
        </Reorder.Group>
      </div>
    </div>
  )
}
