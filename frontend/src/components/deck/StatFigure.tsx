interface Props {
  count: number
  unit: string
}

export function StatFigure({ count, unit }: Props) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-figure text-fg tabular-nums">{count.toLocaleString('pl-PL')}</span>
      <span className="text-sm font-semibold text-fg-subtle">{unit}</span>
    </span>
  )
}
