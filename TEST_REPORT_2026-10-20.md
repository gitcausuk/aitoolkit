# Test report: Release C revised (20 October 2026)

## Passed
- Main `index.html`: all six inline scripts passed `node --check` after revision.
- Main page: browser rendering and interaction test performed by loading full HTML directly into headless Chromium (not by navigating to local HTTP, which the browser environment blocks). No page-script errors in the tests.
- Home: three primary actions render; secondary Quick Check, marking and student links route to the expected content.
- Wording tool: all four AI-use approaches generate distinct, clearly labelled drafts; no separate declaration-form generator remains.
- Wording tool: user-entered permitted/excluded activities or integral-use task appear in the draft; editing and clipboard copying functioned; downloaded TXT contained the edited text, not the original template.
- Marking and setter links: revised marking content appeared, six setter requirements rendered.
- Optional resources: details can be expanded; its PDF and TXT paths exist and were checked against the extracted files.
- Desktop and 390px mobile rendering: no recorded runtime exceptions; no horizontal document overflow at 390px in the test harness.
- Assessment Designer: separate browser smoke test using inlined local styles and scripts. 'Load a worked example' opened the five-step workspace, populated Business and Management and the example assessment format, with no script errors. Its application files are unchanged from Release C.
- Package integrity: all files present in the original Release C archive are included; only `index.html` differs. The direct static HTML links and references to local styles/scripts/assets resolve to files in this package.

## Deployment checks still required
- A full end-to-end test at the final published URL, especially navigation into the separate Assessment Designer and returning to the Toolkit. Localhost and fictitious hosted URL navigation are blocked by this testing environment, so inlined browser tests were used instead.
- Live PDF and DOCX file-upload tests within the Designer: these functions use external pdf.js and Mammoth libraries from cdnjs and were not tested successfully in the local inlined environment. Pasting brief text is available without these upload libraries.
- Complete keyboard and screen-reader audit, visual inspection of loaded web-fonts and logo, and verification of *all* external Oxford links in the deployed environment. Source pages and publishing requirements can change.

**Release status:** Revised static-site package, interaction-smoke-tested. Not a certification of full deployment reliability or institutional approval.
