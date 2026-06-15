import { ZodError } from "zod";

export function formatZodError(context: string, error: ZodError): string {
  const messages = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "input";
    return `${path}: ${issue.message}`;
  });

  return `${context}の入力内容が不正です。${messages.join(" / ")}`;
}
