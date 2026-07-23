import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";

type BackupRow = Record<string, unknown>;

export type DatabaseBackupData = {
  schemaVersion: 1;
  appName: "Work Knowledge Journal";
  exportedAt: string;
  tables: {
    knowledge_categories: BackupRow[];
    inquiry_categories: BackupRow[];
    tags: BackupRow[];
    knowledge_items: BackupRow[];
    knowledge_tags: BackupRow[];
    inquiry_notes: BackupRow[];
    inquiry_tags: BackupRow[];
    inquiry_knowledge_links: BackupRow[];
    monthly_reviews: BackupRow[];
    app_settings: BackupRow[];
  };
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

function createBackupFileName(exportedAt: string): string {
  const normalizedTimestamp = exportedAt
    .replace(/-/g, "")
    .replace(/:/g, "")
    .replace(".", "-");

  return `work-knowledge-journal-backup-${normalizedTimestamp}.json`;
}

async function selectAllRows(tableName: keyof DatabaseBackupData["tables"]) {
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

  const summary: DatabaseBackupSummary = {
    exportedAt,
    counts: {
      knowledgeCategories: knowledgeCategories.length,
      inquiryCategories: inquiryCategories.length,
      tags: tags.length,
      knowledgeItems: knowledgeItems.length,
      knowledgeTags: knowledgeTags.length,
      inquiryNotes: inquiryNotes.length,
      inquiryTags: inquiryTags.length,
      inquiryKnowledgeLinks: inquiryKnowledgeLinks.length,
      monthlyReviews: monthlyReviews.length,
      appSettings: appSettings.length,
    },
  };

  return {
    data,
    json: JSON.stringify(data, null, 2),
    fileName: createBackupFileName(exportedAt),
    summary,
  };
}
