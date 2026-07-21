(function () {
  'use strict';

  const TOOLKIT_URL = '../#home';
  const ADVISER_URL = 'https://chatgpt.com/g/g-6a34be218e888191980e7c250b2167cb-oxford-ai-adviser';
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const MAX_TEXT_PER_FILE = 80000;
  const MAX_COMBINED_TEXT = 220000;

  const state = {
    step: 1,
    files: [],
    report: null
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const form = $('#designerForm');
  const workspace = $('#workspace');
  const hero = $('#welcome');
  const results = $('#results');
  const toast = $('#toast');

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\t ]+\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  function truncate(value, limit) {
    const text = cleanText(value);
    if (text.length <= limit) return text;
    return text.slice(0, limit).trim() + '\n\n[Text shortened for this output.]';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function slugify(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'assessment-redesign';
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copyText(text, successMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => showToast(successMessage || 'Copied')).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast('Copied');
  }

  function populateFormats() {
    const select = $('#format');
    const formats = Array.isArray(window.OXFORD_FORMATS) ? window.OXFORD_FORMATS : [];
    const groups = new Map();
    formats.forEach(item => {
      const groupLabel = item.format + ' - ' + item.type;
      if (!groups.has(groupLabel)) groups.set(groupLabel, []);
      groups.get(groupLabel).push(item);
    });
    groups.forEach((items, label) => {
      const group = document.createElement('optgroup');
      group.label = label;
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.task;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
    const custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'Other or custom format';
    select.appendChild(custom);
  }

  function selectedFormat() {
    const id = $('#format').value;
    return (window.OXFORD_FORMATS || []).find(item => item.id === id) || null;
  }

  function formatLabel(data) {
    const item = selectedFormat();
    if (item) return item.task + ' (' + item.format + ', ' + item.type + ')';
    return data.format === 'custom' ? 'Custom assessment format' : 'Assessment format not yet selected';
  }

  function getChecked(name) {
    return $$('input[name="' + name + '"]:checked').map(input => input.value);
  }

  function getData() {
    const formatItem = selectedFormat();
    return {
      department: cleanText($('#department').value),
      division: cleanText($('#division').value),
      course: cleanText($('#course').value),
      level: $('#level').value,
      cohort: cleanText($('#cohort').value),
      assessmentStatus: $('#assessmentStatus').value,
      format: $('#format').value,
      formatItem: formatItem,
      formatLabel: formatItem ? formatItem.task + ' (' + formatItem.format + ', ' + formatItem.type + ')' : 'Custom assessment format',
      weighting: cleanText($('#weighting').value),
      duration: cleanText($('#duration').value),
      assessmentTitle: cleanText($('#assessmentTitle').value),
      currentBrief: cleanText($('#currentBrief').value),
      localGuidance: cleanText($('#localGuidance').value),
      learningOutcomes: cleanText($('#learningOutcomes').value),
      capabilities: getChecked('capability'),
      centralJudgement: cleanText($('#centralJudgement').value),
      evidence: getChecked('evidence'),
      permission: $('#permission').value,
      independentPerformance: $('#independentPerformance').value,
      concerns: getChecked('concern'),
      constraints: getChecked('constraint'),
      otherConstraints: cleanText($('#otherConstraints').value),
      fileNames: state.files.map(file => file.name)
    };
  }

  function validateStep(step, showMessage) {
    const panel = $('.form-step[data-step="' + step + '"]');
    let valid = true;
    $$('.field', panel).forEach(field => field.classList.remove('invalid'));
    $$('[required]', panel).forEach(input => {
      if (input.type === 'checkbox') {
        if (!input.checked) valid = false;
      } else if (!cleanText(input.value)) {
        valid = false;
        const field = input.closest('.field');
        if (field) field.classList.add('invalid');
      }
    });
    if (!valid && showMessage) {
      showToast(step === 5 ? 'Please confirm both statements before generating.' : 'Complete the required fields before continuing.');
      const firstInvalid = panel.querySelector('.invalid input, .invalid select, .invalid textarea, input[required]:not(:checked)');
      if (firstInvalid) firstInvalid.focus();
    }
    return valid;
  }

  function updateProgress() {
    const percent = state.step * 20;
    $('#progressText').textContent = 'Step ' + state.step + ' of 5';
    $('#progressPercent').textContent = percent + '%';
    $('#progressBar').style.width = percent + '%';
    $$('.step-link').forEach(button => {
      const step = Number(button.dataset.stepLink);
      button.classList.toggle('active', step === state.step);
      button.classList.toggle('complete', step < state.step);
      button.setAttribute('aria-current', step === state.step ? 'step' : 'false');
    });
    $$('.form-step').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.step) === state.step));
    $('#backButton').disabled = state.step === 1;
    $('#nextButton').classList.toggle('hidden', state.step === 5);
    $('#generateButton').classList.toggle('hidden', state.step !== 5);
    if (state.step === 5) renderReview();
    workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function goToStep(nextStep, force) {
    if (!force && nextStep > state.step && !validateStep(state.step, true)) return;
    state.step = Math.max(1, Math.min(5, nextStep));
    updateProgress();
  }

  function renderReview() {
    const data = getData();
    const items = [
      ['Context', [data.department, data.division, data.course, data.level, data.assessmentStatus].filter(Boolean).join(' | ')],
      ['Current format', data.formatLabel + (data.duration ? ' | ' + data.duration : '') + (data.weighting ? ' | ' + data.weighting : '')],
      ['Learning outcomes', truncate(data.learningOutcomes, 850)],
      ['Central judgement', data.centralJudgement || 'The app will infer a draft from the learning outcomes and assessment brief.'],
      ['Evidence', data.evidence.length ? data.evidence.join(', ') : 'The app will recommend proportionate evidence forms.'],
      ['AI permission', data.permission === 'unknown' ? 'Recommend a Toolkit level' : permissionTitle(data.permission)],
      ['Constraints', [...data.constraints, data.otherConstraints].filter(Boolean).join('; ') || 'None entered']
    ];
    $('#reviewSummary').innerHTML = items.map(item => '<div class="review-card"><h3>' + escapeHTML(item[0]) + '</h3><p>' + escapeHTML(item[1]) + '</p></div>').join('');
  }

  function startWorkspace() {
    hero.classList.add('hidden');
    results.classList.add('hidden');
    workspace.classList.remove('hidden');
    state.step = 1;
    updateProgress();
  }

  function loadDemo() {
    startWorkspace();
    $('#department').value = 'Business and Management';
    $('#division').value = 'Business and Management';
    $('#course').value = 'Strategy and Responsible Leadership';
    $('#level').value = 'Postgraduate taught';
    $('#cohort').value = '60';
    $('#assessmentStatus').value = 'Summative';
    const format = (window.OXFORD_FORMATS || []).find(item => /case/i.test(item.task)) || (window.OXFORD_FORMATS || []).find(item => item.format === 'Submission');
    if (format) $('#format').value = format.id;
    $('#weighting').value = '40% of the course mark';
    $('#duration').value = '2,500 words';
    $('#assessmentTitle').value = 'Strategic recommendation for a live organisational challenge';
    $('#currentBrief').value = 'Students submit an individual report analysing a case organisation and making a recommendation to its senior leadership. The report should use course concepts and relevant evidence. Current criteria focus on understanding, analysis, recommendation, structure and presentation.';
    $('#learningOutcomes').value = '1. Apply relevant theoretical frameworks to a complex organisational problem.\n2. Evaluate incomplete and conflicting evidence.\n3. Reach and communicate a defensible strategic recommendation.\n4. Consider implementation risks and ethical implications.';
    ['professional judgement', 'analytical reasoning', 'communication'].forEach(value => {
      const input = $('input[name="capability"][value="' + value + '"]');
      if (input) input.checked = true;
    });
    $('#centralJudgement').value = 'A successful student should be able to reach, justify and communicate a responsible strategic recommendation under uncertainty.';
    ['critique', 'application', 'decision account'].forEach(value => {
      const input = $('input[name="evidence"][value="' + value + '"]');
      if (input) input.checked = true;
    });
    $('#permission').value = 'open';
    ['AI can produce a plausible final answer', 'student reasoning is not visible', 'source or factual verification'].forEach(value => {
      const input = $('input[name="concern"][value="' + value + '"]');
      if (input) input.checked = true;
    });
    ['keep the current assessment format', 'avoid additional marking workload'].forEach(value => {
      const input = $('input[name="constraint"][value="' + value + '"]');
      if (input) input.checked = true;
    });
    showToast('Worked example loaded');
  }

  async function extractFile(file) {
    if (file.size > MAX_FILE_BYTES) throw new Error('File exceeds the 10 MB limit.');
    const name = file.name;
    const extension = name.split('.').pop().toLowerCase();
    let text = '';

    if (extension === 'pdf') {
      if (!window.pdfjsLib || window.__pdfLibraryFailed) throw new Error('PDF reader did not load. Paste the relevant text instead.');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str).join(' '));
        if (pages.join('\n').length >= MAX_TEXT_PER_FILE) break;
      }
      text = pages.join('\n\n');
    } else if (extension === 'docx') {
      if (!window.mammoth || window.__docxLibraryFailed) throw new Error('DOCX reader did not load. Paste the relevant text instead.');
      const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      text = result.value;
    } else {
      text = await file.text();
      if (extension === 'html' || extension === 'htm') {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        text = doc.body ? doc.body.innerText : text;
      } else if (extension === 'rtf') {
        text = text.replace(/\\'[0-9a-fA-F]{2}/g, ' ').replace(/\\[a-z]+\d* ?/g, ' ').replace(/[{}]/g, ' ');
      }
    }
    return truncate(text, MAX_TEXT_PER_FILE);
  }

  function sensitiveContentWarning(fileName, text) {
    const sample = (fileName + ' ' + text.slice(0, 5000)).toLowerCase();
    const patterns = [
      /candidate\s*(number|id)/,
      /student\s*(number|id|name)/,
      /confidential/,
      /special category/,
      /unreleased\s+exam/,
      /exam\s+paper/,
      /patient\s+(name|record|id)/,
      /@[a-z0-9.-]+\.[a-z]{2,}/
    ];
    return patterns.some(pattern => pattern.test(sample));
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const file of files) {
      try {
        showToast('Reading ' + file.name + ' locally...');
        const text = await extractFile(file);
        const record = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), name: file.name, size: file.size, text: text };
        state.files.push(record);
        const current = $('#currentBrief').value;
        const addition = '\n\n===== Extracted from ' + file.name + ' =====\n' + text;
        $('#currentBrief').value = truncate(current + addition, MAX_COMBINED_TEXT);
        if (sensitiveContentWarning(file.name, text)) {
          showToast('Review this file for personal, confidential or unreleased material.');
        } else {
          showToast(file.name + ' added');
        }
      } catch (error) {
        showToast(file.name + ': ' + error.message);
      }
    }
    renderFileList();
    $('#fileInput').value = '';
  }

  function renderFileList() {
    const list = $('#fileList');
    if (!state.files.length) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = state.files.map(file => '<div class="file-item"><div><strong>' + escapeHTML(file.name) + '</strong><span>' + Math.round(file.size / 1024) + ' KB | ' + file.text.length.toLocaleString() + ' characters extracted</span></div><button type="button" data-remove-file="' + escapeHTML(file.id) + '" aria-label="Remove ' + escapeHTML(file.name) + '">Remove</button></div>').join('');
  }

  function identifyProfile(data) {
    const haystack = [data.department, data.division, data.course, data.learningOutcomes, data.currentBrief].join(' ').toLowerCase();
    const profiles = [
      {
        id: 'medical', label: 'Medical and clinical sciences', keywords: ['medicine', 'medical', 'clinical', 'patient', 'surgery', 'nursing', 'health', 'osce', 'diagnosis'],
        judgement: 'clinical reasoning, patient safety, ethical judgement and communication',
        evidence: ['case-based reasoning', 'prioritisation under uncertainty', 'structured justification', 'safe application to a changed presentation'],
        transformative: 'Use a case sequence or structured station in which the information changes. Require the student to update the diagnosis, management plan and safety rationale.'
      },
      {
        id: 'law', label: 'Law', keywords: ['law', 'legal', 'jurisprudence', 'statute', 'case law', 'advocacy'],
        judgement: 'issue spotting, use of authority, legal reasoning and defensible advice',
        evidence: ['authority checking', 'reasoned treatment of competing arguments', 'application to a changed fact pattern', 'written or oral defence of advice'],
        transformative: 'Use an advisory opinion followed by a short changed-facts addendum. Ask the student to explain which authorities control and why the conclusion changes or remains stable.'
      },
      {
        id: 'business', label: 'Business and management', keywords: ['business', 'management', 'mba', 'strategy', 'finance', 'marketing', 'organisation', 'leadership', 'operations', 'entrepreneur'],
        judgement: 'decision quality, trade-offs, responsible leadership and implementation',
        evidence: ['decision criteria', 'treatment of uncertainty', 'implementation choices', 'response to a board-style challenge'],
        transformative: 'Use a decision memo with an implementation appendix and a short response to a new constraint, stakeholder objection or data update.'
      },
      {
        id: 'engineering', label: 'Engineering and computing', keywords: ['engineering', 'computer', 'computing', 'software', 'code', 'algorithm', 'system', 'cyber', 'design'],
        judgement: 'design choices, technical reasoning, testing, reliability and responsible implementation',
        evidence: ['design rationale', 'test evidence', 'error analysis', 'response to a changed requirement'],
        transformative: 'Use a design dossier with executable or observable evidence, a testing report and a change request that requires the student to adapt the solution.'
      },
      {
        id: 'mpls', label: 'Mathematical, physical and life sciences', keywords: ['mathematics', 'maths', 'physics', 'chemistry', 'biology', 'biochemistry', 'statistics', 'laboratory', 'science', 'modelling'],
        judgement: 'problem formulation, method selection, interpretation, uncertainty and scientific reasoning',
        evidence: ['method justification', 'worked reasoning', 'sensitivity or error analysis', 'application to changed parameters or new data'],
        transformative: 'Use a problem, model or investigation with a parameter variation, data perturbation or method comparison that requires fresh reasoning rather than reproduction.'
      },
      {
        id: 'languages', label: 'Languages and translation', keywords: ['language', 'languages', 'linguistic', 'translation', 'french', 'german', 'spanish', 'italian', 'arabic', 'chinese', 'japanese', 'classics'],
        judgement: 'linguistic control, interpretation, translation choices and audience awareness',
        evidence: ['live or time-limited production', 'commentary on translation choices', 'comparison of alternatives', 'application to a new passage or register'],
        transformative: 'Combine the translated or produced text with a concise commentary on difficult choices and a new passage or register shift completed under proportionate controlled conditions.'
      },
      {
        id: 'arts', label: 'Creative arts and performance', keywords: ['art', 'music', 'performance', 'theatre', 'creative', 'composition', 'studio', 'curatorial', 'film'],
        judgement: 'creative intention, craft, interpretation, process and critical self-evaluation',
        evidence: ['portfolio or performance evidence', 'process documentation', 'critical commentary', 'response to feedback or a new constraint'],
        transformative: 'Use a portfolio or performance with a process dossier, curatorial rationale and a documented response to critique or a revised creative constraint.'
      },
      {
        id: 'humanities', label: 'Humanities', keywords: ['history', 'philosophy', 'literature', 'english', 'theology', 'religion', 'archaeology', 'humanities', 'classical'],
        judgement: 'interpretation, argument, use of primary and secondary evidence and engagement with alternatives',
        evidence: ['close analysis', 'source evaluation', 'treatment of counter-interpretations', 'application of an argument to a new source'],
        transformative: 'Use an interpretive essay or commentary with a short alternative-reading section and a new source, passage or objection that tests whether the argument travels.'
      },
      {
        id: 'education', label: 'Education', keywords: ['education', 'pedagogy', 'teaching', 'learning', 'curriculum'],
        judgement: 'pedagogical reasoning, use of evidence, design choices and reflection on consequences',
        evidence: ['evidence-informed rationale', 'consideration of learner context', 'design trade-offs', 'application to a changed educational setting'],
        transformative: 'Use a design proposal with an evidence rationale, learner-impact analysis and an adaptation task for a different cohort or delivery context.'
      },
      {
        id: 'social', label: 'Social sciences', keywords: ['economics', 'politics', 'policy', 'sociology', 'geography', 'anthropology', 'international relations', 'social science', 'development'],
        judgement: 'theoretical reasoning, evidence evaluation, causal or interpretive claims and policy implications',
        evidence: ['theory-to-evidence alignment', 'source and data evaluation', 'treatment of alternative explanations', 'application to a new case or data point'],
        transformative: 'Use an analytical or policy brief with a source audit and a short response to new data, a changed assumption or a competing explanation.'
      }
    ];
    const matchesKeyword = (text, keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'i').test(text);
    };
    const primaryContext = [data.department, data.course].join(' ').toLowerCase();
    const primaryMatch = profiles.find(profile => profile.keywords.some(keyword => matchesKeyword(primaryContext, keyword)));
    if (primaryMatch) return primaryMatch;

    const divisionAffinity = {
      'medical sciences': 'medical',
      'mathematical, physical and life sciences': 'mpls',
      'humanities': 'humanities',
      'social sciences': 'social',
      'business and management': 'business'
    }[String(data.division || '').toLowerCase()];

    let best = null;
    let score = 0;
    profiles.forEach(profile => {
      const keywordScore = profile.keywords.reduce((total, keyword) => total + (matchesKeyword(haystack, keyword) ? 1 : 0), 0);
      const profileScore = keywordScore + (divisionAffinity === profile.id ? 2 : 0);
      if (profileScore > score) {
        best = profile;
        score = profileScore;
      }
    });
    return best || {
      id: 'generic', label: 'Cross-disciplinary', judgement: 'disciplinary understanding, reasoned judgement, application and responsible communication',
      evidence: ['reasoned justification', 'evaluation of evidence', 'application to a new context', 'account of key decisions'],
      transformative: 'Use a paired assessment in which the main artefact is complemented by a concise evidence component that tests explanation, application and responsibility.'
    };
  }

  function permissionTitle(value) {
    return {
      'not-permitted': 'Not Permitted',
      limited: 'Limited',
      open: 'Open',
      integral: 'Integral',
      unknown: 'Recommend a level'
    }[value] || 'Limited';
  }

  function recommendPermission(data) {
    if (data.permission && data.permission !== 'unknown') return data.permission;
    const text = [data.learningOutcomes, data.currentBrief, data.capabilities.join(' ')].join(' ').toLowerCase();
    const format = data.formatItem || {};
    const controlled = /invigilated|viva voce|oral examination|osce|practical test|performance/i.test((format.type || '') + ' ' + (format.task || ''));
    const aiIsOutcome = data.capabilities.includes('responsible AI use') || /(evaluate|audit|critique|use)\s+(generative\s+)?ai|artificial intelligence|large language model/.test(text);
    if (aiIsOutcome) return 'integral';
    if (controlled && data.independentPerformance === 'high') return 'not-permitted';
    if (data.independentPerformance === 'high') return 'limited';
    if (/submission|open book|long duration/i.test((format.format || '') + ' ' + (format.type || '')) && (data.capabilities.includes('professional judgement') || data.capabilities.includes('research practice'))) return 'open';
    if (/coding|data analysis|dissertation|project|report|essay/i.test((format.task || '') + ' ' + data.currentBrief)) return 'open';
    return 'limited';
  }

  function permissionDetails(level, data) {
    const localMap = {
      'not-permitted': 'Usually maps to Not authorised use in local category language.',
      limited: 'Usually sits within Selective authorised use in local category language.',
      open: 'Usually sits within Selective authorised use in local category language.',
      integral: 'Usually maps to Integral use required in local category language.'
    };
    const details = {
      'not-permitted': {
        rationale: 'Independent unaided performance is central to the intended evidence, or the assessment operates under controlled conditions.',
        wording: 'Generative AI is not permitted in the preparation or production of work submitted for this assessment, except where a specific use has been authorised in writing or is provided through an approved reasonable adjustment or assistive technology arrangement. Students must complete and submit their own work in accordance with all assessment instructions.',
        permitted: 'Only uses explicitly authorised in writing, including any approved assistive technology or reasonable adjustment.',
        prohibited: 'Generating, rewriting, translating, solving, analysing or otherwise producing material for submission unless explicitly authorised.',
        declaration: 'I confirm that I have not used generative AI in preparing or producing this assessment, except for any use explicitly authorised in writing or approved as a reasonable adjustment. I remain responsible for the work submitted.'
      },
      limited: {
        rationale: 'Specific support can assist learning without replacing the capability the assessment is intended to evidence.',
        wording: 'Generative AI may be used only for the limited purposes listed below. It must not be used to generate the substantive analysis, argument, solution, interpretation, recommendation or conclusion submitted for assessment. Any authorised use must be declared in the required format. Students remain responsible for accuracy, originality, evidence, sources, ethics and the final submission.',
        permitted: 'Idea generation, planning, language support, formatting or checking only where these uses are explicitly listed by the assessment setter.',
        prohibited: 'Producing substantive content, disciplinary reasoning, evidence, calculations, code, conclusions or references that replace the student capability being assessed.',
        declaration: 'I used generative AI only for the following authorised limited purposes: [state tool and purpose]. I checked the resulting material and confirm that the substantive analysis, reasoning and conclusions are my own. I remain responsible for the accuracy, originality and integrity of the submission.'
      },
      open: {
        rationale: 'AI may support broad parts of the process, but the assessment should still produce credible evidence of the student\'s own judgement and responsibility.',
        wording: 'Generative AI may be used to support the preparation and production of this assessment, subject to the requirements below. Students must critically evaluate and verify AI-assisted material, use appropriate disciplinary sources, protect confidential or restricted information, and declare the tools used and their material contribution. The student remains responsible for all claims, evidence, references, decisions and the final submission.',
        permitted: 'Broad process support, including exploration, drafting, analysis or checking, where consistent with the task and local guidance.',
        prohibited: 'Submitting unverified or fabricated material, uploading restricted information to an inappropriate service, concealing material AI use, or allowing AI to replace required direct evidence of student learning.',
        declaration: 'I used the following generative AI tool or tools: [name]. I used them for: [purposes]. Their material contribution to the submitted work was: [brief description]. I independently checked relevant claims, evidence, calculations, code and references, and I remain responsible for the final submission.'
      },
      integral: {
        rationale: 'Using and evaluating AI is part of the learning outcome and must therefore be designed, evidenced and marked explicitly.',
        wording: 'Use of the specified generative AI capability is required for the component identified below. Students must document the authorised workflow, critically evaluate the output, verify relevant claims and sources, identify limitations and risks, and explain the decisions made in producing the final response. Only tools and data workflows authorised for this assessment may be used.',
        permitted: 'The specific AI-supported activity required by the task, using the authorised tool or service and an appropriate information classification.',
        prohibited: 'Undeclared tools, inappropriate handling of restricted information, uncritical acceptance of output, fabricated evidence or any use outside the specified workflow.',
        declaration: 'I used the required generative AI tool or tools for the specified component. I have described the workflow, critically evaluated the output, verified relevant claims and sources, and explained the decisions I made. I remain responsible for the final submission.'
      }
    };
    const result = details[level] || details.limited;
    result.localMap = localMap[level];
    result.title = permissionTitle(level);
    return result;
  }

  function ensureEvidence(data, profile) {
    const evidence = data.evidence.slice();
    if (!evidence.length) {
      evidence.push('critique', 'application', 'decision account');
      if (!data.constraints.includes('do not add an oral component') && Number(data.cohort || 0) <= 80) evidence.push('defence');
    }
    if (data.concerns.includes('student reasoning is not visible') && !evidence.includes('decision account')) evidence.push('decision account');
    if (data.concerns.includes('source or factual verification') && !evidence.includes('critique')) evidence.push('critique');
    return Array.from(new Set(evidence)).slice(0, 4);
  }

  function calculateScores(data, evidence, permission) {
    const formatText = data.formatItem ? data.formatItem.type + ' ' + data.formatItem.task : '';
    const controlled = /invigilated|oral|viva|osce|practical|performance/i.test(formatText);
    const valid = Math.min(96, 54 + (data.learningOutcomes.length > 60 ? 13 : 4) + (data.centralJudgement ? 13 : 5) + (data.capabilities.length ? 9 : 2) + (data.formatItem ? 8 : 3));
    const inclusive = Math.min(94, 57 + (data.concerns.includes('accessibility and reasonable adjustments') ? 12 : 5) + (data.concerns.includes('equitable access to tools') ? 10 : 5) + (data.otherConstraints ? 6 : 2) + (controlled ? 4 : 8));
    const visible = Math.min(97, 48 + evidence.length * 10 + (controlled ? 9 : 3) + (data.centralJudgement ? 7 : 2));
    const accountable = Math.min(96, 55 + (permission !== 'unknown' ? 13 : 8) + (data.localGuidance ? 8 : 3) + (data.concerns.includes('source or factual verification') ? 7 : 4) + 8);
    return { valid, inclusive, visible, accountable, overall: Math.round((valid + inclusive + visible + accountable) / 4) };
  }

  function aiExposure(data) {
    const format = data.formatItem || {};
    const text = ((format.format || '') + ' ' + (format.type || '') + ' ' + (format.task || '')).toLowerCase();
    if (/invigilated|viva voce|oral examination|osce|practical tests|performance/.test(text)) return { label: 'Lower', score: 32 };
    if (/online, open book|long duration|submission|dissertation|essay|report|project/.test(text)) return { label: 'Higher', score: 84 };
    return { label: 'Moderate', score: 58 };
  }

  function evidenceMechanismText(item, data) {
    const noOral = data.constraints.includes('do not add an oral component');
    const map = {
      critique: 'Require explicit evaluation of the strongest alternative, source, method or AI-assisted output, including what is accepted, rejected and why.',
      defence: noOral ? 'Require a concise written defence note that explains the most consequential choices, assumptions and limitations.' : 'Use a short structured defence, applied consistently to all students or a defined sample, to test explanation and ownership of key decisions.',
      application: 'Add a new case, source, data point, constraint or parameter that requires students to apply the same judgement in a changed context.',
      'decision account': 'Require a proportionate decision account identifying the key choices, evidence used, alternatives considered and revisions made.'
    };
    return map[item] || item;
  }

  function directEvidenceDeliverables(evidence, data) {
    const noOral = data.constraints.includes('do not add an oral component');
    return evidence.map(item => {
      if (item === 'critique') return 'A concise critical evaluation of a key source, method, alternative interpretation or AI-assisted contribution.';
      if (item === 'defence') return noOral ? 'A written defence note explaining and justifying the most consequential choices.' : 'A short structured explanation or defence of selected choices, with an accessible alternative where required.';
      if (item === 'application') return 'A response to a new case, source, parameter, dataset, stakeholder objection or changed condition.';
      if (item === 'decision account') return 'A concise decision account showing how the approach, evidence and conclusion developed.';
      return item;
    });
  }

  function buildRoutes(data, profile, evidence, permissionInfo) {
    const keepFormat = data.constraints.includes('keep the current assessment format');
    const avoidWorkload = data.constraints.includes('avoid additional marking workload');
    const noOral = data.constraints.includes('do not add an oral component');
    const evidenceText = evidence.map(item => evidenceMechanismText(item, data));
    const formatStrategy = data.formatItem ? data.formatItem.strategy : 'Clarify the intended learning, align the task and criteria, and add proportionate evidence of reasoning, application and responsibility.';
    const routeOne = {
      tag: 'Lowest disruption',
      title: 'Clarify and strengthen the current format',
      summary: 'Keep the current assessment structure while making the intended judgement, AI permissions and evidence requirements explicit.',
      actions: [
        'Rewrite the opening instruction around this judgement: ' + inferJudgement(data, profile),
        evidenceText[0] || 'Add a concise explanation of key choices.',
        'Use the ' + permissionInfo.title + ' permission wording and declaration in advance.',
        'Revise the rubric so disciplinary judgement and verification are marked directly, not only the quality of the final artefact.'
      ],
      workload: avoidWorkload ? 'Designed to replace or sharpen existing criteria rather than add a separately marked component.' : 'Low additional design and marking demand.'
    };
    const routeTwo = {
      tag: 'Recommended',
      title: 'Triangulate the evidence of learning',
      summary: 'Retain the main artefact and add a proportionate second source of evidence that tests critique, application or explanation.',
      actions: [
        evidenceText[0],
        evidenceText[1] || 'Require application to a new context.',
        noOral ? 'Use a short written or embedded evidence component rather than an oral follow-up.' : 'Use a structured, consistently applied explanation or defence only where feasible and approved.',
        'Keep the additional evidence focused and short so it strengthens validity without becoming a second full assessment.'
      ].filter(Boolean),
      workload: avoidWorkload ? 'Use a 300 to 500 word evidence appendix or an embedded rubric row to cap marking demand.' : 'Moderate design effort with a stronger validity gain.'
    };
    const routeThree = {
      tag: keepFormat ? 'Within-format transformation' : 'Transformative option',
      title: keepFormat ? 'Transform the task while retaining the approved format' : 'Use an authentic disciplinary performance',
      summary: profile.transformative,
      actions: [
        formatStrategy,
        'Design the main decision or performance around ' + profile.judgement + '.',
        evidenceText[2] || 'Apply the judgement to a novel or unscripted context.',
        'Build accessibility, equitable tool access, declaration and data handling into the design from the start.'
      ],
      workload: 'Highest design effort. Use where the current task no longer provides credible evidence of the intended learning.'
    };
    return [routeOne, routeTwo, routeThree];
  }

  function inferJudgement(data, profile) {
    if (data.centralJudgement) return data.centralJudgement.replace(/[.]+$/, '');
    const outcomes = cleanText(data.learningOutcomes)
      .split('\n')
      .map(item => item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 2);
    if (outcomes.length) {
      const joined = outcomes.join('; ');
      return 'A successful student should be able to ' + joined.charAt(0).toLowerCase() + joined.slice(1).replace(/[.]+$/, '');
    }
    return 'A successful student should be able to demonstrate ' + profile.judgement;
  }

  function markingCriteria(profile, evidence, permission) {
    let labels;
    if (profile.id === 'medical') {
      labels = ['Clinical knowledge and evidence', 'Clinical reasoning and prioritisation', 'Safety, ethics and application', 'Visible reasoning and verification', 'Communication'];
    } else if (profile.id === 'law') {
      labels = ['Knowledge and use of authority', 'Legal analysis and judgement', 'Application and advice', 'Visible reasoning and verification', 'Communication'];
    } else if (profile.id === 'business') {
      labels = ['Use of concepts and evidence', 'Analysis and decision quality', 'Implementation and responsible judgement', 'Visible reasoning and verification', 'Communication'];
    } else if (profile.id === 'engineering' || profile.id === 'mpls') {
      labels = ['Technical knowledge and evidence', 'Method and analytical reasoning', 'Application, testing and interpretation', 'Visible reasoning and verification', 'Communication'];
    } else if (profile.id === 'languages') {
      labels = ['Linguistic accuracy and control', 'Interpretive or translation judgement', 'Application to audience and context', 'Visible reasoning and verification', 'Communication'];
    } else if (profile.id === 'arts') {
      labels = ['Creative or performative achievement', 'Critical and contextual judgement', 'Process, development and application', 'Visible reasoning and verification', 'Communication'];
    } else if (profile.id === 'humanities') {
      labels = ['Disciplinary knowledge and evidence', 'Interpretation and argument', 'Engagement with alternatives and application', 'Visible reasoning and verification', 'Communication'];
    } else {
      labels = ['Disciplinary knowledge and evidence', 'Analysis and judgement', 'Application and decision quality', 'Visible reasoning and verification', 'Communication'];
    }
    const weights = [25, 30, 20, 15, 10];
    if (permission === 'integral') {
      labels[3] = 'Critical AI use, verification and visible reasoning';
      weights[2] = 18;
      weights[3] = 17;
    }
    return labels.map((label, index) => ({ label, weight: weights[index] }));
  }

  function buildRevisedBrief(data, profile, evidence, permissionInfo, criteria) {
    const title = data.assessmentTitle || 'Revised ' + (data.formatItem ? data.formatItem.task : 'assessment');
    const judgement = inferJudgement(data, profile);
    const capabilities = data.capabilities.length ? data.capabilities.join(', ') : profile.judgement;
    const deliverables = directEvidenceDeliverables(evidence, data);
    const coreTask = data.formatItem ? 'Complete a ' + data.formatItem.task.toLowerCase() + ' in the approved ' + data.formatItem.format.toLowerCase() + ' format.' : 'Complete the assessment in the approved format.';
    const duration = data.duration ? ' The expected length or duration is ' + data.duration + '.' : '';
    const weighting = data.weighting ? ' This assessment contributes ' + data.weighting + '.' : '';
    const originalContext = data.currentBrief ? truncate(data.currentBrief.replace(/===== Extracted from[\s\S]*/i, ''), 1000) : '';
    const criteriaText = criteria.map(item => '- ' + item.label + ': ' + item.weight + '%').join('\n');
    const evidenceText = deliverables.map((item, index) => (index + 1) + '. ' + item).join('\n');

    return cleanText(
      title + '\n\n' +
      'Status and approval\n' +
      'This assessment brief must be checked against current University policy, Examination Regulations, applicable divisional, departmental, faculty, school, programme and college requirements, accessibility obligations, and any formal approval process.\n\n' +
      'Purpose\n' +
      'This assessment is designed to provide credible and proportionate evidence of the intended learning. The central judgement is: ' + judgement + '. The primary capabilities assessed are: ' + capabilities + '.\n\n' +
      'Task\n' +
      coreTask + duration + weighting + '\n' +
      'Your work must reach and justify a reasoned conclusion, use appropriate disciplinary evidence, address material alternatives or limitations, and show how the conclusion applies in context.\n' +
      (originalContext ? '\nExisting task context to retain or edit:\n' + originalContext + '\n' : '') +
      '\nRequired evidence of learning\n' +
      'Submit the main assessment artefact together with the following proportionate evidence:\n' + evidenceText + '\n\n' +
      'AI permission level: ' + permissionInfo.title + '\n' +
      permissionInfo.wording + '\n\n' +
      'Permitted use\n' + permissionInfo.permitted + '\n\n' +
      'Prohibited use\n' + permissionInfo.prohibited + '\n\n' +
      'Student responsibility\n' +
      'You remain responsible for the accuracy, originality, evidence, sources, calculations, code, ethical implications and final submission. Do not enter confidential, personal, restricted or unreleased material into a service unless the specific tool and workflow are authorised for that information and purpose.\n\n' +
      'Declaration\n' + permissionInfo.declaration + '\n\n' +
      'Marking criteria\n' + criteriaText + '\n\n' +
      'Accessibility and equitable access\n' +
      'The assessment will be implemented with appropriate consideration of competence standards, reasonable adjustments, disability, language, cost, digital confidence, workload, time zones and equitable baseline access to any required or permitted tools. Any oral, timed, process or additional evidence component will be specified in advance and applied consistently, with an accessible alternative where required and approved.\n\n' +
      'Verification and academic integrity\n' +
      'The design uses proportionate evidence of learning and does not treat any single process record, writing style, prompt history, detector score or oral component as proof of authorship. Concerns about possible misconduct must be handled through the applicable marking and disciplinary processes.'
    );
  }

  function implementationChecklist(data, permissionInfo) {
    const items = [
      'Confirm that the intended learning outcomes and the central judgement are accurate and approved.',
      'Check the recommended ' + permissionInfo.title + ' Toolkit level against the current local category system and use the approved local wording where required.',
      'Issue clear written permission, prohibition and declaration instructions in advance for this discrete assessment.',
      'Confirm equitable baseline provision for any authorised or required AI tool, including access, cost, training and digital confidence.',
      'Review competence standards, reasonable adjustments and accessibility for timed, oral, practical, process or additional evidence components.',
      'Check information governance, confidentiality, copyright, data protection and the suitability of the specific service and workflow.',
      'Align the marking criteria and moderation plan with the intended learning and the evidence students are required to provide.',
      'Explain the design to students with examples of permitted, prohibited and required practice before they begin the assessment.',
      'Confirm whether the change requires programme, divisional, Education Committee, board of examiners or other formal approval.',
      'Review student experience, marking workload, accessibility and the quality of evidence after the first use, then revise the design.'
    ];
    if (data.concerns.includes('group contribution is unclear')) items.splice(6, 0, 'Specify an individual source of evidence within any group assessment and make the relationship between group and individual marks explicit.');
    if (data.constraints.includes('do not add an oral component')) items.splice(5, 0, 'Use a written, embedded or asynchronous evidence mechanism rather than introducing an oral component.');
    return items;
  }

  function buildAIPrompt(data, report) {
    const inputBrief = truncate(data.currentBrief, 12000);
    const localGuidance = truncate(data.localGuidance, 6000);
    return cleanText(
      'You are supporting an Oxford faculty member to redesign an assessment. Treat the following source hierarchy as binding: (1) the written instructions for the specific assessment, (2) current official University policy and guidance, (3) applicable divisional, departmental, faculty, school, programme and college requirements, and (4) the Oxford AI Toolkit as practical implementation support. Do not invent a current Oxford rule. Flag anything that requires local confirmation or approval.\n\n' +
      'Use VIVA as the design test: Valid, Inclusive, Visible and Accountable, underpinned by integrity, honesty and transparency. The educational goal is credible evidence of judgement that students can explain, defend and apply. VIVA does not mean every assessment needs a viva voce. Use proportionate evidence such as critique, defence, application and a decision account. Do not rely on AI detection, writing-style stereotypes, complete prompt histories or any single component as proof of authorship.\n\n' +
      'Produce:\n' +
      '1. A concise diagnosis of the current assessment.\n' +
      '2. Three redesign routes: lowest disruption, stronger evidence, and transformative.\n' +
      '3. A recommended route with rationale.\n' +
      '4. A copy-ready revised assessment brief.\n' +
      '5. Explicit AI permissions, prohibited uses and a student declaration.\n' +
      '6. Marking criteria totalling 100%.\n' +
      '7. Accessibility, equitable access, data protection and implementation checks.\n' +
      '8. A list of any assumptions and questions requiring local confirmation.\n\n' +
      'Do not describe Toolkit categories as mandatory University-wide categories. Do not claim the redesign is approved. Avoid em dashes.\n\n' +
      'CONTEXT\n' +
      'Department or discipline: ' + data.department + '\n' +
      'Division or broad area: ' + data.division + '\n' +
      'Course: ' + data.course + '\n' +
      'Level: ' + data.level + '\n' +
      'Cohort: ' + data.cohort + '\n' +
      'Assessment status: ' + data.assessmentStatus + '\n' +
      'Format: ' + data.formatLabel + '\n' +
      'Length or duration: ' + data.duration + '\n' +
      'Weighting: ' + data.weighting + '\n' +
      'Capabilities: ' + data.capabilities.join(', ') + '\n' +
      'Central judgement: ' + report.judgement + '\n' +
      'Evidence forms: ' + report.evidence.join(', ') + '\n' +
      'Recommended Toolkit permission level: ' + report.permissionInfo.title + '\n' +
      'Constraints: ' + [...data.constraints, data.otherConstraints].filter(Boolean).join('; ') + '\n\n' +
      'LEARNING OUTCOMES\n' + data.learningOutcomes + '\n\n' +
      'CURRENT ASSESSMENT BRIEF\n' + inputBrief + '\n\n' +
      'PERTINENT LOCAL GUIDANCE\n' + (localGuidance || '[None provided]')
    );
  }

  function buildMarkdown(data, report) {
    const lines = [
      '# ' + (data.assessmentTitle || 'Assessment redesign report'),
      '',
      '**Department or discipline:** ' + data.department,
      '',
      '**Format:** ' + data.formatLabel,
      '',
      '**Recommended Toolkit permission:** ' + report.permissionInfo.title,
      '',
      '**Design readiness indicator:** ' + report.scores.overall + '/100',
      '',
      '> Practical professional guidance, not University policy. Current assessment instructions, official University policy and local requirements govern.',
      '',
      '## Design diagnosis',
      '',
      report.diagnosis,
      '',
      '## Central judgement',
      '',
      report.judgement,
      '',
      '## VIVA indicators',
      '',
      '- Valid: ' + report.scores.valid + '/100',
      '- Inclusive: ' + report.scores.inclusive + '/100',
      '- Visible: ' + report.scores.visible + '/100',
      '- Accountable: ' + report.scores.accountable + '/100',
      '',
      '## Three design routes',
      ''
    ];
    report.routes.forEach((route, index) => {
      lines.push('### ' + (index + 1) + '. ' + route.title, '', route.summary, '', ...route.actions.map(item => '- ' + item), '', '**Workload:** ' + route.workload, '');
    });
    lines.push('## Revised assessment brief', '', report.revisedBrief, '', '## Implementation checklist', '', ...report.checklist.map(item => '- [ ] ' + item), '', '## Sources and status', '', '- Oxford University AI use in summative assessment policy', '- Oxford Centre for Teaching and Learning AI and academic practice resources', '- Oxford AI Toolkit assessment resources', '', 'Public sources checked 20 July 2026. Check the live official source before relying on a present-tense policy claim.');
    return cleanText(lines.join('\n'));
  }

  function diagnose(data, profile, exposure, permissionInfo, evidence) {
    const gaps = [];
    if (!data.centralJudgement) gaps.push('the central judgement is not yet stated in one clear sentence');
    if (!data.evidence.length) gaps.push('the brief does not yet specify how student reasoning or decisions will be made visible');
    if (data.permission === 'unknown') gaps.push('the AI permission level still needs to be confirmed and mapped to local wording');
    if (!data.localGuidance) gaps.push('local regulations or approval constraints have not been supplied');
    const strength = data.learningOutcomes.length > 80 ? 'The learning outcomes provide a useful basis for redesign.' : 'The learning outcomes should be checked and sharpened before approval.';
    const gapText = gaps.length ? ' The main issues to resolve are that ' + gaps.join('; ') + '.' : ' The core design inputs are present.';
    return strength + ' The selected format has ' + exposure.label.toLowerCase() + ' exposure to AI-generated final outputs. For ' + profile.label.toLowerCase() + ', the design should make ' + profile.judgement + ' visible through ' + evidence.join(', ') + '.' + gapText + ' The recommended ' + permissionInfo.title + ' level should be treated as a starting point for local confirmation, not as approval.';
  }

  function generateReport(data) {
    const profile = identifyProfile(data);
    const permission = recommendPermission(data);
    const permissionInfo = permissionDetails(permission, data);
    const evidence = ensureEvidence(data, profile);
    const scores = calculateScores(data, evidence, permission);
    const exposure = aiExposure(data);
    const routes = buildRoutes(data, profile, evidence, permissionInfo);
    const criteria = markingCriteria(profile, evidence, permission);
    const revisedBrief = buildRevisedBrief(data, profile, evidence, permissionInfo, criteria);
    const checklist = implementationChecklist(data, permissionInfo);
    const judgement = inferJudgement(data, profile);
    const report = {
      data,
      profile,
      permission,
      permissionInfo,
      evidence,
      scores,
      exposure,
      routes,
      criteria,
      revisedBrief,
      checklist,
      judgement,
      diagnosis: '',
      aiPrompt: '',
      markdown: ''
    };
    report.diagnosis = diagnose(data, profile, exposure, permissionInfo, evidence);
    report.aiPrompt = buildAIPrompt(data, report);
    report.markdown = buildMarkdown(data, report);
    return report;
  }

  function metricCard(label, value, score) {
    return '<div class="metric-card"><span class="metric-label">' + escapeHTML(label) + '</span><strong class="metric-value">' + escapeHTML(value) + '</strong><div class="metric-bar"><span style="width:' + Number(score || 0) + '%"></span></div></div>';
  }

  function renderReport(report) {
    state.report = report;
    const data = report.data;
    $('#resultsTitle').textContent = data.assessmentTitle || 'Recommended assessment redesign';
    $('#resultsSubtitle').textContent = data.department + ' | ' + data.formatLabel;
    $('#metricGrid').innerHTML = [
      metricCard('Overall readiness', report.scores.overall + '/100', report.scores.overall),
      metricCard('Valid', report.scores.valid + '/100', report.scores.valid),
      metricCard('Inclusive', report.scores.inclusive + '/100', report.scores.inclusive),
      metricCard('Visible', report.scores.visible + '/100', report.scores.visible),
      metricCard('Accountable', report.scores.accountable + '/100', report.scores.accountable)
    ].join('');

    const formatStrategy = data.formatItem ? '<div class="callout"><strong>Format-specific strategy</strong><p>' + escapeHTML(data.formatItem.strategy) + '</p></div>' : '';
    $('#overviewPanel').innerHTML =
      '<h2>Design overview</h2>' +
      '<div class="callout success"><strong>Recommended Toolkit permission: ' + escapeHTML(report.permissionInfo.title) + '</strong><p>' + escapeHTML(report.permissionInfo.rationale) + ' ' + escapeHTML(report.permissionInfo.localMap) + '</p></div>' +
      '<h3>Diagnosis</h3><p>' + escapeHTML(report.diagnosis) + '</p>' +
      '<h3>Central judgement</h3><div class="copy-box">' + escapeHTML(report.judgement) + '</div>' +
      '<h3>Evidence to make judgement visible</h3><div class="pill-row">' + report.evidence.map(item => '<span class="pill">' + escapeHTML(item) + '</span>').join('') + '</div><ul>' + report.evidence.map(item => '<li>' + escapeHTML(evidenceMechanismText(item, data)) + '</li>').join('') + '</ul>' +
      formatStrategy +
      '<div class="callout warning"><strong>Interpret the scores carefully</strong><p>These are design readiness indicators based on the information supplied. They are not a validation, accessibility audit or formal approval.</p></div>';

    $('#routesPanel').innerHTML = '<h2>Three redesign routes</h2><p>Route 2 is the default recommendation because it strengthens the evidence of learning without automatically replacing the approved format.</p><div class="route-grid">' + report.routes.map((route, index) =>
      '<article class="route-card ' + (index === 1 ? 'recommended' : '') + '"><span class="route-tag">' + escapeHTML(route.tag) + '</span><h3>' + escapeHTML(route.title) + '</h3><p>' + escapeHTML(route.summary) + '</p><ul>' + route.actions.map(action => '<li>' + escapeHTML(action) + '</li>').join('') + '</ul><p><strong>Workload:</strong> ' + escapeHTML(route.workload) + '</p></article>'
    ).join('') + '</div>';

    $('#briefPanel').innerHTML = '<h2>Copy-ready revised brief</h2><p>Use this as a structured first draft. Replace any generic wording and secure all required local approvals before release.</p><div class="copy-box" id="briefCopyBox"><button type="button" class="secondary-button compact copy-box-button" data-copy="brief">Copy</button>' + escapeHTML(report.revisedBrief) + '</div>';

    $('#markingPanel').innerHTML =
      '<h2>Marking, permissions and declaration</h2>' +
      '<h3>Suggested marking criteria</h3><table class="report-table"><thead><tr><th>Criterion</th><th>Weight</th></tr></thead><tbody>' + report.criteria.map(item => '<tr><td>' + escapeHTML(item.label) + '</td><td>' + item.weight + '%</td></tr>').join('') + '</tbody></table>' +
      '<h3>Permission wording</h3><div class="copy-box">' + escapeHTML(report.permissionInfo.wording) + '</div>' +
      '<h3>Permitted use</h3><p>' + escapeHTML(report.permissionInfo.permitted) + '</p>' +
      '<h3>Prohibited use</h3><p>' + escapeHTML(report.permissionInfo.prohibited) + '</p>' +
      '<h3>Student declaration</h3><div class="copy-box" id="declarationCopyBox"><button type="button" class="secondary-button compact copy-box-button" data-copy="declaration">Copy</button>' + escapeHTML(report.permissionInfo.declaration) + '</div>';

    $('#implementationPanel').innerHTML = '<h2>Implementation and approval checklist</h2><ul class="checklist">' + report.checklist.map(item => '<li>' + escapeHTML(item) + '</li>').join('') + '</ul><div class="callout warning"><strong>Do not use selective oral follow-up as an informal misconduct test</strong><p>Any marked oral or additional component should be specified in advance, applied consistently, accessible, proportionate and locally approved. No single component proves authorship.</p></div>';

    $('#aiPromptPanel').innerHTML =
      '<h2>Optional institutional AI enhancement</h2><p>This prompt can be pasted into the Oxford AI Toolkit Adviser or another approved institutional tool to deepen the rewrite. Review the prompt and remove any information that should not be entered into the chosen service.</p>' +
      '<div class="result-actions" style="justify-content:flex-start;margin-bottom:12px"><button type="button" class="secondary-button compact" data-copy="ai-prompt">Copy prompt</button><a class="primary-button compact" href="' + ADVISER_URL + '" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Open AI Adviser</a></div>' +
      '<div class="copy-box">' + escapeHTML(report.aiPrompt) + '</div>';

    workspace.classList.add('hidden');
    hero.classList.add('hidden');
    results.classList.remove('hidden');
    activateResultTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function activateResultTab(tab) {
    $$('[data-result-tab]').forEach(button => button.classList.toggle('active', button.dataset.resultTab === tab));
    $$('[data-result-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.resultPanel === tab));
  }

  function reportWordHTML(report) {
    const data = report.data;
    const rows = report.criteria.map(item => '<tr><td>' + escapeHTML(item.label) + '</td><td>' + item.weight + '%</td></tr>').join('');
    const routeHTML = report.routes.map((route, index) =>
      '<h3>' + (index + 1) + '. ' + escapeHTML(route.title) + '</h3>' +
      '<p><strong>' + escapeHTML(route.tag) + '</strong></p>' +
      '<p>' + escapeHTML(route.summary) + '</p>' +
      '<ul>' + route.actions.map(action => '<li>' + escapeHTML(action) + '</li>').join('') + '</ul>' +
      '<p><strong>Workload:</strong> ' + escapeHTML(route.workload) + '</p>'
    ).join('');
    const checklist = report.checklist.map(item => '<li>☐ ' + escapeHTML(item) + '</li>').join('');
    const evidence = report.evidence.map(item => '<li>' + escapeHTML(item) + '</li>').join('');
    const brief = escapeHTML(report.revisedBrief).replace(/\n/g, '<br>');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHTML(data.assessmentTitle || 'Assessment redesign') + '</title>' +
      '<style>body{font-family:Arial,sans-serif;line-height:1.5;color:#1a1c20;max-width:850px;margin:36px auto;font-size:11pt}h1,h2,h3{font-family:Georgia,serif;color:#002147}h1{font-size:24pt;border-bottom:2px solid #002147;padding-bottom:8px}h2{font-size:16pt;margin-top:26px}h3{font-size:13pt;margin-top:20px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #a9bbd1;padding:8px;text-align:left;vertical-align:top}th{background:#e9edf3;color:#002147}.notice{border-left:4px solid #3a5e8c;background:#f5f3ee;padding:10px 14px}.brief{border:1px solid #a9bbd1;background:#fbfbfa;padding:14px}.meta td:first-child{font-weight:bold;width:34%;color:#002147}ul{margin-top:6px}</style></head><body>' +
      '<h1>' + escapeHTML(data.assessmentTitle || 'Assessment redesign report') + '</h1>' +
      '<table class="meta"><tr><td>Department or discipline</td><td>' + escapeHTML(data.department) + '</td></tr><tr><td>Format</td><td>' + escapeHTML(data.formatLabel) + '</td></tr><tr><td>Recommended Toolkit permission</td><td>' + escapeHTML(report.permissionInfo.title) + '</td></tr><tr><td>Design readiness indicator</td><td>' + report.scores.overall + '/100</td></tr></table>' +
      '<p class="notice"><strong>Practical professional guidance, not University policy.</strong> Current assessment instructions, official University policy and local requirements govern.</p>' +
      '<h2>Design diagnosis</h2><p>' + escapeHTML(report.diagnosis) + '</p>' +
      '<h2>Central judgement</h2><p>' + escapeHTML(report.judgement) + '</p>' +
      '<h2>VIVA indicators</h2><table><tr><th>Valid</th><th>Inclusive</th><th>Visible</th><th>Accountable</th></tr><tr><td>' + report.scores.valid + '/100</td><td>' + report.scores.inclusive + '/100</td><td>' + report.scores.visible + '/100</td><td>' + report.scores.accountable + '/100</td></tr></table>' +
      '<h2>Evidence to make judgement visible</h2><ul>' + evidence + '</ul>' +
      '<h2>Three design routes</h2>' + routeHTML +
      '<h2>Suggested marking criteria</h2><table><tr><th>Criterion</th><th>Weight</th></tr>' + rows + '</table>' +
      '<h2>AI permissions and declaration</h2><h3>Permission wording</h3><p>' + escapeHTML(report.permissionInfo.wording) + '</p><h3>Permitted use</h3><p>' + escapeHTML(report.permissionInfo.permitted) + '</p><h3>Prohibited use</h3><p>' + escapeHTML(report.permissionInfo.prohibited) + '</p><h3>Student declaration</h3><p>' + escapeHTML(report.permissionInfo.declaration) + '</p>' +
      '<h2>Copy-ready revised assessment brief</h2><div class="brief">' + brief + '</div>' +
      '<h2>Implementation checklist</h2><ul style="list-style:none;padding-left:0">' + checklist + '</ul>' +
      '<h2>Sources and status</h2><ul><li>Oxford University AI use in summative assessment policy</li><li>Oxford Centre for Teaching and Learning AI and academic practice resources</li><li>Oxford AI Toolkit assessment resources</li></ul><p>Public sources checked 20 July 2026. Check the live official source before relying on a present-tense policy claim.</p>' +
      '</body></html>';
  }

  function saveInputs() {
    const data = getData();
    const exportData = { exportedAt: new Date().toISOString(), app: 'AI Designer 1.1.0', inputs: data };
    delete exportData.inputs.formatItem;
    downloadBlob(slugify(data.assessmentTitle || data.course || 'assessment') + '-inputs.json', JSON.stringify(exportData, null, 2), 'application/json;charset=utf-8');
    showToast('Inputs downloaded');
  }

  function attachEvents() {
    $$('[data-start]').forEach(button => button.addEventListener('click', startWorkspace));
    $$('[data-demo]').forEach(button => button.addEventListener('click', loadDemo));
    $('#nextButton').addEventListener('click', () => goToStep(state.step + 1));
    $('#backButton').addEventListener('click', () => goToStep(state.step - 1, true));
    $('#saveDraftButton').addEventListener('click', saveInputs);
    $$('.step-link').forEach(button => button.addEventListener('click', () => {
      const target = Number(button.dataset.stepLink);
      if (target <= state.step) goToStep(target, true);
      else goToStep(target);
    }));

    form.addEventListener('submit', event => {
      event.preventDefault();
      for (let step = 1; step <= 5; step += 1) {
        if (!validateStep(step, false)) {
          goToStep(step, true);
          validateStep(step, true);
          return;
        }
      }
      const report = generateReport(getData());
      renderReport(report);
    });

    $('#chooseFiles').addEventListener('click', () => $('#fileInput').click());
    $('#fileInput').addEventListener('change', event => handleFiles(event.target.files));
    const uploadZone = $('#uploadZone');
    ['dragenter', 'dragover'].forEach(type => uploadZone.addEventListener(type, event => {
      event.preventDefault();
      uploadZone.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(type => uploadZone.addEventListener(type, event => {
      event.preventDefault();
      uploadZone.classList.remove('dragover');
    }));
    uploadZone.addEventListener('drop', event => handleFiles(event.dataTransfer.files));

    $('#fileList').addEventListener('click', event => {
      const button = event.target.closest('[data-remove-file]');
      if (!button) return;
      state.files = state.files.filter(file => file.id !== button.dataset.removeFile);
      renderFileList();
      showToast('File removed from the list. Extracted text remains in the brief until you edit it.');
    });

    $$('.results-nav button').forEach(button => button.addEventListener('click', () => activateResultTab(button.dataset.resultTab)));

    results.addEventListener('click', event => {
      const action = event.target.closest('[data-action]');
      const copy = event.target.closest('[data-copy]');
      if (copy && state.report) {
        const target = copy.dataset.copy;
        if (target === 'brief') copyText(state.report.revisedBrief, 'Brief copied');
        if (target === 'declaration') copyText(state.report.permissionInfo.declaration, 'Declaration copied');
        if (target === 'ai-prompt') copyText(state.report.aiPrompt, 'AI prompt copied');
        return;
      }
      if (!action || !state.report) return;
      const type = action.dataset.action;
      const filename = slugify(state.report.data.assessmentTitle || state.report.data.course || 'assessment-redesign');
      if (type === 'edit') {
        results.classList.add('hidden');
        workspace.classList.remove('hidden');
        goToStep(1, true);
      } else if (type === 'copy-report') {
        copyText(state.report.markdown, 'Report copied');
      } else if (type === 'download-md') {
        downloadBlob(filename + '.md', state.report.markdown, 'text/markdown;charset=utf-8');
      } else if (type === 'download-word') {
        downloadBlob(filename + '.doc', reportWordHTML(state.report), 'application/msword;charset=utf-8');
      } else if (type === 'print') {
        window.print();
      }
    });
  }

  window.OxfordAssessmentDesigner = Object.freeze({
    version: '1.0.0',
    generateReportFromData: generateReport,
    identifyDisciplinaryProfile: identifyProfile
  });

  if (form && workspace && hero && results && toast) {
    populateFormats();
    attachEvents();
  }
})();
