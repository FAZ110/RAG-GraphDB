import type { ArticleRequest } from '@/types'

export interface UploadItem {
  key: string
  title: string
  url: string
  content: string
  /** File name, or null for pasted text. */
  from: string | null
  /** Why it can't be sent; it then stays listed but is left out. */
  problem: string | null
}

let counter = 0

function toItems(parsed: unknown, from: string | null): UploadItem[] {
  const list = Array.isArray(parsed) ? parsed : [parsed]
  return list.map((raw) => {
    const a = (raw ?? {}) as Partial<ArticleRequest>
    const content = typeof a.content === 'string' ? a.content.trim() : ''
    return {
      key: `u${counter++}`,
      title: typeof a.title === 'string' ? a.title.trim() : '',
      url: typeof a.url === 'string' ? a.url.trim() : '',
      content,
      from,
      problem: content ? null : 'Brak treści artykułu (pole content)',
    }
  })
}

export function parsePasted(text: string): UploadItem[] {
  return toItems(JSON.parse(text), null)
}

export async function parseFile(file: File): Promise<UploadItem[]> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error(`${file.name}: obsługiwane są tylko pliki .json`)
  }
  try {
    return toItems(JSON.parse(await file.text()), file.name)
  } catch {
    throw new Error(`${file.name}: to nie jest poprawny JSON`)
  }
}

export function toRequest(item: UploadItem): ArticleRequest {
  return { title: item.title, url: item.url, content: item.content }
}

/** Articles from several files; a file that can't be read is reported instead of failing all. */
export async function readFiles(files: Iterable<File>) {
  const items: UploadItem[] = []
  const errors: string[] = []
  for (const file of files) {
    try {
      items.push(...(await parseFile(file)))
    } catch (e) {
      errors.push((e as Error).message)
    }
  }
  return { items, errors }
}
