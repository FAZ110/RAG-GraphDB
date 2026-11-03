import type { ActivityDay } from '@/types/home'

export const WEEKS = 20
const DAY_MS = 24 * 60 * 60 * 1000

export interface CalendarDay {
  key: string
  date: Date
  /** Articles added and analyses edited that day. */
  work: number
  entities: number
  future: boolean
}

// shortcut: the server counts days in UTC, so near midnight a day can land on its neighbour; pass the time zone if that matters.
const dayKey = (date: Date) => date.toISOString().slice(0, 10)

/** WEEKS columns of Monday to Sunday, the current week last. */
export function calendar(activity: ActivityDay[], now: Date): CalendarDay[] {
  const byDay = new Map(activity.map((d) => [d.day, d]))
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY_MS
  const start = monday - (WEEKS - 1) * 7 * DAY_MS
  return Array.from({ length: WEEKS * 7 }, (_, i) => {
    const date = new Date(start + i * DAY_MS)
    const day = byDay.get(dayKey(date))
    return {
      key: dayKey(date),
      date,
      work: (day?.articles ?? 0) + (day?.analyses ?? 0),
      entities: day?.entities ?? 0,
      future: date > today,
    }
  })
}

/** 0 for an empty day, then 1–4 by the share of the busiest day. */
export function level(work: number, busiest: number): number {
  return work === 0 ? 0 : Math.max(1, Math.ceil((work / busiest) * 4))
}

/** The entity count at the end of each past day, from today's total backwards. */
export function growth(days: CalendarDay[], total: number): number[] {
  const past = days.filter((d) => !d.future)
  let count = total
  const counts: number[] = []
  for (let i = past.length - 1; i >= 0; i--) {
    counts.push(count)
    count -= past[i].entities
  }
  return counts.reverse()
}
