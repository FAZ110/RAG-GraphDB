import { easeInOut, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { into, STEP } from '../timeline'
import type { Entity } from './data'
import { ENTITIES } from './data'
import type { Place } from './Links'
import type { WordBox } from './Paper'

const WORD_HEIGHT_SHIFT = 13

function useAxis(
  progress: MotionValue<number>,
  index: number,
  word: number,
  graph: number,
  canvas: number
) {
  const lift = into(STEP.graph, 0.05 + index * 0.02)
  return useTransform(
    progress,
    [
      lift,
      lift + 0.4,
      into(STEP.canvas, 0.3 + index * 0.04),
      into(STEP.canvas, 0.72 + index * 0.04),
    ],
    [word, graph, graph, canvas],
    { ease: easeInOut }
  )
}

function useChipPlace(
  progress: MotionValue<number>,
  entity: Entity,
  index: number,
  box: WordBox | undefined
): Place {
  const wordX = box ? box.x + box.width / 2 : entity.graph[0]
  const wordY = box ? box.y - WORD_HEIGHT_SHIFT : entity.graph[1]
  return {
    x: useAxis(progress, index, wordX, entity.graph[0], entity.canvas[0]),
    y: useAxis(progress, index, wordY, entity.graph[1], entity.canvas[1]),
  }
}

export function useChipPlaces(
  progress: MotionValue<number>,
  boxes: Record<string, WordBox>
): Record<string, Place> {
  const [frost, region, harvest, market, roaster, cup] = ENTITIES
  return {
    frost: useChipPlace(progress, frost, 0, boxes.frost),
    region: useChipPlace(progress, region, 1, boxes.region),
    harvest: useChipPlace(progress, harvest, 2, boxes.harvest),
    market: useChipPlace(progress, market, 3, boxes.market),
    roaster: useChipPlace(progress, roaster, 4, boxes.roaster),
    cup: useChipPlace(progress, cup, 5, boxes.cup),
  }
}
