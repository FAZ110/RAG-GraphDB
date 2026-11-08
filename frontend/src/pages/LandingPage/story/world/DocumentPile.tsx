import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { into, STEP } from '../timeline'
import type { PileSheet } from './pileSheets'
import { PILE, SHEET } from './pileSheets'

const CENTRE = { x: 500 - SHEET.width / 2, y: 500 - SHEET.height / 2 }
const WORLD = 1000
/** Room around a sheet for its shadow and its frame. */
const MARGIN = 20
const BOX = { width: SHEET.width + MARGIN * 2, height: SHEET.height + MARGIN * 2 }
// Where the pile sits in its hero pose: its centre, and how high its top sheet reaches.
const PILE_CENTRE = 670
const PILE_TOP = 280
/** The share of the screen's height the pile rises into. */
const PEEK = 0.21
const HERO_GAP_PX = 32

/** A world coordinate as a share of the sheet's own box, which is what a CSS translate measures. */
const toBoxX = (value: number) => `${((value - MARGIN) / BOX.width) * 100}%`
const toBoxY = (value: number) => `${((value - MARGIN) / BOX.height) * 100}%`

function Sheet({
  sheet,
  index,
  progress,
  shift,
}: {
  sheet: PileSheet
  index: number
  progress: MotionValue<number>
  shift: { x: number; y: number }
}) {
  const { hero, scattered } = sheet
  const start = into(STEP.wall, 0.05 + (index % 5) * 0.04)
  const times = [start, start + 0.65, into(STEP.read, 0.05), into(STEP.read, 0.5)]
  const x = useTransform(
    progress,
    times,
    [hero.x + shift.x, scattered.x, scattered.x, CENTRE.x].map(toBoxX)
  )
  const y = useTransform(
    progress,
    times,
    [hero.y + shift.y, scattered.y, scattered.y, CENTRE.y].map(toBoxY)
  )
  const rotate = useTransform(progress, times, [hero.rotate, scattered.rotate, scattered.rotate, 0])
  const opacity = useTransform(progress, [times[2], times[3]], [1, 0])
  const visibility = useTransform(opacity, (o) => (o > 0 ? 'visible' : 'hidden'))
  const mark = useTransform(progress, [into(STEP.wall, 0.7), into(STEP.wall, 0.95)], [0, 1])
  return (
    <motion.svg
      viewBox={`${-MARGIN} ${-MARGIN} ${BOX.width} ${BOX.height}`}
      aria-hidden="true"
      className="absolute top-0 left-0 will-change-transform [text-rendering:geometricPrecision]"
      style={{
        width: `${(BOX.width / WORLD) * 100}%`,
        aspectRatio: `${BOX.width} / ${BOX.height}`,
        x,
        y,
        rotate,
        opacity,
        visibility,
      }}
    >
      <rect x={12} y={12} width={SHEET.width} height={SHEET.height} style={{ fill: 'var(--fg)' }} />
      <rect
        width={SHEET.width}
        height={SHEET.height}
        strokeWidth={3}
        className="fill-surface stroke-fg"
      />
      {sheet.link && (
        <motion.rect
          width={SHEET.width}
          height={SHEET.height}
          strokeWidth={10}
          style={{ fill: 'var(--ink-ochre-field)', stroke: 'var(--ink-ochre)', opacity: mark }}
        />
      )}
      <text x={26} y={54} fontSize={24} fontWeight={600} className="fill-fg-subtle">
        {sheet.kind}
      </text>
      <text x={26} y={106} fontSize={34} fontWeight={600} className="fill-fg">
        {sheet.title[0]}
      </text>
      <text x={26} y={148} fontSize={34} fontWeight={600} className="fill-fg">
        {sheet.title[1]}
      </text>
      {[0, 1, 2, 3, 4, 5, 6].map((line) => (
        <rect
          key={line}
          x={26}
          y={186 + line * 30}
          width={line % 3 === 2 ? 170 : SHEET.width - 52}
          height={10}
          className="fill-line"
        />
      ))}
    </motion.svg>
  )
}

/** Everything anyone wrote, with the five documents that hold the chain scattered among the rest. */
export function DocumentPile({ progress }: { progress: MotionValue<number> }) {
  const anchor = useRef<HTMLDivElement>(null)
  const [seat, setSeat] = useState({ x: 0, y: 2000 })

  // The hero is centred on the screen, while the world sits in its own column.
  useLayoutEffect(() => {
    const measure = () => {
      const world = anchor.current?.getBoundingClientRect()
      if (!world) return
      const hero = document.querySelector<HTMLElement>('[data-landing-hero]')
      const heroEnd = hero ? hero.offsetTop + hero.offsetHeight + HERO_GAP_PX : 0
      const top = Math.max(heroEnd, window.innerHeight * (1 - PEEK))
      const scale = world.width / WORLD
      setSeat({
        x: Math.round((window.innerWidth / 2 - world.left) / scale),
        y: Math.round((top - world.top) / scale),
      })
    }
    measure()
    const hero = document.querySelector('[data-landing-hero]')
    const observer = new ResizeObserver(measure)
    if (hero) observer.observe(hero)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <>
      <div ref={anchor} className="absolute inset-0" />
      {PILE.map((sheet, i) => (
        <Sheet
          key={`${sheet.kind}-${seat.x}-${seat.y}`}
          sheet={sheet}
          index={i}
          progress={progress}
          shift={{ x: seat.x - PILE_CENTRE, y: seat.y - PILE_TOP }}
        />
      ))}
    </>
  )
}
