import { Stepper } from './Stepper'

interface Props {
  value: number
  max: number
  onChange: (value: number) => void
}

/** How many links apart the two ends may be. */
export function HopsInput({ value, max, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Stepper value={value} min={1} max={max} label="Najwięcej kroków" onChange={onChange} />
      <span className="text-xs text-fg-soft">
        {value === 1 ? 'bezpośrednio' : `do ${value} kroków, przez inne encje`}
      </span>
    </div>
  )
}
