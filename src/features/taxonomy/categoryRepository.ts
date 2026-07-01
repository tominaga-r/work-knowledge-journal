import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";
import { createId } from "../../lib/utils/id";
import { formatZodError } from "../../lib/utils/validation";
import { CategoryKind, createCategorySchema } from "./taxonomySchema";

export type CategoryRecord = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

function getCategoryTableName(kind: CategoryKind): string {
  if (kind === "knowledge") {
    return "knowledge_categories";
  }

  return "inquiry_categories";
}

function getCategoryUsageTableName(kind: CategoryKind): string {
  if (kind === "knowledge") {
    return "knowledge_items";
  }

  return "inquiry_notes";
}

function getCategoryUsageColumnName(kind: CategoryKind): string {
  if (kind === "knowledge") {
    return "knowledge_category_id";
  }

  return "inquiry_category_id";
}

export async function listCategories(
  kind: CategoryKind,
): Promise<CategoryRecord[]> {
  const db = await getDatabase();
  const tableName = getCategoryTableName(kind);

  return db.select<CategoryRecord[]>(
    `SELECT
      id,
      name,
      created_at,
      updated_at
     FROM ${tableName}
     ORDER BY name ASC`,
  );
}

export async function createCategory(
  kind: CategoryKind,
  name: string,
): Promise<CategoryRecord> {
  const result = createCategorySchema.safeParse({
    kind,
    name,
  });

  if (!result.success) {
    throw new Error(formatZodError("カテゴリ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const tableName = getCategoryTableName(input.kind);
  const now = nowIsoString();

  const category: CategoryRecord = {
    id: createId(`${input.kind}_category`),
    name: input.name,
    created_at: now,
    updated_at: now,
  };

  await db.execute(
    `INSERT INTO ${tableName} (
      id,
      name,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4)`,
    [category.id, category.name, category.created_at, category.updated_at],
  );

  return category;
}

export async function updateCategory(
  kind: CategoryKind,
  id: string,
  name: string,
): Promise<CategoryRecord> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("カテゴリIDが不正です。");
  }

  const result = createCategorySchema.safeParse({
    kind,
    name,
  });

  if (!result.success) {
    throw new Error(formatZodError("カテゴリ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const tableName = getCategoryTableName(input.kind);
  const now = nowIsoString();

  const existingCategory = await getCategoryById(input.kind, normalizedId);

  if (!existingCategory) {
    throw new Error("更新対象のカテゴリが見つかりません。");
  }

  await db.execute(
    `UPDATE ${tableName}
     SET
       name = $1,
       updated_at = $2
     WHERE id = $3`,
    [input.name, now, normalizedId],
  );

  return {
    ...existingCategory,
    name: input.name,
    updated_at: now,
  };
}

export async function deleteCategory(
  kind: CategoryKind,
  id: string,
): Promise<void> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("カテゴリIDが不正です。");
  }

  const db = await getDatabase();
  const tableName = getCategoryTableName(kind);
  const usageTableName = getCategoryUsageTableName(kind);
  const usageColumnName = getCategoryUsageColumnName(kind);

  const existingCategory = await getCategoryById(kind, normalizedId);

  if (!existingCategory) {
    throw new Error("削除対象のカテゴリが見つかりません。");
  }

  const usageCount = await countCategoryUsage(kind, normalizedId);

  if (usageCount > 0) {
    throw new Error(
      "このカテゴリは使用中のため削除できません。先に紐付いているデータのカテゴリを変更してください。",
    );
  }

  await db.execute(
    `DELETE FROM ${tableName}
     WHERE id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM ${usageTableName}
         WHERE ${usageColumnName} = $1
       )`,
    [normalizedId],
  );
}

export async function countCategories(kind: CategoryKind): Promise<number> {
  const db = await getDatabase();
  const tableName = getCategoryTableName(kind);

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM ${tableName}`,
  );

  return rows[0]?.count ?? 0;
}

export async function countCategoryUsage(
  kind: CategoryKind,
  id: string,
): Promise<number> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return 0;
  }

  const db = await getDatabase();
  const usageTableName = getCategoryUsageTableName(kind);
  const usageColumnName = getCategoryUsageColumnName(kind);

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM ${usageTableName}
     WHERE ${usageColumnName} = $1`,
    [normalizedId],
  );

  return rows[0]?.count ?? 0;
}

async function getCategoryById(
  kind: CategoryKind,
  id: string,
): Promise<CategoryRecord | null> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return null;
  }

  const db = await getDatabase();
  const tableName = getCategoryTableName(kind);

  const rows = await db.select<CategoryRecord[]>(
    `SELECT
      id,
      name,
      created_at,
      updated_at
     FROM ${tableName}
     WHERE id = $1
     LIMIT 1`,
    [normalizedId],
  );

  return rows[0] ?? null;
}
