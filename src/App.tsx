// src/App.tsx
import {
  BookOpen,
  CalendarCheck,
  FilePlus2,
  Home,
  MessageSquarePlus,
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
import { DashboardPage } from "./features/dashboard/DashboardPage";
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

const quickActionItems = [
  { to: "/knowledge/new", label: "ナレッジを追加", icon: FilePlus2 },
  {
    to: "/inquiries/new",
    label: "問い合わせメモを追加",
    icon: MessageSquarePlus,
  },
];

function isActivePath(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 md:block">
      <div className="mb-8">
        <p className="text-lg font-bold text-slate-900">業務ナレッジノート</p>
        <p className="text-xs text-slate-500">Work Knowledge Journal</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(location.pathname, item.to);

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
              <Icon size={18} className="shrink-0" />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-slate-200 pt-5">
        <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          クイック操作
        </p>

        <div className="mt-3 space-y-2">
          {quickActionItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <Icon size={18} className="shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function MobileNavigation() {
  const location = useLocation();

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-3 md:hidden">
      <div className="mb-3">
        <p className="text-base font-bold text-slate-900">業務ナレッジノート</p>
        <p className="text-xs text-slate-500">Work Knowledge Journal</p>
      </div>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(location.pathname, item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                "flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-900">
        <div className="flex min-h-screen min-w-0">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNavigation />

            <main className="min-w-0 flex-1 p-4 md:p-8">
              <div className="mx-auto w-full max-w-6xl min-w-0">
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
                  <Route
                    path="/inquiries/new"
                    element={<InquiryCreatePage />}
                  />
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
      </div>
    </BrowserRouter>
  );
}
