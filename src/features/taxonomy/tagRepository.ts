import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";
import { createId } from "../../lib/utils/id";
import { formatZodError } from "../../lib/utils/validation";
import { createTagSchema } from "./taxonomySchema";

export type TagRecord = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function listTags(): Promise<TagRecord[]> {
  const db = await getDatabase();

  return db.select<TagRecord[]>(
    `SELECT
      id,
      name,
      created_at,
      updated_at
     FROM tags
     ORDER BY name ASC`,
  );
}

export async function createTag(name: string): Promise<TagRecord> {
  const result = createTagSchema.safeParse({
    name,
  });

  if (!result.success) {
    throw new Error(formatZodError("共通タグ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const now = nowIsoString();

  const tag: TagRecord = {
    id: createId("tag"),
    name: input.name,
    created_at: now,
    updated_at: now,
  };

  await db.execute(
    `INSERT INTO tags (
      id,
      name,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4)`,
    [tag.id, tag.name, tag.created_at, tag.updated_at],
  );

  return tag;
}

export async function updateTag(id: string, name: string): Promise<TagRecord> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("共通タグIDが不正です。");
  }

  const result = createTagSchema.safeParse({
    name,
  });

  if (!result.success) {
    throw new Error(formatZodError("共通タグ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const now = nowIsoString();

  const existingTag = await getTagById(normalizedId);

  if (!existingTag) {
    throw new Error("更新対象の共通タグが見つかりません。");
  }

  await db.execute(
    `UPDATE tags
     SET
       name = $1,
       updated_at = $2
     WHERE id = $3`,
    [input.name, now, normalizedId],
  );

  return {
    ...existingTag,
    name: input.name,
    updated_at: now,
  };
}

export async function deleteTag(id: string): Promise<void> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("共通タグIDが不正です。");
  }

  const db = await getDatabase();

  const existingTag = await getTagById(normalizedId);

  if (!existingTag) {
    throw new Error("削除対象の共通タグが見つかりません。");
  }

  const usageCount = await countTagUsage(normalizedId);

  if (usageCount > 0) {
    throw new Error(
      "この共通タグは使用中のため削除できません。先に紐付いているデータから共通タグを外してください。",
    );
  }

  await db.execute(
    `DELETE FROM tags
     WHERE id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM knowledge_tags
         WHERE tag_id = $1
       )
       AND NOT EXISTS (
         SELECT 1
         FROM inquiry_tags
         WHERE tag_id = $1
       )`,
    [normalizedId],
  );
}

export async function countTags(): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM tags",
  );

  return rows[0]?.count ?? 0;
}

export async function countTagUsage(id: string): Promise<number> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return 0;
  }

  const db = await getDatabase();

  const knowledgeRows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM knowledge_tags
     WHERE tag_id = $1`,
    [normalizedId],
  );

  const inquiryRows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM inquiry_tags
     WHERE tag_id = $1`,
    [normalizedId],
  );

  return (knowledgeRows[0]?.count ?? 0) + (inquiryRows[0]?.count ?? 0);
}

async function getTagById(id: string): Promise<TagRecord | null> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return null;
  }

  const db = await getDatabase();

  const rows = await db.select<TagRecord[]>(
    `SELECT
      id,
      name,
      created_at,
      updated_at
     FROM tags
     WHERE id = $1
     LIMIT 1`,
    [normalizedId],
  );

  return rows[0] ?? null;
}
