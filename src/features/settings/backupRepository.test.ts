import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DatabaseBackupData,
  validateDatabaseBackupJson,
} from "./backupRepository";

const invalidBackupContentMessage =
  "バックアップファイルの内容が正しくありません。このアプリで作成したバックアップファイルを選択してください。";

function createValidBackup(): DatabaseBackupData {
  return {
    schemaVersion: 1,
    appName: "Work Knowledge Journal",
    exportedAt: "2026-09-16T07:00:00.000Z",
    tables: {
      knowledge_categories: [],
      inquiry_categories: [],
      tags: [
        {
          id: "tag-1",
          name: "返品対応",
          created_at: "2026-09-16T07:00:00.000Z",
          updated_at: "2026-09-16T07:00:00.000Z",
        },
      ],
      knowledge_items: [],
      knowledge_tags: [],
      inquiry_notes: [],
      inquiry_tags: [],
      inquiry_knowledge_links: [],
      monthly_reviews: [],
      app_settings: [],
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateDatabaseBackupJson", () => {
  it("正常なバックアップJSONを検証し、件数サマリーを返す", () => {
    const backup = createValidBackup();

    const result = validateDatabaseBackupJson(JSON.stringify(backup));

    expect(result.data).toEqual(backup);
    expect(result.warnings).toEqual([]);
    expect(result.summary).toEqual({
      exportedAt: "2026-09-16T07:00:00.000Z",
      counts: {
        knowledgeCategories: 0,
        inquiryCategories: 0,
        tags: 1,
        knowledgeItems: 0,
        knowledgeTags: 0,
        inquiryNotes: 0,
        inquiryTags: 0,
        inquiryKnowledgeLinks: 0,
        monthlyReviews: 0,
        appSettings: 0,
      },
    });
  });

  it("壊れたJSONを拒否する", () => {
    expect(() => validateDatabaseBackupJson("{")).toThrow(
      "バックアップファイルとして読み込めませんでした。ファイル内容を確認してください。",
    );
  });

  it("対応していないschemaVersionを拒否する", () => {
    const backup = {
      ...createValidBackup(),
      schemaVersion: 2,
    };

    expect(() => validateDatabaseBackupJson(JSON.stringify(backup))).toThrow(
      "対応していないバックアップ形式です。このアプリで作成したバックアップファイルを選択してください。",
    );
  });

  it("別のappNameを持つバックアップを拒否する", () => {
    const backup = {
      ...createValidBackup(),
      appName: "Other Application",
    };

    expect(() => validateDatabaseBackupJson(JSON.stringify(backup))).toThrow(
      "このアプリのバックアップファイルではありません。",
    );
  });

  it("exportedAtが空のバックアップを拒否する", () => {
    const backup = {
      ...createValidBackup(),
      exportedAt: "",
    };

    expect(() => validateDatabaseBackupJson(JSON.stringify(backup))).toThrow(
      invalidBackupContentMessage,
    );
  });

  it("必須テーブルが不足しているバックアップを拒否する", () => {
    const backup = createValidBackup();

    const tables: Partial<DatabaseBackupData["tables"]> = {
      ...backup.tables,
    };

    delete tables.tags;

    const invalidBackup = {
      ...backup,
      tables,
    };

    expect(() =>
      validateDatabaseBackupJson(JSON.stringify(invalidBackup)),
    ).toThrow(invalidBackupContentMessage);
  });

  it("テーブルが配列形式でないバックアップを拒否する", () => {
    const backup = createValidBackup();

    const invalidBackup = {
      ...backup,
      tables: {
        ...backup.tables,
        tags: {},
      },
    };

    expect(() =>
      validateDatabaseBackupJson(JSON.stringify(invalidBackup)),
    ).toThrow(invalidBackupContentMessage);
  });

  it("テーブル内にオブジェクトではない行が含まれている場合は拒否する", () => {
    const backup = createValidBackup();

    const invalidBackup = {
      ...backup,
      tables: {
        ...backup.tables,
        tags: [null],
      },
    };

    expect(() =>
      validateDatabaseBackupJson(JSON.stringify(invalidBackup)),
    ).toThrow(invalidBackupContentMessage);
  });

  it("行データのフィールド型が不正な場合は拒否する", () => {
    const backup = createValidBackup();

    const invalidBackup = {
      ...backup,
      tables: {
        ...backup.tables,
        tags: [
          {
            id: 123,
            name: "返品対応",
            created_at: "2026-09-16T07:00:00.000Z",
            updated_at: "2026-09-16T07:00:00.000Z",
          },
        ],
      },
    };

    expect(() =>
      validateDatabaseBackupJson(JSON.stringify(invalidBackup)),
    ).toThrow(invalidBackupContentMessage);
  });

  it("未知のテーブルが含まれている場合は警告を返す", () => {
    const backup = createValidBackup();

    const backupWithUnknownTable = {
      ...backup,
      tables: {
        ...backup.tables,
        future_table: [],
      },
    };

    const result = validateDatabaseBackupJson(
      JSON.stringify(backupWithUnknownTable),
    );

    expect(result.warnings).toEqual([
      "このバージョンでは使用しないデータが含まれています: future_table",
    ]);
  });
});
