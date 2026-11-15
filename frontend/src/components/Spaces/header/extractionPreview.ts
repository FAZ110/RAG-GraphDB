import { toIdentifier } from '@/lib/text'
import type { Article, ExtractionSettings } from '@/types'

export const splitLabels = (value: string) => value.split(',').map(toIdentifier).filter(Boolean)

interface Form {
  preset: string | null
  /** As typed: comma-separated. */
  labels: string
  strict: boolean
}

/** The prompt the model would get for the form's values, cut where the parts that follow the form go. */
export function previewPrompt(saved: ExtractionSettings, form: Form) {
  const rules = saved.presets.find((p) => p.key === form.preset)?.rules
  const typed = splitLabels(form.labels)
  // Empty labels fall back to the default set on the server.
  const labels = (typed.length ? typed : saved.domains[0].labels).join(', ')
  // The template is: text {label_rule} text {scope} text; the rule is: text {labels} text.
  const [beforeRule, beforeScope, afterScope] = saved.prompt.user.split(/\{label_rule\}|\{scope\}/)
  const labelRule = form.strict ? saved.prompt.strict_label_rule : saved.prompt.label_rule
  const [ruleStart, ruleEnd] = labelRule.split('{labels}')
  return {
    beforeRule,
    ruleStart,
    labels,
    ruleEnd,
    beforeScope,
    scope: rules ? saved.prompt.scope.replace('{rules}', rules) : null,
    afterScope,
    // The domain is not stored: it is whichever ready set the labels currently equal.
    domain: saved.domains.find((d) => d.labels.join(', ') === labels)?.key,
  }
}

type Extracted = Pick<
  Article,
  'extraction_preset' | 'extraction_labels' | 'extraction_strict_labels'
>

/** Whether the space's settings have moved on since the article's graph was extracted. */
export function extractedWithOtherSettings(
  article: Extracted,
  current: Pick<ExtractionSettings, 'preset' | 'labels' | 'strict_labels'>
): boolean {
  return (
    current.preset !== article.extraction_preset ||
    current.strict_labels !== (article.extraction_strict_labels ?? false) ||
    current.labels.join() !== (article.extraction_labels ?? []).join()
  )
}
