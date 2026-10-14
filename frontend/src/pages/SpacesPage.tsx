import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { PlusIcon } from 'lucide-react'
import { ErrorMessage } from '@/components/ErrorMessage'
import { DraftSpaceCard } from '@/components/Spaces/DraftSpaceCard'
import { SearchCard } from '@/components/Spaces/SearchCard'
import { SpaceCard } from '@/components/Spaces/SpaceCard'
import { SpaceDeck } from '@/components/Spaces/SpaceDeck'
import { filterSpaces, normalize } from '@/components/Spaces/spaceSearch'
import { inkFor } from '@/components/Spaces/spaceVisuals'
import type { Ink } from '@/components/Spaces/spaceVisuals'
import { Button } from '@/components/ui/button'
import { useSpaces } from '@/hooks/useSpaces'
import type { Space } from '@/types'

const HIGHLIGHT_MS = 1800
const CARD_WIDTH = 'w-[min(560px,72vw)]'
const DRAFT = 'draft'
const SEARCH = 'search'
type Slide = Space | typeof DRAFT | typeof SEARCH
// Middle of the map: the card is CARD_WIDTH wide and the field is 240×150; sheets pivot here.
const THREAD_Y = 'min(175px, 22.5vw)'
const PENCIL: Ink = { name: 'ołówek', color: '#94A3B8', field: '#F8FAFC' }

const slideKey = (slide: Slide) => (typeof slide === 'string' ? slide : slide.id)

// How many sheets each side of the picked one still show on the pile.
const PILE_DEPTH = 4

// A small, repeatable twist and nudge per sheet, so the pile looks thrown, not stacked.
function scatter(key: string): { turn: number; x: number; y: number } {
  let seed = 11
  for (const char of key) seed = (seed * 31 + char.charCodeAt(0)) >>> 0
  const unit = (shift: number) => ((seed >>> shift) % 1000) / 1000 - 0.5
  return { turn: unit(0) * 14, x: unit(10) * 40, y: unit(20) * 30 }
}

// The picked sheet is held up facing the viewer. Every other sheet lies on one pile
// behind it, on the table seen from above: the next ones fan out to the right, the
// previous ones to the left, deeper ones further down the pile.
function pileTransform(offset: number, key: string): string {
  if (offset === 0) return 'perspective(1600px) translateY(-6px) rotateX(4deg)'
  const depth = Math.min(Math.abs(offset), PILE_DEPTH)
  const side = Math.sign(offset)
  const { turn, x, y } = scatter(key)
  const spread = side * (170 + depth * 70) + x
  return [
    'perspective(1600px)',
    `translateX(${spread}px)`,
    `translateY(${-115 + y}px)`,
    `translateZ(${-140 - depth * 40}px)`,
    'rotateX(58deg)',
    `rotateZ(${side * (2 + depth * 2) + turn}deg)`,
  ].join(' ')
}

const plural = new Intl.PluralRules('pl-PL')
const SPACE_FORMS = { one: 'przestrzeń', few: 'przestrzenie', many: 'przestrzeni' }

function countSpaces(count: number): string {
  const form = plural.select(count)
  return `${count} ${form === 'one' || form === 'few' ? SPACE_FORMS[form] : SPACE_FORMS.many}`
}

