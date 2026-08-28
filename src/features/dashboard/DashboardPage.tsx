import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  CalendarCheck,
  Database,
  FilePlus2,
  MessageSquarePlus,
  MessageSquareText,
  Settings,
  Star,
  Tags,
} from "lucide-react";
import { Link } from "react-router-dom";
import { migrateDatabase } from "../../lib/db/migrate";
import { initializeSampleData } from "../../lib/db/sampleData";
import { getErrorMessage } from "../../lib/utils/error";
import { formatDateTime } from "../../lib/utils/format";
import {
  DashboardOverview,
  RecentInquiryNote,
  RecentKnowledgeItem,
  getDashboardOverview,
} from "./dashboardRepository";

type DashboardStatus = "checking" | "ready" | "error";

export function DashboardPage() {
  const [status, setStatus] = useState<DashboardStatus>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [sampleDataCreated, setSampleDataCreated] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  const monthLabel = useMemo(() => {
    if (!overview) {
      return "";
    }

    const [year, month] = overview.targetMonth.split("-");
    if (!year || !month) {
      return overview.targetMonth;
    }

    return `${year}年${Number(month)}月`;
  }, [overview]);

  useEffect(() => {
    let isMounted = true;

    async function initializeDashboard() {
      setStatus("checking");
      setErrorMessage("");

      await migrateDatabase();

      const created = await initializeSampleData();
      const loadedOverview = await getDashboardOverview();

      if (!isMounted) {
        return;
      }

      setSampleDataCreated(created);
      setOverview(loadedOverview);
      setStatus("ready");
    }

    initializeDashboard().catch((error: unknown) => {
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
      <PageHeader
        title="ダッシュボード"
        description="今月の登録状況、最近の記録、月次振り返りの状態を確認します。"
      />

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-slate-700" />
          <p className="text-sm font-semibold text-slate-900">データ準備</p>
        </div>

        {status === "checking" && (
          <p className="mt-2 text-sm text-slate-500">
            アプリで使用するデータを準備しています...
          </p>
        )}

        {status === "ready" && (
          <div className="mt-2 space-y-1 text-sm text-emerald-700">
            <p>データの準備が完了しました。</p>
            {sampleDataCreated && (
              <p>初回確認用のサンプルデータを追加しました。</p>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="mt-2 text-sm text-red-700">
            <p>データの準備に失敗しました。</p>
            <p className="mt-1 break-all">{errorMessage}</p>
          </div>
        )}
      </section>

      {status === "ready" && overview && (
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {monthLabel}の概要
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  今月の登録状況と振り返りの保存状態です。
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatsCard
                icon={<BookOpen size={22} />}
                label="今月のナレッジ"
                value={overview.monthlyKnowledgeCount}
              />
              <StatsCard
                icon={<MessageSquareText size={22} />}
                label="今月の問い合わせメモ"
                value={overview.monthlyInquiryCount}
              />
              <StatsCard
                icon={<Tags size={22} />}
                label="登録共通タグ"
                value={overview.tagCount}
              />
              <StatsCard
                icon={<Star size={22} />}
                label="お気に入り"
                value={overview.favoriteCount}
              />
              <MonthlyReviewCard
                isSaved={overview.monthlyReviewStatus.isSaved}
                updatedAt={overview.monthlyReviewStatus.updatedAt}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecentKnowledgeSection items={overview.recentKnowledgeItems} />
            <RecentInquirySection items={overview.recentInquiryNotes} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">クイック操作</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              よく使う画面へすぐ移動できます。
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ShortcutLink
                to="/knowledge/new"
                icon={<FilePlus2 size={18} />}
                label="ナレッジを追加"
              />
              <ShortcutLink
                to="/inquiries/new"
                icon={<MessageSquarePlus size={18} />}
                label="問い合わせメモを追加"
              />
              <ShortcutLink
                to="/monthly-reviews"
                icon={<CalendarCheck size={18} />}
                label="月次振り返り"
              />
              <ShortcutLink
                to="/settings"
                icon={<Settings size={18} />}
                label="バックアップ"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            このアプリには、顧客の氏名・連絡先・購入履歴・社外秘情報・非公開の商品情報を保存しないでください。
            保存する内容は、あとで見返せるように整理した業務メモを想定しています。
          </section>
        </div>
      )}
    </div>
  );
}

function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MonthlyReviewCard({
  isSaved,
  updatedAt,
}: {
  isSaved: boolean;
  updatedAt: string | null;
}) {
  return (
    <Link
      to="/monthly-reviews"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-slate-500">
        <CalendarCheck size={22} />
        <p className="text-sm font-semibold">月次振り返り</p>
      </div>

      <p
        className={
          isSaved
            ? "mt-3 text-2xl font-bold text-emerald-700"
            : "mt-3 text-2xl font-bold text-amber-700"
        }
      >
        {isSaved ? "保存済み" : "未保存"}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {isSaved && updatedAt
          ? `最終更新: ${formatDateTime(updatedAt)}`
          : "今月の振り返りを作成できます。"}
      </p>
    </Link>
  );
}

function RecentKnowledgeSection({ items }: { items: RecentKnowledgeItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">最近のナレッジ</h2>
          <p className="mt-1 text-sm text-slate-500">
            最近追加されたナレッジを表示します。
          </p>
        </div>

        <Link
          to="/knowledge"
          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          一覧へ
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={`/knowledge/${item.id}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">{item.title}</p>
                {item.is_favorite === 1 && <FavoriteBadge />}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                作成日時: {formatDateTime(item.created_at)}
              </p>
            </Link>
          ))
        ) : (
          <EmptyState message="まだナレッジが登録されていません。" />
        )}
      </div>
    </section>
  );
}

function RecentInquirySection({ items }: { items: RecentInquiryNote[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            最近の問い合わせメモ
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            最近追加された問い合わせメモを表示します。
          </p>
        </div>

        <Link
          to="/inquiries"
          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          一覧へ
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={`/inquiries/${item.id}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">{item.title}</p>
                {item.is_favorite === 1 && <FavoriteBadge />}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                発生日: {item.occurred_on}
              </p>
            </Link>
          ))
        ) : (
          <EmptyState message="まだ問い合わせメモが登録されていません。" />
        )}
      </div>
    </section>
  );
}

function FavoriteBadge() {
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
      ★
    </span>
  );
}

function ShortcutLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {icon}
      {label}
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}
