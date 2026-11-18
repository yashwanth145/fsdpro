import assert from "node:assert/strict";
import { normalizeGeneratedQuiz, parseGenerateRequest } from "../lib/quiz/schema";
import { remainingSeconds, scoreAttempt } from "../lib/quiz/score";
import { toPublicQuiz } from "../lib/quiz/public";
import type { GenerateRequest, QuizQuestion, StoredQuiz } from "../lib/quiz/types";

const request: GenerateRequest = {
  topic: "Biology",
  description: "Light reactions",
  questionCount: 5,
  difficulty: "medium",
  questionType: "mixed",
  timerMinutes: 10,
};

function question(index: number, type: "multiple_choice" | "true_false"): QuizQuestion {
  if (type === "true_false") {
    return {
      questionId: `q${index}`,
      questionText: `True or false statement number ${index} about photosynthesis.`,
      questionType: "true_false",
      options: ["True", "False"],
      correctAnswer: index % 2 === 0 ? "True" : "False",
      explanation: "This explanation states why the statement is true or false.",
    };
  }
  const options = ["Chlorophyll", "Glucose", "Oxygen", "Nitrogen"];
  return {
    questionId: `q${index}`,
    questionText: `Which term fits photosynthesis question ${index}?`,
    questionType: "multiple_choice",
    options,
    correctAnswer: options[index % options.length]!,
    explanation: "This explanation names the role of the correct term.",
  };
}

function rawFrom(questions: QuizQuestion[]) {
  return {
    quizTitle: "Photosynthesis check",
    topic: "Wrong topic from the model",
    difficulty: "easy",
    questions,
  };
}

const validQuestions = [
  question(1, "multiple_choice"),
  question(2, "true_false"),
  question(3, "multiple_choice"),
  question(4, "true_false"),
  question(5, "multiple_choice"),
];

const parsed = parseGenerateRequest({
  topic: "  Biology  ",
  description: "",
  questionCount: 10,
  difficulty: "hard",
  questionType: "true_false",
  timerMinutes: null,
});
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal(parsed.data.topic, "Biology");
  assert.equal(parsed.data.questionCount, 10);
}

const invalid = parseGenerateRequest({ topic: "A", questionCount: 3, difficulty: "medium", questionType: "mixed" });
assert.equal(invalid.ok, false);

const normalized = normalizeGeneratedQuiz(rawFrom(validQuestions), request);
assert.equal(normalized.ok, true);
if (!normalized.ok) throw new Error("expected a valid quiz");
assert.equal(normalized.quiz.topic, "Biology");
assert.equal(normalized.quiz.difficulty, "medium");
assert.equal(normalized.quiz.questions[1]?.options.join(","), "True,False");
assert.deepEqual(
  normalized.quiz.questions.map((item) => item.questionId),
  ["q1", "q2", "q3", "q4", "q5"],
);

const wrongCount = normalizeGeneratedQuiz(rawFrom(validQuestions.slice(0, 4)), request);
assert.equal(wrongCount.ok, false);

const broken = rawFrom(validQuestions);
broken.questions[0] = {
  ...broken.questions[0]!,
  correctAnswer: "Not an option",
};
const mismatched = normalizeGeneratedQuiz(broken, request);
assert.equal(mismatched.ok, false);

const duplicate = rawFrom(validQuestions);
duplicate.questions[2] = {
  ...duplicate.questions[2]!,
  questionText: duplicate.questions[0]!.questionText,
};
const duplicated = normalizeGeneratedQuiz(duplicate, request);
assert.equal(duplicated.ok, false);

const trueFalseRequest: GenerateRequest = { ...request, questionType: "true_false" };
const looseBoolean = normalizeGeneratedQuiz({
  quizTitle: "Facts",
  questions: Array.from({ length: 5 }, (_, index) => ({
    questionText: `Statement ${index + 1} is a complete true or false item.`,
    questionType: "true_false",
    options: ["yes", "no"],
    correctAnswer: index % 2 === 0 ? "yes" : "no",
    explanation: "The statement was checked against the source material.",
  })),
}, trueFalseRequest);
assert.equal(looseBoolean.ok, true);
if (looseBoolean.ok) {
  assert.deepEqual(looseBoolean.quiz.questions[0]?.options, ["True", "False"]);
  assert.equal(looseBoolean.quiz.questions[0]?.correctAnswer, "True");
}

const quiz: StoredQuiz = {
  ...normalized.quiz,
  id: "11111111-1111-4111-8111-111111111111",
  timerSeconds: 60,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const startedAt = "2026-01-01T00:00:00.000Z";
const submittedAt = "2026-01-01T00:02:05.000Z";
const answers: Record<string, string> = {
  q1: quiz.questions[0]!.correctAnswer,
  q2: quiz.questions[1]!.correctAnswer,
  q3: "Glucose",
  q5: "not-a-real-option",
};
const result = scoreAttempt(quiz, "attempt-1", answers, startedAt, submittedAt);
assert.equal(result.correct, 2);
assert.equal(result.incorrect, 3);
assert.equal(result.percentage, 40);
assert.equal(result.timeTakenSeconds, 60);
assert.equal(result.timedOut, true);
assert.equal(result.questions[3]?.selectedAnswer, null);
assert.equal(result.questions[4]?.selectedAnswer, null);

const publicQuiz = toPublicQuiz(quiz);
assert.equal("correctAnswer" in publicQuiz.questions[0]!, false);
assert.equal("explanation" in publicQuiz, false);

assert.equal(remainingSeconds(startedAt, 60, Date.parse("2026-01-01T00:00:45.000Z")), 15);
assert.equal(remainingSeconds(startedAt, null), null);

const second = scoreAttempt(quiz, "attempt-1", { q1: "hacked-client-score" }, startedAt, submittedAt);
assert.equal(second.score, 0);

console.log("quiz logic tests passed");
