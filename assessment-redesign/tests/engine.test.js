/* Run with: node assessment-redesign/tests/engine.test.js (from the Toolkit root). */
const path = require('path'), fs = require('fs'), assert = require('assert');
require(path.join(__dirname, '../assets/library.js'));
require(path.join(__dirname, '../assets/engine.js'));
const E = globalThis.REDESIGN_ENGINE, L = globalThis.REDESIGN_LIBRARY;
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok  ' + name); }

const briefs = {
  sample: fs.readFileSync(path.join(__dirname, '../../assessment-designer/examples/sample-assessment-brief.txt'), 'utf8'),
  noOutcomes: 'Write a 3,000 word essay critically evaluating competing theories of corporate governance. Draw on the course readings and relevant literature, and argue for a position. Worth 50% of the module.',
  reflective: 'Reflective essay (1,500 words). Reflect on your own experience of leading a team during the simulation, drawing on leadership frameworks from the course.\nMarking criteria:\n- Depth of reflection: 50%\n- Use of frameworks: 30%\n- Writing: 20%',
  exam: 'Students sit a three-hour invigilated written examination answering two unseen questions.\nStudents should be able to:\n1. Explain capital structure theories.\n2. Evaluate financing decisions.',
  group: 'In groups of four, students produce a 5,000-word consulting report recommending a market entry strategy for the client, including a financial forecast.',
  quant: 'Individual assignment. Build a valuation model for the company and recommend whether to invest. Calculate NPV under three scenarios and interpret the results. 2,000 words plus spreadsheet.',
  live: 'Students deliver a presentation to a panel of faculty on their proposed strategy, followed by questions. Weighting 30%.'
};

check('every quote is found verbatim in its brief', function () {
  Object.keys(briefs).forEach(function (k) {
    const I = E.interpretBrief(briefs[k]);
    assert(I.aims.length > 0, k + ' has aims');
    I.aims.forEach(function (a) { assert(E.quoteIsGrounded(a.quote, briefs[k]), k + ': ' + a.quote); });
  });
});

check('formats and flags are detected', function () {
  assert.strictEqual(E.interpretBrief(briefs.sample).format, 'coursework');
  assert.strictEqual(E.interpretBrief(briefs.exam).format, 'exam');
  assert.strictEqual(E.interpretBrief(briefs.live).format, 'live');
  assert.strictEqual(E.interpretBrief(briefs.group).isGroup, true);
  assert.strictEqual(E.interpretBrief(briefs.sample).isGroup, false);
  assert.strictEqual(E.interpretBrief(briefs.sample).mentionsAI, false);
  assert.strictEqual(E.interpretBrief(briefs.sample).wordCount, 2500);
  assert.strictEqual(E.interpretBrief(briefs.sample).weighting, 40);
});

check('sample brief reads its four learning outcomes', function () {
  const kinds = E.interpretBrief(briefs.sample).aims.map(function (a) { return a.kind; });
  assert.deepStrictEqual(kinds, ['apply', 'evaluate', 'recommend', 'risk']);
});

check('supervised exam is recognized as already sound', function () {
  const I = E.interpretBrief(briefs.exam);
  assert(E.stressTest(I, I.aims, E.defaultPriority(I.aims)).sound);
});

const combos = [];
['unsure', 'not', 'some', 'required'].forEach(function (c) {
  [[], ['keepFormat'], ['noLive'], ['noMarking'], ['keepFormat', 'noLive'], ['noLive', 'noMarking'], ['thisYear']].forEach(function (cs) { combos.push([c, cs]); });
});

