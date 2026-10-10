# Check an assessment for AI: October 2026 revision

Scope: one journey, `assessment-redesign/` (Check an assessment for AI). No other page,
stylesheet, logo, PDF or accessible text was changed. Nothing was deployed.

Files changed:

- `assessment-redesign/index.html`: intro wording, step 1 field label and hint, two empty containers in step 3, one sentence on the CTL categories
- `assessment-redesign/assets/library.js`: source labels (`BASIS`), the policy record, the decision path
- `assessment-redesign/assets/engine.js`: `decide()`, each check now carries its source, formative variant, source lines in the text and Word exports
- `assessment-redesign/assets/app.js`: renders the policy record, the decision path and the source labels; keyboard focus handling
- `assessment-redesign/assets/redesign.css`: styles for the new components, using only the existing tokens
- `assessment-redesign/tests/engine.test.js`: three new checks (11 in total)

## Before and after

### 1. The opening question

**Before.** The intro said "Paste a brief you set. In about 15 minutes, see what it can still
tell you about student learning…". The question the tool answers was never stated outright,
and nothing said what it does *not* answer. Step 1 asked "Is this assessment
Summative/Formative" but the answer was stored and never used.

**After.** The intro states the one question in bold: *if students can use generative AI, will
this assessment still show you what each student has learned, and what is the smallest change
that would help?* A second line says what the tool does not do: decide what University policy
permits, or approve a change. Step 1 now says what to paste and why. The status field reads
"Summative or formative?" with a hint explaining that it changes the checks shown. The answer
is now used: a formative brief gets a formative note in step 3 and in the pack, in place of
the summative policy checks.

### 2. A decision path for the AI position

**Before.** Step 3 offered four radio buttons (Not allowed, Allowed for some purposes,
Required, Not sure yet) and no help choosing. "Not sure yet" carried the person through to a
pack whose AI wording they had not actually chosen.

**After.** Step 3 adds "Not sure which position fits? Answer up to four questions". The
questions come one at a time, and the first "yes" settles the outcome:

1. Has your department or programme already set the AI position? Yes: use that position and their wording.
2. Is using or evaluating AI part of what the assessment is meant to assess? Yes: suggests *Required*.
3. For the outcome that matters most (named from step 2), must students work without AI help? Yes: suggests *Not allowed*.
4. Could AI help with specific parts you can name without doing that work? Yes: suggests *Allowed for some purposes*. No: no single position stands out, so keep "Not sure yet", compare the options, and talk to the course director.

Each outcome shows its reason and source. Questions 2 to 4 quote the playbook's "Four
practical permission levels" word for word, along with the playbook's note that these are
toolkit categories, not University-wide labels. "Use this position" selects the matching radio
button. If you change an earlier answer, the later answers clear. The reason goes into the
pack summary ("Why: …") and into both exports, so a course director can see how the position
was reached. People who already know their answer can skip the questions and choose directly.

### 3. Where each piece of policy guidance comes from

**Before.** The pack's "Before you use this" section mixed four kinds of statement with no
labels. A link to the policy sat beside unattributed advice such as "Do not rely on
AI-detection tools as evidence" and "Do not apply a blanket penalty", so a reader could not
tell policy from Toolkit opinion. The CTL category names had no check date.

**After.** Every check carries one of five labels with a one-line explanation and, where one
exists, a link:

| Label | Means | Used for |
|---|---|---|
| University policy | Read the live page; the tool does not restate it | Confirm the permission is stated as policy requires; the formative note |
| Toolkit summary of University policy | Repeats what the main Toolkit already says, with the policy page's dates (last updated 27 October 2025, checked 5 September 2026) | Position set by the applicable process, in writing, in advance; detection tools |
| Toolkit design guidance | Playbook v2.3, with the quoted sentence | Publish wording with the brief; plan for agreed adjustments |
| Toolkit suggestion | This tool's advice, not a requirement | No blanket penalty for permitted, declared use |
| Local decision | Only the department or approval route can answer | Approval and local wording questions |

Step 3 now opens with "Before you choose: who sets the AI position". It quotes the main
Toolkit's existing summary verbatim, with its source and dates. The detection-tool item now
matches the main Toolkit's wording ("unless current University guidance confirms that a tool
has been endorsed") and has moved from "Suggestions" to "Oxford policy", labelled as a Toolkit
summary. The CTL category sentence now says the names are "as recorded by the Toolkit review
on 5 September 2026". In the text and Word exports, Toolkit-internal links appear as names
rather than relative URLs, which would not work outside the site.

