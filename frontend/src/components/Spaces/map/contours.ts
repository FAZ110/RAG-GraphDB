export function seedFrom(text: string): number {
  let seed = 7
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) >>> 0
  return seed
}

export function contour(cx: number, cy: number, radius: number, seed: number): string {
  const a = (seed % 628) / 100
  const b = ((seed >> 8) % 628) / 100
  const points: string[] = []
  for (let step = 0; step < 40; step++) {
    const angle = (step / 40) * Math.PI * 2
    const wobble = 1 + 0.14 * Math.sin(3 * angle + a) + 0.07 * Math.sin(5 * angle + b)
    const r = radius * wobble
    points.push(
      `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r * 0.8).toFixed(1)}`
    )
  }
  return `M${points.join('L')}Z`
}
