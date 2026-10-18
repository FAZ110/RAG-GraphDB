import { NetworkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/deck'
import { PageHeader } from '@/components/layout/PageHeader'

// A placeholder until analyses can be saved.
export function AnalysesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <PageHeader title="Analizy" />
      <EmptyState
        title="Tu znajdą się zapisane analizy"
        className="min-h-80"
        action={
          <Button asChild>
            <Link to="/graph">
              <NetworkIcon />
              Otwórz graf
            </Link>
          </Button>
        }
      >
        Analiza zapamięta encje i powiązania, które wybierzesz w grafie, żeby można było do nich
        wrócić. Do tego czasu eksploruj graf przestrzeni.
      </EmptyState>
    </div>
  )
}
