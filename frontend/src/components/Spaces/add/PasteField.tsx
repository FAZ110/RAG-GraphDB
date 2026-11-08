import { useState } from 'react'
import type { ClipboardEvent, CSSProperties } from 'react'
import { Button, TextInput } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { cn } from '@/lib/utils'
import { ARTICLE_FORMS, pluralForm } from '../spaceText'
import { parseArticlesJson, textItem } from './parseUpload'
import type { UploadItem } from './parseUpload'

interface Props {
  ink: Ink
  onAdd: (items: UploadItem[]) => void
}

const inked = 'focus-visible:border-(--paste-ink)'

export function PasteField({ ink, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const json = parseArticlesJson(content)

  const fillFromPaste = (e: ClipboardEvent) => {
    const items = parseArticlesJson(e.clipboardData.getData('text'))
    if (items?.length !== 1) return
    e.preventDefault()
    setTitle(items[0].title)
    setUrl(items[0].url)
    setContent(items[0].content)
  }

  const add = () => {
    onAdd(json ?? [textItem(title, url, content)])
    setTitle('')
    setUrl('')
    setContent('')
  }

  return (
    <div
      className="flex flex-1 flex-col gap-3"
      style={{ '--paste-ink': ink.color } as CSSProperties}
    >
      <div className="flex flex-wrap gap-3">
        <TextInput
          className={cn('min-w-48 flex-1', inked)}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPaste={fillFromPaste}
          disabled={json !== null}
          placeholder="Tytuł (opcjonalnie)"
          aria-label="Tytuł"
        />
        <TextInput
          className={cn('min-w-48 flex-1', inked)}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={fillFromPaste}
          disabled={json !== null}
          placeholder="Adres (opcjonalnie)"
          aria-label="Adres"
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={fillFromPaste}
        spellCheck={false}
        placeholder="Wklej treść artykułu albo JSON z artykułami"
        aria-label="Treść"
        className={cn(
          'min-h-40 w-full flex-1 border border-line bg-surface p-3 text-sm text-fg outline-none placeholder:font-sans placeholder:text-fg-faint',
          inked,
          json && 'font-mono'
        )}
      />
      <div className="flex items-center gap-3">
        <Button disabled={!content.trim()} onClick={add}>
          Wczytaj
        </Button>
        {json && (
          <p className="text-sm text-fg-subtle">
            JSON: {json.length} {pluralForm(json.length, ARTICLE_FORMS)}, tytuły i adresy z JSON-a
          </p>
        )}
      </div>
    </div>
  )
}
