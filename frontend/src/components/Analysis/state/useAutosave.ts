import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { RevisionConflict, createAnalysis, saveCanvas } from '@/services/analyses'
import type { Analysis } from '@/types/analysis'
import { pending } from './canvasDoc'
import type { CanvasDoc } from './canvasDoc'

export type SaveStatus = 'draft' | 'saved' | 'saving' | 'unsaved' | 'error' | 'conflict'

interface Options {
  spaceId: string
  /** The saved analysis being edited; null until a new one gets its first entity. */
  analysis: { id: string; revision: number; savedAt: string } | null
  doc: CanvasDoc
  name: string
  onSaved: (sent: ReadonlyMap<string, number>) => void
  onCreated: (analysis: Analysis) => void
}

// Long enough that a drag across the canvas or a burst of clicks goes out as one save.
const SETTLE_MS = 800

export function useAutosave({ spaceId, analysis, doc, name, onSaved, onCreated }: Options) {
  const [target, setTarget] = useState(analysis && { id: analysis.id, revision: analysis.revision })
  const [savedAt, setSavedAt] = useState(analysis?.savedAt ?? null)
  const [status, setStatus] = useState<SaveStatus>(analysis ? 'saved' : 'draft')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const busy = useRef(false)

  const save = useEffectEvent(async () => {
    if (busy.current || doc.dirty.size === 0 || status === 'conflict') return
    busy.current = true
    setStatus('saving')
    const sent = new Map(doc.dirty)
    try {
      if (!target) {
        const entities = [...doc.entities.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y }))
        const created = await createAnalysis(spaceId, { name, entities, article_ids: [] })
        setTarget({ id: created.id, revision: created.revision })
        setSavedAt(created.updated_at)
        onCreated(created)
      } else {
        const result = await saveCanvas(spaceId, target.id, {
          revision: target.revision,
          ...pending(doc),
        })
        setTarget({ id: target.id, revision: result.revision })
        setSavedAt(result.updated_at)
      }
      onSaved(sent)
      setError(null)
      setStatus('saved')
    } catch (e) {
      setError((e as Error).message)
      setStatus(e instanceof RevisionConflict ? 'conflict' : 'error')
    } finally {
      busy.current = false
    }
  })

  useEffect(() => {
    if (doc.dirty.size === 0) return
    if (!target && doc.entities.size === 0) return
    const timer = setTimeout(() => void save(), target ? SETTLE_MS : 0)
    return () => clearTimeout(timer)
  }, [doc.dirty, doc.entities.size, target, attempt])

  const unsaved = doc.dirty.size > 0 && (target !== null || doc.entities.size > 0)
  useEffect(() => {
    if (!unsaved) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  return {
    id: target?.id ?? null,
    status: status === 'saved' && unsaved ? ('unsaved' as const) : status,
    error,
    savedAt,
    retry: () => setAttempt((n) => n + 1),
  }
}
