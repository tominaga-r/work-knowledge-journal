import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { todayDateString } from "../../lib/utils/date";
import { getErrorMessage } from "../../lib/utils/error";
import { CategoryRecord, listCategories } from "../taxonomy/categoryRepository";
import { TagRecord, listTags } from "../taxonomy/tagRepository";
import { inquirySourceLabels } from "./inquiryLabels";
import { createInquiryNote } from "./inquiryRepository";
import {
  CreateInquiryInput,
  InquirySource,
  createInquirySchema,
  inquirySourceValues,
} from "./inquirySchema";

type FormState = {
  title: string;
  content: string;
  responseNote: string;
  nextAction: string;
  occurredOn: string;
  inquiryCategoryId: string;
  source: InquirySource;
  isFavorite: boolean;
  tagIds: string[];
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  title: "",
  content: "",
  responseNote: "",
  nextAction: "",
  occurredOn: todayDateString(),
  inquiryCategoryId: "",
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
      fieldName === "responseNote" ||
      fieldName === "nextAction" ||
      fieldName === "occurredOn" ||
      fieldName === "inquiryCategoryId" ||
      fieldName === "source" ||
      fieldName === "isFavorite" ||
      fieldName === "tagIds"
    ) {
      errors[fieldName] = issue.message;
    }
  }

  return errors;
}

export function InquiryCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [categoryLoadError, setCategoryLoadError] = useState("");
  const [tagLoadError, setTagLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFormOptions() {
      try {
        const loadedCategories = await listCategories("inquiry");

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

  async function handleSubmit() {
    if (status === "saving") {
      return;
    }

    const rawInput: CreateInquiryInput = {
      title: form.title,
      content: form.content,
      responseNote: form.responseNote,
      nextAction: form.nextAction,
      occurredOn: form.occurredOn || undefined,
      inquiryCategoryId: form.inquiryCategoryId || null,
      source: form.source,
      isFavorite: form.isFavorite,
      tagIds: form.tagIds,
    };

    const validationResult = createInquirySchema.safeParse(rawInput);

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
      await createInquiryNote(validationResult.data);
      navigate("/inquiries");
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
            問い合わせメモ新規作成
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            問い合わせ内容、対応メモ、次に活かすことを記録します。
          </p>
        </div>

        <Link
          to="/inquiries"
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
              顧客の氏名・連絡先・注文番号・購入履歴・具体的な問い合わせ者情報は入力しないでください。
              問い合わせ内容は匿名化し、業務改善や対応品質向上に使える形で一般化して記録します。
            </p>
          </div>
        </div>
      </div>

      {categoryLoadError && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">問い合わせ分類の読み込みに失敗しました。</p>
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
          <p className="font-semibold">問い合わせメモの保存に失敗しました。</p>
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
              htmlFor="inquiry-title"
              className="text-sm font-semibold text-slate-900"
            >
              タイトル <span className="text-red-600">*</span>
            </label>
            <input
              id="inquiry-title"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              maxLength={120}
              aria-invalid={fieldErrors.title ? "true" : "false"}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="例: 商品仕様の確認が多かった問い合わせ"
            />
            {fieldErrors.title ? (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors.title}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                120文字以内。顧客名や注文番号は含めないでください。
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="inquiry-content"
              className="text-sm font-semibold text-slate-900"
            >
              問い合わせ概要 <span className="text-red-600">*</span>
            </label>
            <textarea
              id="inquiry-content"
              value={form.content}
              onChange={(event) => updateForm("content", event.target.value)}
              maxLength={8000}
              rows={7}
              aria-invalid={fieldErrors.content ? "true" : "false"}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="例: 利用場面に応じた商品の違いについて確認があった。"
            />
            {fieldErrors.content ? (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors.content}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                8000文字以内。具体的な個人情報は除いて記録します。
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="inquiry-response-note"
              className="text-sm font-semibold text-slate-900"
            >
              対応メモ
            </label>
            <textarea
              id="inquiry-response-note"
              value={form.responseNote}
              onChange={(event) =>
                updateForm("responseNote", event.target.value)
              }
              maxLength={8000}
              rows={5}
              aria-invalid={fieldErrors.responseNote ? "true" : "false"}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="例: 仕様差分を比較して説明した。"
            />
            {fieldErrors.responseNote && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors.responseNote}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="inquiry-next-action"
              className="text-sm font-semibold text-slate-900"
            >
              次に活かすこと
            </label>
            <textarea
              id="inquiry-next-action"
              value={form.nextAction}
              onChange={(event) => updateForm("nextAction", event.target.value)}
              maxLength={4000}
              rows={4}
              aria-invalid={fieldErrors.nextAction ? "true" : "false"}
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="例: よくある比較ポイントをナレッジ化する。"
            />
            {fieldErrors.nextAction && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors.nextAction}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="inquiry-occurred-on"
                className="text-sm font-semibold text-slate-900"
              >
                発生日
              </label>
              <input
                id="inquiry-occurred-on"
                type="date"
                value={form.occurredOn}
                onChange={(event) =>
                  updateForm("occurredOn", event.target.value)
                }
                aria-invalid={fieldErrors.occurredOn ? "true" : "false"}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              {fieldErrors.occurredOn && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.occurredOn}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="inquiry-category"
                className="text-sm font-semibold text-slate-900"
              >
                問い合わせ分類
              </label>
              <select
                id="inquiry-category"
                value={form.inquiryCategoryId}
                onChange={(event) =>
                  updateForm("inquiryCategoryId", event.target.value)
                }
                aria-invalid={fieldErrors.inquiryCategoryId ? "true" : "false"}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">未設定</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.inquiryCategoryId && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.inquiryCategoryId}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="inquiry-source"
                className="text-sm font-semibold text-slate-900"
              >
                source
              </label>
              <select
                id="inquiry-source"
                value={form.source}
                onChange={(event) =>
                  updateForm("source", event.target.value as InquirySource)
                }
                aria-invalid={fieldErrors.source ? "true" : "false"}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {inquirySourceValues.map((source) => (
                  <option key={source} value={source}>
                    {inquirySourceLabels[source]}
                  </option>
                ))}
              </select>
              {fieldErrors.source ? (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.source}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  具体的な社内資料名や顧客名ではなく、抽象的な由来を選びます。
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">共通タグ</p>
            <p className="mt-1 text-xs text-slate-500">
              ナレッジと共通で使う分類です。関連ナレッジ候補や横断検索に利用します。
            </p>

            {tags.length === 0 ? (
              <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                登録済みの共通タグがありません。
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
            to="/inquiries"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            キャンセル
          </Link>

          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "saving" ? "保存中..." : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}