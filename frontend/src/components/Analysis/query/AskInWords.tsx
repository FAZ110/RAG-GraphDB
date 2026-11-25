import { useMutation } from '@tanstack/react-query'
import { SparklesIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/deck'
import { useDefaultProvider } from '@/hooks/useDefaultProvider'
import { drawFromText } from '@/services/analyses'
import { fromBody } from './fromBody'
import type { Pattern } from './pattern'

const quoted = (names: string[]) => names.map((n) => `„${n}”`).join(', ')

interface Props {
  spaceId: string
  onDrawn: (pattern: Pattern) => void
}

/** A question typed in words, drawn by a language model in place of the current one. */
export function AskInWords({ spaceId, onDrawn }: Props) {
  const provider = useDefaultProvider()
  const [text, setText] = useState('')
  const draw = useMutation({
    mutationFn: () => drawFromText(spaceId, text.trim(), provider!),
    onSuccess: (answer) => onDrawn(fromBody(answer.pattern, answer.entities)),
  })
  const missing = draw.data?.missing ?? []

  if (!provider)
    return (
      <p className="px-4 py-2.5 text-sm text-fg-muted">
        Aby pytać słowami,{' '}
        <Link to="/settings" className="font-medium text-fg underline underline-offset-2">
          dodaj własny model w ustawieniach
        </Link>
        .
      </p>
    )

  return (
    <div className="border-b border-line">
      <form
        className="flex items-center gap-2 py-2 pr-3 pl-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim().length >= 3 && !draw.isPending) draw.mutate()
        }}
      >
        <SparklesIcon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Zapytaj słowami, a model narysuje pytanie za Ciebie"
          aria-label="Pytanie słowami"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-faint"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={text.trim().length < 3 || draw.isPending}
        >
          {draw.isPending ? 'Rysuję…' : 'Narysuj'}
        </Button>
      </form>
      {(draw.error || missing.length > 0) && (
        <p
          aria-live="polite"
          className={
            draw.error ? 'px-4 pb-2.5 text-sm text-danger' : 'px-4 pb-2.5 text-sm text-fg-muted'
          }
        >
          {draw.error
            ? draw.error.message
            : `Nie ma w tej przestrzeni: ${quoted(missing)}. Dodaj ${missing.length > 1 ? 'je' : 'ją'} przyciskiem „Znana” albo zmień pytanie.`}
        </p>
      )}
    </div>
  )
}
