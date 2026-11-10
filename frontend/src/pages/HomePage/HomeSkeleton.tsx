import { surface } from '@/components/deck'
import { cn } from '@/lib/utils'

function Block({ className }: { className: string }) {
  return <div className={cn('bg-line-soft motion-safe:animate-pulse', className)} />
}

export function HomeSkeleton() {
  return (
    <div className={cn(surface, 'border-t-4 border-t-line-soft')} aria-busy="true">
      <div className="flex flex-col gap-3 border-b border-line-soft px-4 py-3">
        <Block className="h-5 w-96 max-w-full" />
        <Block className="h-6 w-40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 p-4">
            <Block className="h-3 w-24" />
            <Block className="h-10 w-36" />
            <Block className="h-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
