import { createContext, useContext } from 'react'
import type { PointerEvent } from 'react'

/** What a panel's header needs to act as a window's title bar. */
export interface WindowChrome {
  /** Start moving the window from its title bar. */
  grab: (e: PointerEvent) => void
  docked: boolean
  /** Docked windows come loose where they are; loose ones go back to their side. */
  togglePin: () => void
  /** Folded down to its title bar. */
  collapsed: boolean
  toggleCollapsed: () => void
}

export const WindowChromeContext = createContext<WindowChrome | null>(null)

export const useWindowChrome = () => useContext(WindowChromeContext)
