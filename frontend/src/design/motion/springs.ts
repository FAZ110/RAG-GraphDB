// Every movement in the app is one of these springs, after Apple's: no bounce unless a gesture
// threw it. `visualDuration` is when it looks settled, Apple's response divided by 1.2.
export const SPRINGS = {
  /** Small things and frequent ones: tab indicators, pages settling, swapped text, presses. */
  quick: { visualDuration: 0.2, bounce: 0 },
  /** Things that appear over the page: modals, popovers, confirmations. */
  base: { visualDuration: 0.28, bounce: 0 },
  /** Large surfaces that travel: drawers, columns opening beside each other. */
  panel: { visualDuration: 0.36, bounce: 0 },
  /** Only where a drag or flick carried momentum into the motion. */
  release: { visualDuration: 0.3, bounce: 0.15 },
} as const

export type SpringName = keyof typeof SPRINGS

export const SPRING_NAMES = Object.keys(SPRINGS) as SpringName[]

/** Leaving takes this share of arriving: once dismissed, it shouldn't hold the eye. */
export const EXIT_SHARE = 0.8

/** Opacity takes this share of the move it rides on, so content reads before it lands. */
export const EFFECT_SHARE = 0.6

export const STAGGER = { gap: 0.04, upTo: 6 } as const
