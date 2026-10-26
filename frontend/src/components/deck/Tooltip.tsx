import type { ReactNode } from 'react'
import { Tooltip as Primitive } from 'radix-ui'

interface Props {
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** One focusable element; wrap a disabled control, which gets no pointer events itself. */
  children: ReactNode
}

export function Tooltip({ content, side = 'top', children }: Props) {
  return (
    <Primitive.Provider delayDuration={200}>
      <Primitive.Root>
        <Primitive.Trigger asChild>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content
            side={side}
            sideOffset={8}
            collisionPadding={12}
            className="z-60 max-w-64 animate-in border border-fg bg-fg px-2.5 py-1.5 text-xs text-fg-inverse fade-in-0 spring-quick"
          >
            {content}
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  )
}
