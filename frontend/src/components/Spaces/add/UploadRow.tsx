import { ChevronDownIcon, ExternalLinkIcon, FileJsonIcon, XIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { IconButton, focusRing } from '@/components/deck'
import { reveal } from '@/design/motion'
import { cn } from '@/lib/utils'
import { sourceHost } from '../articles/articleSource'
import type { UploadItem } from './parseUpload'
import { charCount, lengthFacts } from './uploadFacts'

interface Props {
  item: UploadItem
  repeat: boolean
  open: boolean
  onToggle: () => void
  onRemove: () => void
}

/** The text as a page: its opening paragraph first, the rest fading out until asked for. */
function TextSheet({ content }: { content: string }) {
  const [whole, setWhole] = useState(false)
  const [lead, ...rest] = content.split(/\n\s*\n/)
  return (
    <div className="border border-line-soft bg-surface">
      <div
        className={cn(
          'px-4 pt-3 text-sm leading-relaxed whitespace-pre-line',
          whole
            ? 'max-h-80 overflow-y-auto pb-3'
            : 'max-h-36 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]'
        )}
      >
        <p className="text-fg">{lead}</p>
        {rest.map((paragraph, i) => (
          <p key={i} className="mt-2 text-fg-muted">
            {paragraph}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setWhole((w) => !w)}
        className={cn(
          'w-full border-t border-line-soft px-4 py-1.5 text-left text-xs font-semibold text-fg-subtle hover:text-fg',
          focusRing
        )}
      >
        {whole ? 'Zwiń tekst' : 'Pokaż cały tekst'}
      </button>
    </div>
  )
}

/** One loaded article: a line to scan, opening in place onto its details and its text. */
export function UploadRow({ item, repeat, open, onToggle, onRemove }: Props) {
  const title = item.title || item.content.slice(0, 80) || 'Artykuł bez tytułu'

  return (
    <div className={cn('transition-colors', open && 'bg-surface-sunken')}>
      <div className="flex items-start gap-1 pr-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cn('flex min-w-0 flex-1 items-start gap-3 py-2.5 pl-4 text-left', focusRing)}
        >
          <ChevronDownIcon
            className={cn(
              'mt-1 size-4 shrink-0 text-fg-faint transition-transform spring-quick',
              !open && '-rotate-90'
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            {/* Opened, the line itself becomes the heading rather than repeating below. */}
            <span
              className={cn(
                'block font-semibold',
                open ? 'text-base leading-snug [text-wrap:pretty]' : 'truncate',
                item.problem ? 'text-fg-faint line-through' : 'text-fg'
              )}
            >
              {title}
            </span>
            {!open && (
              <span className="block truncate text-sm text-fg-subtle">
                {sourceHost(item.url || null)}
                {!item.problem && ` · ${charCount(item.content)}`}
              </span>
            )}
            {item.problem ? (
              <span className="block text-sm text-danger">{item.problem}</span>
            ) : (
              repeat && (
                <span className="block text-sm text-fg-muted">
                  Już jest w przestrzeni; jeśli treść się nie zmieniła, zostanie pominięty.
                </span>
              )
            )}
          </span>
        </button>
        <IconButton
          variant="remove"
          size="icon-sm"
          label="Usuń z listy"
          onClick={onRemove}
          className="mt-2"
        >
          <XIcon />
        </IconButton>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...reveal} className="overflow-hidden">
            <div className="flex flex-col gap-3 pr-4 pb-4 pl-11">
              {/* The facts side by side, each under its own label, so nothing wraps loose. */}
              <dl className="-mt-1 grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-6 gap-y-0.5">
                <dt className="text-xs text-fg-subtle">Źródło</dt>
                <dt className="text-xs text-fg-subtle">Długość</dt>
                <dt className="text-xs text-fg-subtle">{item.from ? 'Plik' : ''}</dt>
                <dd className="text-sm">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        'inline-flex items-center gap-1 font-medium text-fg hover:underline',
                        focusRing
                      )}
                    >
                      {sourceHost(item.url)}
                      <ExternalLinkIcon className="size-3.5 text-fg-subtle" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="font-medium text-fg">wklejony tekst</span>
                  )}
                </dd>
                <dd className="text-sm whitespace-nowrap text-fg-muted">
                  {item.content ? lengthFacts(item.content) : '—'}
                </dd>
                <dd className="flex min-w-0 items-center gap-1 text-sm text-fg-muted">
                  {item.from && (
                    <>
                      <FileJsonIcon className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate" title={item.from}>
                        {item.from}
                      </span>
                    </>
                  )}
                </dd>
              </dl>
              {item.content && <TextSheet content={item.content} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
