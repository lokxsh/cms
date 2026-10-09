# RINAZ STUDIO Admin: design system

Direction: **The Atelier Tape.** Every process in the house is measured along a tailor's tape. Recorded from the built app; tokens live in `src/index.css`.

## Colour
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--rail` | #121110 | #0c0b0a | Navigation rail, phone tab bar, selection bar, toasts |
| `--bg` | #f3f4f2 | #131211 | Work ground (cool pattern-paper white, never cream) |
| `--surface` | #fcfcfb | #1a1918 | Panels, tables, inputs |
| `--ink` / `--ink-2` / `--muted` / `--faint` | #161514 / #3a3935 / #666460 / #8f8d88 | #eeece7 / #cfccc5 / #a19e96 / #7a776f | Text, primary buttons |
| `--line` / `--line-strong` | #e0e1dd / #c9cac5 | #2c2b28 / #3b3a36 | 1px rules |
| `--gold` | #e2b13c | #e2b13c | **The tape and the active position only** (active nav pin, active tab underline) |
| `--bad` | #8e2f2a | #ef8a80 | Critical only: failed, refunded, sold out, destructive |

No other hues. States are **marks**: filled square = done or settled, hollow = waiting on someone, faint = in motion, dashed = requested, struck = stopped. Product photography is the only full colour.

## Type
- **Cinzel 500/600**: the RINAZ wordmark and page titles only (the storefront's own face).
- **Hanken Grotesk**: all UI text, 12–15px.
- **JetBrains Mono**, tabular: references (RZ-10430, APT-2061, SKUs), money and figures.

## Shape and depth
Controls 4px, panels 6px, status chips 3px. 1px rules everywhere; no shadows on content. Floating layers (drawers, menus, toasts) get one soft shadow.

## The signature: the tape
`Tape` and `StageTape` in `src/components/ui.tsx`, and `SalonDay` in `src/components/SalonDay.tsx`. A gold band with black inch ticks, a black pin at the current position, and a blank ticked track beyond. Used only for:
- progress against a target (dashboard KPIs, coupon uses, sell-through, stock against alert level);
- time (each atelier's day in local time, campaign windows, month elapsed);
- order fulfilment stages (Placed, Paid, Packed, Shipped, Delivered); a cancelled order breaks the tape with an oxblood rule.

## Layout
Black rail (244px) on desktop. On a phone: a top bar plus a bottom tab bar (Today, Orders, Salon, Products, More). Content max 1360px. KPI groups are one divided surface, never floating cards. Tables use 1px row rules; phone lists replace wide tables.

## Motion
One authored moment: the tape draws in (`tape-fill`, 0.9s exponential ease-out). Live rows flash once in gold-soft. Charts do not animate. Everything respects `prefers-reduced-motion`.
