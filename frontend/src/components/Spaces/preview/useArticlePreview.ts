import { useState } from 'react'

export function useArticlePreview() {
  const [id, setId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  return {
    id,
    open,
    show(articleId: string) {
      setId(articleId)
      setOpen(true)
    },
    onOpenChange: setOpen,
  }
}
