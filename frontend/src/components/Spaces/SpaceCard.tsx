import { useState } from 'react'
import type { FormEvent } from 'react'
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useDeleteSpace, useRenameSpace } from '@/hooks/useSpaces'
import type { Space } from '@/types'
import { MapSheet } from './MapSheet'
import { inkFor } from './spaceVisuals'

export const SPACE_NAME_MAX_LENGTH = 100

const plural = new Intl.PluralRules('pl-PL')
const dateFormat = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' })

function countLabel(count: number, forms: Record<'one' | 'few' | 'many', string>): string {
  const form = plural.select(count)
  return `${count} ${form === 'one' || form === 'few' ? forms[form] : forms.many}`
}

interface Props {
  space: Space
  /** The sheet picked up off the pile, with its details; the others lie on the table. */
  active: boolean
  /** Briefly true after the space was picked in the search. */
  highlighted: boolean
}

export function SpaceCard({ space, active, highlighted }: Props) {
  const ink = inkFor(space.id)
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(space.name)
  const rename = useRenameSpace()
  const remove = useDeleteSpace()

  const startRename = () => {
    setName(space.name)
    rename.reset()
    setRenaming(true)
  }

  const handleRename = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (trimmed === space.name) {
      setRenaming(false)
      return
    }
    rename.mutate({ id: space.id, name: trimmed }, { onSuccess: () => setRenaming(false) })
  }

  return (
    <article>
      <MapSheet spaceId={space.id} ink={ink} lifted={active}>
        {/* The name is the sheet's title, set in its lower left like a map's cartouche;
            a halo of the paper colour keeps it clear of the faded print behind. */}
        {/* Sheets on the pile show only their map; the title appears once one is lifted. */}
        <div
          className={`flex h-full flex-col justify-end gap-2 p-[6%] transition-opacity duration-500 ${
            active ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ textShadow: `0 0 12px ${ink.field}, 0 0 4px ${ink.field}` }}
        >
          {renaming ? (
            <form onSubmit={handleRename} className="space-y-2">
              <Input
                autoFocus
                aria-label="Nowa nazwa przestrzeni"
                value={name}
                maxLength={SPACE_NAME_MAX_LENGTH}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
                className="h-12 rounded-none bg-white text-2xl font-bold"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={rename.isPending || !name.trim()}
                  style={{ backgroundColor: ink.color }}
                  className="rounded-none text-white hover:opacity-90"
                >
                  {rename.isPending ? 'Zapisuję...' : 'Zapisz nazwę'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-none"
                  onClick={() => setRenaming(false)}
                >
                  Anuluj
                </Button>
              </div>
            </form>
          ) : (
            <h2
              className="line-clamp-2 text-[clamp(1.5rem,3.4vw,2.375rem)] leading-tight font-bold tracking-[-0.015em] break-words text-balance transition-colors duration-300"
              style={{ color: highlighted ? ink.color : '#0f172a' }}
            >
              {space.name}
            </h2>
          )}

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-base font-semibold tabular-nums" style={{ color: ink.color }}>
                {countLabel(space.article_count, {
                  one: 'artykuł',
                  few: 'artykuły',
                  many: 'artykułów',
                })}
                , {countLabel(space.entity_count, { one: 'encja', few: 'encje', many: 'encji' })}
              </p>
              <p className="text-sm text-slate-500">
                Utworzona {dateFormat.format(new Date(space.created_at))}
              </p>
            </div>
            {active && !renaming && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Opcje przestrzeni ${space.name}`}
                    className="-mr-2 -mb-1 rounded-none text-slate-500 hover:bg-white/60"
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={startRename}>
                    <PencilIcon />
                    Zmień nazwę
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                    <Trash2Icon />
                    Usuń przestrzeń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {rename.error && <p className="text-sm text-red-700">{rename.error.message}</p>}
        </div>
      </MapSheet>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open)
          if (!open) remove.reset()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć przestrzeń „{space.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Razem z nią znikną wszystkie jej artykuły i graf. Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error && <p className="text-sm text-red-700">{remove.error.message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(space.id, { onSuccess: () => setConfirmDelete(false) })}
            >
              {remove.isPending ? 'Usuwam...' : 'Usuń przestrzeń'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
