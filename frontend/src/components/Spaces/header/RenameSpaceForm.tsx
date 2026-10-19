import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'motion/react'
import { CheckIcon, XIcon } from 'lucide-react'
import { IconButton, TextInput } from '@/components/deck'
import { swapX } from '@/design/motion'
import { useRenameSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'
import { SPACE_NAME_MAX_LENGTH } from '../spaceText'

interface Props {
  space: Space
  onDone: () => void
  onError: (message: string | null) => void
}

export function RenameSpaceForm({ space, onDone, onError }: Props) {
  const [name, setName] = useState(space.name)
  const rename = useRenameSpace()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === space.name) return onDone()
    onError(null)
    rename.mutate(
      { id: space.id, name: trimmed },
      { onSuccess: onDone, onError: (error) => onError(error.message) }
    )
  }

  return (
    <motion.form {...swapX} onSubmit={submit} className="flex w-full items-center gap-3">
      <TextInput
        size="display"
        autoFocus
        aria-label="Nowa nazwa przestrzeni"
        value={name}
        maxLength={SPACE_NAME_MAX_LENGTH}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onDone()}
        className="max-w-xl flex-1"
      />
      <IconButton type="submit" variant="primary" label="Zapisz nazwę" disabled={rename.isPending}>
        <CheckIcon />
      </IconButton>
      <IconButton label="Anuluj zmianę nazwy" onClick={onDone}>
        <XIcon />
      </IconButton>
    </motion.form>
  )
}
