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

  it('ignores the last faint events', () => {
    expect(wheelSteps()(2, 1000)).toBe(0)
  })
})
