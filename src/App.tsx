// src/App.tsx
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

const navItems = [
  { to: "/", label: "ダッシュボード", icon: Home },
  { to: "/knowledge", label: "ナレッジ", icon: BookOpen },
  { to: "/inquiries", label: "問い合わせメモ", icon: MessageSquareText },
  { to: "/monthly-reviews", label: "月次振り返り", icon: CalendarCheck },
  { to: "/taxonomy", label: "タグ・カテゴリ", icon: Tags },
  { to: "/settings", label: "設定", icon: Settings },
];

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
  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        description="最近追加したナレッジ、問い合わせメモ、月次振り返りへの導線を表示します。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">今月のナレッジ</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">今月の問い合わせメモ</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">登録タグ</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">お気に入り</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">0</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        このアプリには、顧客の氏名・連絡先・購入履歴・社外秘情報・非公開の商品情報を保存しないでください。
        MVPではSQLiteを平文保存とし、保存対象を匿名化された業務メモに限定します。
      </div>
    </div>
  );
}

function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
        この画面は次のステップで実装します。
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
                <Route
                  path="/knowledge"
                  element={
                    <PlaceholderPage
                      title="ナレッジ"
                      description="商品知識、接客フレーズ、業務手順、FAQ、注意事項、改善メモを管理します。"
                    />
                  }
                />
                <Route
                  path="/inquiries"
                  element={
                    <PlaceholderPage
                      title="問い合わせメモ"
                      description="問い合わせ内容そのものではなく、匿名化した対応パターンや学びを管理します。"
                    />
                  }
                />
                <Route
                  path="/monthly-reviews"
                  element={
                    <PlaceholderPage
                      title="月次振り返り"
                      description="対象月のナレッジや問い合わせメモをもとに、月次振り返りを作成します。"
                    />
                  }
                />
                <Route
                  path="/taxonomy"
                  element={
                    <PlaceholderPage
                      title="タグ・カテゴリ"
                      description="ナレッジ用カテゴリ、問い合わせ用カテゴリ、共通タグを管理します。"
                    />
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <PlaceholderPage
                      title="設定"
                      description="テーマ、データ保存場所、JSONバックアップ、復元、アプリ情報を管理します。"
                    />
                  }
                />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
