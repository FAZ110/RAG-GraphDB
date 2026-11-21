import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import { relationName } from '@/components/canvas/relationName'
import { focusRing } from '@/components/deck/styles'
import { pluralForm, RELATIONSHIP_FORMS, typeName } from '@/components/Spaces/spaceText'
import { cn } from '@/lib/utils'
import type { SpaceSchema } from '@/types/query'
import { Chips } from './Chips'
import type { LinkCount } from './counting'
import { relationOptions } from './relations'
import { Stepper } from './Stepper'

const ANY = '*'
// The most common choices shown at once; the rest are found by typing.
const CHIPS_SHOWN = 8

interface Props {
  /** The sought node's type, so only the relationships it has are offered. */
  label: string | null
  value: LinkCount | null
  schema: SpaceSchema | undefined
  onChange: (value: LinkCount | null) => void
}

/** A part of the condition read as a sentence, which opens its choices below when clicked. */
function Token({ text, open, onClick }: { text: string; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        'flex h-7 items-center gap-1 border px-2 text-xs transition-colors',
        open
          ? 'border-fg bg-fg font-semibold text-fg-inverse'
          : 'border-dashed border-fg-subtle bg-surface text-fg hover:border-fg',
        focusRing
      )}
    >
      {text}
      <ChevronDownIcon className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
    </button>
  )
}

/** "Co najmniej N powiązań [relacja] z [typ]": how many entities the sought one is linked to. */
export function LinkCountEditor({ label, value, schema, onChange }: Props) {
  const [open, setOpen] = useState<'type' | 'label' | null>(null)
  const min = value?.min ?? 0
  const set = (change: Partial<LinkCount>) =>
    onChange({ min: min || 1, type: null, label: null, ...value, ...change })
  const toggle = (which: 'type' | 'label') => setOpen(open === which ? null : which)

  const relations = [
    { value: ANY, label: 'Dowolna' },
    ...(schema ? relationOptions(schema, label, null) : []).map((o) => ({
      value: o.type,
      label: relationName(o.type),
      count: o.count,
    })),
  ]
  const types = [
    { value: ANY, label: 'Dowolny' },
    ...(schema?.labels ?? []).map((l) => ({
      value: l.label,
      label: typeName(l.label),
      count: l.count,
    })),
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-soft">
        <span>co najmniej</span>
        <Stepper
          value={min}
          min={0}
          label="Co najmniej tyle powiązań"
          onChange={(n) => (n === 0 ? onChange(null) : set({ min: n }))}
        />
        {value ? (
          <>
            <span>{pluralForm(min, RELATIONSHIP_FORMS)}</span>
            <Token
              text={value.type ? `„${relationName(value.type)}”` : 'dowolna relacja'}
              open={open === 'type'}
              onClick={() => toggle('type')}
            />
            <Token
              text={value.label ? `z typem ${typeName(value.label)}` : 'z dowolnym typem'}
              open={open === 'label'}
              onClick={() => toggle('label')}
            />
          </>
        ) : (
          <span>powiązań, czyli bez warunku</span>
        )}
      </div>
      {value && open && (
        <div className="animate-in fade-in-0 spring-quick">
          <Chips
            label={open === 'type' ? 'Liczone powiązania' : 'Typ encji po drugiej stronie'}
            limit={CHIPS_SHOWN}
            chips={open === 'type' ? relations : types}
            value={(open === 'type' ? value.type : value.label) ?? ANY}
            onChange={(v) => {
              set({ [open]: v === ANY ? null : v })
              setOpen(null)
            }}
          />
        </div>
      )}
    </div>
  )
}
