import { XIcon } from 'lucide-react'
import { Button, EmptyState } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { ArticleStack } from '../add/ArticleStack'
import { SearchMiss } from '../SearchMiss'

interface Props {
  query: string
  ink: Ink
  onClear: () => void
}

export function NoArticleMatch({ query, ink, onClear }: Props) {
  return (
    <li className="px-5 py-10">
      <EmptyState
        title="Nic nie znaleziono"
        art={
          <SearchMiss ink={ink}>
            <ArticleStack ink={ink} open={false} />
          </SearchMiss>
        }
        action={
          <Button onClick={onClear}>
            <XIcon />
            Wyczyść wyszukiwanie
          </Button>
        }
        framed={false}
        className="p-0"
      >
        Żaden artykuł nie pasuje do „{query}”.
      </EmptyState>
    </li>
  )
}
