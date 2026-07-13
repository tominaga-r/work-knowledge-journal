import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Star } from "lucide-react";
import { createExcerpt } from "../../lib/utils/text";
import { formatDateTime } from "../../lib/utils/format";
import { getErrorMessage } from "../../lib/utils/error";
import { inquirySourceLabels } from "./inquiryLabels";
import { InquiryListItem, listInquiryNotes } from "./inquiryRepository";
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

const INQUIRY_LIST_SCROLL_KEY = "inquiry-list";

export function InquiryListPage() {
  const [items, setItems] = useState<InquiryListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        const loadedItems = await listInquiryNotes();

        if (isMounted) {
          setItems(loadedItems);
          setStatus("ready");
        }
      } catch (error: unknown) {
        console.error(error);

        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setStatus("error");
        }
      }
    }

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    restoreScrollPosition(INQUIRY_LIST_SCROLL_KEY);
  }, [status, items.length]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">問い合わせメモ</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            問い合わせ内容、対応メモ、次に活かすことを記録します。
          </p>
        </div>

        <Link
          to="/inquiries/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          <Plus size={16} />
          新規作成
        </Link>
      </div>

      {status === "loading" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          問い合わせメモを読み込んでいます...
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">
            問い合わせメモの読み込みに失敗しました。
          </p>
          <p className="mt-2 break-all">{errorMessage}</p>
        </div>
      )}

      {status === "ready" && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
          <p className="text-sm font-semibold text-slate-900">
            問い合わせメモがまだありません。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            よくある問い合わせや対応で気づいたことを、個人情報を含めずに記録できます。
          </p>
          <Link
            to="/inquiries/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Plus size={16} />
            最初の問い合わせメモを作成
          </Link>
        </div>
      )}

      {status === "ready" && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((item) => {
            const tagNames = splitNames(item.tag_names);

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/inquiries/${item.id}`}
                        onClick={() => {
                          saveScrollPosition(INQUIRY_LIST_SCROLL_KEY);
                        }}
                        className="wrap-break-word text-lg font-bold text-slate-900 transition hover:text-slate-600"
                      >
                        {item.title}
                      </Link>

                      {item.is_favorite === 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          <Star size={13} />
                          お気に入り
                        </span>
                      )}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {createExcerpt(item.content, 160)}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    発生日: {item.occurred_on}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <InfoRow
                    label="問い合わせ分類"
                    value={item.category_name ?? "未設定"}
                  />
                  <InfoRow
                    label="source"
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
                          key={tagName}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                        >
                          #{tagName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                  <p>
                    作成: {formatDateTime(item.created_at)} / 更新:{" "}
                    {formatDateTime(item.updated_at)}
                  </p>

                  <Link
                    to={`/inquiries/${item.id}`}
                    onClick={() => {
                      saveScrollPosition(INQUIRY_LIST_SCROLL_KEY);
                    }}
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
