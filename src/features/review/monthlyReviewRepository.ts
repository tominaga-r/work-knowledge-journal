import { countInquiryNotesByMonth } from "../inquiry/inquiryRepository";
import { countKnowledgeItemsByMonth } from "../knowledge/knowledgeRepository";

export type MonthlyReviewSummary = {
  targetMonth: string;
  knowledgeCount: number;
  inquiryCount: number;
};

export async function getMonthlyReviewSummary(
  targetMonth: string,
): Promise<MonthlyReviewSummary> {
  const normalizedMonth = targetMonth.trim();

  if (!/^\d{4}-\d{2}$/.test(normalizedMonth)) {
    throw new Error("対象月はYYYY-MM形式で指定してください。");
  }

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
