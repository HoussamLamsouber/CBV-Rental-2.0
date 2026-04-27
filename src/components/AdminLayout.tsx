import { ReactNode, useState, useEffect } from "react";
import { AdminHeader } from "./AdminHeader";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { authLoading, adminLoading, isUserAdmin } = useAuth();
  const { t } = useTranslation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (authLoading || adminLoading) {
    return <LoadingSpinner message={t('admin_users.messages.checking_permissions')} />;
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('admin_users.access_denied')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('admin_users.admin_required')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row relative">
      {/* En-tête Mobile (visible que sur mobile) */}
      <div className="md:hidden flex h-16 w-full items-center justify-between px-4 bg-white border-b sticky top-0 z-30 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-dark.webp" 
            alt="Logo" 
            className="h-8"
          />
          <h1 className="text-lg font-bold text-slate-900">Admin</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-6 w-6 text-slate-700" />
        </Button>
      </div>

      {/* Ombre portée pour mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm md:hidden transition-opacity" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar (AdminHeader) */}
      <AdminHeader 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Contenu principal */}
      <main 
        className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-6 transition-all duration-300 w-full",
          "ml-0 md:ml-64"
        )}
      >
        <div className="py-6">
          {children}
        </div>
      </main>
    </div>
  );
};