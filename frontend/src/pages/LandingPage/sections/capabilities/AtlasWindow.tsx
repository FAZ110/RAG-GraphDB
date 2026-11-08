import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { WINDOW } from './items'
import { Tag } from '@/components/graph-art/Tag'

const SHADOW = 8
/** The size of a Tag and its offset shadow (see graph-art/Tag). */
const TAG_HEIGHT = 26
const TAG_SHADOW = 3
const BAR = 56
const TAB_Y = 34

const TABS = [
  { label: 'Kawa', x: 28 },
  { label: 'Energia', x: 104 },
  { label: 'Transport', x: 196 },
]

const NODES = [
  { id: 'frost', label: 'Mróz', ink: 'steel', x: 205, y: 70, width: 62, hit: true },
  { id: 'harvest', label: 'Zbiory kawy', ink: 'ochre', x: 300, y: 150, width: 106 },
  { id: 'drought', label: 'Susza', ink: 'steel', x: 196, y: 238, width: 68, hit: true },
  { id: 'market', label: 'Giełda kawy', ink: 'cobalt', x: 432, y: 66, width: 106 },
  { id: 'roaster', label: 'Palarnia', ink: 'plum', x: 470, y: 192, width: 86 },
  { id: 'cafe', label: 'Kawiarnia', ink: 'cherry', x: 350, y: 262, width: 94 },
] as const
/** The graph is drawn at this size to fill the window around the panels. */
const GRAPH_SCALE = 1.2

const LINKS = [
  ['frost', 'harvest'],
  ['drought', 'harvest'],
  ['harvest', 'market'],
  ['market', 'roaster'],
  ['roaster', 'cafe'],
  ['harvest', 'cafe'],
] as const

const centre = (id: string) => {
  const node = NODES.find((n) => n.id === id)!
  return { x: node.x + node.width / 2, y: node.y + TAG_HEIGHT / 2 }
}

/** How far each callout has played, 0 to 1, in the order of ITEMS. */
interface Props {
  spaces: MotionValue<number>
  privacy: MotionValue<number>
  models: MotionValue<number>
  search: MotionValue<number>
}

function Tabs({ t }: { t: MotionValue<number> }) {
  return TABS.map((tab, i) => <Tab key={tab.label} tab={tab} index={i} t={t} />)
}

function Tab({
  tab,
  index,
  t,
}: {
  tab: (typeof TABS)[number]
  index: number
  t: MotionValue<number>
}) {
  const range = [0.1 + index * 0.25, 0.45 + index * 0.25]
  const opacity = useTransform(t, range, [index === 0 ? 1 : 0, 1])
  const x = useTransform(t, range, [index === 0 ? 0 : -10, 0])
  const active = index === 0
  return (
    <motion.g style={{ opacity, x }}>
      <text
        x={tab.x}
        y={TAB_Y}
        fontSize={15}
        fontWeight={active ? 700 : 500}
        fill={active ? 'var(--fg)' : 'var(--fg-subtle)'}
      >
        {tab.label}
      </text>
      {active && <rect x={tab.x} y={BAR - 3} width={40} height={3} fill="var(--ink-cobalt)" />}
    </motion.g>
  )
}

function Lock({ t }: { t: MotionValue<number> }) {
  const opacity = useTransform(t, [0, 0.4], [0.25, 1])
  const shackle = useTransform(t, [0.4, 1], [-6, 0])
  return (
    <motion.g style={{ opacity }} transform="translate(670 12)">
      <motion.path
        d="M6 13V8a8 8 0 0 1 16 0v5"
        fill="none"
        stroke="var(--ink-fir)"
        strokeWidth={2.5}
        style={{ y: shackle }}
      />
      <rect
        x={1}
        y={13}
        width={26}
        height={18}
        fill="var(--ink-fir-field)"
        stroke="var(--ink-fir)"
        strokeWidth={1.5}
      />
      <circle cx={14} cy={20} r={2.5} fill="var(--ink-fir)" />
      <rect x={13} y={20} width={2} height={6} fill="var(--ink-fir)" />
    </motion.g>
  )
}

