import { useEffect, useState } from "react";
import { BookOpen, MessageSquareText, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { createExcerpt } from "../../lib/utils/text";
import { formatDateTime } from "../../lib/utils/format";
import { getErrorMessage } from "../../lib/utils/error";
import {
  knowledgeSourceLabels,
  knowledgeTypeLabels,
} from "../knowledge/knowledgeLabels";
import {
  KnowledgeListItem,
  searchKnowledgeItems,
  updateKnowledgeFavorite,
} from "../knowledge/knowledgeRepository";
import { inquirySourceLabels } from "../inquiry/inquiryLabels";
import {
  InquiryListItem,
  searchInquiryNotes,
  updateInquiryFavorite,
} from "../inquiry/inquiryRepository";

type FavoriteStatus = "loading" | "ready" | "error";

function splitNames(names: string | null): string[] {
  if (!names) {
    return [];
  }

  return names
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function FavoritesPage() {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeListItem[]>([]);
  const [inquiryNotes, setInquiryNotes] = useState<InquiryListItem[]>([]);
  const [status, setStatus] = useState<FavoriteStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [favoriteErrorMessage, setFavoriteErrorMessage] = useState("");
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState<Set<string>>(
    () => new Set(),
  );

  async function loadFavorites() {
    const [loadedKnowledgeItems, loadedInquiryNotes] = await Promise.all([
      searchKnowledgeItems({ isFavorite: true }),
      searchInquiryNotes({ isFavorite: true }),
    ]);

    setKnowledgeItems(loadedKnowledgeItems);
    setInquiryNotes(loadedInquiryNotes);
  }

  useEffect(() => {
    let isMounted = true;

    async function initializeFavorites() {
      setStatus("loading");
      setErrorMessage("");

      const [loadedKnowledgeItems, loadedInquiryNotes] = await Promise.all([
        searchKnowledgeItems({ isFavorite: true }),
        searchInquiryNotes({ isFavorite: true }),
      ]);

      if (!isMounted) {
        return;
      }

      setKnowledgeItems(loadedKnowledgeItems);
      setInquiryNotes(loadedInquiryNotes);
      setStatus("ready");
    }

    initializeFavorites().catch((error: unknown) => {
      console.error(error);

      if (isMounted) {
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function handleRemoveKnowledgeFavorite(item: KnowledgeListItem) {
    setFavoriteErrorMessage("");
    setFavoriteUpdating(item.id, true);

    try {
      await updateKnowledgeFavorite(item.id, false);
      await loadFavorites();
    } catch (error: unknown) {
      console.error(error);
      setFavoriteErrorMessage(getErrorMessage(error));
    } finally {
      setFavoriteUpdating(item.id, false);
    }
  }

  async function handleRemoveInquiryFavorite(item: InquiryListItem) {
    setFavoriteErrorMessage("");
    setFavoriteUpdating(item.id, true);

    try {
      await updateInquiryFavorite(item.id, false);
      await loadFavorites();
    } catch (error: unknown) {
      console.error(error);
      setFavoriteErrorMessage(getErrorMessage(error));
    } finally {
      setFavoriteUpdating(item.id, false);
    }
  }

  const hasFavorites = knowledgeItems.length > 0 || inquiryNotes.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">お気に入り</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          よく使うナレッジと問い合わせメモをまとめて確認できます。
        </p>
      </div>

      {favoriteErrorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">お気に入りの更新に失敗しました。</p>
          <p className="mt-1 break-all">{favoriteErrorMessage}</p>
        </div>
      )}

      {status === "loading" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          お気に入りを読み込んでいます...
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">お気に入りの読み込みに失敗しました。</p>
          <p className="mt-2 break-all">{errorMessage}</p>
        </div>
      )}

      {status === "ready" && !hasFavorites && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            お気に入りはまだありません。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            ナレッジ一覧や問い合わせメモ一覧で「お気に入りに追加」を押すと、ここに表示されます。
          </p>
        </div>
      )}

      {status === "ready" && hasFavorites && (
        <div className="space-y-6">
          <FavoriteKnowledgeSection
            items={knowledgeItems}
            updatingFavoriteIds={updatingFavoriteIds}
            onRemoveFavorite={(item) =>
              void handleRemoveKnowledgeFavorite(item)
            }
          />

          <FavoriteInquirySection
            items={inquiryNotes}
            updatingFavoriteIds={updatingFavoriteIds}
            onRemoveFavorite={(item) => void handleRemoveInquiryFavorite(item)}
          />
        </div>
      )}
    </div>
  );
}

function FavoriteKnowledgeSection({
  items,
  updatingFavoriteIds,
  onRemoveFavorite,
}: {
  items: KnowledgeListItem[];
  updatingFavoriteIds: Set<string>;
  onRemoveFavorite: (item: KnowledgeListItem) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <BookOpen size={20} />
            お気に入りナレッジ
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            お気に入りに追加したナレッジを表示します。
          </p>
        </div>
        <Link
          to="/knowledge"
          className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
        >
          ナレッジ一覧へ
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState message="お気に入りナレッジはありません。" />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const tagNames = splitNames(item.tag_names);

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/knowledge/${item.id}`}
                        className="wrap-break-word text-lg font-bold text-slate-900 transition hover:text-slate-600"
                      >
                        {item.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemoveFavorite(item)}
                        disabled={updatingFavoriteIds.has(item.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="お気に入りを解除"
                      >
                        <Star size={14} fill="currentColor" />
                        お気に入り解除
                      </button>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {createExcerpt(item.content)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                    ナレッジ種類: {knowledgeTypeLabels[item.type]}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                    ナレッジ分類: {item.category_name ?? "未設定"}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
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

                <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 md:grid-cols-2">
                  <p>作成日時: {formatDateTime(item.created_at)}</p>
                  <p>更新日時: {formatDateTime(item.updated_at)}</p>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <Link
                    to={`/knowledge/${item.id}`}
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
    </section>
  );
}

function FavoriteInquirySection({
  items,
  updatingFavoriteIds,
  onRemoveFavorite,
}: {
  items: InquiryListItem[];
  updatingFavoriteIds: Set<string>;
  onRemoveFavorite: (item: InquiryListItem) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <MessageSquareText size={20} />
            お気に入り問い合わせメモ
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            お気に入りに追加した問い合わせメモを表示します。
          </p>
        </div>
        <Link
          to="/inquiries"
          className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
        >
          問い合わせメモ一覧へ
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState message="お気に入り問い合わせメモはありません。" />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const tagNames = splitNames(item.tag_names);

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/inquiries/${item.id}`}
                        className="wrap-break-word text-lg font-bold text-slate-900 transition hover:text-slate-600"
                      >
                        {item.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemoveFavorite(item)}
                        disabled={updatingFavoriteIds.has(item.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="お気に入りを解除"
                      >
                        <Star size={13} fill="currentColor" />
                        お気に入り解除
                      </button>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {createExcerpt(item.content, 160)}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    発生日: {item.occurred_on}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <InfoRow
                    label="問い合わせ分類"
                    value={item.category_name ?? "未設定"}
                  />
                  <InfoRow
                    label="情報元"
                    value={inquirySourceLabels[item.source]}
                  />
                  <InfoRow
                    label="対応メモ"
                    value={item.response_note.trim() ? "あり" : "未記入"}
                  />
                  <InfoRow
                    label="次に活かすこと"
                    value={item.next_action.trim() ? "あり" : "未記入"}
                  />
                </div>

                <div className="mt-4">
                  {tagNames.length === 0 ? (
                    <p className="text-xs text-slate-500">共通タグ未設定</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tagNames.map((tagName) => (
                        <span
                          key={`${item.id}-${tagName}`}
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                        >
                          #{tagName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                  <p>
                    作成: {formatDateTime(item.created_at)} / 更新:{" "}
                    {formatDateTime(item.updated_at)}
                  </p>
                  <Link
                    to={`/inquiries/${item.id}`}
                    className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
                  >
                    詳細を見る
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}
