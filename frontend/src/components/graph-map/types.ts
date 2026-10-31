export type ColorBy = 'type' | 'community'

export type PickKind = 'merge' | 'link'

export interface MapNodeAttributes {
  label: string
  kind: string
  degree: number
  community: number
  x: number
  y: number
  size: number
  color: string
}

export interface MapEdgeAttributes {
  relation: string
  size: number
  color: string
  type?: string
  curvature?: number
  parallelIndex?: number | null
  parallelMaxIndex?: number | null
}

export interface MapHandle {
  fit: () => void
  zoomBy: (factor: number) => void
  focus: (id: string) => void
  tidy: () => void
}
