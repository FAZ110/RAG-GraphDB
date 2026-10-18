import type { Ink } from '@/design/inks'
import { inkTint } from '@/design/inks'
import { cn } from '@/lib/utils'
import { ConstellationField } from './ConstellationField'

interface Props {
  spaceId: string
  ink: Ink
  sketch?: boolean
  className?: string
}

export function SpaceThumbnail({ spaceId, ink, sketch = false, className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn('w-16 shrink-0 overflow-hidden border', className)}
      style={{ borderColor: inkTint(ink, 30) }}
    >
      <ConstellationField spaceId={spaceId} ink={ink} sketch={sketch} map />
    </div>
  )
}
