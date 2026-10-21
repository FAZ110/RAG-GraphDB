import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ErrorNote } from '@/components/deck'
import { EASE_DECK, unfold } from '@/design/motion'
import { cn } from '@/lib/utils'
import type { ArticleDetail, Span } from '@/types'
import { ArticleGraphOutline } from './ArticleGraphOutline'
import { ArticleGraphToggle } from './ArticleGraphToggle'
import { ArticleHeader } from './ArticleHeader'
import { ArticleText } from './ArticleText'
import { ARTICLE_COLUMN, useOutlineWidth } from './articleLayout'
import { entityMatcher, namesInText } from './entityMatch'

interface Props {
  article: ArticleDetail
  focusId: string | null
  wide: boolean
  revealed: boolean
  onRevealedChange: (revealed: boolean) => void
}

const NONE: ReadonlySet<string> = new Set()

const markSelector = (name: string) => `mark[data-entity="${CSS.escape(name)}"]`

function evidenceFor(
  article: ArticleDetail,
  hovered: ReadonlySet<string>,
  hoveredRelationship: string | null,
  focusId: string | null
): Span[] {
  const relationshipId = hoveredRelationship ?? (hovered.size === 0 ? focusId : null)
  let spans = article.relationships.find((r) => r.id === relationshipId)?.spans ?? []
  if (spans.length === 0) {
    spans = article.entities
      .filter((e) => (hovered.size > 0 ? hovered.has(e.name) : e.id === focusId))
      .flatMap((e) => e.spans)
  }
  const unique = new Map(spans.map((s) => [s.join(':'), s]))
  return [...unique.values()].sort((x, y) => x[0] - y[0])
}

export function ArticleBody({ article, focusId, wide, revealed, onRevealedChange }: Props) {
  const [hovered, setHovered] = useState<ReadonlySet<string>>(NONE)
  const [hoveredRelationship, setHoveredRelationship] = useState<string | null>(null)
  const outlineWidth = useOutlineWidth()
  const textRef = useRef<HTMLElement>(null)
  const outlineRef = useRef<HTMLDivElement>(null)

  const matcher = useMemo(() => entityMatcher(article.entities), [article.entities])
  const inText = useMemo(() => {
    const names = namesInText(article.content, matcher)
    for (const e of article.entities) if (e.spans.length > 0) names.add(e.name)
    return names
  }, [article.content, article.entities, matcher])

  const evidence = useMemo(
    () => evidenceFor(article, hovered, hoveredRelationship, focusId),
    [article, hovered, hoveredRelationship, focusId]
  )

  const scrollTo = (mark: Element | null | undefined) =>
    mark?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  const firstEvidence = () => textRef.current?.querySelector('mark[data-evidence]')

  useEffect(() => {
    if (focusId) firstEvidence()?.scrollIntoView({ block: 'center' })
  }, [article.id, focusId])

  // A relationship is shown at its backing sentence; for articles extracted before sentences
  // were recorded, where the text names both its ends, failing that, where it names the source.
  const showRelationship = (source: string, target: string) => {
    const backed = firstEvidence()
    if (backed) return scrollTo(backed)
    const paragraphs = [...(textRef.current?.querySelectorAll('p') ?? [])]
    const both = paragraphs.find(
      (p) => p.querySelector(markSelector(source)) && p.querySelector(markSelector(target))
    )
    scrollTo(
      both?.querySelector(markSelector(source)) ??
        textRef.current?.querySelector(markSelector(source)) ??
        textRef.current?.querySelector(markSelector(target))
    )
  }

  const outline = (
    <div
      ref={outlineRef}
      onMouseLeave={() => {
        setHovered(NONE)
        setHoveredRelationship(null)
      }}
    >
      <ArticleGraphOutline
        entities={article.entities}
        relationships={article.relationships}
        inText={inText}
        highlighted={hovered}
        onHover={(names, relationshipId) => {
          setHovered(new Set(names))
          setHoveredRelationship(relationshipId ?? null)
        }}
        onSelect={(name) =>
          scrollTo(firstEvidence() ?? textRef.current?.querySelector(markSelector(name)))
        }
        onSelectRelationship={showRelationship}
      />
    </div>
  )

  const text = (
    <article ref={textRef} className="px-8 py-8">
      <ArticleText
        content={article.content}
        matcher={revealed ? matcher : null}
        highlighted={hovered}
        evidence={evidence}
        onHover={(name) => {
          setHovered(name ? new Set([name]) : NONE)
          setHoveredRelationship(null)
          // Beside the text the outline can follow; above it, scrolling would lose the text.
          if (name && wide) {
            outlineRef.current
              ?.querySelector(`[data-entity="${CSS.escape(name)}"]`)
              ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
        }}
      />
    </article>
  )

  const toggle = (
    <ArticleGraphToggle
      entities={article.entities}
      relationships={article.relationships}
      open={revealed}
      onOpenChange={onRevealedChange}
      side={wide ? 'left' : 'below'}
    />
  )

  const error = article.status === 'error' && article.error && (
    <ErrorNote className="mx-8 mt-6">{article.error}</ErrorNote>
  )

  if (!wide) {
    return (
      <>
        <ArticleHeader article={article} />
        {toggle}
        {/* shrink-0: the drawer is a fixed-height flex column that would squash it to nothing. */}
        <AnimatePresence initial={false}>
          {revealed && (
            <motion.div
              {...unfold}
              className="shrink-0 overflow-hidden border-b border-line-soft bg-surface-sunken"
            >
              <div className="max-h-[45dvh] overflow-y-auto px-8 py-6">{outline}</div>
            </motion.div>
          )}
        </AnimatePresence>
        {error}
        {text}
      </>
    )
  }

  return (
    <>
      <AnimatePresence initial={false}>
        {revealed && (
          <motion.aside
            aria-label="Encje i powiązania"
            initial={{ width: 0 }}
            animate={{ width: outlineWidth }}
            exit={{ width: 0 }}
            transition={{ duration: 0.3, ease: EASE_DECK }}
            className="h-full shrink-0 overflow-hidden border-r border-line-soft bg-surface-sunken"
          >
            <div className="h-full overflow-y-auto p-6" style={{ width: outlineWidth }}>
              {outline}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className={cn(ARTICLE_COLUMN, 'h-full overflow-y-auto')}>
        <ArticleHeader article={article} />
        {toggle}
        {error}
        {text}
      </div>
    </>
  )
}
