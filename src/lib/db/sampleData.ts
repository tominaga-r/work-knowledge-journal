import { createInquiryNote } from "../../features/inquiry/inquiryRepository";
import { createKnowledgeItem } from "../../features/knowledge/knowledgeRepository";
import {
  CategoryKind,
  CategoryRecord,
} from "../../features/taxonomy/categoryRepository";
import { getDatabase } from "./client";

const SAMPLE_DATA_SETTING_KEY = "sample_data_initialized";

let sampleDataInitializationPromise: Promise<boolean> | null = null;

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

function getCategoryTable(
  kind: CategoryKind,
): "knowledge_categories" | "inquiry_categories" {
  return kind === "knowledge" ? "knowledge_categories" : "inquiry_categories";
}

async function ensureCategory(
  kind: CategoryKind,
  name: string,
): Promise<CategoryRecord> {
  const db = await getDatabase();
  const tableName = getCategoryTable(kind);
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR IGNORE INTO ${tableName} (id, name, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [`${kind}_category_${crypto.randomUUID()}`, name.trim(), 0, now, now],
  );

  const rows = await db.select<CategoryRecord[]>(
    `SELECT id, name, sort_order, created_at, updated_at
     FROM ${tableName}
     WHERE name = $1
     LIMIT 1`,
    [name.trim()],
  );

  const category = rows[0];

  if (!category) {
    throw new Error(`サンプルカテゴリの取得に失敗しました: ${name}`);
  }

  return category;
}

async function ensureTag(name: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR IGNORE INTO tags (id, name, created_at, updated_at)
     VALUES ($1, $2, $3, $4)`,
    [`tag_${crypto.randomUUID()}`, name.trim(), now, now],
  );
}

async function sampleKnowledgeExists(title: string): Promise<boolean> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM knowledge_items
     WHERE title = $1`,
    [title],
  );

  return (rows[0]?.count ?? 0) > 0;
}

async function sampleInquiryExists(title: string): Promise<boolean> {
  const db = await getDatabase();

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM inquiry_notes
     WHERE title = $1`,
    [title],
  );

  return (rows[0]?.count ?? 0) > 0;
}

async function initializeSampleDataInternal(): Promise<boolean> {
  const alreadyInitialized = await isSampleDataInitialized();

  if (alreadyInitialized) {
    return false;
  }

  const db = await getDatabase();

  await db.execute("BEGIN IMMEDIATE TRANSACTION");

  try {
    const initializedInTransaction = await isSampleDataInitialized();

    if (initializedInTransaction) {
      await db.execute("COMMIT");
      return false;
    }

    const knowledgeCategory = await ensureCategory("knowledge", "接客・販売");
    const inquiryCategory = await ensureCategory("inquiry", "問い合わせ対応");

    await ensureTag("接客");
    await ensureTag("確認事項");
    await ensureTag("改善メモ");

    const phraseTitle = "商品の特徴を説明するときの基本フレーズ";
    const procedureTitle = "問い合わせ対応前の確認手順";
    const inquiryTitle = "商品の違いを質問されたときの対応メモ";

    if (!(await sampleKnowledgeExists(phraseTitle))) {
      await createKnowledgeItem({
        title: phraseTitle,
        content:
          "商品の特徴を説明するときは、機能だけでなく利用場面とメリットを合わせて伝える。例：「こちらは軽量なので、毎日持ち運ぶ方にも使いやすいです。」",
        type: "CUSTOMER_SERVICE_PHRASE",
        knowledgeCategoryId: knowledgeCategory.id,
        source: "experience",
        isFavorite: true,
      });
    }

    if (!(await sampleKnowledgeExists(procedureTitle))) {
      await createKnowledgeItem({
        title: procedureTitle,
        content:
          "問い合わせ対応では、事実確認、対象商品、発生日、対応履歴、次に案内する内容を順番に整理する。個人情報や社外秘情報は記録しない。",
        type: "BUSINESS_PROCEDURE",
        knowledgeCategoryId: knowledgeCategory.id,
        source: "template",
        isFavorite: false,
      });
    }

    if (!(await sampleInquiryExists(inquiryTitle))) {
      await createInquiryNote({
        title: inquiryTitle,
        content:
          "似た商品同士の違いを聞かれた。価格差ではなく、利用目的、頻度、必要な機能を確認して案内すると説明しやすかった。",
        responseNote:
          "最初に利用目的を確認し、その後に必要な機能の違いを簡潔に説明した。",
        nextAction:
          "比較されやすい商品の説明フレーズをナレッジとして追加する。",
        inquiryCategoryId: inquiryCategory.id,
        source: "experience",
        isFavorite: true,
      });
    }

    await markSampleDataInitialized();
    await db.execute("COMMIT");

    return true;
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

export async function initializeSampleData(): Promise<boolean> {
  if (!sampleDataInitializationPromise) {
    sampleDataInitializationPromise = initializeSampleDataInternal().finally(
      () => {
        sampleDataInitializationPromise = null;
      },
    );
  }

  return sampleDataInitializationPromise;
}