export function SpacesPage() {
  const spaces = useSpaces()
  const [picked, setPicked] = useState(0)
  // Slot the draft card was slipped into, or null when no new space is being drafted.
  const [draftAt, setDraftAt] = useState<number | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  // Index the search card was slipped in at, or null when nobody is searching.
  const [searchAt, setSearchAt] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const searchInput = useRef<HTMLInputElement>(null)
  // What ends the search: the field's blur closes the card, and these say what follows.
  const pendingPick = useRef<Space | null>(null)
  const pendingCreate = useRef<string | null>(null)
  // Name typed into the palette when nothing matched; bumping the version remounts the draft.
  const [draftName, setDraftName] = useState({ value: '', version: 0 })
  const createdId = useRef<string | null>(null)

  // Newest first, so a space that was just created takes the draft's place.
  const sorted = useMemo(
    () => [...(spaces.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [spaces.data]
  )
  const baseSlides: Slide[] =
    draftAt !== null ? [...sorted.slice(0, draftAt), DRAFT, ...sorted.slice(draftAt)] : sorted
  const searching = searchAt !== null
  const slides: Slide[] = searching
    ? [...baseSlides.slice(0, searchAt), SEARCH, ...baseSlides.slice(searchAt)]
    : baseSlides

  const needle = normalize(query.trim())
  const results = filterSpaces(sorted, needle)
  const activeResult = results[Math.min(cursor, results.length - 1)]

  const inkOf = (slide: Slide): Ink => {
    if (slide === DRAFT) return PENCIL
    if (slide === SEARCH) return activeResult ? inkFor(activeResult.id) : PENCIL
    return inkFor(slide.id)
  }
  // Kept in range when a space is deleted from under the pile.
  const selected = Math.min(picked, Math.max(slides.length - 1, 0))
  const centred = slides[selected] as Slide | undefined

  // Signed distance of a slide from the centre, taking the shortest way round the loop.
  const offsetFromCentre = (index: number) => {
    let offset = index - selected
    if (offset > slides.length / 2) offset -= slides.length
    if (offset < -slides.length / 2) offset += slides.length
    return offset
  }
  const stageInk = centred ? inkOf(centred) : PENCIL
  // A sheet at the far end of the loop crosses to the other side of the pile; keeping
  // the outermost slot each way hidden makes it cross unseen instead of across the table.
  const pileDepth = Math.min(PILE_DEPTH, Math.max(1, Math.floor((slides.length - 1) / 2) - 1))

  // Picks a sheet off the pile. A draft the user moves away from without creating it
  // is dropped, and the sheets after it move one place back.
  const go = (index: number) => {
    const next = ((index % slides.length) + slides.length) % slides.length
    if (draftAt !== null && !createdId.current && next !== draftAt) {
      setDraftAt(null)
      setPicked(next > draftAt ? next - 1 : next)
      return
    }
    setPicked(next)
  }

  // Swap the draft for the real card once the refetched list contains it.
  useEffect(() => {
    if (!createdId.current) return
    const index = sorted.findIndex((s) => s.id === createdId.current)
    if (index === -1) return
    setPicked(index)
    setHighlightedId(createdId.current)
    createdId.current = null
    setDraftAt(null)
  }, [sorted])

  useEffect(() => {
    if (!highlightedId) return
    const timeout = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS)
    return () => clearTimeout(timeout)
  }, [highlightedId])

  // A new space starts as a draft card slipped in where the centred card was.
  const startDraft = (name = '', at = selected) => {
    setDraftName((draft) => ({ value: name, version: draft.version + 1 }))
    if (draftAt !== null) {
      setPicked(draftAt)
      return
    }
    setPicked(at)
    setDraftAt(at)
  }

  // Focusing the deck's field slips a search card in where the centred card was.
  const startSearch = () => {
    const at = draftAt ?? selected
    if (draftAt !== null) setDraftAt(null)
    const current = sorted.indexOf(slides[selected] as Space)
    setQuery('')
    setCursor(Math.max(current, 0))
    setPicked(at)
    setSearchAt(at)
  }

  // Every way out of the search blurs the field; the card goes and the carousel moves
  // to the picked space, or back to the card the search replaced.
  const endSearch = () => {
    const choice = pendingPick.current
    const create = pendingCreate.current
    pendingPick.current = null
    pendingCreate.current = null
    if (choice) {
      setPicked(sorted.indexOf(choice))
      setHighlightedId(choice.id)
    } else if (searchAt !== null) {
      setPicked(searchAt)
    }
    setSearchAt(null)
    if (create !== null && searchAt !== null) startDraft(create, searchAt)
  }

  const pickResult = (space: Space) => {
    pendingPick.current = space
    searchInput.current?.blur()
  }

  const createFromSearch = (name: string) => {
    pendingCreate.current = name
    searchInput.current?.blur()
  }

  const handleSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.currentTarget.blur()
    } else if (e.key === 'Enter') {
      // Without this the same keypress would submit the draft form that takes focus next.
      e.preventDefault()
      if (activeResult) pickResult(activeResult)
      else if (query.trim()) createFromSearch(query.trim())
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length > 0) {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setCursor((current) => (current + step + results.length) % results.length)
    }
  }

  const matchesLabel = () => {
    const form = plural.select(results.length)
    const word = form === 'one' ? 'trafienie' : form === 'few' ? 'trafienia' : 'trafień'
    return `${results.length} ${word}`
  }

  // "/" or Ctrl/⌘+K puts the cursor in the deck's search field unless the user is typing somewhere.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      const shortcut = (e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)
      if (shortcut && !(typing && e.key === '/')) {
        e.preventDefault()
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // The card the draft pushed aside moves back into the draft's slot.
  const cancelDraft = () => {
    if (draftAt !== null) setPicked(draftAt)
    setDraftAt(null)
  }

  return (
    <div className="space-y-8">
      {/* With spaces the title sits under the deck; until then it heads the page. */}
      {slides.length === 0 && (
        <header className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Przestrzenie</h1>
          {spaces.data && (
            <span className="text-sm text-slate-500 tabular-nums">
              {countSpaces(spaces.data.length)}
            </span>
          )}
        </header>
      )}

      {spaces.error && <ErrorMessage message={spaces.error.message} />}

      {spaces.isPending && (
        <div className={`mx-auto h-[28rem] ${CARD_WIDTH} animate-pulse bg-slate-100`} />
      )}

      {spaces.data && slides.length === 0 && (
        <div className="border-2 border-dashed border-slate-300 px-6 py-24 text-center">
          <p className="text-lg font-semibold text-slate-900">
            Nie masz jeszcze żadnej przestrzeni
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Przestrzeń to osobny graf dla zestawu artykułów, np. jednego tematu albo projektu.
          </p>
          <Button size="lg" className="mt-6 h-10 px-4" onClick={() => startDraft()}>
            <PlusIcon />
            Utwórz pierwszą przestrzeń
          </Button>
        </div>
      )}

      {slides.length > 0 && (
        // Centred on the middle sheet, like the carousel below it.
        <header className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 text-center">
          <h1 className="text-5xl leading-none font-extrabold tracking-[-0.025em] text-slate-900 sm:text-6xl">
            Przestrzenie
          </h1>
          <p className="text-base text-balance text-slate-600">
            Każda przestrzeń to osobny graf wiedzy zbudowany z jej artykułów.
          </p>
        </header>
      )}

      {slides.length > 0 && (
        // Bleeds to the window edges so side cards run off the screen, not the page padding.
        <div
          className="stage -mx-4 space-y-4 pb-10 sm:-mx-6 lg:-mx-8"
          style={
            {
              '--stage-ink': stageInk.color,
              '--stage-field': stageInk.field,
              '--thread-y': THREAD_Y,
            } as CSSProperties
          }
        >
          {/* Every sheet sits in the same cell; the transforms lay out the pile. */}
          <div
            role="region"
            aria-roledescription="karuzela"
            aria-label="Przestrzenie"
            onKeyDown={(e) => {
              if ((e.target as HTMLElement).tagName === 'INPUT') return
              if (e.key === 'ArrowLeft') go(selected - 1)
              if (e.key === 'ArrowRight') go(selected + 1)
            }}
            className="grid justify-center overflow-x-clip pt-10 pb-6"
          >
            {slides.map((slide, index) => {
              const isCenter = index === selected
              const offset = offsetFromCentre(index)
              const buried = Math.abs(offset) > pileDepth
              return (
                <div
                  key={slideKey(slide)}
                  role="group"
                  aria-roledescription="arkusz"
                  inert={buried}
                  className={`relative [grid-area:1/1] ${CARD_WIDTH} origin-[50%_var(--thread-y)] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none`}
                  style={{
                    // Nearer sheets lie on top of the pile, the picked one above them all.
                    zIndex: isCenter ? 50 : 40 - Math.min(Math.abs(offset), 39),
                    transform: pileTransform(offset, slideKey(slide)),
                    opacity: buried ? 0 : 1,
                  }}
                >
                  {slide === SEARCH ? (
                    <SearchCard
                      results={results}
                      active={activeResult}
                      needle={needle}
                      query={query}
                      onHover={setCursor}
                      onPick={pickResult}
                      onCreate={createFromSearch}
                    />
                  ) : slide === DRAFT ? (
                    <DraftSpaceCard
                      key={draftName.version}
                      initialName={draftName.value}
                      onCancel={cancelDraft}
                      onCreated={(space) => {
                        createdId.current = space.id
                      }}
                    />
                  ) : (
                    <SpaceCard
                      space={slide}
                      active={isCenter}
                      highlighted={highlightedId === slide.id}
                    />
                  )}
                  {!isCenter && (
                    <button
                      type="button"
                      aria-label={
                        slide === DRAFT
                          ? 'Pokaż nową przestrzeń'
                          : slide === SEARCH
                            ? 'Pokaż wyniki wyszukiwania'
                            : `Pokaż przestrzeń ${slide.name}`
                      }
                      onClick={() => go(index)}
                      className="absolute inset-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* As wide as the centred sheet, so their edges line up. */}
          <div className={`mx-auto ${CARD_WIDTH}`}>
            <SpaceDeck
              name={
                centred === DRAFT
                  ? 'Nowa przestrzeń'
                  : centred === SEARCH
                    ? 'Wyszukiwanie'
                    : (centred?.name ?? '')
              }
              position={selected + 1}
              total={slides.length}
              searching={searching}
              query={query}
              searchStatus={needle ? matchesLabel() : ''}
              onPrev={() => go(selected - 1)}
              onNext={() => go(selected + 1)}
              onAdd={() => startDraft()}
              onSearchStart={startSearch}
              onSearchEnd={endSearch}
              onQueryChange={(value) => {
                setQuery(value)
                setCursor(0)
              }}
              onSearchKeyDown={handleSearchKey}
              inputRef={searchInput}
            />
          </div>
        </div>
      )}
    </div>
  )
}
