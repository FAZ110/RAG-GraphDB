import { ExternalLinkIcon } from 'lucide-react'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/deck'
import type { ArticleDetail } from '@/types'
import { ArticleMeta } from './ArticleMeta'

export function ArticleHeader({ article }: { article: ArticleDetail }) {
  return (
    <DrawerHeader className="gap-3 border-b border-line-soft p-8 pr-14">
      <DrawerDescription asChild>
        <ArticleMeta article={article} />
      </DrawerDescription>
      <DrawerTitle className="text-display-lg text-balance text-fg">
        {article.title || article.url || 'Artykuł bez tytułu'}
      </DrawerTitle>
      {article.url && (
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-soft underline decoration-line underline-offset-4 hover:text-fg hover:decoration-fg"
        >
          Otwórz źródło
          <ExternalLinkIcon className="size-3.5" />
        </a>
      )}
    </DrawerHeader>
  )
}
