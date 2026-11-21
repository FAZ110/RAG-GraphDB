import {
  ArrowRightIcon,
  ChevronRightIcon,
  PlusIcon,
  ScanSearchIcon,
  SearchIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'

// The drawing's paper, so each picture reads as a piece of the module itself.
const PAPER = {
  backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
}

/** The frame every picture sits in: it fills the room it is given, and the picture grows with
 * it, drawn once at one size and scaled, so text stays sharp and parts keep their places. */
export function Scene({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="@container relative flex h-full min-h-56 items-center justify-center overflow-hidden border border-line bg-surface-sunken"
      style={PAPER}
    >
      <div className="relative flex h-56 w-[36rem] shrink-0 items-center justify-center @3xl:scale-125 @5xl:scale-150">
        {children}
      </div>
    </div>
  )
}

function Sought({ label = 'Zawodnik', lit = false }: { label?: string; lit?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-12 w-40 border border-dashed border-fg-subtle bg-surface',
        lit && 'border-solid border-fg shadow-[3px_3px_0_var(--fg)]'
      )}
    >
      <span className="flex w-9 items-center justify-center border-r border-dashed border-fg-subtle bg-surface-sunken text-fg-muted">
        <ScanSearchIcon className="size-4" />
      </span>
      <span className="flex flex-1 flex-col items-center justify-center">
        <span className="text-sm font-semibold text-fg">{label}</span>
        <span className="text-[9px] font-medium tracking-wider text-fg-subtle uppercase">
          szukana encja
        </span>
      </span>
    </span>
  )
}

function Known({ name = 'Lech Poznań', label = 'KLUB' }: { name?: string; label?: string }) {
  const ink = inkFor(label)
  return (
    <span
      className="flex h-12 w-40 flex-col items-center justify-center border"
      style={{ borderColor: ink.color, background: ink.field }}
    >
      <span className="text-sm font-semibold" style={{ color: ink.color }}>
        {name}
      </span>
      <span className="text-xs text-fg-subtle">Klub</span>
    </span>
  )
}

function Tool({ children, on = false }: { children: ReactNode; on?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-7 items-center gap-1 border px-2 text-xs font-medium',
        on ? 'border-fg bg-surface shadow-[2px_2px_0_var(--fg)]' : 'border-line bg-surface'
      )}
    >
      {children}
    </span>
  )
}

/** A link drawn between two nodes, its label on it. */
function Link({ label, tone = 'plain' }: { label: string; tone?: 'plain' | 'not' | 'maybe' }) {
  const color = tone === 'not' ? 'var(--danger)' : 'var(--fg-muted)'
  return (
    <span className="relative flex w-28 items-center">
      <span
        className="h-0 flex-1 border-t-[1.5px]"
        style={{ borderColor: color, borderStyle: tone === 'maybe' ? 'dashed' : 'solid' }}
      />
      <span
        className="size-0 border-y-[4px] border-l-[7px] border-y-transparent"
        style={{ borderLeftColor: color }}
      />
      <span
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border bg-surface px-1.5 text-[10px] font-medium whitespace-nowrap',
          tone === 'not' ? 'border-danger text-danger' : 'border-line text-fg-soft',
          tone === 'maybe' && 'border-dashed'
        )}
      >
        {label}
      </span>
    </span>
  )
}

export function SoughtArt() {
  return (
    <Scene>
      <span className="absolute top-4 left-4 flex gap-2">
        <Tool on>
          <PlusIcon className="size-3" /> Szukana
        </Tool>
        <Tool>
          <PlusIcon className="size-3" /> Znana
        </Tool>
      </span>
      <Sought lit />
      <span className="absolute right-6 bottom-6 flex gap-1.5 border border-line bg-surface p-2">
        {['Dowolny', 'Zawodnik', 'Klub'].map((t) => (
          <span
            key={t}
            className={cn(
              'border px-1.5 py-0.5 text-[10px]',
              t === 'Zawodnik' ? 'border-fg bg-fg text-fg-inverse' : 'border-line text-fg-soft'
            )}
          >
            {t}
          </span>
        ))}
      </span>
    </Scene>
  )
}

export function KnownArt() {
  return (
    <Scene>
      <span className="absolute top-4 left-4 flex w-56 flex-col">
        <span className="flex h-8 items-center gap-2 border border-fg bg-surface px-2 text-xs text-fg">
          <SearchIcon className="size-3.5 text-fg-faint" /> Lech
        </span>
        <span className="flex flex-col border-x border-b border-line bg-surface text-xs">
          <span className="flex items-center gap-2 bg-surface-sunken px-2 py-1 text-fg">
            <span className="size-2" style={{ background: inkFor('KLUB').color }} /> Lech Poznań
            <PlusIcon className="ml-auto size-3 text-fg-muted" />
          </span>
          <span className="flex items-center gap-2 px-2 py-1 text-fg-soft">
            <span className="size-2" style={{ background: inkFor('KLUB').color }} /> Lechia Gdańsk
          </span>
        </span>
      </span>
      <span className="ml-40">
        <Known />
      </span>
    </Scene>
  )
}

