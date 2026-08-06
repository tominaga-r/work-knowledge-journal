import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { createKnowledgeItem } from "./knowledgeRepository";
import { knowledgeSourceLabels, knowledgeTypeLabels } from "./knowledgeLabels";
import {
  KnowledgeSource,
  KnowledgeType,
  createKnowledgeSchema,
  knowledgeSourceValues,
  knowledgeTypeValues,
} from "./knowledgeSchema";
import { CategoryRecord, listCategories } from "../taxonomy/categoryRepository";
import { TagRecord, listTags } from "../taxonomy/tagRepository";
import { getErrorMessage } from "../../lib/utils/error";
import { importTextFile } from "../../lib/utils/textFileImport";
import type { ImportedTextEntry } from "../../lib/utils/textFileImport";

type FormState = {
  title: string;
  content: string;
  type: KnowledgeType;
  knowledgeCategoryId: string;
  source: KnowledgeSource;
  isFavorite: boolean;
  tagIds: string[];
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type SubmitMode = "backToList" | "continueImport";

const initialFormState: FormState = {
  title: "",
  content: "",
  type: "PRODUCT_KNOWLEDGE",
  knowledgeCategoryId: "",
  source: "experience",
  isFavorite: false,
  tagIds: [],
};

function createFieldErrors(
  issues: Array<{ path: Array<string | number | symbol>; message: string }>,
): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const fieldName = issue.path[0];

    if (
      fieldName === "title" ||
      fieldName === "content" ||
      fieldName === "type" ||
      fieldName === "knowledgeCategoryId" ||
      fieldName === "source" ||
      fieldName === "isFavorite" ||
      fieldName === "tagIds"
    ) {
      errors[fieldName] = issue.message;
    }
  }

  return errors;
}

