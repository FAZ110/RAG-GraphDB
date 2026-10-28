// Polish names change their endings ("Pogoń", "Pogoni"), so each word of a name is matched by
// its stem and any ending after it.
function namePattern(names: readonly string[]): RegExp | null {
  const stems = names
    .flatMap((name) => name.split(/\s+/))
    .filter((word) => word.length >= 3)
    .map((word) => {
      // Long words lose two letters, short ones one, so case endings still match.
      const stem =
        word.length >= 7 ? word.slice(0, -2) : word.length >= 5 ? word.slice(0, -1) : word
      return stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
  if (!stems.length) return null
  return new RegExp(`(?<![\\p{L}])((?:${stems.join('|')})\\p{L}*)`, 'giu')
}

/** A quote with the entity's name and aliases marked in its ink, wherever they appear. */
export function MarkedNames({
  text,
  names,
  color,
}: {
  text: string
  names: string[]
  color: string
}) {
  const pattern = namePattern(names)
  if (!pattern) return <>{text}</>
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-transparent font-semibold text-fg underline decoration-2 underline-offset-2"
            style={{ textDecorationColor: color }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}
