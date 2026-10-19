import { Select } from '@/components/deck'
import type { Ink } from '@/design/inks'
import type { Space } from '@/types'
import { ARTICLE_FORMS, pluralForm } from '../spaceText'

interface Props {
  spaces: Space[]
  value: string | undefined
  onChange: (spaceId: string) => void
  size?: 'md' | 'lg'
  ink?: Ink
  className?: string
}

export function SpaceSelect({ spaces, value, onChange, size, ink, className }: Props) {
  return (
    <Select
      label="Przestrzeń"
      placeholder="Wybierz przestrzeń"
      size={size}
      options={spaces.map((s) => ({
        value: s.id,
        label: s.name,
        hint: `${s.article_count} ${pluralForm(s.article_count, ARTICLE_FORMS)}`,
      }))}
      value={value}
      onChange={onChange}
      ink={ink}
      className={className}
    />
  )
}
