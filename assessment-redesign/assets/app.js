/* Oxford AI Toolkit: Check an assessment for AI. Interface. */
(function () {
  'use strict';
  const L = window.REDESIGN_LIBRARY;
  const E = window.REDESIGN_ENGINE;
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  const EXAMPLE = 'Assessment title: Strategic recommendation for a live organisational challenge\n\nStudents submit a 2,500-word individual report analysing a case organisation and making a recommendation to its senior leadership. The report should use course concepts and relevant evidence. It is worth 40% of the course mark.\n\nLearning outcomes assessed:\n1. Apply relevant theoretical frameworks to a complex organisational problem.\n2. Evaluate incomplete and conflicting evidence.\n3. Reach and communicate a defensible strategic recommendation.\n4. Consider implementation risks and ethical implications.\n\nCurrent marking criteria:\n- Understanding of course concepts: 25%\n- Quality of analysis: 35%\n- Recommendation: 25%\n- Structure and presentation: 15%';

  const state = {
    step: 1, maxStep: 1, interp: null, aims: [], priority: null,
    constraints: { keepFormat: false, noLive: false, noMarking: false, thisYear: false },
    cohort: '', aiChoice: null, finding: '', showHidden: false,
    selected: 0, options: [], chosen: null, packChoice: null, offsetWords: false, edits: {}, pack: null, aimSeq: 100
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  function go(n, focus) {
    state.step = n; state.maxStep = Math.max(state.maxStep, n);
    $$('.form-step').forEach(function (s) { s.classList.toggle('active', +s.dataset.step === n); });
    $$('.step-link').forEach(function (b) {
      const k = +b.dataset.stepLink;
      b.classList.toggle('active', k === n);
      b.classList.toggle('complete', k < n);
      b.disabled = k > state.maxStep;
      if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    if (n === 2) $$('.rd-aim-label').forEach(autosize);
    $('#progressText').textContent = 'Step ' + n + ' of 5';
    $('#progressPercent').textContent = (n * 20) + '%';
    $('#progressBar').style.width = (n * 20) + '%';
    if (focus !== false) {
      const h = $('#h-step' + n);
      $('#workspace').scrollIntoView({ block: 'start' });
      if (h) h.focus({ preventScroll: true });
    }
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  // ── Step 1 → 2 ──────────────────────────────────────────────────────────────
  function read() {
    const text = $('#briefInput').value;
    if (text.trim().split(/\s+/).filter(Boolean).length < 8) {
      $('#briefError').classList.remove('hidden'); $('#briefInput').setAttribute('aria-invalid', 'true'); $('#briefInput').focus(); return;
    }
    $('#briefError').classList.add('hidden'); $('#briefInput').removeAttribute('aria-invalid');
    state.interp = E.interpretBrief(text);
    state.aims = state.interp.aims.map(function (a) { return Object.assign({}, a); });
    state.priority = E.defaultPriority(state.aims);
    const w = $('#weightInput').value.match(/\d{1,3}/);
    if (w) state.interp.weighting = parseInt(w[0], 10);
    else if (state.interp.weighting) $('#weightInput').value = state.interp.weighting + '%';
    state.cohort = $('#cohortInput').value;
    state.status = $('#statusInput').value;
    state.aiChoice = null; state.chosen = null; state.edits = {}; state.showHidden = false;
    state.maxStep = 2;
    renderReading();
    go(2);
  }

  function renderReading() {
    const I = state.interp;
    const facts = [];
    facts.push((I.isGroup ? 'group ' : 'individual ') + (I.format === 'exam' ? 'supervised exam' : (I.format === 'live' ? 'live or presented assessment' : 'written ' + (I.product === 'submission' ? 'coursework' : I.product))));
    if (I.wordCountText) facts.push(I.wordCountText + ' words');
    if (I.weighting) facts.push(I.weighting + '% of the mark');
    let html = '<p class="rd-readas">We read this as: <strong>' + esc(facts.join(', ')) + '</strong>.</p>';
    const notes = [];
    notes.push(I.mentionsAI ? 'Your brief already mentions AI. Check the wording against the decision you make in step 3.' : 'Your brief doesn\u2019t currently say anything about AI use.');
    I.notes.forEach(function (n) { notes.push(n); });
    html += '<div class="callout"><span class="callout-title">We also noticed</span><ul class="rd-tight">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
    if (I.thin) html += '<div class="callout warning"><span class="callout-title">We couldn\u2019t find clear statements of what students should show</span>Add them below in your own words. The suggestions depend on this step more than any other.</div>';
    $('#readingNotes').innerHTML = html;
    renderAims();
    $('#constraintGrid').innerHTML = Object.keys(E.CONSTRAINTS).map(function (k) {
      return '<label><input type="checkbox" data-constraint="' + k + '"' + (state.constraints[k] ? ' checked' : '') + '><span>' + esc(E.CONSTRAINTS[k].label) + '</span></label>';
    }).join('');
  }

  function renderAims() {
    $('#aimList').innerHTML = state.aims.map(function (a) {
      const src = a.source === 'From your brief' ? 'From your brief: \u201c' + esc(trim(a.quote)) + '\u201d' : esc(a.source || 'Added by you');
      return '<li class="rd-aim' + (a.include ? '' : ' rd-off') + '" data-aim="' + a.id + '">' +
        '<input type="checkbox" class="rd-aim-check" aria-label="Include this" ' + (a.include ? 'checked' : '') + '>' +
        '<div class="rd-aim-main"><label class="visually-hidden" for="lbl-' + a.id + '">What students should show</label>' +
        '<textarea class="rd-aim-label" id="lbl-' + a.id + '" rows="1">' + esc(a.label) + '</textarea>' +
        '<small class="rd-source">' + src + '</small></div>' +
        '<label class="rd-most"><input type="radio" name="priority" value="' + a.id + '"' + (state.priority === a.id ? ' checked' : '') + (a.include ? '' : ' disabled') + '> Matters most</label>' +
        '</li>';
    }).join('');
    $$('.rd-aim-label').forEach(autosize);
  }
  function autosize(el) { if (!el.offsetParent) return; el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
  function trim(q) { return q.length > 140 ? q.slice(0, q.lastIndexOf(' ', 140)) + '\u2026' : q; }

  // ── Step 2 → 3 ──────────────────────────────────────────────────────────────
  function toStress() {
    const inc = state.aims.filter(function (a) { return a.include && a.label.trim(); });
    if (!inc.length) { toast('Keep or add at least one thing the assessment asks students to show.'); return; }
    if (!inc.some(function (a) { return a.id === state.priority; })) state.priority = inc[0].id;
    const st = E.stressTest(state.interp, state.aims, state.priority);
    state.stress = st; state.finding = st.finding;
    let html = '';
    if (st.sound) {
      html += '<div class="callout success"><span class="callout-title">This assessment already gives you reasonable evidence of individual learning</span>' + esc(st.finding) + ' ' + esc(st.gapLine) + '</div>';
    } else {
      html += '<p class="rd-assume">' + esc(st.assumption) + '</p><ul class="rd-caps">' + st.capabilities.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
        '<div class="callout rd-finding"><span class="callout-title">What this means for your marking</span>' + esc(st.finding) + '</div>' +
        '<details class="rd-try"><summary>Try it yourself</summary><p>Copy this prompt into a University-provided AI tool and see what comes back. Seeing a plausible answer to your own question is often more useful than any description. Leave out anything confidential or unreleased.</p>' +
        '<div class="copy-box" id="tryPrompt">' + esc(E.tryItPrompt(state.interp)) + '<button type="button" class="secondary-button compact copy-box-button" data-action="copy-try">Copy prompt</button></div></details>';
    }
    $('#stressBody').innerHTML = html;
    $('#stressSub').textContent = st.sound ? 'Under the conditions in your brief.' : 'What a capable general-purpose AI tool could plausibly do with this brief. This describes what is possible, not how good the result would be.';
    $('#aiChoiceGrid').innerHTML = ['not', 'some', 'required', 'unsure'].map(function (k) {
      const c = L.AI_CHOICES[k];
      return '<label><input type="radio" name="aiChoice" value="' + k + '"' + (state.aiChoice === k ? ' checked' : '') + '><span><strong>' + esc(c.title) + '.</strong> <small>' + esc(c.sub) + '</small></span></label>';
    }).join('');
    $('#stressActions').innerHTML = st.sound
      ? '<button type="button" class="secondary-button" data-action="to-options">Show me options anyway</button><button type="button" class="primary-button" data-action="wording-only">Get clear AI wording</button>'
      : '<button type="button" class="primary-button" data-action="to-options">Show me options</button>';
    go(3);
  }

  // ── Step 3 → 4 ──────────────────────────────────────────────────────────────
  function sel() { return { aims: state.aims, priority: state.priority, aiChoice: state.aiChoice || 'unsure', constraints: state.constraints, cohort: state.cohort, showHidden: state.showHidden }; }

  function toOptions() {
    if (!state.aiChoice) state.aiChoice = 'unsure';
    const r = E.selectOptions(state.interp, sel());
    state.options = r.options; state.hidden = r.hidden;
    if (state.selected >= state.options.length) state.selected = 0;
    renderOptions();
    go(4);
  }

  function ratingCell(v) { return '<span class="rd-rating rd-r' + v + '">' + esc(L.RATING_WORDS[v]) + '</span>'; }

  function renderOptions() {
    const ops = state.options;
    const cur = ops[state.selected];
    let html = '';
    if (ops.length === 1 && ops[0].pattern.baseline) html += '<div class="callout success"><span class="callout-title">No change to the task would add much here</span>Given what you told us, the most useful step is clear AI wording.</div>';
    html += '<div class="rd-options" role="radiogroup" aria-label="Options">';
    ops.forEach(function (o, i) {
      const p = o.pattern;
      const note = p.aiNote[state.aiChoice] || p.aiNote.unsure || '';
      html += '<article class="rd-option' + (i === state.selected ? ' selected' : '') + '" data-opt="' + i + '">' +
        '<button type="button" class="rd-option-select" role="radio" aria-checked="' + (i === state.selected) + '" tabindex="' + (i === state.selected ? 0 : -1) + '" data-select="' + i + '">' +
        '<span class="rd-letter">' + o.letter + '</span><span class="rd-option-name">' + esc(p.name) + '</span></button>' +
        '<p class="rd-level">' + esc(L.LEVEL_LABELS[p.level]) + '</p>' +
        '<p>' + esc(fillSummary(p)) + '</p>' +
        (p.visibilityOnly ? '<p class="rd-caution">On its own this adds visibility more than confidence. See why.</p>' : '') +
        '<p class="rd-ai-note"><strong>AI:</strong> ' + esc(note) + '</p>' +
        '<details class="rd-why"><summary>Why this is suggested</summary><p>' + esc(p.why) + '</p><p><strong>What it shows.</strong> ' + esc(p.shows) + '</p><p><strong>What it doesn\u2019t do.</strong> ' + esc(p.doesnt) + '</p>' +
        '<p class="rd-provenance">From the Toolkit\u2019s curated design library (' + esc(p.labSource) + '). <a href="../assessment-design-lab/index.html" target="_blank" rel="noopener noreferrer">Explore the design logic</a></p></details>' +
        '<button type="button" class="primary-button compact rd-choose" data-choose="' + i + '">Use option ' + o.letter + '</button>' +
        '</article>';
    });
    html += '</div>';

    // What you'll be able to tell
    html += '<div class="rd-panels"><section class="rd-evidence" aria-live="polite"><h3>What you\u2019ll be able to tell from the submitted work</h3>' +
      '<table class="report-table rd-ev-table"><thead><tr><th scope="col">The assessment asks students to</th><th scope="col">Now</th><th scope="col">With ' + cur.letter + '</th></tr></thead><tbody>' +
      cur.ratings.map(function (r) { return '<tr><th scope="row">' + esc(r.label) + '</th><td>' + ratingCell(r.before) + '</td><td>' + ratingCell(r.after) + (r.after > r.before ? '<span class="visually-hidden"> (improves)</span>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table><p class="rd-hint">Design judgments from the Toolkit\u2019s model, about confidence in individual learning. Not measurements, and not tests of authorship.</p></section>';

    // Compare
    html += '<section class="rd-compare"><h3>Compare the costs</h3><div class="rd-scroll"><table class="report-table"><thead><tr><th scope="col"></th>' +
      ops.map(function (o) { return '<th scope="col">' + o.letter + '</th>'; }).join('') + '</tr></thead><tbody>' +
      row('Type of change', ops.map(function (o) { return esc(L.LEVEL_SHORT[o.pattern.level]); })) +
      row('Extra student time', ops.map(function (o) { return esc(o.costs.studentTime); })) +
      row('Extra marking', ops.map(function (o) { return esc(o.costs.markingPer) + (o.costs.markingTotal ? '<br><small>' + esc(o.costs.markingTotal) + '</small>' : ''); })) +
      row('Live or supervised?', ops.map(function (o) { return esc(o.costs.liveOrSupervised); })) +
      '</tbody></table></div>' +
      '<details class="rd-more"><summary>Accessibility and implementation</summary>' + ops.map(function (o) {
        return '<p><strong>' + o.letter + '. Accessibility.</strong> ' + esc(o.pattern.accessibility) + '</p><p><strong>' + o.letter + '. To set up.</strong> ' + esc(o.pattern.implementation[0]) + '</p>';
      }).join('') + '</details></section></div>';

    if (state.hidden && state.hidden.length && !state.showHidden) {
      html += '<p class="rd-hidden-note">' + state.hidden.length + ' option' + (state.hidden.length > 1 ? 's were' : ' was') + ' hidden because of what you said can\u2019t change: ' +
        state.hidden.map(function (h) { return esc(h.pattern.name.toLowerCase()) + ' (' + esc(h.reason) + ')'; }).join('; ') +
        '. <button type="button" class="quiet-button compact" data-action="show-hidden">Show anyway</button></p>';
    } else if (state.showHidden) {
      html += '<p class="rd-hidden-note">Showing options regardless of your constraints. <button type="button" class="quiet-button compact" data-action="hide-hidden">Apply constraints again</button></p>';
    }
    $('#optionsBody').innerHTML = html;
    function row(label, cells) { return '<tr><th scope="row">' + label + '</th>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }
  }
  function fillSummary(p) {
    const product = state.interp.product === 'submission' ? 'work' : state.interp.product;
    const c = state.interp.context;
    let ex = ' (for example, a new piece of evidence that cuts against their reasoning)';
    if (c.quant) ex = ' (for example, a key assumption behind their figures changes)';
    else if (c.board) ex = ' (for example, a board member raises a serious objection)';
    else if (c.competitor) ex = ' (for example, a competitor makes an unexpected move)';
    else if (c.client) ex = ' (for example, the client changes a key requirement)';
    return p.summary.replace('{product}', product).replace('{example}', ex);
  }

  // ── Step 4 → 5 ──────────────────────────────────────────────────────────────
  function choose(i) {
    const o = state.options[i];
    state.chosen = o; state.edits = {};
    const fits = o.pattern.aiFit;
    state.packChoice = (state.aiChoice && state.aiChoice !== 'unsure' && fits.indexOf(state.aiChoice) !== -1) ? state.aiChoice : (fits.indexOf('some') !== -1 ? 'some' : fits[0]);
    state.offsetWords = false;
    renderPack(true);
    go(5);
  }
  function wordingOnly() {
    if (!state.aiChoice || state.aiChoice === 'unsure') { toast('Choose how students may use AI first.'); $('input[name="aiChoice"]').focus(); return; }
    const base = L.PATTERNS.find(function (p) { return p.baseline; });
    state.options = [{ pattern: base, letter: 'A', ratings: E.ratingsFor(base, state.aims, state.interp), costs: { studentTime: 'No change', markingPer: 'No change', markingTotal: '', liveOrSupervised: 'No' } }];
    state.maxStep = Math.max(state.maxStep, 4);
    renderOptions();
    choose(0);
  }

  function buildPack() {
    const s = Object.assign(sel(), { aiChoice: state.packChoice, finding: state.finding, offsetWords: state.offsetWords });
    state.pack = E.buildPack(state.interp, s, state.chosen, state.edits);
    return state.pack;
  }

  function briefHTML(paras) {
    return paras.map(function (p) {
      const inner = p.runs.map(function (r) {
        if (!r.text) return '';
        if (r.del) return '<del>' + esc(r.text) + '</del>';
        if (r.ins) return '<ins>' + esc(r.text) + '</ins>';
        return esc(r.text);
      }).join('');
      if (!inner) return '<p class="rd-blank" aria-hidden="true"></p>';
      return p.style === 'Heading2' ? '<h4>' + inner + '</h4>' : '<p>' + inner + '</p>';
    }).join('');
  }

  function renderPack(full) {
    const pk = buildPack();
    const p = pk.pattern;
    if (!full) { $('#briefPreview').innerHTML = briefHTML(pk.brief); $('#summaryCost').textContent = pk.summary.cost; return; }
    const I = state.interp;
    const fits = p.aiFit;
    let html = '';
    if (state.aiChoice === 'unsure' || !state.aiChoice) {
      html += '<div class="callout warning"><span class="callout-title">You hadn\u2019t decided how students may use AI</span>We\u2019ve drafted the wording below for the position shown. Change it here if that\u2019s not right.</div>';
    }
    html += '<div class="rd-packchoice"><label for="packChoice">AI position in this pack</label><select id="packChoice">' +
      ['not', 'some', 'required'].filter(function (k) { return fits.indexOf(k) !== -1; }).map(function (k) { return '<option value="' + k + '"' + (k === state.packChoice ? ' selected' : '') + '>' + esc(L.AI_CHOICES[k].title) + '</option>'; }).join('') + '</select></div>';

    html += '<section class="rd-pack-section rd-summary" id="pk-summary"><h3>Summary</h3>' +
      '<p class="rd-hint">The page to share with a co-convenor, course director or review panel.</p>' +
      '<dl class="rd-dl"><dt>What it asks students to show</dt><dd><ul class="rd-tight">' + pk.summary.aims.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></dd>' +
      '<dt>What AI changes</dt><dd>' + esc(pk.summary.finding) + '</dd>' +
      '<dt>Chosen change</dt><dd><strong>' + esc(pk.levelLabel) + '.</strong> ' + esc(pk.summary.change) + '</dd>' +
      '<dt>AI use</dt><dd>' + esc(pk.summary.ai) + '</dd>' +
      '<dt>Cost</dt><dd id="summaryCost">' + esc(pk.summary.cost) + '</dd></dl></section>';

    html += '<section class="rd-pack-section" id="pk-brief"><h3>Revised brief</h3><p class="rd-hint">Suggested changes are marked. <ins>Underlined</ins> text is added and <del>struck</del> text is removed. The Word download carries these as tracked changes you can accept or reject.</p>';
    if (p.offset && I.wordCount) {
      html += '<label class="rd-inline-check"><input type="checkbox" id="offsetWords"' + (state.offsetWords ? ' checked' : '') + '> Reduce the main word limit from ' + esc(I.wordCountText) + ' to offset the added work</label>';
    }
    html += '<div class="rd-brief" id="briefPreview">' + briefHTML(pk.brief) + '</div>';
    if (p.briefAddition) html += editBox('addition', p.level === 'format' ? 'New assessment structure' : 'New component wording', pk.addition);
    html += '</section>';

    html += '<section class="rd-pack-section" id="pk-ai"><h3>AI wording for students</h3><p class="rd-hint">Toolkit draft wording. Replace it with your department\u2019s or CTL\u2019s approved wording where that exists.</p>' +
      editBox('aiWording', 'What students may and may not do', pk.aiWording) + editBox('declaration', 'Declaration requirement', pk.declaration) + '</section>';

    html += '<section class="rd-pack-section" id="pk-marking"><h3>Marking changes</h3>';
    if (pk.marking && pk.marking.rows) {
      html += '<div class="rd-scroll"><table class="report-table"><thead><tr><th scope="col">Criterion</th><th scope="col">Now</th><th scope="col">Suggested</th></tr></thead><tbody>' +
        pk.marking.rows.map(function (r) { return '<tr' + (r.isNew ? ' class="rd-newrow"' : '') + '><th scope="row">' + esc(r.name) + (r.descriptor ? '<br><small>' + esc(r.descriptor) + '</small>' : '') + '</th><td>' + (r.from === null ? 'New' : r.from + '%') + '</td><td>' + r.to + '%</td></tr>'; }).join('') +
        '</tbody></table></div><p class="rd-hint">Weightings are illustrative, not approved replacements.</p>';
    } else if (pk.marking) {
      html += '<p>Add a criterion: <strong>' + esc(pk.marking.criterion.name) + '</strong> (illustrative ' + pk.marking.criterion.weight + '%). ' + esc(pk.marking.criterion.descriptor) + '</p><p class="rd-hint">We couldn\u2019t read your current criteria and weightings, so we haven\u2019t suggested how to rebalance them.</p>';
    } else html += '<p>No change to marking criteria.</p>';
    html += '</section>';

    html += '<section class="rd-pack-section" id="pk-why"><h3>Why this gives better evidence</h3><p>' + esc(pk.why) + '</p></section>';
    html += '<section class="rd-pack-section" id="pk-impl"><h3>Implementation</h3><ul>' + pk.implementation.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><p><strong>Accessibility.</strong> ' + esc(pk.accessibility) + '</p></section>';

    html += '<section class="rd-pack-section" id="pk-checks"><h3>Before you use this</h3>' +
      checkGroup('Oxford policy', 'Read the source. The Toolkit does not restate policy.', pk.checks.policy.map(function (c) { return esc(c.text) + ' <a href="' + esc(c.link.url) + '" target="_blank" rel="noopener noreferrer">' + esc(c.link.title) + '</a>'; })) +
      checkGroup('Check locally', 'Things this tool can\u2019t know.', pk.checks.local.map(esc)) +
      checkGroup('Suggestions', 'Design advice, not requirements.', pk.checks.suggestions.map(esc)) +
      '<p class="rd-hint">For changes to format or weighting, <a href="' + L.SOURCES.ctlConsult.url + '" target="_blank" rel="noopener noreferrer">CTL\u2019s course and assessment redesign consultancy</a> can help.</p></section>';
    $('#packBody').innerHTML = html;
  }
  function editBox(key, label, val) {
    return '<label class="field rd-edit"><span>' + esc(label) + ' <small>(editable)</small></span><textarea data-edit="' + key + '" rows="' + Math.min(9, Math.max(3, Math.ceil(String(val).length / 90))) + '">' + esc(val) + '</textarea></label>';
  }
  function checkGroup(title, sub, items) {
    return '<div class="rd-checkgroup"><h4>' + esc(title) + ' <small>' + esc(sub) + '</small></h4><ul class="rd-checks">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>';
  }

  // ── Downloads ───────────────────────────────────────────────────────────────
  function slug() { return (state.pack.title || 'assessment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'assessment'; }
  function download(bytes, name, type) {
    const blob = new Blob([bytes], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
    toast('Downloaded ' + name);
  }
  const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  function copy(text, ok) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(ok); }, function () { fallback(); });
    } else fallback();
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let done = false; try { done = document.execCommand('copy'); } catch (e) { done = false; }
      ta.remove(); toast(done ? ok : 'Copy didn\u2019t work in this browser. Select the text and copy it manually.');
    }
  }

  // ── Events ──────────────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-action],[data-go],[data-step-link],[data-select],[data-choose]');
    if (!t) return;
    if (t.dataset.go) return go(+t.dataset.go);
    if (t.dataset.stepLink) { const n = +t.dataset.stepLink; if (n <= state.maxStep) go(n); return; }
    if (t.dataset.select !== undefined) { state.selected = +t.dataset.select; renderOptions(); const b = $('[data-select="' + state.selected + '"]'); if (b) b.focus(); return; }
    if (t.dataset.choose !== undefined) return choose(+t.dataset.choose);
    switch (t.dataset.action) {
      case 'example': $('#briefInput').value = EXAMPLE; $('#cohortInput').value = $('#cohortInput').value || '90'; toast('Example brief loaded'); break;
      case 'read': read(); break;
      case 'add-aim': {
        const id = 'u' + (++state.aimSeq);
        state.aims.push({ id: id, kind: 'analyze', label: '', quote: '', source: 'Added by you', include: true });
        renderAims(); $('#lbl-' + id).focus(); break;
      }
      case 'to-stress': toStress(); break;
      case 'to-options': toOptions(); break;
      case 'wording-only': wordingOnly(); break;
      case 'show-hidden': state.showHidden = true; toOptions(); break;
      case 'hide-hidden': state.showHidden = false; toOptions(); break;
      case 'copy-try': copy(E.tryItPrompt(state.interp), 'Prompt copied'); break;
      case 'dl-brief': download(E.buildDocx(buildPack(), 'brief'), slug() + '-revised-brief.docx', DOCX); break;
      case 'dl-pack': download(E.buildDocx(buildPack(), 'pack'), slug() + '-redesign-pack.docx', DOCX); break;
      case 'copy-pack': copy(E.packToText(buildPack()), 'Pack copied as text'); break;
      case 'print': window.print(); break;
      case 'restart':
        if (!confirm('Start again with another brief? This clears what you have here.')) return;
        $('#briefInput').value = ''; $('#weightInput').value = ''; state.maxStep = 1; state.aiChoice = null; state.selected = 0;
        Object.keys(state.constraints).forEach(function (k) { state.constraints[k] = false; });
        go(1); $('#briefInput').focus(); break;
    }
  });

  document.addEventListener('change', function (e) {
    const t = e.target;
    const row = t.closest('.rd-aim');
    if (row && t.classList.contains('rd-aim-check')) {
      const a = state.aims.find(function (x) { return x.id === row.dataset.aim; });
      a.include = t.checked; row.classList.toggle('rd-off', !t.checked);
      const r = row.querySelector('input[type=radio]'); r.disabled = !t.checked;
      if (!t.checked && state.priority === a.id) { state.priority = E.defaultPriority(state.aims); renderAims(); }
      return;
    }
    if (t.name === 'priority') { state.priority = t.value; return; }
    if (t.dataset.constraint) { state.constraints[t.dataset.constraint] = t.checked; return; }
    if (t.name === 'aiChoice') { state.aiChoice = t.value; return; }
    if (t.id === 'packChoice') { state.packChoice = t.value; delete state.edits.aiWording; delete state.edits.declaration; delete state.edits.addition; renderPack(true); return; }
    if (t.id === 'offsetWords') { state.offsetWords = t.checked; renderPack(false); return; }
  });

  document.addEventListener('input', function (e) {
    const t = e.target;
    if (t.classList.contains('rd-aim-label')) {
      const a = state.aims.find(function (x) { return x.id === t.closest('.rd-aim').dataset.aim; });
      a.label = t.value.replace(/\n+/g, ' '); autosize(t);
      if (a.source === 'Added by you' || a.source === 'From your brief') a.kind = E.classifyAim(t.value) || a.kind;
      return;
    }
    if (t.dataset.edit) {
      state.edits[t.dataset.edit] = t.value;
      clearTimeout(renderPack._t); renderPack._t = setTimeout(function () { renderPack(false); }, 200);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.classList && e.target.classList.contains('rd-aim-label') && e.key === 'Enter') e.preventDefault();
  });
  window.addEventListener('resize', function () { $$('.rd-aim-label').forEach(autosize); });

  // Arrow keys move between option cards (radiogroup pattern).
  document.addEventListener('keydown', function (e) {
    const t = e.target;
    if (!t.classList || !t.classList.contains('rd-option-select')) return;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key) === -1) return;
    e.preventDefault();
    const d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
    state.selected = (state.selected + d + state.options.length) % state.options.length;
    renderOptions(); $('[data-select="' + state.selected + '"]').focus();
  });

  go(1, false);
})();
