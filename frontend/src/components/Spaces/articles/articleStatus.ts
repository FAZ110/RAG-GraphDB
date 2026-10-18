export const ARTICLE_STATUS = {
  ok: { label: 'Gotowy', many: 'gotowe', color: 'var(--status-ok)' },
  processing: { label: 'W trakcie', many: 'w trakcie', color: 'var(--status-processing)' },
  pending: { label: 'W kolejce', many: 'w kolejce', color: 'var(--status-pending)' },
  error: { label: 'Błąd', many: 'z błędem', color: 'var(--status-error)' },
} as const

export type ArticleStatus = keyof typeof ARTICLE_STATUS

export const STATUS_ORDER: ArticleStatus[] = ['ok', 'processing', 'pending', 'error']
