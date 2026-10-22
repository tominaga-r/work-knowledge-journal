import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search, Star, X } from "lucide-react";
import {
  KnowledgeListItem,
  SearchKnowledgeFilters,
  searchKnowledgeItems,
  updateKnowledgeFavorite,
} from "./knowledgeRepository";
import { knowledgeSourceLabels, knowledgeTypeLabels } from "./knowledgeLabels";
import {
  KnowledgeSource,
  KnowledgeType,
  knowledgeSourceValues,
  knowledgeTypeValues,
} from "./knowledgeSchema";
import { createExcerpt, splitCommaSeparatedValues } from "../../lib/utils/text";
import { formatDateTime } from "../../lib/utils/format";
import { getErrorMessage } from "../../lib/utils/error";
import { Link } from "react-router-dom";
import {
  consumeScrollPosition,
  saveScrollPosition,
} from "../../lib/utils/scrollRestoration";
import { CategoryRecord, listCategories } from "../taxonomy/categoryRepository";
import { TagRecord, listTags } from "../taxonomy/tagRepository";

const KNOWLEDGE_LIST_SCROLL_KEY = "knowledge-list";

type FilterState = {
  keyword: string;
  type: KnowledgeType | "";
  knowledgeCategoryId: string;
  tagId: string;
  source: KnowledgeSource | "";
  isFavorite: boolean;
  targetMonth: string;
};

const initialFilters: FilterState = {
  keyword: "",
  type: "",
  knowledgeCategoryId: "",
  tagId: "",
  source: "",
  isFavorite: false,
  targetMonth: "",
};

function createSearchFilters(filters: FilterState): SearchKnowledgeFilters {
  return {
    keyword: filters.keyword,
    type: filters.type,
    knowledgeCategoryId: filters.knowledgeCategoryId,
    tagId: filters.tagId,
    source: filters.source,
    isFavorite: filters.isFavorite,
    targetMonth: filters.targetMonth,
  };
}

function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.keyword.trim() !== "" ||
    filters.type !== "" ||
    filters.knowledgeCategoryId !== "" ||
    filters.tagId !== "" ||
    filters.source !== "" ||
    filters.isFavorite ||
    filters.targetMonth !== ""
  );
}

