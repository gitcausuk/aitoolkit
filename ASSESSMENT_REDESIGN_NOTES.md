# Check an assessment for AI: pilot notes (4 October 2026)

## What changed

The assessment hub now has one main route: **Check an assessment for AI**
(`assessment-redesign/index.html`). A faculty member pastes a brief and works
through five screens: paste the brief, check our reading, what AI changes,
choose a change, and the redesign pack.

The Assessment Design Lab is now **Explore the design logic** and the AI Designer
is now **Full designer form**. Both sit in the hub's reference library, unchanged
apart from their titles and descriptions. The Lab's header button now points to
the new route instead of the Designer.

Files changed in the existing Toolkit:
- `index.html`: new hub section and tab order, retitled Lab and Designer sections,
  new search entries, one hub step description. Content only; no styles changed.
- `assessment-design-lab/index.html`: one header link.

Nothing else was modified. The new page uses the Designer's existing stylesheet;
`assessment-redesign/assets/redesign.css` adds layout for new components using
only the existing color, type and spacing tokens.

## How it reasons

- `assets/library.js` is the curated knowledge base: what assessments ask students
  to show, AI-use positions (framed in the three broad categories CTL illustrates),
  nine redesign patterns, and wording templates. Educational developers can edit it
  directly. Know / Judge / Do / Account, evidence kinds, risks and verification
  mechanisms live here as fields and never appear in the interface.
- `assets/engine.js` reads the brief with fixed rules, preferring the brief's own
  learning outcomes. It selects options from the library deterministically: the same
  inputs always give the same options. Constraints filter options and say what was
  hidden. Options are ordered from smallest change to largest.
- No AI model is called and nothing leaves the browser (the page's content security
  policy blocks network connections). This means the pilot can run before the data
  question for an LLM step is settled.

## Adding an approved language model later

Replace `interpretBrief()` only. It must return the same shape, and every quote it
returns must pass `quoteIsGrounded()` (appear verbatim in the brief). Selection,
comparison and wording should stay in the library. The model should not write
redesigns.

## Deliberately not in V1

New-assessment design, file upload, saving, group work, programme-level views, full
rubric regeneration, policy lookup, chat, any score or percentage, and the graph in
the main flow.

## What to check before the pilot

- Ask CTL to review `library.js` (patterns and AI wording templates).
- Confirm the policy link and CTL category language against the live pages.
- Rehearse on the actual devices; confirm the Word downloads open in the Word
  version faculty use (tracked changes are standard WordprocessingML).

## Suggested pilot measures

Time to finish; how much of screen 2 faculty corrected; how much of the pack they
edited before use; whether the assessment that went forward changed; and whether the
person who received the summary found it useful.

## Verification

`node assessment-redesign/tests/engine.test.js` runs 11 checks (3 added in October 2026, see ASSESSMENT_REDESIGN_REVISION_2026-10.md). The original 8: quotes grounded in
seven test briefs, format detection, the sample brief's outcomes, the supervised-exam
path, constraint and AI-fit adherence across 28 combinations per brief, complete
packs with weights summing to 100 for every pattern, valid Word packages containing
tracked changes, and no em or en dashes in faculty-facing text. The full flow was
also run in headless Chromium at desktop and mobile widths with no script errors.
This is not a screen-reader or institutional accessibility audit.
