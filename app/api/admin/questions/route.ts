import { z } from "zod";
import { addBankQuestion, AdminError, deleteBankQuestions, listBankQuestions, updateBankQuestion } from "@/lib/admin";
import { categories } from "@/lib/categories";
import { jsonError } from "@/lib/http";
import { difficulties } from "@/lib/quiz/types";

const categoryNames = categories.map((category) => category.name) as [string, ...string[]];

const questionSchema = z.object({
  id: z.number().int().positive().optional(),
  category: z.enum(categoryNames),
  difficulty: z.enum(difficulties),
  questionText: z.string().trim().min(8, "Write a question with at least 8 characters.").max(400),
  options: z.array(z.string().trim().min(1).max(160)).length(4, "Enter four answer choices."),
  correctAnswer: z.string().trim().min(1),
  explanation: z.string().trim().min(8, "Add an explanation with at least 8 characters.").max(400),
});

function adminFailure(error: unknown) {
  if (error instanceof AdminError) return jsonError(error.message, error.status, error.code);
  console.error("Admin request failed", error instanceof Error ? error.message : "unknown");
  return jsonError("The question bank could not be updated.", 500, "INTERNAL");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "";
  const difficulty = url.searchParams.get("difficulty") ?? "";
  if (category && !categoryNames.includes(category)) {
    return jsonError("Choose a real category.", 400, "INVALID_INPUT");
  }
  if (difficulty && !difficulties.includes(difficulty as (typeof difficulties)[number])) {
    return jsonError("Choose a real difficulty.", 400, "INVALID_INPUT");
  }
  try {
    const questions = await listBankQuestions(category, difficulty);
    return Response.json({ questions });
  } catch (error) {
    return adminFailure(error);
  }
}

async function readQuestion(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: jsonError("Send the question as JSON.", 400, "INVALID_JSON") };
  }
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return { error: jsonError(parsed.error.issues[0]?.message ?? "Check the question.", 400, "INVALID_INPUT") };
  }
  const options = parsed.data.options;
  if (new Set(options).size !== 4) {
    return { error: jsonError("Each answer choice must be different.", 400, "INVALID_INPUT") };
  }
  if (!options.includes(parsed.data.correctAnswer)) {
    return { error: jsonError("The correct answer must match one of the four choices.", 400, "INVALID_INPUT") };
  }
  return { data: parsed.data };
}

export async function POST(request: Request) {
  const parsed = await readQuestion(request);
  if ("error" in parsed) return parsed.error;
  try {
    const id = await addBankQuestion(parsed.data);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}

export async function PATCH(request: Request) {
  const parsed = await readQuestion(request);
  if ("error" in parsed) return parsed.error;
  if (!parsed.data.id) {
    return jsonError("Choose a question to edit.", 400, "INVALID_INPUT");
  }
  try {
    const id = await updateBankQuestion(parsed.data.id, parsed.data);
    return Response.json({ id });
  } catch (error) {
    return adminFailure(error);
  }
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send the question ids as JSON.", 400, "INVALID_JSON");
  }
  const ids = typeof body === "object" && body && "ids" in body ? (body as { ids: unknown }).ids : null;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((id) => !Number.isInteger(id) || Number(id) < 1)) {
    return jsonError("Choose between 1 and 100 questions to delete.", 400, "INVALID_INPUT");
  }
  try {
    const removed = await deleteBankQuestions(ids.map(Number));
    return Response.json({ removed });
  } catch (error) {
    return adminFailure(error);
  }
}
