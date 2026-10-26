import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ErrorNote } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { leave, move } from '@/design/motion'
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
  // Files sit left of pasting, so each slides in from its own side.
  const side = (m: Mode) => (m === 'files' ? -16 : 16)

  const addFiles = async (files: FileList) => {
    const { items, errors } = await readFiles(files)
    setErrors(errors)
    onAdd(items)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex border-b border-line-soft">
        <div role="tablist" className="flex gap-5">
          <SourceTab active={mode === 'files'} ink={ink} onSelect={() => setMode('files')}>
            Pliki
          </SourceTab>
          <SourceTab active={mode === 'paste'} ink={ink} onSelect={() => setMode('paste')}>
            Wklej
          </SourceTab>
        </div>
        <FormatHint />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={mode}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, x: side(mode) }}
          animate={{ opacity: 1, x: 0, transition: move.base }}
          exit={{ opacity: 0, x: side(mode), transition: leave.base }}
        >
          {mode === 'files' ? (
            <FileDropZone ink={ink} onFiles={(files) => void addFiles(files)} />
          ) : (
            <PasteField ink={ink} onAdd={onAdd} />
          )}
        </motion.div>
      </AnimatePresence>

      {errors.map((error) => (
        <ErrorNote key={error}>{error}</ErrorNote>
      ))}
    </div>
  )
}
