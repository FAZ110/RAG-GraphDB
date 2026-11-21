/** What a piece of Cypher is, for colouring it. */
export type TokenKind =
  | 'keyword'
  | 'function'
  | 'label'
  | 'param'
  | 'string'
  | 'number'
  | 'comment'
  | 'plain'

export interface Token {
  kind: TokenKind
  text: string
}

const KEYWORDS = new Set(
  (
    'MATCH OPTIONAL WHERE RETURN WITH AS AND OR NOT IN IS NULL LIMIT ORDER BY DESC ASC ' +
    'DISTINCT CASE WHEN THEN ELSE END EXISTS CONTAINS STARTS ENDS UNWIND CALL TRUE FALSE'
  ).split(' ')
)

// Tried in order at each place; the first that matches there wins.
const RULES: [TokenKind | 'word', RegExp][] = [
  ['comment', /\/\/[^\n]*/y],
  ['string', /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/y],
  ['param', /\$\w+/y],
  // ":Entity", ":`GRA_W`" — a label or a relationship type, written right after the colon;
  // a map's "key: value" has a space there.
  ['label', /:(?:`[^`]*`|[A-Za-z_]\w*)/y],
  ['number', /\b\d+(?:\.\d+)?\b/y],
  ['word', /[A-Za-z_]\w*/y],
]

/** Cypher cut into pieces to colour, which joined again give back the text. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const push = (kind: TokenKind, piece: string) => {
    const last = tokens.at(-1)
    if (last && last.kind === kind && kind === 'plain') last.text += piece
    else tokens.push({ kind, text: piece })
  }
  let at = 0
  while (at < text.length) {
    let matched = false
    for (const [kind, rule] of RULES) {
      rule.lastIndex = at
      const m = rule.exec(text)
      if (!m) continue
      const piece = m[0]
      if (kind === 'word') {
        const next = text.slice(at + piece.length).match(/^\s*\(/)
        push(KEYWORDS.has(piece.toUpperCase()) ? 'keyword' : next ? 'function' : 'plain', piece)
      } else {
        push(kind, piece)
      }
      at += piece.length
      matched = true
      break
    }
    if (!matched) {
      push('plain', text[at])
      at += 1
    }
  }
  return tokens
}
