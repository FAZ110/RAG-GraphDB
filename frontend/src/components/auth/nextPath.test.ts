import { describe, expect, it } from 'vitest'
import { safeNext, signInPath } from './nextPath'

describe('safeNext', () => {
  it('keeps a path inside the app', () => {
    expect(safeNext('/spaces/12?tab=recent')).toBe('/spaces/12?tab=recent')
  })

  it('falls back to the start page without a path', () => {
    expect(safeNext(null)).toBe('/')
    expect(safeNext('')).toBe('/')
  })

  it('refuses addresses that leave the app', () => {
    expect(safeNext('https://example.com')).toBe('/')
    expect(safeNext('//example.com')).toBe('/')
    expect(safeNext('/\\example.com')).toBe('/')
  })
})

describe('signInPath', () => {
  it('carries the asked address along', () => {
    expect(signInPath('/spaces/12?tab=recent')).toBe('/login?next=%2Fspaces%2F12%3Ftab%3Drecent')
  })

  it('needs nothing to come back to the start page', () => {
    expect(signInPath('/')).toBe('/login')
  })
})
