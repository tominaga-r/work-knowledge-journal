import { z } from "zod";

export const knowledgeTypeValues = [
  "PRODUCT_KNOWLEDGE",
  "CUSTOMER_SERVICE_PHRASE",
  "BUSINESS_PROCEDURE",
  "FAQ",
  "CAUTION",
  "IMPROVEMENT",
  "OTHER",
] as const;

export const knowledgeSourceValues = [
  "training",
  "experience",
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
  .array(z.string().trim().min(1, "共通タグIDが不正です。"))
  .max(20, "共通タグは20件以内で選択してください。")
  .optional()
  .default([]);

export const createKnowledgeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルは必須です。")
    .max(120, "タイトルは120文字以内で入力してください。"),
  content: z
    .string()
    .trim()
    .min(1, "本文は必須です。")
    .max(8000, "本文は8000文字以内で入力してください。"),
  type: z.enum(knowledgeTypeValues),
  knowledgeCategoryId: optionalNullableIdSchema,
  source: z.enum(knowledgeSourceValues).default("experience"),
  isFavorite: z.boolean().optional().default(false),
  tagIds: tagIdsSchema,
});

export type KnowledgeType = z.infer<typeof createKnowledgeSchema>["type"];
export type KnowledgeSource = z.infer<typeof createKnowledgeSchema>["source"];
export type CreateKnowledgeInput = z.input<typeof createKnowledgeSchema>;
