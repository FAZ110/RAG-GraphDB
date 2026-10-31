import { Toaster as Sonner } from 'sonner'
import { surface } from './styles'
import { cn } from '@/lib/utils'

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            surface,
            'flex w-full items-center gap-3 px-4 py-3 text-sm text-fg [&_svg]:size-4'
          ),
          title: 'font-medium',
          description: 'text-fg-subtle',
          error: 'border-l-4 border-l-danger [--deck-shadow:var(--danger)] [&_svg]:text-danger',
        },
      }}
    />
  )
}
