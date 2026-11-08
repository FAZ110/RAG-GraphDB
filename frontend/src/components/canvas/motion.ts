import { EFFECT_SHARE, SPRINGS } from '@/design/motion'
import type { SpringName } from '@/design/motion'

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Cytoscape animates by duration and curve, not springs; these follow the springs' timing.
export function canvasMotion(spring: SpringName, effect = false) {
  const seconds = SPRINGS[spring].visualDuration * (effect ? EFFECT_SHARE : 1)
  return { duration: still() ? 0 : Math.round(seconds * 1000), easing: 'ease-out-cubic' as const }
}
