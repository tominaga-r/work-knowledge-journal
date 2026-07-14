import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Link2, Search, Star, Trash2, Unlink } from "lucide-react";
import { createExcerpt } from "../../lib/utils/text";
import { formatDateTime } from "../../lib/utils/format";
import { getErrorMessage } from "../../lib/utils/error";
import {
  knowledgeSourceLabels,
  knowledgeTypeLabels,
} from "../knowledge/knowledgeLabels";
import {
  KnowledgeListItem,
  listKnowledgeItems,
} from "../knowledge/knowledgeRepository";
import { inquirySourceLabels } from "./inquiryLabels";
import {
  InquiryListItem,
  deleteInquiryNote,
  getInquiryNoteById,
} from "./inquiryRepository";
import {
  KeywordSuggestedKnowledgeItem,
  LinkedKnowledgeItem,
  SuggestedKnowledgeItem,
  linkKnowledgeToInquiry,
  listKeywordMatchedKnowledgeCandidates,
  listLinkedKnowledgeItems,
  listTagMatchedKnowledgeCandidates,
  unlinkKnowledgeFromInquiry,
} from "./inquiryKnowledgeLinkRepository";
import {
  restoreScrollPosition,
  saveScrollPosition,
} from "../../lib/utils/scrollRestoration";

