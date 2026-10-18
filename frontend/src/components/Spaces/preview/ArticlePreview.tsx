import { ExternalLinkIcon } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  ErrorNote,
} from '@/components/deck'
import { useArticle } from '@/hooks/useSpaces'
import { ArticleMeta } from './ArticleMeta'
import { ArticleEntities } from './ArticleEntities'
import { ArticleText } from './ArticleText'

interface Props {
  spaceId: string
  articleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticlePreview({ spaceId, articleId, open, onOpenChange }: Props) {
  const article = useArticle(spaceId, articleId)
  const data = article.data

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-2xl">
        {!data ? (
          <DrawerHeader className="p-8">
            <DrawerTitle className="sr-only">Artykuł</DrawerTitle>
            <DrawerDescription className="text-fg-subtle">
              {article.error ? article.error.message : 'Wczytuję artykuł…'}
            </DrawerDescription>
          </DrawerHeader>
        ) : (
          <>
            <DrawerHeader className="gap-3 border-b border-line-soft p-8 pr-14">
              <DrawerDescription asChild>
                <ArticleMeta article={data} />
              </DrawerDescription>
              <DrawerTitle className="text-display-lg text-balance text-fg">
                {data.title || data.url || 'Artykuł bez tytułu'}
              </DrawerTitle>
              {data.url && (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-soft underline decoration-line underline-offset-4 hover:text-fg hover:decoration-fg"
                >
                  Otwórz źródło
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              )}
            </DrawerHeader>

            <div className="space-y-3 border-b border-line-soft bg-surface-sunken px-8 py-5">
              <h3 className="text-sm font-semibold text-fg-muted">Encje w grafie</h3>
              <ArticleEntities entities={data.entities} />
            </div>

            {data.status === 'error' && data.error && (
              <ErrorNote className="mx-8 mt-6">{data.error}</ErrorNote>
            )}

            <article className="px-8 py-8">
              <ArticleText content={data.content} entities={data.entities} />
            </article>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
