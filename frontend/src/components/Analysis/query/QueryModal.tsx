import { BookOpenIcon, CodeXmlIcon, XIcon } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import type { CSSProperties } from 'react'
import { useEntityPool } from '@/components/Analysis/dock/searchResults'
import { Button, IconButton, Modal } from '@/components/deck'
import { inkFor } from '@/design/inks'
import type { QueryResult } from '@/types/query'
import { AnswerPanel } from './AnswerPanel'
import { AskInWords } from './AskInWords'
import { CypherView } from './CypherView'
import { Guide } from './Guide'
import { Inspector } from './Inspector'
import type { Pattern } from './pattern'
import { MAX_NODES, addKnown, addSought } from './pattern'
import { PatternStage } from './PatternStage'
import { ScopeToggle } from './ScopeToggle'
import { StageToolbar } from './StageToolbar'
import type { PatternQuery } from './usePatternQuery'

// A strip docked under the drawing; it leaves the drawing at least half the height.
const STRIP =
  'flex max-h-[50%] shrink-0 flex-col overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 spring-quick'

/** The sheet's deck shadow in the space's ink, over a soft one all round, so its edges stand
 * clear of the blurred canvas on every side, not only where the deck shadow falls. */
const sheetShadow = (ink: string) =>
  [
    `var(--deck-offset-lg) var(--deck-offset-lg) 0 ${ink}`,
    '0 0 0 1px color-mix(in srgb, var(--fg) 6%, transparent)',
    '0 24px 64px -16px color-mix(in srgb, var(--fg) 28%, transparent)',
  ].join(', ')

const interactive = (target: EventTarget) =>
  (target as HTMLElement).closest(
    'input, textarea, button, a, [role="button"], [role="combobox"], [data-radix-popper-content-wrapper]'
  )

interface Props {
  spaceId: string
  query: PatternQuery
  onOpenArticle: (articleId: string) => void
  onShow: (result: QueryResult) => void
  onClose: () => void
}

