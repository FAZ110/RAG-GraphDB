import { InfoIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import { focusRing, surface } from '@/components/deck'
import { cn } from '@/lib/utils'

const optional = <span className="text-fg-faint"> // opcjonalnie</span>

export function FormatHint() {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Format artykułów"
        className={cn('ml-auto self-center p-1 text-fg-subtle hover:text-fg', focusRing)}
      >
        <InfoIcon className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className={cn(surface, 'z-60 animate-in p-4 outline-none fade-in-0 spring-quick')}
        >
          <p className="mb-3 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
            Schemat danych wejściowych
          </p>
          <pre className="font-mono text-xs leading-5 text-fg-soft">
            {'[\n  {\n    "title": "Tytuł artykułu",'}
            {optional}
            {'\n    "url": "https://example.com",'}
            {optional}
            {'\n    "content": "Treść artykułu…"\n  }\n]'}
          </pre>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
