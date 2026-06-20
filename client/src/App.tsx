import { Suspense, lazy, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Sidebar, BottomNav } from "./components/Layout/Sidebar";
import { Header } from "./components/Layout/Header";
import { PageSkeleton } from "./components/common/Skeleton";
import { AssistantPanel } from "./components/AIAssistant/AssistantPanel";
import { useAuditStore } from "./store/auditStore";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AuditPlanPage = lazy(() => import("./pages/AuditPlanPage"));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage"));
const FollowUpPage = lazy(() => import("./pages/FollowUpPage"));

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="m-4 p-4 rounded-xl bg-status-postponed-bg text-status-postponed text-sm border border-red-200">
      ⚠️ {message}
    </div>
  );
}

export default function App() {
  const load = useAuditStore((s) => s.load);
  const error = useAuditStore((s) => s.error);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">
          {error ? (
            <ErrorBanner message={error} />
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/plan" element={<AuditPlanPage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
                <Route path="/follow-up" element={<FollowUpPage />} />
              </Routes>
            </Suspense>
          )}
        </main>
      </div>
      <AssistantPanel />
      <BottomNav />
    </div>
  );
}
