# AI Designer

A static, browser-based web app that helps faculty redesign assessments across disciplines. It is designed to sit beside the Oxford AI Toolkit and deploy on GitHub Pages.

## What the app does

- Accepts an existing assessment brief through paste or local file upload.
- Reads PDF, DOCX, TXT, Markdown, HTML and RTF files in the browser.
- Prompts for discipline, learning outcomes, intended judgement, evidence, AI permissions and practical constraints.
- Suggests a draft Toolkit permission level for local review, or carries forward the user’s selected local/draft level: Not Permitted, Limited, Open or Integral. These are drafting aids, not an approved University taxonomy.
- Applies VIVA through qualitative review indicators: Valid, Inclusive, Visible and Accountable.
- Uses a reference list of 40 commonly used assessment formats. Format names and conventions vary by department; the list is a starting point, not a fixed taxonomy, and can be aligned with departmental format lists and competence frameworks as these are agreed.
- Produces three design routes, a revised brief, marking criteria, AI wording, a declaration and an implementation checklist.
- Exports a formatted Word-compatible document, Markdown, JSON inputs or a printable report.
- Produces an optional structured prompt for deeper work in an approved institutional AI tool.

## Privacy model

The application has no backend. Files are processed in browser memory and are not uploaded by the app. Pinned PDF.js and Mammoth versions are loaded from a public content delivery network and restricted by the page content-security policy. For an Oxford production deployment, self-host these libraries after information security and accessibility review.

Do not add identifiable student work, unreleased examination material, confidential research or restricted information.

## Deploy on GitHub Pages

1. Copy the complete `assessment-designer` folder into the root of the Oxford AI Toolkit repository.
2. Keep the app entry file at `assessment-designer/index.html`.
3. Link to `assessment-designer/` from the main Toolkit site.
4. Commit and push. GitHub Pages will publish the app at the Toolkit site under `/assessment-designer/`.

The links back to the Toolkit use relative paths and will work in that folder structure.

## Local testing

Run a simple local server from the folder above the app:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/assessment-designer/
```

PDF extraction may not work when the file is opened directly with a `file://` URL. Use a local server or GitHub Pages.

## Important production checks

- Confirm current University policy and local guidance before release.
- Complete a keyboard, screen-reader and mobile accessibility review.
- Self-host third-party JavaScript libraries if required.
- Review whether public-CDN document readers and Google Fonts meet the intended deployment’s information-security and privacy requirements; self-host approved dependencies where required.
- Confirm the wording used to map the Toolkit's four practical levels to local category language.
- Conduct a cross-divisional pilot before representing the tool as University-wide or officially endorsed.


## Method transparency

The application uses deterministic JavaScript rules, keyword matching and editable templates. PDF parsing disables dynamic evaluation as a defence-in-depth control. It does not call a generative AI model. Qualitative VIVA indicators show whether relevant design information was supplied, suggested or still needs local review. Permission suggestions and exposure labels are heuristics for discussion, not probabilities, validated measures or approval decisions. Marking weights are fixed illustrative defaults that users must adapt locally.
