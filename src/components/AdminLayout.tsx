import { ReactNode } from "react";
import { AdminHeader } from "./AdminHeader";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { authLoading, adminLoading, isUserAdmin } = useAuth();
  const { t } = useTranslation();

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
    <div className="flex min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="flex-1 ml-64 overflow-auto px-6">
        {children}
      </main>
    </div>
  );
};