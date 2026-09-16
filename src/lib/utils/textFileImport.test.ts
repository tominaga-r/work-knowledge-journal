import { describe, expect, it } from "vitest";
import { importTextFile } from "./textFileImport";

function createTextFile(name: string, content: string, size?: number): File {
  return {
    name,
    size: size ?? new TextEncoder().encode(content).byteLength,
    text: async () => content,
  } as File;
}

describe("importTextFile", () => {
  it("見出しがないtxtファイルを1件の候補として取り込む", async () => {
    const file = createTextFile(
      "sample.txt",
      "返品対応について\n返品時は購入履歴を確認します。",
    );

    const result = await importTextFile(file);

    expect(result.fileName).toBe("sample.txt");
    expect(result.entries).toEqual([
      {
        id: "import-entry-1",
        title: "返品対応について",
        content: "返品対応について\n返品時は購入履歴を確認します。",
      },
    ]);
  });

  it("mdファイルを取り込める", async () => {
    const file = createTextFile(
      "manual.md",
      "商品案内\n商品の案内方法をまとめます。",
    );

    const result = await importTextFile(file);

    expect(result.fileName).toBe("manual.md");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].title).toBe("商品案内");
  });

  it("## 見出しから複数の候補を作成する", async () => {
    const file = createTextFile(
      "knowledge.md",
      [
        "## 返品対応",
        "返品条件を確認します。",
        "",
        "## 配送確認",
        "配送状況を確認します。",
      ].join("\n"),
    );

    const result = await importTextFile(file);

    expect(result.entries).toEqual([
      {
        id: "import-entry-1",
        title: "返品対応",
        content: "返品条件を確認します。",
      },
      {
        id: "import-entry-2",
        title: "配送確認",
        content: "配送状況を確認します。",
      },
    ]);
  });

  it("##とタイトルの間に空白がなくても見出しとして認識する", async () => {
    const file = createTextFile(
      "knowledge.md",
      "##返品対応\n返品条件を確認します。",
    );

    const result = await importTextFile(file);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].title).toBe("返品対応");
    expect(result.entries[0].content).toBe("返品条件を確認します。");
  });

  it("本文がない見出しも候補として残す", async () => {
    const file = createTextFile(
      "knowledge.md",
      "## 返品対応\n## 配送確認\n配送状況を確認します。",
    );

    const result = await importTextFile(file);

    expect(result.entries).toEqual([
      {
        id: "import-entry-1",
        title: "返品対応",
        content: "",
      },
      {
        id: "import-entry-2",
        title: "配送確認",
        content: "配送状況を確認します。",
      },
    ]);
  });

  it("タイトルを120文字以内に切り詰める", async () => {
    const longTitle = "あ".repeat(130);
    const file = createTextFile("knowledge.md", `## ${longTitle}\n本文`);

    const result = await importTextFile(file);

    expect(result.entries[0].title).toBe("あ".repeat(120));
    expect(result.entries[0].title).toHaveLength(120);
  });

  it("空ファイルを拒否する", async () => {
    const file = createTextFile("empty.txt", "   \n\n   ");

    await expect(importTextFile(file)).rejects.toThrow(
      "ファイル内容が空です。",
    );
  });

  it("txtとmd以外のファイルを拒否する", async () => {
    const file = createTextFile("sample.csv", "test");

    await expect(importTextFile(file)).rejects.toThrow(
      ".txt または .md ファイルを選択してください。",
    );
  });

  it("200KBを超えるファイルを拒否する", async () => {
    const file = createTextFile("large.txt", "本文", 200 * 1024 + 1);

    await expect(importTextFile(file)).rejects.toThrow(
      "ファイルサイズが大きすぎます。200KB以内のテキストファイルを選択してください。",
    );
  });

  it("20件までは取り込める", async () => {
    const content = Array.from(
      { length: 20 },
      (_, index) => `## 見出し${index + 1}\n本文${index + 1}`,
    ).join("\n");

    const file = createTextFile("knowledge.md", content);
    const result = await importTextFile(file);

    expect(result.entries).toHaveLength(20);
  });

  it("20件を超える候補を拒否する", async () => {
    const content = Array.from(
      { length: 21 },
      (_, index) => `## 見出し${index + 1}\n本文${index + 1}`,
    ).join("\n");

    const file = createTextFile("knowledge.md", content);

    await expect(importTextFile(file)).rejects.toThrow(
      "取り込み候補が多すぎます。1ファイルあたり20件以内にしてください。",
    );
  });

  it("本文が8000文字を超える候補を拒否する", async () => {
    const file = createTextFile(
      "knowledge.md",
      `## 長い本文\n${"あ".repeat(8001)}`,
    );

    await expect(importTextFile(file)).rejects.toThrow(
      "「長い本文」の本文が長すぎます。1件あたり8000文字以内にしてください。",
    );
  });
});
