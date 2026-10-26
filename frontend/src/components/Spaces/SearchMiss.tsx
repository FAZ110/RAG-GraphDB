import type { CSSProperties, ReactNode } from 'react'
import { SearchXIcon } from 'lucide-react'
import type { Ink } from '@/design/inks'

export function SearchMiss({ ink, children }: { ink: Ink; children: ReactNode }) {
  return (
    <div aria-hidden="true" className="relative shrink-0">
      {children}
      <div
        className="deck absolute -right-4 -bottom-3 flex size-11 items-center justify-center border bg-surface"
        style={{ borderColor: ink.color, '--deck-shadow': ink.color } as CSSProperties}
      >
        <SearchXIcon className="size-5" style={{ color: ink.color }} />
      </div>
    </div>
  )
}
