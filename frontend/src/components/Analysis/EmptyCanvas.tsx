import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Swatch, focusRing } from '@/components/deck'
import { ENTITY_FORMS, formatDate, pluralForm, typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { fade, step } from '@/design/motion'
import { useSpaceArticles } from '@/hooks/useSpaces'
import { cn } from '@/lib/utils'
import { fetchGraphSeed } from '@/services/api'
import { CHROME_INSET } from './layout'
import { ArticleArt, BlankArt, EntityArt } from './start/StartArt'
import type { LoadedNode } from '@/types'

const LISTED = 8

type Stage = 'choose' | 'entity' | 'article'

interface Props {
  spaceId: string
  onEntity: (node: LoadedNode) => void
  onArticle: (articleId: string) => void
  onBlank: () => void
}

function StartCard({
  art,
  title,
  onClick,
  children,
}: {
  art: ReactNode
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group deck-lift flex flex-1 flex-col border border-line bg-surface text-left',
        focusRing
      )}
    >
      <span className="block aspect-[10/7] w-full border-b border-line-soft bg-surface-sunken p-3">
        {art}
      </span>
      <span className="block p-4">
        <span className="block font-bold text-fg">{title}</span>
        <span className="mt-0.5 block text-sm text-fg-muted">{children}</span>
      </span>
    </button>
  )
}

function Row({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          // Flat on the page until pointed at, so a list of them doesn't read as a stack of cards.
          'deck-lift flex w-full items-center gap-3 border border-line bg-surface px-4 py-3 text-left [--lift-raised:var(--deck-offset)] [--lift-rest:0px]',
          focusRing
        )}
      >
        {children}
      </button>
    </li>
  )
}

function Hubs({ spaceId, onEntity }: { spaceId: string; onEntity: (node: LoadedNode) => void }) {
  const hubs = useQuery({
    queryKey: ['analysis', spaceId, 'hubs'],
    queryFn: () => fetchGraphSeed(spaceId, LISTED),
  })
  if (hubs.isPending) return <p className="px-4 py-3 text-sm text-fg-subtle">Wczytuję…</p>
  return (
    <ul className="flex flex-col gap-2">
      {hubs.data?.nodes.map((n) => (
        <Row key={n.id} onClick={() => onEntity(n)}>
          <Swatch color={inkFor(n.label).color} className="size-3 rounded-full" />
          <span className="min-w-0 flex-1 truncate font-semibold text-fg">{n.name}</span>
          <span className="text-sm text-fg-subtle">{typeName(n.label)}</span>
          <span className="w-8 text-right text-sm text-fg-subtle tabular-nums">{n.degree}</span>
        </Row>
      ))}
    </ul>
  )
}

function Articles({ spaceId, onArticle }: { spaceId: string; onArticle: (id: string) => void }) {
  const articles = useSpaceArticles(spaceId)
  const ready = (articles.data ?? []).filter((a) => a.status === 'ok').slice(0, LISTED)
  if (articles.isPending) return <p className="px-4 py-3 text-sm text-fg-subtle">Wczytuję…</p>
  return (
    <ul className="flex flex-col gap-2">
      {ready.map((a) => (
        <Row key={a.id} onClick={() => onArticle(a.id)}>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-fg">{a.title || 'Artykuł bez tytułu'}</span>
            <span className="mt-0.5 block text-xs text-fg-subtle">
              {a.nodes_count ?? 0} {pluralForm(a.nodes_count ?? 0, ENTITY_FORMS)} ·{' '}
              {formatDate(a.created_at)}
            </span>
          </span>
        </Row>
      ))}
    </ul>
  )
}

/** An empty canvas asks where to start, then shows only the starting points of that kind. */
export function EmptyCanvas({ spaceId, onEntity, onArticle, onBlank }: Props) {
  const [stage, setStage] = useState<Stage>('choose')
  // 1 going into a list, -1 coming back to the choice; steps slide that way.
  const [direction, setDirection] = useState(1)
  const go = (next: Stage) => {
    setDirection(next === 'choose' ? -1 : 1)
    setStage(next)
  }
  const ink = inkFor(spaceId)

  return (
    <motion.div {...fade} className={cn('pointer-events-none absolute inset-0', CHROME_INSET)}>
      {/* Between the bar and the dock, centred on the same area they are. */}
      <div className="relative isolate grid size-full place-items-center pt-16 pb-20">
        {/* A clearing in the map paper, so the text reads on plain paper and the dots fade in
          around it rather than running through it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-page [mask-image:radial-gradient(ellipse_42rem_24rem_at_50%_50%,black_55%,transparent_100%)]"
        />
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {stage === 'choose' ? (
            <motion.div
              key="choose"
              custom={direction}
              variants={step}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ ['--ink' as string]: ink.color, ['--ink-field' as string]: ink.field }}
              className="pointer-events-auto flex w-full max-w-3xl flex-col gap-4"
            >
              {/* A header for the row of cards, on their left edge, not a title floating above. */}
              <h2 className="text-title text-fg">Od czego zaczynamy?</h2>
              <div className="grid w-full gap-4 sm:grid-cols-3">
                <StartCard art={<EntityArt />} title="Od encji" onClick={() => go('entity')}>
                  Rozwijaj powiązania jednej encji.
                </StartCard>
                <StartCard art={<ArticleArt />} title="Od artykułu" onClick={() => go('article')}>
                  Weź wszystko, o czym pisze.
                </StartCard>
                <StartCard art={<BlankArt />} title="Puste płótno" onClick={onBlank}>
                  Dodawaj encje z wyszukiwarki.
                </StartCard>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={stage}
              custom={direction}
              variants={step}
              initial="enter"
              animate="center"
              exit="exit"
              className="pointer-events-auto flex max-h-full w-full max-w-xl min-h-0 flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => go('choose')} className="-ml-3">
                  <ArrowLeftIcon />
                  Inny początek
                </Button>
              </div>
              <h2 className="text-title text-fg">
                {stage === 'entity' ? 'Od której encji?' : 'Od którego artykułu?'}
              </h2>
              <p className="-mt-2 text-sm text-fg-muted">
                {stage === 'entity'
                  ? 'Najlepiej połączone encje przestrzeni. Inną znajdziesz w wyszukiwarce na dole.'
                  : 'Ostatnio dodane artykuły. Inny znajdziesz po tytule w wyszukiwarce na dole.'}
              </p>
              {/* Room round the cards for their shadows and lift, which the scroll would clip. */}
              <div className="-m-1 min-h-0 overflow-y-auto p-1 pr-2 pb-2">
                {stage === 'entity' ? (
                  <Hubs spaceId={spaceId} onEntity={onEntity} />
                ) : (
                  <Articles spaceId={spaceId} onArticle={onArticle} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
