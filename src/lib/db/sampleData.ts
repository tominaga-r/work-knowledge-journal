import { createInquiryNote } from "../../features/inquiry/inquiryRepository";
import { createKnowledgeItem } from "../../features/knowledge/knowledgeRepository";
import { createCategory } from "../../features/taxonomy/categoryRepository";
import { createTag } from "../../features/taxonomy/tagRepository";
import { getDatabase } from "./client";

const SAMPLE_DATA_SETTING_KEY = "sample_data_initialized";

async function isSampleDataInitialized(): Promise<boolean> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ value: string }>>(
    `SELECT value
     FROM app_settings
     WHERE key = $1`,
    [SAMPLE_DATA_SETTING_KEY],
  );

  return rows[0]?.value === "true";
}

async function markSampleDataInitialized(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [SAMPLE_DATA_SETTING_KEY, "true", now],
  );
}

export async function initializeSampleData(): Promise<boolean> {
  const alreadyInitialized = await isSampleDataInitialized();

  if (alreadyInitialized) {
    return false;
  }

  const knowledgeCategory = await createCategory("knowledge", "接客・販売");
  const inquiryCategory = await createCategory("inquiry", "問い合わせ対応");

  await createTag("接客");
  await createTag("確認事項");
  await createTag("改善メモ");

  await createKnowledgeItem({
    title: "商品の特徴を説明するときの基本フレーズ",
    content:
      "商品の特徴を説明するときは、機能だけでなく利用場面とメリットを合わせて伝える。例：「こちらは軽量なので、毎日持ち運ぶ方にも使いやすいです。」",
    type: "CUSTOMER_SERVICE_PHRASE",
    knowledgeCategoryId: knowledgeCategory.id,
    source: "experience",
    isFavorite: true,
  });

  await createKnowledgeItem({
    title: "問い合わせ対応前の確認手順",
    content:
      "問い合わせ対応では、事実確認、対象商品、発生日、対応履歴、次に案内する内容を順番に整理する。個人情報や社外秘情報は記録しない。",
    type: "BUSINESS_PROCEDURE",
    knowledgeCategoryId: knowledgeCategory.id,
    source: "template",
    isFavorite: false,
  });

  await createInquiryNote({
    title: "商品の違いを質問されたときの対応メモ",
    content:
      "似た商品同士の違いを聞かれた。価格差ではなく、利用目的、頻度、必要な機能を確認して案内すると説明しやすかった。",
    responseNote:
      "最初に利用目的を確認し、その後に必要な機能の違いを簡潔に説明した。",
    nextAction: "比較されやすい商品の説明フレーズをナレッジとして追加する。",
    inquiryCategoryId: inquiryCategory.id,
    source: "experience",
    isFavorite: true,
  });

  await markSampleDataInitialized();

  return true;
}