function splitNames(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function createLinkedKnowledgePath(knowledgeId: string, inquiryId: string) {
  return `/knowledge/${knowledgeId}?fromInquiryId=${encodeURIComponent(
    inquiryId,
  )}`;
}

function createInquiryDetailScrollKey(inquiryId: string): string {
  return `inquiry-detail:${inquiryId}`;
}

export function InquiryDetailPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<InquiryListItem | null>(null);
  const [linkedKnowledgeItems, setLinkedKnowledgeItems] = useState<
    LinkedKnowledgeItem[]
  >([]);
  const [suggestedKnowledgeItems, setSuggestedKnowledgeItems] = useState<
    SuggestedKnowledgeItem[]
  >([]);
  const [keywordSuggestedKnowledgeItems, setKeywordSuggestedKnowledgeItems] =
    useState<KeywordSuggestedKnowledgeItem[]>([]);
  const [allKnowledgeItems, setAllKnowledgeItems] = useState<
    KnowledgeListItem[]
  >([]);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "notFound" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [linkStatus, setLinkStatus] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const [linkErrorMessage, setLinkErrorMessage] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "deleting" | "error"
  >("idle");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

  const linkableKnowledgeItems = useMemo(() => {
    const linkedIds = new Set(
      linkedKnowledgeItems.map((knowledge) => knowledge.id),
    );

    return allKnowledgeItems.filter(
      (knowledge) => !linkedIds.has(knowledge.id),
    );
  }, [allKnowledgeItems, linkedKnowledgeItems]);

  async function loadKnowledgeRelations(inquiryIdToLoad: string) {
    const [
      loadedLinkedKnowledgeItems,
      loadedSuggestedKnowledgeItems,
      loadedKeywordSuggestedKnowledgeItems,
      loadedAllKnowledgeItems,
    ] = await Promise.all([
      listLinkedKnowledgeItems(inquiryIdToLoad),
      listTagMatchedKnowledgeCandidates(inquiryIdToLoad),
      listKeywordMatchedKnowledgeCandidates(inquiryIdToLoad),
      listKnowledgeItems(),
    ]);

    setLinkedKnowledgeItems(loadedLinkedKnowledgeItems);
    setSuggestedKnowledgeItems(loadedSuggestedKnowledgeItems);
    setKeywordSuggestedKnowledgeItems(loadedKeywordSuggestedKnowledgeItems);
    setAllKnowledgeItems(loadedAllKnowledgeItems);

    const linkedIds = new Set(
      loadedLinkedKnowledgeItems.map((knowledge) => knowledge.id),
    );
    const firstLinkableKnowledge = loadedAllKnowledgeItems.find(
      (knowledge) => !linkedIds.has(knowledge.id),
    );

    setSelectedKnowledgeId(firstLinkableKnowledge?.id ?? "");
  }

  useEffect(() => {
    let isMounted = true;

    async function loadItem() {
      if (!inquiryId) {
        setStatus("notFound");
        return;
      }

      try {
        const loadedItem = await getInquiryNoteById(inquiryId);

        if (!isMounted) {
          return;
        }

        if (!loadedItem) {
          setStatus("notFound");
          return;
        }

        setItem(loadedItem);

        const [
          loadedLinkedKnowledgeItems,
          loadedSuggestedKnowledgeItems,
          loadedKeywordSuggestedKnowledgeItems,
          loadedAllKnowledgeItems,
        ] = await Promise.all([
          listLinkedKnowledgeItems(inquiryId),
          listTagMatchedKnowledgeCandidates(inquiryId),
          listKeywordMatchedKnowledgeCandidates(inquiryId),
          listKnowledgeItems(),
        ]);

        if (!isMounted) {
          return;
        }

        setLinkedKnowledgeItems(loadedLinkedKnowledgeItems);
        setSuggestedKnowledgeItems(loadedSuggestedKnowledgeItems);
        setKeywordSuggestedKnowledgeItems(loadedKeywordSuggestedKnowledgeItems);
        setAllKnowledgeItems(loadedAllKnowledgeItems);

        const linkedIds = new Set(
          loadedLinkedKnowledgeItems.map((knowledge) => knowledge.id),
        );
        const firstLinkableKnowledge = loadedAllKnowledgeItems.find(
          (knowledge) => !linkedIds.has(knowledge.id),
        );

        setSelectedKnowledgeId(firstLinkableKnowledge?.id ?? "");
        setStatus("ready");
      } catch (error: unknown) {
        console.error(error);

        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setStatus("error");
        }
      }
    }

    void loadItem();

    return () => {
      isMounted = false;
    };
  }, [inquiryId]);

  useEffect(() => {
    if (status !== "ready" || !item) {
      return;
    }

    restoreScrollPosition(createInquiryDetailScrollKey(item.id));
  }, [status, item?.id]);

  async function handleLinkKnowledge() {
    if (!item || !selectedKnowledgeId || linkStatus === "saving") {
      return;
    }

    await handleLinkSpecificKnowledge(selectedKnowledgeId);
  }

  async function handleLinkSpecificKnowledge(knowledgeId: string) {
    if (!item || !knowledgeId || linkStatus === "saving") {
      return;
    }

    setLinkStatus("saving");
    setLinkErrorMessage("");

    try {
      await linkKnowledgeToInquiry(item.id, knowledgeId);
      await loadKnowledgeRelations(item.id);
      setLinkStatus("idle");
    } catch (error: unknown) {
      console.error(error);
      setLinkStatus("error");
      setLinkErrorMessage(getErrorMessage(error));
    }
  }

  async function handleUnlinkKnowledge(knowledgeId: string) {
    if (!item || linkStatus === "saving") {
      return;
    }

    setLinkStatus("saving");
    setLinkErrorMessage("");

    try {
      await unlinkKnowledgeFromInquiry(item.id, knowledgeId);
      await loadKnowledgeRelations(item.id);
      setLinkStatus("idle");
    } catch (error: unknown) {
      console.error(error);
      setLinkStatus("error");
      setLinkErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDelete() {
    if (!item || deleteStatus === "deleting") {
      return;
    }

    setDeleteStatus("deleting");
    setDeleteErrorMessage("");

    try {
      await deleteInquiryNote(item.id);
      navigate("/inquiries");
    } catch (error: unknown) {
      console.error(error);

      const message = getErrorMessage(error);

      setDeleteStatus("error");
      setDeleteErrorMessage(
        message && message !== "{}"
          ? message
          : "削除処理中に不明なエラーが発生しました。",
      );
      setIsDeleteConfirmOpen(false);
    }
  }

  if (status === "loading") {
    return (
      <div>
        <BackLink />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          問い合わせメモを読み込んでいます...
        </div>
      </div>
    );
  }

  if (status === "notFound") {
    return (
      <div>
        <BackLink />
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold text-slate-900">
            問い合わせメモが見つかりません。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            削除済み、または存在しない問い合わせメモIDの可能性があります。
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <BackLink />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">
            問い合わせメモの読み込みに失敗しました。
          </p>
          <p className="mt-2 break-all">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const tagNames = splitNames(item.tag_names);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <BackLink />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="wrap-break-word text-2xl font-bold text-slate-900">
              {item.title}
            </h1>

            {item.is_favorite === 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                <Star size={13} />
                お気に入り
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            問い合わせ内容、対応内容、次に活かすこと、関連ナレッジを確認します。
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <Link
            to={`/inquiries/${item.id}/edit`}
            className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            編集
          </Link>

          <button
            type="button"
            onClick={() => {
              setDeleteStatus("idle");
              setDeleteErrorMessage("");
              setIsDeleteConfirmOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={16} />
            削除
          </button>
        </div>
      </div>

      {deleteStatus === "error" && deleteErrorMessage && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">問い合わせメモの削除に失敗しました。</p>
          <p className="mt-1 break-all">{deleteErrorMessage}</p>
        </div>
      )}

      {linkStatus === "error" && linkErrorMessage && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">関連ナレッジの更新に失敗しました。</p>
          <p className="mt-1 break-all">{linkErrorMessage}</p>
        </div>
      )}

      <div className="grid gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">問い合わせ概要</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {item.content}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">対応メモ</h2>
          {item.response_note.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {item.response_note}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">未記入です。</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">次に活かすこと</h2>
          {item.next_action.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {item.next_action}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">未記入です。</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">関連ナレッジ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            この問い合わせメモと関係するナレッジを手動で紐付けます。
          </p>

          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-900">
              紐付け済みナレッジ: {linkedKnowledgeItems.length}件
            </p>

            {linkedKnowledgeItems.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                関連ナレッジはまだ紐付いていません。
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {linkedKnowledgeItems.map((knowledge) => (
                  <LinkedKnowledgeCard
                    key={knowledge.id}
                    inquiryId={item.id}
                    knowledge={knowledge}
                    isSaving={linkStatus === "saving"}
                    onUnlink={() => {
                      void handleUnlinkKnowledge(knowledge.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-900">
              共通タグが一致する候補
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              この問い合わせメモと同じ共通タグを持つナレッジを候補として表示します。すでに紐付け済みのナレッジは表示されません。
            </p>

            {tagNames.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                この問い合わせメモに共通タグが設定されていないため、タグ一致候補は表示できません。
              </div>
            ) : suggestedKnowledgeItems.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                同じ共通タグを持つ未紐付けのナレッジはありません。
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {suggestedKnowledgeItems.map((knowledge) => (
                  <SuggestedKnowledgeCard
                    key={knowledge.id}
                    inquiryId={item.id}
                    knowledge={knowledge}
                    isSaving={linkStatus === "saving"}
                    onLink={() => {
                      void handleLinkSpecificKnowledge(knowledge.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Search size={15} />
              キーワードが一致する候補
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              問い合わせメモのタイトル・概要・対応メモ・次に活かすことからキーワードを抽出し、ナレッジのタイトル・本文と一致するものを表示します。タグ一致候補と紐付け済みナレッジは除外しています。
            </p>

            {keywordSuggestedKnowledgeItems.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                キーワードが一致する未紐付けのナレッジはありません。
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {keywordSuggestedKnowledgeItems.map((knowledge) => (
                  <KeywordSuggestedKnowledgeCard
                    key={knowledge.id}
                    inquiryId={item.id}
                    knowledge={knowledge}
                    isSaving={linkStatus === "saving"}
                    onLink={() => {
                      void handleLinkSpecificKnowledge(knowledge.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <label
              htmlFor="link-knowledge"
              className="text-sm font-semibold text-slate-900"
            >
              ナレッジを手動で追加
            </label>

            {allKnowledgeItems.length === 0 ? (
              <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                登録済みナレッジがありません。
              </div>
            ) : linkableKnowledgeItems.length === 0 ? (
              <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                追加できるナレッジがありません。
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2 md:flex-row">
                <select
                  id="link-knowledge"
                  value={selectedKnowledgeId}
                  onChange={(event) =>
                    setSelectedKnowledgeId(event.target.value)
                  }
                  disabled={linkStatus === "saving"}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {linkableKnowledgeItems.map((knowledge) => (
                    <option key={knowledge.id} value={knowledge.id}>
                      {knowledge.title}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    void handleLinkKnowledge();
                  }}
                  disabled={linkStatus === "saving" || !selectedKnowledgeId}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Link2 size={16} />
                  {linkStatus === "saving" ? "追加中..." : "追加"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">分類情報</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoRow label="発生日" value={item.occurred_on} />
            <InfoRow
              label="問い合わせ分類"
              value={item.category_name ?? "未設定"}
            />
            <InfoRow label="source" value={inquirySourceLabels[item.source]} />
            <InfoRow
              label="お気に入り"
              value={item.is_favorite === 1 ? "はい" : "いいえ"}
            />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500">共通タグ</p>
            {tagNames.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">共通タグ未設定</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {tagNames.map((tagName) => (
                  <span
                    key={tagName}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                  >
                    #{tagName}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-sm">
          作成: {formatDateTime(item.created_at)} / 更新:{" "}
          {formatDateTime(item.updated_at)}
        </section>
      </div>

      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-inquiry-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="delete-inquiry-title"
              className="text-lg font-bold text-slate-900"
            >
              問い合わせメモを削除
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              この問い合わせメモを削除します。削除後は元に戻せません。
            </p>

            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold">削除対象</p>
              <p className="mt-1 wrap-break-word">{item.title}</p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                }}
                disabled={deleteStatus === "deleting"}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={deleteStatus === "deleting"}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteStatus === "deleting" ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <div className="mb-6">
      <Link
        to="/inquiries"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        問い合わせメモ一覧へ戻る
      </Link>
    </div>
  );
}

function LinkedKnowledgeCard({
  inquiryId,
  knowledge,
  isSaving,
  onUnlink,
}: {
  inquiryId: string;
  knowledge: LinkedKnowledgeItem;
  isSaving: boolean;
  onUnlink: () => void;
}) {
  const tagNames = splitNames(knowledge.tag_names);

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link
            to={createLinkedKnowledgePath(knowledge.id, inquiryId)}
            onClick={() => {
              saveScrollPosition(createInquiryDetailScrollKey(inquiryId));
            }}
            className="wrap-break-word text-sm font-bold text-slate-900 transition hover:text-slate-600"
          >
            {knowledge.title}
          </Link>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {createExcerpt(knowledge.content, 120)}
          </p>
        </div>

        <button
          type="button"
          onClick={onUnlink}
          disabled={isSaving}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Unlink size={14} />
          解除
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
        <MiniInfo
          label="ナレッジ種類"
          value={knowledgeTypeLabels[knowledge.type]}
        />
        <MiniInfo
          label="ナレッジ分類"
          value={knowledge.category_name ?? "未設定"}
        />
        <MiniInfo
          label="source"
          value={knowledgeSourceLabels[knowledge.source]}
        />
      </div>

      <div className="mt-3">
        {tagNames.length === 0 ? (
          <p className="text-xs text-slate-500">共通タグ未設定</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagNames.map((tagName) => (
              <span
                key={tagName}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
              >
                #{tagName}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function SuggestedKnowledgeCard({
  inquiryId,
  knowledge,
  isSaving,
  onLink,
}: {
  inquiryId: string;
  knowledge: SuggestedKnowledgeItem;
  isSaving: boolean;
  onLink: () => void;
}) {
  const tagNames = splitNames(knowledge.tag_names);
  const matchedTagNames = splitNames(knowledge.matched_tag_names);

  return (
    <article className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link
            to={createLinkedKnowledgePath(knowledge.id, inquiryId)}
            onClick={() => {
              saveScrollPosition(createInquiryDetailScrollKey(inquiryId));
            }}
            className="wrap-break-word text-sm font-bold text-slate-900 transition hover:text-slate-600"
          >
            {knowledge.title}
          </Link>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {createExcerpt(knowledge.content, 120)}
          </p>
        </div>

        <button
          type="button"
          onClick={onLink}
          disabled={isSaving}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Link2 size={14} />
          追加
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-white px-3 py-2">
        <p className="text-[11px] font-semibold text-blue-700">
          一致した共通タグ
        </p>

        {matchedTagNames.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            一致タグを取得できませんでした。
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {matchedTagNames.map((tagName) => (
              <span
                key={`${knowledge.id}-matched-${tagName}`}
                className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700"
              >
                #{tagName}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
        <MiniInfo
          label="ナレッジ種類"
          value={knowledgeTypeLabels[knowledge.type]}
        />
        <MiniInfo
          label="ナレッジ分類"
          value={knowledge.category_name ?? "未設定"}
        />
        <MiniInfo
          label="source"
          value={knowledgeSourceLabels[knowledge.source]}
        />
      </div>

      <div className="mt-3">
        {tagNames.length === 0 ? (
          <p className="text-xs text-slate-500">共通タグ未設定</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagNames.map((tagName) => (
              <span
                key={`${knowledge.id}-${tagName}`}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
              >
                #{tagName}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function KeywordSuggestedKnowledgeCard({
  inquiryId,
  knowledge,
  isSaving,
  onLink,
}: {
  inquiryId: string;
  knowledge: KeywordSuggestedKnowledgeItem;
  isSaving: boolean;
  onLink: () => void;
}) {
  const tagNames = splitNames(knowledge.tag_names);
  const matchedKeywords = splitNames(knowledge.matched_keywords);

  return (
    <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link
            to={createLinkedKnowledgePath(knowledge.id, inquiryId)}
            onClick={() => {
              saveScrollPosition(createInquiryDetailScrollKey(inquiryId));
            }}
            className="wrap-break-word text-sm font-bold text-slate-900 transition hover:text-slate-600"
          >
            {knowledge.title}
          </Link>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {createExcerpt(knowledge.content, 120)}
          </p>
        </div>

        <button
          type="button"
          onClick={onLink}
          disabled={isSaving}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Link2 size={14} />
          追加
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-white px-3 py-2">
        <p className="text-[11px] font-semibold text-emerald-700">
          一致したキーワード
        </p>

        {matchedKeywords.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            一致キーワードを取得できませんでした。
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {matchedKeywords.map((keyword) => (
              <span
                key={`${knowledge.id}-keyword-${keyword}`}
                className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
        <MiniInfo
          label="ナレッジ種類"
          value={knowledgeTypeLabels[knowledge.type]}
        />
        <MiniInfo
          label="ナレッジ分類"
          value={knowledge.category_name ?? "未設定"}
        />
        <MiniInfo
          label="source"
          value={knowledgeSourceLabels[knowledge.source]}
        />
      </div>

      <div className="mt-3">
        {tagNames.length === 0 ? (
          <p className="text-xs text-slate-500">共通タグ未設定</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagNames.map((tagName) => (
              <span
                key={`${knowledge.id}-${tagName}`}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
              >
                #{tagName}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-2">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 wrap-break-word font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}
