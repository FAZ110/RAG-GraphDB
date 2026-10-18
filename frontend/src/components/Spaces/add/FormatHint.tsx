import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { focusRing } from '@/components/deck'
import { unfold } from '@/design/motion'
import { cn } from '@/lib/utils'

const EXAMPLE = `[
  {
    "title": "Tytuł artykułu",
    "url": "https://example.com/artykul",
    "content": "Treść artykułu…"
  }
]`

export function FormatHint() {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-sm text-fg-subtle">
      <p>
        Pliki JSON z jednym artykułem albo listą. Każdy potrzebuje treści, tytuł i adres są
        opcjonalne.{' '}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={cn('font-semibold text-fg-muted hover:text-fg', focusRing)}
        >
          {open ? 'Ukryj przykład' : 'Pokaż przykład'}
        </button>
      </p>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...unfold} className="overflow-hidden">
            <pre className="mt-2 border border-line-soft bg-surface-sunken p-3 font-mono text-xs text-fg-soft">
              {EXAMPLE}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
