import { getDatabase } from "../../lib/db/client";
import { nowIsoString, todayDateString } from "../../lib/utils/date";
import { createId } from "../../lib/utils/id";
import { formatZodError } from "../../lib/utils/validation";
import {
  CreateInquiryInput,
  InquirySource,
  createInquirySchema,
} from "./inquirySchema";

export type InquiryRecord = {
  id: string;
  title: string;
  content: string;
  response_note: string;
  next_action: string;
  occurred_on: string;
  inquiry_category_id: string | null;
  source: InquirySource;
  is_favorite: number;
  created_at: string;
  updated_at: string;
};

export type InquiryListItem = InquiryRecord & {
  category_name: string | null;
  tag_names: string | null;
  tag_ids: string | null;
};

export type SearchInquiryFilters = {
  keyword?: string;
  inquiryCategoryId?: string;
  tagId?: string;
  source?: InquirySource | "";
  isFavorite?: boolean;
  targetMonth?: string;
};

function normalizeOptionalId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeMonth(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}

async function replaceInquiryTags(
  inquiryId: string,
  tagIds: string[],
): Promise<void> {
  const db = await getDatabase();

  const uniqueTagIds = Array.from(new Set(tagIds.map((tagId) => tagId.trim())))
    .filter(Boolean)
    .slice(0, 20);

  await db.execute(
    `DELETE FROM inquiry_tags
     WHERE inquiry_id = $1`,
    [inquiryId],
  );

  for (const tagId of uniqueTagIds) {
    await db.execute(
      `INSERT INTO inquiry_tags (inquiry_id, tag_id)
       VALUES ($1, $2)`,
      [inquiryId, tagId],
    );
  }
}

function createInquiryListSelectSql(whereClause = ""): string {
  return `SELECT
      inquiry_notes.id,
      inquiry_notes.title,
      inquiry_notes.content,
      inquiry_notes.response_note,
      inquiry_notes.next_action,
      inquiry_notes.occurred_on,
      inquiry_notes.inquiry_category_id,
      inquiry_notes.source,
      inquiry_notes.is_favorite,
      inquiry_notes.created_at,
      inquiry_notes.updated_at,
      inquiry_categories.name as category_name,
      GROUP_CONCAT(tags.name, ',') as tag_names,
      GROUP_CONCAT(tags.id, ',') as tag_ids
    FROM inquiry_notes
    LEFT JOIN inquiry_categories
      ON inquiry_notes.inquiry_category_id = inquiry_categories.id
    LEFT JOIN inquiry_tags
      ON inquiry_notes.id = inquiry_tags.inquiry_id
    LEFT JOIN tags
      ON inquiry_tags.tag_id = tags.id
    ${whereClause}
    GROUP BY
      inquiry_notes.id,
      inquiry_notes.title,
      inquiry_notes.content,
      inquiry_notes.response_note,
      inquiry_notes.next_action,
      inquiry_notes.occurred_on,
      inquiry_notes.inquiry_category_id,
      inquiry_notes.source,
      inquiry_notes.is_favorite,
      inquiry_notes.created_at,
      inquiry_notes.updated_at,
      inquiry_categories.name
    ORDER BY inquiry_notes.occurred_on DESC, inquiry_notes.updated_at DESC`;
}

