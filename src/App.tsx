// src/App.tsx
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  Home,
  MessageSquareText,
  Settings,
  Tags,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import clsx from "clsx";
import {
  countFavoriteInquiryNotes,
  countInquiryNotesByMonth,
} from "./features/inquiry/inquiryRepository";
import {
  countFavoriteKnowledgeItems,
  countKnowledgeItemsByMonth,
} from "./features/knowledge/knowledgeRepository";
import { countTags } from "./features/taxonomy/tagRepository";
import { migrateDatabase } from "./lib/db/migrate";
import { initializeSampleData } from "./lib/db/sampleData";
import { currentMonthString } from "./lib/utils/date";
import { getErrorMessage } from "./lib/utils/error";
import { KnowledgeListPage } from "./features/knowledge/KnowledgeListPage";
import { KnowledgeCreatePage } from "./features/knowledge/KnowledgeCreatePage";
import { KnowledgeDetailPage } from "./features/knowledge/KnowledgeDetailPage";
import { KnowledgeEditPage } from "./features/knowledge/KnowledgeEditPage";
import { TaxonomyPage } from "./features/taxonomy/TaxonomyPage";
import { InquiryListPage } from "./features/inquiry/InquiryListPage";
import { InquiryCreatePage } from "./features/inquiry/InquiryCreatePage";
import { InquiryDetailPage } from "./features/inquiry/InquiryDetailPage";
import { InquiryEditPage } from "./features/inquiry/InquiryEditPage";
import { MonthlyReviewPage } from "./features/review/MonthlyReviewPage";
import { BackupPage } from "./features/settings/BackupPage";

const navItems = [
  { to: "/", label: "ダッシュボード", icon: Home },
  { to: "/knowledge", label: "ナレッジ", icon: BookOpen },
  { to: "/inquiries", label: "問い合わせメモ", icon: MessageSquareText },
  { to: "/monthly-reviews", label: "月次振り返り", icon: CalendarCheck },
  { to: "/taxonomy", label: "分類管理", icon: Tags },
  { to: "/settings", label: "設定", icon: Settings },
];

type DashboardStats = {
  monthlyKnowledgeCount: number;
  monthlyInquiryCount: number;
  tagCount: number;
  favoriteCount: number;
};

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 md:block">
      <div className="mb-8">
        <p className="text-lg font-bold text-slate-900">業務ナレッジノート</p>
        <p className="text-xs text-slate-500">Work Knowledge Journal</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
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

function DashboardPage() {
  const [dbStatus, setDbStatus] = useState<"checking" | "ready" | "error">(
    "checking",
  );
  const [dbError, setDbError] = useState<string>("");
  const [sampleDataCreated, setSampleDataCreated] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats>({
    monthlyKnowledgeCount: 0,
    monthlyInquiryCount: 0,
    tagCount: 0,
    favoriteCount: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function initializeAppDatabase() {
      await migrateDatabase();

      const created = await initializeSampleData();
      const targetMonth = currentMonthString();

      const [
        monthlyKnowledgeCount,
        monthlyInquiryCount,
        tagCount,
        favoriteKnowledgeCount,
        favoriteInquiryCount,
      ] = await Promise.all([
        countKnowledgeItemsByMonth(targetMonth),
        countInquiryNotesByMonth(targetMonth),
        countTags(),
        countFavoriteKnowledgeItems(),
        countFavoriteInquiryNotes(),
      ]);

      if (!isMounted) {
        return;
      }

      setSampleDataCreated(created);
      setStats({
        monthlyKnowledgeCount,
        monthlyInquiryCount,
        tagCount,
        favoriteCount: favoriteKnowledgeCount + favoriteInquiryCount,
      });
      setDbStatus("ready");
    }

    initializeAppDatabase().catch((error: unknown) => {
      console.error(error);

      if (isMounted) {
        setDbStatus("error");
        setDbError(getErrorMessage(error));
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
        description="最近追加したナレッジ、問い合わせメモ、月次振り返りへの導線を表示します。"
      />

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">データベース状態</p>
        {dbStatus === "checking" && (
          <p className="mt-2 text-sm text-slate-500">
            SQLiteデータベースを初期化しています...
          </p>
        )}
        {dbStatus === "ready" && (
          <div className="mt-2 space-y-1 text-sm text-emerald-700">
            <p>SQLiteデータベースの初期化が完了しました。</p>
            {sampleDataCreated && (
              <p>初回確認用のサンプルデータを投入しました。</p>
            )}
          </div>
        )}
        {dbStatus === "error" && (
          <div className="mt-2 text-sm text-red-700">
            <p>SQLiteデータベースの初期化に失敗しました。</p>
            <p className="mt-1 break-all">{dbError}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">今月のナレッジ</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {stats.monthlyKnowledgeCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">今月の問い合わせメモ</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {stats.monthlyInquiryCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">登録共通タグ</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {stats.tagCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">お気に入り</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {stats.favoriteCount}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        このアプリには、顧客の氏名・連絡先・購入履歴・社外秘情報・非公開の商品情報を保存しないでください。
        MVPではSQLiteを平文保存とし、保存対象を匿名化された業務メモに限定します。
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <div className="flex min-h-screen">
          <Sidebar />

          <main className="min-w-0 flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-6xl">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/knowledge" element={<KnowledgeListPage />} />
                <Route
                  path="/knowledge/new"
                  element={<KnowledgeCreatePage />}
                />
                <Route
                  path="/knowledge/:knowledgeId"
                  element={<KnowledgeDetailPage />}
                />
                <Route
                  path="/knowledge/:knowledgeId/edit"
                  element={<KnowledgeEditPage />}
                />
                <Route path="/inquiries" element={<InquiryListPage />} />
                <Route path="/inquiries/new" element={<InquiryCreatePage />} />
                <Route
                  path="/inquiries/:inquiryId"
                  element={<InquiryDetailPage />}
                />
                <Route
                  path="/inquiries/:inquiryId/edit"
                  element={<InquiryEditPage />}
                />
                <Route
                  path="/monthly-reviews"
                  element={<MonthlyReviewPage />}
                />
                <Route path="/taxonomy" element={<TaxonomyPage />} />
                <Route path="/settings" element={<BackupPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
