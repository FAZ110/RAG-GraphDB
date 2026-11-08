import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button, EmptyState } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { ArticleStack } from '../add/ArticleStack'
import { useAddArticlesClick } from '../add/addArticlesContext'

export function EmptyArticles({ spaceId, ink }: { spaceId: string; ink: Ink }) {
  const addArticles = useAddArticlesClick(spaceId)
  // The stack fans out as the button is aimed at, as it does under files dragged into the dialog.
  const [aimed, setAimed] = useState(false)
  return (
    <EmptyState
      title="Zacznij od artykułów"
      accent={ink.color}
      className="flex-1"
      art={<ArticleStack ink={ink} open={aimed} />}
      action={
        <Button
          onClick={addArticles}
          onPointerEnter={() => setAimed(true)}
          onPointerLeave={() => setAimed(false)}
          onFocus={() => setAimed(true)}
          onBlur={() => setAimed(false)}
        >
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
