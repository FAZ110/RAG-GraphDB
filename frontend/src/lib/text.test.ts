import { describe, expect, it } from 'vitest'
import { normalize, toIdentifier } from './text'

describe('normalize', () => {
  it('strips Polish diacritics and case', () => {
    expect(normalize('Łódź ŻÓŁĆ')).toBe('lodz zolc')
  })

  it('keeps the length so match positions map back', () => {
    const text = 'Zażółć gęślą jaźń'
    expect(normalize(text)).toHaveLength(text.length)
  })
})

describe('toIdentifier', () => {
  it('uppercases and joins words with underscores', () => {
    expect(toIdentifier('  mieszka w - pobliżu ')).toBe('MIESZKA_W_POBLIŻU')
  })
})
