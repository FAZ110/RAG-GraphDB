import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'motion/react'
import { useCreateSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'
import { MapSheet } from './MapSheet'
import { SPACE_NAME_MAX_LENGTH } from './SpaceCard'
import type { Ink } from './spaceVisuals'

// An uninked sheet: the space gets its own colour and constellation only once it exists.
const PENCIL: Ink = { name: 'ołówek', color: '#64748B', field: '#F8FAFC' }

interface Props {
  initialName?: string
  onCancel: () => void
  onCreated: (space: Space) => void
}

// A new space before it exists: a sheet lifted off the pile like any other, in pencil
// grey, with its constellation only sketched and its title still to be written.
export function DraftSpaceCard({ initialName = '', onCancel, onCreated }: Props) {
  const [name, setName] = useState(initialName)
  const create = useCreateSpace()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate(trimmed, { onSuccess: onCreated })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="relative"
    >
      <MapSheet spaceId="draft" ink={PENCIL} sketch lifted>
        {/* The name is written where the title of a finished sheet is printed. */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          className="flex h-full flex-col justify-end gap-2 p-[6%]"
          style={{ textShadow: `0 0 10px ${PENCIL.field}` }}
        >
          <input
            autoFocus
            aria-label="Nazwa nowej przestrzeni"
            value={name}
            maxLength={SPACE_NAME_MAX_LENGTH}
            onChange={(e) => {
              setName(e.target.value)
              create.reset()
            }}
            placeholder="Nazwij przestrzeń"
            className="w-full border-b-2 border-dashed border-slate-400 bg-transparent pb-1 text-[clamp(1.5rem,3.4vw,2.375rem)] leading-tight font-bold tracking-[-0.015em] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900"
          />
          <p className="text-sm text-slate-500">
            Osobny graf dla zestawu artykułów, np. jednego tematu albo projektu.
          </p>
          {create.error && <p className="text-sm text-red-700">{create.error.message}</p>}
          <div className="flex items-center gap-4 pt-2 [text-shadow:none]">
            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              className="deck-button h-10 border border-slate-900 bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
            >
              {create.isPending ? 'Tworzę...' : 'Utwórz przestrzeń'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-2 text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
            >
              Anuluj
            </button>
          </div>
        </form>
      </MapSheet>
    </motion.div>
  )
}