export async function createInquiryNote(
  rawInput: CreateInquiryInput,
): Promise<InquiryRecord> {
  const result = createInquirySchema.safeParse(rawInput);

  if (!result.success) {
    throw new Error(formatZodError("問い合わせメモ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const now = nowIsoString();

  const item: InquiryRecord = {
    id: createId("inquiry"),
    title: input.title,
    content: input.content,
    response_note: input.responseNote,
    next_action: input.nextAction,
    occurred_on: input.occurredOn ?? todayDateString(),
    inquiry_category_id: input.inquiryCategoryId ?? null,
    source: input.source,
    is_favorite: input.isFavorite ? 1 : 0,
    created_at: now,
    updated_at: now,
  };

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
      item.id,
      item.title,
      item.content,
      item.response_note,
      item.next_action,
      item.occurred_on,
      item.inquiry_category_id,
      item.source,
      item.is_favorite,
      item.created_at,
      item.updated_at,
    ],
  );

  await replaceInquiryTags(item.id, input.tagIds);

  return item;
}

export async function listInquiryNotes(): Promise<InquiryListItem[]> {
  const db = await getDatabase();

  return db.select<InquiryListItem[]>(createInquiryListSelectSql());
}

export async function searchInquiryNotes(
  filters: SearchInquiryFilters,
): Promise<InquiryListItem[]> {
  const db = await getDatabase();

  const whereConditions: string[] = [];
  const values: Array<string | number> = [];

  function addValue(value: string | number): string {
    values.push(value);
    return `$${values.length}`;
  }

  const keyword = filters.keyword?.trim();

  if (keyword) {
    const keywordParam = addValue(`%${keyword}%`);

    whereConditions.push(
      `(inquiry_notes.title LIKE ${keywordParam}
        OR inquiry_notes.content LIKE ${keywordParam}
        OR inquiry_notes.response_note LIKE ${keywordParam}
        OR inquiry_notes.next_action LIKE ${keywordParam}
        OR inquiry_categories.name LIKE ${keywordParam}
        OR EXISTS (
          SELECT 1
          FROM inquiry_tags as keyword_inquiry_tags
          INNER JOIN tags as keyword_tags
            ON keyword_inquiry_tags.tag_id = keyword_tags.id
          WHERE keyword_inquiry_tags.inquiry_id = inquiry_notes.id
            AND keyword_tags.name LIKE ${keywordParam}
        ))`,
    );
  }

  const categoryId = normalizeOptionalId(filters.inquiryCategoryId);

  if (categoryId) {
    whereConditions.push(
      `inquiry_notes.inquiry_category_id = ${addValue(categoryId)}`,
    );
  }

  const tagId = normalizeOptionalId(filters.tagId);

  if (tagId) {
    whereConditions.push(
      `EXISTS (
        SELECT 1
        FROM inquiry_tags as filter_inquiry_tags
        WHERE filter_inquiry_tags.inquiry_id = inquiry_notes.id
          AND filter_inquiry_tags.tag_id = ${addValue(tagId)}
      )`,
    );
  }

  if (filters.source) {
    whereConditions.push(`inquiry_notes.source = ${addValue(filters.source)}`);
  }

  if (filters.isFavorite) {
    whereConditions.push("inquiry_notes.is_favorite = 1");
  }

  const targetMonth = normalizeMonth(filters.targetMonth);

  if (targetMonth) {
    whereConditions.push(
      `substr(inquiry_notes.occurred_on, 1, 7) = ${addValue(targetMonth)}`,
    );
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  return db.select<InquiryListItem[]>(
    createInquiryListSelectSql(whereClause),
    values,
  );
}

export async function getInquiryNoteById(
  id: string,
): Promise<InquiryListItem | null> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    return null;
  }

  const db = await getDatabase();

  const rows = await db.select<InquiryListItem[]>(
    `${createInquiryListSelectSql("WHERE inquiry_notes.id = $1")}
     LIMIT 1`,
    [normalizedId],
  );

  return rows[0] ?? null;
}

export async function updateInquiryNote(
  id: string,
  rawInput: CreateInquiryInput,
): Promise<InquiryRecord> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("問い合わせメモIDが不正です。");
  }

  const result = createInquirySchema.safeParse(rawInput);

  if (!result.success) {
    throw new Error(formatZodError("問い合わせメモ", result.error));
  }

  const input = result.data;
  const db = await getDatabase();
  const now = nowIsoString();

  const existingItem = await getInquiryNoteById(normalizedId);

  if (!existingItem) {
    throw new Error("更新対象の問い合わせメモが見つかりません。");
  }

  const item: InquiryRecord = {
    id: normalizedId,
    title: input.title,
    content: input.content,
    response_note: input.responseNote,
    next_action: input.nextAction,
    occurred_on: input.occurredOn ?? todayDateString(),
    inquiry_category_id: input.inquiryCategoryId ?? null,
    source: input.source,
    is_favorite: input.isFavorite ? 1 : 0,
    created_at: existingItem.created_at,
    updated_at: now,
  };

  await db.execute(
    `UPDATE inquiry_notes
     SET
       title = $1,
       content = $2,
       response_note = $3,
       next_action = $4,
       occurred_on = $5,
       inquiry_category_id = $6,
       source = $7,
       is_favorite = $8,
       updated_at = $9
     WHERE id = $10`,
    [
      item.title,
      item.content,
      item.response_note,
      item.next_action,
      item.occurred_on,
      item.inquiry_category_id,
      item.source,
      item.is_favorite,
      item.updated_at,
      item.id,
    ],
  );

  await replaceInquiryTags(item.id, input.tagIds);

  return item;
}

export async function deleteInquiryNote(id: string): Promise<void> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error("問い合わせメモIDが不正です。");
  }

  const db = await getDatabase();

  const existingItem = await getInquiryNoteById(normalizedId);

  if (!existingItem) {
    throw new Error("削除対象の問い合わせメモが見つかりません。");
  }

  await db.execute(
    `DELETE FROM inquiry_tags
     WHERE inquiry_id = $1`,
    [normalizedId],
  );

  await db.execute(
    `DELETE FROM inquiry_knowledge_links
     WHERE inquiry_id = $1`,
    [normalizedId],
  );

  await db.execute(
    `DELETE FROM inquiry_notes
     WHERE id = $1`,
    [normalizedId],
  );
}

export async function countInquiryNotes(): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM inquiry_notes",
  );

  return rows[0]?.count ?? 0;
}

export async function countFavoriteInquiryNotes(): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM inquiry_notes WHERE is_favorite = 1",
  );

  return rows[0]?.count ?? 0;
}

export async function countInquiryNotesByMonth(
  targetMonth: string,
): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM inquiry_notes
     WHERE substr(occurred_on, 1, 7) = $1`,
    [targetMonth],
  );

  return rows[0]?.count ?? 0;
}
