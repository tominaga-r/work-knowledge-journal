const MAX_IMPORT_FILE_SIZE_BYTES = 200 * 1024;
const MAX_IMPORT_TEXT_LENGTH = 8000;

const supportedExtensions = [".txt", ".md"];

export type ImportedTextFile = {
  title: string;
  content: string;
  fileName: string;
};

function removeExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function isSupportedTextFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();

  return supportedExtensions.some((extension) => lowerName.endsWith(extension));
}

function createTitleFromText(text: string, fileName: string): string {
  const firstMeaningfulLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const titleSource = firstMeaningfulLine || removeExtension(fileName);

  return titleSource.slice(0, 120);
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
  const content = text.trim();

  if (!content) {
    throw new Error("ファイル内容が空です。");
  }

  if (content.length > MAX_IMPORT_TEXT_LENGTH) {
    throw new Error(
      `${MAX_IMPORT_TEXT_LENGTH}文字以内のテキストファイルを選択してください。`,
    );
  }

  return {
    title: createTitleFromText(content, file.name),
    content,
    fileName: file.name,
  };
}
