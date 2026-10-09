---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/components/Shell.tsx"]
---

# Admin portal (whole app shell and all routes)

Scope: the entire RINAZ STUDIO admin, every route under `src/pages`, plus the shell. Visitor mode: Operate.

Audience and job: RINAZ staff (owner, operations, content, finance, concierge) running daily store work on desktop and phone. Requirements source: the client's "E-commerce Admin / CMS Portal Requirements" PDF (all 16 modules, the dashboard KPI groups and the navigation tree in section 4), plus Appointments for the bridal salons.

Constraints: currency, tax regime and payment gateway are undecided and must stay configurable. All operational data is placeholder.

## Direction contract

THESIS: Every process in the house is measured along a tailor's tape: order stages, the salon day, stock against its reorder point, a coupon against its limit. Refuses the category default of floating white KPI cards, a blue accent and generic progress bars.

OWN-WORLD: Black lacquer rail (#121110) holding the RINAZ wordmark in Cinzel caps; cool pattern-paper white work ground, never cream; ink text; tape gold (#E2B13C) reserved for the tape and the active position only; one oxblood for critical. Hanken Grotesk for UI, JetBrains Mono tabular for references and figures. 1px rules, no shadows, square-ish 4px controls. Product photography is the only full colour.

STORY: Staff open the admin and see what needs them before totals; every record has one reference set the same way; actions sit where the record is.

FIRST VIEWPORT: Black rail left (desktop) / bottom tab bar plus menu (phone). Dashboard header with the date and live visitors; "Needs you" strip of decision counts first; a KPI band whose figures each sit over a gold tape marking progress to today's target; revenue chart; today's salon appointments drawn on an hour tape across London, Dubai, Doha, Lahore.

FORM: The Atelier Tape, position 3 on my ordered list, seed key c226ab43. Signature move: the tape (gold band, black inch ticks, black pin at the current position) for progress and time. Raised by: gold reserved for active position (orienteering); 1px rules and marks-as-states (reference setting); one stable reference per record (catalog sleeve); photography as the only colour (title wall); live rows update in place (split-flap).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
