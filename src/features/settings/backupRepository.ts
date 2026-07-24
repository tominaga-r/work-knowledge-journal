import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";

type BackupRow = Record<string, unknown>;

const backupTableNames = [
  "knowledge_categories",
  "inquiry_categories",
  "tags",
  "knowledge_items",
  "knowledge_tags",
  "inquiry_notes",
  "inquiry_tags",
  "inquiry_knowledge_links",
  "monthly_reviews",
  "app_settings",
] as const;

type BackupTableName = (typeof backupTableNames)[number];

export type DatabaseBackupData = {
  schemaVersion: 1;
  appName: "Work Knowledge Journal";
  exportedAt: string;
  tables: Record<BackupTableName, BackupRow[]>;
};

export type DatabaseBackupSummary = {
  exportedAt: string;
  counts: {
    knowledgeCategories: number;
    inquiryCategories: number;
    tags: number;
    knowledgeItems: number;
    knowledgeTags: number;
    inquiryNotes: number;
    inquiryTags: number;
    inquiryKnowledgeLinks: number;
    monthlyReviews: number;
    appSettings: number;
  };
};

export type DatabaseBackupResult = {
  data: DatabaseBackupData;
  json: string;
  fileName: string;
  summary: DatabaseBackupSummary;
};

export type BackupValidationResult = {
  data: DatabaseBackupData;
  summary: DatabaseBackupSummary;
  warnings: string[];
};

function createBackupFileName(exportedAt: string): string {
  const normalizedTimestamp = exportedAt
    .replace(/-/g, "")
    .replace(/:/g, "")
    .replace(".", "-");

  return `work-knowledge-journal-backup-${normalizedTimestamp}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createBackupSummary(data: DatabaseBackupData): DatabaseBackupSummary {
  return {
    exportedAt: data.exportedAt,
    counts: {
      knowledgeCategories: data.tables.knowledge_categories.length,
      inquiryCategories: data.tables.inquiry_categories.length,
      tags: data.tables.tags.length,
      knowledgeItems: data.tables.knowledge_items.length,
      knowledgeTags: data.tables.knowledge_tags.length,
      inquiryNotes: data.tables.inquiry_notes.length,
      inquiryTags: data.tables.inquiry_tags.length,
      inquiryKnowledgeLinks: data.tables.inquiry_knowledge_links.length,
      monthlyReviews: data.tables.monthly_reviews.length,
      appSettings: data.tables.app_settings.length,
    },
  };
}

async function selectAllRows(tableName: BackupTableName) {
  const db = await getDatabase();

  return db.select<BackupRow[]>(`SELECT * FROM ${tableName}`);
}

export async function createDatabaseBackup(): Promise<DatabaseBackupResult> {
  const exportedAt = nowIsoString();

  const [
    knowledgeCategories,
    inquiryCategories,
    tags,
    knowledgeItems,
    knowledgeTags,
    inquiryNotes,
    inquiryTags,
    inquiryKnowledgeLinks,
    monthlyReviews,
    appSettings,
  ] = await Promise.all([
    selectAllRows("knowledge_categories"),
    selectAllRows("inquiry_categories"),
    selectAllRows("tags"),
    selectAllRows("knowledge_items"),
    selectAllRows("knowledge_tags"),
    selectAllRows("inquiry_notes"),
    selectAllRows("inquiry_tags"),
    selectAllRows("inquiry_knowledge_links"),
    selectAllRows("monthly_reviews"),
    selectAllRows("app_settings"),
  ]);

  const data: DatabaseBackupData = {
    schemaVersion: 1,
    appName: "Work Knowledge Journal",
    exportedAt,
    tables: {
      knowledge_categories: knowledgeCategories,
      inquiry_categories: inquiryCategories,
      tags,
      knowledge_items: knowledgeItems,
      knowledge_tags: knowledgeTags,
      inquiry_notes: inquiryNotes,
      inquiry_tags: inquiryTags,
      inquiry_knowledge_links: inquiryKnowledgeLinks,
      monthly_reviews: monthlyReviews,
      app_settings: appSettings,
    },
  };

  return {
    data,
    json: JSON.stringify(data, null, 2),
    fileName: createBackupFileName(exportedAt),
    summary: createBackupSummary(data),
  };
}

export function validateDatabaseBackupJson(
  jsonText: string,
): BackupValidationResult {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "JSONとして読み込めませんでした。ファイル内容を確認してください。",
    );
  }

  if (!isRecord(parsedValue)) {
    throw new Error("バックアップJSONの形式が正しくありません。");
  }

  if (parsedValue.schemaVersion !== 1) {
    throw new Error(
      "対応していないバックアップ形式です。schemaVersion 1 のJSONを選択してください。",
    );
  }

  if (parsedValue.appName !== "Work Knowledge Journal") {
    throw new Error("このアプリのバックアップJSONではありません。");
  }

  if (typeof parsedValue.exportedAt !== "string" || !parsedValue.exportedAt) {
    throw new Error("バックアップ作成日時 exportedAt が正しくありません。");
  }

  if (!isRecord(parsedValue.tables)) {
    throw new Error("tables が見つからないか、形式が正しくありません。");
  }

  const warnings: string[] = [];

  for (const tableName of backupTableNames) {
    const tableRows = parsedValue.tables[tableName];

    if (!Array.isArray(tableRows)) {
      throw new Error(
        `${tableName} が見つからないか、配列形式ではありません。`,
      );
    }

    const hasInvalidRow = tableRows.some((row) => !isRecord(row));

    if (hasInvalidRow) {
      throw new Error(`${tableName} に不正な行データが含まれています。`);
    }
  }

  const unknownTableNames = Object.keys(parsedValue.tables).filter(
    (tableName) => !backupTableNames.includes(tableName as BackupTableName),
  );

  if (unknownTableNames.length > 0) {
    warnings.push(
      `未対応のテーブルが含まれています: ${unknownTableNames.join(", ")}`,
    );
  }

  const data = parsedValue as DatabaseBackupData;

  return {
    data,
    summary: createBackupSummary(data),
    warnings,
  };
}
