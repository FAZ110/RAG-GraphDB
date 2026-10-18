import { Button } from './Button'
import type { ButtonProps } from './Button'

interface Props extends ButtonProps {
  label: string
}

export function IconButton({ label, size = 'icon-md', ...props }: Props) {
  return <Button aria-label={label} title={label} size={size} {...props} />
}
