import { contour } from './contours'

// Fractions of the backdrop's width and height.
const HILLS = [
  { x: 0.08, y: 0.22, rings: 7 },
  { x: 0.3, y: 0.78, rings: 9 },
  { x: 0.55, y: 0.18, rings: 6 },
  { x: 0.78, y: 0.62, rings: 10 },
  { x: 0.96, y: 0.12, rings: 5 },
  { x: 0.64, y: 1.02, rings: 6 },
]
const WIDTH = 1600
const HEIGHT = 900
const RING_STEP = 34

export function ContourBackdrop({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none fixed inset-0 h-full w-full transition-colors duration-700 motion-reduce:transition-none"
      style={{ color }}
    >
      <g fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={1}>
        {HILLS.flatMap((hill, h) =>
          Array.from({ length: hill.rings }, (_, ring) => (
            <path
              key={`${h}-${ring}`}
              d={contour(
                hill.x * WIDTH,
                hill.y * HEIGHT,
                26 + ring * RING_STEP,
                h * 131 + ring * 17
              )}
              vectorEffect="non-scaling-stroke"
              strokeOpacity={ring % 4 === 0 ? 0.28 : undefined}
            />
          ))
        )}
      </g>
    </svg>
  )
}
