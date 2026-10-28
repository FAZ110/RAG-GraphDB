import { STAGGER } from '@/design/motion'

// Small maps of each way to start, drawn in the space's ink on paper. They share one frame so
// the three cards line up; hovering a card lets its drawing move a little.

const FRAME = 'h-full w-full'
// Where the neighbours sit round the entity before and after they unfold.
const FOLDED = 30
const UNFOLDED = 48

/** One entity in the middle; on hover its neighbours unfold from it one after another, as
 * expanding it does on the canvas. */
export function EntityArt() {
  const ghosts = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    const unit = { x: Math.cos(a), y: Math.sin(a) }
    return {
      rest: { x: 100 + unit.x * FOLDED, y: 70 + unit.y * FOLDED },
      // How far it travels outward; CSS takes it as a translate.
      shift: { x: unit.x * (UNFOLDED - FOLDED), y: unit.y * (UNFOLDED - FOLDED) },
      delay: `${i * STAGGER.gap}s`,
    }
  })
  return (
    <svg viewBox="0 0 200 140" className={FRAME} aria-hidden="true">
      {ghosts.map((g, i) => (
        <g
          key={i}
          style={{
            ['--dx' as string]: `${g.shift.x}px`,
            ['--dy' as string]: `${g.shift.y}px`,
            transitionDelay: g.delay,
          }}
          className="opacity-70 transition-[translate,opacity] spring-panel group-hover:translate-x-(--dx) group-hover:translate-y-(--dy) group-hover:opacity-100 motion-reduce:transition-none"
        >
          <circle
            cx={g.rest.x}
            cy={g.rest.y}
            r="6"
            fill="var(--ink-field)"
            stroke="var(--ink)"
            strokeDasharray="2 2"
          />
        </g>
      ))}
      {/* Lines stretch with the ghosts, scaling out from the middle without thickening. */}
      <g
        className="origin-[100px_70px] transition-transform spring-panel group-hover:scale-(--unfold) motion-reduce:transition-none"
        style={{ ['--unfold' as string]: UNFOLDED / FOLDED }}
      >
        {ghosts.map((g, i) => (
          <line
            key={i}
            x1="100"
            y1="70"
            x2={100 + (g.rest.x - 100) * 0.8}
            y2={70 + (g.rest.y - 70) * 0.8}
            stroke="var(--ink)"
            strokeOpacity="0.5"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <circle cx="100" cy="70" r="13" fill="var(--ink)" stroke="var(--surface)" strokeWidth="3" />
    </svg>
  )
}

/** A page whose names lift off it as entities. */
export function ArticleArt() {
  const dots = [
    { x: 140, y: 34, r: 7 },
    { x: 162, y: 64, r: 5 },
    { x: 146, y: 96, r: 6 },
  ]
  return (
    <svg viewBox="0 0 200 140" className={FRAME} aria-hidden="true">
      <rect x="44" y="22" width="68" height="96" fill="var(--surface)" stroke="var(--fg-faint)" />
      {[38, 48, 58, 68, 78, 88, 98].map((y, i) => (
        <line
          key={y}
          x1="54"
          x2={i % 3 === 2 ? 86 : 102}
          y1={y}
          y2={y}
          stroke="var(--line)"
          strokeWidth="3"
        />
      ))}
      <rect x="54" y="45" width="22" height="6" fill="var(--ink)" fillOpacity="0.35" />
      <rect x="68" y="75" width="26" height="6" fill="var(--ink)" fillOpacity="0.35" />
      <g className="transition-transform spring-panel group-hover:translate-x-2 motion-reduce:transition-none">
        {dots.map((d, i) => (
          <g key={i}>
            <line
              x1="112"
              y1={48 + i * 22}
              x2={d.x}
              y2={d.y}
              stroke="var(--ink)"
              strokeOpacity="0.5"
            />
            <circle
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="var(--ink)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </g>
        ))}
        <line
          x1={dots[0].x}
          y1={dots[0].y}
          x2={dots[1].x}
          y2={dots[1].y}
          stroke="var(--ink)"
          strokeOpacity="0.5"
        />
      </g>
    </svg>
  )
}

/** Bare map paper, with a spot cleared and marked where the first entity will go. */
export function BlankArt() {
  const dots = []
  for (let x = 20; x <= 180; x += 16) {
    for (let y = 14; y <= 126; y += 16) {
      const away = Math.hypot(x - 100, y - 70)
      // Clear round the mark, and fainter towards the edges, so the eye lands on the middle.
      if (away > 30) dots.push({ x, y, opacity: Math.max(0.15, 0.6 - away / 220) })
    }
  }
  return (
    <svg viewBox="0 0 200 140" className={FRAME} aria-hidden="true">
      {dots.map((d) => (
        <circle
          key={`${d.x}:${d.y}`}
          cx={d.x}
          cy={d.y}
          r="1.3"
          fill="var(--ink)"
          fillOpacity={d.opacity}
        />
      ))}
      <g className="origin-center transition-transform spring-panel group-hover:scale-110 motion-reduce:transition-none [transform-box:fill-box]">
        <circle
          cx="100"
          cy="70"
          r="17"
          fill="var(--ink-field)"
          stroke="var(--ink)"
          strokeDasharray="3 3"
        />
        <line x1="100" y1="62" x2="100" y2="78" stroke="var(--ink)" strokeWidth="2" />
        <line x1="92" y1="70" x2="108" y2="70" stroke="var(--ink)" strokeWidth="2" />
      </g>
    </svg>
  )
}
