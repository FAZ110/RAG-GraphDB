import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ErrorNote } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { EASE_DECK } from '@/design/motion'
import { FileDropZone } from './FileDropZone'
import { FormatHint } from './FormatHint'
import { PasteField } from './PasteField'
import { readFiles } from './parseUpload'
import type { UploadItem } from './parseUpload'
import { SourceTab } from './SourceTab'

interface Props {
  ink: Ink
  onAdd: (items: UploadItem[]) => void
}

type Mode = 'files' | 'paste'

export function SourcePanel({ ink, onAdd }: Props) {
  const [mode, setMode] = useState<Mode>('files')
  const [errors, setErrors] = useState<string[]>([])
  const reducedMotion = useReducedMotion()
  // Files sit left of pasting, so each slides in from its own side.
  const side = (m: Mode) => (reducedMotion ? 0 : m === 'files' ? -16 : 16)

  const addFiles = async (files: FileList) => {
    const { items, errors } = await readFiles(files)
    setErrors(errors)
    onAdd(items)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div role="tablist" className="flex gap-5 border-b border-line-soft">
        <SourceTab active={mode === 'files'} ink={ink} onSelect={() => setMode('files')}>
          Pliki
        </SourceTab>
        <SourceTab active={mode === 'paste'} ink={ink} onSelect={() => setMode('paste')}>
          Wklej JSON
        </SourceTab>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, x: side(mode) }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: side(mode) }}
          transition={{ duration: 0.2, ease: EASE_DECK }}
        >
          {mode === 'files' ? (
            <FileDropZone ink={ink} onFiles={(files) => void addFiles(files)} />
          ) : (
            <PasteField onAdd={onAdd} onError={(error) => setErrors(error ? [error] : [])} />
          )}
        </motion.div>
      </AnimatePresence>

      {errors.map((error) => (
        <ErrorNote key={error}>{error}</ErrorNote>
      ))}

      <FormatHint />
    </div>
  )
}