**No new Oxford policy was written.** Every policy-like sentence is either a pointer to the
live page or a verbatim repeat of text already in the main Toolkit (`index.html`, "Can students
use AI for a take-home essay?" and the marking guidance). A test fails if the policy record
stops matching the main Toolkit, or if a playbook quote stops matching the playbook text.

### Not changed

The steps, option selection, ratings, costs, marking reweighting, tracked-change Word output,
branding, colours, fonts and the shared stylesheet are all unchanged.

## Test results (10 October 2026)

Run against a local server in headless Chromium (Playwright 1.56). For comparison, the same
script was also run on the unmodified version from commit `274b789`.

### Unit tests

`node assessment-redesign/tests/engine.test.js`: **11 of 11 pass.** That is the original 8 plus
three new checks: the decision path's order and outcomes; playbook quotes and the policy record
matching their sources word for word; and every check having a source label, with the
formative variant appearing only for formative briefs.

### Keyboard (desktop, 1280 px, keyboard only)

All 14 steps pass:

- The first Tab reaches the skip link, and Enter moves to the main content.
- The example brief loads, and Continue moves focus to each step heading (steps 2 to 5).
- Tab reaches decision question 1. Arrow keys and Space answer it, and focus stays on the chosen answer after the next question appears.
- Tab moves from each question to the next.
- The outcome is announced in a polite live region.
- "Use this position" selects the matching AI radio button and moves focus to it.
- Changing question 1 clears the later questions.
- New links and buttons show the existing 3 px focus outline. The new Yes/No options now show the same outline.
- **Fixed in this journey:** the scrollable revised-brief preview could not be reached by keyboard (axe `scrollable-region-focusable`, present before this revision). It is now a focusable, labelled region.
- **Not changed:** the site-wide `input:focus { outline: none }` rule in the shared stylesheet leaves the existing radio buttons with only a faint ring. It applies across the Designer and is outside this scope.

### Mobile (320 px and 375 px, touch)

- At 375 px there is no horizontal scrolling on any step.
- Yes/No targets are 44 px tall.
- Tapping through the decision path to "Use this position" selects the right radio button.
- The formative note appears in step 3 and in the pack.
- **Problem present before this revision, not fixed:** at 320 px the shared header's "Explore the design logic" button overflows to 367 px, on every step, before and after this revision. It comes from the shared header styles, so it was left alone. A fix would mean letting `.header-actions` wrap in `assessment-designer/assets/styles.css`, which would also change the Designer.

### Contrast

- axe-core 4.10.2 (WCAG 2.0/2.1/2.2 A and AA rules) on steps 2, 3 and 5: **0 violations** after this revision. Before: 1 (the brief preview, fixed above).
- Computed text contrast for all 33 new text and colour combinations: lowest 5.32:1 (muted text on the green-tint guidance label background). All meet 4.5:1. The source labels use navy on white, navy on cream, teal on teal tint, and dark text on cream, all from existing tokens.

### Links

- **Internal links (all return 200):** `../#checker` and `../#faculty_marking` open the right Toolkit sections ("Data and privacy check", where the scenario cards are, and "Teaching and assessment"). `../oxford-ai-assessment-playbook-v2-3.pdf`, `../accessible/oxford-ai-assessment-playbook-v2-3.txt`, `../assessment-design-lab/index.html`, `../accessibility.html`, `../website-policies.html`, `../#home` and `../#teaching` also work.
- **New-tab links:** all have `rel="noopener noreferrer"`. The new ones also announce "(opens in a new tab)" to screen readers, so the journey's unsaved state is not lost.
- **External links (ox.ac.uk, ctl.ox.ac.uk):** could not be opened, because this sandbox blocks those hosts. They are the same URLs the Toolkit already uses and are unchanged. **Check them live before release.**
- `mailto:` was not opened.

### Not done

- No screen-reader or real-device testing.
- The live policy and CTL pages were not re-checked, because the network was blocked. The dates shown are the Toolkit's existing check dates.
- No institutional accessibility audit.

Console: the only errors are Google Fonts requests blocked by the page's own
`connect-src 'none'` policy, before and after this revision. Fallback fonts render.
