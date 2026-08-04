const MAX_IMPORT_FILE_SIZE_BYTES = 200 * 1024;
const MAX_IMPORT_ENTRY_LENGTH = 8000;
const MAX_IMPORT_ENTRIES = 20;

const supportedExtensions = [".txt", ".md"];

export type ImportedTextEntry = {
  id: string;
  title: string;
  content: string;
};

export type ImportedTextFile = {
  fileName: string;
  entries: ImportedTextEntry[];
};

function removeExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function isSupportedTextFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();

  return supportedExtensions.some((extension) => lowerName.endsWith(extension));
}

function normalizeTitle(title: string, fallbackTitle: string): string {
  const normalizedTitle = title.replace(/^#+\s*/, "").trim();

  return (normalizedTitle || fallbackTitle).slice(0, 120);
}

function normalizeContent(content: string): string {
  return content.trim();
}

function createEntryId(index: number): string {
  return `import-entry-${index + 1}`;
}

function createSingleEntry(text: string, fileName: string): ImportedTextEntry {
  const lines = text.split(/\r?\n/);
  const firstMeaningfulLine = lines
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const fallbackTitle = removeExtension(fileName);
  const title = normalizeTitle(
    firstMeaningfulLine || fallbackTitle,
    fallbackTitle,
  );

  return {
    id: createEntryId(0),
    title,
    content: normalizeContent(text),
  };
}

function parseHeadingEntries(
  text: string,
  fileName: string,
): ImportedTextEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: ImportedTextEntry[] = [];

  let currentTitle = "";
  let currentContentLines: string[] = [];

  function pushCurrentEntry() {
    const content = normalizeContent(currentContentLines.join("\n"));

    if (!currentTitle && !content) {
      return;
    }

    if (!currentTitle) {
      return;
    }

    entries.push({
      id: createEntryId(entries.length),
      title: normalizeTitle(currentTitle, removeExtension(fileName)),
      content,
    });
  }

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      pushCurrentEntry();
      currentTitle = headingMatch[1] ?? "";
      currentContentLines = [];
      continue;
    }

    if (currentTitle) {
      currentContentLines.push(line);
    }
  }

  pushCurrentEntry();

  return entries;
}

function assertEntries(entries: ImportedTextEntry[]): void {
  if (entries.length === 0) {
    throw new Error(
      "取り込み候補を作成できませんでした。## 見出しを追加するか、本文のあるテキストファイルを選択してください。",
    );
  }

  if (entries.length > MAX_IMPORT_ENTRIES) {
    throw new Error(
      `取り込み候補が多すぎます。1ファイルあたり${MAX_IMPORT_ENTRIES}件以内にしてください。`,
    );
  }

  for (const entry of entries) {
    if (!entry.content) {
      throw new Error(
        `「${entry.title}」の本文が空です。見出しの下に本文を入力してください。`,
      );
    }

    if (entry.content.length > MAX_IMPORT_ENTRY_LENGTH) {
      throw new Error(
        `「${entry.title}」の本文が長すぎます。1件あたり${MAX_IMPORT_ENTRY_LENGTH}文字以内にしてください。`,
      );
    }
  }
}

export async function importTextFile(file: File): Promise<ImportedTextFile> {
  if (!isSupportedTextFile(file)) {
    throw new Error(".txt または .md ファイルを選択してください。");
  }

  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error(
      "ファイルサイズが大きすぎます。200KB以内のテキストファイルを選択してください。",
    );
  }

  const text = await file.text();
  const content = normalizeContent(text);

  if (!content) {
    throw new Error("ファイル内容が空です。");
  }

  const headingEntries = parseHeadingEntries(content, file.name);
  const entries =
    headingEntries.length > 0
      ? headingEntries
      : [createSingleEntry(content, file.name)];

  assertEntries(entries);

  return {
    fileName: file.name,
    entries,
  };
}
