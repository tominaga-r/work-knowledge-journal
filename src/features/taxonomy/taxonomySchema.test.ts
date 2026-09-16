import { describe, expect, it } from "vitest";
import {
  categoryKindSchema,
  createCategorySchema,
  createTagSchema,
} from "./taxonomySchema";

describe("categoryKindSchema", () => {
  it("knowledgeとinquiryを許可する", () => {
    expect(categoryKindSchema.safeParse("knowledge").success).toBe(true);
    expect(categoryKindSchema.safeParse("inquiry").success).toBe(true);
  });

  it("未定義の分類種別を拒否する", () => {
    expect(categoryKindSchema.safeParse("other").success).toBe(false);
  });
});

describe("createCategorySchema", () => {
  it("正常な分類を検証し、分類名をtrimする", () => {
    const result = createCategorySchema.parse({
      kind: "knowledge",
      name: "  商品知識  ",
    });

    expect(result).toEqual({
      kind: "knowledge",
      name: "商品知識",
    });
  });

  it("空の分類名を拒否する", () => {
    const result = createCategorySchema.safeParse({
      kind: "knowledge",
      name: "   ",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "分類名は必須です。",
    );
  });

  it("分類名40文字までは許可し、41文字以上を拒否する", () => {
    expect(
      createCategorySchema.safeParse({
        kind: "inquiry",
        name: "あ".repeat(40),
      }).success,
    ).toBe(true);

    const result = createCategorySchema.safeParse({
      kind: "inquiry",
      name: "あ".repeat(41),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "分類名は40文字以内で入力してください。",
    );
  });
});

describe("createTagSchema", () => {
  it("正常な共通タグを検証し、タグ名をtrimする", () => {
    const result = createTagSchema.parse({
      name: "  返品対応  ",
    });

    expect(result).toEqual({
      name: "返品対応",
    });
  });

  it("空の共通タグ名を拒否する", () => {
    const result = createTagSchema.safeParse({
      name: "   ",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "共通タグ名は必須です。",
    );
  });

  it("共通タグ名30文字までは許可し、31文字以上を拒否する", () => {
    expect(
      createTagSchema.safeParse({
        name: "あ".repeat(30),
      }).success,
    ).toBe(true);

    const result = createTagSchema.safeParse({
      name: "あ".repeat(31),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "共通タグ名は30文字以内で入力してください。",
    );
  });

  it("カンマを含む共通タグ名を拒否する", () => {
    const result = createTagSchema.safeParse({
      name: "返品,注意",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("検証に失敗する想定です。");
    }

    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "共通タグ名にカンマ（,）は使用できません。",
    );
  });
});
