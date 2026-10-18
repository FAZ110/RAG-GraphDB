import { PlusIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/deck'
import type { Ink } from '@/design/inks'

export function EmptyArticles({ ink }: { ink: Ink }) {
  return (
    <EmptyState
      title="Zacznij od artykułów"
      accent={ink.color}
      className="flex-1"
      action={
        <Button asChild>
          <Link to="/extract">
            <PlusIcon style={{ color: ink.color }} aria-hidden="true" />
            Dodaj artykuły
          </Link>
        </Button>
      }
    >
      Każdy dodany artykuł rozłożymy na encje i powiązania, z których powstanie graf tej
      przestrzeni.
    </EmptyState>
  )
}
