import { getDatabase } from "../../lib/db/client";
import { currentMonthString } from "../../lib/utils/date";

export type RecentKnowledgeItem = {
  id: string;
  title: string;
  type: string;
  is_favorite: number;
  created_at: string;
};

export type RecentInquiryNote = {
  id: string;
  title: string;
  occurred_on: string;
  is_favorite: number;
  created_at: string;
};

export type MonthlyReviewStatus = {
  targetMonth: string;
  isSaved: boolean;
  updatedAt: string | null;
};

export type DashboardOverview = {
  targetMonth: string;
  monthlyKnowledgeCount: number;
  monthlyInquiryCount: number;
  tagCount: number;
  favoriteCount: number;
  monthlyReviewStatus: MonthlyReviewStatus;
  recentKnowledgeItems: RecentKnowledgeItem[];
  recentInquiryNotes: RecentInquiryNote[];
};

type CountRow = {
  count: number;
};

type MonthlyReviewRow = {
  updated_at: string;
};

async function selectCount(
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<CountRow[]>(sql, params);

  return rows[0]?.count ?? 0;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const db = await getDatabase();
  const targetMonth = currentMonthString();

  const [
    monthlyKnowledgeCount,
    monthlyInquiryCount,
    tagCount,
    favoriteKnowledgeCount,
    favoriteInquiryCount,
    monthlyReviewRows,
    recentKnowledgeItems,
    recentInquiryNotes,
  ] = await Promise.all([
    selectCount(
      `SELECT COUNT(*) AS count
       FROM knowledge_items
       WHERE substr(created_at, 1, 7) = $1`,
      [targetMonth],
    ),
    selectCount(
      `SELECT COUNT(*) AS count
       FROM inquiry_notes
       WHERE substr(occurred_on, 1, 7) = $1`,
      [targetMonth],
    ),
    selectCount(
      `SELECT COUNT(*) AS count
       FROM tags`,
    ),
    selectCount(
      `SELECT COUNT(*) AS count
       FROM knowledge_items
       WHERE is_favorite = 1`,
    ),
    selectCount(
      `SELECT COUNT(*) AS count
       FROM inquiry_notes
       WHERE is_favorite = 1`,
    ),
    db.select<MonthlyReviewRow[]>(
      `SELECT updated_at
       FROM monthly_reviews
       WHERE target_month = $1
       LIMIT 1`,
      [targetMonth],
    ),
    db.select<RecentKnowledgeItem[]>(
      `SELECT
        id,
        title,
        type,
        is_favorite,
        created_at
       FROM knowledge_items
       ORDER BY created_at DESC
       LIMIT 5`,
    ),
    db.select<RecentInquiryNote[]>(
      `SELECT
        id,
        title,
        occurred_on,
        is_favorite,
        created_at
       FROM inquiry_notes
       ORDER BY created_at DESC
       LIMIT 5`,
    ),
  ]);

  const monthlyReview = monthlyReviewRows[0] ?? null;

  return {
    targetMonth,
    monthlyKnowledgeCount,
    monthlyInquiryCount,
    tagCount,
    favoriteCount: favoriteKnowledgeCount + favoriteInquiryCount,
    monthlyReviewStatus: {
      targetMonth,
      isSaved: Boolean(monthlyReview),
      updatedAt: monthlyReview?.updated_at ?? null,
    },
    recentKnowledgeItems,
    recentInquiryNotes,
  };
}
