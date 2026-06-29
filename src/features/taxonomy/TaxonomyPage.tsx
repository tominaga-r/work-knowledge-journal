import { useEffect, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import {
  CategoryRecord,
  createCategory,
  listCategories,
} from "./categoryRepository";
import { TagRecord, createTag, listTags } from "./tagRepository";
import {
  CategoryKind,
  createCategorySchema,
  createTagSchema,
} from "./taxonomySchema";
import { getErrorMessage } from "../../lib/utils/error";

type CategoryFormState = {
  knowledgeCategoryName: string;
  inquiryCategoryName: string;
};

type TagFormState = {
  tagName: string;
};

type FieldErrors = {
  knowledgeCategoryName?: string;
  inquiryCategoryName?: string;
  tagName?: string;
};

const initialCategoryForm: CategoryFormState = {
  knowledgeCategoryName: "",
  inquiryCategoryName: "",
};

const initialTagForm: TagFormState = {
  tagName: "",
};

function getCategoryFieldName(kind: CategoryKind) {
  return kind === "knowledge" ? "knowledgeCategoryName" : "inquiryCategoryName";
}

export function TaxonomyPage() {
  const [knowledgeCategories, setKnowledgeCategories] = useState<
    CategoryRecord[]
  >([]);
  const [inquiryCategories, setInquiryCategories] = useState<CategoryRecord[]>(
    [],
  );
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(initialCategoryForm);
  const [tagForm, setTagForm] = useState<TagFormState>(initialTagForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<
    "loading" | "ready" | "saving" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTaxonomy() {
    const [loadedKnowledgeCategories, loadedInquiryCategories, loadedTags] =
      await Promise.all([
        listCategories("knowledge"),
        listCategories("inquiry"),
        listTags(),
      ]);

    setKnowledgeCategories(loadedKnowledgeCategories);
    setInquiryCategories(loadedInquiryCategories);
    setTags(loadedTags);
  }

  useEffect(() => {
    let isMounted = true;

    async function initializePage() {
      try {
        const [loadedKnowledgeCategories, loadedInquiryCategories, loadedTags] =
          await Promise.all([
            listCategories("knowledge"),
            listCategories("inquiry"),
            listTags(),
          ]);

        if (!isMounted) {
          return;
        }

        setKnowledgeCategories(loadedKnowledgeCategories);
        setInquiryCategories(loadedInquiryCategories);
        setTags(loadedTags);
        setStatus("ready");
      } catch (error: unknown) {
        console.error(error);

        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setStatus("error");
        }
      }
    }

    void initializePage();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateCategoryForm<K extends keyof CategoryFormState>(
    key: K,
    value: CategoryFormState[K],
  ) {
    setCategoryForm((current) => ({
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

  function updateTagForm<K extends keyof TagFormState>(
    key: K,
    value: TagFormState[K],
  ) {
    setTagForm((current) => ({
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

  async function handleCreateCategory(kind: CategoryKind) {
    if (status === "saving") {
      return;
    }

    const fieldName = getCategoryFieldName(kind);
    const name = categoryForm[fieldName];

    const validationResult = createCategorySchema.safeParse({
      kind,
      name,
    });

    if (!validationResult.success) {
      setFieldErrors((current) => ({
        ...current,
        [fieldName]:
          validationResult.error.issues[0]?.message ??
          "カテゴリ名を確認してください。",
      }));
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      await createCategory(
        validationResult.data.kind,
        validationResult.data.name,
      );
      await loadTaxonomy();

      setCategoryForm((current) => ({
        ...current,
        [fieldName]: "",
      }));
      setStatus("ready");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
      setStatus("error");
    }
  }

  async function handleCreateTag() {
    if (status === "saving") {
      return;
    }

    const validationResult = createTagSchema.safeParse({
      name: tagForm.tagName,
    });

    if (!validationResult.success) {
      setFieldErrors((current) => ({
        ...current,
        tagName:
          validationResult.error.issues[0]?.message ??
          "タグ名を確認してください。",
      }));
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      await createTag(validationResult.data.name);
      await loadTaxonomy();

      setTagForm(initialTagForm);
      setStatus("ready");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div>
        <PageTitle />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          タグ・カテゴリを読み込んでいます...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle />

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-semibold">登録時の注意</p>
            <p className="mt-1">
              カテゴリ名・タグ名には、顧客名、社外秘資料名、非公開の商品名などを含めないでください。
              検索・分類しやすい一般化された名称にします。
            </p>
          </div>
        </div>
      </div>

      {status === "error" && errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">タグ・カテゴリの処理に失敗しました。</p>
          <p className="mt-1 break-all">{errorMessage}</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <TaxonomyCard
          title="ナレッジ用カテゴリ"
          description="商品知識、業務手順、接客フレーズなどの分類に使います。"
          inputId="knowledge-category-name"
          inputValue={categoryForm.knowledgeCategoryName}
          inputPlaceholder="例: 接客・販売"
          errorMessage={fieldErrors.knowledgeCategoryName}
          isSaving={status === "saving"}
          onChange={(value) =>
            updateCategoryForm("knowledgeCategoryName", value)
          }
          onSubmit={() => {
            void handleCreateCategory("knowledge");
          }}
          emptyMessage="ナレッジ用カテゴリがありません。"
          items={knowledgeCategories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        />

        <TaxonomyCard
          title="問い合わせ用カテゴリ"
          description="問い合わせメモの分類に使います。"
          inputId="inquiry-category-name"
          inputValue={categoryForm.inquiryCategoryName}
          inputPlaceholder="例: 問い合わせ対応"
          errorMessage={fieldErrors.inquiryCategoryName}
          isSaving={status === "saving"}
          onChange={(value) => updateCategoryForm("inquiryCategoryName", value)}
          onSubmit={() => {
            void handleCreateCategory("inquiry");
          }}
          emptyMessage="問い合わせ用カテゴリがありません。"
          items={inquiryCategories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        />

        <TaxonomyCard
          title="タグ"
          description="ナレッジと問い合わせメモの横断的な分類に使います。"
          inputId="tag-name"
          inputValue={tagForm.tagName}
          inputPlaceholder="例: 確認事項"
          errorMessage={fieldErrors.tagName}
          isSaving={status === "saving"}
          onChange={(value) => updateTagForm("tagName", value)}
          onSubmit={() => {
            void handleCreateTag();
          }}
          emptyMessage="タグがありません。"
          items={tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
          }))}
          itemPrefix="#"
        />
      </div>
    </div>
  );
}

function PageTitle() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">タグ・カテゴリ</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        ナレッジ用カテゴリ、問い合わせ用カテゴリ、共通タグを管理します。
      </p>
    </div>
  );
}

function TaxonomyCard({
  title,
  description,
  inputId,
  inputValue,
  inputPlaceholder,
  errorMessage,
  isSaving,
  onChange,
  onSubmit,
  emptyMessage,
  items,
  itemPrefix = "",
}: {
  title: string;
  description: string;
  inputId: string;
  inputValue: string;
  inputPlaceholder: string;
  errorMessage?: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  emptyMessage: string;
  items: Array<{ id: string; name: string }>;
  itemPrefix?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-5"
      >
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-slate-900"
        >
          新規追加
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id={inputId}
            value={inputValue}
            onChange={(event) => onChange(event.target.value)}
            maxLength={40}
            aria-invalid={errorMessage ? "true" : "false"}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder={inputPlaceholder}
          />
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            追加
          </button>
        </div>
        {errorMessage && (
          <p className="mt-1 text-xs font-medium text-red-600">
            {errorMessage}
          </p>
        )}
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-900">
          登録済み: {items.length}件
        </p>

        {items.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {items.map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                {itemPrefix}
                {item.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
