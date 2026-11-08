import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRenameSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'

export function useTitleRename(
  space: Space,
  onDone: () => void,
  onError: (message: string | null) => void
) {
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

  return { name, setName, submit, pending: rename.isPending }
}
