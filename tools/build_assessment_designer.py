from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
index_path = ROOT / 'index.html'
text = index_path.read_text(encoding='utf-8')

# 1. Homepage deep link
text = text.replace(
    "onClick: function() { setSec('faculty_assessment_hub'); },\n        style: { background:'#fdfcfa', border:`1px solid ${C.bd}`, borderLeft:`4px solid ${C.bd2}`",
    "onClick: function() { window.__deepLinkTarget = { hubTab: 'designer' }; setSec('faculty_assessment_hub'); },\n        style: { background:'#fdfcfa', border:`1px solid ${C.bd}`, borderLeft:`4px solid ${C.bd2}`",
    1
)

# 2. Remove old redesign entries from search index while retaining rollback code.
text = re.sub(
    r"\n\s*// Redesign strategies\n\s*Object\.entries\(REDESIGN\)\.forEach\(function\(pair\) \{.*?\n\s*\}\);\n",
    "\n  // Legacy REDESIGN data retained for rollback only; not indexed.\n",
    text,
    count=1,
    flags=re.S,
)

# 3. Add Designer search entries after Playbook entry.
needle = """  add('faculty_assessment_hub', 'faculty', 'Assessment Implementation Playbook',
    'Step-by-step implementation for timed exams, take-home essays, literature reviews, case studies, presentations, group projects, problem sets, coding tasks, research proposals, dissertations.',
    'Section', { hubTab: 'playbook' });"""
addition = needle + """
  add('faculty_assessment_hub', 'faculty', 'Assessment Designer',
    'Apply VIVA to an existing assessment brief, compare draft redesign routes, develop AI permission wording, strengthen evidence of student judgement and prepare a structured draft for local academic and governance review.',
    'Section', { hubTab: 'designer' });
  add('faculty_assessment_hub', 'faculty', 'Redesign an assessment with the Assessment Designer',
    'Upload or paste an assessment brief, apply VIVA, add learning outcomes and marking criteria, and develop an AI-aware assessment design, whether direct-evidence, AI-resilient or AI-enhanced, with evidence of judgement for local review.',
    'Tool', { hubTab: 'designer' });"""
if "'Assessment Designer'," not in text:
    text = text.replace(needle, addition, 1)

# 4. Search wording and statistics.
text = text.replace(
    "Search across policy rules, Q&A scenarios, obligations, and redesign strategies.",
    "Search across policy rules, Q&A scenarios, obligations, and assessment design resources."
)
text = text.replace(
    "placeholder: 'Search policy rules, Q&A, obligations, redesign strategies\\u2026'",
    "placeholder: 'Search policy rules, Q&A, obligations, assessment design\\u2026'"
)
text = text.replace(
    "{ n: FULL_SEARCH_INDEX.filter(function(x){ return x.category==='Assessment Redesign'; }).length, l: 'Redesign strategies' },",
    "{ n: FULL_SEARCH_INDEX.filter(function(x){ return x.hubTab==='designer'; }).length, l: 'Assessment design resources' },"
)

