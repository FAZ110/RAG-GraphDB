import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button, ErrorNote, Kbd } from '@/components/deck'
import { pluralForm } from '@/components/Spaces/spaceText'
import { fade, step, swap } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { QueryResult } from '@/types/query'
import { EntityDetails } from './EntityDetails'
import type { Known } from './links'
import { tiesOf } from './links'
import type { Pattern } from './pattern'
import type { Lit } from './PatternStage'
import { NoMatches } from './NoMatches'
import { QueryResults } from './QueryResults'
import { Sentence } from './Sentence'

const RESULT_FORMS = { one: 'wynik', few: 'wyniki', many: 'wyników' }
// With more pages to come, the button says it takes those loaded so far.
const LOADED_FORMS = { one: 'wczytany', few: 'wczytane', many: 'wczytanych' }

interface Props {
  spaceId: string
  pattern: Pattern
  issue: string | null
  result: QueryResult | undefined
  error: Error | null | undefined
  pending: boolean
  /** Distinct entities the loaded pages would put on the canvas. */
  found: number
  more: { has: boolean; loading: boolean; load: () => void }
  onOpenArticle: (articleId: string) => void
  onHover: (lit: Lit | null) => void
  onShow: () => void
  /** Answers kept to the analysis are selected on the canvas, not added to it. */
  selecting: boolean
  onMap: boolean
}

/** The count heading the answer: what the drawn question came back with. */
function Count({
  found,
  truncated,
  pending,
}: {
  found: number
  truncated: boolean
  pending: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      {/* The number turns into the new one in place as the question changes. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${found}${truncated}`}
          {...swap}
          className="text-4xl leading-none font-semibold text-fg tabular-nums"
        >
          {found}
          {truncated ? '+' : ''}
        </motion.span>
      </AnimatePresence>
      <span className="text-base text-fg-soft">{pluralForm(found, RESULT_FORMS)}</span>
      {pending && <span className="ml-auto text-xs text-fg-subtle">Szukam…</span>}
    </div>
  )
}

/** The answer to the question on the left: how many, which ones, and the way onto the canvas. */
export function AnswerPanel({
  spaceId,
  pattern,
  issue,
  result,
  error,
  pending,
  found,
  more,
  onOpenArticle,
  onHover,
  onShow,
  selecting,
  onMap,
}: Props) {
  const empty = !error && result?.matches.length === 0
  const [picked, setPicked] = useState<string | null>(null)
  // Every entity of the question and the answer, to name and colour the ties.
  const known = new Map<string, Known>(
    [...pattern.nodes.flatMap((n) => n.known ?? []), ...(result?.nodes ?? [])].map((e) => [
      e.id,
      { id: e.id, name: e.name, label: e.label },
    ])
  )
  // A changed question can leave the picked entity out of the answer: back to the list then.
  const entity = !issue && picked ? result?.nodes.find((n) => n.id === picked) : undefined

  return (
    <aside
      aria-label="Odpowiedź"
      aria-live="polite"
      aria-busy={pending}
      className="flex max-h-[55%] min-h-0 flex-col border-t border-line bg-surface md:max-h-none md:w-[28rem] md:border-t-0 md:border-l lg:w-[32rem]"
    >
      {/* The question and how many answer it, read as one: question, then count. */}
      <section className="max-h-[45%] shrink-0 overflow-y-auto border-b border-line px-5 pt-5 pb-4">
        <Sentence pattern={pattern} className="text-[15px] text-fg" />
        {!issue &&
          (error ? (
            <ErrorNote className="mt-3">{error.message.replace(/^Value error, /, '')}</ErrorNote>
          ) : result ? (
            !empty && (
              <div className="mt-4">
                <Count found={result.total} truncated={result.truncated} pending={pending} />
              </div>
            )
          ) : (
            <p className="mt-4 text-sm text-fg-subtle">Szukam…</p>
          ))}
      </section>
      {issue ? (
        // Nothing to answer yet: say what the answer waits for, where the answer will be.
        <motion.div
          {...fade}
          className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center"
        >
          <p className="text-base font-semibold text-fg">Tu pojawi się odpowiedź</p>
          <p className="max-w-72 text-sm text-fg-muted">{issue}.</p>
        </motion.div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Into one result and back out, as a step forward and back. */}
          <AnimatePresence mode="popLayout" initial={false} custom={entity ? 1 : -1}>
            {entity && result && (
              <motion.div
                key={entity.id}
                custom={1}
                variants={step}
                initial="enter"
                animate="center"
                exit="exit"
                className="min-h-0 flex-1 overflow-y-auto bg-surface"
              >
                <EntityDetails
                  spaceId={spaceId}
                  entity={entity}
                  ties={tiesOf(entity.id, result.edges, known)}
                  onBack={() => setPicked(null)}
                  onOpenArticle={onOpenArticle}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Kept mounted under the details, so going back keeps the place in the list. */}
          <div className={cn('flex min-h-0 flex-1 flex-col', entity && 'hidden')}>
            <div
              className={cn(
                'spring-quick flex min-h-0 flex-1 flex-col overflow-y-auto transition-opacity',
                pending && 'opacity-50'
              )}
            >
              {empty ? (
                <NoMatches />
              ) : (
                !error &&
                result && (
                  <QueryResults
                    pattern={pattern}
                    result={result}
                    onPick={setPicked}
                    onHover={onHover}
                    more={more}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-line p-4">
        <Button variant="primary" onClick={onShow} disabled={!found} className="w-full">
          {found
            ? `${selecting ? 'Zaznacz' : 'Pokaż'} ${found} ${more.has ? `${pluralForm(found, LOADED_FORMS)} ` : ''}${pluralForm(found, RESULT_FORMS)} ${onMap ? 'na grafie' : 'na płótnie'}`
            : 'Brak wyników do pokazania'}
          {found > 0 && <Kbd>↵</Kbd>}
        </Button>
      </footer>
    </aside>
  )
}
