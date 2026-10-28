import { useState } from 'react'

export type PickTool = 'expand' | 'common' | 'path'

// How many entities each tool works on; it runs by itself once it has `runsAt`.
const NEEDS: Record<PickTool, { min: number; max: number; runsAt: number | null }> = {
  expand: { min: 1, max: 1, runsAt: 1 },
  path: { min: 2, max: 2, runsAt: 2 },
  // Any number can be compared, so it waits to be told to go.
  common: { min: 2, max: Infinity, runsAt: null },
}

export interface Picking {
  tool: PickTool
  ids: string[]
}

/**
 * A tool picked without the entities it needs becomes a mode: clicks on the canvas pick them,
 * starting from what was selected, and it runs once it has enough.
 */
export function useToolPicking(run: (tool: PickTool, ids: string[]) => void) {
  const [picking, setPicking] = useState<Picking | null>(null)

  const finish = (tool: PickTool, ids: string[]) => {
    setPicking(null)
    run(tool, ids)
  }

  return {
    picking,
    canRun: picking !== null && picking.ids.length >= NEEDS[picking.tool].min,
    /** Run at once if the selection is enough, otherwise start picking from it. */
    start: (tool: PickTool, selected: readonly string[]) => {
      const { min, max } = NEEDS[tool]
      const ids = selected.slice(0, max)
      if (ids.length >= min) finish(tool, ids)
      else setPicking({ tool, ids })
    },
    /** A click on an entity: picked if it wasn't, dropped if it was. */
    toggle: (id: string) => {
      if (!picking) return
      const { max, runsAt } = NEEDS[picking.tool]
      const ids = picking.ids.includes(id)
        ? picking.ids.filter((x) => x !== id)
        : [...picking.ids, id].slice(-max)
      if (runsAt !== null && ids.length >= runsAt) finish(picking.tool, ids)
      else setPicking({ ...picking, ids })
    },
    go: () => {
      if (picking && picking.ids.length >= NEEDS[picking.tool].min)
        finish(picking.tool, picking.ids)
    },
    cancel: () => setPicking(null),
  }
}
