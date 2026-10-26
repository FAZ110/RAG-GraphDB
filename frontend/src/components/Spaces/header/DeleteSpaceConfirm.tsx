import type { ReactNode } from 'react'
import { ConfirmPopover } from '@/components/deck'
import { useDeleteSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'
import { deleteSpaceDetail, deleteSpaceQuestion } from '../deleteSpaceText'

interface Props {
  space: Space
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function DeleteSpaceConfirm({ space, open, onOpenChange, children }: Props) {
  const remove = useDeleteSpace()
  return (
    <ConfirmPopover
      open={open}
      onOpenChange={(next) => {
        remove.reset()
        onOpenChange(next)
      }}
      question={deleteSpaceQuestion(space)}
      detail={deleteSpaceDetail(space)}
      error={remove.error?.message ?? null}
      pending={remove.isPending}
      onConfirm={() => remove.mutate(space.id)}
    >
      {children}
    </ConfirmPopover>
  )
}
