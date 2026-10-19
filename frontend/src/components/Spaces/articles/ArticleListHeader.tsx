import { AnimatePresence, motion } from 'motion/react'
import { Trash2Icon } from 'lucide-react'
import { Button, Checkbox } from '@/components/deck'
import { swapY } from '@/design/motion'
import { cn } from '@/lib/utils'
import { ARTICLE_FORMS, pluralForm } from '../spaceText'
import { ARTICLE_GRID } from './articleGrid'

interface Props {
  selected: number
  selectable: number
  onToggleAll: () => void
  onDeleteSelected: () => void
}

export function ArticleListHeader({ selected, selectable, onToggleAll, onDeleteSelected }: Props) {
  return (
    <li
      className={cn(
        ARTICLE_GRID,
        'sticky top-0 z-10 h-11 border-b border-line bg-surface-sunken text-sm'
      )}
    >
      <Checkbox
        aria-label="Zaznacz wszystkie artykuły"
        checked={selectable > 0 && selected === selectable}
        indeterminate={selected > 0 && selected < selectable}
        disabled={selectable === 0}
        onChange={onToggleAll}
      />
      <AnimatePresence mode="wait" initial={false}>
        {selected > 0 ? (
          <motion.div
            key="actions"
            {...swapY}
            className="col-start-2 -col-end-1 flex items-center justify-between gap-4"
          >
            <span className="font-semibold text-fg">
              Zaznaczono {selected} {pluralForm(selected, ARTICLE_FORMS)}
            </span>
            <Button variant="danger-soft" size="sm" onClick={onDeleteSelected}>
              <Trash2Icon />
              Usuń zaznaczone
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="columns"
            {...swapY}
            className="col-start-3 -col-end-1 grid grid-cols-subgrid font-semibold text-fg-subtle"
          >
            <span>Artykuł</span>
            <span className="hidden @3xl:block">Status</span>
            <span className="hidden @3xl:block">Encje</span>
            <span className="hidden @md:block">Data</span>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
