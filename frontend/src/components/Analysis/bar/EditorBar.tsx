import {
  ArrowLeftIcon,
  Redo2Icon,
  ScanIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { IconButton } from '@/components/deck'
import type { SaveStatus as Status } from '../state/useAutosave'
import { NameField } from './NameField'
import { SaveStatus } from './SaveStatus'

interface Props {
  spaceName: string
  name: string
  onRename: (name: string) => void
  save: { status: Status; savedAt: string | null; error: string | null; retry: () => void }
  onReload: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onZoom: (factor: number) => void
  onFit: () => void
}

export function EditorBar(props: Props) {
  return (
    <div className="deck pointer-events-auto flex h-12 items-center gap-2 border border-line bg-surface px-2">
      <IconButton asChild variant="ghost" size="icon-sm" label="Wszystkie analizy">
        <Link to="/analyses">
          <ArrowLeftIcon />
        </Link>
      </IconButton>
      <span className="hidden max-w-40 truncate text-sm text-fg-subtle sm:inline">
        {props.spaceName} /
      </span>
      <NameField name={props.name} onRename={props.onRename} />

      <span className="ml-auto flex items-center">
        <SaveStatus
          status={props.save.status}
          savedAt={props.save.savedAt}
          error={props.save.error}
          onRetry={props.save.retry}
          onReload={props.onReload}
        />
        <span className="mx-1 h-5 w-px bg-line" />
        <IconButton
          variant="ghost"
          size="icon-sm"
          label="Cofnij (⌘Z)"
          disabled={!props.canUndo}
          onClick={props.onUndo}
        >
          <Undo2Icon />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-sm"
          label="Ponów (⇧⌘Z)"
          disabled={!props.canRedo}
          onClick={props.onRedo}
        >
          <Redo2Icon />
        </IconButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <IconButton
          variant="ghost"
          size="icon-sm"
          label="Oddal"
          onClick={() => props.onZoom(1 / 1.3)}
        >
          <ZoomOutIcon />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-sm"
          label="Przybliż"
          onClick={() => props.onZoom(1.3)}
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton variant="ghost" size="icon-sm" label="Pokaż wszystko (F)" onClick={props.onFit}>
          <ScanIcon />
        </IconButton>
      </span>
    </div>
  )
}
