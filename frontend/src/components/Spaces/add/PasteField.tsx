import { useState } from 'react'
import { Button } from '@/components/deck'
import { parsePasted } from './parseUpload'
import type { UploadItem } from './parseUpload'

interface Props {
  onAdd: (items: UploadItem[]) => void
  onError: (error: string | null) => void
}

export function PasteField({ onAdd, onError }: Props) {
  const [pasted, setPasted] = useState('')

  return (
    <div className="flex flex-1 flex-col gap-3">
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        spellCheck={false}
        placeholder={'[\n  { "title": "Tytuł", "url": "https://…", "content": "Treść…" }\n]'}
        className="min-h-40 w-full flex-1 border border-line bg-surface p-3 font-mono text-sm text-fg outline-none placeholder:text-fg-faint focus-visible:border-fg"
      />
      <Button
        className="self-start"
        disabled={!pasted.trim()}
        onClick={() => {
          try {
            onAdd(parsePasted(pasted))
            setPasted('')
            onError(null)
          } catch {
            onError('To nie jest poprawny JSON')
          }
        }}
      >
        Wczytaj
      </Button>
    </div>
  )
}
