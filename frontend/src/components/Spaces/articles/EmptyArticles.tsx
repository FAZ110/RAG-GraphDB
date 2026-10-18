import { PlusIcon } from 'lucide-react'
import { Button, EmptyState } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { useAddArticlesClick } from '../add/addArticlesContext'

export function EmptyArticles({ spaceId, ink }: { spaceId: string; ink: Ink }) {
  const addArticles = useAddArticlesClick(spaceId)
  return (
    <EmptyState
      title="Zacznij od artykułów"
      accent={ink.color}
      className="flex-1"
      action={
        <Button onClick={addArticles}>
          <PlusIcon style={{ color: ink.color }} aria-hidden="true" />
          Dodaj artykuły
        </Button>
      }
    >
      Każdy dodany artykuł rozłożymy na encje i powiązania, z których powstanie graf tej
      przestrzeni.
    </EmptyState>
  )
}
