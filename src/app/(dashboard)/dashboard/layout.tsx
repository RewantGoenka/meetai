import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-muted">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          <DashboardNavbar />
          {/* Page content */}
          <div className="flex-1 p-4">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;

