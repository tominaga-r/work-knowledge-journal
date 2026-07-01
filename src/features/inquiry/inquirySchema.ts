import { z } from "zod";

export const inquirySourceValues = [
  "experience",
  "memo",
  "template",
  "imported",
  "other",
] as const;

const optionalNullableIdSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}, z.string().trim().min(1).nullable().optional());

const tagIdsSchema = z
  .array(z.string().trim().min(1, "タグIDが不正です。"))
  .max(20, "共通タグは20件以内で選択してください。")
  .optional()
  .default([]);

export const createInquirySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルは必須です。")
    .max(120, "タイトルは120文字以内で入力してください。"),
  content: z
    .string()
    .trim()
    .min(1, "問い合わせ概要は必須です。")
    .max(8000, "問い合わせ概要は8000文字以内で入力してください。"),
  responseNote: z
    .string()
    .trim()
    .max(8000, "対応メモは8000文字以内で入力してください。")
    .optional()
    .default(""),
  nextAction: z
    .string()
    .trim()
    .max(4000, "次に活かすことは4000文字以内で入力してください。")
    .optional()
    .default(""),
  occurredOn: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "発生日はYYYY-MM-DD形式で入力してください。")
    .optional(),
  inquiryCategoryId: optionalNullableIdSchema,
  source: z.enum(inquirySourceValues).default("experience"),
  isFavorite: z.boolean().optional().default(false),
  tagIds: tagIdsSchema,
});

export type InquirySource = z.infer<typeof createInquirySchema>["source"];
export type CreateInquiryInput = z.input<typeof createInquirySchema>;