# 5. Insert Designer tab component.
component = r'''
// ─── SECTION: ASSESSMENT DESIGNER (Faculty Assessment Hub tab) ───────────────
function AssessmentDesignerSection({ onOpenTab }) {
  const APP_URL = 'assessment-designer/index.html';
  const steps = [
    { t: 'Provide the context', d: 'Paste or upload an anonymised assessment brief, identify the intended learning and judgement, and add relevant local requirements or constraints.' },
    { t: 'Compare design options', d: 'Use VIVA, the four Toolkit permission levels and the Oxford assessment-format guidance to consider proportionate redesign routes.' },
    { t: 'Prepare a draft for review', d: 'Generate draft assessment wording, AI permissions, evidence strategies and a review checklist for discussion through the appropriate local process.' }
  ];
  const beforeItems = ['Current assessment brief','Intended learning outcomes','Existing marking criteria, where applicable','Approved assessment format','Relevant practical constraints','Applicable local requirements'];
  const producesItems = ['Alternative redesign routes','A draft revised assessment brief','Draft AI permission and declaration wording','Suggested evidence of student judgement','A VIVA review','An implementation and local-review checklist'];
  const supportLinks = [
    { l: 'Review VIVA', tab: 'viva' },
    { l: 'Open the Implementation Playbook', tab: 'playbook' },
    { l: 'Browse the Oxford 40 Formats', tab: 'resilience' }
  ];
  const cardHead = { fontSize: 13, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' };
  return React.createElement('div', null,
    React.createElement(SectionTitle, { sub: 'Apply VIVA to an existing assessment brief and generate a structured draft redesign for local academic and governance review.' }, 'Oxford AI Toolkit: Assessment Designer'),
    React.createElement(Alert, { type: 'info', title: 'A drafting tool, not an approval process' },
      'The Assessment Designer supports course teams in developing and comparing draft assessment designs. It does not determine Oxford policy, approve assessment changes, replace Examination Regulations, or replace divisional, departmental, faculty, school, programme or college processes.'
    ),
    React.createElement(Card, { style: { marginBottom: '1.25rem' } },
      React.createElement('div', { style: cardHead }, 'How it works'),
      steps.map(function(s, i) {
        return React.createElement(NumRow, { key: i, n: i + 1 }, React.createElement('div', null,
          React.createElement('div', { style: { fontWeight: 600, color: C.navy, fontSize: 14.5, marginBottom: 3 } }, s.t),
          React.createElement('div', { style: { fontSize: 13.5, color: C.muted, lineHeight: 1.65 } }, s.d)
        ));
      }),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, lineHeight: 1.65, marginTop: '0.5rem', paddingTop: '0.875rem', borderTop: '1px solid ' + C.bd } },
        'Depending on the intended learning, redesign routes may strengthen direct evidence of independent performance, integrate AI where it is educationally appropriate, or combine both. The Designer does not default to either direction; the choice remains a matter of academic judgement and local review.'
      )
    ),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16, marginBottom: '1.25rem' } },
      React.createElement(Card, null, React.createElement('div', { style: cardHead }, 'Before you begin'), beforeItems.map(function(item, i) { return React.createElement(BulletRow, { key: i }, item); })),
      React.createElement(Card, null, React.createElement('div', { style: cardHead }, 'What the Designer produces'), producesItems.map(function(item, i) { return React.createElement(BulletRow, { key: i }, item); }))
    ),
    React.createElement('div', { style: { textAlign: 'center', margin: '1.75rem 0 1.5rem' } },
      React.createElement('a', { href: APP_URL, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Open Assessment Designer (opens in a new tab)', style: { display: 'inline-block', padding: '13px 30px', background: C.gold, color: C.white, borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,33,71,0.18)' } }, 'Open Assessment Designer'),
      React.createElement('div', { style: { fontSize: 12.5, color: C.muted, marginTop: 8 } }, 'Opens in a new tab')
    ),
    React.createElement(Alert, { type: 'warn', title: 'Use appropriate information' },
      React.createElement('div', { style: { marginBottom: 8 } }, 'Begin with anonymised or already published material. Do not upload identifiable student work, personal data, unreleased examination material, confidential research or other restricted information unless the specific service and workflow have been approved for that information and purpose.'),
      React.createElement('div', null, 'The current prototype processes assessment files in the browser. Faculty remain responsible for checking the suitability of the document, service and workflow.')
    ),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: '1.25rem' } }, supportLinks.map(function(s) {
      return React.createElement('button', { key: s.tab, onClick: function() { if (onOpenTab) onOpenTab(s.tab); }, style: { padding: '9px 16px', background: C.white, border: '1px solid ' + C.bd, borderRadius: 12, fontSize: 13, fontWeight: 500, color: C.navy, cursor: 'pointer' } }, s.l);
    }))
  );
}

'''
if 'function AssessmentDesignerSection' not in text:
    text = text.replace('// ─── COMBINED: ASSESSMENT HUB', component + '// ─── COMBINED: ASSESSMENT HUB', 1)

# 6. Replace hub tabs and rendering.
text = text.replace("{ id: 'redesign',   l: 'Redesign Strategies' },", "{ id: 'designer',   l: 'Assessment Designer' },", 1)
text = text.replace("tab === 'redesign'   && React.createElement(FacultyAssessmentSection, null),", "tab === 'designer'   && React.createElement(AssessmentDesignerSection, { onOpenTab: setTab }),", 1)
old_fit = """React.createElement('strong', { style:{ color:C.tx } }, 'VIVA'), ' sets the design test; ',
        React.createElement('strong', { style:{ color:C.tx } }, 'Implementation Playbook'), ' turns it into permissions and copy-ready assessment wording; ',
        React.createElement('strong', { style:{ color:C.tx } }, 'Oxford 40 Formats'), ' is the complete format-specific reference; and ',
        React.createElement('strong', { style:{ color:C.tx } }, 'Design Ideas'), ' offers additional illustrative redesign options.'"""
new_fit = """React.createElement('strong', { style:{ color:C.tx } }, 'VIVA'), ' sets the design test; ',
        React.createElement('strong', { style:{ color:C.tx } }, 'Assessment Designer'), ' applies it to a real assessment and produces a structured draft for local review; ',
        React.createElement('strong', { style:{ color:C.tx } }, 'Design Ideas'), ' offers additional illustrative options; ',
        React.createElement('strong', { style:{ color:C.tx } }, 'Implementation Playbook'), ' explains how to implement the approach; and ',
        React.createElement('strong', { style:{ color:C.tx } }, 'Oxford 40 Formats'), ' is the complete format-specific reference.'"""
text = text.replace(old_fit, new_fit, 1)

# 7. Improve mobile handling for the five-tab hub without changing visual language.
text = text.replace(
    "style: { display:'flex', gap:0, marginBottom:'1.75rem', background:C.white, border:`1px solid ${C.bd}`, borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,33,71,0.05)' },\n      role: 'tablist',\n      'aria-label': 'Assessment sections'",
    "style: { display:'flex', gap:0, marginBottom:'1.75rem', background:C.white, border:`1px solid ${C.bd}`, borderRadius:12, overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', boxShadow:'0 1px 4px rgba(0,33,71,0.05)' },\n      role: 'tablist',\n      'aria-label': 'Assessment sections'",
    1
)
text = text.replace("flex: 1,\n        padding: '10px 4px',\n        fontSize: 12,", "flex: '1 0 128px',\n        padding: '10px 7px',\n        fontSize: 12,", 1)

