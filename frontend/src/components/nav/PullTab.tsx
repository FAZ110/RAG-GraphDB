import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export function PullTab({ out }: { out: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="absolute top-1/2 left-full ml-2.5 flex h-7 w-3.5 -translate-y-1/2 items-center justify-center border border-l-0 border-fg bg-surface text-fg transition-colors group-hover:bg-fg group-hover:text-fg-inverse"
    >
      {out ? <ChevronLeftIcon className="size-3!" /> : <ChevronRightIcon className="size-3!" />}
    </span>
  )
}
