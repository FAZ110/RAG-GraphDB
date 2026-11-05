import { expect, it } from 'vitest'
import { hashString } from './hash'

it('is the FNV-1a hash, stable across calls', () => {
  expect(hashString('')).toBe(2166136261)
  expect(hashString('a')).toBe(0xe40c292c)
  expect(hashString('graf')).toBe(hashString('graf'))
})

it('differs for different strings', () => {
  expect(hashString('OSOBA')).not.toBe(hashString('MIEJSCE'))
})
