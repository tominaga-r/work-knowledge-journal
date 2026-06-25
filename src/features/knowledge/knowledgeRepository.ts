import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";
import { createId } from "../../lib/utils/id";
import { formatZodError } from "../../lib/utils/validation";
import {
  CreateKnowledgeInput,
  KnowledgeSource,
  KnowledgeType,
  createKnowledgeSchema,
  knowledgeTypeValues,
} from "./knowledgeSchema";

export const knowledgeTypes = knowledgeTypeValues;

export type KnowledgeRecord = {
  id: string;
  title: string;
  content: string;
  type: KnowledgeType;
  knowledge_category_id: string | null;
  source: KnowledgeSource;
  is_favorite: number;
  created_at: string;
  updated_at: string;
};

export type KnowledgeListItem = KnowledgeRecord & {
  category_name: string | null;
  tag_names: string | null;
  tag_ids: string | null;
};

async function replaceKnowledgeTags(
  knowledgeId: string,
  tagIds: string[],
): Promise<void> {
  const db = await getDatabase();
  const now = nowIsoString();

  const uniqueTagIds = Array.from(new Set(tagIds.map((tagId) => tagId.trim())))
    .filter(Boolean)
    .slice(0, 20);

  await db.execute(
    `DELETE FROM knowledge_tags
     WHERE knowledge_id = $1`,
    [knowledgeId],
  );

  for (const tagId of uniqueTagIds) {
    await db.execute(
      `INSERT INTO knowledge_tags (knowledge_id, tag_id, created_at)
       VALUES ($1, $2, $3)`,
      [knowledgeId, tagId, now],
    );
  }
}

export async function createKnowledgeItem(
  rawInput: CreateKnowledgeInput,
): Promise<KnowledgeRecord> {
  const result = createKnowledgeSchema.safeParse(rawInput);

  if (!result.success) {
    throw new Error(formatZodError("ナレッジ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const now = nowIsoString();

  const item: KnowledgeRecord = {
    id: createId("knowledge"),
    title: input.title,
    content: input.content,
    type: input.type,
    knowledge_category_id: input.knowledgeCategoryId ?? null,
    source: input.source,
    is_favorite: input.isFavorite ? 1 : 0,
    created_at: now,
    updated_at: now,
  };

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
      item.id,
      item.title,
      item.content,
      item.type,
      item.knowledge_category_id,
      item.source,
      item.is_favorite,
      item.created_at,
      item.updated_at,
    ],
  );

  await replaceKnowledgeTags(item.id, input.tagIds);

  return item;
}

export async function listKnowledgeItems(): Promise<KnowledgeListItem[]> {
  const db = await getDatabase();

  return db.select<KnowledgeListItem[]>(
    `SELECT
      knowledge_items.id,
      knowledge_items.title,
      knowledge_items.content,
      knowledge_items.type,
      knowledge_items.knowledge_category_id,
      knowledge_items.source,
      knowledge_items.is_favorite,
      knowledge_items.created_at,
      knowledge_items.updated_at,
      knowledge_categories.name as category_name,
      GROUP_CONCAT(tags.name, ',') as tag_names,
      GROUP_CONCAT(tags.id, ',') as tag_ids
    FROM knowledge_items
    LEFT JOIN knowledge_categories
      ON knowledge_items.knowledge_category_id = knowledge_categories.id
    LEFT JOIN knowledge_tags
      ON knowledge_items.id = knowledge_tags.knowledge_id
    LEFT JOIN tags
      ON knowledge_tags.tag_id = tags.id
    GROUP BY
      knowledge_items.id,
      knowledge_items.title,
      knowledge_items.content,
      knowledge_items.type,
      knowledge_items.knowledge_category_id,
      knowledge_items.source,
      knowledge_items.is_favorite,
      knowledge_items.created_at,
      knowledge_items.updated_at,
      knowledge_categories.name
    ORDER BY knowledge_items.updated_at DESC`,
  );
}

export async function getKnowledgeItemById(
  id: string,
): Promise<KnowledgeListItem | null> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return null;
  }

  const db = await getDatabase();

  const rows = await db.select<KnowledgeListItem[]>(
    `SELECT
      knowledge_items.id,
      knowledge_items.title,
      knowledge_items.content,
      knowledge_items.type,
      knowledge_items.knowledge_category_id,
      knowledge_items.source,
      knowledge_items.is_favorite,
      knowledge_items.created_at,
      knowledge_items.updated_at,
      knowledge_categories.name as category_name,
      GROUP_CONCAT(tags.name, ',') as tag_names,
      GROUP_CONCAT(tags.id, ',') as tag_ids
    FROM knowledge_items
    LEFT JOIN knowledge_categories
      ON knowledge_items.knowledge_category_id = knowledge_categories.id
    LEFT JOIN knowledge_tags
      ON knowledge_items.id = knowledge_tags.knowledge_id
    LEFT JOIN tags
      ON knowledge_tags.tag_id = tags.id
    WHERE knowledge_items.id = $1
    GROUP BY
      knowledge_items.id,
      knowledge_items.title,
      knowledge_items.content,
      knowledge_items.type,
      knowledge_items.knowledge_category_id,
      knowledge_items.source,
      knowledge_items.is_favorite,
      knowledge_items.created_at,
      knowledge_items.updated_at,
      knowledge_categories.name
    LIMIT 1`,
    [normalizedId],
  );

  return rows[0] ?? null;
}

