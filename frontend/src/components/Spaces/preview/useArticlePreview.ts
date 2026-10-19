import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// An article named in the address (`?article=`, e.g. picked in the global search) opens on
// arrival and leaves the address once it's closed or another one is opened.
export function useArticlePreview() {
  const [params, setParams] = useSearchParams()
  const linked = params.get('article')
  const [id, setId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const dropLinked = () => {
    if (!linked) return
    params.delete('article')
    setParams(params, { replace: true })
  }

  return {
    id: linked ?? id,
    open: linked !== null || open,
    show(articleId: string) {
      dropLinked()
      setId(articleId)
      setOpen(true)
    },
    onOpenChange(next: boolean) {
      setOpen(next)
      if (!next) dropLinked()
    },
  }
}