check('options respect constraints, AI choice, count and ordering', function () {
  Object.keys(briefs).forEach(function (k) {
    const I = E.interpretBrief(briefs[k]);
    combos.forEach(function (combo) {
      const cons = {}; combo[1].forEach(function (x) { cons[x] = true; });
      const s = { aims: I.aims, priority: E.defaultPriority(I.aims), aiChoice: combo[0], constraints: cons, cohort: 80 };
      const r = E.selectOptions(I, s);
      assert(r.options.length >= 1 && r.options.length <= 3, k + ' count');
      const order = { wording: 0, add: 1, format: 2 };
      for (let i = 1; i < r.options.length; i++) assert(order[r.options[i - 1].pattern.level] <= order[r.options[i].pattern.level], k + ' order');
      r.options.forEach(function (o) {
        const p = o.pattern;
        if (!p.baseline) {
          Object.keys(cons).forEach(function (c) { assert(!E.CONSTRAINTS[c].excludes(p), k + ' ' + p.id + ' violates ' + c); });
          if (combo[0] !== 'unsure') assert(p.aiFit.indexOf(combo[0]) !== -1, k + ' ' + p.id + ' ai fit');
        }
        o.ratings.forEach(function (rt) { assert(rt.after >= rt.before && rt.after <= 2); });
      });
    });
  });
});

check('every pattern produces a complete pack and weights sum to 100', function () {
  const I = E.interpretBrief(briefs.sample);
  L.PATTERNS.forEach(function (p) {
    ['not', 'some', 'required'].filter(function (c) { return p.aiFit.indexOf(c) !== -1; }).forEach(function (c) {
      const s = { aims: I.aims, priority: E.defaultPriority(I.aims), aiChoice: c, constraints: {}, cohort: 90, offsetWords: true };
      const opt = { pattern: p, ratings: E.ratingsFor(p, I.aims, I), costs: { studentTime: p.studentTime, markingPer: 'x', markingTotal: '', liveOrSupervised: 'No' } };
      const pk = E.buildPack(I, s, opt);
      assert(pk.aiWording && pk.declaration && pk.why && pk.checks.policy.length && pk.checks.local.length);
      assert(!/\{\w+\}/.test(E.packToText(pk)), p.id + ' unfilled slot');
      if (pk.marking && pk.marking.rows) assert.strictEqual(pk.marking.rows.reduce(function (a, r) { return a + r.to; }, 0), 100, p.id + ' weights');
    });
  });
});

check('Word files are valid packages with tracked changes', function () {
  const I = E.interpretBrief(briefs.sample);
  const s = { aims: I.aims, priority: E.defaultPriority(I.aims), aiChoice: 'some', constraints: {}, cohort: 90, offsetWords: true };
  const o = E.selectOptions(I, s).options[0];
  ['brief', 'pack'].forEach(function (w) {
    const bytes = Buffer.from(E.buildDocx(E.buildPack(I, s, o), w, new Date('2026-10-04T10:00:00Z')));
    assert.strictEqual(bytes.readUInt32LE(0), 0x04034b50);
    const txt = bytes.toString('utf8');
    assert(txt.indexOf('<w:ins ') !== -1 && txt.indexOf('<w:del ') !== -1 && txt.indexOf('<w:trackRevisions/>') !== -1);
    fs.writeFileSync(path.join(require('os').tmpdir(), 'redesign-test-' + w + '.docx'), bytes);
  });
});

check('decision path settles on the first yes and asks in order', function () {
  assert.strictEqual(E.decide({}).questions.length, 1);
  assert.strictEqual(E.decide({}).outcome, null);
  assert.strictEqual(E.decide({ local: 'yes' }).outcome.choice, null);
  assert.strictEqual(E.decide({ local: 'no', integral: 'yes' }).outcome.choice, 'required');
  assert.strictEqual(E.decide({ local: 'no', integral: 'no', independent: 'yes' }).outcome.choice, 'not');
  assert.strictEqual(E.decide({ local: 'no', integral: 'no', independent: 'no', support: 'yes' }).outcome.choice, 'some');
  assert.strictEqual(E.decide({ local: 'no', integral: 'no', independent: 'no', support: 'no' }).outcome.choice, 'unsure');
  assert.strictEqual(E.decide({ local: 'no', integral: 'no' }).questions.length, 3);
  L.DECISION_PATH.forEach(function (q) { [q.yes, q.no].filter(Boolean).forEach(function (o) { assert(L.BASIS[o.basis], q.id + ' basis'); }); });
});

