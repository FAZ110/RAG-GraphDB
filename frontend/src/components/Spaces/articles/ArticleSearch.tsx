import { AnimatePresence, motion } from 'motion/react'
import { SearchIcon, XIcon } from 'lucide-react'
import { IconButton, SearchField, SearchFieldButton } from '@/components/deck'
import { EASE_DECK } from '@/design/motion'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  status: string
}

export function ArticleSearch({ query, onQueryChange, open, onOpenChange, status }: Props) {
  const close = () => {
    onQueryChange('')
    onOpenChange(false)
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {open ? (
        // popLayout measures its child through a ref, which SearchField hands to the input.
        <motion.div key="field" className="flex">
          <SearchField
            size="md"
            frame={{
              initial: { width: 40, opacity: 0 },
              animate: { width: 'auto', opacity: 1 },
              exit: { width: 40, opacity: 0 },
              transition: { duration: 0.2, ease: EASE_DECK },
            }}
            className="overflow-hidden border-fg"
            inputClassName="w-40 flex-none sm:w-52"
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && close()}
            onBlur={() => !query && onOpenChange(false)}
            placeholder="Szukaj artykułu"
            aria-label="Szukaj artykułu"
            status={query ? status : undefined}
            action={
              <SearchFieldButton label="Zamknij wyszukiwanie" onClick={close}>
                <XIcon className="size-4" />
              </SearchFieldButton>
            }
          />
        </motion.div>
      ) : (
        <motion.div
          key="icon"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <IconButton size="icon-lg" label="Szukaj artykułu" onClick={() => onOpenChange(true)}>
            <SearchIcon />
          </IconButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
