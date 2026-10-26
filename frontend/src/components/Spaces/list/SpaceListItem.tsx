import { useRef } from 'react'
import { motion, Reorder } from 'motion/react'
import { Link } from 'react-router-dom'
import { HighlightedText } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { move } from '@/design/motion'
import { usePrefetchSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'
import { ARTICLE_FORMS, ENTITY_FORMS, pluralForm } from '../spaceText'
import { SpaceDeleteControl } from './SpaceDeleteControl'

interface Props {
  space: Space
  selected: boolean
  needle: string
  draggable: boolean
  /** Layout animates only when this changes. */
  layoutKey: string
  onSelect: () => void
  onDragStart: () => void
  onDrop: () => void
}

export function SpaceListItem({
  space,
  selected,
  needle,
  draggable,
  onSelect,
  layoutKey,
  onDragStart,
  onDrop,
}: Props) {
  const ink = inkFor(space.id)
  // Releasing a drag also fires a click on the link.
  const dragged = useRef(false)
  const prefetch = usePrefetchSpace()

  return (
    <Reorder.Item
      value={space.id}
      // Animating size would stretch and squash the content when rows are refitted.
      layout="position"
      layoutDependency={layoutKey}
      transition={move.base}
      dragListener={draggable}
      onDragStart={() => {
        dragged.current = true
        onDragStart()
      }}
      onDragEnd={onDrop}
      whileDrag={{ boxShadow: 'var(--deck-offset) var(--deck-offset) 0 var(--line)' }}
      className="group relative flex h-(--space-row) snap-start items-center border-b border-line-soft bg-surface hover:bg-surface-sunken"
    >
      {/* Above every row's background, so it's seen the whole way whichever row it flies to;
          the rows' text and controls sit above it in turn. */}
      {selected && (
        <motion.span
          layoutId="selected-space"
          layout="position"
          aria-hidden="true"
          className="absolute inset-0 z-1 border-l-[5px]"
          style={{ backgroundColor: ink.field, borderColor: ink.color }}
          transition={move.quick}
        />
      )}
      <Link
        to={`/spaces/${space.id}`}
        // The browser's native link drag would cancel motion's.
        draggable={false}
        onPointerEnter={() => prefetch(space.id)}
        onFocus={() => prefetch(space.id)}
        onClick={(e) => {
          if (dragged.current) {
            dragged.current = false
            e.preventDefault()
          } else {
            onSelect()
          }
        }}
        aria-current={selected ? 'page' : undefined}
        className="relative z-2 flex h-full min-w-0 flex-1 items-center pr-2 pl-5 transition-[padding-right] spring-quick group-has-data-[confirm=open]:room-for-confirm focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none focus-visible:ring-inset"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold text-fg">
            <HighlightedText text={space.name} needle={needle} />
          </span>
          <span className="block truncate text-xs text-fg-subtle">
            {space.article_count} {pluralForm(space.article_count, ARTICLE_FORMS)},{' '}
            {space.entity_count.toLocaleString('pl-PL')}{' '}
            {pluralForm(space.entity_count, ENTITY_FORMS)}
          </span>
        </span>
      </Link>
      <SpaceDeleteControl
        space={space}
        className="relative z-2 mr-2 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100"
      />
    </Reorder.Item>
  )
}
