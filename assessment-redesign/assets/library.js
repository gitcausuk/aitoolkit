/*
 * Oxford AI Toolkit: Check an assessment for AI
 * Curated design library (human-maintained).
 *
 * This file is the educational knowledge base behind the tool. It is meant to be
 * read and edited by educational developers, not only by programmers.
 * The engine selects from these records; it never invents a redesign that is not here.
 *
 * Internal concepts (Know / Judge / Do / Account, evidence kinds, AI risks,
 * verification mechanisms, VIVA) are encoded as fields below. None of these labels
 * is shown to faculty.
 *
 * Sources: Assessment Design Lab patterns, the 40-format direct-evidence guide (v2.3),
 * the implementation playbook (v2.3) and VIVA (v2.4).
 */
(function (root) {
  'use strict';

  // ── What an assessment can ask students to show ─────────────────────────────
  // kind: internal id. dim: internal Know/Judge/Do/Account mapping (never shown).
  // baseline: what an unsupervised written submission can still tell a marker
  // about the individual student when capable AI is available
  // (0 hard to tell, 1 some evidence, 2 good evidence). Design judgments, not measurements.
  const AIM_KINDS = {
    recommend: {
      dim: ['judge', 'account'], baseline: 0,
      label: 'Make a recommendation or decision and justify it',
      short: 'Makes and justifies a recommendation',
      ai: 'Draft a clear recommendation with supporting arguments',
      gap: 'made the recommendation themselves and can stand behind it',
      match: [/\brecommend/i, /\bcourse of action\b/i, /\badvis(e|ing)\b/i, /\b(reach|make|take) (a |the )?(decision|judg(e)?ment)/i, /\bpropos(e|al)\b/i, /\bdefensible\b/i, /\bargue for\b/i, /\btake a (clear )?position\b/i]
    },
    evaluate: {
      dim: ['judge'], baseline: 0,
      label: 'Weigh evidence or competing arguments',
      short: 'Weighs evidence and arguments',
      ai: 'Summarize and compare the evidence, including where it conflicts',
      gap: 'weighed the evidence themselves',
      match: [/\bevaluat/i, /\bweigh/i, /\bcritically (assess|appraise|examine)/i, /\b(conflicting|competing|incomplete) (evidence|arguments|views|data)/i, /\breliab(le|ility)\b/i, /\bappraise\b/i]
    },
    risk: {
      dim: ['judge'], baseline: 0,
      label: 'Consider risks, consequences or ethical implications',
      short: 'Considers risks and implications',
      ai: 'List plausible risks, ethical issues and ways to reduce them',
      gap: 'identified and weighed the risks themselves',
      match: [/\brisks?\b/i, /\bethic/i, /\bimplications?\b/i, /\bconsequences?\b/i, /\bstakeholder/i]
    },
    reflect: {
      dim: ['account'], baseline: 0,
      label: 'Reflect on their own experience or practice',
      short: 'Reflects on own experience',
      ai: 'Write a fluent first-person reflection, including invented detail',
      gap: 'are reflecting on their own experience',
      match: [/\breflect/i, /\byour (own )?(experience|practice|learning|development)\b/i, /\bpersonal (development|learning)\b/i]
    },
    quant: {
      dim: ['do'], baseline: 1,
      label: 'Carry out and interpret quantitative analysis',
      short: 'Carries out quantitative analysis',
      ai: 'Run standard calculations and explain them, given the data',
      gap: 'understand the method and could repeat it',
      match: [/\bcalculat/i, /\bfinancial (model|analysis|statements)/i, /\bvaluation\b/i, /\bforecast/i, /\bquantitative\b/i, /\bstatistic/i, /\bNPV\b/, /\bdata (analysis|set)\b/i]
    },
    research: {
      dim: ['know'], baseline: 1,
      label: 'Find and use relevant sources',
      short: 'Finds and uses sources',
      ai: 'Suggest and summarize sources, sometimes inaccurately or with invented references',
      gap: 'found, read and checked the sources',
      match: [/\bliterature\b/i, /\bresearch\b/i, /\bsources?\b/i, /\breferenc(e|ing)\b/i, /\bbibliograph/i]
    },
    plan: {
      dim: ['do'], baseline: 0,
      label: 'Develop a plan, design or proposal',
      short: 'Develops a plan or design',
      ai: 'Draft a plausible plan or design with milestones and rationale',
      gap: 'made the key design choices themselves',
      match: [/\b(develop|create|produce|design) (a |an )?(plan|design|strategy|proposal|prototype)/i, /\bimplementation plan\b/i, /\bbusiness plan\b/i]
    },
    apply: {
      dim: ['know', 'do'], baseline: 1,
      label: 'Use course frameworks or concepts to analyze the situation',
      short: 'Uses course frameworks',
      ai: 'Apply standard frameworks to the case or material provided',
      gap: 'can use the frameworks without help',
      match: [/\bappl(y|ying|ication of)\b[^.]*\b(framework|concept|theor|model|tool)/i, /\b(drawing on|draw on|using|use)\b[^.]*\b(framework|concept|theor|model)s?\b/i, /\bcourse (concepts|frameworks|material)/i, /\b(draw(ing)? on|using) (the )?(course )?readings\b/i]
    },
    analyze: {
      dim: ['judge', 'do'], baseline: 1,
      label: 'Analyze a situation or problem',
      short: 'Analyzes the situation',
      ai: 'Produce a structured analysis of the situation',
      gap: 'did the analysis themselves and understand it',
      match: [/\banaly[sz](e|es|ing|is)\b/i, /\bdiagnos/i, /\bexamin(e|ing)\b/i]
    },
    communicate: {
      dim: ['do'], baseline: 0,
      label: 'Communicate clearly to a specific audience',
      short: 'Communicates to an audience',
      ai: 'Write clear, well-organized prose for a specified audience',
      gap: 'can communicate this without help',
      match: [/\bcommunicat/i, /\bpresent(ation)?\b/i, /\bmemo\b/i, /\baudience\b/i, /\bbriefing\b/i]
    }
  };
  // Order used to classify a single learning outcome (first match wins).
  const CLASSIFY_ORDER = ['recommend', 'evaluate', 'reflect', 'quant', 'risk', 'plan', 'research', 'apply', 'analyze', 'communicate'];
  // Order used when scanning free text without a learning-outcome list.
  const SCAN_ORDER = ['apply', 'analyze', 'evaluate', 'recommend', 'risk', 'plan', 'quant', 'research', 'reflect', 'communicate'];

  const RATING_WORDS = ['Hard to tell', 'Some evidence', 'Good evidence'];

  // ── AI use: framed in the three categories CTL illustrates ──────────────────
  const AI_CHOICES = {
    not: {
      title: 'Not allowed',
      sub: 'Students complete the work without generative AI.',
      ctl: 'not authorised',
      wording: 'Generative AI tools must not be used to research, draft, write, edit, translate or paraphrase any part of this assessment. Spelling and grammar checking built into your word processor is permitted [edit as needed]. If you have an agreed adjustment involving assistive technology, follow that agreement and ask the course team if you are unsure.',
      declaration: 'On submission, students confirm that they did not use generative AI tools beyond those listed as permitted. The confirmation is not marked.'
    },
    some: {
      title: 'Allowed for some purposes',
      sub: 'You state which uses are allowed, for example exploring background or checking clarity.',
      ctl: 'selective authorised use',
      wording: 'You may use generative AI tools for the following purposes only: [for example, exploring background on the industry; checking the clarity and grammar of your own writing]. You must not use AI to produce your analysis, your recommendation or any part of the work you are asked to complete without AI. Use a University-provided tool where possible, and do not enter confidential case material unless the course team has said you may. Describe your use in the declaration.',
      declaration: 'Students attach a short declaration (no more than 150 words, not counted in the word limit) listing the tools used, what they were used for and at which stage. The declaration is not marked, and permitted, declared use is not penalized.'
    },
    required: {
      title: 'Required as part of the task',
      sub: 'Using and evaluating AI is part of what you are assessing.',
      ctl: 'integral use required',
      wording: 'This assessment requires you to use a generative AI tool as described in the task. Use [name the University-provided tool]. You will be assessed on how you direct, check and improve the AI output, and on the judgments you make, not on the AI output itself. You remain responsible for the accuracy of everything you submit.',
      declaration: 'Students include the key prompts and outputs they relied on as an appendix (not counted in the word limit), with a short note on what they accepted, changed or rejected and why. If this appendix is marked, it needs its own criterion.'
    },
    unsure: { title: 'Not sure yet', sub: 'Show me options either way.' }
  };

  // ── Curated redesign patterns ───────────────────────────────────────────────
  // level: 'wording' (wording only), 'add' (adds a component, keeps format and weighting),
  //        'format' (changes format or weighting).
  // effects: change in what the marker can tell, per aim kind (capped at "Good evidence").
  // visibilityOnly: makes reasoning visible but adds little confidence on its own.
  // requiresKinds: only offered if one of these aims is present.
  // Slots in {braces} are filled from the faculty member's brief by the engine.
  const PATTERNS = [
    {
      id: 'changed-condition',
      name: 'New information after the recommendation',
      level: 'add',
      aiFit: ['not', 'some', 'required'],
      requiresKinds: ['recommend', 'evaluate', 'plan', 'quant', 'analyze', 'risk'],
      effects: { recommend: 2, evaluate: 1, risk: 1, plan: 1, quant: 1, analyze: 1 },
      live: false, supervised: false,
      studentTime: 'About 2 to 3 hours for the follow-up', studentMinutes: 150,
      markMinutes: 10, offset: true,
      summary: 'Students submit the {product} as now. Shortly after the deadline they receive one new development{example} and write up to 500 words on whether their conclusion still holds and what they would change.',
      aiNote: {
        not: 'Works as is.',
        some: 'AI can stay allowed on the main piece. The follow-up tells you most if it is written without AI or in a short timetabled slot.',
        required: 'Students can use AI throughout. The follow-up then shows how well they judge whether to revise.',
        unsure: 'Works with any AI choice. The follow-up is most informative if written without AI.'
      },
      shows: 'Whether the student understands their own conclusion well enough to adapt it when the situation changes. A student who did not make the judgments has to reconstruct them quickly.',
      doesnt: 'It does not prove who wrote the original piece. If the follow-up is done unsupervised with AI freely available, much of the gain is lost. The choice of development matters: it has to bear on the reasoning, not just add facts.',
      accessibility: 'Short fixed turnarounds can disadvantage students with some disabilities or caring responsibilities. Use a window long enough to accommodate agreed adjustments (for example 48 to 72 hours), or a timetabled slot with extra time available.',
      implementation: [
        'Write two or three different developments so not every student gets the same one at the same time.',
        'Release the development after the main deadline, never before.',
        'Say in the brief that a follow-up will happen and what form it takes, but not its content.',
        'Decide whether the follow-up is written at home or in a timetabled session.'
      ],
      briefAddition: 'After the submission deadline you will receive one new development relating to {subject}. Within {window}, submit a response of up to 500 words explaining whether your conclusion still holds, what you would change and why. This response is marked as part of this assessment.',
      criterion: { name: 'Response to new information', weight: 20, descriptor: 'Judges whether and how the conclusion should change. Reasons are specific to the new development and consistent with, or explicitly revise, the original analysis.' },
      checkQuestion: 'Does adding a marked follow-up component need approval from your programme committee or exam board, and by when?',
      labSource: 'Countercase challenge; Two-stage recommendation',
      why: 'Your brief asks students to reach a conclusion. Changing the conditions after they commit is one of the most direct ways to see whether that conclusion is theirs.'
    },
    {
      id: 'short-conversation',
      name: 'Short conversation on one decision',
      level: 'add',
      aiFit: ['not', 'some', 'required'],
      effects: { recommend: 2, evaluate: 1, reflect: 1, plan: 1, quant: 1, communicate: 1 },
      live: true, supervised: false,
      studentTime: 'About 30 minutes, including preparation', studentMinutes: 30,
      markMinutes: 15,
      summary: 'Keep the written task. Afterwards, each student has a 10-minute conversation answering two questions about the most important decision in their {product}.',
      aiNote: {
        not: 'Works as is.',
        some: 'Fits well with permitted AI use: students stay accountable for decisions made with AI help.',
        required: 'A natural fit: students explain which parts of the AI-supported work they accept and why.',
        unsure: 'Works with any AI choice.'
      },
      shows: 'Whether the student can explain and defend the key judgment in their own words, responding to questions they did not script.',
      doesnt: 'One short conversation is not a test of authorship, and confidence in speaking can be mistaken for understanding. Keep questions on reasoning rather than recall, and mark against a stated criterion.',
      accessibility: 'Live components need planned alternatives for students with relevant adjustments (for example written questions with a short time limit, extra time, or another format). Tell students the format well in advance.',
      implementation: [
        'Use a fixed structure of two questions, adapted to the content of each submission.',
        'Schedule slots and keep brief notes against the criterion, or record if your department allows.',
        'Consider a threshold judgment (secure / some concern) rather than a fine-grained mark to keep it short.',
        'Have a second marker or moderator sample some conversations.'
      ],
      briefAddition: 'After submission you will have a 10-minute conversation with a member of the teaching team about your work. You will be asked to explain and justify one or two of the most important decisions in your {product}. You do not need to prepare slides or notes.',
      criterion: { name: 'Explanation of key decisions', weight: 15, descriptor: 'Explains the reasoning behind the main decision, responds to a challenge and shows understanding consistent with the written work.' },
      checkQuestion: 'Does adding a live component need approval, and how many other live or oral components do students already have this term?',
      labSource: 'Decision + defence; Micro-viva',
      why: 'A brief, structured conversation gives you direct evidence of the judgment you said matters most, without changing the written task.'
    },
    {
      id: 'supervised-variation',
      name: 'Short supervised task on a new variation',
      level: 'format',
      aiFit: ['not', 'some', 'required'],
      effects: { apply: 2, quant: 2, analyze: 1, evaluate: 1, recommend: 1, risk: 1 },
      live: false, supervised: true,
      studentTime: 'About 45 minutes in a scheduled session', studentMinutes: 45,
      markMinutes: 10, offset: true,
      summary: 'Add a timed, supervised task of about 45 minutes in which students apply the same approach to an unseen variation of the problem. The written {product} carries less of the weight.',
      aiNote: {
        not: 'Works as is.',
        some: 'AI can stay allowed on the written piece. The supervised task is completed without AI.',
        required: 'AI is used in the written piece. The supervised task checks what students can do without it.',
        unsure: 'The supervised task is completed without AI, whatever you decide for the written piece.'
      },
      shows: 'Independent performance on a fresh problem, under conditions where you know what help was available.',
      doesnt: 'Short timed tasks favor speed and test less depth than the written piece. The combination with the written work is what gives the fuller picture.',
      accessibility: 'Needs exam-style arrangements: extra time, rest breaks, assistive technology and accessible rooms as agreed for each student.',
      implementation: [
        'This is likely to change the approved format and weighting. Check the approval route early.',
        'Book rooms or a supervised online setting, and plan for absence.',
        'Write a short unseen variation (a changed industry, figure or stakeholder) for each sitting.'
      ],
      briefAddition: 'This assessment has two parts. Part 1 is the written {product}. Part 2 is a 45-minute supervised task in which you apply the same approach to a short, unseen variation of the problem. AI tools may not be used in Part 2.',
      criterion: { name: 'Supervised application to a new variation', weight: 30, descriptor: 'Applies the approach accurately to the unseen variation and reaches a reasoned conclusion within the time available.' },
      checkQuestion: 'Changing the format or weighting usually needs formal approval. Who approves it for this programme, and what is the deadline?',
      labSource: 'Supervised unseen case; Supervised element',
      why: 'If you need confidence that each student can do this independently, a short supervised task is the most direct evidence available.'
    },
    {
      id: 'ai-critique',
      name: 'Critique and improve an AI answer',
      level: 'add',
      aiFit: ['some', 'required'],
      requiresKinds: ['evaluate', 'apply', 'analyze', 'research', 'recommend'],
      effects: { evaluate: 2, apply: 1, analyze: 1, research: 1 },
      live: false, supervised: false,
      studentTime: 'About 3 hours, partly replacing existing work', studentMinutes: 180,
      markMinutes: 10, offset: true,
      summary: 'Students obtain an AI answer to one part of the task (or you provide one), critique it against the evidence and course concepts, and show what they changed in their own work and why.',
      aiNote: {
        some: 'Requires AI use for this one section. Make that explicit in the AI wording.',
        required: 'Puts AI use at the center of the task in a way you can mark.',
        unsure: 'Needs AI to be allowed for at least this section.'
      },
      shows: 'Whether the student can see what is generic, unsupported or wrong in a plausible answer. That takes real command of the material.',
      doesnt: 'The critique can also be AI-assisted. It is strongest when tied to course-specific material or class discussion, or paired with a short conversation.',
      accessibility: 'Students need equal access to a University-provided tool and guidance on using it. Providing one common AI answer yourself removes the access question.',
      implementation: [
        'Decide whether to provide one common AI answer (fairer and easier to mark) or have students generate their own.',
        'If students generate their own, name the University-provided tool.',
        'Reduce the main word count to make room for the critique.'
      ],
      briefAddition: 'Include a section of up to 600 words in which you critique an AI-generated answer to [specify the part of the task]. {aiSource} Assess it against the evidence and course concepts, then explain what you changed in your own analysis and why. Include the AI output as an appendix (not counted in the word limit).',
      criterion: { name: 'Critique of AI output', weight: 20, descriptor: 'Identifies specific strengths, errors and gaps in the AI answer, supported by evidence and course concepts, and explains how the critique shaped the final analysis.' },
      checkQuestion: 'Does requiring AI use in part of the task need approval, and does your department name the tools students may use?',
      labSource: 'AI critique and correction',
      why: 'You are open to AI use. This makes students judge AI output against what they have learned, which is markable evidence of understanding.'
    },
    {
      id: 'decision-record',
      name: 'AI-supported work with a decision record',
      level: 'add',
      aiFit: ['some', 'required'],
      effects: {}, visibilityOnly: true,
      live: false, supervised: false,
      studentTime: 'About 1 hour', studentMinutes: 60,
      markMinutes: 5,
      summary: 'Allow AI within stated conditions. Students add a record of about 300 words covering the three most important decisions in their {product}: what they decided, the main alternative they rejected, and how AI was or was not involved.',
      aiNote: {
        some: 'Built for permitted AI use.',
        required: 'Built for required AI use.',
        unsure: 'Assumes AI is allowed within stated conditions.'
      },
      shows: 'Makes the student\u2019s account of their reasoning visible and states what they are responsible for. Useful for marking and feedback.',
      doesnt: 'The record can itself be AI-written, so on its own it adds little confidence about individual achievement. Pair it with new information after submission or a short conversation if that matters to you.',
      accessibility: 'Low extra burden. A short template makes expectations clear for all students.',
      implementation: [
        'Provide a three-row template: decision, rejected alternative and why, AI involvement.',
        'Use the record to target feedback, and to choose questions if you later add a conversation.'
      ],
      briefAddition: 'Attach a decision record of up to 300 words (not counted in the main word limit). For the three most important decisions in your work, state what you decided, the main alternative you rejected and why, and whether and how AI tools contributed.',
      criterion: { name: 'Decision record', weight: 10, descriptor: 'Identifies genuinely consequential decisions, gives specific reasons for rejecting alternatives and is consistent with the submitted work.' },
      checkQuestion: 'Does adding a short marked component need approval for this programme?',
      labSource: 'Annotated decision log',
      why: 'You are open to AI use. This keeps students clearly responsible for their decisions at low cost, though it adds visibility more than confidence.'
    },
    {
      id: 'early-plan',
      name: 'Early plan, then final submission',
      level: 'add',
      aiFit: ['not', 'some', 'required'],
      requiresKinds: ['recommend', 'plan', 'research', 'analyze'],
      effects: { plan: 1, recommend: 1 },
      live: false, supervised: false,
      studentTime: 'About 2 hours', studentMinutes: 120,
      markMinutes: 8,
      summary: 'Partway through, students submit a one-page plan with their provisional conclusion and the evidence they intend to use. They receive brief feedback and explain in the final {product} what changed.',
      aiNote: {
        not: 'Works as is.', some: 'Works with permitted AI use.', required: 'Works with required AI use.', unsure: 'Works with any AI choice.'
      },
      shows: 'How the student\u2019s thinking developed, and gives you an early chance to spot difficulties.',
      doesnt: 'Plans can be AI-produced too, so this is not proof of authorship. Its main value is feedback and visibility, with a modest gain in confidence.',
      accessibility: 'Adds a deadline. Check it does not collide with other deadlines, and allow agreed extensions.',
      implementation: [
        'Set the plan deadline about halfway through the assessment period.',
        'Keep feedback brief: two or three comments per plan.',
        'Decide whether the plan is marked or simply required.'
      ],
      briefAddition: 'By [date], submit a one-page plan setting out your provisional conclusion and the main evidence you intend to use. You will receive brief feedback. In your final {product}, include a short section (up to 200 words, not counted in the word limit) explaining what changed since your plan and why.',
      criterion: { name: 'Development from plan', weight: 10, descriptor: 'Explains specifically how and why the analysis developed from the plan, including the response to feedback.' },
      checkQuestion: 'Does adding an interim submission need approval, and does it fit the programme\u2019s deadline calendar?',
      labSource: 'Two-stage recommendation; Process evidence',
      why: 'An early commitment makes the development of the student\u2019s thinking visible and gives you a chance to intervene.'
    },
    {
      id: 'anchored-reflection',
      name: 'Anchor the reflection in the student\u2019s own course record',
      level: 'add',
      aiFit: ['not', 'some', 'required'],
      requiresKinds: ['reflect'],
      effects: { reflect: 1 },
      live: false, supervised: false,
      studentTime: 'About 1 hour', studentMinutes: 60,
      markMinutes: 5,
      summary: 'Require the reflection to cite specific material only the student has: outputs from in-class exercises, feedback they received, or dated notes, with short excerpts attached.',
      aiNote: {
        not: 'Works as is.', some: 'Works with permitted AI use.', required: 'Works with required AI use.', unsure: 'Works with any AI choice.'
      },
      shows: 'Ties the reflection to things that actually happened in the course, which markers can recognize and check.',
      doesnt: 'An anchored reflection can still be written with AI help. The gain comes from markers checking that excerpts match what they know of the course.',
      accessibility: 'Make sure every student has had the opportunity to generate the material (for example, absences from in-class exercises).',
      implementation: ['Tell students early which course activities they should keep records of.', 'Spot-check one excerpt per script against what happened in class.'],
      briefAddition: 'Your reflection must refer to at least three specific items from your own course record (for example, your outputs from in-class exercises, feedback you received, or dated notes). Attach short excerpts of each as an appendix (not counted in the word limit).',
      criterion: { name: 'Use of personal course evidence', weight: 10, descriptor: 'Reflection is grounded in specific, attached items from the student\u2019s own course record and draws reasoned lessons from them.' },
      checkQuestion: 'Does changing the required content of the reflection need approval?',
      labSource: 'Reflection linked to decisions',
      why: 'Your brief asks for reflection. Grounding it in material only the student has makes generic reflection easier to spot.'
    },
    {
      id: 'evidence-check',
      name: 'Show how key sources were checked',
      level: 'add',
      aiFit: ['not', 'some', 'required'],
      requiresKinds: ['research', 'evaluate'],
      effects: { research: 1, evaluate: 1 },
      live: false, supervised: false,
      studentTime: 'About 1 hour', studentMinutes: 60,
      markMinutes: 5,
      summary: 'Students add a short table for their three most important sources: what each contributes, how they confirmed it says what they claim, and one limitation.',
      aiNote: {
        not: 'Works as is.', some: 'Especially useful where AI is allowed for finding sources.', required: 'Works with required AI use.', unsure: 'Works with any AI choice.'
      },
      shows: 'Whether the student engaged with their key evidence rather than relying on summaries.',
      doesnt: 'A table can be fabricated. Its value comes from markers spot-checking one or two entries.',
      accessibility: 'Low extra burden. Provide the table template.',
      implementation: ['Spot-check one source per script.', 'Treat invented or misdescribed sources under your usual academic-integrity process, not as a marking penalty.'],
      briefAddition: 'Include a table (not counted in the word limit) for your three most important sources, stating what each contributes to your argument, how you confirmed it says what you claim, and one limitation.',
      criterion: { name: 'Handling of key evidence', weight: 10, descriptor: 'Accurately represents key sources, shows how they were checked and recognizes their limitations.' },
      checkQuestion: 'Does adding a required component need approval for this programme?',
      labSource: 'Comparison with unseen material; Process evidence',
      why: 'Your brief depends on how students use evidence. A short check makes that engagement visible.'
    },
    {
      id: 'clarify-wording',
      name: 'Keep the task, make the AI rules clear',
      level: 'wording',
      aiFit: ['not', 'some', 'required'],
      effects: {}, baseline: true,
      live: false, supervised: false,
      studentTime: 'No change', studentMinutes: 0,
      markMinutes: 0,
      summary: 'Leave the task as it is. Add clear AI-use wording and a declaration so students know what is allowed.',
      aiNote: { not: 'Works as is.', some: 'Works as is.', required: 'Works as is.', unsure: 'Choose an AI position before using the wording.' },
      shows: 'Clear expectations for students and a consistent basis for any concerns.',
      doesnt: 'It does not change what the submitted work can tell you.',
      accessibility: 'No change.',
      implementation: ['Publish the AI wording with the brief, not later.'],
      briefAddition: '',
      criterion: null,
      checkQuestion: 'Does your department or programme set its own AI wording that should be used instead?',
      labSource: 'AI-use conditions; Declarations',
      why: 'The assessment already gives reasonable evidence. Clear rules are the main gap.'
    }
  ];

  const LEVEL_LABELS = {
    wording: 'Wording only',
    add: 'Adds a component, keeps format and weighting',
    format: 'Changes format or weighting'
  };

  const LEVEL_SHORT = { wording: 'Wording only', add: 'Adds a component', format: 'Changes format or weighting' };

  const SOURCES = {
    policy: { title: 'University policy on AI use in summative assessment', url: 'https://www.ox.ac.uk/about/how-we-are-run/policies-and-statements/policy-hub/ai-use-in-summative-assessment' },
    ctlAI: { title: 'CTL: AI in teaching and learning', url: 'https://www.ox.ac.uk/about/how-we-are-run/education/centre-for-teaching-and-learning/ai-in-teaching-and-learning' },
    ctlConsult: { title: 'CTL course and assessment redesign consultancy', url: 'https://www.ctl.ox.ac.uk/course-and-assessment-redesign-consultancy-service' },
    ctlInclusive: { title: 'CTL: designing inclusive assessments', url: 'https://www.ctl.ox.ac.uk/included-designing-inclusive-assessments' },
    checked: '5 September 2026'
  };

  root.REDESIGN_LIBRARY = { AIM_KINDS, CLASSIFY_ORDER, SCAN_ORDER, RATING_WORDS, AI_CHOICES, PATTERNS, LEVEL_LABELS, LEVEL_SHORT, SOURCES };
})(typeof window !== 'undefined' ? window : globalThis);
