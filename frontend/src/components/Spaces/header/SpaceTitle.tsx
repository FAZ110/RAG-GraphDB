import { useState } from 'react'
import { CheckIcon, PenLineIcon, Trash2Icon, XIcon } from 'lucide-react'
import { ErrorNote, IconButton, IconSwap } from '@/components/deck'
import type { Space } from '@/types'
import { formatDate } from '../spaceText'
import { DeleteSpaceConfirm } from './DeleteSpaceConfirm'
import { TitleField } from './TitleField'
import { useTitleRename } from './useTitleRename'

type Mode = 'view' | 'rename' | 'delete'

const titleType = 'text-display @md:text-display-lg @xl:text-display-xl'

export function SpaceTitle({ space }: { space: Space }) {
  const [mode, setMode] = useState<Mode>('view')
  const [error, setError] = useState<string | null>(null)
  const switchTo = (next: Mode) => {
    setError(null)
    setMode(next)
  }
  const rename = useTitleRename(space, () => switchTo('view'), setError)
  const renaming = mode === 'rename'

  return (
    <div className="relative">
      <form onSubmit={rename.submit} className="flex h-12 items-center gap-3">
        {renaming ? (
          <TitleField
            value={rename.name}
            onChange={(e) => rename.setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && switchTo('view')}
            typeClassName={titleType}
          />
        ) : (
          <h1 title={space.name} className={`min-w-0 truncate text-fg ${titleType}`}>
            {space.name}
          </h1>
        )}
        {/* Starting a rename mustn't also submit, once this button has become Save. */}
        <IconButton
          type={renaming ? 'submit' : 'button'}
          variant={renaming ? 'primary' : 'secondary'}
          label={renaming ? 'Zapisz nazwę' : 'Zmień nazwę przestrzeni'}
          className="ml-1"
          disabled={renaming && rename.pending}
          onClick={(e) => {
            if (renaming) return
            e.preventDefault()
            rename.setName(space.name)
            switchTo('rename')
          }}
        >
          <IconSwap id={renaming ? 'save' : 'edit'}>
            {renaming ? <CheckIcon /> : <PenLineIcon />}
          </IconSwap>
        </IconButton>
        <DeleteSpaceConfirm
          space={space}
          open={mode === 'delete'}
          onOpenChange={(open) => switchTo(open && !renaming ? 'delete' : 'view')}
        >
          <IconButton
            variant={renaming ? 'secondary' : 'danger-outline'}
            label={renaming ? 'Anuluj zmianę nazwy' : 'Usuń przestrzeń'}
          >
            <IconSwap id={renaming ? 'cancel' : 'delete'}>
              {renaming ? <XIcon /> : <Trash2Icon />}
            </IconSwap>
          </IconButton>
        </DeleteSpaceConfirm>
      </form>
      <p className="text-sm text-fg-subtle">Utworzona {formatDate(space.created_at)}</p>
      {error && (
        <ErrorNote inline className="mt-2">
          {error}
        </ErrorNote>
      )}
    </div>
  )
}
