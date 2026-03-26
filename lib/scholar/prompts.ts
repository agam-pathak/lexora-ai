/**
 * Lexora Scholar – Dynamic System Prompts
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Each exam category gets a tailored system prompt that instructs
 * Groq/Llama 3.3 to generate questions in the correct style, format,
 * and difficulty for that specific competitive exam.
 */

import {
  type ExamCategory,
  type DifficultyLevel,
  type QuestionType,
  EXAM_LABELS,
  EXAM_QUESTION_TYPES,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Per-exam instructional context injected into the system prompt
// ─────────────────────────────────────────────────────────────────────────────

const EXAM_INSTRUCTIONS: Record<ExamCategory, string> = {
  upsc_cse: `You are generating questions for the UPSC Civil Services Preliminary Examination.
STYLE GUIDELINES:
- Use multi-statement questions where 2-3 statements are given and the aspirant must identify which are correct.
- Include "Assertion and Reasoning" (A-R) questions: provide Assertion (A) and Reason (R), and ask the aspirant to evaluate the logical relationship.
- Questions should test conceptual clarity, inter-topic linkages, and application of knowledge.
- Subjects include: Indian Polity, Indian Economy, History (Ancient/Medieval/Modern), Geography, Environment & Ecology, Science & Technology, Current Affairs.
- Options are typically labeled A, B, C, D.
- Negative marking: -0.33 per wrong answer (for 1-mark questions).`,

  banking_ibps: `You are generating questions for Banking/IBPS competitive exams (PO, Clerk, SO).
STYLE GUIDELINES:
- Include Quantitative Aptitude questions with numerical computation (profit & loss, time & work, percentages, data interpretation).
- Include Reasoning Ability questions (coding-decoding, syllogisms, blood relations, seating arrangement).
- Include English Language questions (reading comprehension cloze tests, error spotting).
- Questions should be solvable within 30-60 seconds each.
- Options are labeled A, B, C, D, E (five options common in banking exams).
- Negative marking: -0.25 per wrong answer (for 1-mark questions).`,

  gate_cs: `You are generating questions for GATE Computer Science & Information Technology.
STYLE GUIDELINES:
- Include conceptual MCQs and numerical answer type (NAT) questions.
- Topics: Data Structures, Algorithms, Operating Systems, DBMS, Computer Networks, Theory of Computation, Compiler Design, Digital Logic, Computer Organization, Discrete Mathematics.
- Questions should test depth of understanding with multi-step reasoning.
- Include questions with numerical computation where the aspirant must calculate the exact answer.
- Options are labeled A, B, C, D.
- Negative marking: -0.33 for 1-mark MCQs, -0.66 for 2-mark MCQs. NAT has no negative marking.`,

  gate_ee: `You are generating questions for GATE Electrical Engineering.
STYLE GUIDELINES:
- Topics: Electric Circuits, Electromagnetic Fields, Signals & Systems, Electrical Machines, Power Systems, Control Systems, Power Electronics, Analog & Digital Electronics.
- Include numerical problems requiring circuit analysis, Laplace transforms, and power calculations.
- Questions should test mathematical problem-solving and conceptual understanding.
- Options are labeled A, B, C, D.
- Negative marking: -0.33 for 1-mark MCQs, -0.66 for 2-mark MCQs.`,

  gate_me: `You are generating questions for GATE Mechanical Engineering.
STYLE GUIDELINES:
- Topics: Engineering Mechanics, Strength of Materials, Thermodynamics, Fluid Mechanics, Heat Transfer, Manufacturing Engineering, Industrial Engineering, Machine Design, Theory of Machines.
- Include numerical problems with engineering calculations, free body diagrams, and thermal analysis.
- Questions should require multi-step engineering problem solving.
- Options are labeled A, B, C, D.
- Negative marking: -0.33 for 1-mark MCQs, -0.66 for 2-mark MCQs.`,

  ssc_cgl: `You are generating questions for SSC Combined Graduate Level Examination.
STYLE GUIDELINES:
- Include General Intelligence & Reasoning, General Awareness, Quantitative Aptitude, and English Comprehension.
- Questions should be factual and can be solved quickly (30-45 seconds each).
- Include static GK (History, Geography, Polity, Economics) and current affairs.
- Quantitative questions should cover arithmetic, algebra, geometry, trigonometry.
- Options are labeled A, B, C, D.
- Negative marking: -0.50 per wrong answer (for 2-mark questions).`,

  cat_mba: `You are generating questions for CAT (Common Admission Test) for MBA entrance.
STYLE GUIDELINES:
- Sections: Verbal Ability & Reading Comprehension (VARC), Data Interpretation & Logical Reasoning (DILR), Quantitative Ability (QA).
- Questions should test higher-order thinking with complex word problems.
- Include questions that require analytical reasoning and data interpretation from tables/charts.
- Quantitative questions should involve number systems, algebra, geometry, modern math.
- Options are labeled A, B, C, D.
- Negative marking: -1 per wrong answer (for 3-mark questions).`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Question-type format instructions
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_TYPE_FORMATS: Record<QuestionType, string> = {
  standard_mcq: `"questionType": "standard_mcq"
Options format: [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, ...]
"correctAnswer": single key like "B"`,

  assertion_reasoning: `"questionType": "assertion_reasoning"
The questionText MUST contain both "Assertion (A): ..." and "Reason (R): ..." clearly labeled.
Options format: [
  {"key": "A", "text": "Both A and R are true, and R is the correct explanation of A"},
  {"key": "B", "text": "Both A and R are true, but R is NOT the correct explanation of A"},
  {"key": "C", "text": "A is true but R is false"},
  {"key": "D", "text": "A is false but R is true"}
]
"correctAnswer": single key like "A"`,

  multi_correct: `"questionType": "multi_correct"
Options format: [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, ...]
"correctAnswer": comma-separated keys like "A,C" (all correct options)`,

  quantitative: `"questionType": "quantitative"
Options format: [{"key": "A", "text": "42"}, {"key": "B", "text": "56"}, ...] (numerical values as text)
"correctAnswer": single key like "C"`,

  true_false: `"questionType": "true_false"
Options format: [{"key": "A", "text": "True"}, {"key": "B", "text": "False"}]
"correctAnswer": single key "A" or "B"`,

  match_the_following: `"questionType": "match_the_following"
Options format: [{"key": "A", "left": "Term 1", "right": "Definition X"}, ...]
The questionText should describe the matching task.
"correctAnswer": single key representing the correct combination`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main prompt builder
// ─────────────────────────────────────────────────────────────────────────────

export function buildScholarSystemPrompt(params: {
  examType: ExamCategory;
  subject: string;
  topic?: string;
  questionCount: number;
  difficulty: DifficultyLevel;
  context?: string;
}): string {
  const {
    examType,
    subject,
    topic,
    questionCount,
    difficulty,
    context,
  } = params;

  const examLabel = EXAM_LABELS[examType];
  const examInstruction = EXAM_INSTRUCTIONS[examType];
  const allowedTypes = EXAM_QUESTION_TYPES[examType];

  const typeInstructions = allowedTypes
    .map((type) => `### ${type}\n${QUESTION_TYPE_FORMATS[type]}`)
    .join("\n\n");

  const topicLine = topic
    ? `\nSpecific Topic: ${topic}`
    : "";

  const contextBlock = context
    ? `\n\nREFERENCE MATERIAL (use this to ground your questions):\n${context}\n`
    : "";

  return `You are Lexora Scholar, an elite examination question generator for ${examLabel}.

${examInstruction}

GENERATION TASK:
- Subject: ${subject}${topicLine}
- Number of questions: ${questionCount}
- Difficulty: ${difficulty === "mixed" ? "mix of easy, medium, and hard" : difficulty}
- Allowed question types: ${allowedTypes.join(", ")}
${contextBlock}
QUESTION TYPE FORMATS:
${typeInstructions}

OUTPUT RULES:
1. You MUST return valid JSON matching this exact structure:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionType": "<one of the allowed types>",
      "questionText": "<the question>",
      "options": [<array of option objects as per the type format above>],
      "correctAnswer": "<key(s)>",
      "explanation": "<detailed explanation of why the answer is correct>",
      "subjectTag": "${subject}",
      "topicTag": "<specific topic within the subject>",
      "difficulty": "<easy|medium|hard>"
    }
  ]
}
2. Generate EXACTLY ${questionCount} questions.
3. Each question MUST have a unique questionNumber from 1 to ${questionCount}.
4. Use a variety of the allowed question types (do NOT use only one type).
5. The explanation must be educational and cite the relevant concept.
6. subjectTag should always be "${subject}".
7. topicTag should be a more specific subtopic within the subject.
8. DO NOT output any text outside the JSON object. No markdown, no commentary.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Negative-marking config per exam
// ─────────────────────────────────────────────────────────────────────────────

export type MarkingScheme = {
  correctMarks: number;
  wrongPenalty: number; // positive number, subtracted on wrong
  skippedMarks: number;
};

export const EXAM_MARKING_SCHEMES: Record<ExamCategory, MarkingScheme> = {
  upsc_cse: { correctMarks: 2, wrongPenalty: 0.66, skippedMarks: 0 },
  banking_ibps: { correctMarks: 1, wrongPenalty: 0.25, skippedMarks: 0 },
  gate_cs: { correctMarks: 1, wrongPenalty: 0.33, skippedMarks: 0 },
  gate_ee: { correctMarks: 1, wrongPenalty: 0.33, skippedMarks: 0 },
  gate_me: { correctMarks: 1, wrongPenalty: 0.33, skippedMarks: 0 },
  ssc_cgl: { correctMarks: 2, wrongPenalty: 0.50, skippedMarks: 0 },
  cat_mba: { correctMarks: 3, wrongPenalty: 1, skippedMarks: 0 },
};