export async function updateKnowledgeItem(
  id: string,
  rawInput: CreateKnowledgeInput,
): Promise<KnowledgeRecord> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("ナレッジIDが不正です。");
  }

  const result = createKnowledgeSchema.safeParse(rawInput);

  if (!result.success) {
    throw new Error(formatZodError("ナレッジ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const now = nowIsoString();

  const existingItem = await getKnowledgeItemById(normalizedId);

  if (!existingItem) {
    throw new Error("更新対象のナレッジが見つかりません。");
  }

  const item: KnowledgeRecord = {
    id: normalizedId,
    title: input.title,
    content: input.content,
    type: input.type,
    knowledge_category_id: input.knowledgeCategoryId ?? null,
    source: input.source,
    is_favorite: input.isFavorite ? 1 : 0,
    created_at: existingItem.created_at,
    updated_at: now,
  };

  await db.execute(
    `UPDATE knowledge_items
     SET
       title = $1,
       content = $2,
       type = $3,
       knowledge_category_id = $4,
       source = $5,
       is_favorite = $6,
       updated_at = $7
     WHERE id = $8`,
    [
      item.title,
      item.content,
      item.type,
      item.knowledge_category_id,
      item.source,
      item.is_favorite,
      item.updated_at,
      item.id,
    ],
  );

  await replaceKnowledgeTags(item.id, input.tagIds);

  return item;
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("ナレッジIDが不正です。");
  }

  const db = await getDatabase();

  const existingItem = await getKnowledgeItemById(normalizedId);

  if (!existingItem) {
    throw new Error("削除対象のナレッジが見つかりません。");
  }

  await db.execute(
    `DELETE FROM knowledge_tags
     WHERE knowledge_id = $1`,
    [normalizedId],
  );

  await db.execute(
    `DELETE FROM inquiry_knowledge_links
     WHERE knowledge_id = $1`,
    [normalizedId],
  );

  await db.execute(
    `DELETE FROM knowledge_items
     WHERE id = $1`,
    [normalizedId],
  );
}

export async function countKnowledgeItems(): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM knowledge_items",
  );

  return rows[0]?.count ?? 0;
}

export async function countFavoriteKnowledgeItems(): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM knowledge_items WHERE is_favorite = 1",
  );

  return rows[0]?.count ?? 0;
}

export async function countKnowledgeItemsByMonth(
  targetMonth: string,
): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM knowledge_items
     WHERE substr(created_at, 1, 7) = $1`,
    [targetMonth],
  );

  return rows[0]?.count ?? 0;
}
