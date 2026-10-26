import { useState } from 'react'
import type { CSSProperties } from 'react'
import { XIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Button, ErrorNote, IconButton, Modal } from '@/components/deck'
import { PENCIL, inkFor } from '@/design/inks'
import { slideFromEnd } from '@/design/motion'
import { useAddArticles } from '@/hooks/useBatches'
import { useSpaceArticles, useSpaces } from '@/hooks/useSpaces'
import { DEFAULT_PROVIDER } from '@/lib/providers'
import type { Provider } from '@/lib/providers'
import { cn } from '@/lib/utils'
import { SpaceSelect } from '../choice/SpaceSelect'
import { pickSpace } from '../choice/spaceChoice'
import { ARTICLE_FORMS, pluralForm } from '../spaceText'
import { toRequest } from './parseUpload'
import type { UploadItem } from './parseUpload'
import { ProviderSettings, ProviderSettingsToggle, SETTINGS_HEIGHT } from './ProviderSettings'
import { SourcePanel } from './SourcePanel'
import { UploadPreview } from './UploadPreview'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSpaceId?: string
  items: UploadItem[]
  onItemsChange: (items: UploadItem[]) => void
  onAdded: (spaceId: string, batchId: string) => void
}

const addLabel = (count: number) =>
  count === 0
    ? 'Dodaj artykuły'
    : count === 1
      ? 'Dodaj artykuł'
      : `Dodaj ${count} ${pluralForm(count, ARTICLE_FORMS)}`

export function AddArticlesModal({
  open,
  onOpenChange,
  initialSpaceId,
  items,
  onItemsChange,
  onAdded,
}: Props) {
  const spaces = useSpaces()
  const [chosen, setChosen] = useState<string | null>(null)
  const space = spaces.data && pickSpace(spaces.data, chosen ?? initialSpaceId ?? null)
  const ink = space ? inkFor(space.id) : PENCIL
  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const add = useAddArticles()

  const existing = useSpaceArticles(space?.id ?? '').data ?? []
  const known = {
    titles: new Set(existing.flatMap((a) => (a.title ? [a.title] : []))),
    urls: new Set(existing.flatMap((a) => (a.url ? [a.url] : []))),
  }
  const ready = items.filter((item) => !item.problem)
  // Small while there is only the choice of files; it grows to show them once they are read.
  const filled = items.length > 0

  const submit = () => {
    if (!space || ready.length === 0) return
    add.mutate(
      { spaceId: space.id, articles: ready.map(toRequest), provider },
      { onSuccess: (batchId) => onAdded(space.id, batchId) }
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Dodaj artykuły"
      style={
        {
          '--deck-shadow': ink.color,
          '--settings': `${settingsOpen ? SETTINGS_HEIGHT : 0}px`,
        } as CSSProperties
      }
      focusFirst={false}
      className={cn(
        'inset-0 m-auto overflow-hidden transition-[width,height] spring-panel',
        filled
          ? 'h-[min(calc(46rem+var(--settings)),calc(100dvh-1.5rem))] w-[min(76rem,calc(100vw-1.5rem))] sm:h-[min(calc(46rem+var(--settings)),calc(100dvh-4rem))] sm:w-[min(76rem,calc(100vw-4rem))]'
          : 'h-[min(calc(40rem+var(--settings)),calc(100dvh-1.5rem))] w-[min(56rem,calc(100vw-1.5rem))]'
      )}
    >
      <header className="flex items-start gap-3 border-b border-line-soft px-6 py-4 sm:px-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-heading text-fg">Dodaj artykuły do</h2>
          {spaces.data?.length === 0 ? (
            <Link
              to="/spaces"
              onClick={() => onOpenChange(false)}
              className="font-semibold text-fg underline"
            >
              najpierw utwórz przestrzeń
            </Link>
          ) : (
            <SpaceSelect
              spaces={spaces.data ?? []}
              value={space?.id}
              onChange={setChosen}
              size="lg"
              ink={ink}
              className="max-w-72 min-w-40 flex-1 basis-0"
            />
          )}
        </div>
        <IconButton
          variant="ghost"
          label="Zamknij"
          className="mt-0.5 shrink-0"
          onClick={() => onOpenChange(false)}
        >
          <XIcon />
        </IconButton>
      </header>

      <div
        className={cn(
          'grid min-h-0 flex-1 overflow-y-auto',
          // Alone, the source column is as tall as the modal, so its drop zone gives way.
          filled ? 'lg:grid-cols-2 lg:overflow-hidden' : 'grid-rows-[minmax(0,1fr)]'
        )}
      >
        <section className="flex min-h-0 flex-col p-6 sm:p-8 lg:overflow-y-auto">
          <SourcePanel ink={ink} onAdd={(added) => onItemsChange([...items, ...added])} />
        </section>
        {filled && (
          <motion.section
            {...slideFromEnd}
            className="flex flex-col gap-3 border-t border-line-soft bg-surface-sunken p-6 sm:p-8 lg:overflow-y-auto lg:border-t-0 lg:border-l"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-fg">
                Do dodania{' '}
                <span className="font-normal text-fg-subtle tabular-nums">{ready.length}</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onItemsChange([])}>
                Wyczyść listę
              </Button>
            </div>
            <UploadPreview
              items={items}
              known={known}
              onRemove={(key) => onItemsChange(items.filter((item) => item.key !== key))}
            />
          </motion.section>
        )}
      </div>

      {/* Only the modal's own shadow carries the space's ink; its buttons keep the usual one. */}
      <footer className="flex flex-wrap items-center gap-3 border-t border-line-soft px-6 py-4 [--deck-shadow:var(--fg-subtle)] sm:px-8">
        <ProviderSettingsToggle
          open={settingsOpen}
          onToggle={() => setSettingsOpen(!settingsOpen)}
        />
        {add.error && <ErrorNote inline>{add.error.message}</ErrorNote>}
        <div className="ml-auto flex gap-3">
          <Button onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button
            variant="primary"
            disabled={!space || ready.length === 0 || add.isPending}
            onClick={submit}
          >
            {add.isPending ? 'Dodaję…' : addLabel(ready.length)}
          </Button>
        </div>
      </footer>
      <AnimatePresence initial={false}>
        {settingsOpen && <ProviderSettings value={provider} onChange={setProvider} ink={ink} />}
      </AnimatePresence>
    </Modal>
  )
}
