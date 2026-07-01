import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, Trash2 } from "lucide-react";
import { formatDateTime } from "../../lib/utils/format";
import { getErrorMessage } from "../../lib/utils/error";
import { inquirySourceLabels } from "./inquiryLabels";
import {
  InquiryListItem,
  deleteInquiryNote,
  getInquiryNoteById,
} from "./inquiryRepository";

function splitNames(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function InquiryDetailPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<InquiryListItem | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "notFound" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "deleting" | "error"
  >("idle");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

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
            問い合わせ内容、対応内容、次に活かすことを確認します。
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
