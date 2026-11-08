import { ListIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useState } from 'react'
import { Button, focusRing, surface } from '@/components/deck'
import { cn } from '@/lib/utils'
import { STEP } from './timeline'

const PARTS = [
  { label: 'O Atlasie', step: STEP.hero },
  { label: 'Rozproszona wiedza', step: STEP.wall },
  { label: 'Od tekstu do grafu', step: STEP.read },
  { label: 'Nieoczywiste powiązania', step: STEP.path },
  { label: 'Analizy na płótnie', step: STEP.canvas },
  { label: 'Możliwości', step: STEP.more },
  { label: 'Pierwsze kroki', step: STEP.manual },
  { label: 'Zacznij korzystać', step: STEP.final },
]

const partOf = (step: number) => PARTS.findLast((part) => part.step <= step) ?? PARTS[0]

interface Props {
  step: number
  goTo: (step: number) => void
}

export function Wayfinder({ step, goTo }: Props) {
  const [open, setOpen] = useState(false)
  const current = partOf(step)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="sm:w-56 sm:justify-start"
          aria-label={`Spis treści, teraz: ${current.label}`}
        >
          <ListIcon />
          <span className="hidden sm:inline">{current.label}</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className={cn(surface, 'z-60 w-60 animate-in p-1 outline-none fade-in-0 spring-quick')}
        >
          <nav aria-label="Rozdziały">
            <ul className="flex flex-col">
              {PARTS.map((part) => (
                <li key={part.step}>
                  <button
                    type="button"
                    aria-current={part === current ? 'location' : undefined}
                    onClick={() => {
                      goTo(part.step)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm font-semibold transition-colors',
                      part === current
                        ? 'bg-fg text-fg-inverse'
                        : 'text-fg-soft hover:bg-surface-sunken hover:text-fg',
                      focusRing
                    )}
                  >
                    {part.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
