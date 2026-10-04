/*
 * Oxford AI Toolkit: Check an assessment for AI
 * Reasoning engine. Pure functions, no DOM, no network.
 *
 * V1 reads the brief with fixed rules. The single seam for a future approved
 * language model is interpretBrief(): any replacement must return the same shape,
 * and every quote it returns must appear verbatim in the brief (see quoteIsGrounded).
 * Selection, comparison and wording always come from library.js.
 */
(function (root) {
  'use strict';
  const L = root.REDESIGN_LIBRARY;

  // ── Small helpers ───────────────────────────────────────────────────────────
  function clean(s) { return String(s || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim(); }
  function sentenceCase(s) { s = clean(s).replace(/[.;:]+$/, ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function stripBullet(s) { return clean(s).replace(/^(\d{1,2}[.)]|[a-z][.)]|[-\u2022*\u2013])\s+/i, ''); }
  function isBullet(s) { return /^\s*(\d{1,2}[.)]|[a-z][.)]|[-\u2022*\u2013])\s+\S/i.test(s); }
  function quoteIsGrounded(quote, brief) { return !!quote && String(brief).indexOf(quote) !== -1; }
  function sentencesOf(text) {
    const out = [];
    String(text).split(/\n+/).forEach(function (line) {
      const parts = line.match(/[^.!?]+[.!?]*/g) || [];
      parts.forEach(function (p) { const t = p.trim(); if (t.length > 3) out.push(t); });
    });
    return out;
  }
  function trimQuote(q, max) {
    max = max || 150;
    if (q.length <= max) return q;
    const cut = q.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(' ')) + '\u2026';
  }
  function matchKind(text, kind) { return L.AIM_KINDS[kind].match.some(function (re) { return re.test(text); }); }
  function roundTo(n, step) { return Math.round(n / step) * step; }

  // ── 1. Read the brief ───────────────────────────────────────────────────────
  function findOutcomes(lines) {
    const start = lines.findIndex(function (l) { return /learning outcomes?|intended learning|ILOs?\b|students (will|should) be able to|by the end of (the|this)/i.test(l); });
    if (start === -1) return [];
    const items = [];
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l.trim()) { if (items.length) break; else continue; }
      if (isBullet(l)) items.push(l.trim());
      else if (items.length) break;
    }
    return items;
  }

  function findCriteria(lines) {
    const re = /^\s*(?:[-\u2022*\u2013]|\d{1,2}[.)])?\s*([A-Za-z][^:%()]{2,80}?)\s*(?::|\(|\u2013|\s-\s)\s*(\d{1,3})\s*%\s*\)?\s*\.?\s*$/;
    const out = [];
    lines.forEach(function (line, i) {
      const m = line.match(re);
      if (m) out.push({ name: clean(m[1]), weight: parseInt(m[2], 10), line: i, raw: line });
    });
    const sum = out.reduce(function (a, c) { return a + c.weight; }, 0);
    return { items: out, sum: sum, usable: out.length >= 2 && sum >= 95 && sum <= 105 };
  }

  function detectProduct(t) {
    const list = [
      [/\bcase (study|analysis)\b/i, 'case analysis'], [/\breport\b/i, 'report'], [/\bessay\b/i, 'essay'],
      [/\bmemo(randum)?\b/i, 'memo'], [/\bproposal\b/i, 'proposal'], [/\breflect(ive|ion)\b/i, 'reflection'],
      [/\bportfolio\b/i, 'portfolio'], [/\bdissertation\b/i, 'dissertation'], [/\bplan\b/i, 'plan']
    ];
    let best = null, at = Infinity;
    list.forEach(function (p) { const m = t.search(p[0]); if (m !== -1 && m < at) { at = m; best = p[1]; } });
    return best || 'submission';
  }

  function interpretBrief(raw) {
    const brief = String(raw || '').replace(/\r/g, '');
    const lines = brief.split('\n');
    const lower = brief.toLowerCase();
    const out = {
      brief: brief, lines: lines, aims: [], notes: [],
      title: '', wordCount: null, wordCountText: null, wordCountLine: -1,
      weighting: null, format: 'coursework', isGroup: false, mentionsAI: false,
      product: detectProduct(brief), criteria: findCriteria(lines), context: {}, thin: false
    };

    const titleLine = lines.find(function (l) { return /^\s*(assessment )?title\s*:/i.test(l); });
    out.title = titleLine ? clean(titleLine.split(':').slice(1).join(':')) : '';

    const wc = brief.match(/\b(\d{1,2}[,.]\d{3}|\d{3,5})[- ]?words?\b/i);
    if (wc) {
      out.wordCountText = wc[1];
      out.wordCount = parseInt(wc[1].replace(/[,.]/g, ''), 10);
      out.wordCountLine = lines.findIndex(function (l) { return l.indexOf(wc[0]) !== -1; });
    }
    const wt = brief.match(/\b(\d{1,3})\s*%\s*(of|towards?|to)\s+(the\s+)?(course|module|overall|final|unit|paper|programme|program)/i) || brief.match(/\bworth\s+(\d{1,3})\s*%/i);
    if (wt) out.weighting = parseInt(wt[1], 10);

    // Detect format on the task text only (criteria lines like "Structure and presentation: 15%" are excluded).
    const critLines = out.criteria.items.map(function (c) { return c.line; });
    const taskText = lines.filter(function (l, i) { return critLines.indexOf(i) === -1; }).join('\n');
    if (/\b(invigilat\w*|closed[- ]book|unseen (exam|paper)|exam(ination)? conditions|exam(ination)? hall|timed (exam|paper|test))\b/i.test(taskText) ||
        (/\b(written |sit (an|the) )exam(ination)?\b/i.test(taskText) && !/take[- ]home/i.test(taskText))) out.format = 'exam';
    else if (/\b(oral presentation|deliver(ed)? (a|an|their|your) presentation|give (a|an) presentation|presentation (to|of|followed|with|in front)|present (to|your|their) (the )?(class|panel|board|group|findings)|pitch to|viva|oral (exam|assessment|defen[cs]e))\b/i.test(taskText)) out.format = 'live';
    out.isGroup = /\b(group|team)[- ]?(work|project|report|assignment|presentation|submission|based|task)\b|\bin (small )?(groups|teams)\b/i.test(brief);
    out.mentionsAI = /\b(generative AI|GenAI|Gen AI|artificial intelligence|ChatGPT|Copilot|Gemini|large language model|LLM)\b|\bAI\b/.test(brief);
    out.context = {
      board: /\b(board|senior leadership|leadership team|executive|CEO|directors)\b/i.test(brief),
      competitor: /\b(competitor|market entry|market share|rival)\b/i.test(brief),
      client: /\bclient\b/i.test(brief),
      quant: /\b(financial|valuation|forecast|NPV|figures|data set|dataset|quantitative)\b/i.test(brief),
      caseBased: /\bcase\b/i.test(lower)
    };

    // Aims: prefer the brief's own learning outcomes.
    const los = findOutcomes(lines);
    if (los.length) {
      los.slice(0, 6).forEach(function (lo, i) {
        const text = stripBullet(lo);
        const kind = L.CLASSIFY_ORDER.find(function (k) { return matchKind(text, k); }) || 'analyze';
        out.aims.push({ id: 'a' + (i + 1), kind: kind, label: sentenceCase(text), quote: text, source: 'Learning outcome ' + (i + 1) + ' in your brief', include: true });
      });
    } else {
      const sents = sentencesOf(brief).filter(function (s) { return !/^\s*(assessment )?title\s*:/i.test(s); });
      const found = {};
      L.SCAN_ORDER.forEach(function (kind) {
        const s = sents.find(function (x) { return matchKind(x, kind); });
        if (s) found[kind] = s;
      });
      if (found.apply && found.analyze) { delete found.analyze; found.__merged = true; }
      if (found.communicate && Object.keys(found).length > 4) delete found.communicate;
      if (found.research && (found.recommend || found.evaluate) && /\bevidence\b/i.test(found.research) && !/literature|reference/i.test(found.research)) delete found.research;
      let n = 0;
      Object.keys(found).forEach(function (kind) {
        if (kind === '__merged' || n >= 5) return;
        const def = L.AIM_KINDS[kind];
        const label = (kind === 'apply' && found.__merged) ? 'Use course frameworks or concepts to analyze the situation' : def.label;
        out.aims.push({ id: 'a' + (++n), kind: kind, label: label, quote: found[kind].trim(), source: 'From your brief', include: true });
      });
    }
    out.thin = out.aims.length === 0 || brief.trim().split(/\s+/).length < 25;
    if (!out.criteria.items.length) out.notes.push('No marking criteria found. Paste them if you have them, so suggested marking changes can be specific.');
    if (out.isGroup) out.notes.push('This looks like group work. This version of the tool is designed for individual work, so the options will not address how to evidence each member\u2019s contribution.');
    return out;
  }

  const PRIORITY = ['recommend', 'evaluate', 'plan', 'reflect', 'quant', 'risk', 'analyze', 'apply', 'research', 'communicate'];
  function defaultPriority(aims) {
    const inc = aims.filter(function (a) { return a.include; });
    for (const k of PRIORITY) { const a = inc.find(function (x) { return x.kind === k; }); if (a) return a.id; }
    return inc.length ? inc[0].id : null;
  }

  // ── 2. What AI changes ──────────────────────────────────────────────────────
  function baselineFor(kind, interp) {
    if (interp.format === 'exam') return 2;
    const b = L.AIM_KINDS[kind].baseline;
    if (interp.format === 'live') return Math.max(b, 1);
    return b;
  }

  function stressTest(interp, aims, priorityId) {
    const inc = aims.filter(function (a) { return a.include; });
    const caps = [];
    inc.forEach(function (a) { const c = L.AIM_KINDS[a.kind].ai; if (caps.indexOf(c) === -1) caps.push(c); });
    caps.push('Write the whole piece in fluent, well-organized prose');
    const pr = inc.find(function (a) { return a.id === priorityId; }) || inc[0];
    const noun = interp.product === 'submission' ? 'piece of work' : interp.product;
    const result = { capabilities: caps, sound: false, assumption: interp.context.caseBased ? 'Assuming a student gives it the case and their course notes:' : 'Assuming a student gives it the brief and their course notes:' };
    if (interp.format === 'exam') {
      result.sound = true;
      result.finding = 'Under supervised conditions, AI tools are not available to students during the task, so the work itself remains reasonable evidence of individual learning, provided the conditions are well run and accessible.';
      result.gapLine = interp.mentionsAI ? 'The main thing to check is that the brief\u2019s AI wording is current and clear.' : 'Your brief does not say anything about AI. Clear wording is the main gap.';
      return result;
    }
    const gap = pr ? L.AIM_KINDS[pr.kind].gap : 'did the work themselves';
    if (interp.format === 'live') {
      result.finding = 'The live element already gives you some direct evidence. The prepared material is where AI could do most, so it tells you less than before about whether students ' + gap + '.';
    } else {
      result.finding = 'The submitted ' + noun + ' can still show that a student can produce credible work. On its own, it tells you much less than it used to about whether they ' + gap + (pr ? ', which you said matters most.' : '.');
    }
    return result;
  }

  function tryItPrompt(interp) {
    return 'You are a capable postgraduate student. Complete the following assessment as well as you can, at the required length. Where the brief refers to a case or readings you do not have, make reasonable assumptions and say what they are.\n\n---\n' + interp.brief.trim();
  }

  // ── 3. Select and compare options ───────────────────────────────────────────
  const CONSTRAINTS = {
    keepFormat: { label: 'The format and weighting must stay as approved', excludes: function (p) { return p.level === 'format'; }, reason: 'it changes the approved format or weighting' },
    noLive: { label: 'No live, oral or supervised component', excludes: function (p) { return p.live || p.supervised; }, reason: 'it needs a live or supervised component' },
    noMarking: { label: 'No extra marking time', excludes: function (p) { return p.markMinutes > 5; }, reason: 'it adds more than a few minutes of marking per student' },
    thisYear: { label: 'It needs to be ready for this academic year', excludes: function () { return false; }, reason: '' }
  };

  function ratingsFor(pattern, aims, interp) {
    return aims.filter(function (a) { return a.include; }).map(function (a) {
      const before = baselineFor(a.kind, interp);
      const eff = pattern ? (pattern.effects[a.kind] || 0) : 0;
      return { id: a.id, label: a.label, kind: a.kind, before: before, after: Math.min(2, before + eff) };
    });
  }

  function costs(pattern, cohort) {
    const n = Math.max(1, parseInt(cohort, 10) || 0);
    const hours = pattern.markMinutes * n / 60;
    return {
      studentTime: pattern.studentTime,
      markingPer: pattern.markMinutes ? 'About ' + pattern.markMinutes + ' min per student' : 'No change',
      markingTotal: (cohort && pattern.markMinutes) ? 'roughly ' + (hours < 1 ? 'under an hour' : (Math.round(hours) + ' hour' + (Math.round(hours) === 1 ? '' : 's'))) + ' for ' + n + ' students' : '',
      liveOrSupervised: pattern.live ? 'Yes, live' : (pattern.supervised ? 'Yes, supervised' : 'No')
    };
  }

  function selectOptions(interp, s) {
    const aims = s.aims.filter(function (a) { return a.include; });
    const kinds = aims.map(function (a) { return a.kind; });
    const choice = s.aiChoice || 'unsure';
    const active = Object.keys(s.constraints || {}).filter(function (k) { return s.constraints[k]; });
    const cohort = parseInt(s.cohort, 10) || 0;
    const scored = [], hidden = [];

    L.PATTERNS.forEach(function (p) {
      if (p.baseline) return;
      if (choice !== 'unsure' && p.aiFit.indexOf(choice) === -1) return;
      if (p.requiresKinds && !p.requiresKinds.some(function (k) { return kinds.indexOf(k) !== -1; })) return;
      let gain = 0;
      aims.forEach(function (a) {
        const b = baselineFor(a.kind, interp);
        const d = Math.min(2, b + (p.effects[a.kind] || 0)) - b;
        gain += d * (a.id === s.priority ? 2 : 1);
      });
      if (p.visibilityOnly && (choice === 'some' || choice === 'required')) gain = 0.6;
      if (gain <= 0) return;
      let cost = p.level === 'format' ? 0.9 : (p.level === 'add' ? 0.3 : 0);
      if (p.live && cohort >= 60) cost += 0.6;
      cost += Math.min(1, p.markMinutes * Math.max(cohort, 20) / 1200) * 0.4;
      if (choice === 'required' && (p.id === 'ai-critique' || p.id === 'decision-record')) gain += 1;
      const blockedBy = active.filter(function (k) { return CONSTRAINTS[k].excludes(p); });
      const rec = { pattern: p, gain: gain, score: gain - cost, blockedBy: blockedBy };
      if (blockedBy.length && !s.showHidden) hidden.push(rec); else scored.push(rec);
    });

    scored.sort(function (a, b) { return b.score - a.score; });
    let picks = scored.slice(0, 3);
    if ((choice === 'unsure' || choice === 'required') && !picks.some(function (r) { return r.pattern.aiFit.indexOf('not') === -1; })) {
      const ai = scored.find(function (r) { return r.pattern.aiFit.indexOf('not') === -1; });
      if (ai && picks.length === 3) picks[2] = ai; else if (ai) picks.push(ai);
    }
    if (picks.length < 2) {
      const base = L.PATTERNS.find(function (p) { return p.baseline; });
      picks.unshift({ pattern: base, gain: 0, score: 0, blockedBy: [] });
    }
    const order = { wording: 0, add: 1, format: 2 };
    picks.sort(function (a, b) { return (order[a.pattern.level] - order[b.pattern.level]) || (b.score - a.score); });
    picks = picks.map(function (r, i) {
      return Object.assign({}, r, { letter: 'ABC'.charAt(i) || 'D', ratings: ratingsFor(r.pattern, s.aims, interp), costs: costs(r.pattern, s.cohort) });
    });
    return {
      options: picks,
      hidden: hidden.map(function (r) { return { pattern: r.pattern, reason: r.blockedBy.map(function (k) { return CONSTRAINTS[k].reason; }).join(' and ') }; })
    };
  }

  // ── 4. Fill slots and build the pack ────────────────────────────────────────
  function slots(interp, choice) {
    const c = interp.context;
    let example = ' (for example, a new piece of evidence that cuts against their reasoning)';
    if (c.quant) example = ' (for example, a key assumption behind their figures changes)';
    else if (c.board) example = ' (for example, a board member raises a serious objection)';
    else if (c.competitor) example = ' (for example, a competitor makes an unexpected move)';
    else if (c.client) example = ' (for example, the client changes a key requirement)';
    const product = interp.product === 'submission' ? 'work' : interp.product;
    return {
      product: product,
      example: example,
      subject: c.caseBased ? 'the case' : 'the topic of your ' + product,
      window: '72 hours',
      aiSource: choice === 'required' ? 'Use [name the University-provided tool] to generate the answer.' : 'The AI-generated answer will be provided by the course team.'
    };
  }
  function fill(t, sl) { return String(t || '').replace(/\{(\w+)\}/g, function (m, k) { return sl[k] !== undefined ? sl[k] : m; }); }

  function reweight(criteria, add) {
    if (!criteria.usable || !add) return null;
    const rest = 100 - add.weight;
    const raw = criteria.items.map(function (c) { return c.weight * rest / criteria.sum; });
    const r = raw.map(function (x) { return Math.max(5, roundTo(x, 5)); });
    let drift = rest - r.reduce(function (a, b) { return a + b; }, 0);
    while (drift !== 0) {
      const idx = r.indexOf(Math.max.apply(null, r));
      const step = drift > 0 ? 5 : -5;
      r[idx] += step; drift -= step;
    }
    return criteria.items.map(function (c, i) { return { name: c.name, from: c.weight, to: r[i], line: c.line, raw: c.raw }; })
      .concat([{ name: add.name, from: null, to: add.weight, isNew: true, descriptor: add.descriptor }]);
  }

  function reducedWords(n) { return Math.max(500, roundTo(n * 0.8, 100)); }
  function formatWords(n, like) { return /,/.test(like || '') || n >= 1000 && !/\./.test(like || '') ? n.toLocaleString('en-US') : String(n); }

  // Paragraph model: { style, runs:[{text, ins, del}], insPara }
  function P(style, text, opts) { return Object.assign({ style: style, runs: [{ text: text }] }, opts || {}); }
  function INS(style, text) { return { style: style, runs: [{ text: text, ins: true }], insPara: true }; }

  function buildPack(interp, s, option, edits) {
    edits = edits || {};
    const p = option.pattern;
    const choice = (s.aiChoice && s.aiChoice !== 'unsure' && p.aiFit.indexOf(s.aiChoice) !== -1) ? s.aiChoice : (p.aiFit.indexOf('some') !== -1 ? 'some' : p.aiFit[0]);
    const aiDef = L.AI_CHOICES[choice];
    const sl = slots(interp, choice);
    const addition = edits.addition !== undefined ? edits.addition : fill(p.briefAddition, sl);
    const aiWording = edits.aiWording !== undefined ? edits.aiWording : aiDef.wording;
    const declaration = edits.declaration !== undefined ? edits.declaration : aiDef.declaration;
    const weights = p.criterion ? reweight(interp.criteria, p.criterion) : null;
    const offset = !!(s.offsetWords && p.offset && interp.wordCount);
    const newWords = offset ? reducedWords(interp.wordCount) : null;

    // Revised brief with tracked changes.
    const brief = [];
    const changed = {};
    if (weights) weights.forEach(function (w) { if (!w.isNew && w.from !== w.to) changed[w.line] = w; });
    const lastCritLine = interp.criteria.items.length ? interp.criteria.items[interp.criteria.items.length - 1].line : -1;
    interp.lines.forEach(function (line, i) {
      if (i === interp.wordCountLine && offset) {
        const at = line.indexOf(interp.wordCountText);
        brief.push({ style: 'Normal', runs: [{ text: line.slice(0, at) }, { text: interp.wordCountText, del: true }, { text: formatWords(newWords, interp.wordCountText), ins: true }, { text: line.slice(at + interp.wordCountText.length) }] });
      } else if (changed[i]) {
        const w = changed[i];
        const m = line.match(/(\d{1,3})(\s*%)(?!.*\d{1,3}\s*%)/);
        const at = line.lastIndexOf(m[0]);
        brief.push({ style: 'Normal', runs: [{ text: line.slice(0, at) }, { text: m[1], del: true }, { text: String(w.to), ins: true }, { text: line.slice(at + m[1].length) }] });
      } else {
        brief.push(P('Normal', line));
      }
      if (i === lastCritLine && weights) {
        const nw = weights[weights.length - 1];
        const bullet = (interp.criteria.items[interp.criteria.items.length - 1].raw.match(/^\s*([-\u2022*\u2013]|\d{1,2}[.)])\s+/) || ['- '])[0];
        brief.push(INS('Normal', bullet.replace(/\d+/, String(interp.criteria.items.length + 1)) + nw.name + ': ' + nw.to + '%'));
      }
    });
    if (addition) { brief.push(INS('Heading2', p.level === 'format' ? 'Assessment structure' : 'Additional component')); brief.push(INS('Normal', addition)); }
    brief.push(INS('Heading2', 'Use of generative AI'));
    brief.push(INS('Normal', aiWording));
    brief.push(INS('Heading2', 'AI declaration'));
    brief.push(INS('Normal', declaration));

    const ratings = option.ratings;
    const kept = ratings.filter(function (r) { return r.after === r.before; });
    const raised = ratings.filter(function (r) { return r.after > r.before; });
    const whyText = (raised.length
      ? 'This change gives you better evidence on: ' + raised.map(function (r) { return r.label.charAt(0).toLowerCase() + r.label.slice(1); }).join('; ') + '. '
      : '') + 'What it shows: ' + p.shows + ' What it does not do: ' + p.doesnt;

    const checks = {
      policy: [
        { text: 'Read the University\u2019s policy on AI use in summative assessment and confirm this assessment states its AI permission in the way the policy requires.', link: L.SOURCES.policy }
      ],
      local: [p.checkQuestion, 'Does your department or programme set its own AI wording or categories that should replace the draft wording here?', 'Who needs to see this before students do? Usually your course director or programme administrator will know.']
        .concat(s.constraints && s.constraints.thisYear && p.level !== 'wording' ? ['Can this change be approved in time for this academic year?'] : []),
      suggestions: [
        'Publish the AI wording and any new component with the brief, not later.',
        'Mark the work on its academic merits. Do not apply a blanket penalty for permitted, declared AI use.',
        'Do not rely on AI-detection tools as evidence.',
        'Plan alternative arrangements for students with agreed adjustments before the brief is released.'
      ]
    };
    const cost = option.costs;
    return {
      title: interp.title || 'Assessment redesign',
      pattern: p, choice: choice, aiDef: aiDef, ratings: ratings, raised: raised, kept: kept,
      levelLabel: L.LEVEL_LABELS[p.level],
      summary: {
        aims: s.aims.filter(function (a) { return a.include; }).map(function (a) { return a.label; }),
        finding: s.finding || '',
        change: p.name + '. ' + fill(p.summary, sl),
        ai: aiDef.title + ' (in CTL\u2019s terms, ' + aiDef.ctl + ').',
        cost: 'Students: ' + cost.studentTime + '. Marking: ' + cost.markingPer + (cost.markingTotal ? ', ' + cost.markingTotal : '') + '.' + (offset ? ' The main word limit drops from ' + interp.wordCountText + ' to ' + formatWords(newWords, interp.wordCountText) + ' to offset the added work.' : '')
      },
      brief: brief, addition: addition, aiWording: aiWording, declaration: declaration,
      marking: weights ? { rows: weights, illustrative: true } : (p.criterion ? { rows: null, criterion: p.criterion } : null),
      why: whyText,
      implementation: p.implementation.slice(), accessibility: p.accessibility,
      checks: checks, offset: offset
    };
  }

  function packToText(pack) {
    const L2 = [];
    L2.push('# ' + pack.title + ': redesign pack', '', 'Draft for review. This is not an approval.', '');
    L2.push('## Summary', '', 'What the assessment asks students to show:');
    pack.summary.aims.forEach(function (a) { L2.push('- ' + a); });
    L2.push('', 'What AI changes: ' + pack.summary.finding, '', 'Chosen change (' + pack.levelLabel.toLowerCase() + '): ' + pack.summary.change, '', 'AI use: ' + pack.summary.ai, '', 'Cost: ' + pack.summary.cost, '');
    L2.push('## Revised brief', '');
    pack.brief.forEach(function (para) {
      const t = para.runs.map(function (r) { return r.del ? '' : r.text; }).join('');
      L2.push(para.style === 'Heading2' ? '### ' + t : t);
    });
    L2.push('', '## Marking changes', '');
    if (pack.marking && pack.marking.rows) pack.marking.rows.forEach(function (r) { L2.push('- ' + r.name + ': ' + (r.from === null ? 'new, ' : r.from + '% to ') + r.to + '%' + (r.descriptor ? ' (' + r.descriptor + ')' : '')); });
    else if (pack.marking) L2.push('- Add: ' + pack.marking.criterion.name + ' (illustrative ' + pack.marking.criterion.weight + '%). ' + pack.marking.criterion.descriptor);
    else L2.push('No change to marking criteria.');
    if (pack.marking) L2.push('', 'Weightings are illustrative, not approved replacements.');
    L2.push('', '## Why this gives better evidence', '', pack.why, '', '## Implementation', '');
    pack.implementation.forEach(function (x) { L2.push('- ' + x); });
    L2.push('', 'Accessibility: ' + pack.accessibility, '', '## Before you use this', '', 'Oxford policy:');
    pack.checks.policy.forEach(function (c) { L2.push('- ' + c.text + ' ' + c.link.url); });
    L2.push('', 'Check locally:');
    pack.checks.local.forEach(function (c) { L2.push('- ' + c); });
    L2.push('', 'Suggestions:');
    pack.checks.suggestions.forEach(function (c) { L2.push('- ' + c); });
    L2.push('', 'For changes to format or weighting, CTL\u2019s course and assessment redesign consultancy can help: ' + L.SOURCES.ctlConsult.url);
    return L2.join('\n');
  }

  // ── 5. Word export with real tracked changes (no external library) ──────────
  function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function docxParagraphs(paras, date) {
    let id = 1;
    const author = 'Oxford AI Toolkit (suggested)';
    return paras.map(function (p) {
      const style = p.style && p.style !== 'Normal' ? '<w:pStyle w:val="' + p.style + '"/>' : '';
      const mark = p.insPara ? '<w:rPr><w:ins w:id="' + (id++) + '" w:author="' + author + '" w:date="' + date + '"/></w:rPr>' : '';
      const pPr = (style || mark) ? '<w:pPr>' + style + mark + '</w:pPr>' : '';
      const runs = p.runs.map(function (r) {
        if (!r.text) return '';
        if (r.del) return '<w:del w:id="' + (id++) + '" w:author="' + author + '" w:date="' + date + '"><w:r><w:delText xml:space="preserve">' + xmlEsc(r.text) + '</w:delText></w:r></w:del>';
        const run = '<w:r>' + (r.bold ? '<w:rPr><w:b/></w:rPr>' : '') + '<w:t xml:space="preserve">' + xmlEsc(r.text) + '</w:t></w:r>';
        return r.ins ? '<w:ins w:id="' + (id++) + '" w:author="' + author + '" w:date="' + date + '">' + run + '</w:ins>' : run;
      }).join('');
      return '<w:p>' + pPr + runs + '</w:p>';
    }).join('');
  }
  function packToParagraphs(pack, which) {
    const out = [];
    if (which === 'brief') {
      out.push(P('Title', pack.title + ': revised brief'));
      out.push(P('Note', 'Suggested changes are shown as tracked changes. Review, edit and accept them in Word. Draft for review, not an approval.'));
      return out.concat(pack.brief);
    }
    out.push(P('Title', pack.title + ': redesign pack'));
    out.push(P('Note', 'Draft for review, produced with the Oxford AI Toolkit. It is not an approval and does not replace University policy, local requirements or the appropriate approval process.'));
    out.push(P('Heading1', 'Summary'));
    out.push(P('Heading2', 'What the assessment asks students to show'));
    pack.summary.aims.forEach(function (a) { out.push(P('Normal', '\u2022 ' + a)); });
    out.push(P('Heading2', 'What AI changes'));
    out.push(P('Normal', pack.summary.finding));
    out.push(P('Heading2', 'Chosen change'));
    out.push({ style: 'Normal', runs: [{ text: pack.levelLabel + '. ', bold: true }, { text: pack.summary.change }] });
    out.push(P('Heading2', 'AI use'));
    out.push(P('Normal', pack.summary.ai));
    out.push(P('Heading2', 'Cost'));
    out.push(P('Normal', pack.summary.cost));
    out.push(P('Heading1', 'Revised brief (tracked changes)'));
    pack.brief.forEach(function (b) { out.push(b.style === 'Heading2' ? Object.assign({}, b, { style: 'Heading3' }) : b); });
    out.push(P('Heading1', 'Marking changes'));
    if (pack.marking && pack.marking.rows) pack.marking.rows.forEach(function (r) { out.push(P('Normal', '\u2022 ' + r.name + ': ' + (r.from === null ? 'new criterion, ' : r.from + '% to ') + r.to + '%' + (r.descriptor ? '. ' + r.descriptor : ''))); });
    else if (pack.marking) out.push(P('Normal', '\u2022 Add: ' + pack.marking.criterion.name + ' (illustrative ' + pack.marking.criterion.weight + '%). ' + pack.marking.criterion.descriptor));
    else out.push(P('Normal', 'No change to marking criteria.'));
    if (pack.marking) out.push(P('Note', 'Weightings are illustrative, not approved replacements.'));
    out.push(P('Heading1', 'Why this gives better evidence'));
    out.push(P('Normal', pack.why));
    out.push(P('Heading1', 'Implementation'));
    pack.implementation.forEach(function (x) { out.push(P('Normal', '\u2022 ' + x)); });
    out.push({ style: 'Normal', runs: [{ text: 'Accessibility. ', bold: true }, { text: pack.accessibility }] });
    out.push(P('Heading1', 'Before you use this'));
    out.push(P('Heading2', 'Oxford policy'));
    pack.checks.policy.forEach(function (c) { out.push(P('Normal', '\u2610 ' + c.text + ' ' + c.link.url)); });
    out.push(P('Heading2', 'Check locally'));
    pack.checks.local.forEach(function (c) { out.push(P('Normal', '\u2610 ' + c)); });
    out.push(P('Heading2', 'Suggestions'));
    pack.checks.suggestions.forEach(function (c) { out.push(P('Normal', '\u2610 ' + c)); });
    out.push(P('Note', 'For changes to format or weighting, CTL\u2019s course and assessment redesign consultancy can help: ' + L.SOURCES.ctlConsult.url));
    return out;
  }

  const CRC_TABLE = (function () { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files) {
    const enc = new TextEncoder();
    const chunks = [], central = [];
    let offset = 0;
    files.forEach(function (f) {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x5A21, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      chunks.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, 0, true); c.setUint16(14, 0x5A21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cSize, true); e.setUint32(16, offset, true);
    const all = chunks.concat(central, [new Uint8Array(e.buffer)]);
    const total = all.reduce(function (a, b) { return a + b.length; }, 0);
    const out = new Uint8Array(total); let pos = 0;
    all.forEach(function (b) { out.set(b, pos); pos += b.length; });
    return out;
  }
  function buildDocx(pack, which, now) {
    const date = (now || new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    const body = docxParagraphs(packToParagraphs(pack, which), date);
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + '><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:right="1300" w:bottom="1300" w:left="1300" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    function st(id, name, size, color, bold, after, extra) {
      return '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="' + (extra || 240) + '" w:after="' + after + '"/>' + (id.indexOf('Heading') === 0 ? '<w:keepNext/>' : '') + '</w:pPr><w:rPr>' + (bold ? '<w:b/>' : '') + '<w:color w:val="' + color + '"/><w:sz w:val="' + size + '"/></w:rPr></w:style>';
    }
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + W + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      st('Title', 'Title', 36, '002147', true, 120, 0) + st('Heading1', 'heading 1', 30, '002147', true, 120) + st('Heading2', 'heading 2', 25, '002147', true, 80) + st('Heading3', 'heading 3', 23, '15616D', true, 60) + st('Note', 'Note', 19, '61615F', false, 160, 60) + '</w:styles>';
    const settings = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ' + W + '><w:trackRevisions/></w:settings>';
    const files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>' },
      { name: 'word/document.xml', data: doc },
      { name: 'word/styles.xml', data: styles },
      { name: 'word/settings.xml', data: settings }
    ];
    return zipStore(files);
  }

  function classifyAim(text) { return L.CLASSIFY_ORDER.find(function (k) { return matchKind(text, k); }) || 'analyze'; }

  root.REDESIGN_ENGINE = {
    classifyAim, interpretBrief, defaultPriority, stressTest, tryItPrompt, selectOptions, ratingsFor,
    buildPack, packToText, buildDocx, quoteIsGrounded, CONSTRAINTS, baselineFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
