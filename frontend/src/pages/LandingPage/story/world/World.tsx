import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { useState } from 'react'
import { into, STEP } from '../timeline'
import { AnalysisSheet, Proposals } from './AnalysisSheet'
import { ENTITIES, HIDDEN, ROUTE, STATED } from './data'
import { DocumentPile } from './DocumentPile'
import { EntityChip } from './EntityChip'
import { Links } from './Links'
import { Neighbours } from './Neighbours'
import { Paper } from './Paper'
import type { WordBox } from './Paper'
import { useChipPlaces } from './useChipPlaces'

const REST_MARGIN = 0.002
const ROUTE_INK = 'var(--ink-ochre)'
const SCENE_BACK = 'var(--pastel-lilac)'

export function World({ progress }: { progress: MotionValue<number> }) {
  const [boxes, setBoxes] = useState<Record<string, WordBox>>({})
  const places = useChipPlaces(progress, boxes)

  const cameraTimes = [
    into(STEP.graph, 0.35),
    into(STEP.graph, 0.85),
    into(STEP.path, 0.05),
    into(STEP.path, 0.5),
    into(STEP.source, 0.2),
    STEP.source - 0.15,
    into(STEP.canvas, 0.15),
    into(STEP.canvas, 0.6),
  ]
  const scale = useTransform(progress, cameraTimes, [1, 1.18, 1.18, 1, 1, 1.3, 1.3, 1])
  const x = useTransform(progress, cameraTimes, [
    '0%',
    '8%',
    '8%',
    '0%',
    '0%',
    '-11%',
    '-11%',
    '0%',
  ])
  const y = useTransform(progress, cameraTimes, [
    '0%',
    '20%',
    '20%',
    '0%',
    '0%',
    '-28%',
    '-28%',
    '0%',
  ])
  // A layer keeps the resolution it was drawn at: while resting, text is redrawn sharp at the zoom.
  const willChange = useTransform(progress, (p) =>
    Math.abs(p - Math.round(p)) > REST_MARGIN ? 'transform' : 'auto'
  )

  const graphOpacity = useTransform(progress, [into(STEP.read, 0.4), into(STEP.read, 0.5)], [0, 1])
  const onGraph = useTransform(progress, [into(STEP.canvas, 0.1), into(STEP.canvas, 0.3)], [1, 0])
  const onCanvas = useTransform(progress, [into(STEP.canvas, 0.5), into(STEP.canvas, 0.55)], [0, 1])

  return (
    <div className="absolute inset-0 grid place-items-center [container-type:size]">
      <div className="relative size-[min(100cqw,100cqh)]">
        <DocumentPile progress={progress} />
        <Paper progress={progress} onMeasure={setBoxes} />
        <motion.div className="absolute inset-0" style={{ x, y, scale, willChange }}>
          <svg
            viewBox="0 0 1000 1000"
            aria-hidden="true"
            className="size-full overflow-visible [text-rendering:geometricPrecision]"
          >
            <Neighbours progress={progress} />
            <motion.g style={{ opacity: onGraph }}>
              <Links
                relations={ROUTE}
                places={places}
                progress={progress}
                from={into(STEP.path, 0.6)}
                to={STEP.path}
                color={ROUTE_INK}
                halo={SCENE_BACK}
                width={10}
              />
              <Links
                relations={STATED}
                places={places}
                progress={progress}
                from={into(STEP.graph, 0.55)}
                to={STEP.graph}
                color="var(--fg-subtle)"
                halo={SCENE_BACK}
              />
              <Links
                relations={HIDDEN}
                places={places}
                progress={progress}
                from={into(STEP.path, 0.4)}
                to={into(STEP.path, 0.7)}
                color="var(--fg-subtle)"
                halo={SCENE_BACK}
              />
            </motion.g>
            <AnalysisSheet progress={progress} />
            <motion.g style={{ opacity: onCanvas }}>
              <Links
                relations={ROUTE}
                places={places}
                progress={progress}
                from={into(STEP.canvas, 0.62)}
                to={STEP.canvas}
                color="var(--fg)"
                halo="var(--surface)"
                width={5}
              />
            </motion.g>
            <Proposals progress={progress} />
            <motion.g style={{ opacity: graphOpacity }}>
              {ENTITIES.map((entity, i) => (
                <EntityChip
                  key={entity.id}
                  entity={entity}
                  index={i}
                  box={boxes[entity.id]}
                  progress={progress}
                  x={places[entity.id].x}
                  y={places[entity.id].y}
                />
              ))}
            </motion.g>
          </svg>
        </motion.div>
      </div>
    </div>
  )
}
