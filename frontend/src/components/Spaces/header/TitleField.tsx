import type { ChangeEvent, KeyboardEvent } from 'react'
import { TextInput } from '@/components/deck'
import { cn } from '@/lib/utils'
import { SPACE_NAME_MAX_LENGTH } from '../spaceText'

interface Props {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  typeClassName: string
}

const box = 'border px-2'

// An invisible copy of the text sets the field's width, so the buttons after it stay put.
export function TitleField({ value, onChange, onKeyDown, typeClassName }: Props) {
  return (
    <span className="relative -mx-[calc(0.5rem+1px)] flex h-11 max-w-xl min-w-12 items-center">
      <span
        aria-hidden="true"
        className={cn(
          box,
          'invisible overflow-hidden whitespace-pre border-transparent',
          typeClassName,
          'leading-none'
        )}
      >
        {value || ' '}
      </span>
      <TextInput
        size="display"
        autoFocus
        aria-label="Nowa nazwa przestrzeni"
        value={value}
        maxLength={SPACE_NAME_MAX_LENGTH}
        onFocus={(e) => e.target.select()}
        onChange={onChange}
        onKeyDown={onKeyDown}
        // After the type, which sets its own leading.
        className={cn(box, 'absolute inset-0 h-full', typeClassName, 'leading-none')}
      />
    </span>
  )
}
