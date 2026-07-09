import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";
import { createId } from "../../lib/utils/id";
import type { KnowledgeListItem } from "../knowledge/knowledgeRepository";

export type LinkedKnowledgeItem = KnowledgeListItem;

export type SuggestedKnowledgeItem = KnowledgeListItem & {
  matched_tag_names: string | null;
  matched_tag_count: number;
};

export type KeywordSuggestedKnowledgeItem = KnowledgeListItem & {
  matched_keywords: string | null;
  matched_keyword_count: number;
};

type TableColumn = {
  name: string;
};

type InquiryKeywordSource = {
  title: string;
  content: string;
  response_note: string;
  next_action: string;
};

async function listLinkTableColumnNames(): Promise<Set<string>> {
  const db = await getDatabase();

  const columns = await db.select<TableColumn[]>(
    "PRAGMA table_info(inquiry_knowledge_links)",
  );

  return new Set(columns.map((column) => column.name));
}

function normalizeSearchText(value: string): string {
  return value
    .replace(
      /[、。,.!?！？「」『』（）()【】\[\]{}<>:：;；/\\|"'“”‘’\n\r\t]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function createStopWords(): Set<string> {
  return new Set([
    "これ",
    "それ",
    "ため",
    "こと",
    "もの",
    "よう",
    "あり",
    "なし",
    "対応",
    "確認",
    "問い合わせ",
    "メモ",
    "内容",
    "概要",
    "次に",
    "活かす",
    "について",
    "として",
    "できる",
    "できない",
    "しました",
    "します",
    "ある",
    "ない",
    "する",
    "した",
    "です",
    "ます",
  ]);
}

function isNoiseKeyword(keyword: string, stopWords: Set<string>): boolean {
  if (keyword.length < 2) {
    return true;
  }

  if (stopWords.has(keyword)) {
    return true;
  }

  if (/^[ぁ-ん]{1,2}$/.test(keyword)) {
    return true;
  }

  if (/^\d+$/.test(keyword)) {
    return true;
  }

  return false;
}

function extractKeywords(source: InquiryKeywordSource): string[] {
  const combinedText = normalizeSearchText(
    [
      source.title,
      source.content,
      source.response_note,
      source.next_action,
    ].join(" "),
  );

  const stopWords = createStopWords();

  const whitespaceKeywords = combinedText
    .split(/\s+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 2)
    .filter((keyword) => keyword.length <= 30)
    .filter((keyword) => !isNoiseKeyword(keyword, stopWords));

  const japaneseLikeChunks = combinedText
    .split(/\s+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 4)
    .filter((chunk) => /[ぁ-んァ-ン一-龥]/.test(chunk));

  const partialKeywords: string[] = [];

  for (const chunk of japaneseLikeChunks) {
    const maxLength = Math.min(12, chunk.length);

    for (let length = maxLength; length >= 2; length -= 1) {
      for (let index = 0; index <= chunk.length - length; index += 1) {
        const keyword = chunk.slice(index, index + length);

        if (isNoiseKeyword(keyword, stopWords)) {
          continue;
        }

        partialKeywords.push(keyword);
      }
    }
  }

  return Array.from(new Set([...whitespaceKeywords, ...partialKeywords]))
    .filter((keyword) => keyword.length >= 2)
    .sort((a, b) => {
      if (b.length !== a.length) {
        return b.length - a.length;
      }

      return a.localeCompare(b);
    })
    .slice(0, 120);
}

function countKeywordMatches(
  knowledge: KnowledgeListItem,
  keywords: string[],
): string[] {
  const searchableText = normalizeSearchText(
    `${knowledge.title} ${knowledge.content}`,
  ).toLowerCase();

  const matchedKeywords = keywords.filter((keyword) =>
    searchableText.includes(keyword.toLowerCase()),
  );

  return Array.from(new Set(matchedKeywords))
    .sort((a, b) => {
      if (b.length !== a.length) {
        return b.length - a.length;
      }

      return a.localeCompare(b);
    })
    .slice(0, 12);
}

function splitMatchedKeywords(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
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

export async function listKeywordMatchedKnowledgeCandidates(
  inquiryId: string,
): Promise<KeywordSuggestedKnowledgeItem[]> {
  const normalizedInquiryId = inquiryId.trim();

  if (!normalizedInquiryId) {
    return [];
  }

  const db = await getDatabase();

  const inquiryRows = await db.select<InquiryKeywordSource[]>(
    `SELECT
      title,
      content,
      response_note,
      next_action
     FROM inquiry_notes
     WHERE id = $1
     LIMIT 1`,
    [normalizedInquiryId],
  );

  const inquiry = inquiryRows[0];

  if (!inquiry) {
    return [];
  }

  const keywords = extractKeywords(inquiry);

  if (keywords.length === 0) {
    return [];
  }

  const candidates = await db.select<KnowledgeListItem[]>(
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
      GROUP_CONCAT(DISTINCT tags.name) as tag_names,
      GROUP_CONCAT(DISTINCT tags.id) as tag_ids
    FROM knowledge_items
    LEFT JOIN knowledge_categories
      ON knowledge_items.knowledge_category_id = knowledge_categories.id
    LEFT JOIN knowledge_tags
      ON knowledge_items.id = knowledge_tags.knowledge_id
    LEFT JOIN tags
      ON knowledge_tags.tag_id = tags.id
    WHERE NOT EXISTS (
      SELECT 1
      FROM inquiry_knowledge_links
      WHERE inquiry_knowledge_links.inquiry_id = $1
        AND inquiry_knowledge_links.knowledge_id = knowledge_items.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM inquiry_tags
      INNER JOIN knowledge_tags as matched_knowledge_tags
        ON inquiry_tags.tag_id = matched_knowledge_tags.tag_id
      WHERE inquiry_tags.inquiry_id = $1
        AND matched_knowledge_tags.knowledge_id = knowledge_items.id
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
    ORDER BY knowledge_items.updated_at DESC`,
    [normalizedInquiryId],
  );

  return candidates
    .map((candidate) => {
      const matchedKeywords = countKeywordMatches(candidate, keywords);

      return {
        ...candidate,
        matched_keywords:
          matchedKeywords.length > 0 ? matchedKeywords.join(",") : null,
        matched_keyword_count: matchedKeywords.length,
      };
    })
    .filter((candidate) => {
      const matchedKeywords = splitMatchedKeywords(candidate.matched_keywords);

      return (
        candidate.matched_keyword_count >= 2 ||
        matchedKeywords.some((keyword) => keyword.length >= 4)
      );
    })
    .sort((a, b) => {
      if (b.matched_keyword_count !== a.matched_keyword_count) {
        return b.matched_keyword_count - a.matched_keyword_count;
      }

      return b.updated_at.localeCompare(a.updated_at);
    })
    .slice(0, 10);
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
