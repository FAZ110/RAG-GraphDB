import type { LoadedNode } from '../../../types';
import { COLOR_PALETTE, DEFAULT_COLOR } from './constants';
import { hslToHex } from './color';

const MAX_GENERATED = 720;

function generatedColor(index: number): string {
  const hue = Math.round((index * 137.508) % 360);
  return hslToHex(hue, 65, 50);
}

function nextFreeColor(used: ReadonlySet<string>): string {
  for (const color of COLOR_PALETTE) {
    if (!used.has(color)) return color;
  }
  for (let i = 0; i < MAX_GENERATED; i += 1) {
    const color = generatedColor(i);
    if (!used.has(color)) return color;
  }
  return DEFAULT_COLOR;
}

export function buildLabelColorMap(cached: Iterable<LoadedNode>): Record<string, string> {
  const colorMap: Record<string, string> = {};
  const used = new Set<string>();

  for (const node of cached) {
    if (node.label in colorMap) continue;
    const color = nextFreeColor(used);
    colorMap[node.label] = color;
    used.add(color);
  }

  return colorMap;
}