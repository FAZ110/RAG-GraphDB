import type { NodeResult } from '../../../types';
import { COLOR_PALETTE } from './constants';

function generatedColor(index: number): string {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue}, 65%, 50%)`;
}

export function buildLabelColorMap(nodes: NodeResult[]): Record<string, string> {
  const counts = new Map<string, number>();
  for (const n of nodes) {
    counts.set(n.label, (counts.get(n.label) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const colorMap: Record<string, string> = {};
  for (const [i, [label]] of sorted.entries()) {
    colorMap[label] = COLOR_PALETTE[i] ?? generatedColor(i - COLOR_PALETTE.length);
  }

  return colorMap;
}