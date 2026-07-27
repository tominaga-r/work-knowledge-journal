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
