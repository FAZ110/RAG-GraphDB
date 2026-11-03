export interface HomeTotals {
  spaces: number
  articles: number
  entities: number
  analyses: number
  /** Added (articles, entities) or edited (analyses) in the last 7 days. */
  week_articles: number
  week_entities: number
  week_analyses: number
  /** Added since the previous visit. */
  new_articles: number
  new_entities: number
}

export interface RecentSpace {
  id: string
  name: string
  article_count: number
  entity_count: number
  last_used: string
}

export interface RecentArticle {
  id: string
  space_id: string
  space_name: string
  title: string | null
  url: string | null
  status: string
  nodes_count: number | null
  created_at: string
}

export interface FailedArticles {
  space_id: string
  space_name: string
  article_ids: string[]
}

export interface FreshEntity {
  id: string
  name: string
  label: string
}

export interface ActivityDay {
  /** `YYYY-MM-DD` */
  day: string
  articles: number
  analyses: number
  entities: number
}

export interface Home {
  /** The previous visit, null on the first one. */
  since: string | null
  totals: HomeTotals
  recent_spaces: RecentSpace[]
  recent_articles: RecentArticle[]
  failed: FailedArticles[]
  /** Only days with something in them, oldest first. */
  activity: ActivityDay[]
}
