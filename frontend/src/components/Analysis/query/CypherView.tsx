import { CheckIcon, CopyIcon, XIcon } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { IconButton } from '@/components/deck'
import type { QueryResult } from '@/types/query'
import type { Token, TokenKind } from './cypher'
import { tokenize } from './cypher'

// Colours for code on the dark strip, readable against it in either theme.
const COLORS: Record<TokenKind, string> = {
  keyword: '#7dd3fc',
  function: '#c4b5fd',
  label: '#fcd34d',
  param: '#f9a8d4',
  string: '#86efac',
  number: '#fdba74',
  comment: '#94a3b8',
  plain: '#e2e8f0',
}

/** Tokens cut at line ends, so each line can carry its number while wrapping. */
function byLine(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]]
  for (const t of tokens) {
    t.text.split('\n').forEach((piece, i) => {
      if (i > 0) lines.push([])
      if (piece) lines.at(-1)!.push({ kind: t.kind, text: piece })
    })
  }
  return lines
}

function Code({ text }: { text: string }) {
  return (
    <ol className="font-mono text-xs leading-5">
      {byLine(tokenize(text)).map((line, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="w-4 shrink-0 text-right text-[#64748b] select-none">
            {i + 1}
          </span>
          <code className="min-w-0 flex-1 break-words whitespace-pre-wrap">
            {line.map((t, j) => (
              <span key={j} style={{ color: COLORS[t.kind] }}>
                {t.text}
              </span>
            ))}
          </code>
        </li>
      ))}
    </ol>
  )
}

interface Props {
  result: QueryResult | undefined
  onClose: () => void
}

/** The question as the database runs it, for those who read Cypher, under its drawing. */
export function CypherView({ result, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.cypher)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  // Escape puts the code away before the modal sees it.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    onClose()
  })
  useEffect(() => {
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])
  const params = Object.entries(result?.params ?? {})

  return (
    <section
      aria-label="Zapytanie w języku Cypher"
      className="flex min-h-0 flex-col border-t border-line bg-surface-inverse"
    >
      <header className="flex items-center gap-1 border-b border-white/10 py-1.5 pr-2 pl-5">
        <p className="min-w-0 flex-1 text-xs font-medium text-fg-inverse-muted">Cypher</p>
        <IconButton
          variant="ghost"
          className="text-fg-inverse-muted hover:text-fg-inverse"
          size="icon-sm"
          label={copied ? 'Skopiowano' : 'Kopiuj zapytanie'}
          onClick={copy}
          disabled={!result}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </IconButton>
        <IconButton
          variant="ghost"
          className="text-fg-inverse-muted hover:text-fg-inverse"
          size="icon-sm"
          label="Zamknij Cypher"
          onClick={onClose}
        >
          <XIcon />
        </IconButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {result ? (
          <>
            <Code text={result.cypher} />
            {params.length > 0 && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-white/10 pt-3 font-mono text-xs leading-5">
                {params.map(([name, value]) => (
                  <div key={name} className="contents">
                    <dt style={{ color: COLORS.param }}>${name}</dt>
                    <dd className="min-w-0 break-all" style={{ color: COLORS.plain }}>
                      {JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        ) : (
          <p className="text-xs text-fg-inverse-muted">
            Zapytanie pojawi się, gdy pytanie będzie kompletne.
          </p>
        )}
      </div>
    </section>
  )
}
