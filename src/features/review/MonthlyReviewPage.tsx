import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  FileText,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import { currentMonthString } from "../../lib/utils/date";
import { getErrorMessage } from "../../lib/utils/error";
import {
  MonthlyReviewSummary,
  getMonthlyReviewSummary,
} from "./monthlyReviewRepository";

export function MonthlyReviewPage() {
  const [targetMonth, setTargetMonth] = useState(currentMonthString());
  const [summary, setSummary] = useState<MonthlyReviewSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const monthLabel = useMemo(() => {
    const [year, month] = targetMonth.split("-");

    if (!year || !month) {
      return targetMonth;
    }

    return `${year}年${Number(month)}月`;
  }, [targetMonth]);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setStatus("loading");
      setErrorMessage("");

      const loadedSummary = await getMonthlyReviewSummary(targetMonth);

      if (!isMounted) {
        return;
      }

      setSummary(loadedSummary);
      setStatus("ready");
    }

    loadSummary().catch((error: unknown) => {
      console.error(error);

      if (isMounted) {
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [targetMonth]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">月次振り返り</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            対象月のナレッジと問い合わせメモを確認し、月次の振り返り作成につなげます。
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label
            htmlFor="monthly-review-target-month"
            className="text-xs font-semibold text-slate-500"
          >
            対象月
          </label>
          <input
            id="monthly-review-target-month"
            type="month"
            value={targetMonth}
            onChange={(event) => setTargetMonth(event.target.value)}
            className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {status === "loading" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          月次データを読み込んでいます...
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">月次データの読み込みに失敗しました。</p>
          <p className="mt-2 break-all">{errorMessage}</p>
        </div>
      )}

      {status === "ready" && summary && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarCheck size={20} className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">
                {monthLabel}の概要
              </h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <SummaryCard
                icon={<FileText size={22} />}
                label="作成されたナレッジ"
                value={summary.knowledgeCount}
                description="対象月に作成されたナレッジ件数です。"
              />
              <SummaryCard
                icon={<MessageSquareText size={22} />}
                label="発生した問い合わせメモ"
                value={summary.inquiryCount}
                description="対象月に発生した問い合わせメモ件数です。"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <RefreshCw size={20} className="text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">振り返りメモ</h2>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              このステップでは、月次振り返り画面の土台として対象月の集計を表示しています。
              次のステップで、振り返り本文の入力、保存、編集、Markdown出力を追加します。
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