# 8. Mark rollback-only legacy section explicitly.
text = text.replace('// ─── SECTION: FACULTY ASSESSMENT REDESIGN', '// ─── SECTION: FACULTY ASSESSMENT REDESIGN (rollback only, not rendered)', 1)

index_path.write_text(text, encoding='utf-8')

app_dir = ROOT / 'assessment-designer'
assets = app_dir / 'assets'
assets.mkdir(parents=True, exist_ok=True)

# Standalone HTML: correct title, privacy wording and accurate export label.
html = (app_dir / 'index.html').read_text(encoding='utf-8')
html = html.replace('<title>Oxford Assessment Designer</title>', '<title>Oxford AI Toolkit: Assessment Designer</title>')
html = html.replace('Files are processed in your browser. Nothing is uploaded by this app.', 'Assessment files are processed in your browser and are not sent to a server by this app.')
html = html.replace('>Download Word<', '>Download Word-compatible document<')
(app_dir / 'index.html').write_text(html, encoding='utf-8')

styles = r'''
:root{--navy:#002147;--navy-dark:#001530;--blue:#3a5e8c;--mist:#afc2db;--gold:#b38b2e;--gold-dark:#8d681d;--paper:#f7f6f2;--white:#fff;--ink:#1d2733;--muted:#5c6875;--line:#d9dee5;--warn:#7a4d00;--warn-bg:#fff8e8;--focus:#2f6fb0;--radius:14px;--shadow:0 8px 30px rgba(0,33,71,.09)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Roboto,Arial,sans-serif;color:var(--ink);background:var(--paper);line-height:1.55}button,input,select,textarea{font:inherit}button,a{touch-action:manipulation}.hidden{display:none!important}.visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.skip-link{position:fixed;left:12px;top:-60px;z-index:999;background:var(--navy);color:#fff;padding:10px 14px;border-radius:8px}.skip-link:focus{top:12px}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[contenteditable]:focus-visible{outline:3px solid var(--focus);outline-offset:3px}.site-header{background:var(--navy);color:#fff}.header-inner,.status-inner,.hero-inner,.workspace-inner,.results-inner,.sources-inner,.footer-inner{width:min(1180px,calc(100% - 32px));margin:auto}.header-inner{min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{display:flex;align-items:center;gap:12px;color:#fff;text-decoration:none}.brand-mark{width:40px;height:40px;border:1px solid var(--mist);border-radius:50%;display:grid;place-items:center;font-family:'Noto Serif',serif;font-size:24px}.eyebrow{display:block;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--mist)}.brand-title{display:block;font-family:'Noto Serif',serif;font-size:20px}.header-actions{display:flex;align-items:center;gap:14px}.quiet-link{color:#fff;text-decoration:none}.header-button,.primary-button,.secondary-button,.quiet-button{border-radius:10px;padding:11px 16px;border:1px solid transparent;cursor:pointer;font-weight:600}.header-button{background:#fff;color:var(--navy);text-decoration:none}.primary-button{background:var(--gold);color:#fff}.primary-button:hover{background:var(--gold-dark)}.secondary-button{background:#fff;color:var(--navy);border-color:var(--line)}.quiet-button{background:transparent;color:var(--navy);border-color:var(--line)}.compact{padding:8px 11px;font-size:13px}.status-strip{background:var(--navy-dark);color:#e7edf5;font-size:13px}.status-inner{padding:9px 0}.hero{background:linear-gradient(150deg,var(--navy-dark),var(--navy));color:#fff}.hero-inner{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:50px;align-items:center;padding:70px 0}.kicker{text-transform:uppercase;letter-spacing:.13em;font-size:12px;font-weight:700;color:var(--mist)}h1,h2,h3{font-family:'Noto Serif',Georgia,serif;line-height:1.18}h1{font-size:clamp(34px,5vw,58px);margin:.2em 0}.hero-lead{font-size:clamp(17px,2vw,21px);max-width:720px;color:#e8eef6}.hero-actions,.result-actions,.form-navigation,.nav-right{display:flex;gap:10px;flex-wrap:wrap}.privacy-line{font-size:13px;color:#d9e3ef}.hero-panel{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:28px;text-align:center}.principle-orbit{position:relative;width:240px;height:240px;margin:auto}.orbit-centre,.orbit-item{position:absolute;border-radius:50%;display:grid;place-items:center}.orbit-centre{inset:70px;background:var(--gold);font-family:'Noto Serif',serif}.orbit-item{width:64px;height:64px;background:#fff;color:var(--navy);border:2px solid var(--mist)}.orbit-item span{font-size:10px}.orbit-v{left:88px;top:0}.orbit-i{right:0;top:88px}.orbit-vis{left:88px;bottom:0}.orbit-a{left:0;top:88px}.workspace-inner{display:grid;grid-template-columns:260px minmax(0,1fr);gap:24px;padding:36px 0}.step-sidebar{position:sticky;top:18px;align-self:start;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:18px}.progress-label{display:flex;justify-content:space-between;font-size:12px}.progress-track{height:6px;background:#e7ebf0;border-radius:999px;margin:8px 0 16px}.progress-track span{display:block;height:100%;width:20%;background:var(--gold);border-radius:inherit;transition:width .2s}.step-list{list-style:none;padding:0;margin:0}.step-link{width:100%;display:flex;gap:9px;align-items:center;text-align:left;border:0;background:transparent;padding:10px;border-radius:9px;color:var(--muted);cursor:pointer}.step-link span{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#eef2f7}.step-link.active{background:#eef3f8;color:var(--navy);font-weight:600}.sidebar-note{margin-top:18px;padding:13px;background:#f6f3e8;border-radius:10px;font-size:12px}.designer-card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:clamp(20px,4vw,42px);box-shadow:var(--shadow);min-width:0}.form-step{display:none}.form-step.active{display:block}.section-heading{display:flex;gap:14px;align-items:flex-start;margin-bottom:24px}.section-number{color:var(--gold);font-weight:700;letter-spacing:.08em}.section-heading h2{margin:0 0 5px}.section-heading p{margin:0;color:var(--muted)}.field-grid{display:grid;gap:17px}.two-columns{grid-template-columns:repeat(2,minmax(0,1fr))}.full-width{grid-column:1/-1}.field{display:grid;gap:7px;font-size:14px;font-weight:600}.field input,.field select,.field textarea{width:100%;padding:11px 12px;border:1px solid #bfc7d1;border-radius:9px;background:#fff;color:var(--ink)}.field textarea{resize:vertical;min-height:100px}.choice-fieldset{border:1px solid var(--line);border-radius:12px;padding:16px;margin:20px 0}.choice-fieldset legend{font-weight:600;padding:0 7px}.choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.choice-grid label{display:flex;gap:9px;align-items:flex-start;background:#fafbfc;border:1px solid var(--line);border-radius:9px;padding:11px;cursor:pointer}.choice-grid small{display:block;color:var(--muted);margin-top:3px}.privacy-alert,.confirmation-box{background:var(--warn-bg);border:1px solid #ecd49b;border-left:4px solid var(--gold);border-radius:10px;padding:14px;margin:15px 0}.privacy-alert strong{display:block;color:var(--warn);margin-bottom:3px}.confirmation-box{display:grid;gap:10px}.confirmation-box label{display:flex;gap:9px}.upload-zone{border:2px dashed #aab5c1;border-radius:12px;padding:25px;text-align:center;margin:16px 0;display:grid;justify-items:center;gap:8px;background:#fbfcfd}.upload-zone.dragover{border-color:var(--gold);background:#fffaf0}.upload-icon{font-size:28px}.file-list{display:grid;gap:10px}.file-item,.extract-review{border:1px solid var(--line);border-radius:10px;padding:12px;background:#fafbfc}.extract-review textarea{width:100%;min-height:130px;margin-top:8px}.form-navigation{justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:22px;margin-top:28px}.results-inner{padding:42px 0}.results-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:22px 0}.metric{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}.results-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px}.results-nav{display:grid;align-content:start;gap:6px;position:sticky;top:18px}.results-nav button{border:1px solid var(--line);background:#fff;color:var(--navy);padding:11px;text-align:left;border-radius:9px;cursor:pointer}.results-nav button.active{background:var(--navy);color:#fff}.result-panel{display:none;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:clamp(20px,4vw,38px);box-shadow:var(--shadow);min-width:0}.result-panel.active{display:block}.draft-badge{display:inline-block;background:#fff3cf;color:#735000;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.editable{border:1px dashed #aab5c1;border-radius:9px;padding:12px;margin:10px 0;min-height:50px}.route-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.route-card{border:1px solid var(--line);border-radius:12px;padding:15px}.checklist{list-style:none;padding:0}.checklist li{padding:8px 0 8px 28px;position:relative}.checklist li:before{content:'□';position:absolute;left:0;color:var(--gold);font-size:20px}.sources-section{background:#fff;border-top:1px solid var(--line)}.sources-inner{padding:42px 0}.source-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.source-grid a{border:1px solid var(--line);border-radius:12px;padding:16px;text-decoration:none;color:var(--navy)}.source-grid span{display:block;color:var(--muted);font-size:13px;margin-top:4px}.source-date{font-size:12px;color:var(--muted)}footer{background:var(--navy-dark);color:#fff}.footer-inner{padding:28px 0;display:flex;justify-content:space-between;gap:20px}.footer-inner span{display:block;color:var(--mist);font-size:12px}.toast{position:fixed;right:18px;bottom:18px;background:var(--navy);color:#fff;padding:12px 16px;border-radius:10px;box-shadow:var(--shadow);opacity:0;pointer-events:none;transition:opacity .2s}.toast.show{opacity:1}
@media(max-width:900px){.hero-inner{grid-template-columns:1fr}.hero-panel{display:none}.workspace-inner{grid-template-columns:1fr}.step-sidebar{position:static}.step-list{display:flex;overflow-x:auto}.step-link{min-width:150px}.results-layout{grid-template-columns:1fr}.results-nav{position:static;display:flex;overflow-x:auto}.results-nav button{min-width:150px}.route-grid{grid-template-columns:1fr}.metric-grid{grid-template-columns:1fr}.source-grid{grid-template-columns:1fr}}
@media(max-width:640px){.header-inner{align-items:flex-start;padding:14px 0}.header-actions{display:none}.hero-inner{padding:42px 0}.two-columns,.choice-grid{grid-template-columns:1fr}.full-width{grid-column:auto}.designer-card{border-radius:10px;padding:20px 15px}.workspace-inner,.results-inner{width:min(100% - 20px,1180px)}.form-navigation{align-items:stretch}.form-navigation,.nav-right{flex-direction:column}.form-navigation button,.nav-right button,.hero-actions button{width:100%}.results-header,.footer-inner{flex-direction:column}.result-actions{width:100%}.result-actions button{flex:1 1 160px}.principle-orbit{transform:scale(.85)}.status-inner{font-size:12px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
@media print{.site-header,.status-strip,.hero,.step-sidebar,.form-navigation,.result-actions,.results-nav,.sources-section,footer,.toast{display:none!important}.results,.result-panel{display:block!important}.results-inner{width:100%;padding:0}.result-panel{box-shadow:none;border:0;padding:10px 0}.editable{border:0;padding:0}}
'''
(assets / 'styles.css').write_text(styles.strip() + '\n', encoding='utf-8')

