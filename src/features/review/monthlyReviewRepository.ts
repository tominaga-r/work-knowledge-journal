import { getDatabase } from "../../lib/db/client";
import { nowIsoString } from "../../lib/utils/date";
import { createId } from "../../lib/utils/id";
import { countInquiryNotesByMonth } from "../inquiry/inquiryRepository";
import { countKnowledgeItemsByMonth } from "../knowledge/knowledgeRepository";

export type MonthlyReviewSummary = {
  targetMonth: string;
  knowledgeCount: number;
  inquiryCount: number;
};

export type MonthlyReviewRecord = {
  id: string;
  target_month: string;
  summary: string;
  learnings: string;
  issues: string;
  frequent_topics: string;
  next_goals: string;
  free_memo: string;
  created_at: string;
  updated_at: string;
};

export type SaveMonthlyReviewInput = {
  targetMonth: string;
  summary: string;
  learnings: string;
  issues: string;
  frequentTopics: string;
  nextGoals: string;
  freeMemo: string;
};

export type CreateMonthlyReviewMarkdownInput = {
  summary: MonthlyReviewSummary;
  review: MonthlyReviewRecord | null;
};

function normalizeTargetMonth(targetMonth: string): string {
  const normalizedMonth = targetMonth.trim();

  if (!/^\d{4}-\d{2}$/.test(normalizedMonth)) {
    throw new Error("対象月はYYYY-MM形式で指定してください。");
  }

  return normalizedMonth;
}

function normalizeText(value: string, maxLength: number): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length > maxLength) {
    throw new Error(`${maxLength}文字以内で入力してください。`);
  }

  return normalizedValue;
}

function createMonthLabel(targetMonth: string): string {
  const [year, month] = targetMonth.split("-");

  if (!year || !month) {
    return targetMonth;
  }

  return `${year}年${Number(month)}月`;
}

function createMarkdownSection(title: string, value: string): string {
  const normalizedValue = value.trim();

  return `## ${title}

${normalizedValue || "未記入"}`;
}

export async function getMonthlyReviewSummary(
  targetMonth: string,
): Promise<MonthlyReviewSummary> {
  const normalizedMonth = normalizeTargetMonth(targetMonth);

  const [knowledgeCount, inquiryCount] = await Promise.all([
    countKnowledgeItemsByMonth(normalizedMonth),
    countInquiryNotesByMonth(normalizedMonth),
  ]);

  return {
    targetMonth: normalizedMonth,
    knowledgeCount,
    inquiryCount,
  };
}

export async function getMonthlyReviewByMonth(
  targetMonth: string,
): Promise<MonthlyReviewRecord | null> {
  const normalizedMonth = normalizeTargetMonth(targetMonth);
  const db = await getDatabase();

  const rows = await db.select<MonthlyReviewRecord[]>(
    `SELECT
      id,
      target_month,
      summary,
      learnings,
      issues,
      frequent_topics,
      next_goals,
      free_memo,
      created_at,
      updated_at
     FROM monthly_reviews
     WHERE target_month = $1
     LIMIT 1`,
    [normalizedMonth],
  );

  return rows[0] ?? null;
}

export async function saveMonthlyReview(
  rawInput: SaveMonthlyReviewInput,
): Promise<MonthlyReviewRecord> {
  const db = await getDatabase();
  const normalizedMonth = normalizeTargetMonth(rawInput.targetMonth);
  const now = nowIsoString();

  const input = {
    targetMonth: normalizedMonth,
    summary: normalizeText(rawInput.summary, 4000),
    learnings: normalizeText(rawInput.learnings, 4000),
    issues: normalizeText(rawInput.issues, 4000),
    frequentTopics: normalizeText(rawInput.frequentTopics, 4000),
    nextGoals: normalizeText(rawInput.nextGoals, 4000),
    freeMemo: normalizeText(rawInput.freeMemo, 4000),
  };

  const existingReview = await getMonthlyReviewByMonth(input.targetMonth);

  if (existingReview) {
    await db.execute(
      `UPDATE monthly_reviews
       SET
         summary = $1,
         learnings = $2,
         issues = $3,
         frequent_topics = $4,
         next_goals = $5,
         free_memo = $6,
         updated_at = $7
       WHERE id = $8`,
      [
        input.summary,
        input.learnings,
        input.issues,
        input.frequentTopics,
        input.nextGoals,
        input.freeMemo,
        now,
        existingReview.id,
      ],
    );

    return {
      ...existingReview,
      summary: input.summary,
      learnings: input.learnings,
      issues: input.issues,
      frequent_topics: input.frequentTopics,
      next_goals: input.nextGoals,
      free_memo: input.freeMemo,
      updated_at: now,
    };
  }

  const createdReview: MonthlyReviewRecord = {
    id: createId("monthly_review"),
    target_month: input.targetMonth,
    summary: input.summary,
    learnings: input.learnings,
    issues: input.issues,
    frequent_topics: input.frequentTopics,
    next_goals: input.nextGoals,
    free_memo: input.freeMemo,
    created_at: now,
    updated_at: now,
  };

  await db.execute(
    `INSERT INTO monthly_reviews (
      id,
      target_month,
      summary,
      learnings,
      issues,
      frequent_topics,
      next_goals,
      free_memo,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      createdReview.id,
      createdReview.target_month,
      createdReview.summary,
      createdReview.learnings,
      createdReview.issues,
      createdReview.frequent_topics,
      createdReview.next_goals,
      createdReview.free_memo,
      createdReview.created_at,
      createdReview.updated_at,
    ],
  );

  return createdReview;
}

export function createMonthlyReviewMarkdown({
  summary,
  review,
}: CreateMonthlyReviewMarkdownInput): string {
  const monthLabel = createMonthLabel(summary.targetMonth);

  const markdownSections = [
    `# ${monthLabel} 月次振り返り`,
    `## 月次集計

- 作成されたナレッジ: ${summary.knowledgeCount}件
- 発生した問い合わせメモ: ${summary.inquiryCount}件`,
    createMarkdownSection("月の概要", review?.summary ?? ""),
    createMarkdownSection("学び・気づき", review?.learnings ?? ""),
    createMarkdownSection("課題", review?.issues ?? ""),
    createMarkdownSection(
      "多かった問い合わせ・話題",
      review?.frequent_topics ?? "",
    ),
    createMarkdownSection("来月の目標", review?.next_goals ?? ""),
    createMarkdownSection("自由メモ", review?.free_memo ?? ""),
  ];

  return `${markdownSections.join("\n\n---\n\n")}\n`;
}