check('playbook quotes in the decision path and checks are verbatim', function () {
  const pb = fs.readFileSync(path.join(__dirname, '../../accessible/oxford-ai-assessment-playbook-v2-3.txt'), 'utf8').replace(/\s+/g, ' ').toLowerCase();
  const quotes = [];
  L.DECISION_PATH.forEach(function (q) { [q.yes, q.no].filter(Boolean).forEach(function (o) { const m = o.reason.match(/\u201c([^\u201d]+?)\.?\u201d/); if (o.basis === 'guidance') { assert(m, q.id); quotes.push(m[1]); } }); });
  const I = E.interpretBrief(briefs.sample);
  const opt = { pattern: L.PATTERNS[0], ratings: E.ratingsFor(L.PATTERNS[0], I.aims, I), costs: { studentTime: '', markingPer: '', markingTotal: '', liveOrSupervised: 'No' } };
  E.buildPack(I, { aims: I.aims, constraints: {}, aiChoice: 'some' }, opt).checks.suggestions.forEach(function (c) { if (c.quote) quotes.push(c.quote.replace(/\.$/, '')); });
  assert(quotes.length >= 5);
  quotes.forEach(function (q) { assert(pb.indexOf(q.toLowerCase()) !== -1, 'not in playbook: ' + q); });
  const hub = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  assert(hub.indexOf(L.POLICY_RECORD.setting) !== -1, 'policy record matches the main Toolkit');
});

check('every check carries a basis, and formative briefs get the formative check', function () {
  const I = E.interpretBrief(briefs.sample);
  const p = L.PATTERNS[0];
  const opt = { pattern: p, ratings: E.ratingsFor(p, I.aims, I), costs: { studentTime: '', markingPer: '', markingTotal: '', liveOrSupervised: 'No' } };
  ['summative', 'formative'].forEach(function (st) {
    const pk = E.buildPack(I, { aims: I.aims, constraints: {}, aiChoice: 'some', status: st }, opt);
    ['policy', 'local', 'suggestions'].forEach(function (g) { pk.checks[g].forEach(function (c) { assert(c.text && L.BASIS[c.basis], g + ' basis'); }); });
    const txt = E.packToText(pk);
    assert(/Basis: University policy\./.test(txt));
    assert.strictEqual(txt.indexOf('../#') === -1, true, 'no relative links in text export');
    assert.strictEqual(/titled for summative assessment/.test(txt), st === 'formative');
  });
});

check('no em or en dashes in faculty-facing text', function () {
  const texts = [];
  L.PATTERNS.forEach(function (p) { ['name', 'summary', 'shows', 'doesnt', 'accessibility', 'briefAddition', 'why', 'checkQuestion', 'studentTime'].forEach(function (f) { texts.push(p[f] || ''); }); texts.push.apply(texts, p.implementation); Object.values(p.aiNote).forEach(function (n) { texts.push(n); }); });
  Object.values(L.AI_CHOICES).forEach(function (c) { texts.push(c.title, c.sub, c.wording || '', c.declaration || ''); });
  Object.values(L.AIM_KINDS).forEach(function (k) { texts.push(k.label, k.ai, k.gap); });
  L.DECISION_PATH.forEach(function (q) { texts.push(q.q); [q.yes, q.no].filter(Boolean).forEach(function (o) { texts.push(o.title, o.reason); }); });
  Object.values(L.BASIS).forEach(function (b) { texts.push(b.label, b.detail); });
  texts.push(L.POLICY_RECORD.setting, L.POLICY_RECORD.formative);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  texts.push(html);
  texts.forEach(function (t) { assert(!/[\u2013\u2014]/.test(t), 'dash in: ' + t.slice(0, 80)); });
});

console.log('\n' + passed + ' checks passed');
