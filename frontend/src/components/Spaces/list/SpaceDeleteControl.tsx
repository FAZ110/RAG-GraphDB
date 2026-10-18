import { RemoveControl } from '@/components/deck'
import { useDeleteSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'

interface Props {
  space: Space
  className?: string
}

export function SpaceDeleteControl({ space, className }: Props) {
  const remove = useDeleteSpace()
  return (
    <RemoveControl
      label={`Usuń przestrzeń ${space.name}`}
      question="Usunąć przestrzeń?"
      detail="Tego nie da się cofnąć."
      pending={remove.isPending}
      error={remove.error?.message ?? null}
      onOpen={remove.reset}
      onConfirm={(done) => remove.mutate(space.id, { onSuccess: done })}
      className={className}
    />
  )
}
