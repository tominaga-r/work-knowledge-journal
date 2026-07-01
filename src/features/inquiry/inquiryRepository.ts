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

  return db.select<InquiryListItem[]>(
    `SELECT
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
    ORDER BY inquiry_notes.occurred_on DESC, inquiry_notes.updated_at DESC`,
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
