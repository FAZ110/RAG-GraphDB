import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'motion/react'
import { Button, ErrorNote, TextInput } from '@/components/deck'
import { unfold } from '@/design/motion'
import { useCreateSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'
import { SPACE_NAME_MAX_LENGTH } from '../spaceText'

interface Props {
  initialName: string
  onCreated: (space: Space) => void
  onCancel: () => void
}

export function DraftSpaceItem({ initialName, onCreated, onCancel }: Props) {
  const [name, setName] = useState(initialName)
  const create = useCreateSpace()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) create.mutate(trimmed, { onSuccess: onCreated })
  }

  return (
    <motion.li {...unfold} className="overflow-hidden border-b border-line-soft bg-surface-sunken">
      <form
        onSubmit={submit}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="flex items-start gap-3 py-3 pr-3 pl-5"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <TextInput
            autoFocus
            aria-label="Nazwa nowej przestrzeni"
            value={name}
            maxLength={SPACE_NAME_MAX_LENGTH}
            onChange={(e) => {
              setName(e.target.value)
              create.reset()
            }}
            placeholder="Nazwij przestrzeń"
            className="font-semibold"
          />
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={create.isPending || !name.trim()}
            >
              {create.isPending ? 'Tworzę...' : 'Utwórz'}
            </Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={onCancel}>
              Anuluj
            </Button>
          </div>
          {create.error && <ErrorNote inline>{create.error.message}</ErrorNote>}
        </div>
      </form>
    </motion.li>
  )
}
