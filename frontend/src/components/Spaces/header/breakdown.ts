// Beside the map a legend keeps to one line: its type shrinks with the cell down to 10px, and
// items that still don't fit wrap out of the line-high box, whole ones at a time.
export const breakdown =
  'hidden @xl:[@media(min-height:50rem)]:flex beside-map:flex! beside-map:h-5 beside-map:flex-wrap beside-map:items-center beside-map:overflow-hidden beside-map:whitespace-nowrap beside-map:gap-x-[0.7em] beside-map:[&>li]:gap-[0.4em] beside-map:text-[clamp(10px,4.4cqi,14px)]'