formats = [
('ofs01','Written Exam','In-person, timed invigilated','Essays'),('ofs02','Written Exam','In-person, timed invigilated','Multiple choice questions'),('ofs03','Written Exam','In-person, timed invigilated','Short-answer questions'),('ofs04','Written Exam','In-person, timed invigilated','Problem / computational question'),('ofs05','Written Exam','In-person, timed invigilated','Unseen translation'),
('ofs06','Written Exam','Online, timed, invigilated','Essays'),('ofs07','Written Exam','Online, timed, invigilated','Multiple choice questions'),('ofs08','Written Exam','Online, timed, invigilated','Short-answer questions'),('ofs09','Written Exam','Online, timed, invigilated','Problem / computation questions'),('ofs10','Written Exam','Online, timed, invigilated','Unseen translation'),
('ofs11','Written Exam','Online, open book, timed (up to 3 hours)','Essays'),('ofs12','Written Exam','Online, open book, timed (up to 3 hours)','Short-answer questions'),('ofs13','Written Exam','Online, open book, timed (up to 3 hours)','Case study response'),('ofs14','Written Exam','Online, open book, window (2 or 3 day)','Essays'),('ofs15','Written Exam','Online, open book, window (2 or 3 day)','Short-answer questions'),('ofs16','Written Exam','Online, open book, window (2 or 3 day)','Case study response'),('ofs17','Written Exam','Online, open book, long duration (1, 2 or 3 days)','Essays'),('ofs18','Written Exam','Online, open book, long duration (1, 2 or 3 days)','Case study response'),
('ofs19','Submission','Short duration (typically 5 days to 3 weeks)','Take-away or take-home essays'),('ofs20','Submission','Short duration (typically 5 days to 3 weeks)','Case studies'),('ofs21','Submission','Short duration (typically 5 days to 3 weeks)','Practical reports'),('ofs22','Submission','Short duration (typically 5 days to 3 weeks)','Poster assessments'),('ofs23','Submission','Short duration (typically 5 days to 3 weeks)','Business plans and design proposals'),('ofs24','Submission','Short duration (typically 5 days to 3 weeks)','Translations'),
('ofs25','Submission','Long duration (typically more than 3 weeks)','Dissertation / Thesis'),('ofs26','Submission','Long duration (typically more than 3 weeks)','Extended essays'),('ofs27','Submission','Long duration (typically more than 3 weeks)','Mini-projects and structured projects'),('ofs28','Submission','Long duration (typically more than 3 weeks)','Fieldwork, site, museum and industrial visit reports'),('ofs29','Submission','Long duration (typically more than 3 weeks)','Portfolio'),('ofs30','Submission','Long duration (typically more than 3 weeks)','Research papers and articles'),('ofs31','Submission','Long duration (typically more than 3 weeks)','Business plans and design proposals'),('ofs32','Submission','Long duration (typically more than 3 weeks)','Translations'),
('ofs33','Oral, Practical and/or Performed','Practical tests and simulations','Various'),('ofs34','Oral, Practical and/or Performed','Oral presentation','In relation to a case study, research project or paper'),('ofs35','Oral, Practical and/or Performed','Viva voce and interviews','In relation to a dissertation or thesis'),('ofs36','Oral, Practical and/or Performed','Performances, exhibitions and displays','Musical performance'),('ofs37','Oral, Practical and/or Performed','Performances, exhibitions and displays','Exhibition of created work'),('ofs38','Oral, Practical and/or Performed','Objective Structured Clinical Examinations (OSCEs)','Various'),('ofs39','Oral, Practical and/or Performed','Aural examination','Various'),('ofs40','Oral, Practical and/or Performed','Oral examination','Various')]
js_items = ',\n'.join("  {id:%r,format:%r,type:%r,task:%r}" % row for row in formats)
(assets / 'oxford-formats.js').write_text("window.OXFORD_FORMATS = [\n" + js_items + "\n];\n", encoding='utf-8')

