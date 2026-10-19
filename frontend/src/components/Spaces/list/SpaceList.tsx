import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, LayoutGroup, Reorder } from 'motion/react'
import { surface } from '@/components/deck'
import { useElementSize } from '@/hooks/useElementSize'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { normalize } from '@/lib/text'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { filterSpaces } from '../spaceSearch'
import { SPACE_FORMS, pluralForm } from '../spaceText'
import { DraftSpaceItem } from './DraftSpaceItem'
import { layoutSpaceList } from './listLayout'
import { NewSpaceTile } from './NewSpaceTile'
import { SpaceListItem } from './SpaceListItem'
import { SpaceListToolbar } from './SpaceListToolbar'
import { useSpaceOrder } from './useSpaceOrder'

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
  onPicked,
}: Props) {
  const [listRef, list] = useElementSize<HTMLUListElement>()
  const needle = normalize(query.trim())
  const shown = filterSpaces(spaces, needle)
  const status = needle
    ? `${shown.length} z ${spaces.length}`
    : `${spaces.length} ${pluralForm(spaces.length, SPACE_FORMS)}`

  // The 1px is the list's top border.
  const room = list && list.height - 1
  const { itemHeight, rowHeight, spare } = layoutSpaceList(shown.length, room)
  const noMatch = needle !== '' && shown.length === 0
  const showTile = !loading && draft === null && spare !== null && (noMatch || spare >= itemHeight)

  // On touch, dragging would take over the list's scrolling.
  const finePointer = useMediaQuery('(pointer: fine)')
  const reorderable = finePointer && !needle && draft === null
  const order = useSpaceOrder(shown)
  // Mounted before the list is measured, items would animate from the base to the stretched height.
  const listed = room === null ? [] : order.ordered

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

      {/* Room for the offset shadow, matching the panel's so both end on one line. */}
      <div className="min-h-0 flex-1 pr-2 pb-2">
        <Reorder.Group
          as="ul"
          axis="y"
          values={listed.map((s) => s.id)}
          onReorder={order.onReorder}
          ref={listRef}
          aria-label="Przestrzenie"
          style={{ '--space-row': `${rowHeight}px` } as CSSProperties}
          // Snapping and scroll anchoring would scroll the opening draft out of sight.
          className={cn(
            surface,
            'h-full overflow-y-auto border-b-0',
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
            {listed.map((space) => (
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
          {showTile && (
            <NewSpaceTile
              height={Math.max(spare, itemHeight)}
              name={noMatch ? query.trim() : undefined}
              onCreate={() => startDraft(noMatch ? query.trim() : '')}
            />
          )}
        </Reorder.Group>
      </div>
    </div>
  )
}
