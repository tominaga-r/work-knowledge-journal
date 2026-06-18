import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { knowledgeSourceLabels, knowledgeTypeLabels } from "./knowledgeLabels";
import {
  KnowledgeListItem,
  deleteKnowledgeItem,
  getKnowledgeItemById,
} from "./knowledgeRepository";
import { formatDateTime } from "../../lib/utils/format";
import { getErrorMessage } from "../../lib/utils/error";

function splitTagNames(tagNames: string | null): string[] {
  if (!tagNames) {
    return [];
  }

  return tagNames
    .split(",")
    .map((tagName) => tagName.trim())
    .filter(Boolean);
}

export function KnowledgeDetailPage() {
  const { knowledgeId } = useParams<{ knowledgeId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<KnowledgeListItem | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "deleting" | "error"
  >("idle");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "notFound" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledgeItem() {
      setErrorMessage("");
      setDeleteStatus("idle");
      setDeleteErrorMessage("");
      setIsDeleteConfirmOpen(false);

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

      setItem(loadedItem);
      setStatus("ready");
    }

    loadKnowledgeItem().catch((error: unknown) => {
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

  async function handleDelete() {
    if (!item || deleteStatus === "deleting") {
      return;
    }

    setDeleteStatus("deleting");
    setDeleteErrorMessage("");

    try {
      await deleteKnowledgeItem(item.id);
      navigate("/knowledge");
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
          ナレッジを読み込んでいます...
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
          <p className="font-semibold">
            ナレッジ詳細の読み込みに失敗しました。
          </p>
          <p className="mt-2 break-all">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (status === "notFound" || !item) {
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
            ナレッジが見つかりません。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            削除済み、または存在しないナレッジIDの可能性があります。
          </p>
        </div>
      </div>
    );
  }

  const tagNames = splitTagNames(item.tag_names);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            to="/knowledge"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            ナレッジ一覧へ戻る
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{item.title}</h1>

            {item.is_favorite === 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">
                <Star size={14} fill="currentColor" />
                お気に入り
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            登録済みナレッジの詳細情報を表示しています。
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/knowledge/${item.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            削除
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        この画面には登録済みの本文を表示します。顧客の個人情報、社外秘情報、非公開の商品情報が含まれていないか確認してください。
      </div>

      {deleteStatus === "error" && deleteErrorMessage && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">ナレッジの削除に失敗しました。</p>
          <p className="mt-1 break-all">{deleteErrorMessage}</p>
        </div>
      )}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            種別: {knowledgeTypeLabels[item.type]}
          </span>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            カテゴリ: {item.category_name ?? "未設定"}
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
            <span className="text-xs text-slate-400">タグ未設定</span>
          )}
        </div>

        <section className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="text-sm font-semibold text-slate-900">本文</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {item.content}
          </p>
        </section>

        <section className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500 md:grid-cols-2">
          <p>作成日時: {formatDateTime(item.created_at)}</p>
          <p>更新日時: {formatDateTime(item.updated_at)}</p>
        </section>
      </article>

      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="delete-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              ナレッジを削除しますか？
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              この操作は元に戻せません。削除してよいか確認してください。
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold">削除対象</p>
              <p className="mt-1 wrap-break-word">{item.title}</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:justify-end">
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