app_js = r'''
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const form=$('#designerForm'), workspace=$('#workspace'), welcome=$('#welcome'), results=$('#results');
let step=1, extracted=[];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function showStep(n){step=Math.max(1,Math.min(5,n));$$('.form-step').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===step));$$('[data-step-link]').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepLink)===step));$('#progressText').textContent='Step '+step+' of 5';$('#progressPercent').textContent=(step*20)+'%';$('#progressBar').style.width=(step*20)+'%';$('#backButton').disabled=step===1;$('#nextButton').classList.toggle('hidden',step===5);$('#generateButton').classList.toggle('hidden',step!==5);if(step===5)renderReview();window.scrollTo({top:workspace.offsetTop-10,behavior:'smooth'})}
function start(){welcome.classList.add('hidden');results.classList.add('hidden');workspace.classList.remove('hidden');showStep(1)}
$$('[data-start]').forEach(b=>b.addEventListener('click',start));$$('[data-step-link]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.stepLink))));$('#backButton').addEventListener('click',()=>showStep(step-1));$('#nextButton').addEventListener('click',()=>{const current=$('.form-step.active');const req=$$('[required]',current).find(el=>!el.checkValidity());if(req){req.reportValidity();req.focus();return}showStep(step+1)});
const format=$('#format');(window.OXFORD_FORMATS||[]).forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.format+' — '+f.type+' — '+f.task;format.appendChild(o)});const custom=document.createElement('option');custom.value='custom';custom.textContent='Custom or other format';format.appendChild(custom);
function values(name){return $$('[name="'+name+'"]:checked').map(x=>x.value)}
function data(){const fd=new FormData(form);return {department:fd.get('department')||'',division:fd.get('division')||'',course:fd.get('course')||'',level:fd.get('level')||'',cohort:fd.get('cohort')||'',status:fd.get('assessmentStatus')||'',format:fd.get('format')||'',weighting:fd.get('weighting')||'',duration:fd.get('duration')||'',title:fd.get('assessmentTitle')||'',brief:fd.get('currentBrief')||'',guidance:fd.get('localGuidance')||'',outcomes:fd.get('learningOutcomes')||'',central:fd.get('centralJudgement')||'',permission:fd.get('permission')||'unknown',independent:fd.get('independentPerformance')||'medium',capabilities:values('capability'),evidence:values('evidence'),concerns:values('concern'),constraints:values('constraint'),other:fd.get('otherConstraints')||''}}
function selectedFormat(id){return (window.OXFORD_FORMATS||[]).find(f=>f.id===id)}
function renderReview(){const d=data(),f=selectedFormat(d.format);$('#reviewSummary').innerHTML=`<div class="metric-grid"><div class="metric"><strong>Context</strong><br>${esc(d.department)} · ${esc(d.level)}</div><div class="metric"><strong>Format</strong><br>${esc(f?f.task:'Custom')}</div><div class="metric"><strong>AI position</strong><br>${esc(d.permission==='unknown'?'To be recommended':d.permission)}</div></div><p><strong>Learning outcomes:</strong> ${esc(d.outcomes)}</p><p><strong>Central judgement:</strong> ${esc(d.central||'To be clarified')}</p><p><strong>Visible evidence:</strong> ${esc(d.evidence.join(', ')||'Not yet selected')}</p>`}
function permission(d){if(d.permission!=='unknown')return d.permission;if(d.capabilities.includes('responsible AI use')||d.independent==='low')return 'integral';if(d.independent==='high')return 'not-permitted';return 'limited'}
const labels={'not-permitted':'Not Permitted','limited':'Limited','open':'Open','integral':'Integral'};
function routeText(kind,d,p){if(kind==='direct')return 'Strengthen direct evidence through application to novel material, explicit reasoning and proportionate explanation or dialogue. Process evidence supports judgement but does not prove authorship.';if(kind==='bounded')return 'Permit clearly bounded support while preserving the student’s responsibility for argument, evidence, verification and final judgement.';return 'Integrate the use, critique and verification of AI only where those capabilities are part of the intended learning.'}
function buildReport(){const d=data(),p=permission(d),f=selectedFormat(d.format),judgement=d.central||'reach and justify a disciplinary judgement aligned with the intended learning outcomes';const evidence=d.evidence.length?d.evidence:['critique','defence','application'];const policy=p==='not-permitted'?'Generative AI must not be used in preparing or producing this assessment, except for approved assistive technology or reasonable adjustments.':p==='limited'?'Generative AI may be used only for the explicitly listed support tasks. It must not generate the core analysis, argument, interpretation or final response. Any material use must be declared.':p==='open'?'Generative AI may support broad parts of the process, but the student remains responsible for the academic judgement, verification, sources, ethical use and final submission. Use must be declared.':'The use and critical evaluation of generative AI form part of this assessment. Students must follow the specified tool, evidence, verification and declaration requirements.';const status=d.guidance?'Draft complete — local review required':'Draft complete — add or confirm local requirements';return {d,p,f,judgement,evidence,policy,status,routes:[['Strengthen direct evidence',routeText('direct',d,p)],['Permit bounded AI support',routeText('bounded',d,p)],['Integrate AI into the learning',routeText('integral',d,p)]]}}
function editable(title,body){return `<h3>${esc(title)} <span class="draft-badge">Draft</span></h3><div class="editable" contenteditable="true">${body}</div>`}
function renderResults(r){$('#resultsTitle').textContent=r.d.title||'Draft assessment redesign';$('#resultsSubtitle').textContent=(r.f?r.f.format+' · '+r.f.task:'Custom assessment')+' · '+labels[r.p];$('#metricGrid').innerHTML=`<div class="metric"><strong>Status</strong><br>${esc(r.status)}</div><div class="metric"><strong>AI permission</strong><br>${esc(labels[r.p])}</div><div class="metric"><strong>Evidence emphasis</strong><br>${esc(r.evidence.join(', '))}</div>`;$('#overviewPanel').innerHTML=`<span class="draft-badge">Draft</span><h2>Design overview</h2><p>This structured draft begins with the intended learning and the judgement to be evidenced. It does not approve the assessment or determine compliance.</p><p><strong>Central judgement:</strong> ${esc(r.judgement)}</p><p><strong>VIVA review:</strong> Validity should be checked against the learning outcomes; inclusion against access, workload and reasonable adjustments; visibility through ${esc(r.evidence.join(', '))}; and accountability through explicit permissions and declarations.</p>`;$('#routesPanel').innerHTML=`<span class="draft-badge">Draft</span><h2>Three design routes</h2><div class="route-grid">${r.routes.map(x=>`<article class="route-card"><h3>${esc(x[0])}</h3><p>${esc(x[1])}</p></article>`).join('')}</div><p><strong>Academic decision:</strong> select or combine routes according to the intended learning. The Designer does not default to resistance or integration.</p>`;$('#briefPanel').innerHTML=editable('Revised assessment brief',`<p><strong>Task:</strong> ${esc(r.d.brief)}</p><p><strong>Intended learning:</strong> ${esc(r.d.outcomes)}</p><p><strong>Evidence of judgement:</strong> Students should ${esc(r.evidence.join(', '))} in relation to the task and supplied evidence.</p><p><strong>AI permission:</strong> ${esc(r.policy)}</p><p><strong>Submission expectations:</strong> ${esc(r.d.duration||'Confirm length or duration')} ${r.d.weighting?'· '+esc(r.d.weighting):''}</p>`);$('#markingPanel').innerHTML=editable('Marking and declaration',`<p><strong>Suggested criteria:</strong> quality of disciplinary judgement; use and verification of evidence; clarity of reasoning; application to the task; communication; and responsible compliance with the stated AI permission.</p><p><strong>Declaration wording:</strong> “I declare the generative AI tools used, their versions, the purposes for which they were used, and how I evaluated and verified any outputs. I remain responsible for the final submission.”</p><p>Criteria and weightings are suggestions only. Edit them locally and check that any percentages total 100%.</p>`);$('#implementationPanel').innerHTML=`<span class="draft-badge">Draft</span><h2>Implementation and local-review checklist</h2><ul class="checklist"><li>Confirm the intended learning outcomes and approved assessment format.</li><li>Check current University policy, Examination Regulations and local requirements.</li><li>Confirm accessibility, reasonable adjustments and equitable access.</li><li>State permitted, required and prohibited AI uses in writing before the assessment.</li><li>Specify the declaration format and student guidance.</li><li>Ensure any oral, staged or process component is proportionate, consistent and approved.</li><li>Remember that process evidence strengthens judgement but does not prove authorship.</li><li>Review marking workload, moderation and operational feasibility.</li><li>Complete the appropriate local approval process before use.</li></ul>`;$('#aiPromptPanel').innerHTML=editable('Optional AI enhancement prompt',`<p>Act as a critical disciplinary collaborator. Review the proposed assessment against the stated learning outcomes. Identify where AI use could support learning without replacing the central judgement. Propose one bounded-use option and one integrated-use option. For each, specify verification, student accountability, equitable access and declaration requirements. Do not make policy or approval determinations.</p>`);workspace.classList.add('hidden');results.classList.remove('hidden');window.scrollTo({top:results.offsetTop,behavior:'smooth'})}
form.addEventListener('submit',e=>{e.preventDefault();if(!form.checkValidity()){form.reportValidity();return}renderResults(buildReport())});
$$('[data-result-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-result-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-result-panel]').forEach(x=>x.classList.toggle('active',x.dataset.resultPanel===b.dataset.resultTab))}));
$('[data-action="edit"]').addEventListener('click',()=>{results.classList.add('hidden');workspace.classList.remove('hidden');showStep(5)});$('[data-action="print"]').addEventListener('click',()=>window.print());
function reportText(){return $$('.result-panel').map(p=>p.innerText.trim()).join('\n\n')}
$('[data-action="copy-report"]').addEventListener('click',()=>navigator.clipboard.writeText(reportText()).then(()=>toast('Draft report copied')));
function download(name,type,content){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('[data-action="download-md"]').addEventListener('click',()=>download('assessment-redesign-draft.md','text/markdown',reportText()));$('[data-action="download-word"]').addEventListener('click',()=>download('assessment-redesign-draft.doc','application/msword',`<html><meta charset="utf-8"><body>${$$('.result-panel').map(p=>p.innerHTML).join('<hr>')}</body></html>`));
$('#saveDraftButton').addEventListener('click',()=>download('assessment-designer-inputs.json','application/json',JSON.stringify(data(),null,2)));
function loadDemo(){start();const set=(id,v)=>{$('#'+id).value=v};set('department','Saïd Business School');set('division','Social Sciences');set('course','MBA elective');set('level','Postgraduate taught');set('cohort','60');set('format','ofs20');set('weighting','40% of course mark');set('duration','2,500 words');set('assessmentTitle','Strategic case analysis');set('currentBrief','Analyse the strategic challenge in the supplied case and recommend a course of action supported by evidence.');set('learningOutcomes','Evaluate complex evidence, apply strategic frameworks, exercise professional judgement and communicate an actionable recommendation.');set('centralJudgement','which strategic option is most defensible under uncertainty and why');set('permission','limited');set('independentPerformance','medium');['critical interpretation','analytical reasoning','professional judgement','communication'].forEach(v=>{const x=$(`[name="capability"][value="${v}"]`);if(x)x.checked=true});['critique','defence','application'].forEach(v=>{const x=$(`[name="evidence"][value="${v}"]`);if(x)x.checked=true});toast('Worked example loaded')}
$$('[data-demo]').forEach(b=>b.addEventListener('click',loadDemo));
const input=$('#fileInput'), zone=$('#uploadZone');$('#chooseFiles').addEventListener('click',()=>input.click());['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('dragover')}));['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('dragover')}));zone.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));input.addEventListener('change',()=>handleFiles(input.files));
async function extract(file){const ext=file.name.split('.').pop().toLowerCase();if(['txt','md','rtf','html','htm'].includes(ext))return await file.text();if(ext==='pdf'&&window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let out='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),c=await page.getTextContent();out+=c.items.map(x=>x.str).join(' ')+'\n'}return out}if(ext==='docx'&&window.mammoth){return (await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value}throw new Error('Text extraction is unavailable for this file type in the current browser.')}
async function handleFiles(list){for(const file of Array.from(list)){if(file.size>10*1024*1024){toast(file.name+' exceeds 10 MB');continue}const box=document.createElement('div');box.className='file-item';box.textContent='Reading '+file.name+'…';$('#fileList').appendChild(box);try{const value=(await extract(file)).trim();extracted.push({name:file.name,text:value});box.className='extract-review';box.innerHTML=`<strong>${esc(file.name)}</strong><span> — review the extracted text before using it</span><textarea aria-label="Extracted text from ${esc(file.name)}"></textarea>`;const ta=$('textarea',box);ta.value=value;ta.addEventListener('input',()=>{extracted.find(x=>x.name===file.name).text=ta.value});if(!$('#currentBrief').value.trim())$('#currentBrief').value=value}catch(err){box.textContent=file.name+': '+err.message}}}
})();
'''
(assets / 'app.js').write_text(app_js.strip() + '\n', encoding='utf-8')

