import { describe, expect, it } from "vitest";
import { createKnowledgeSchema } from "./knowledgeSchema";

describe("createKnowledgeSchema", () => {
  it("正常な入力を検証し、文字列をtrimする", () => {
    const result = createKnowledgeSchema.parse({
      title: "  返品対応  ",
      content: "  返品条件を確認します。  ",
      type: "BUSINESS_PROCEDURE",
      knowledgeCategoryId: "  category-1  ",
      source: "training",
      isFavorite: true,
      tagIds: ["tag-1", "tag-2"],
    });

    expect(result).toEqual({
      title: "返品対応",
      content: "返品条件を確認します。",
      type: "BUSINESS_PROCEDURE",
      knowledgeCategoryId: "category-1",
      source: "training",
      isFavorite: true,
      tagIds: ["tag-1", "tag-2"],
    });
  });

  it("省略可能な値には既定値を設定する", () => {
    const result = createKnowledgeSchema.parse({
      title: "返品対応",
      content: "返品条件を確認します。",
      type: "FAQ",
    });

    expect(result.source).toBe("experience");
    expect(result.isFavorite).toBe(false);
    expect(result.tagIds).toEqual([]);
  });

  it("空文字の分類IDをnullへ変換する", () => {
    const result = createKnowledgeSchema.parse({
      title: "返品対応",
      content: "返品条件を確認します。",
      type: "FAQ",
      knowledgeCategoryId: "   ",
    });

    expect(result.knowledgeCategoryId).toBeNull();
  });

  it("空のタイトルと本文を拒否する", () => {
    const result = createKnowledgeSchema.safeParse({
      title: "   ",
      content: "   ",
      type: "FAQ",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    const messages = result.error.issues.map((issue) => issue.message);

    expect(messages).toContain("タイトルは必須です。");
    expect(messages).toContain("本文は必須です。");
  });

  it("タイトル120文字・本文8000文字までは許可する", () => {
    const result = createKnowledgeSchema.safeParse({
      title: "あ".repeat(120),
      content: "い".repeat(8000),
      type: "FAQ",
    });

    expect(result.success).toBe(true);
  });

  it("タイトル120文字・本文8000文字を超える入力を拒否する", () => {
    const result = createKnowledgeSchema.safeParse({
      title: "あ".repeat(121),
      content: "い".repeat(8001),
      type: "FAQ",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    const messages = result.error.issues.map((issue) => issue.message);

    expect(messages).toContain("タイトルは120文字以内で入力してください。");
    expect(messages).toContain("本文は8000文字以内で入力してください。");
  });

  it("共通タグ20件までは許可し、21件以上を拒否する", () => {
    const validResult = createKnowledgeSchema.safeParse({
      title: "返品対応",
      content: "返品条件を確認します。",
      type: "FAQ",
      tagIds: Array.from({ length: 20 }, (_, index) => `tag-${index + 1}`),
    });

    expect(validResult.success).toBe(true);

    const invalidResult = createKnowledgeSchema.safeParse({
      title: "返品対応",
      content: "返品条件を確認します。",
      type: "FAQ",
      tagIds: Array.from({ length: 21 }, (_, index) => `tag-${index + 1}`),
    });

    expect(invalidResult.success).toBe(false);

    if (invalidResult.success) {
      throw new Error("検証に失敗する想定です。");
    }

    expect(invalidResult.error.issues.map((issue) => issue.message)).toContain(
      "共通タグは20件以内で選択してください。",
    );
  });
});
