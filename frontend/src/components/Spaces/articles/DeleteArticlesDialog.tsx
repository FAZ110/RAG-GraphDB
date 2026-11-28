import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/deck'
import { useDeleteArticles } from '@/hooks/useSpaces'
import { ARTICLE_FORMS, pluralForm } from '../spaceText'

interface Props {
  spaceId: string
  articleIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

const articles = (count: number) => `${count} ${pluralForm(count, ARTICLE_FORMS)}`

export function DeleteArticlesDialog({
  spaceId,
  articleIds,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const remove = useDeleteArticles(spaceId)
  const [asked, setAsked] = useState(articleIds)
  if (open && asked !== articleIds) setAsked(articleIds)
  const count = asked.length

  const confirm = () => {
    const pending = toast.loading(`Usuwam ${articles(count)}…`)
    remove.mutateAsync(asked).then(
      ({ deleted, processing }) =>
        toast.success(
          processing.length > 0
            ? `Usunięto ${articles(deleted.length)}, pominięto ${processing.length} w trakcie przetwarzania`
            : `Usunięto ${articles(deleted.length)}`,
          { id: pending }
        ),
      () => toast.dismiss(pending)
    )
    onDeleted()
    onOpenChange(false)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Usunąć ${articles(count)}?`}
      description="Z grafu znikną też encje i powiązania, o których nie mówi żaden inny artykuł. Tego nie da się cofnąć."
      confirmLabel={count === 1 ? 'Usuń artykuł' : `Usuń ${articles(count)}`}
      onConfirm={confirm}
    />
  )
}
