import { normalize } from '@/lib/text'

interface Props {
  text: string
  /** Already normalized search text. */
  needle: string
}

export function HighlightedText({ text, needle }: Props) {
  const at = needle ? normalize(text).indexOf(needle) : -1
  if (at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent text-inherit underline decoration-2 underline-offset-[3px]">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  )
}
