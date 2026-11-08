import { describe, expect, it } from 'vitest'
import { parseArticlesJson, parseFile, readFiles, textItem, toRequest } from './parseUpload'

const file = (name: string, text: string) => new File([text], name, { type: 'application/json' })

describe('parseArticlesJson', () => {
  it('is null for plain text, so it is treated as one article', () => {
    expect(parseArticlesJson('Jan Kowalski mieszka w Warszawie.')).toBeNull()
  })

  it('is null for broken JSON', () => {
    expect(parseArticlesJson('[{"content": "x"')).toBeNull()
  })

  it('reads one article or a list, trimming fields', () => {
    expect(parseArticlesJson('{"title": " T ", "content": " Tekst "}')).toMatchObject([
      { title: 'T', url: '', content: 'Tekst', problem: null, from: null },
    ])
    expect(parseArticlesJson('[{"content": "A"}, {"content": "B"}]')).toHaveLength(2)
  })

  it('keeps an article without content listed, with the reason', () => {
    const [item] = parseArticlesJson('[{"title": "Pusty", "content": "   "}]')!
    expect(item.problem).toBe('Brak treści artykułu (pole content)')
  })

  it('ignores fields of the wrong type and null entries', () => {
    const items = parseArticlesJson('[{"title": 5, "url": ["x"], "content": "A"}, null]')!
    expect(items[0]).toMatchObject({ title: '', url: '', content: 'A', problem: null })
    expect(items[1].problem).not.toBeNull()
  })

  it('gives every item its own key', () => {
    const items = parseArticlesJson('[{"content": "A"}, {"content": "A"}]')!
    expect(items[0].key).not.toBe(items[1].key)
  })
})

describe('files', () => {
  it('reads a .json file and remembers its name', async () => {
    const [item] = await parseFile(file('artykuly.JSON', '{"content": "A"}'))
    expect(item.from).toBe('artykuly.JSON')
  })

  it('refuses other file types', async () => {
    await expect(parseFile(file('notatki.txt', 'A'))).rejects.toThrow(
      'notatki.txt: obsługiwane są tylko pliki .json'
    )
  })

  it('names the file that is not valid JSON', async () => {
    await expect(parseFile(file('zly.json', '{nope'))).rejects.toThrow(
      'zly.json: to nie jest poprawny JSON'
    )
  })

  it('reports a bad file without losing the good ones', async () => {
    const { items, errors } = await readFiles([
      file('a.json', '[{"content": "A"}, {"content": "B"}]'),
      file('zly.json', '{nope'),
      file('c.json', '{"content": "C"}'),
    ])
    expect(items.map((i) => i.content)).toEqual(['A', 'B', 'C'])
    expect(errors).toEqual(['zly.json: to nie jest poprawny JSON'])
  })
})

it('pasted text becomes a request with only the article fields', () => {
  expect(toRequest(textItem(' Tytuł ', 'https://example.com', ' Treść '))).toEqual({
    title: 'Tytuł',
    url: 'https://example.com',
    content: 'Treść',
  })
})
