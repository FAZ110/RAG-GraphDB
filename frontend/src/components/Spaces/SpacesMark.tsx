import { LayersIcon } from 'lucide-react'

const card = 'absolute inset-0 border bg-surface'

export function SpacesMark() {
  return (
    <div aria-hidden="true" className="relative size-20 shrink-0">
      <div
        className={`${card} border-line`}
        style={{ transform: 'rotate(-8deg) translate(-5px, 3px)' }}
      />
      <div
        className={`${card} border-line`}
        style={{ transform: 'rotate(6deg) translate(5px, 1px)' }}
      />
      <div
        className={`${card} deck flex items-center justify-center border-fg-subtle text-fg-soft [--deck-shadow:var(--line)]`}
      >
        <LayersIcon className="size-8" strokeWidth={1.75} />
      </div>
    </div>
  )
}
