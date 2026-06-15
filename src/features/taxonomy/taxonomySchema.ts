import { z } from "zod";

export const categoryKindSchema = z.enum(["knowledge", "inquiry"]);

export const createCategorySchema = z.object({
  kind: categoryKindSchema,
  name: z
    .string()
    .trim()
    .min(1, "カテゴリ名は必須です。")
    .max(40, "カテゴリ名は40文字以内で入力してください。"),
});

export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "タグ名は必須です。")
    .max(30, "タグ名は30文字以内で入力してください。"),
});

export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type CreateTagInput = z.input<typeof createTagSchema>;