export function KnowledgeCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [categoryLoadError, setCategoryLoadError] = useState<string>("");
  const [tagLoadError, setTagLoadError] = useState<string>("");
  const [importFileName, setImportFileName] = useState("");
  const [importEntries, setImportEntries] = useState<ImportedTextEntry[]>([]);
  const [activeImportEntryId, setActiveImportEntryId] = useState<string | null>(
    null,
  );
  const [importMessage, setImportMessage] = useState("");
  const [importErrorMessage, setImportErrorMessage] = useState("");

  const hasActiveImportEntry = activeImportEntryId !== null;

  useEffect(() => {
    let isMounted = true;

    async function loadFormOptions() {
      try {
        const loadedCategories = await listCategories("knowledge");

        if (isMounted) {
          setCategories(loadedCategories);
        }
      } catch (error: unknown) {
        console.error(error);

        if (isMounted) {
          setCategoryLoadError(getErrorMessage(error));
        }
      }

      try {
        const loadedTags = await listTags();

        if (isMounted) {
          setTags(loadedTags);
        }
      } catch (error: unknown) {
        console.error(error);

        if (isMounted) {
          setTagLoadError(getErrorMessage(error));
        }
      }
    }

    void loadFormOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
    setImportMessage("");
    setImportErrorMessage("");

    if (status === "error") {
      setStatus("idle");
      setErrorMessage("");
    }
  }

  function toggleTag(tagId: string) {
    setForm((current) => {
      const exists = current.tagIds.includes(tagId);

      return {
        ...current,
        tagIds: exists
          ? current.tagIds.filter((currentTagId) => currentTagId !== tagId)
          : [...current.tagIds, tagId],
      };
    });

    setFieldErrors((current) => ({
      ...current,
      tagIds: undefined,
    }));
  }

  async function handleImportTextFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    setImportFileName("");
    setImportEntries([]);
    setActiveImportEntryId(null);
    setImportMessage("");
    setImportErrorMessage("");

    if (!selectedFile) {
      return;
    }

    try {
      const importedFile = await importTextFile(selectedFile);

      setImportFileName(importedFile.fileName);
      setImportEntries(importedFile.entries);
      setImportMessage(
        `${importedFile.fileName} から ${importedFile.entries.length}件の取り込み候補を作成しました。候補を選んでフォームに反映してください。`,
      );
    } catch (error: unknown) {
      console.error(error);
      setImportErrorMessage(getErrorMessage(error));
    } finally {
      event.target.value = "";
    }
  }

  function applyImportEntryToForm(entry: ImportedTextEntry) {
    setForm((current) => ({
      ...current,
      title: entry.title,
      content: entry.content,
    }));

    setFieldErrors((current) => ({
      ...current,
      title: undefined,
      content: undefined,
    }));

    setActiveImportEntryId(entry.id);
    setImportMessage(
      `「${entry.title}」をフォームに反映しました。内容を確認してから保存してください。`,
    );
    setImportErrorMessage("");

    if (status === "error") {
      setStatus("idle");
      setErrorMessage("");
    }
  }

  function applyNextImportEntryAfterSave(savedEntryId: string) {
    const savedIndex = importEntries.findIndex(
      (entry) => entry.id === savedEntryId,
    );
    const remainingEntries = importEntries.filter(
      (entry) => entry.id !== savedEntryId,
    );

    setImportEntries(remainingEntries);

    if (remainingEntries.length === 0) {
      setActiveImportEntryId(null);
      setForm((current) => ({
        ...current,
        title: "",
        content: "",
      }));
      setImportMessage(
        "すべての取り込み候補を保存しました。続けて登録する場合は新しいファイルを選択してください。",
      );
      return;
    }

    const nextIndex =
      savedIndex >= 0 && savedIndex < remainingEntries.length ? savedIndex : 0;
    const nextEntry = remainingEntries[nextIndex];

    setActiveImportEntryId(nextEntry.id);
    setForm((current) => ({
      ...current,
      title: nextEntry.title,
      content: nextEntry.content,
    }));
    setFieldErrors((current) => ({
      ...current,
      title: undefined,
      content: undefined,
    }));
    setImportMessage(
      `保存しました。次の候補「${nextEntry.title}」をフォームに反映しました。内容を確認してから保存してください。`,
    );
  }

  async function handleSubmit(mode: SubmitMode) {
    if (status === "saving") {
      return;
    }

    const rawInput = {
      title: form.title,
      content: form.content,
      type: form.type,
      knowledgeCategoryId: form.knowledgeCategoryId || null,
      source: form.source,
      isFavorite: form.isFavorite,
      tagIds: form.tagIds,
    };

    const validationResult = createKnowledgeSchema.safeParse(rawInput);

    if (!validationResult.success) {
      setFieldErrors(createFieldErrors(validationResult.error.issues));
      setStatus("idle");
      setErrorMessage("");
      return;
    }

    setStatus("saving");
    setErrorMessage("");
    setFieldErrors({});

    try {
      await createKnowledgeItem(validationResult.data);
      setStatus("success");

      if (mode === "continueImport" && activeImportEntryId) {
        applyNextImportEntryAfterSave(activeImportEntryId);
        setStatus("idle");
        return;
      }

      navigate("/knowledge");
    } catch (error: unknown) {
      console.error(error);
      setStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            ナレッジ新規作成
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            商品知識、接客フレーズ、業務手順、FAQ、注意事項、改善メモを登録します。
          </p>
        </div>

        <Link
          to="/knowledge"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          一覧へ戻る
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-semibold">入力前の注意</p>
            <p className="mt-1">
              顧客の氏名・連絡先・購入履歴・社外秘情報・非公開の商品情報は入力しないでください。
              sourceには具体的な社内資料名や顧客名を書かず、抽象的な由来だけを選択してください。
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-semibold text-slate-900">
              テキストファイルから取り込む
            </p>
            <p className="mt-1 leading-6 text-slate-500">
              .txt / .md ファイルを読み込み、##
              見出しごとに取り込み候補を作成します。
              候補を選ぶと、タイトルと本文に反映されます。
            </p>
            <p className="mt-2 leading-6 text-amber-700">
              取り込み後は必ずフォームで内容を確認してから保存してください。
              個人情報・社外秘情報・非公開情報が含まれる場合は削除または匿名化してください。
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            ファイルを選択
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => void handleImportTextFile(event)}
              className="hidden"
            />
          </label>
        </div>

        {importMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {importMessage}
          </div>
        )}

        {importErrorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">ファイルの読み込みに失敗しました。</p>
            <p className="mt-1 break-all">{importErrorMessage}</p>
          </div>
        )}

        {importEntries.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <p className="font-semibold text-slate-900">取り込み候補</p>
              <p className="text-xs text-slate-500">
                {importFileName} / 残り {importEntries.length}件
              </p>
            </div>

            <div className="mt-3 space-y-3">
              {importEntries.map((entry, index) => {
                const isActive = entry.id === activeImportEntryId;

                return (
                  <div
                    key={entry.id}
                    className={
                      isActive
                        ? "rounded-xl border border-slate-900 bg-white p-4"
                        : "rounded-xl border border-slate-200 bg-white p-4"
                    }
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          候補 {index + 1}
                          {isActive && (
                            <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-white">
                              反映中
                            </span>
                          )}
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {entry.title}
                        </p>
                        <p className="mt-2 max-h-20 overflow-hidden whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {entry.content}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => applyImportEntryToForm(entry)}
                        className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        フォームに反映
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {categoryLoadError && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">分類の読み込みに失敗しました。</p>
          <p className="mt-1 break-all">{categoryLoadError}</p>
        </div>
      )}

      {tagLoadError && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">共通タグの読み込みに失敗しました。</p>
          <p className="mt-1 break-all">{tagLoadError}</p>
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">ナレッジの保存に失敗しました。</p>
          <p className="mt-1 break-all">{errorMessage}</p>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit("backToList");
        }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-5">
          <div>
            <label
              htmlFor="knowledge-title"
              className="text-sm font-semibold text-slate-900"
            >
              タイトル <span className="text-red-600">*</span>
            </label>
            <input
              id="knowledge-title"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              maxLength={120}
              aria-invalid={fieldErrors.title ? "true" : "false"}
              aria-describedby={
                fieldErrors.title
                  ? "knowledge-title-error"
                  : "knowledge-title-help"
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="例: 商品の特徴を説明するときの基本フレーズ"
            />
            {fieldErrors.title ? (
              <p
                id="knowledge-title-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.title}
              </p>
            ) : (
              <p
                id="knowledge-title-help"
                className="mt-1 text-xs text-slate-500"
              >
                120文字以内。個人名や社外秘資料名は含めないでください。
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="knowledge-content"
              className="text-sm font-semibold text-slate-900"
            >
              本文 <span className="text-red-600">*</span>
            </label>
            <textarea
              id="knowledge-content"
              value={form.content}
              onChange={(event) => updateForm("content", event.target.value)}
              maxLength={8000}
              rows={10}
              aria-invalid={fieldErrors.content ? "true" : "false"}
              aria-describedby={
                fieldErrors.content
                  ? "knowledge-content-error"
                  : "knowledge-content-help"
              }
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="例: 機能だけでなく、利用場面とメリットを合わせて説明する。"
            />
            {fieldErrors.content ? (
              <p
                id="knowledge-content-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.content}
              </p>
            ) : (
              <p
                id="knowledge-content-help"
                className="mt-1 text-xs text-slate-500"
              >
                8000文字以内。匿名化・一般化した業務ナレッジとして記録します。
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="knowledge-type"
                className="text-sm font-semibold text-slate-900"
              >
                ナレッジ種類
              </label>
              <select
                id="knowledge-type"
                value={form.type}
                onChange={(event) =>
                  updateForm("type", event.target.value as KnowledgeType)
                }
                aria-invalid={fieldErrors.type ? "true" : "false"}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {knowledgeTypeValues.map((type) => (
                  <option key={type} value={type}>
                    {knowledgeTypeLabels[type]}
                  </option>
                ))}
              </select>
              {fieldErrors.type && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.type}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="knowledge-category"
                className="text-sm font-semibold text-slate-900"
              >
                分類
              </label>
              <select
                id="knowledge-category"
                value={form.knowledgeCategoryId}
                onChange={(event) =>
                  updateForm("knowledgeCategoryId", event.target.value)
                }
                aria-invalid={
                  fieldErrors.knowledgeCategoryId ? "true" : "false"
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">未設定</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.knowledgeCategoryId && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.knowledgeCategoryId}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="knowledge-source"
                className="text-sm font-semibold text-slate-900"
              >
                source
              </label>
              <select
                id="knowledge-source"
                value={form.source}
                onChange={(event) =>
                  updateForm("source", event.target.value as KnowledgeSource)
                }
                aria-invalid={fieldErrors.source ? "true" : "false"}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {knowledgeSourceValues.map((source) => (
                  <option key={source} value={source}>
                    {knowledgeSourceLabels[source]}
                  </option>
                ))}
              </select>
              {fieldErrors.source ? (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.source}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  具体的な社内資料名ではなく、抽象的な由来を選びます。
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">共通タグ</p>
            <p className="mt-1 text-xs text-slate-500">
              既存共通タグから選択します。共通タグの追加・編集・削除は分類管理で行います。
            </p>
            {tags.length === 0 ? (
              <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                登録済み共通タグがありません。
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = form.tagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={
                        isSelected
                          ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                          : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      }
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            )}
            {fieldErrors.tagIds && (
              <p className="mt-2 text-xs font-medium text-red-600">
                {fieldErrors.tagIds}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isFavorite}
              onChange={(event) =>
                updateForm("isFavorite", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            お気に入りにする
          </label>

          {fieldErrors.isFavorite && (
            <p className="-mt-3 text-xs font-medium text-red-600">
              {fieldErrors.isFavorite}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 md:flex-row md:justify-end">
          <Link
            to="/knowledge"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            キャンセル
          </Link>

          {hasActiveImportEntry ? (
            <button
              type="button"
              onClick={() => void handleSubmit("continueImport")}
              disabled={status === "saving"}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "saving" ? "保存中..." : "保存して次の候補へ"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "saving" ? "保存中..." : "保存する"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
