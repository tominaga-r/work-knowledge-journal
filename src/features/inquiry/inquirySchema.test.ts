import { describe, expect, it } from "vitest";
import { createInquirySchema } from "./inquirySchema";

describe("createInquirySchema", () => {
  it("正常な入力を検証し、文字列をtrimする", () => {
    const result = createInquirySchema.parse({
      title: "  返品についての問い合わせ  ",
      content: "  返品できるか確認したい。  ",
      responseNote: "  返品条件を案内した。  ",
      nextAction: "  返品条件の説明を整理する。  ",
      occurredOn: "2026-09-16",
      inquiryCategoryId: "  category-1  ",
      source: "memo",
      isFavorite: true,
      tagIds: ["tag-1", "tag-2"],
    });

    expect(result).toEqual({
      title: "返品についての問い合わせ",
      content: "返品できるか確認したい。",
      responseNote: "返品条件を案内した。",
      nextAction: "返品条件の説明を整理する。",
      occurredOn: "2026-09-16",
      inquiryCategoryId: "category-1",
      source: "memo",
      isFavorite: true,
      tagIds: ["tag-1", "tag-2"],
    });
  });

  it("省略可能な値には既定値を設定する", () => {
    const result = createInquirySchema.parse({
      title: "返品について",
      content: "返品できるか確認したい。",
    });

    expect(result.responseNote).toBe("");
    expect(result.nextAction).toBe("");
    expect(result.source).toBe("experience");
    expect(result.isFavorite).toBe(false);
    expect(result.tagIds).toEqual([]);
    expect(result.occurredOn).toBeUndefined();
  });

  it("空文字の分類IDをnullへ変換する", () => {
    const result = createInquirySchema.parse({
      title: "返品について",
      content: "返品できるか確認したい。",
      inquiryCategoryId: "   ",
    });

    expect(result.inquiryCategoryId).toBeNull();
  });

  it("空のタイトルと問い合わせ概要を拒否する", () => {
    const result = createInquirySchema.safeParse({
      title: "   ",
      content: "   ",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    const messages = result.error.issues.map((issue) => issue.message);

    expect(messages).toContain("タイトルは必須です。");
    expect(messages).toContain("問い合わせ概要は必須です。");
  });

  it("各入力項目の最大文字数までは許可する", () => {
    const result = createInquirySchema.safeParse({
      title: "あ".repeat(120),
      content: "い".repeat(8000),
      responseNote: "う".repeat(8000),
      nextAction: "え".repeat(4000),
    });

    expect(result.success).toBe(true);
  });

  it("各入力項目の最大文字数を超える入力を拒否する", () => {
    const result = createInquirySchema.safeParse({
      title: "あ".repeat(121),
      content: "い".repeat(8001),
      responseNote: "う".repeat(8001),
      nextAction: "え".repeat(4001),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    const messages = result.error.issues.map((issue) => issue.message);

    expect(messages).toContain("タイトルは120文字以内で入力してください。");
    expect(messages).toContain(
      "問い合わせ概要は8000文字以内で入力してください。",
    );
    expect(messages).toContain("対応メモは8000文字以内で入力してください。");
    expect(messages).toContain(
      "次に活かすことは4000文字以内で入力してください。",
    );
  });

  it("発生日はYYYY-MM-DD形式のみ許可する", () => {
    const validResult = createInquirySchema.safeParse({
      title: "返品について",
      content: "返品できるか確認したい。",
      occurredOn: "2026-09-16",
    });

    expect(validResult.success).toBe(true);

    const invalidResult = createInquirySchema.safeParse({
      title: "返品について",
      content: "返品できるか確認したい。",
      occurredOn: "2026/09/16",
    });

    expect(invalidResult.success).toBe(false);

    if (invalidResult.success) {
      throw new Error("検証に失敗する想定です。");
    }

    expect(invalidResult.error.issues.map((issue) => issue.message)).toContain(
      "発生日はYYYY-MM-DD形式で入力してください。",
    );
  });

  it("共通タグ20件までは許可し、21件以上を拒否する", () => {
    const validResult = createInquirySchema.safeParse({
      title: "返品について",
      content: "返品できるか確認したい。",
      tagIds: Array.from({ length: 20 }, (_, index) => `tag-${index + 1}`),
    });

    expect(validResult.success).toBe(true);

    const invalidResult = createInquirySchema.safeParse({
      title: "返品について",
      content: "返品できるか確認したい。",
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
