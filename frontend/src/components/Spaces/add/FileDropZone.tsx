import { useRef, useState } from 'react'
import { Button } from '@/components/deck'
import { inkTint } from '@/design/inks'
import type { Ink } from '@/design/inks'
import { ArticleStack } from './ArticleStack'

interface Props {
  ink: Ink
  onFiles: (files: FileList) => void
}

export function FileDropZone({ ink, onFiles }: Props) {
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      // Moving onto the zone's own children also fires a leave; only a real exit counts.
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
        onFiles(e.dataTransfer.files)
      }}
      className="flex min-h-40 flex-1 flex-col items-center justify-center gap-6 border-2 border-dashed px-6 py-10 text-center transition-colors [container-type:size]"
      style={{
        borderColor: dragging ? ink.color : inkTint(ink, 30),
        backgroundColor: dragging ? ink.field : undefined,
      }}
    >
      {/* Squeezed, e.g. by the format example, the zone keeps only its words and button. */}
      <ArticleStack
        ink={ink}
        open={dragging}
        className="hidden [@container(min-height:15.25rem)]:block"
      />
      <div>
        <p className="font-semibold text-fg">
          {dragging ? 'Puść, żeby wczytać' : 'Upuść pliki z artykułami'}
        </p>
        <p className="mt-1 text-sm text-fg-subtle">albo wybierz je z dysku</p>
      </div>
      <Button onClick={() => input.current?.click()}>Wybierz pliki</Button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