function Models({ t }: { t: MotionValue<number> }) {
  const pick = useTransform(t, [0.3, 0.8], [0, 26])
  return (
    <g transform="translate(28 196)">
      <rect x={4} y={4} width={176} height={84} fill="var(--line)" />
      <rect width={176} height={84} fill="var(--surface)" stroke="var(--fg)" strokeWidth={1.5} />
      <text x={14} y={22} fontSize={11} fontWeight={600} fill="var(--fg-subtle)">
        Model językowy
      </text>
      <motion.rect
        x={6}
        y={30}
        width={164}
        height={24}
        fill="var(--ink-ochre-field)"
        style={{ y: pick }}
      />
      <text x={16} y={47} fontSize={13} fontWeight={500} fill="var(--fg-soft)">
        W chmurze
      </text>
      <text x={16} y={73} fontSize={13} fontWeight={600} fill="var(--fg)">
        Lokalny
      </text>
    </g>
  )
}

function Node({ node, t }: { node: (typeof NODES)[number]; t: MotionValue<number> }) {
  const hit = 'hit' in node && node.hit
  const opacity = useTransform(t, [0.3, 0.7], [1, hit ? 1 : 0.55])
  const ring = useTransform(t, [0.45, 0.9], [0, 1])
  return (
    <g>
      {/* Solid under the tag, so a dimmed tag fades towards the window, not into the lines. */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width + TAG_SHADOW}
        height={TAG_HEIGHT + TAG_SHADOW}
        fill="var(--surface)"
      />
      <motion.g style={{ opacity }}>
        {hit && (
          <motion.rect
            x={node.x - 6}
            y={node.y - 6}
            width={node.width + 15}
            height={41}
            fill="none"
            stroke="var(--ink-steel)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            style={{ opacity: ring }}
          />
        )}
        <Tag
          width={node.width}
          label={node.label}
          ink={node.ink}
          transform={`translate(${node.x} ${node.y})`}
        />
      </motion.g>
    </g>
  )
}

function Graph({ t }: { t: MotionValue<number> }) {
  const lines = useTransform(t, [0.3, 0.7], [1, 0.55])
  return (
    <g transform={`scale(${GRAPH_SCALE})`}>
      <motion.g stroke="var(--fg-faint)" strokeWidth={1.5} style={{ opacity: lines }}>
        {LINKS.map(([from, to]) => {
          const a = centre(from)
          const b = centre(to)
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        })}
      </motion.g>
      {NODES.map((node) => (
        <Node key={node.id} node={node} t={t} />
      ))}
    </g>
  )
}

function Search({ t }: { t: MotionValue<number> }) {
  const query = useTransform(t, [0, 0.35], [0, 1])
  return (
    <g transform="translate(334 380)">
      <rect x={4} y={4} width={360} height={36} fill="var(--fg)" />
      <rect width={360} height={36} fill="var(--surface)" stroke="var(--fg)" strokeWidth={1.5} />
      <circle cx={20} cy={17} r={6} fill="none" stroke="var(--fg-subtle)" strokeWidth={1.5} />
      <line x1={24.5} y1={21.5} x2={29} y2={26} stroke="var(--fg-subtle)" strokeWidth={1.5} />
      <motion.text
        x={40}
        y={23}
        fontSize={14}
        fontWeight={500}
        fill="var(--fg)"
        style={{ opacity: query }}
      >
        pogoda w Brazylii
      </motion.text>
    </g>
  )
}

/** Atlas drawn as one window, with the parts the callouts point at. */
export function AtlasWindow({ spaces, privacy, models, search }: Props) {
  const { width, height } = WINDOW
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full overflow-visible"
    >
      <rect x={SHADOW} y={SHADOW} width={width} height={height} fill="var(--fg)" />
      <rect
        width={width}
        height={height}
        fill="var(--surface)"
        stroke="var(--fg)"
        strokeWidth={2}
      />
      <line x1={0} y1={BAR} x2={width} y2={BAR} stroke="var(--fg)" strokeWidth={1.5} />
      <Tabs t={spaces} />
      <Lock t={privacy} />
      <Graph t={search} />
      <Models t={models} />
      <Search t={search} />
    </svg>
  )
}
