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

check('no em or en dashes in faculty-facing text', function () {
  const texts = [];
  L.PATTERNS.forEach(function (p) { ['name', 'summary', 'shows', 'doesnt', 'accessibility', 'briefAddition', 'why', 'checkQuestion', 'studentTime'].forEach(function (f) { texts.push(p[f] || ''); }); texts.push.apply(texts, p.implementation); Object.values(p.aiNote).forEach(function (n) { texts.push(n); }); });
  Object.values(L.AI_CHOICES).forEach(function (c) { texts.push(c.title, c.sub, c.wording || '', c.declaration || ''); });
  Object.values(L.AIM_KINDS).forEach(function (k) { texts.push(k.label, k.ai, k.gap); });
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  texts.push(html);
  texts.forEach(function (t) { assert(!/[\u2013\u2014]/.test(t), 'dash in: ' + t.slice(0, 80)); });
});

console.log('\n' + passed + ' checks passed');
