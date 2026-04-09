// src/pages/AdminUsers.tsx (version internationalisée)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ArrowLeft,
  Search,
  Mail,
  Phone,
  Calendar,
  Users,
  UserCog,
  Eye,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  telephone: string | null;
  role: string;
  created_at: string;
  last_sign_in_at?: string | null;
  adresse?: string | null;
  dateNaissance?: string | null;
  updated_at?: string | null;
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authLoading, adminLoading, isUserAdmin, user, role } = useAuth();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'admins' | 'clients'>('admins');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [allEmails, setAllEmails] = useState<{ email: string, full_name: string | null }[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");

  // Vérification des permissions admin
  if (authLoading || adminLoading) {
    return <LoadingSpinner message={t('admin_users.messages.checking_permissions')} />;
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('admin_users.access_denied')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('admin_users.admin_required')}
          </p>
          <Button onClick={() => navigate("/")}>{t('admin_users.back_to_home')}</Button>
        </div>
      </div>
    );
  }

  // Charger les profils
  useEffect(() => {
    loadProfiles();
  }, []);

  // Filtrer les profils
  useEffect(() => {
    const filtered = profiles.filter(profile => {
      const matchesSearch =
        profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (profile.full_name && profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (profile.telephone && profile.telephone.includes(searchTerm));

      if (activeTab === 'admins') {
        return matchesSearch && profile.role === 'admin';
      } else {
        return matchesSearch && profile.role === 'client';
      }
    });

    setFilteredProfiles(filtered);
  }, [searchTerm, profiles, activeTab]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      console.log("🔄 Chargement de tous les profils...");

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("❌ Erreur profils:", profilesError);
        throw profilesError;
      }

      console.log("✅ Profils chargés:", profilesData);
      setProfiles(profilesData || []);
      setFilteredProfiles(profilesData || []);

    } catch (error: any) {
      console.error("💥 Erreur chargement profils:", error);
      toast({
        title: t("error"),
        description: t('admin_users.messages.cannot_load_users'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (profileId: string, email: string, userRole: string) => {
    const roleText = userRole === 'admin' ? t('admin_users.roles.admin') : t('admin_users.roles.client');

    if (!confirm(t('admin_users.messages.confirm_delete_user', { email, role: roleText }))) {
      return;
    }

    try {
      const { error: invokeError } = await supabase.functions.invoke('delete-user', {
        body: { userId: profileId }
      });

      if (invokeError) throw invokeError;

      toast({
        title: t('admin_users.messages.user_deleted'),
        description: t('admin_users.messages.user_deleted_permanently', { email }),
      });

      await loadProfiles();

    } catch (rpcError: any) {
      toast({
        title: t("error"),
        description: t('admin_users.messages.cannot_delete_user'),
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return t('admin_users.messages.never');
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const adminsCount = profiles.filter(p => p.role === 'admin').length;
  const clientsCount = profiles.filter(p => p.role === 'client').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-[24px] font-semibold text-gray-900 mb-2">{t('admin_users.title')}</h1>
              <p className="text-gray-600 font-medium">
                {adminsCount} {t('admin_users.admin_count')} • {clientsCount} {t('admin_users.client_count')}
              </p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b mb-6">
          <div className="flex space-x-8">
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'admins'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              onClick={() => setActiveTab('admins')}
            >
              <UserCog className="h-4 w-4" />
              {t('admin_users.tabs.admins')} ({adminsCount})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'clients'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              onClick={() => setActiveTab('clients')}
            >
              <Users className="h-4 w-4" />
              {t('admin_users.tabs.clients')} ({clientsCount})
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder={t('admin_users.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tableau en vue liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message={t('admin_users.messages.loading_users')} />
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">
                        {t('admin_users.table.name')}
                      </th>

                      <th className="text-left px-4 py-3 font-semibold">
                        {t('admin_users.table.email')}
                      </th>

                      <th className="text-left px-4 py-3 font-semibold">
                        {t('admin_users.table.phone')}
                      </th>

                      <th className="text-left px-4 py-3 font-semibold">
                        {t('admin_users.table.role')}
                      </th>

                      <th className="text-left px-4 py-3 font-semibold">
                        {t('admin_users.table.registration_date')}
                      </th>

                      <th className="w-[120px] px-4 py-3 font-semibold text-center">
                        {t('admin_users.table.actions')}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProfiles.map(profile => (
                      <tr key={profile.id} className="border-b last:border-0">

                        {/* Name */}
                        <td className="px-4 py-3 font-medium">
                          {profile.full_name || t('admin_users.messages.not_provided')}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="truncate max-w-[200px]">
                              {profile.email}
                            </span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3">
                          {profile.telephone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {profile.telephone}
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              {t('admin_users.messages.not_provided')}
                            </span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          {profile.role === 'admin'
                            ? <Badge>{t('admin_users.roles.admin')}</Badge>
                            : <Badge variant="secondary">{t('admin_users.roles.client')}</Badge>
                          }
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {formatDateTime(profile.created_at)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="w-[120px] px-4 py-3">
                          <div className="flex justify-center gap-1">

                            <button
                              onClick={() => navigate(`/admin/reservations?user=${profile.id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('admin_users.actions.view_reservations')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(profile.id, profile.email, profile.role)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('admin_users.actions.delete_user')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message si aucun résultat */}
        {!loading && filteredProfiles.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('admin_users.messages.no_results_title', {
                  type: activeTab === 'admins' ? t('admin_users.tabs.admins') : t('admin_users.tabs.clients')
                })}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? t('admin_users.messages.no_search_results') :
                  activeTab === 'admins' ? t('admin_users.messages.no_admins_yet') : t('admin_users.messages.no_clients_yet')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}