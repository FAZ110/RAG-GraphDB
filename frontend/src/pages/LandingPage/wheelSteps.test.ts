import { describe, expect, it } from 'vitest'
import { wheelSteps } from './wheelSteps'

const FRAME_MS = 16

function play(deltas: number[], gapMs = FRAME_MS, start = 1000) {
  const steps = wheelSteps()
  return deltas.reduce((sum, delta, i) => sum + Math.abs(steps(delta, start + i * gapMs)), 0)
}

const flick = (peak: number, frames: number) =>
  Array.from({ length: frames }, (_, i) => Math.max(1, Math.round(peak * Math.exp(-i / 9))))

describe('wheelSteps', () => {
  it('moves one scene for a gentle trackpad flick', () => {
    expect(play(flick(60, 40))).toBe(1)
  })

  it('moves one scene however strong the flick is', () => {
    expect(play(flick(500, 70))).toBe(1)
  })

  it('moves one scene per slow wheel notch', () => {
    expect(play([100, 100, 100], 800)).toBe(3)
  })

  it('does not race through scenes while a wheel is spun', () => {
    expect(play(Array(10).fill(100), 60)).toBe(1)
  })

  it('reverses at once', () => {
    const steps = wheelSteps()
    expect(steps(100, 1000)).toBe(1)
    expect(steps(-100, 1030)).toBe(-1)
  })

  it('answers a new wheel burst right after the last one', () => {
    const steps = wheelSteps()
    expect(steps(100, 1000)).toBe(1)
    expect(steps(100, 1040)).toBe(0)
    expect(steps(100, 1300)).toBe(1)
  })

  it('steps at once on a touchpad gesture that starts faint', () => {
    const steps = wheelSteps()
    const ramp = [1, 2, 3, 6, 10, 18, 30, 42, 50, 48, 44, 40]
    const moved = ramp.map((delta, i) => steps(delta, 1000 + i * FRAME_MS))
    expect(moved.indexOf(1)).toBe(ramp.indexOf(6))
    expect(moved.filter(Boolean)).toHaveLength(1)
  })

  const windowsSwipe = [
    3, 19, 15, 35, 20, 41, 46, 23, 47, 24, 47, 23, 45, 23, 46, 52, 30, 67, 36, 59, 0, 42, 34, 56, 24,
    22, 20, 18, 18, 16, 15, 14, 14, 12, 12, 15, 8, 11, 10, 10, 9, 9, 9, 8, 8, 8, 8, 7, 7, 7, 7, 6, 6,
    6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 4, 5, 4, 4, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1,
  ]
  const windowsFling = [
    8, 32, 84, 70, 36, 82, 45, 94, 48, 95, 49, 91, 78, 22, 21, 0, 1, 98, 49, 48, 46, 35, 28, 23, 20,
    17, 16, 15, 13, 13, 11, 11, 11, 9, 10, 8, 9, 8, 7, 8, 7, 6, 7, 6, 6, 6, 5, 6, 5, 5, 5, 5, 4, 5, 4,
    14, 2, 3, 4, 4, 3, 3, 4, 3, 6, 3, 2, 3, 3, 2, 3, 3, 2, 2, 3, 2, 2, 2, 2, 1, 1,
  ]

  it('moves one scene for a long Windows touchpad swipe', () => {
    expect(play(windowsSwipe, 11)).toBe(1)
    expect(play(windowsFling, 11)).toBe(1)
  })

  it('ignores the last faint events', () => {
    expect(wheelSteps()(2, 1000)).toBe(0)
  })
})
