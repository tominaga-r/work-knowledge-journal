import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { KnowledgeListItem, listKnowledgeItems } from "./knowledgeRepository";
import { knowledgeSourceLabels, knowledgeTypeLabels } from "./knowledgeLabels";
import { createExcerpt } from "../../lib/utils/text";
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

export function KnowledgeListPage() {
  const [items, setItems] = useState<KnowledgeListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledgeItems() {
      const knowledgeItems = await listKnowledgeItems();

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
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ナレッジ</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            商品知識、接客フレーズ、業務手順、FAQ、注意事項、改善メモを管理します。
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          新規作成
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        ナレッジには、顧客の個人情報、社外秘情報、非公開の商品情報を入力しないでください。
        商品知識や対応フレーズは、匿名化・一般化した内容として記録します。
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          まだナレッジが登録されていません。まずは業務手順や接客フレーズを登録します。
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
                      <h2 className="text-lg font-bold text-slate-900">
                        {item.title}
                      </h2>

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

                <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 md:grid-cols-2">
                  <p>作成日時: {formatDateTime(item.created_at)}</p>
                  <p>更新日時: {formatDateTime(item.updated_at)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
