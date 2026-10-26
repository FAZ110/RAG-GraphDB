import { useState } from 'react'
import type { ReactNode } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { AddArticlesContext } from './addArticlesContext'
import type { AddRequest } from './addArticlesContext'
import { AddArticlesModal } from './AddArticlesModal'
import { LiveBatches } from '../batches/LiveBatches'
import { DropOverlay } from './DropOverlay'
import { readFiles } from './parseUpload'
import type { UploadItem } from './parseUpload'
import { useWindowFileDrop } from './useWindowFileDrop'

export function AddArticlesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [request, setRequest] = useState<AddRequest | null>(null)
  const [opened, setOpened] = useState(0)
  const [items, setItems] = useState<UploadItem[]>([])
  const isOpen = request !== null

  const spaceInView =
    matchPath('/spaces/:spaceId', pathname)?.params.spaceId ??
    matchPath('/graph/:spaceId', pathname)?.params.spaceId

  const open = (next: AddRequest = {}) => {
    setRequest({ spaceId: next.spaceId ?? spaceInView })
    setOpened((n) => n + 1)
  }
  const close = () => {
    setRequest(null)
    setItems([])
  }

  const dragging = useWindowFileDrop(async (files) => {
    const { items } = await readFiles(files)
    setItems((prev) => [...prev, ...items])
    if (!isOpen) open()
  })

  return (
    <AddArticlesContext.Provider value={open}>
      {children}
      <AddArticlesModal
        // A fresh dialog each time, so a space picked last time doesn't stick.
        key={opened}
        open={isOpen}
        onOpenChange={(next) => !next && close()}
        initialSpaceId={request?.spaceId}
        items={items}
        onItemsChange={setItems}
        onAdded={(spaceId) => {
          close()
          navigate(`/spaces/${spaceId}?tab=recent`)
        }}
      />
      <DropOverlay show={dragging && !isOpen} />
      <LiveBatches />
    </AddArticlesContext.Provider>
  )
}
