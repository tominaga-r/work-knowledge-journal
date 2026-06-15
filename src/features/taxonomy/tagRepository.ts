import { getDatabase } from "../../lib/db/client";
import { createId } from "../../lib/utils/id";
import { nowIsoString } from "../../lib/utils/date";
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
    `SELECT id, name, created_at, updated_at
     FROM tags
     ORDER BY name ASC`,
  );
}

export async function createTag(name: string): Promise<TagRecord> {
  const result = createTagSchema.safeParse({ name });

  if (!result.success) {
    throw new Error(formatZodError("タグ", result.error));
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
    `INSERT INTO tags (id, name, created_at, updated_at)
     VALUES ($1, $2, $3, $4)`,
    [tag.id, tag.name, tag.created_at, tag.updated_at],
  );

  return tag;
}

export async function countTags(): Promise<number> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM tags",
  );

  return rows[0]?.count ?? 0;
}
