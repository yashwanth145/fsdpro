import { z } from "zod";
import { categories } from "@/lib/categories";
import {
  concreteQuestionTypes,
  difficulties,
  questionCounts,
  requestedQuestionTypes,
  timerMinutesOptions,
  type ConcreteQuestionType,
  type GenerateRequest,
  type QuizContent,
  type QuizQuestion,
} from "@/lib/quiz/types";

const difficultySchema = z.enum(difficulties);
const requestedTypeSchema = z.enum(requestedQuestionTypes);
const questionCountSchema = z.union([
  z.literal(questionCounts[0]),
  z.literal(questionCounts[1]),
]);
const timerSchema = z.union([
  z.null(),
  z.literal(timerMinutesOptions[0]),
  z.literal(timerMinutesOptions[1]),
  z.literal(timerMinutesOptions[2]),
  z.literal(timerMinutesOptions[3]),
  z.literal(timerMinutesOptions[4]),
]);

export const generateRequestSchema = z.object({
  topic: z
    .string()
    .trim()
    .refine(
      (value) => categories.some((category) => category.name === value),
      "Choose one of the quiz categories.",
    ),
  description: z
    .string()
    .trim()
    .max(500, "Keep the description under 500 characters.")
    .optional()
    .default(""),
  questionCount: questionCountSchema,
  difficulty: difficultySchema,
  questionType: requestedTypeSchema,
  timerMinutes: timerSchema.optional().default(null),
});

const generatedQuestionSchema = z.object({
  questionId: z.string().optional(),
  questionText: z.string(),
  questionType: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string(),
});

const generatedQuizSchema = z.object({
  quizTitle: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.string().optional(),
  questions: z.array(generatedQuestionSchema),
});

export function zodFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export function parseGenerateRequest(input: unknown):
  | { ok: true; data: GenerateRequest }
  | { ok: false; fields: Record<string, string>; message: string } {
  const parsed = generateRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fields = zodFieldErrors(parsed.error);
    const message = Object.values(fields)[0] ?? "Check the form and try again.";
    return { ok: false, fields, message };
  }
  return { ok: true, data: parsed.data };
}

function canonicalTrueFalse(value: string): "True" | "False" | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "t" || normalized === "yes") return "True";
  if (normalized === "false" || normalized === "f" || normalized === "no") return "False";
  return null;
}

function isConcreteType(value: string): value is ConcreteQuestionType {
  return concreteQuestionTypes.includes(value as ConcreteQuestionType);
}

function unwrapPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  if ("questions" in raw) return raw;
  if ("quiz" in raw) {
    const nested = (raw as { quiz: unknown }).quiz;
    if (nested && typeof nested === "object") return nested;
  }
  return raw;
}

export function normalizeGeneratedQuiz(
  raw: unknown,
  request: GenerateRequest,
): { ok: true; quiz: QuizContent } | { ok: false; errors: string[] } {
  const parsed = generatedQuizSchema.safeParse(unwrapPayload(raw));
  if (!parsed.success) {
    return {
      ok: false,
      errors: ["The response was not a quiz object with a questions array."],
    };
  }

  const errors: string[] = [];
  const incoming = parsed.data.questions;
  if (incoming.length !== request.questionCount) {
    errors.push(
      `Expected exactly ${request.questionCount} questions, but received ${incoming.length}.`,
    );
  }

  const seenText = new Set<string>();
  const questions: QuizQuestion[] = [];

  incoming.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    const questionText = question.questionText.trim().replace(/\s+/g, " ");
    if (questionText.length < 12) {
      errors.push(`${label} is too short to be a clear question.`);
    }
    if (questionText.length > 600) {
      errors.push(`${label} is too long.`);
    }

    const textKey = questionText.toLowerCase();
    if (textKey && seenText.has(textKey)) {
      errors.push(`${label} duplicates another question.`);
    }
    seenText.add(textKey);

    const declared = question.questionType.trim().toLowerCase();
    if (!isConcreteType(declared)) {
      errors.push(`${label} has an unsupported question type.`);
      return;
    }
    if (request.questionType !== "mixed" && declared !== request.questionType) {
      errors.push(`${label} does not match the requested question type.`);
    }

    const explanation = question.explanation.trim().replace(/\s+/g, " ");
    if (explanation.length < 12) {
      errors.push(`${label} needs a clear explanation.`);
    }

    if (declared === "true_false") {
      const correct = canonicalTrueFalse(question.correctAnswer);
      if (!correct) {
        errors.push(`${label} needs a True or False answer.`);
        return;
      }
      questions.push({
        questionId: `q${index + 1}`,
        questionText,
        questionType: "true_false",
        options: ["True", "False"],
        correctAnswer: correct,
        explanation: explanation.slice(0, 1200),
      });
      return;
    }

    const options = question.options.map((option) => option.trim().replace(/\s+/g, " "));
    if (options.length !== 4) {
      errors.push(`${label} must have exactly four answer choices.`);
    }
    if (options.some((option) => option.length === 0 || option.length > 300)) {
      errors.push(`${label} has an empty or oversized answer choice.`);
    }
    const optionKeys = new Set(options.map((option) => option.toLowerCase()));
    if (optionKeys.size !== options.length) {
      errors.push(`${label} has duplicate answer choices.`);
    }

    const correct = options.find(
      (option) => option.toLowerCase() === question.correctAnswer.trim().toLowerCase(),
    );
    if (!correct) {
      errors.push(`${label} has a correct answer that is not one of the choices.`);
      return;
    }

    questions.push({
      questionId: `q${index + 1}`,
      questionText,
      questionType: "multiple_choice",
      options,
      correctAnswer: correct,
      explanation: explanation.slice(0, 1200),
    });
  });

  if (request.questionType === "mixed" && request.questionCount >= 2) {
    const kinds = new Set(questions.map((question) => question.questionType));
    if (kinds.size < 2) {
      errors.push("A mixed quiz must include both multiple choice and true or false questions.");
    }
  }

  if (errors.length > 0 || questions.length !== request.questionCount) {
    return { ok: false, errors: errors.length > 0 ? errors : ["The quiz could not be validated."] };
  }

  const title = parsed.data.quizTitle?.trim() || `${request.topic} quiz`;
  return {
    ok: true,
    quiz: {
      title: title.slice(0, 140),
      topic: request.topic,
      difficulty: request.difficulty,
      questionType: request.questionType,
      questions,
    },
  };
}

export const quizResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["quizTitle", "topic", "difficulty", "questions"],
  properties: {
    quizTitle: { type: "string" },
    topic: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "questionId",
          "questionText",
          "questionType",
          "options",
          "correctAnswer",
          "explanation",
        ],
        properties: {
          questionId: { type: "string" },
          questionText: { type: "string" },
          questionType: { type: "string", enum: ["multiple_choice", "true_false"] },
          options: { type: "array", items: { type: "string" } },
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;
