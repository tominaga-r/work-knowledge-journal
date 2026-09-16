import { describe, expect, it } from "vitest";
import { createExcerpt, splitCommaSeparatedValues } from "./text";

describe("createExcerpt", () => {
  it("最大文字数以内の文章はそのまま返す", () => {
    expect(createExcerpt("業務ナレッジです。")).toBe("業務ナレッジです。");
  });

  it("改行や連続する空白を1つの空白に整える", () => {
    expect(createExcerpt("  業務\n\nナレッジ\tメモ  ")).toBe(
      "業務 ナレッジ メモ",
    );
  });

  it("最大文字数を超える文章を省略する", () => {
    expect(createExcerpt("1234567890", 5)).toBe("12345...");
  });
});

describe("splitCommaSeparatedValues", () => {
  it("カンマ区切りの値を配列へ変換する", () => {
    expect(splitCommaSeparatedValues("商品,返品,問い合わせ")).toEqual([
      "商品",
      "返品",
      "問い合わせ",
    ]);
  });

  it("前後の空白と空の値を除去する", () => {
    expect(splitCommaSeparatedValues(" 商品 , 返品 , , 問い合わせ , ")).toEqual(
      ["商品", "返品", "問い合わせ"],
    );
  });

  it("null、undefined、空文字では空配列を返す", () => {
    expect(splitCommaSeparatedValues(null)).toEqual([]);
    expect(splitCommaSeparatedValues(undefined)).toEqual([]);
    expect(splitCommaSeparatedValues("")).toEqual([]);
  });
});