export function KnowledgeListPage() {
  const [items, setItems] = useState<KnowledgeListItem[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [optionErrorMessage, setOptionErrorMessage] = useState("");
  const [favoriteErrorMessage, setFavoriteErrorMessage] = useState("");
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const hasRestoredScroll = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      try {
        const [loadedCategories, loadedTags] = await Promise.all([
          listCategories("knowledge"),
          listTags(),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(loadedCategories);
        setTags(loadedTags);
      } catch (error: unknown) {
        console.error(error);

        if (isMounted) {
          setOptionErrorMessage(getErrorMessage(error));
        }
      }
    }

    void loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledgeItems() {
      setStatus("loading");
      setErrorMessage("");

      const knowledgeItems = await searchKnowledgeItems(
        createSearchFilters(filters),
      );

      if (!isMounted) {
        return;
      }

      setItems(knowledgeItems);
      setStatus("ready");
    }

    loadKnowledgeItems().catch((error: unknown) => {
      console.error(error);

      if (isMounted) {
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [filters]);

  useEffect(() => {
    if (status !== "ready" || hasRestoredScroll.current) {
      return;
    }

    hasRestoredScroll.current = true;

    const restored = consumeScrollPosition(KNOWLEDGE_LIST_SCROLL_KEY);

    if (!restored) {
      window.scrollTo({
        top: 0,
        behavior: "auto",
      });
    }
  }, [status, items.length]);

  function updateFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(initialFilters);
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }

  function setFavoriteUpdating(id: string, isUpdating: boolean) {
    setUpdatingFavoriteIds((current) => {
      const next = new Set(current);

      if (isUpdating) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  async function reloadKnowledgeItems() {
    const knowledgeItems = await searchKnowledgeItems(
      createSearchFilters(filters),
    );
    setItems(knowledgeItems);
  }

  async function handleToggleFavorite(item: KnowledgeListItem) {
    const nextFavorite = item.is_favorite !== 1;

    setFavoriteErrorMessage("");
    setFavoriteUpdating(item.id, true);

    try {
      await updateKnowledgeFavorite(item.id, nextFavorite);
      await reloadKnowledgeItems();
    } catch (error: unknown) {
      console.error(error);
      setFavoriteErrorMessage(getErrorMessage(error));
    } finally {
      setFavoriteUpdating(item.id, false);
    }
  }

  const activeFilters = hasActiveFilters(filters);

  const activeDetailFilterLabels: string[] = [
    ...(filters.type ? [`種類: ${knowledgeTypeLabels[filters.type]}`] : []),
    ...(filters.knowledgeCategoryId
      ? [
          `分類: ${categories.find((category) => category.id === filters.knowledgeCategoryId)?.name ?? "指定あり"}`,
        ]
      : []),
    ...(filters.tagId
      ? [
          `タグ: #${tags.find((tag) => tag.id === filters.tagId)?.name ?? "指定あり"}`,
        ]
      : []),
    ...(filters.source
      ? [`情報元: ${knowledgeSourceLabels[filters.source]}`]
      : []),
    ...(filters.targetMonth ? [`作成月: ${filters.targetMonth}`] : []),
    ...(filters.isFavorite ? ["お気に入りのみ"] : []),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ナレッジ</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            商品知識、接客フレーズ、業務手順、FAQ、注意事項、改善メモを管理します。
          </p>
        </div>

        <Link
          to="/knowledge/new"
          className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          新規作成
        </Link>
      </div>

      {optionErrorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            絞り込み条件の読み込みに失敗しました。
          </p>
          <p className="mt-1 break-all">{optionErrorMessage}</p>
        </div>
      )}

      {favoriteErrorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">お気に入りの更新に失敗しました。</p>
          <p className="mt-1 break-all">{favoriteErrorMessage}</p>
        </div>
      )}

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label
            htmlFor="knowledge-search-keyword"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
          >
            <Search size={16} />
            キーワード検索
          </label>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!activeFilters}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={15} />
            条件クリア
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="knowledge-search-keyword"
            type="search"
            value={filters.keyword}
            onChange={(event) => updateFilter("keyword", event.target.value)}
            className="w-full min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="キーワードで検索..."
          />
          <button
            type="button"
            aria-expanded={isAdvancedSearchOpen}
            aria-controls="knowledge-advanced-search"
            onClick={() => setIsAdvancedSearchOpen((current) => !current)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            詳細検索
            {activeDetailFilterLabels.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs">
                {activeDetailFilterLabels.length}
              </span>
            )}
            {isAdvancedSearchOpen ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
        </div>

        {activeDetailFilterLabels.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">適用中:</span>
            {activeDetailFilterLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        <div
          id="knowledge-advanced-search"
          hidden={!isAdvancedSearchOpen}
          className="mt-4 border-t border-slate-200 pt-4"
        >
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="knowledge-type-filter"
                  className="text-sm font-semibold text-slate-900"
                >
                  ナレッジ種類
                </label>
                <select
                  id="knowledge-type-filter"
                  value={filters.type}
                  onChange={(event) =>
                    updateFilter(
                      "type",
                      event.target.value as KnowledgeType | "",
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">すべて</option>
                  {knowledgeTypeValues.map((type) => (
                    <option key={type} value={type}>
                      {knowledgeTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="knowledge-category-filter"
                  className="text-sm font-semibold text-slate-900"
                >
                  ナレッジ分類
                </label>
                <select
                  id="knowledge-category-filter"
                  value={filters.knowledgeCategoryId}
                  onChange={(event) =>
                    updateFilter("knowledgeCategoryId", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">すべて</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="knowledge-tag-filter"
                  className="text-sm font-semibold text-slate-900"
                >
                  共通タグ
                </label>
                <select
                  id="knowledge-tag-filter"
                  value={filters.tagId}
                  onChange={(event) =>
                    updateFilter("tagId", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">すべて</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      #{tag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label
                  htmlFor="knowledge-source-filter"
                  className="text-sm font-semibold text-slate-900"
                >
                  情報元
                </label>
                <select
                  id="knowledge-source-filter"
                  value={filters.source}
                  onChange={(event) =>
                    updateFilter(
                      "source",
                      event.target.value as KnowledgeSource | "",
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">すべて</option>
                  {knowledgeSourceValues.map((source) => (
                    <option key={source} value={source}>
                      {knowledgeSourceLabels[source]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="knowledge-month-filter"
                  className="text-sm font-semibold text-slate-900"
                >
                  作成月
                </label>
                <input
                  id="knowledge-month-filter"
                  type="month"
                  value={filters.targetMonth}
                  onChange={(event) =>
                    updateFilter("targetMonth", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <label className="mt-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 md:mt-7">
                <input
                  type="checkbox"
                  checked={filters.isFavorite}
                  onChange={(event) =>
                    updateFilter("isFavorite", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                お気に入りのみ
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">ナレッジ一覧</h2>
        {status === "ready" && (
          <p className="text-sm text-slate-500">表示件数: {items.length}件</p>
        )}
      </div>

      {status === "loading" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          ナレッジを読み込んでいます...
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">
            ナレッジ一覧の読み込みに失敗しました。
          </p>
          <p className="mt-2 break-all">{errorMessage}</p>
        </div>
      )}

      {status === "ready" && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
          <p className="text-sm font-semibold text-slate-900">
            {activeFilters
              ? "条件に一致するナレッジがありません。"
              : "ナレッジがまだありません。"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {activeFilters
              ? "条件を変更するか、条件クリアを押してください。"
              : "業務手順、接客フレーズ、FAQ、注意事項などを記録してみよう"}
          </p>
          {!activeFilters && (
            <Link
              to="/knowledge/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={16} />
              最初のナレッジを作成
            </Link>
          )}
        </div>
      )}

      {status === "ready" && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => {
            const tagNames = splitCommaSeparatedValues(item.tag_names);

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/knowledge/${item.id}`}
                        onClick={() => {
                          saveScrollPosition(KNOWLEDGE_LIST_SCROLL_KEY);
                        }}
                        className="wrap-break-word text-lg font-bold text-slate-900 transition hover:text-slate-600"
                      >
                        {item.title}
                      </Link>

                      <button
                        type="button"
                        onClick={() => void handleToggleFavorite(item)}
                        disabled={updatingFavoriteIds.has(item.id)}
                        className={
                          item.is_favorite === 1
                            ? "inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                            : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        }
                        aria-label={
                          item.is_favorite === 1
                            ? "お気に入りを解除"
                            : "お気に入りに追加"
                        }
                      >
                        <Star
                          size={14}
                          fill={
                            item.is_favorite === 1 ? "currentColor" : "none"
                          }
                        />
                        {item.is_favorite === 1
                          ? "お気に入り"
                          : "お気に入りに追加"}
                      </button>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {createExcerpt(item.content)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    ナレッジ種類: {knowledgeTypeLabels[item.type]}
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    ナレッジ分類: {item.category_name ?? "未設定"}
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    情報元: {knowledgeSourceLabels[item.source]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {tagNames.length > 0 ? (
                    tagNames.map((tagName) => (
                      <span
                        key={`${item.id}-${tagName}`}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        #{tagName}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      共通タグ未設定
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 md:grid-cols-2">
                  <p>作成日時: {formatDateTime(item.created_at)}</p>
                  <p>更新日時: {formatDateTime(item.updated_at)}</p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <Link
                    to={`/knowledge/${item.id}`}
                    onClick={() => {
                      saveScrollPosition(KNOWLEDGE_LIST_SCROLL_KEY);
                    }}
                    className="text-sm font-semibold text-slate-900 transition hover:text-slate-600"
                  >
                    詳細を見る
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
