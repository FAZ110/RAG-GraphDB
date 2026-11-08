import type { CSSProperties } from 'react'
import { ArrowRightIcon } from 'lucide-react'
import { Swatch, focusRing } from '@/components/deck'
import { inkFor, inkTint } from '@/design/inks'
import type { Ink } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { ArticleRelationship, MentionedEntity } from '@/types'
import { typeName } from '../spaceText'

interface Pointing {
  inText: ReadonlySet<string>
  highlighted: ReadonlySet<string>
  onHover: (names: string[], relationshipId?: string) => void
  onSelect: (name: string) => void
  onSelectRelationship: (source: string, target: string) => void
}

const NOT_IN_TEXT = 'Tekst nie wymienia tej nazwy wprost'

const keyOf = (label: string, name: string) => `${label}:${name}`

// Entities come ordered by type, then name.
function byType(entities: MentionedEntity[]): [string, string[]][] {
  const groups = new Map<string, string[]>()
  for (const { label, name } of entities) groups.set(label, [...(groups.get(label) ?? []), name])
  return [...groups]
}

function EntityChip({
  name,
  label,
  own,
  inText,
  highlighted,
  onHover,
  onSelect,
}: { name: string; label: string; own: boolean } & Pointing) {
  const ink = inkFor(label)
  const lit = highlighted.has(name)
  const found = inText.has(name)
  return (
    <button
      type="button"
      // Clicking a name in the text scrolls to the entity's own entry, not to its branches.
      data-entity={own ? name : undefined}
      onMouseEnter={() => onHover([name])}
      onClick={() => found && onSelect(name)}
      title={found ? name : `${name}. ${NOT_IN_TEXT}`}
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-2 border bg-surface px-2 py-0.5 text-left text-sm transition-colors',
        found ? 'text-fg-soft' : 'cursor-default text-fg-faint',
        focusRing
      )}
      style={{ borderColor: lit ? ink.color : 'var(--line-soft)' }}
    >
      <Swatch color={ink.color} />
      <span className="truncate">{name}</span>
    </button>
  )
}

const branch =
  'relative py-1 pl-6 before:absolute before:top-0 before:left-0 before:h-full before:border-l-2 before:border-(--branch) last:before:h-1/2 after:absolute after:top-1/2 after:left-0 after:w-4 after:border-t-2 after:border-(--branch)'

function EntityBranches({
  name,
  ink,
  links,
  ...pointing
}: { name: string; ink: Ink; links: ArticleRelationship[] } & Pointing) {
  const { inText, highlighted, onHover, onSelect, onSelectRelationship } = pointing
  const found = inText.has(name)
  return (
    <div>
      <button
        type="button"
        data-entity={name}
        onMouseEnter={() => onHover([name])}
        onClick={() => found && onSelect(name)}
        title={found ? undefined : NOT_IN_TEXT}
        className={cn(
          '-mx-1 px-1 text-left text-sm font-semibold transition-colors',
          found ? 'text-fg' : 'cursor-default text-fg-muted',
          focusRing
        )}
        style={{ backgroundColor: highlighted.has(name) ? inkTint(ink, 16) : undefined }}
      >
        {name}
      </button>
      <ul className="ml-1" style={{ '--branch': inkTint(ink, 45) } as CSSProperties}>
        {links.map((r) => {
          const lit = highlighted.has(r.source) && highlighted.has(r.target)
          const relation = r.type.toLowerCase().replace(/_/g, ' ')
          return (
            <li
              key={`${r.type}|${r.target_label}|${r.target}`}
              onMouseEnter={() => onHover([r.source, r.target], r.id)}
              className={branch}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <button
                  type="button"
                  title={relation}
                  onClick={() => onSelectRelationship(r.source, r.target)}
                  className={cn(
                    'max-w-[55%] min-w-0 flex-none truncate px-1 text-left text-fg-muted transition-colors hover:text-fg',
                    focusRing
                  )}
                  style={{ backgroundColor: lit ? inkTint(ink, 16) : undefined }}
                >
                  {relation}
                </button>
                <ArrowRightIcon
                  className="size-3.5 shrink-0"
                  style={{ color: ink.color }}
                  aria-hidden="true"
                />
                <EntityChip name={r.target} label={r.target_label} own={false} {...pointing} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ArticleGraphOutline({
  entities,
  relationships,
  ...pointing
}: { entities: MentionedEntity[]; relationships: ArticleRelationship[] } & Pointing) {
  const outgoing = new Map<string, ArticleRelationship[]>()
  for (const r of relationships) {
    const key = keyOf(r.source_label, r.source)
    outgoing.set(key, [...(outgoing.get(key) ?? []), r])
  }

  return (
    <div className="space-y-6">
      {byType(entities).map(([label, names]) => {
        const ink = inkFor(label)
        const leaves = names.filter((name) => !outgoing.has(keyOf(label, name)))
        return (
          <section key={label}>
            <h3 className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
              <Swatch color={ink.color} />
              {typeName(label)}
              <span className="font-normal text-fg-faint tabular-nums">{names.length}</span>
            </h3>
            <div className="mt-2 space-y-3">
              {names
                .filter((name) => outgoing.has(keyOf(label, name)))
                .map((name) => (
                  <EntityBranches
                    key={name}
                    name={name}
                    ink={ink}
                    links={outgoing.get(keyOf(label, name))!}
                    {...pointing}
                  />
                ))}
              {leaves.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {leaves.map((name) => (
                    <li key={name} className="max-w-full">
                      <EntityChip name={name} label={label} own {...pointing} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
