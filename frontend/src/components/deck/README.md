# Deck: design system

The square, flat look of the app: white sheets framed by a line, standing off the page on a
hard offset shadow, with slate text and map inks for colour. Build new views from these
pieces instead of styling raw elements.

## Tokens (`src/styles/tokens.css`)

Raw values sit on `:root`, so a dark theme only has to redefine them. Tailwind utilities read
them through `@theme inline`.

| Group    | Utilities                                                                        | Use                                           |
| -------- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| Surfaces | `bg-page`, `bg-surface`, `bg-surface-sunken`, `bg-surface-inverse`               | page, sheets, headers/hover, dark band        |
| Text     | `text-fg`, `-soft`, `-muted`, `-subtle`, `-faint`, `-inverse(-muted)`            | strongest to faintest; on the dark band       |
| Lines    | `border-line`, `border-line-soft`                                                | frames of sheets, dividers between rows       |
| Danger   | `danger`, `danger-strong`, `danger-fg`, `danger-surface(-strong)`, `danger-line` | destructive actions, errors                   |
| Status   | `status-ok`, `-processing`, `-pending`, `-error`                                 | article extraction states                     |
| Type     | `text-display(-lg/-xl)`, `text-title`, `text-heading`, `text-figure`             | page titles, dialog titles, sections, numbers |
| Shadow   | `deck`, `deck-lg`, `deck-press` (recolour with `[--deck-shadow:…]`)              | raised sheets, overlays, pressable controls   |
| Easing   | `ease-deck` / `EASE_DECK`                                                        | every transition                              |

Map inks (`--ink-<name>` and `--ink-<name>-field`, 18 of them) colour spaces and entity types;
use them through `inkFor(id)` from `src/design/inks.ts`. Motion presets (`swapX`, `swapY`,
`slideFromEnd`, `unfold`, `enter`) are in `src/design/motion.ts`.

## Components

| Component                                 | For                                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`, `IconButton`                    | every action; variants `primary`, `secondary`, `danger`, `danger-soft`, `danger-outline`, `ghost`, `ghost-danger`, `remove`, `inverse`, `inverse-outline`; `asChild` styles a `Link` |
| `TextInput`                               | text fields; `size="display"` edits a title in its own type                                                                                                                          |
| `SearchField`, `SearchFieldButton`, `Kbd` | search with a count, a clear button or a key hint                                                                                                                                    |
| `Checkbox`                                | square checkbox with an indeterminate state                                                                                                                                          |
| `RemoveControl`                           | the ✕ at a row's end with its inline question                                                                                                                                        |
| `InlineConfirm`                           | a destructive question slid over a row                                                                                                                                               |
| `ConfirmDialog`                           | a destructive question about many things at once                                                                                                                                     |
| `DrawerContent` & co.                     | a sheet sliding in from the side                                                                                                                                                     |
| `EmptyState`                              | nothing here yet, and the way to add it                                                                                                                                              |
| `ErrorNote`                               | what went wrong, as a marked block or a line under a field                                                                                                                           |
| `Swatch`, `Legend`, `LegendItem`          | colour keys for statuses, types and inks                                                                                                                                             |
| `StatCell`, `StatFigure`                  | headline numbers with their breakdown                                                                                                                                                |
| `HighlightedText`                         | the part of a text that matched a search                                                                                                                                             |

`surface`, `focusRing` and `dashedFrame` in `styles.ts` are the class sets for a raised sheet,
keyboard focus and an outlined empty place.
