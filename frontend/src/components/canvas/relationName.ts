/** A relationship type as people read it: `ZAGRAL_W` becomes "zagrał w". */
export function relationName(type: string): string {
  return type.toLowerCase().replaceAll('_', ' ')
}
