import { useEffect, useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  CategoryRecord,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "./categoryRepository";
import {
  TagRecord,
  createTag,
  deleteTag,
  listTags,
  updateTag,
} from "./tagRepository";
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
  editName?: string;
};

type EditableItemKind = CategoryKind | "tag";

type EditingItem = {
  kind: EditableItemKind;
  id: string;
  name: string;
};

type DeletingItem = {
  kind: EditableItemKind;
  id: string;
  name: string;
};

type DisplayItem = {
  id: string;
  name: string;
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

function getItemKindLabel(kind: EditableItemKind): string {
  if (kind === "knowledge") {
    return "ナレッジ分類";
  }

  if (kind === "inquiry") {
    return "問い合わせ分類";
  }

  return "共通共通タグ";
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
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingItem, setDeletingItem] = useState<DeletingItem | null>(null);

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

  function startEdit(item: EditingItem) {
    setEditingItem(item);
    setEditName(item.name);
    setFieldErrors((current) => ({
      ...current,
      editName: undefined,
    }));
    setErrorMessage("");

    if (status === "error") {
      setStatus("ready");
    }
  }

  function cancelEdit() {
    setEditingItem(null);
    setEditName("");
    setFieldErrors((current) => ({
      ...current,
      editName: undefined,
    }));
  }

  function startDelete(item: DeletingItem) {
    setDeletingItem(item);
    setErrorMessage("");

    if (status === "error") {
      setStatus("ready");
    }
  }

  function cancelDelete() {
    setDeletingItem(null);
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
          "分類名を確認してください。",
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
          "共通タグ名を確認してください。",
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

  async function handleUpdateItem() {
    if (!editingItem || status === "saving") {
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      if (editingItem.kind === "tag") {
        const validationResult = createTagSchema.safeParse({
          name: editName,
        });

        if (!validationResult.success) {
          setFieldErrors((current) => ({
            ...current,
            editName:
              validationResult.error.issues[0]?.message ??
              "名称を確認してください。",
          }));
          setStatus("ready");
          return;
        }

        await updateTag(editingItem.id, validationResult.data.name);
      } else {
        const validationResult = createCategorySchema.safeParse({
          kind: editingItem.kind,
          name: editName,
        });

        if (!validationResult.success) {
          setFieldErrors((current) => ({
            ...current,
            editName:
              validationResult.error.issues[0]?.message ??
              "名称を確認してください。",
          }));
          setStatus("ready");
          return;
        }

        await updateCategory(
          validationResult.data.kind,
          editingItem.id,
          validationResult.data.name,
        );
      }

      await loadTaxonomy();
      setEditingItem(null);
      setEditName("");
      setStatus("ready");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
      setStatus("error");
    }
  }

  async function handleDeleteItem() {
    if (!deletingItem || status === "saving") {
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      if (deletingItem.kind === "tag") {
        await deleteTag(deletingItem.id);
      } else {
        await deleteCategory(deletingItem.kind, deletingItem.id);
      }

      await loadTaxonomy();
      setDeletingItem(null);
      setStatus("ready");
    } catch (error: unknown) {
      console.error(error);
      setDeletingItem(null);
      setErrorMessage(getErrorMessage(error));
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div>
        <PageTitle />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          分類管理を読み込んでいます...
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
            <p className="font-semibold">登録・編集時の注意</p>
            <p className="mt-1">
              分類名・共通タグ名には、顧客名、社外秘資料名、非公開の商品名などを含めないでください。
              検索・分類しやすい一般化された名称にします。
            </p>
          </div>
        </div>
      </div>

      {status === "error" && errorMessage && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">分類管理の処理に失敗しました。</p>
          <p className="mt-1 break-all">{errorMessage}</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <TaxonomyCard
          title="ナレッジ分類"
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
          emptyMessage="ナレッジ分類がありません。"
          items={knowledgeCategories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          onEdit={(item) =>
            startEdit({
              kind: "knowledge",
              id: item.id,
              name: item.name,
            })
          }
          onDelete={(item) =>
            startDelete({
              kind: "knowledge",
              id: item.id,
              name: item.name,
            })
          }
        />

        <TaxonomyCard
          title="問い合わせ分類"
          description="問い合わせ内容や対応種別など、問い合わせメモの大分類に使います。"
          inputId="inquiry-category-name"
          inputValue={categoryForm.inquiryCategoryName}
          inputPlaceholder="例: 問い合わせ対応"
          errorMessage={fieldErrors.inquiryCategoryName}
          isSaving={status === "saving"}
          onChange={(value) => updateCategoryForm("inquiryCategoryName", value)}
          onSubmit={() => {
            void handleCreateCategory("inquiry");
          }}
          emptyMessage="問い合わせ分類がありません。"
          items={inquiryCategories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          onEdit={(item) =>
            startEdit({
              kind: "inquiry",
              id: item.id,
              name: item.name,
            })
          }
          onDelete={(item) =>
            startDelete({
              kind: "inquiry",
              id: item.id,
              name: item.name,
            })
          }
        />

        <TaxonomyCard
          title="共通タグ"
          description="ナレッジと問い合わせメモを横断して整理・関連付けるために使います。"
          inputId="tag-name"
          inputValue={tagForm.tagName}
          inputPlaceholder="例: 確認事項"
          errorMessage={fieldErrors.tagName}
          isSaving={status === "saving"}
          onChange={(value) => updateTagForm("tagName", value)}
          onSubmit={() => {
            void handleCreateTag();
          }}
          emptyMessage="共通タグがありません。"
          items={tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
          }))}
          itemPrefix="#"
          onEdit={(item) =>
            startEdit({
              kind: "tag",
              id: item.id,
              name: item.name,
            })
          }
          onDelete={(item) =>
            startDelete({
              kind: "tag",
              id: item.id,
              name: item.name,
            })
          }
        />
      </div>

      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-taxonomy-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="edit-taxonomy-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {getItemKindLabel(editingItem.kind)}を編集
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  分類名を変更します。既存データとの紐付けは維持されます。
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={status === "saving"}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="編集ダイアログを閉じる"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5">
              <label
                htmlFor="edit-taxonomy-name"
                className="text-sm font-semibold text-slate-900"
              >
                名称
              </label>
              <input
                id="edit-taxonomy-name"
                value={editName}
                onChange={(event) => {
                  setEditName(event.target.value);
                  setFieldErrors((current) => ({
                    ...current,
                    editName: undefined,
                  }));
                }}
                maxLength={40}
                aria-invalid={fieldErrors.editName ? "true" : "false"}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              {fieldErrors.editName && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.editName}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={status === "saving"}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleUpdateItem();
                }}
                disabled={status === "saving"}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "saving" ? "更新中..." : "更新する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-taxonomy-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="delete-taxonomy-title"
              className="text-lg font-bold text-slate-900"
            >
              {getItemKindLabel(deletingItem.kind)}を削除
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              以下の分類を削除します。使用中の場合は削除できません。
            </p>

            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold">削除対象</p>
              <p className="mt-1 wrap-break-word">
                {deletingItem.kind === "tag" ? "#" : ""}
                {deletingItem.name}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={status === "saving"}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteItem();
                }}
                disabled={status === "saving"}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "saving" ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageTitle() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">分類管理</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        ナレッジ分類、問い合わせ分類、共通共通タグを管理します。
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
  onEdit,
  onDelete,
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
  items: DisplayItem[];
  itemPrefix?: string;
  onEdit: (item: DisplayItem) => void;
  onDelete: (item: DisplayItem) => void;
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
          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="min-w-0 wrap-break-word text-sm font-semibold text-slate-700">
                  {itemPrefix}
                  {item.name}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    disabled={isSaving}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`${item.name}を編集`}
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    disabled={isSaving}
                    className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`${item.name}を削除`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
