import { getDatabase } from "../../lib/db/client";
import { createId } from "../../lib/utils/id";
import { nowIsoString } from "../../lib/utils/date";
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

  return item;
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
