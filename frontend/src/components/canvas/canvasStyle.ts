import type { StylesheetJson } from 'cytoscape'
import { tokenValue } from './inkColors'

/** Three sizes only, so size reads as "hub, connected, leaf" rather than a number. */
export function sizeFor(degree: number): number {
  return degree >= 15 ? 30 : degree >= 5 ? 22 : 15
}

// A map's look: ink dots ringed with paper so edges stop short of them, labels on a paper halo,
// pencil lines, and a route drawn in ink.
export function canvasStyle(): StylesheetJson {
  const page = tokenValue('--page')
  const fg = tokenValue('--fg')
  const subtle = tokenValue('--fg-subtle')
  const faint = tokenValue('--fg-faint')
  const font = getComputedStyle(document.body).fontFamily

  return [
    {
      selector: 'core',
      style: {
        'active-bg-color': fg,
        'active-bg-opacity': 0,
        'active-bg-size': 0,
        'outside-texture-bg-color': page,
        'outside-texture-bg-opacity': 0,
        'selection-box-color': fg,
        'selection-box-opacity': 0.06,
        'selection-box-border-color': fg,
        'selection-box-border-width': 1,
      },
    },
    {
      selector: 'node',
      style: {
        shape: 'ellipse',
        width: 'data(size)',
        height: 'data(size)',
        'background-color': 'data(color)',
        'border-width': 2,
        'border-color': page,
        label: 'data(name)',
        'font-family': font,
        'font-size': 11,
        'font-weight': 600,
        color: fg,
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'text-wrap': 'ellipsis',
        'text-max-width': '140px',
        'text-background-color': page,
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
        'min-zoomed-font-size': 8,
        'overlay-opacity': 0,
        'transition-property': 'background-color, border-color, border-width, opacity',
        'transition-duration': 200,
      },
    },
    {
      selector: 'node.ghost',
      style: {
        'background-color': 'data(field)',
        'border-width': 1,
        'border-style': 'dashed',
        'border-color': 'data(color)',
        color: subtle,
        'font-weight': 400,
      },
    },
    {
      selector: 'node:selected',
      style: { 'outline-width': 1.5, 'outline-color': fg, 'outline-offset': 1.5 },
    },
    // Linked to nothing else on the canvas: still there, but out of the way of what connects.
    { selector: 'node.loose', style: { opacity: 0.38 } },
    { selector: 'node.loose:selected', style: { opacity: 1 } },
    { selector: 'node.dim', style: { opacity: 0.16 } },
    { selector: 'node.hidden', style: { display: 'none' } },
    {
      selector: 'edge',
      style: {
        width: 1,
        'line-color': faint,
        'curve-style': 'bezier',
        // Relations between the same two entities fan out wide enough to tell apart.
        'control-point-step-size': 44,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': faint,
        'arrow-scale': 0.6,
        'font-family': font,
        'font-size': 9,
        color: subtle,
        'text-rotation': 'autorotate',
        'text-background-color': page,
        'text-background-opacity': 0.85,
        'text-background-padding': '1px',
        'min-zoomed-font-size': 9,
        'overlay-opacity': 0,
      },
    },
    // A proposal's edges say how each ghost would join, so it's clear what it is before it's added.
    {
      selector: 'edge.ghost',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [4, 3],
        label: 'data(name)',
        'font-size': 8,
        color: faint,
      },
    },
    // A relation's name shows only where the eye already is: around the hovered node or a route.
    { selector: 'edge.lit', style: { label: 'data(name)', 'line-color': subtle } },
    {
      selector: 'edge.route',
      style: {
        label: 'data(name)',
        width: 2.5,
        'line-color': fg,
        'target-arrow-color': fg,
        color: fg,
        'z-index': 10,
      },
    },
    { selector: 'edge.dim', style: { opacity: 0.06 } },
  ]
}
