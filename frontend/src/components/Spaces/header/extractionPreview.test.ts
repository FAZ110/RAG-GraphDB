import { describe, expect, it } from 'vitest'
import type { ExtractionSettings } from '@/types'
import { extractedWithOtherSettings, previewPrompt, splitLabels } from './extractionPreview'

const SAVED: ExtractionSettings = {
  preset: null,
  labels: ['OSOBA', 'MIEJSCE'],
  strict_labels: false,
  presets: [{ key: 'people', name: 'Osoby', description: '', rules: 'Skup się na osobach.' }],
  domains: [
    { key: 'general', name: 'Ogólna', labels: ['OSOBA', 'MIEJSCE'] },
    { key: 'law', name: 'Prawo', labels: ['SĄD', 'PRZEPIS'] },
  ],
  prompt: {
    user: 'Zasady:\n1. {label_rule}\n2. Reszta.\n\n{scope}Tytuł: T',
    label_rule: 'Dobierz etykiety (np. {labels} lub inne).',
    strict_label_rule: 'Używaj WYŁĄCZNIE: {labels}.',
    scope: 'ZAKRES\n{rules}\n\n',
  },
}

const whole = (p: ReturnType<typeof previewPrompt>) =>
  p.beforeRule + p.ruleStart + p.labels + p.ruleEnd + p.beforeScope + (p.scope ?? '') + p.afterScope

describe('splitLabels', () => {
  it('turns what was typed into identifiers and drops the blanks', () => {
    expect(splitLabels(' osoba, klub piłkarski ,, sąd-rejonowy ')).toEqual([
      'OSOBA',
      'KLUB_PIŁKARSKI',
      'SĄD_REJONOWY',
    ])
  })
})

describe('previewPrompt', () => {
  it('puts the labels into the loose rule and leaves the scope out without a preset', () => {
    const p = previewPrompt(SAVED, { preset: null, labels: 'sąd, przepis', strict: false })
    expect(p.scope).toBeNull()
    expect(whole(p)).toBe(
      'Zasady:\n1. Dobierz etykiety (np. SĄD, PRZEPIS lub inne).\n2. Reszta.\n\nTytuł: T'
    )
  })

  it('uses the strict rule and the preset rules where the template has them', () => {
    const p = previewPrompt(SAVED, { preset: 'people', labels: 'OSOBA', strict: true })
    expect(whole(p)).toBe(
      'Zasady:\n1. Używaj WYŁĄCZNIE: OSOBA.\n2. Reszta.\n\nZAKRES\nSkup się na osobach.\n\nTytuł: T'
    )
  })

  it('falls back to the default labels when none are typed, as the server does', () => {
    const p = previewPrompt(SAVED, { preset: null, labels: ' , ', strict: false })
    expect(p.labels).toBe('OSOBA, MIEJSCE')
    expect(p.domain).toBe('general')
  })

  it('names the domain only while the labels equal one of the ready sets', () => {
    const form = { preset: null, strict: false }
    expect(previewPrompt(SAVED, { ...form, labels: 'SĄD, PRZEPIS' }).domain).toBe('law')
    expect(previewPrompt(SAVED, { ...form, labels: 'SĄD, PRZEPIS, UMOWA' }).domain).toBeUndefined()
  })

  it('ignores a preset the server no longer knows', () => {
    expect(
      previewPrompt(SAVED, { preset: 'gone', labels: 'OSOBA', strict: false }).scope
    ).toBeNull()
  })
})

describe('extractedWithOtherSettings', () => {
  const current = { preset: 'people', labels: ['OSOBA', 'MIEJSCE'], strict_labels: true }
  const same = {
    extraction_preset: 'people',
    extraction_labels: ['OSOBA', 'MIEJSCE'],
    extraction_strict_labels: true,
  }

  it('is false while the space still has the settings the article was extracted with', () => {
    expect(extractedWithOtherSettings(same, current)).toBe(false)
  })

  it.each([
    ['the mode', { ...same, extraction_preset: null }],
    ['a label', { ...same, extraction_labels: ['OSOBA'] }],
    ['the order of labels', { ...same, extraction_labels: ['MIEJSCE', 'OSOBA'] }],
    ['strictness', { ...same, extraction_strict_labels: false }],
  ])('is true when %s differs', (_, article) => {
    expect(extractedWithOtherSettings(article, current)).toBe(true)
  })
})
