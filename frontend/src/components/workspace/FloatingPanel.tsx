import { ChevronDownIcon, GripVerticalIcon, PinIcon, PinOffIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { IconButton } from '@/components/deck'
import { reveal } from '@/design/motion'
import { cn } from '@/lib/utils'
import { useWindowChrome } from './windowChrome'

interface Props {
  title: ReactNode
  /** Beside the title, e.g. a count or a close button. */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * A sheet floating over the canvas, scrolling inside when it runs long. Inside a window its
 * header is the title bar: it moves a loose window, pins it to its side and folds it.
 */
export function FloatingPanel({ title, aside, className, children }: Props) {
  const chrome = useWindowChrome()
  const open = !chrome?.collapsed
  // Pinned to a side, a window stays put until unpinned.
  const movable = chrome !== null && !chrome.docked
  return (
    <section
      className={cn(
        'deck pointer-events-auto flex max-h-full min-h-0 w-full min-w-0 flex-col border border-line bg-surface',
        className
      )}
    >
      <header
        onPointerDown={(e) => {
          // Controls in the header stay clickable.
          if (movable && !(e.target as HTMLElement).closest('button, a, input')) chrome.grab(e)
        }}
        onDoubleClick={(e) => {
          if (chrome && !(e.target as HTMLElement).closest('button, a, input'))
            chrome.toggleCollapsed()
        }}
        className={cn(
          'flex shrink-0 items-center gap-2 py-2 pr-2 pl-3',
          open && 'border-b border-line-soft',
          chrome && 'select-none',
          movable && 'cursor-grab touch-none active:cursor-grabbing'
        )}
      >
        {movable && (
          <GripVerticalIcon
            className="-ml-1.5 size-3.5 shrink-0 text-fg-faint"
            aria-hidden="true"
          />
        )}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{title}</h2>
        {aside}
        {chrome && (
          <IconButton
            variant="ghost"
            size="icon-sm"
            label={chrome.collapsed ? 'Rozwiń okno' : 'Zwiń okno'}
            aria-expanded={!chrome.collapsed}
            onClick={chrome.toggleCollapsed}
            className="size-7 text-fg-faint"
          >
            <ChevronDownIcon
              className={cn('transition-transform spring-quick', chrome.collapsed && '-rotate-90')}
            />
          </IconButton>
        )}
        {chrome && (
          <IconButton
            variant="ghost"
            size="icon-sm"
            label={chrome.docked ? 'Odepnij, żeby przenieść' : 'Przypnij do krawędzi'}
            aria-pressed={chrome.docked}
            onClick={chrome.togglePin}
            className={cn('size-7', chrome.docked ? 'text-fg-muted' : 'text-fg-faint')}
          >
            {chrome.docked ? <PinIcon /> : <PinOffIcon />}
          </IconButton>
        )}
      </header>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...reveal} className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 overflow-y-auto">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