export function LinkArt() {
  return (
    <Scene>
      <span className="flex items-center">
        <Sought />
        <Link label="gra w" />
        <Known />
      </span>
      <span className="absolute bottom-5 text-xs text-fg-soft">
        Przeciągnij od kropki przy węźle albo użyj „Połącz”
      </span>
    </Scene>
  )
}

export function ConditionsArt() {
  return (
    <Scene>
      <span className="flex w-[30rem] flex-col gap-3 border border-line bg-surface p-4 text-xs">
        <span className="flex items-center gap-3">
          <span className="w-20 text-fg-subtle">Warunek</span>
          {['Musi istnieć', 'Może istnieć', 'Nie może istnieć'].map((t, i) => (
            <span
              key={t}
              className={cn(
                'border px-2 py-1',
                i === 0 ? 'border-fg bg-fg text-fg-inverse' : 'border-line text-fg-soft'
              )}
            >
              {t}
            </span>
          ))}
        </span>
        <span className="flex items-center gap-3">
          <span className="w-20 text-fg-subtle">Powiązania</span>
          <span className="text-fg-soft">co najmniej</span>
          <span className="border border-line px-2 py-1 font-semibold text-fg">2</span>
          <span className="border border-dashed border-fg-subtle px-2 py-1 text-fg">
            z typem Klub
          </span>
        </span>
      </span>
    </Scene>
  )
}

export function AnswerArt() {
  const zawodnik = inkFor('ZAWODNIK').color
  return (
    <Scene>
      <span className="flex gap-4">
        <span className="flex w-52 flex-col border border-line bg-surface">
          <span className="flex items-baseline gap-1.5 border-b border-line px-3 py-2">
            <span className="text-2xl font-semibold text-fg">14</span>
            <span className="text-xs text-fg-soft">wyników</span>
          </span>
          {['Mikael Ishak', 'Antoni Kozubal', 'Luis Palma'].map((name, i) => (
            <span
              key={name}
              className={cn(
                'flex items-center gap-2 border-b border-line-soft px-3 py-1.5 text-xs text-fg last:border-b-0',
                i === 0 && 'bg-surface-sunken'
              )}
            >
              <span className="size-2" style={{ background: zawodnik }} />
              {name}
              <ChevronRightIcon className="ml-auto size-3 text-fg-faint" />
            </span>
          ))}
        </span>
        <ArrowRightIcon className="size-4 self-center text-fg-muted" />
        <span className="flex w-56 flex-col gap-1 border border-line bg-surface p-3 text-[10px]">
          <span className="text-xs font-semibold text-fg-subtle">Dlaczego jest w wynikach</span>
          <span
            className="w-fit border px-1.5 py-0.5 font-semibold"
            style={{ borderColor: zawodnik }}
          >
            Mikael Ishak
          </span>
          <span className="ml-2 flex items-center gap-1 border-l border-fg-subtle py-1 pl-2">
            <span className="border border-line px-1">gra w →</span>
            <span className="h-px flex-1 bg-fg-subtle" />
            <span className="border px-1" style={{ borderColor: inkFor('KLUB').color }}>
              Lech Poznań
            </span>
          </span>
        </span>
      </span>
    </Scene>
  )
}

export function MoreArt() {
  return (
    <Scene>
      <span className="grid grid-cols-2 gap-x-10 gap-y-5">
        <span className="flex flex-col items-center gap-1.5">
          <Link label="nie: grał dla" tone="not" />
          <span className="text-xs text-fg-soft">wykluczenie</span>
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <Link label="może: trener dla" tone="maybe" />
          <span className="text-xs text-fg-soft">opcjonalne</span>
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <span className="relative h-8 w-28">
            <span
              className="absolute inset-0 translate-x-1.5 -translate-y-1.5 border"
              style={{ borderColor: inkFor('KLUB').color, background: inkFor('KLUB').field }}
            />
            <span
              className="absolute inset-0 flex items-center justify-center border text-[10px] font-semibold"
              style={{
                borderColor: inkFor('KLUB').color,
                background: inkFor('KLUB').field,
                color: inkFor('KLUB').color,
              }}
            >
              Lech Poznań +2
            </span>
          </span>
          <span className="text-xs text-fg-soft">grupa: co najmniej K z</span>
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <span className="flex w-28 items-center">
            <span className="h-0 flex-1 border-t-2 border-dotted border-fg-muted" />
          </span>
          <span className="text-xs text-fg-soft">wspomniane razem</span>
        </span>
      </span>
    </Scene>
  )
}