/** The question drawn as a small graph over a blurred canvas, with its answer beside it. */
export function QueryModal({ spaceId, query, onOpenArticle, onShow, onClose }: Props) {
  return (
    <Modal
      open={query.pattern !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Szukaj po powiązaniach"
      blur
      bare
      focusFirst={false}
      className="inset-0"
    >
      {/* While the modal fades out, AnimatePresence keeps its last content on screen. */}
      {query.pattern && (
        <Body
          spaceId={spaceId}
          pattern={query.pattern}
          query={query}
          onOpenArticle={onOpenArticle}
          onShow={onShow}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}

function Body({
  spaceId,
  pattern,
  query,
  onOpenArticle,
  onShow,
  onClose,
}: Props & { pattern: Pattern }) {
  const [lit, setLit] = useState<string | null>(null)
  // Fetched as the module opens, so names are matched the moment one is typed.
  useEntityPool(spaceId)
  const [linking, setLinking] = useState(false)
  // The how-to, laid over the drawing until it is put away.
  const [guiding, setGuiding] = useState(false)
  const [adding, setAdding] = useState(false)
  // The question shown as Cypher in place of its drawing.
  const [coding, setCoding] = useState(false)
  const result = query.issue ? undefined : query.result?.data
  const error = query.issue ? null : query.result?.error
  const sought = pattern.nodes.filter((n) => !n.known)
  const found = result
    ? new Set(result.matches.flatMap((m) => sought.flatMap((n) => m[n.key] ?? []))).size
    : 0

  const show = () => {
    if (result && found) onShow(result)
  }
  // Enter anywhere but in a field, on a button or in an open bubble shows the answer.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.target && !interactive(e.target)) {
      e.preventDefault()
      show()
    }
  })
  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    // The title stands on the blurred canvas above the sheet; a click beside the sheet closes.
    <div
      className="flex h-full min-h-0 flex-col px-3 pt-4 pb-3 sm:px-16 sm:pt-7 sm:pb-12 xl:px-28"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mb-4 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 aria-hidden className="text-2xl font-semibold tracking-tight text-fg">
            Szukaj po powiązaniach
          </h2>
          <p className="mt-1 text-sm text-fg-soft">
            Narysuj pytanie z encji i połączeń, a odpowiedź pojawi się obok.
          </p>
        </div>
        <Button
          size="sm"
          variant={guiding ? 'primary' : 'secondary'}
          aria-pressed={guiding}
          onClick={() => setGuiding(!guiding)}
        >
          <BookOpenIcon />
          Jak to działa?
        </Button>
        <IconButton variant="secondary" size="icon-sm" label="Zamknij" onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden border border-fg-subtle/60 bg-surface"
        style={
          {
            '--deck-shadow': inkFor(spaceId).color,
            boxShadow: sheetShadow(inkFor(spaceId).color),
          } as CSSProperties
        }
      >
        <AskInWords
          spaceId={spaceId}
          onDrawn={(next) => {
            setCoding(false)
            setAdding(false)
            setLinking(false)
            query.change(next, null)
          }}
        />
        {/* Above the drawing, so the hits under the search field are never covered by it. */}
        <header className="relative z-10 flex items-center gap-4 border-b border-line py-2 pr-3 pl-4">
          <StageToolbar
            full={pattern.nodes.length >= MAX_NODES}
            linking={linking}
            adding={adding}
            // Drawing tools bring the drawing back.
            inks={(query.schema?.labels ?? [])
              .toSorted((a, b) => b.count - a.count)
              .slice(0, 3)
              .map((l) => inkFor(l.label).color)}
            onSought={() => {
              setCoding(false)
              query.change(...addSought(pattern))
            }}
            onAdding={(on) => {
              setCoding(false)
              setAdding(on)
            }}
            spaceId={spaceId}
            inside={new Set(pattern.nodes.flatMap((n) => n.known?.map((e) => e.id) ?? []))}
            // The added entity's settings open next, to add more to it or link it.
            onKnown={(entity) => {
              const [next, key] = addKnown(pattern, entity)
              setAdding(false)
              query.change(next, key)
            }}
            onLinking={(on) => {
              setCoding(false)
              setLinking(on)
            }}
          />
          <span className="flex-1" />
          {/* Where answers come from: what the analysis holds, or the whole space to add from. */}
          {query.scope && (
            <ScopeToggle
              value={query.scope}
              sizes={{
                analysis: query.canvasSize,
                space: query.schema?.labels.reduce((n, l) => n + l.count, 0),
              }}
              onChange={query.setScope}
            />
          )}
          {/* For those who read Cypher; the drawing stays the way in for everyone else. */}
          <IconButton
            variant={coding ? 'primary' : 'ghost'}
            size="icon-md"
            label={coding ? 'Ukryj Cypher' : 'Pokaż zapytanie w Cypherze'}
            aria-pressed={coding}
            onClick={() => {
              setCoding(!coding)
              if (!coding) query.select(null)
            }}
          >
            <CodeXmlIcon />
          </IconButton>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          {/* The how-to over the whole sheet, a page to read rather than a side note. */}
          {guiding && (
            <div className="absolute inset-0 z-20">
              <Guide onClose={() => setGuiding(false)} />
            </div>
          )}
          <div className="flex min-h-80 min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <PatternStage
                pattern={pattern}
                counts={result?.counts}
                selected={query.selected}
                lit={lit}
                linking={linking}
                onLinking={setLinking}
                // Picking a part of the drawing puts the search away for its settings.
                onSelect={(key) => {
                  setAdding(false)
                  query.select(key)
                }}
                onChange={query.change}
              />
            </div>
            {/* Strips under the drawing take their room at once and fade up into it: only opacity
            and transform move, so the drawing is not laid out again on every frame. */}
            {query.selected && !linking && !coding && (
              <div key="settings" className={STRIP}>
                <Inspector
                  spaceId={spaceId}
                  pattern={pattern}
                  selected={query.selected}
                  schema={query.schema}
                  onChange={query.change}
                  onClose={() => query.select(null)}
                />
              </div>
            )}
            {coding && (
              <div key="cypher" className={STRIP}>
                <CypherView result={result} onClose={() => setCoding(false)} />
              </div>
            )}
          </div>

          <AnswerPanel
            spaceId={spaceId}
            pattern={pattern}
            issue={query.issue}
            result={result}
            error={error}
            pending={query.pending}
            found={found}
            more={query.more}
            onOpenArticle={onOpenArticle}
            onHover={setLit}
            onShow={show}
            selecting={query.scope === 'analysis'}
            onMap={query.scope === null}
          />
        </div>
      </div>
    </div>
  )
}
