import { useEffect, useRef, useState } from "react";
import { Search, Star, X } from "lucide-react";
import {
  KnowledgeListItem,
  SearchKnowledgeFilters,
  searchKnowledgeItems,
} from "./knowledgeRepository";
import { knowledgeSourceLabels, knowledgeTypeLabels } from "./knowledgeLabels";
import {
  KnowledgeSource,
  KnowledgeType,
  knowledgeSourceValues,
  knowledgeTypeValues,
} from "./knowledgeSchema";
import { createExcerpt } from "../../lib/utils/text";
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
};

const initialFilters: FilterState = {
  keyword: "",
  type: "",
  knowledgeCategoryId: "",
  tagId: "",
  source: "",
  isFavorite: false,
};

function splitTagNames(tagNames: string | null): string[] {
  if (!tagNames) {
    return [];
  }

  return tagNames
    .split(",")
    .map((tagName) => tagName.trim())
    .filter(Boolean);
}

function createSearchFilters(filters: FilterState): SearchKnowledgeFilters {
  return {
    keyword: filters.keyword,
    type: filters.type,
    knowledgeCategoryId: filters.knowledgeCategoryId,
    tagId: filters.tagId,
    source: filters.source,
    isFavorite: filters.isFavorite,
  };
}

function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.keyword.trim() !== "" ||
    filters.type !== "" ||
    filters.knowledgeCategoryId !== "" ||
    filters.tagId !== "" ||
    filters.source !== "" ||
    filters.isFavorite
  );
}

export function KnowledgeListPage() {
  const [items, setItems] = useState<KnowledgeListItem[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [optionErrorMessage, setOptionErrorMessage] = useState("");
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

  const activeFilters = hasActiveFilters(filters);

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

      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        ナレッジには、顧客の個人情報、社外秘情報、非公開の商品情報を入力しないでください。
        商品知識や対応フレーズは、匿名化・一般化した内容として記録します。
      </div>

      {optionErrorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            絞り込み条件の読み込みに失敗しました。
          </p>
          <p className="mt-1 break-all">{optionErrorMessage}</p>
        </div>
      )}

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <Search size={18} />
              検索・絞り込み
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              タイトル、本文、ナレッジ分類、共通タグを検索対象にします。
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!activeFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} />
            条件クリア
          </button>
        </div>

        <div className="grid gap-4">
          <div>
            <label
              htmlFor="knowledge-search-keyword"
              className="text-sm font-semibold text-slate-900"
            >
              キーワード
            </label>
            <input
              id="knowledge-search-keyword"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="タイトル、本文、分類名、タグ名で検索"
            />
          </div>

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
                  updateFilter("type", event.target.value as KnowledgeType | "")
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
                onChange={(event) => updateFilter("tagId", event.target.value)}
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
                source
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

            <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 md:mt-7">
              表示件数:{" "}
              <span className="font-bold text-slate-900">{items.length}</span>件
            </div>
          </div>
        </div>
      </section>

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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          {activeFilters
            ? "条件に一致するナレッジがありません。条件を変更してください。"
            : "まだナレッジが登録されていません。まずは業務手順や接客フレーズを登録します。"}
        </div>
      )}

      {status === "ready" && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => {
            const tagNames = splitTagNames(item.tag_names);

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

                      {item.is_favorite === 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">
                          <Star size={14} fill="currentColor" />
                          お気に入り
                        </span>
                      )}
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
                    source: {knowledgeSourceLabels[item.source]}
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
