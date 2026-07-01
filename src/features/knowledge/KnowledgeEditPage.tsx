import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import {
  KnowledgeListItem,
  getKnowledgeItemById,
  updateKnowledgeItem,
} from "./knowledgeRepository";
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

function splitIds(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function createFormStateFromItem(item: KnowledgeListItem): FormState {
  return {
    title: item.title,
    content: item.content,
    type: item.type,
    knowledgeCategoryId: item.knowledge_category_id ?? "",
    source: item.source,
    isFavorite: item.is_favorite === 1,
    tagIds: splitIds(item.tag_ids),
  };
}

export function KnowledgeEditPage() {
  const { knowledgeId } = useParams<{ knowledgeId: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [status, setStatus] = useState<
    "loading" | "ready" | "saving" | "notFound" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [categoryLoadError, setCategoryLoadError] = useState<string>("");
  const [tagLoadError, setTagLoadError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      setCategoryLoadError("");
      setTagLoadError("");
      setErrorMessage("");
      setFieldErrors({});

      if (!knowledgeId) {
        setStatus("notFound");
        return;
      }

      const loadedItem = await getKnowledgeItemById(knowledgeId);

      if (!isMounted) {
        return;
      }

      if (!loadedItem) {
        setStatus("notFound");
        return;
      }

      setForm(createFormStateFromItem(loadedItem));

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

      if (isMounted) {
        setStatus("ready");
      }
    }

    loadPageData().catch((error: unknown) => {
      console.error(error);

      if (isMounted) {
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [knowledgeId]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));

    if (status === "error") {
      setStatus("ready");
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

  async function handleSubmit() {
    if (status === "saving") {
      return;
    }

    if (!knowledgeId) {
      setStatus("notFound");
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
      setStatus("ready");
      setErrorMessage("");
      return;
    }

    setStatus("saving");
    setErrorMessage("");
    setFieldErrors({});

    try {
      await updateKnowledgeItem(knowledgeId, validationResult.data);
      navigate(`/knowledge/${knowledgeId}`);
    } catch (error: unknown) {
      console.error(error);
      setStatus("ready");
      setErrorMessage(getErrorMessage(error));
    }
  }

  if (status === "loading") {
    return (
      <div>
        <div className="mb-6">
          <Link
            to="/knowledge"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            ナレッジ一覧へ戻る
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          編集対象のナレッジを読み込んでいます...
        </div>
      </div>
    );
  }

  if (status === "notFound") {
    return (
      <div>
        <div className="mb-6">
          <Link
            to="/knowledge"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            ナレッジ一覧へ戻る
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold text-slate-900">
            編集対象のナレッジが見つかりません。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            削除済み、または存在しないナレッジIDの可能性があります。
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <div className="mb-6">
          <Link
            to="/knowledge"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            ナレッジ一覧へ戻る
          </Link>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">編集画面の読み込みに失敗しました。</p>
          <p className="mt-2 break-all">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            to={knowledgeId ? `/knowledge/${knowledgeId}` : "/knowledge"}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            詳細へ戻る
          </Link>

          <h1 className="text-2xl font-bold text-slate-900">ナレッジ編集</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            登録済みナレッジの内容を更新します。
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
            <p className="font-semibold">編集時の注意</p>
            <p className="mt-1">
              顧客の氏名・連絡先・購入履歴・社外秘情報・非公開の商品情報は入力しないでください。
              既存本文にそのような情報が含まれていないかも確認してください。
            </p>
          </div>
        </div>
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

      {errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">ナレッジの更新に失敗しました。</p>
          <p className="mt-1 break-all">{errorMessage}</p>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-5">
          <div>
            <label
              htmlFor="knowledge-edit-title"
              className="text-sm font-semibold text-slate-900"
            >
              タイトル <span className="text-red-600">*</span>
            </label>
            <input
              id="knowledge-edit-title"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              maxLength={120}
              aria-invalid={fieldErrors.title ? "true" : "false"}
              aria-describedby={
                fieldErrors.title
                  ? "knowledge-edit-title-error"
                  : "knowledge-edit-title-help"
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            {fieldErrors.title ? (
              <p
                id="knowledge-edit-title-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.title}
              </p>
            ) : (
              <p
                id="knowledge-edit-title-help"
                className="mt-1 text-xs text-slate-500"
              >
                120文字以内。個人名や社外秘資料名は含めないでください。
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="knowledge-edit-content"
              className="text-sm font-semibold text-slate-900"
            >
              本文 <span className="text-red-600">*</span>
            </label>
            <textarea
              id="knowledge-edit-content"
              value={form.content}
              onChange={(event) => updateForm("content", event.target.value)}
              maxLength={8000}
              rows={10}
              aria-invalid={fieldErrors.content ? "true" : "false"}
              aria-describedby={
                fieldErrors.content
                  ? "knowledge-edit-content-error"
                  : "knowledge-edit-content-help"
              }
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            {fieldErrors.content ? (
              <p
                id="knowledge-edit-content-error"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {fieldErrors.content}
              </p>
            ) : (
              <p
                id="knowledge-edit-content-help"
                className="mt-1 text-xs text-slate-500"
              >
                8000文字以内。匿名化・一般化した業務ナレッジとして記録します。
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="knowledge-edit-type"
                className="text-sm font-semibold text-slate-900"
              >
                種別
              </label>
              <select
                id="knowledge-edit-type"
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
                htmlFor="knowledge-edit-category"
                className="text-sm font-semibold text-slate-900"
              >
                分類
              </label>
              <select
                id="knowledge-edit-category"
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
                htmlFor="knowledge-edit-source"
                className="text-sm font-semibold text-slate-900"
              >
                source
              </label>
              <select
                id="knowledge-edit-source"
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
              既存共通タグから選択します。共通タグの追加・編集・削除はStep
              5で実装します。
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
            to={knowledgeId ? `/knowledge/${knowledgeId}` : "/knowledge"}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            キャンセル
          </Link>

          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "saving" ? "保存中..." : "更新する"}
          </button>
        </div>
      </form>
    </div>
  );
}
