import { spring } from 'motion'
import { EXIT_SHARE, SPRINGS, SPRING_NAMES } from './springs'

// The springs as `--motion-*` durations and `--ease-*` `linear()` curves for CSS transitions.

function declare(name: string, visualDuration: number, bounce: number) {
  const css = String(spring(visualDuration, bounce))
  const gap = css.indexOf(' ')
  return `--motion-${name}:${css.slice(0, gap)};--ease-${name}:${css.slice(gap + 1)};`
}

export function installMotionCss() {
  const tokens = SPRING_NAMES.map((name) => {
    const { visualDuration, bounce } = SPRINGS[name]
    return (
      declare(name, visualDuration, bounce) +
      declare(`${name}-out`, visualDuration * EXIT_SHARE, bounce)
    )
  }).join('')
  const still = SPRING_NAMES.map((name) => `--motion-${name}:0s;--motion-${name}-out:0s;`).join('')

  const style = document.getElementById('motion-tokens') ?? document.createElement('style')
  style.id = 'motion-tokens'
  style.textContent = `:root{${tokens}}@media (prefers-reduced-motion: reduce){:root{${still}}}`
  document.head.append(style)
}
