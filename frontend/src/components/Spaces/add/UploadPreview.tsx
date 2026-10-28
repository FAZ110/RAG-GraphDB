import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { leave, move, staggerDelay } from '@/design/motion'
import type { UploadItem } from './parseUpload'
import { UploadRow } from './UploadRow'

interface Props {
  items: UploadItem[]
  /** Titles and addresses already in the space, to flag repeats. */
  known: { titles: ReadonlySet<string>; urls: ReadonlySet<string> }
  onRemove: (key: string) => void
}

export function UploadPreview({ items, known, onRemove }: Props) {
  // One open at a time, so the list stays a list.
  const [openKey, setOpenKey] = useState<string | null>(null)
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
        {items.map((item, i) => (
          <motion.li
            key={item.key}
            layout="position"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0, transition: { ...move.base, delay: staggerDelay(i) } }}
            exit={{ opacity: 0, x: -16, transition: leave.quick }}
            transition={move.base}
          >
            <UploadRow
              item={item}
              repeat={Boolean(
                (item.url && known.urls.has(item.url)) || known.titles.has(item.title)
              )}
              open={openKey === item.key}
              onToggle={() => setOpenKey((k) => (k === item.key ? null : item.key))}
              onRemove={() => onRemove(item.key)}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
