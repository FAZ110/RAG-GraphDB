import { describe, expect, it } from 'vitest'
import { countCaption, countedText, countText, countUnit } from './counting'

describe('link count', () => {
  it('reads the whole condition, or only what is set', () => {
    expect(countText({ min: 2, type: 'GRAŁ_DLA', label: 'KLUB' })).toBe(
      'ma co najmniej 2 powiązania „grał dla” z encjami typu Klub'
    )
    expect(countText({ min: 5, type: null, label: null })).toBe('ma co najmniej 5 powiązań')
  })

  it('stays short under a node', () => {
    expect(countCaption({ min: 2, type: 'GRAŁ_DLA', label: 'KLUB' })).toBe('≥ 2 „grał dla” · Klub')
    expect(countCaption({ min: 3, type: null, label: 'KLUB' })).toBe('≥ 3 powiązania · Klub')
  })

  it('names what a counted number stands for beside a result', () => {
    expect(countUnit({ min: 1, type: 'GRAŁ_DLA', label: 'KLUB' }, 4)).toBe('Klub')
    expect(countUnit({ min: 1, type: 'GRAŁ_DLA', label: null }, 4)).toBe('„grał dla”')
    expect(countUnit({ min: 1, type: null, label: null }, 5)).toBe('powiązań')
    expect(countedText({ min: 1, type: null, label: 'KLUB' }, 4)).toBe(
      '4 powiązania z encjami typu Klub'
    )
  })
})
