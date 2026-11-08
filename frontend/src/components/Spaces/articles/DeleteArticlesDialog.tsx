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

export function DeleteArticlesDialog({
  spaceId,
  articleIds,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const remove = useDeleteArticles(spaceId)
  const count = articleIds.length

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) remove.reset()
      }}
      title={`Usunąć ${count} ${pluralForm(count, ARTICLE_FORMS)}?`}
      description="Z grafu znikną też encje i powiązania, o których nie mówi żaden inny artykuł. Tego nie da się cofnąć."
      error={remove.error?.message}
      confirmLabel={
        count === 1 ? 'Usuń artykuł' : `Usuń ${count} ${pluralForm(count, ARTICLE_FORMS)}`
      }
      pending={remove.isPending}
      onConfirm={() =>
        remove.mutate(articleIds, {
          onSuccess: () => {
            onDeleted()
            onOpenChange(false)
          },
        })
      }
    />
  )
}
