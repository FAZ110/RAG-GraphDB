import type { NodeLabelDrawingFunction } from 'sigma/rendering'
import { sizeFor } from '@/components/canvas/canvasStyle'
import { tokenValue } from '@/components/canvas/inkColors'
import { INKS } from '@/design/inks'
import type { MapEdgeAttributes, MapNodeAttributes } from './types'

const LABEL_MAX_WIDTH = 140
const LABEL_GAP = 4

export const nodeRadius = (degree: number) => sizeFor(degree) / 3

export interface Paper {
  page: string
  surface: string
  fg: string
  subtle: string
  faint: string
  line: string
}

export function paperColors(): Paper {
  return {
    page: tokenValue('--page'),
    surface: tokenValue('--surface'),
    fg: tokenValue('--fg'),
    subtle: tokenValue('--fg-subtle'),
    faint: tokenValue('--fg-faint'),
    line: tokenValue('--line'),
  }
}

export function communityInk(index: number): string {
  return tokenValue(INKS[index % INKS.length].color)
}

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function mix(hex: string, toward: string, share: number): string {
  const a = channels(hex)
  const b = channels(toward)
  const out = a.map((c, i) => Math.round(c + (b[i] - c) * share))
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function fitted(context: CanvasRenderingContext2D, text: string): string {
  if (context.measureText(text).width <= LABEL_MAX_WIDTH) return text
  let end = text.length
  while (end > 1 && context.measureText(`${text.slice(0, end)}…`).width > LABEL_MAX_WIDTH) end--
  return `${text.slice(0, end)}…`
}

export function labelDrawers(paper: Paper) {
  const halo = withAlpha(paper.page, 0.85)

  const draw =
    (
      background: string,
      border: string | null
    ): NodeLabelDrawingFunction<MapNodeAttributes, MapEdgeAttributes> =>
    (context, data, settings) => {
      if (!data.label) return
      const size = settings.labelSize
      context.font = `${settings.labelWeight} ${size}px ${settings.labelFont}`
      const text = fitted(context, data.label)
      const width = context.measureText(text).width
      const x = data.x - width / 2
      const y = data.y + data.size + LABEL_GAP
      context.fillStyle = background
      context.fillRect(x - 3, y - 2, width + 6, size + 5)
      if (border) {
        context.strokeStyle = border
        context.lineWidth = 1
        context.strokeRect(x - 3.5, y - 2.5, width + 7, size + 6)
      }
      context.fillStyle = paper.fg
      context.textBaseline = 'top'
      context.fillText(text, x, y)
    }

  return { drawLabel: draw(halo, null), drawHover: draw(paper.surface, paper.line) }
}
