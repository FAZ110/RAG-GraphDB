import { useRef } from 'react'
import { motion, Reorder } from 'motion/react'
import { Link } from 'react-router-dom'
import { HighlightedText } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { SpaceThumbnail } from '../map/SpaceThumbnail'
import { ARTICLE_FORMS, ENTITY_FORMS, formatDate, pluralForm } from '../spaceText'
import { SpaceDeleteControl } from './SpaceDeleteControl'

interface Props {
  space: Space
  selected: boolean
  needle: string
  wide: boolean
  draggable: boolean
  /** Layout animates only when this changes. */
  layoutKey: string
  onSelect: () => void
  onDragStart: () => void
  onDrop: () => void
}

const count = 'text-right text-sm text-fg-subtle tabular-nums'

export function SpaceListItem({
  space,
  selected,
  needle,
  wide,
  draggable,
  onSelect,
  layoutKey,
  onDragStart,
  onDrop,
}: Props) {
  const ink = inkFor(space.id)
  // Releasing a drag also fires a click on the link.
  const dragged = useRef(false)

  return (
    <Reorder.Item
      value={space.id}
      // Animating size would stretch and squash the content when rows are refitted.
      layout="position"
      layoutDependency={layoutKey}
      dragListener={draggable}
      onDragStart={() => {
        dragged.current = true
        onDragStart()
      }}
      onDragEnd={onDrop}
      whileDrag={{ boxShadow: 'var(--deck-offset) var(--deck-offset) 0 var(--line)' }}
      className="relative flex h-(--space-row) snap-start items-center border-b border-line-soft bg-surface hover:bg-surface-sunken"
    >
      {selected && (
        <motion.span
          layoutId="selected-space"
          layout="position"
          aria-hidden="true"
          className="absolute inset-0 border-l-4"
          style={{ backgroundColor: ink.field, borderColor: ink.color }}
          transition={{ type: 'spring', stiffness: 520, damping: 42 }}
        />
      )}
      <Link
        to={`/spaces/${space.id}`}
        // The browser's native link drag would cancel motion's.
        draggable={false}
        onClick={(e) => {
          if (dragged.current) {
            dragged.current = false
            e.preventDefault()
          } else {
            onSelect()
          }
        }}
        aria-current={selected ? 'page' : undefined}
        className={cn(
          'relative grid h-full min-w-0 flex-1 items-center pr-2 pl-4 focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none focus-visible:ring-inset',
          wide
            ? 'grid-cols-[auto_minmax(0,1fr)_7rem_7rem_9rem] gap-x-4'
            : 'grid-cols-[auto_minmax(0,1fr)] gap-x-3'
        )}
      >
        <SpaceThumbnail spaceId={space.id} ink={ink} className={wide ? 'w-20' : 'w-12'} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-fg">
            <HighlightedText text={space.name} needle={needle} />
          </span>
          {!wide && (
            <span className="block truncate text-xs text-fg-subtle">
              Utworzona {formatDate(space.created_at)}
            </span>
          )}
        </span>
        {wide && (
          <>
            <span className={count}>
              <span className="font-semibold text-fg">{space.article_count}</span>{' '}
              {pluralForm(space.article_count, ARTICLE_FORMS)}
            </span>
            <span className={count}>
              <span className="font-semibold text-fg">
                {space.entity_count.toLocaleString('pl-PL')}
              </span>{' '}
              {pluralForm(space.entity_count, ENTITY_FORMS)}
            </span>
            <span className="text-right text-sm text-fg-subtle">
              {formatDate(space.created_at)}
            </span>
          </>
        )}
      </Link>
      {/* `relative` lifts it above the selection marker. */}
      <SpaceDeleteControl space={space} className="relative mr-2" />
    </Reorder.Item>
  )
}
