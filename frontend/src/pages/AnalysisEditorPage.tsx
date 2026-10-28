import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnalysisEditor } from '@/components/Analysis/AnalysisEditor'
import { Button, EmptyState } from '@/components/deck'
import { useSpaces } from '@/hooks/useSpaces'
import { fetchAnalysis } from '@/services/analyses'

const NEW = 'new'

export function AnalysisEditorPage() {
  const { spaceId = '', analysisId = NEW } = useParams()
  const navigate = useNavigate()
  const spaces = useSpaces()
  // Set once a new analysis is saved, so its address can change without reopening it.
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [reloads, setReloads] = useState(0)
  const opened = analysisId !== NEW && analysisId !== createdId ? analysisId : null
  const analysis = useQuery({
    queryKey: ['analyses', spaceId, opened, reloads],
    queryFn: () => fetchAnalysis(spaceId, opened!),
    enabled: opened !== null,
    staleTime: Infinity,
    gcTime: 0,
  })
  const space = spaces.data?.find((s) => s.id === spaceId)

  if (spaces.error || analysis.error) {
    return (
      <EmptyState
        title="Nie udało się otworzyć analizy"
        className="min-h-80"
        action={
          <Button asChild>
            <Link to="/analyses">Wszystkie analizy</Link>
          </Button>
        }
      >
        {(spaces.error ?? analysis.error)?.message}
      </EmptyState>
    )
  }
  if (!spaces.data || (opened && !analysis.data)) return null
  if (!space) {
    return (
      <EmptyState
        title="Tej przestrzeni już nie ma"
        className="min-h-80"
        action={
          <Button asChild>
            <Link to="/analyses">Wszystkie analizy</Link>
          </Button>
        }
      >
        Analizy należą do przestrzeni, więc zniknęły razem z nią.
      </EmptyState>
    )
  }

  return (
    <AnalysisEditor
      key={`${space.id}:${opened ?? NEW}:${reloads}`}
      space={space}
      initial={analysis.data ?? null}
      onCreated={(created) => {
        setCreatedId(created.id)
        navigate(`/analyses/${space.id}/${created.id}`, { replace: true })
      }}
      onReload={() => {
        if (createdId) {
          setCreatedId(null)
          return
        }
        setReloads((n) => n + 1)
      }}
    />
  )
}
