import type { ReactNode } from 'react'
import {
  FileTextIcon,
  FolderPlusIcon,
  LayersIcon,
  NetworkIcon,
  SettingsIcon,
  FilePlus2Icon,
  WaypointsIcon,
} from 'lucide-react'
import { Swatch } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { normalize } from '@/lib/text'
import type { SearchResults, Space } from '@/types'
import { sourceHost } from '../Spaces/articles/articleSource'
import { typeName } from '../Spaces/spaceText'

export interface SearchItem {
  key: string
  section: string
  label: string
  detail?: string
  icon: ReactNode
  /** A route to open, or an action to run. */
  to: string | (() => void)
  keywords?: string
}

interface Sources {
  needle: string
  spaces: Space[]
  results: SearchResults | undefined
  openAdd: () => void
}

export function searchItems({ needle, spaces, results, openAdd }: Sources): SearchItem[] {
  const commands: SearchItem[] = [
    {
      key: 'add',
      section: 'Polecenia',
      label: 'Dodaj artykuły',
      icon: <FilePlus2Icon />,
      to: openAdd,
    },
    {
      key: 'new-space',
      section: 'Polecenia',
      label: 'Nowa przestrzeń',
      icon: <FolderPlusIcon />,
      to: '/spaces?new',
    },
    {
      key: 'graph',
      section: 'Polecenia',
      label: 'Otwórz graf',
      icon: <NetworkIcon />,
      to: '/graph',
    },
    {
      key: 'query',
      section: 'Polecenia',
      label: 'Szukaj po powiązaniach',
      icon: <WaypointsIcon />,
      to: '/graph?query',
      keywords: 'zapytanie wzorzec relacje cypher',
    },
    {
      key: 'settings',
      section: 'Polecenia',
      label: 'Ustawienia',
      icon: <SettingsIcon />,
      to: '/settings',
    },
  ].filter((c: SearchItem) => normalize(`${c.label} ${c.keywords ?? ''}`).includes(needle))

  if (!needle) return commands

  const found = needle.length >= 2 ? results : undefined
  // A query that names a command most likely asks for it, so matching commands lead.
  return [
    ...commands,
    ...spaces
      .filter((s) => normalize(s.name).includes(needle))
      .slice(0, 5)
      .map((s) => ({
        key: `space-${s.id}`,
        section: 'Przestrzenie',
        label: s.name,
        icon: <LayersIcon />,
        to: `/spaces/${s.id}`,
      })),
    ...(found?.entities ?? []).map((e) => ({
      key: `entity-${e.id}`,
      section: 'Encje',
      label: e.name,
      detail: `${typeName(e.label)}, ${e.space_name}`,
      icon: <Swatch color={inkFor(e.label).color} className="size-3" />,
      to: `/graph/${e.space_id}?focus=${e.id}`,
    })),
    ...(found?.articles ?? []).map((a) => ({
      key: `article-${a.id}`,
      section: 'Artykuły',
      label: a.title || a.url || 'Artykuł bez tytułu',
      detail: `${sourceHost(a.url)}, ${a.space_name}`,
      icon: <FileTextIcon />,
      to: `/spaces/${a.space_id}?article=${a.id}`,
    })),
  ]
}
