import { relationName } from '@/components/canvas/relationName'
import { pluralForm, RELATIONSHIP_FORMS, typeName } from '@/components/Spaces/spaceText'

/** How many different entities a sought node must be linked to, by a relationship and of a
 * type when given: "co najmniej 2 powiązania „grał dla” z encjami typu Klub". */
export interface LinkCount {
  min: number
  type: string | null
  label: string | null
}

/** "4 powiązania „grał dla” z encjami typu Klub": a number of links of the condition's kind. */
export function countedText({ type, label }: LinkCount, n: number): string {
  return [
    `${n} ${pluralForm(n, RELATIONSHIP_FORMS)}`,
    type ? `„${relationName(type)}”` : '',
    label ? `z encjami typu ${typeName(label)}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** The condition read out: "ma co najmniej 2 powiązania „grał dla” z encjami typu Klub". */
export const countText = (count: LinkCount) => `ma co najmniej ${countedText(count, count.min)}`

/** The condition short, under a node's name: "≥ 2 „grał dla” · Klub". */
export function countCaption({ min, type, label }: LinkCount): string {
  const what = type ? `„${relationName(type)}”` : pluralForm(min, RELATIONSHIP_FORMS)
  return [`≥ ${min} ${what}`, label ? typeName(label) : ''].filter(Boolean).join(' · ')
}

/** What a counted number stands for beside a result: "Klub", "„grał dla”", "powiązania". */
export function countUnit({ type, label }: LinkCount, n: number): string {
  if (label) return typeName(label)
  if (type) return `„${relationName(type)}”`
  return pluralForm(n, RELATIONSHIP_FORMS)
}
