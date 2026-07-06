import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";
import { createId } from "../../lib/utils/id";
import type { KnowledgeListItem } from "../knowledge/knowledgeRepository";

export type LinkedKnowledgeItem = KnowledgeListItem;

export type SuggestedKnowledgeItem = KnowledgeListItem & {
  matched_tag_names: string | null;
  matched_tag_count: number;
};

type TableColumn = {
  name: string;
};

async function listLinkTableColumnNames(): Promise<Set<string>> {
  const db = await getDatabase();

  const columns = await db.select<TableColumn[]>(
    "PRAGMA table_info(inquiry_knowledge_links)",
  );

  return new Set(columns.map((column) => column.name));
}

export async function listLinkedKnowledgeItems(
  inquiryId: string,
): Promise<LinkedKnowledgeItem[]> {
  const normalizedInquiryId = inquiryId.trim();

  if (!normalizedInquiryId) {
    return [];
  }

  const db = await getDatabase();

  return db.select<LinkedKnowledgeItem[]>(
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
    FROM inquiry_knowledge_links
    INNER JOIN knowledge_items
      ON inquiry_knowledge_links.knowledge_id = knowledge_items.id
    LEFT JOIN knowledge_categories
      ON knowledge_items.knowledge_category_id = knowledge_categories.id
    LEFT JOIN knowledge_tags
      ON knowledge_items.id = knowledge_tags.knowledge_id
    LEFT JOIN tags
      ON knowledge_tags.tag_id = tags.id
    WHERE inquiry_knowledge_links.inquiry_id = $1
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
    [normalizedInquiryId],
  );
}

export async function listTagMatchedKnowledgeCandidates(
  inquiryId: string,
): Promise<SuggestedKnowledgeItem[]> {
  const normalizedInquiryId = inquiryId.trim();

  if (!normalizedInquiryId) {
    return [];
  }

  const db = await getDatabase();

  return db.select<SuggestedKnowledgeItem[]>(
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
      GROUP_CONCAT(DISTINCT all_tags.name) as tag_names,
      GROUP_CONCAT(DISTINCT all_tags.id) as tag_ids,
      GROUP_CONCAT(DISTINCT matched_tags.name) as matched_tag_names,
      COUNT(DISTINCT matched_tags.id) as matched_tag_count
    FROM inquiry_tags
    INNER JOIN knowledge_tags as matched_knowledge_tags
      ON inquiry_tags.tag_id = matched_knowledge_tags.tag_id
    INNER JOIN knowledge_items
      ON matched_knowledge_tags.knowledge_id = knowledge_items.id
    LEFT JOIN knowledge_categories
      ON knowledge_items.knowledge_category_id = knowledge_categories.id
    LEFT JOIN knowledge_tags as all_knowledge_tags
      ON knowledge_items.id = all_knowledge_tags.knowledge_id
    LEFT JOIN tags as all_tags
      ON all_knowledge_tags.tag_id = all_tags.id
    LEFT JOIN tags as matched_tags
      ON inquiry_tags.tag_id = matched_tags.id
    WHERE inquiry_tags.inquiry_id = $1
      AND NOT EXISTS (
        SELECT 1
        FROM inquiry_knowledge_links
        WHERE inquiry_knowledge_links.inquiry_id = inquiry_tags.inquiry_id
          AND inquiry_knowledge_links.knowledge_id = knowledge_items.id
      )
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
    ORDER BY matched_tag_count DESC, knowledge_items.updated_at DESC`,
    [normalizedInquiryId],
  );
}

async function countExistingLink(
  inquiryId: string,
  knowledgeId: string,
): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM inquiry_knowledge_links
     WHERE inquiry_id = $1
       AND knowledge_id = $2`,
    [inquiryId, knowledgeId],
  );

  return rows[0]?.count ?? 0;
}

export async function linkKnowledgeToInquiry(
  inquiryId: string,
  knowledgeId: string,
): Promise<void> {
  const normalizedInquiryId = inquiryId.trim();
  const normalizedKnowledgeId = knowledgeId.trim();

  if (!normalizedInquiryId) {
    throw new Error("問い合わせメモIDが不正です。");
  }

  if (!normalizedKnowledgeId) {
    throw new Error("ナレッジIDが不正です。");
  }

  const existingCount = await countExistingLink(
    normalizedInquiryId,
    normalizedKnowledgeId,
  );

  if (existingCount > 0) {
    return;
  }

  const db = await getDatabase();
  const columnNames = await listLinkTableColumnNames();
  const now = nowIsoString();

  const insertColumns: string[] = [];
  const placeholders: string[] = [];
  const values: string[] = [];

  function addColumn(columnName: string, value: string) {
    insertColumns.push(columnName);
    placeholders.push(`$${values.length + 1}`);
    values.push(value);
  }

  if (columnNames.has("id")) {
    addColumn("id", createId("inquiry_knowledge_link"));
  }

  addColumn("inquiry_id", normalizedInquiryId);
  addColumn("knowledge_id", normalizedKnowledgeId);

  if (columnNames.has("created_at")) {
    addColumn("created_at", now);
  }

  if (columnNames.has("updated_at")) {
    addColumn("updated_at", now);
  }

  await db.execute(
    `INSERT INTO inquiry_knowledge_links (
      ${insertColumns.join(", ")}
    )
    VALUES (${placeholders.join(", ")})`,
    values,
  );
}

export async function unlinkKnowledgeFromInquiry(
  inquiryId: string,
  knowledgeId: string,
): Promise<void> {
  const normalizedInquiryId = inquiryId.trim();
  const normalizedKnowledgeId = knowledgeId.trim();

  if (!normalizedInquiryId) {
    throw new Error("問い合わせメモIDが不正です。");
  }

  if (!normalizedKnowledgeId) {
    throw new Error("ナレッジIDが不正です。");
  }

  const db = await getDatabase();

  await db.execute(
    `DELETE FROM inquiry_knowledge_links
     WHERE inquiry_id = $1
       AND knowledge_id = $2`,
    [normalizedInquiryId, normalizedKnowledgeId],
  );
}