favicon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#002147"/><circle cx="32" cy="32" r="20" fill="none" stroke="#afc2db" stroke-width="3"/><text x="32" y="40" text-anchor="middle" font-family="Georgia,serif" font-size="25" fill="white">O</text></svg>\n'
(assets / 'favicon.svg').write_text(favicon, encoding='utf-8')

(ROOT / 'CHANGELOG.md').write_text('''# Changelog\n\n## Assessment Designer review\n\n- Replaced the visible **Redesign Strategies** assessment-hub tab with **Assessment Designer**.\n- Added a standalone, browser-based Assessment Designer under `assessment-designer/`.\n- Added direct-evidence, bounded-AI and AI-integrated redesign routes.\n- Added all 40 Oxford summative assessment formats to the Designer selector.\n- Added editable draft outputs, declaration wording, implementation checklist and accurate export labels.\n- Remapped homepage and search routes from `hubTab: redesign` to `hubTab: designer`.\n- Removed legacy redesign items from the active search index while retaining rollback code.\n- Corrected stale search wording and added responsive horizontal tab scrolling.\n- Clarified privacy, policy, approval and authorship limitations.\n''', encoding='utf-8')

# QA checks
checks = {
'Root HTML exists': index_path.exists(),
'Designer HTML exists': (app_dir/'index.html').exists(),
'Designer CSS exists': (assets/'styles.css').exists(),
'Designer JS exists': (assets/'app.js').exists(),
'All 40 formats included': (assets/'oxford-formats.js').read_text().count("{id:") == 40,
'Five target assessment tabs': all(x in text for x in ["{ id: 'viva'", "{ id: 'designer'", "{ id: 'catalogue'", "{ id: 'playbook'", "{ id: 'resilience'"]),
'No active redesign deep link': "hubTab: 'redesign'" not in text,
'Designer deep link present': "hubTab: 'designer'" in text,
'No iframe': '<iframe' not in text.lower() and '<iframe' not in html.lower(),
'Accurate privacy wording': 'Assessment files are processed in your browser and are not sent to a server by this app.' in html,
'Accurate Word export label': 'Word-compatible document' in html,
'Responsive breakpoints present': '@media(max-width:900px)' in styles and '@media(max-width:640px)' in styles,
'Visible focus styles present': ':focus-visible' in styles,
}
failed=[k for k,v in checks.items() if not v]
report=['# QA Report','', '## Automated checks','']+[f"- [{'x' if v else ' '}] {k}" for k,v in checks.items()]+['','## Manual checks still required','', '- Open the branch preview or a local static server and complete the five-step form.', '- Test PDF and DOCX extraction in current versions of Chrome, Edge and Safari.', '- Verify the GitHub Pages path after merge.', '- Confirm the live Oxford policy links immediately before public launch.', '', '## Result', '', 'PASS' if not failed else 'FAIL: '+', '.join(failed)]
(ROOT/'QA-REPORT.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
if failed: raise SystemExit('QA failed: '+', '.join(failed))
'''

(ROOT / 'tools' / 'build_assessment_designer.py').write_text((ROOT / 'tools' / 'build_assessment_designer.py').read_text(encoding='utf-8'), encoding='utf-8')
