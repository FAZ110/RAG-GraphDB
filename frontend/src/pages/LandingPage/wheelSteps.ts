const GESTURE_GAP_MS = 180
const MIN_DELTA = 4
const STEP_LOCK_MS = 700
/** The fixed delta a wheel notch sends, unlike a trackpad's fading stream. */
const NOTCH_DELTA = 50
const INERTIA_WINDOW = 8
const SURGE_RATIO = 1.5

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

/**
 * One scene per gesture: a wheel event counts when it starts a gesture, and not when it belongs to
 * the fading stream a trackpad sends after a flick. A surge in that stream is a new flick.
 */
export function wheelSteps() {
  const sizes: number[] = []
  let lastAt = 0
  let lastDirection = 0
  let lockedUntil = 0

  return (delta: number, now: number): number => {
    const size = Math.abs(delta)
    const direction = Math.sign(delta)
    const reversed = direction !== lastDirection
    const quiet = now - lastAt > GESTURE_GAP_MS || reversed
    const notch = size >= NOTCH_DELTA && size === sizes[sizes.length - 1]
    if (quiet) sizes.length = 0
    sizes.push(size)
    if (sizes.length > INERTIA_WINDOW) sizes.shift()
    lastAt = now
    lastDirection = direction

    const half = INERTIA_WINDOW / 2
    const surge =
      sizes.length === INERTIA_WINDOW &&
      average(sizes.slice(half)) > average(sizes.slice(0, half)) * SURGE_RATIO
    const unlocked = now >= lockedUntil || reversed
    if (size < MIN_DELTA || !unlocked || !(quiet || notch || surge)) return 0
    lockedUntil = now + STEP_LOCK_MS
    return direction
  }
}
