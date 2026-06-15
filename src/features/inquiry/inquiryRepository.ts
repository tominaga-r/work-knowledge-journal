import { getDatabase } from "../../lib/db/client";
import { createId } from "../../lib/utils/id";
import { nowIsoString, todayDateString } from "../../lib/utils/date";

export type InquirySource =
  | "experience"
  | "memo"
  | "template"
  | "imported"
  | "other";

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

export type CreateInquiryInput = {
  title: string;
  content: string;
  responseNote?: string;
  nextAction?: string;
  occurredOn?: string;
  inquiryCategoryId?: string | null;
  source?: InquirySource;
  isFavorite?: boolean;
};

export async function createInquiryNote(
  input: CreateInquiryInput,
): Promise<InquiryRecord> {
  const db = await getDatabase();
  const now = nowIsoString();

  const inquiry: InquiryRecord = {
    id: createId("inquiry"),
    title: input.title,
    content: input.content,
    response_note: input.responseNote ?? "",
    next_action: input.nextAction ?? "",
    occurred_on: input.occurredOn ?? todayDateString(),
    inquiry_category_id: input.inquiryCategoryId ?? null,
    source: input.source ?? "experience",
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
      inquiry.id,
      inquiry.title,
      inquiry.content,
      inquiry.response_note,
      inquiry.next_action,
      inquiry.occurred_on,
      inquiry.inquiry_category_id,
      inquiry.source,
      inquiry.is_favorite,
      inquiry.created_at,
      inquiry.updated_at,
    ],
  );

  return inquiry;
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
