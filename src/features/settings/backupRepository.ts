import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";

type BackupRow = Record<string, unknown>;

const INVALID_BACKUP_FILE_CONTENT_MESSAGE =
  "バックアップファイルの内容が正しくありません。このアプリで作成したバックアップファイルを選択してください。";

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

export type RestoreDatabaseBackupResult = {
  restoredAt: string;
  summary: DatabaseBackupSummary;
};

function createBackupFileName(exportedAt: string): string {
  const timestamp = exportedAt.replace(/\D/g, "").slice(0, 14);

  if (timestamp.length === 14) {
    const datePart = timestamp.slice(0, 8);
    const timePart = timestamp.slice(8, 14);

    return `${datePart}-${timePart}-work-knowledge-journal-backup.json`;
  }

  const fallbackTimestamp = exportedAt
    .replace(/-/g, "")
    .replace(/:/g, "")
    .replace(".", "-");

  return `work-knowledge-journal-backup-${fallbackTimestamp}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createInvalidBackupContentError(): Error {
  return new Error(INVALID_BACKUP_FILE_CONTENT_MESSAGE);
}

function asText(row: BackupRow, key: string, tableName: string): string {
  const value = row[key];

  if (typeof value !== "string") {
    console.error(`${tableName}.${key} が文字列ではありません。`, value);
    throw createInvalidBackupContentError();
  }

  return value;
}

function asOptionalText(
  row: BackupRow,
  key: string,
  tableName: string,
): string | null {
  const value = row[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    console.error(
      `${tableName}.${key} が文字列またはnullではありません。`,
      value,
    );
    throw createInvalidBackupContentError();
  }

  return value;
}

function asInteger(row: BackupRow, key: string, tableName: string): number {
  const value = row[key];

  if (typeof value !== "number" || !Number.isInteger(value)) {
    console.error(`${tableName}.${key} が整数ではありません。`, value);
    throw createInvalidBackupContentError();
  }

  return value;
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

function assertRestoreData(data: DatabaseBackupData): void {
  for (const row of data.tables.knowledge_categories) {
    asText(row, "id", "knowledge_categories");
    asText(row, "name", "knowledge_categories");
    asInteger(row, "sort_order", "knowledge_categories");
    asText(row, "created_at", "knowledge_categories");
    asText(row, "updated_at", "knowledge_categories");
  }

  for (const row of data.tables.inquiry_categories) {
    asText(row, "id", "inquiry_categories");
    asText(row, "name", "inquiry_categories");
    asInteger(row, "sort_order", "inquiry_categories");
    asText(row, "created_at", "inquiry_categories");
    asText(row, "updated_at", "inquiry_categories");
  }

  for (const row of data.tables.tags) {
    asText(row, "id", "tags");
    asText(row, "name", "tags");
    asText(row, "created_at", "tags");
    asText(row, "updated_at", "tags");
  }

  for (const row of data.tables.knowledge_items) {
    asText(row, "id", "knowledge_items");
    asText(row, "title", "knowledge_items");
    asText(row, "content", "knowledge_items");
    asText(row, "type", "knowledge_items");
    asOptionalText(row, "knowledge_category_id", "knowledge_items");
    asText(row, "source", "knowledge_items");
    asInteger(row, "is_favorite", "knowledge_items");
    asText(row, "created_at", "knowledge_items");
    asText(row, "updated_at", "knowledge_items");
  }

  for (const row of data.tables.knowledge_tags) {
    asText(row, "knowledge_id", "knowledge_tags");
    asText(row, "tag_id", "knowledge_tags");
  }

  for (const row of data.tables.inquiry_notes) {
    asText(row, "id", "inquiry_notes");
    asText(row, "title", "inquiry_notes");
    asText(row, "content", "inquiry_notes");
    asText(row, "response_note", "inquiry_notes");
    asText(row, "next_action", "inquiry_notes");
    asText(row, "occurred_on", "inquiry_notes");
    asOptionalText(row, "inquiry_category_id", "inquiry_notes");
    asText(row, "source", "inquiry_notes");
    asInteger(row, "is_favorite", "inquiry_notes");
    asText(row, "created_at", "inquiry_notes");
    asText(row, "updated_at", "inquiry_notes");
  }

  for (const row of data.tables.inquiry_tags) {
    asText(row, "inquiry_id", "inquiry_tags");
    asText(row, "tag_id", "inquiry_tags");
  }

  for (const row of data.tables.inquiry_knowledge_links) {
    asText(row, "inquiry_id", "inquiry_knowledge_links");
    asText(row, "knowledge_id", "inquiry_knowledge_links");
    asText(row, "created_at", "inquiry_knowledge_links");
  }

  for (const row of data.tables.monthly_reviews) {
    asText(row, "id", "monthly_reviews");
    asText(row, "target_month", "monthly_reviews");
    asText(row, "summary", "monthly_reviews");
    asText(row, "learnings", "monthly_reviews");
    asText(row, "issues", "monthly_reviews");
    asText(row, "frequent_topics", "monthly_reviews");
    asText(row, "next_goals", "monthly_reviews");
    asText(row, "free_memo", "monthly_reviews");
    asText(row, "created_at", "monthly_reviews");
    asText(row, "updated_at", "monthly_reviews");
  }

  for (const row of data.tables.app_settings) {
    asText(row, "key", "app_settings");
    asText(row, "value", "app_settings");
    asText(row, "updated_at", "app_settings");
  }
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

export async function getCurrentDatabaseBackupSummary(): Promise<DatabaseBackupSummary> {
  const currentBackup = await createDatabaseBackup();

  return currentBackup.summary;
}

export function validateDatabaseBackupJson(
  jsonText: string,
): BackupValidationResult {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "バックアップファイルとして読み込めませんでした。ファイル内容を確認してください。",
    );
  }

  if (!isRecord(parsedValue)) {
    throw new Error("このアプリのバックアップファイルではありません。");
  }

  if (parsedValue.schemaVersion !== 1) {
    throw new Error(
      "対応していないバックアップ形式です。このアプリで作成したバックアップファイルを選択してください。",
    );
  }

  if (parsedValue.appName !== "Work Knowledge Journal") {
    throw new Error("このアプリのバックアップファイルではありません。");
  }

  if (typeof parsedValue.exportedAt !== "string" || !parsedValue.exportedAt) {
    throw createInvalidBackupContentError();
  }

  if (!isRecord(parsedValue.tables)) {
    throw createInvalidBackupContentError();
  }

  const warnings: string[] = [];

  for (const tableName of backupTableNames) {
    const tableRows = parsedValue.tables[tableName];

    if (!Array.isArray(tableRows)) {
      console.error(`${tableName} が見つからないか、配列形式ではありません。`);
      throw createInvalidBackupContentError();
    }

    const hasInvalidRow = tableRows.some((row) => !isRecord(row));

    if (hasInvalidRow) {
      console.error(`${tableName} に不正な行データが含まれています。`);
      throw createInvalidBackupContentError();
    }
  }

  const unknownTableNames = Object.keys(parsedValue.tables).filter(
    (tableName) => !backupTableNames.includes(tableName as BackupTableName),
  );

  if (unknownTableNames.length > 0) {
    warnings.push(
      `このバージョンでは使用しないデータが含まれています: ${unknownTableNames.join(
        ", ",
      )}`,
    );
  }

  const data = parsedValue as DatabaseBackupData;

  assertRestoreData(data);

  return {
    data,
    summary: createBackupSummary(data),
    warnings,
  };
}

export async function restoreDatabaseBackup(
  data: DatabaseBackupData,
): Promise<RestoreDatabaseBackupResult> {
  assertRestoreData(data);

  const db = await getDatabase();

  await db.execute("DELETE FROM inquiry_knowledge_links");
  await db.execute("DELETE FROM inquiry_tags");
  await db.execute("DELETE FROM knowledge_tags");
  await db.execute("DELETE FROM inquiry_notes");
  await db.execute("DELETE FROM knowledge_items");
  await db.execute("DELETE FROM tags");
  await db.execute("DELETE FROM inquiry_categories");
  await db.execute("DELETE FROM knowledge_categories");
  await db.execute("DELETE FROM monthly_reviews");
  await db.execute("DELETE FROM app_settings");

  for (const row of data.tables.knowledge_categories) {
    await db.execute(
      `INSERT INTO knowledge_categories (
        id,
        name,
        sort_order,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [
        asText(row, "id", "knowledge_categories"),
        asText(row, "name", "knowledge_categories"),
        asInteger(row, "sort_order", "knowledge_categories"),
        asText(row, "created_at", "knowledge_categories"),
        asText(row, "updated_at", "knowledge_categories"),
      ],
    );
  }

  for (const row of data.tables.inquiry_categories) {
    await db.execute(
      `INSERT INTO inquiry_categories (
        id,
        name,
        sort_order,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [
        asText(row, "id", "inquiry_categories"),
        asText(row, "name", "inquiry_categories"),
        asInteger(row, "sort_order", "inquiry_categories"),
        asText(row, "created_at", "inquiry_categories"),
        asText(row, "updated_at", "inquiry_categories"),
      ],
    );
  }

  for (const row of data.tables.tags) {
    await db.execute(
      `INSERT INTO tags (
        id,
        name,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4)`,
      [
        asText(row, "id", "tags"),
        asText(row, "name", "tags"),
        asText(row, "created_at", "tags"),
        asText(row, "updated_at", "tags"),
      ],
    );
  }

  for (const row of data.tables.knowledge_items) {
    await db.execute(
      `INSERT INTO knowledge_items (
        id,
        title,
        content,
        type,
        knowledge_category_id,
        source,
        is_favorite,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        asText(row, "id", "knowledge_items"),
        asText(row, "title", "knowledge_items"),
        asText(row, "content", "knowledge_items"),
        asText(row, "type", "knowledge_items"),
        asOptionalText(row, "knowledge_category_id", "knowledge_items"),
        asText(row, "source", "knowledge_items"),
        asInteger(row, "is_favorite", "knowledge_items"),
        asText(row, "created_at", "knowledge_items"),
        asText(row, "updated_at", "knowledge_items"),
      ],
    );
  }

  for (const row of data.tables.knowledge_tags) {
    await db.execute(
      `INSERT INTO knowledge_tags (
        knowledge_id,
        tag_id
      )
      VALUES ($1, $2)`,
      [
        asText(row, "knowledge_id", "knowledge_tags"),
        asText(row, "tag_id", "knowledge_tags"),
      ],
    );
  }

  for (const row of data.tables.inquiry_notes) {
    await db.execute(
      `INSERT INTO inquiry_notes (
        id,
        title,
        content,
        response_note,
        next_action,
        occurred_on,
        inquiry_category_id,
        source,
        is_favorite,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        asText(row, "id", "inquiry_notes"),
        asText(row, "title", "inquiry_notes"),
        asText(row, "content", "inquiry_notes"),
        asText(row, "response_note", "inquiry_notes"),
        asText(row, "next_action", "inquiry_notes"),
        asText(row, "occurred_on", "inquiry_notes"),
        asOptionalText(row, "inquiry_category_id", "inquiry_notes"),
        asText(row, "source", "inquiry_notes"),
        asInteger(row, "is_favorite", "inquiry_notes"),
        asText(row, "created_at", "inquiry_notes"),
        asText(row, "updated_at", "inquiry_notes"),
      ],
    );
  }

  for (const row of data.tables.inquiry_tags) {
    await db.execute(
      `INSERT INTO inquiry_tags (
        inquiry_id,
        tag_id
      )
      VALUES ($1, $2)`,
      [
        asText(row, "inquiry_id", "inquiry_tags"),
        asText(row, "tag_id", "inquiry_tags"),
      ],
    );
  }

  for (const row of data.tables.inquiry_knowledge_links) {
    await db.execute(
      `INSERT INTO inquiry_knowledge_links (
        inquiry_id,
        knowledge_id,
        created_at
      )
      VALUES ($1, $2, $3)`,
      [
        asText(row, "inquiry_id", "inquiry_knowledge_links"),
        asText(row, "knowledge_id", "inquiry_knowledge_links"),
        asText(row, "created_at", "inquiry_knowledge_links"),
      ],
    );
  }

  for (const row of data.tables.monthly_reviews) {
    await db.execute(
      `INSERT INTO monthly_reviews (
        id,
        target_month,
        summary,
        learnings,
        issues,
        frequent_topics,
        next_goals,
        free_memo,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        asText(row, "id", "monthly_reviews"),
        asText(row, "target_month", "monthly_reviews"),
        asText(row, "summary", "monthly_reviews"),
        asText(row, "learnings", "monthly_reviews"),
        asText(row, "issues", "monthly_reviews"),
        asText(row, "frequent_topics", "monthly_reviews"),
        asText(row, "next_goals", "monthly_reviews"),
        asText(row, "free_memo", "monthly_reviews"),
        asText(row, "created_at", "monthly_reviews"),
        asText(row, "updated_at", "monthly_reviews"),
      ],
    );
  }

  for (const row of data.tables.app_settings) {
    await db.execute(
      `INSERT INTO app_settings (
        key,
        value,
        updated_at
      )
      VALUES ($1, $2, $3)`,
      [
        asText(row, "key", "app_settings"),
        asText(row, "value", "app_settings"),
        asText(row, "updated_at", "app_settings"),
      ],
    );
  }

  const restoredAt = nowIsoString();

  return {
    restoredAt,
    summary: createBackupSummary(data),
  };
}
