import { Swatch } from '@/components/deck'
import { inkFor } from '@/design/inks'
import { useExtractionSettings } from '@/hooks/useSpaces'
import type { ArticleDetail } from '@/types'
import { extractedWithOtherSettings } from '../header/extractionPreview'
import { formatDate, typeName } from '../spaceText'

const term = 'pt-0.5 text-fg-subtle'

export function ArticleExtraction({
  spaceId,
  article,
}: {
  spaceId: string
  article: ArticleDetail
}) {
  const current = useExtractionSettings(spaceId).data
  const { extraction_preset: preset, extraction_labels: labels } = article
  const strict = article.extraction_strict_labels ?? false
  // Articles extracted before the settings were recorded have nothing to show.
  if (!labels) return null

  const mode = preset ? (current?.presets.find((p) => p.key === preset)?.name ?? preset) : 'Ogólny'
  const outdated = current && extractedWithOtherSettings(article, current)

  return (
    <section aria-label="Ustawienia ekstrakcji" className="space-y-3 text-sm">
      <h3 className="text-xs font-semibold text-fg-muted">
        Wyodrębniono{article.processed_at && ` ${formatDate(article.processed_at)}`}
      </h3>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5">
        <dt className={term}>Tryb</dt>
        <dd className="pt-0.5 font-semibold text-fg">{mode}</dd>
        <dt className={term}>Etykiety</dt>
        <dd>
          <ul className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 border border-line-soft bg-surface px-2 py-0.5 text-fg-soft"
              >
                <Swatch color={inkFor(label).color} />
                {typeName(label)}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-fg-subtle">
            {strict
              ? 'Tylko te: byty z inną etykietą zostały pominięte.'
              : 'Jako podpowiedź: model mógł dobrać także inne.'}
          </p>
        </dd>
      </dl>
      {outdated && (
        <p className="border-l-2 border-fg-faint pl-3 text-xs text-fg-muted">
          Przestrzeń ma teraz inne ustawienia. Artykuł przejmie je po ponownym przetworzeniu.
        </p>
      )}
    </section>
  )
}
