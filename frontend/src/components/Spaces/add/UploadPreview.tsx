import { XIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { IconButton } from '@/components/deck'
import { EASE_DECK } from '@/design/motion'
import { cn } from '@/lib/utils'
import { sourceHost } from '../articles/articleSource'
import type { UploadItem } from './parseUpload'

interface Props {
  items: UploadItem[]
  /** Titles and addresses already in the space, to flag repeats. */
  known: { titles: ReadonlySet<string>; urls: ReadonlySet<string> }
  onRemove: (key: string) => void
}

export function UploadPreview({ items, known, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <p className="flex h-full min-h-40 items-center justify-center px-6 text-center text-sm text-fg-subtle">
        Wczytane artykuły pojawią się tutaj, zanim je dodasz.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line-soft border-y border-line-soft bg-surface">
      <AnimatePresence>
        {items.map((item, i) => {
          const repeat = (item.url && known.urls.has(item.url)) || known.titles.has(item.title)
          return (
            <motion.li
              key={item.key}
              layout="position"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: EASE_DECK, delay: Math.min(i, 6) * 0.04 }}
              className="flex items-center gap-3 py-2.5 pr-2 pl-4"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate font-medium',
                    item.problem ? 'text-fg-faint line-through' : 'text-fg'
                  )}
                >
                  {item.title || item.content.slice(0, 80) || 'Artykuł bez tytułu'}
                </p>
                <p className="truncate text-sm text-fg-subtle">
                  {sourceHost(item.url || null)}
                  {item.from && ` z pliku ${item.from}`}
                  {!item.problem && `, ${item.content.length.toLocaleString('pl-PL')} znaków`}
                </p>
                {item.problem ? (
                  <p className="text-sm text-danger">{item.problem}</p>
                ) : (
                  repeat && (
                    <p className="text-sm text-fg-muted">
                      Już jest w przestrzeni; jeśli treść się nie zmieniła, zostanie pominięty.
                    </p>
                  )
                )}
              </div>
              <IconButton
                variant="remove"
                size="icon-sm"
                label="Usuń z listy"
                onClick={() => onRemove(item.key)}
              >
                <XIcon />
              </IconButton>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
