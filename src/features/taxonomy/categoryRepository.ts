import { getDatabase } from "../../lib/db/client";
import { createId } from "../../lib/utils/id";
import { nowIsoString } from "../../lib/utils/date";
import { formatZodError } from "../../lib/utils/validation";
import { CategoryKind, createCategorySchema } from "./taxonomySchema";

export type CategoryRecord = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function getCategoryTable(
  kind: CategoryKind,
): "knowledge_categories" | "inquiry_categories" {
  return kind === "knowledge" ? "knowledge_categories" : "inquiry_categories";
}

export async function listCategories(
  kind: CategoryKind,
): Promise<CategoryRecord[]> {
  const db = await getDatabase();
  const tableName = getCategoryTable(kind);

  return db.select<CategoryRecord[]>(
    `SELECT id, name, sort_order, created_at, updated_at
     FROM ${tableName}
     ORDER BY sort_order ASC, name ASC`,
  );
}

export async function createCategory(
  kind: CategoryKind,
  name: string,
): Promise<CategoryRecord> {
  const result = createCategorySchema.safeParse({ kind, name });

  if (!result.success) {
    throw new Error(formatZodError("カテゴリ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const tableName = getCategoryTable(input.kind);
  const now = nowIsoString();

  const category: CategoryRecord = {
    id: createId(
      input.kind === "knowledge" ? "knowledge_category" : "inquiry_category",
    ),
    name: input.name,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  };

  await db.execute(
    `INSERT INTO ${tableName} (id, name, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      category.id,
      category.name,
      category.sort_order,
      category.created_at,
      category.updated_at,
    ],
  );

  return category;
}

export async function countCategories(kind: CategoryKind): Promise<number> {
  const db = await getDatabase();
  const tableName = getCategoryTable(kind);

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM ${tableName}`,
  );

  return rows[0]?.count ?? 0;
}
