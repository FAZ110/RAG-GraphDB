import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/deck'
import { useArticle } from '@/hooks/useSpaces'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { ArticleBody } from './ArticleBody'
import { ARTICLE_COLUMN } from './articleLayout'

interface Props {
  spaceId: string
  articleId: string | null
  focusId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticlePreview({ spaceId, articleId, focusId = null, open, onOpenChange }: Props) {
  const article = useArticle(spaceId, articleId)
  const data = article.data
  // Tied to the article, so the next one opens folded again.
  const [revealedFor, setRevealedFor] = useState<string | null>(null)
  const revealed = data !== undefined && revealedFor === data.id
  const wide = useMediaQuery('(min-width: 64rem)')

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          'gap-0 p-0 data-[side=right]:sm:max-w-2xl',
          // As wide as its columns, so it grows to the left as the outline slides out.
          wide
            ? 'flex-row overflow-hidden data-[side=right]:w-auto data-[side=right]:sm:max-w-none'
            : 'overflow-y-auto'
        )}
      >
        {!data ? (
          <DrawerHeader className={cn('p-8', wide && ARTICLE_COLUMN)}>
            <DrawerTitle className="sr-only">Artykuł</DrawerTitle>
            <DrawerDescription className="text-fg-subtle">
              {article.error ? article.error.message : 'Wczytuję artykuł…'}
            </DrawerDescription>
          </DrawerHeader>
        ) : (
          <ArticleBody
            article={data}
            focusId={focusId}
            wide={wide}
            revealed={revealed}
            onRevealedChange={(open) => setRevealedFor(open ? data.id : null)}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}
