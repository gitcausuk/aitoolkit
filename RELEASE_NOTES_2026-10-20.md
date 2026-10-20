# Oxford Saïd AI Toolkit: Release C revised
20 October 2026

## Purpose of this revision
A narrowly scoped reduction of duplication and ambiguous workflow on the home page and Teaching and assessment page. This package is based on the *Release C Complete* source. It is not the separate Release D draft.

## Changes to `index.html`
- Reduced the home page to three primary actions: Assessment Designer, setter requirements, and writing AI-use instructions. Quick Check, marking, students, official links and research are secondary.
- Removed the redundant course-team recipe, while keeping the assessment-design principle and University / CTL / Toolkit distinction.
- Replaced the paired instruction/declaration generator with a single **editable AI-use instruction draft**. All four existing permission options remain, using the CTL-inspired vocabulary. Fields for explicitly permitted/excluded activities, or integral-use tasks, keep drafts more specific.
- Removed the separate declaration-form output and any generated student declaration wording. Users are told to follow the locally prescribed declaration format.
- Made the generated instruction draft directly editable before copy or text download. Changing the selected approach clears the previous draft, avoiding stale outputs.
- Shortened marking guidance to published criteria, declaration context, checkable concerns and existing referral routes. This is not a new marking or misconduct policy.
- Collapsed the 40-format guide, Assessment Playbook, VIVA reference and CTL link into one optional section. Search deep-links to the guide open that section.
- Updated the Oxford student guidance link to the direct University page on safe and responsible GenAI use.
- Made the home-page Designer link a standard accessible hyperlink opening a new tab, consistent with the Teaching page.
- Updated internal search entries to describe the revised wording and marking tools.

## Unchanged
The Assessment Designer, format dataset, PDF and text resources, accessibility and privacy pages, brand assets, typography assets and footer remain byte-for-byte identical to the original Release C package. No externally hosted website has been overwritten. Existing local requirements still take precedence.

## Deployment
Unzip the whole archive into the root of the desired static site, preserving its folder structure. For GitHub Pages, place the extracted files in the published directory so `index.html`, `assessment-designer/` and `assets/` are all present at their original relative paths. Deploy only after checking the site in its target hosting environment. Do not upload only `index.html`.
