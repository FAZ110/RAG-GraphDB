# Motion

Everything that moves uses one of four springs from `springs.ts`, modelled on Apple's: critically
damped, no bounce unless a gesture threw the thing.

| Spring    | Looks settled | Bounce | For                                                          |
| --------- | ------------- | ------ | ------------------------------------------------------------ |
| `quick`   | 200 ms        | 0      | tab indicators, pages settling, swapped text, rows unfolding |
| `base`    | 280 ms        | 0      | modals, popovers, inline questions, list reordering          |
| `panel`   | 360 ms        | 0      | drawers, columns opening, a modal resizing                   |
| `release` | 300 ms        | 0.15   | only after a drag or flick, where momentum carries it        |

Leaving takes 0.8 of arriving (`EXIT_SHARE`); opacity takes 0.6 of the move it rides on
(`EFFECT_SHARE`), so content reads before it lands.

## In Motion

- A preset, spread on a `motion.*` element: `fade`, `pop` (modal, popover), `reveal` (height),
  `swap` (one state turning into another; use `AnimatePresence mode="popLayout"`), `replace` (an icon becoming another), `slideFromEnd`, `coverFromEnd` (a strip sliding over a row from the control at its end)
  and `arrive` (a page switched to).
- Anything else: `transition={move.quick}` toward a visible state, `leave.quick` toward removal.
  `staggerDelay(i)` spaces out items entering together.

## In CSS

`installMotionCss()` (called in `main.tsx`) writes the same springs as `--motion-<name>` durations
and `--ease-<name>` `linear()` curves. Use them through the utilities: `transition-transform
spring-quick`, `transition-[width] spring-panel`, or with tw-animate, `data-open:animate-in
data-open:spring-panel data-closed:animate-out data-closed:spring-panel-out`. Under reduced motion
they are 0s. `deck-press` goes down in `--motion-press` and springs back; `press-shrink` does the
same for controls without a deck shadow, by scaling to 0.97.

## Rules

- No numbers in components: a duration, curve or delay comes from here.
- Never `mode="wait"`: the old state leaves while the new one arrives.
- Pages, spaces and tabs switch at once, as in a tab bar, sidebar or segmented control, and the
  highlight showing where you are slides there. Never fade switched-to content in: the screen
  would blank for its first frames. Only a page settles 16 px in from its side of the rail
  (`arrive`), opening at its top; spaces and tabs just swap. Two pages in view at once jump.
  Load ahead instead, e.g. `usePrefetchSpace` on pointing.
- Moves that run while something heavy mounts animate a `transform` string, which stays on the
  compositor; `x`/`y` are computed on the main thread.
- Nothing grows from `scale(0)`; modals scale from their centre, popovers from their trigger.
- Colour and hover changes keep Tailwind's default `transition-colors`; `hover:` already applies
  only to devices that hover.
- Nothing animates on a keyboard shortcut or on things done hundreds of times a day.
- Reduced motion: `MotionConfig reducedMotion="user"` drops movement and keeps fades; the CSS
  tokens drop to 0s.
- Ambient motion (slow backdrop tints, loading pulses, spinners, decorative loops on the landing)
  is outside the springs and stays subtle.
