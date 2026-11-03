import { cn } from '@/lib/utils'

function Block({ className }: { className: string }) {
  return <div className={cn('bg-line-soft motion-safe:animate-pulse', className)} />
}

/** The hub's layout in grey while its data loads, so the page doesn't pop in all at once. */
export function HomeSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 py-4" aria-busy="true">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Block className="h-3 w-48" />
            <Block className="h-10 w-64" />
            <Block className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Block key={i} className="h-24" />
            ))}
          </div>
        </div>
        <Block className="min-h-80" />
      </div>
      <Block className="h-24" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Block className="h-40" />
        <Block className="h-40" />
      </div>
    </div>
  )
}
