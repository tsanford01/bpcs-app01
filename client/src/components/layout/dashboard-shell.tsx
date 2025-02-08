import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";

export default function DashboardShell({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 lg:px-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
