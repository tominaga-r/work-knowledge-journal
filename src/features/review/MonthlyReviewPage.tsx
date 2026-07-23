import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  FileText,
  MessageSquareText,
  RefreshCw,
  Save,
} from "lucide-react";
import { currentMonthString } from "../../lib/utils/date";
import { getErrorMessage } from "../../lib/utils/error";
import { formatDateTime } from "../../lib/utils/format";
import {
  MonthlyReviewRecord,
  MonthlyReviewSummary,
  getMonthlyReviewByMonth,
  getMonthlyReviewSummary,
  saveMonthlyReview,
} from "./monthlyReviewRepository";

type ReviewFormState = {
  summary: string;
  learnings: string;
  issues: string;
  frequentTopics: string;
  nextGoals: string;
  freeMemo: string;
};

const emptyForm: ReviewFormState = {
  summary: "",
  learnings: "",
  issues: "",
  frequentTopics: "",
  nextGoals: "",
  freeMemo: "",
};

function createFormFromReview(
  review: MonthlyReviewRecord | null,
): ReviewFormState {
  if (!review) {
    return emptyForm;
  }

  return {
    summary: review.summary,
    learnings: review.learnings,
    issues: review.issues,
    frequentTopics: review.frequent_topics,
    nextGoals: review.next_goals,
    freeMemo: review.free_memo,
  };
}

export function MonthlyReviewPage() {
  const [targetMonth, setTargetMonth] = useState(currentMonthString());
  const [summary, setSummary] = useState<MonthlyReviewSummary | null>(null);
  const [review, setReview] = useState<MonthlyReviewRecord | null>(null);
  const [form, setForm] = useState<ReviewFormState>(emptyForm);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  const monthLabel = useMemo(() => {
    const [year, month] = targetMonth.split("-");

    if (!year || !month) {
      return targetMonth;
    }

    return `${year}年${Number(month)}月`;
  }, [targetMonth]);

  useEffect(() => {
    let isMounted = true;

    async function loadMonthlyReview() {
      setStatus("loading");
      setSaveStatus("idle");
      setErrorMessage("");
      setSaveErrorMessage("");

      const [loadedSummary, loadedReview] = await Promise.all([
        getMonthlyReviewSummary(targetMonth),
        getMonthlyReviewByMonth(targetMonth),
      ]);

      if (!isMounted) {
        return;
      }

      setSummary(loadedSummary);
      setReview(loadedReview);
      setForm(createFormFromReview(loadedReview));
      setStatus("ready");
    }

    loadMonthlyReview().catch((error: unknown) => {
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

  function updateForm<K extends keyof ReviewFormState>(
    key: K,
    value: ReviewFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (saveStatus === "saved") {
      setSaveStatus("idle");
    }
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveErrorMessage("");

    try {
      const savedReview = await saveMonthlyReview({
        targetMonth,
        summary: form.summary,
        learnings: form.learnings,
        issues: form.issues,
        frequentTopics: form.frequentTopics,
        nextGoals: form.nextGoals,
        freeMemo: form.freeMemo,
      });

      setReview(savedReview);
      setForm(createFormFromReview(savedReview));
      setSaveStatus("saved");
    } catch (error: unknown) {
      console.error(error);
      setSaveErrorMessage(getErrorMessage(error));
      setSaveStatus("error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">月次振り返り</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            対象月のナレッジと問い合わせメモを確認し、学び・課題・次月の行動を整理します。
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
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw size={20} className="text-slate-700" />
                  <h2 className="text-lg font-bold text-slate-900">
                    振り返りメモ
                  </h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  今月の対応を整理し、次月以降に活かせる形で記録します。
                </p>
              </div>

              <div className="text-xs text-slate-500">
                {review ? (
                  <p>最終更新: {formatDateTime(review.updated_at)}</p>
                ) : (
                  <p>この月の振り返りは未保存です。</p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <ReviewTextarea
                id="monthly-review-summary"
                label="月の概要"
                value={form.summary}
                onChange={(value) => updateForm("summary", value)}
                placeholder="今月の対応件数や全体傾向を簡潔に記録します。"
              />

              <ReviewTextarea
                id="monthly-review-learnings"
                label="学び・気づき"
                value={form.learnings}
                onChange={(value) => updateForm("learnings", value)}
                placeholder="対応を通じて分かったこと、今後も活かせる知識を記録します。"
              />

              <ReviewTextarea
                id="monthly-review-issues"
                label="課題"
                value={form.issues}
                onChange={(value) => updateForm("issues", value)}
                placeholder="迷いやすかった点、対応に時間がかかった点、改善が必要な点を記録します。"
              />

              <ReviewTextarea
                id="monthly-review-frequent-topics"
                label="多かった問い合わせ・話題"
                value={form.frequentTopics}
                onChange={(value) => updateForm("frequentTopics", value)}
                placeholder="今月多かった問い合わせ、繰り返し出たテーマを記録します。"
              />

              <ReviewTextarea
                id="monthly-review-next-goals"
                label="来月の目標"
                value={form.nextGoals}
                onChange={(value) => updateForm("nextGoals", value)}
                placeholder="来月改善したいこと、増やしたいナレッジ、確認したい業務を記録します。"
              />

              <ReviewTextarea
                id="monthly-review-free-memo"
                label="自由メモ"
                value={form.freeMemo}
                onChange={(value) => updateForm("freeMemo", value)}
                placeholder="その他、残しておきたいことを自由に記録します。"
              />
            </div>

            {saveStatus === "saved" && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                月次振り返りを保存しました。
              </div>
            )}

            {saveStatus === "error" && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">保存に失敗しました。</p>
                <p className="mt-1 break-all">{saveErrorMessage}</p>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saveStatus === "saving"}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saveStatus === "saving" ? "保存中..." : "保存する"}
              </button>
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

function ReviewTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-900">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        maxLength={4000}
        className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        placeholder={placeholder}
      />
      <p className="mt-1 text-right text-xs text-slate-400">
        {value.length}/4000
      </p>
    </div>
  );
}
