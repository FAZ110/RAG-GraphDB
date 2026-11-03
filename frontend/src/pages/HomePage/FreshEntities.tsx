import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Swatch, focusRing, surface } from '@/components/deck'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { fetchFreshEntities } from '@/services/home'
import type { Space } from '@/types'
import type { FreshEntity } from '@/types/home'
import { SectionLabel } from './SectionLabel'

function Chips({
  spaceId,
  entities,
  copy = false,
}: {
  spaceId: string
  entities: FreshEntity[]
  copy?: boolean
}) {
  return (
    <ul
      className={cn('flex shrink-0 gap-2.5 pr-2.5', copy && 'motion-reduce:hidden')}
      aria-hidden={copy || undefined}
    >
      {entities.map((e) => (
        <li key={e.id}>
          <Link
            to={`/graph/${spaceId}?focus=${encodeURIComponent(e.id)}`}
            tabIndex={copy ? -1 : undefined}
            title={typeName(e.label)}
            className={cn(
              'flex items-center gap-2 border border-line bg-surface px-2.5 py-1 text-sm whitespace-nowrap text-fg-soft transition-colors hover:border-fg hover:text-fg',
              focusRing
            )}
          >
            <Swatch color={inkFor(e.label).color} />
            {e.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function FreshEntities({ space }: { space: Pick<Space, 'id' | 'name'> }) {
  const entities =
    useQuery({
      queryKey: [...SPACES_QUERY_KEY, space.id, 'fresh'],
      queryFn: () => fetchFreshEntities(space.id),
    }).data ?? []
  if (entities.length === 0) return null
  return (
    <section className={cn(surface, 'flex flex-col gap-3 overflow-hidden p-4')}>
      <SectionLabel
        action={<span className="text-xs text-fg-subtle">Kliknij, by otworzyć w grafie</span>}
      >
        Świeżo wydobyte encje · {space.name}
      </SectionLabel>
      <div className="-mx-4 overflow-x-auto px-4 motion-safe:overflow-x-hidden">
        <div className="marquee flex w-max">
          <Chips spaceId={space.id} entities={entities} />
          <Chips spaceId={space.id} entities={entities} copy />
        </div>
      </div>
    </section>
  )
}
