import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Shield, Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/AdminLayout";
import { Header } from '@/components/Header';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  adresse: string;
  telephone: string;
  dateNaissance: string;
  role: string;
}

const initialUserInfo: UserProfile = {
  id: "",
  email: "",
  full_name: "",
  adresse: "",
  telephone: "",
  dateNaissance: "",
  role: "",
};

const MonCompte = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isUserAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState<UserProfile>(initialUserInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getNames = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.length > 1 ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    return { firstName, lastName };
  };

  const getProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({ 
        title: t('mon_compte.messages.access_denied'), 
        description: t('mon_compte.messages.please_login'), 
        variant: "destructive" 
      });
      navigate("/auth");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`id, email, full_name, adresse, telephone, dateNaissance, role`)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Erreur de chargement du profil:", error);
      toast({ 
        title: t("error"), 
        description: t('mon_compte.messages.cannot_load_profile'), 
        variant: "destructive" 
      });
    } else if (data) {
      setUserInfo({
        id: data.id,
        email: data.email || user.email || '',
        full_name: data.full_name || '',
        adresse: data.adresse || '',
        telephone: data.telephone || '',
        dateNaissance: data.dateNaissance || '',
        role: data.role || 'client',
      });
    }
    setLoading(false);
  }, [navigate, toast, t]);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  const handleSave = async () => {
    setSaving(true);

    if (!userInfo.id) {
      toast({ 
        title: t("error"), 
        description: t('mon_compte.messages.missing_user_id'), 
        variant: "destructive" 
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: userInfo.full_name,
        email: userInfo.email,
        adresse: userInfo.adresse,
        telephone: userInfo.telephone,
        dateNaissance: userInfo.dateNaissance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userInfo.id);

    if (error) {
      console.error("Erreur de sauvegarde:", error);
      toast({ 
        title: t("error"), 
        description: t('mon_compte.messages.save_failed'), 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: t('mon_compte.messages.profile_updated'), 
        description: t('mon_compte.messages.profile_saved_success') 
      });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserInfo(prev => ({ ...prev, [id as keyof UserProfile]: value }));
  };

  const PublicLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {children}
    </div>
  );

  // Contenu de la page profil
  const ProfileContent = () => {
    if (loading && !userInfo.id) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
          <LoadingSpinner message={t('mon_compte.messages.loading_profile')} />
        </div>
      );
    }

    const { firstName, lastName } = getNames(userInfo.full_name);
    const avatarFallbackText = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;

    return (
      <div className={isUserAdmin ? "p-4 lg:p-10" : "min-h-screen bg-[#f8fafc] pt-32"}>
        <div className={isUserAdmin ? "max-w-5xl mx-auto space-y-10" : "container mx-auto px-6 max-w-5xl space-y-10"}>
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-blue-600/20 rounded-2xl blur-lg transition duration-700"></div>
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl relative overflow-hidden">
                  <AvatarFallback className="bg-slate-50 text-blue-600 font-bold text-xl sm:text-2xl italic">
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <h1 className="text-[32px] font-bold text-slate-900 tracking-tight uppercase">
                     {userInfo.full_name || "Utilisateur"}
                   </h1>
                   {userInfo.role === 'admin' && (
                     <Badge className="bg-slate-900 border-none text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg">
                       Admin
                     </Badge>
                   )}
                </div>
                 <div className="flex flex-wrap items-center gap-4 text-slate-600">
                     <div className="flex items-center gap-2 text-[12px] font-normal uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-md">
                        <Mail className="w-3 h-3 text-blue-600" />
                        {userInfo.email}
                     </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
               <Button 
                 onClick={() => {
                   if(isEditing) getProfile();
                   setIsEditing(!isEditing);
                 }}
                 variant={isEditing ? "ghost" : "outline"}
                 className="h-11 px-6 rounded-xl font-bold text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all"
               >
                 {isEditing ? t('mon_compte.actions.cancel') : t('mon_compte.actions.edit')}
               </Button>
               {isEditing && (
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-[14px] uppercase tracking-wider shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all"
                  >
                    {saving ? t('mon_compte.actions.saving') : t('mon_compte.actions.save')}
                  </Button>
               )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            {/* Main Info Card */}
            <div className="lg:col-span-2 space-y-8">
               <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                 <CardHeader className="p-8 pb-0">
                    <div className="flex items-center gap-3">
                       <div className="w-1 h-5 bg-blue-600 rounded-full" />
                       <CardTitle className="text-[18px] font-semibold uppercase tracking-wider text-slate-900">
                         {t('mon_compte.personal_info')}
                       </CardTitle>
                    </div>
                 </CardHeader>
                 <CardContent className="p-8 pt-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                           <Label className="text-[14px] font-medium uppercase tracking-wider text-slate-600 ml-1">{t('mon_compte.fields.full_name')}</Label>
                           <div className="relative group">
                              <Input
                                 id="full_name"
                                 value={userInfo.full_name}
                                 onChange={handleChange}
                                 disabled={!isEditing}
                                 placeholder={t('mon_compte.placeholders.full_name') || "Votre nom complet"}
                                 className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all pl-10 disabled:opacity-100 disabled:cursor-default text-black"
                              />
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[14px] font-medium uppercase tracking-wider text-slate-600 ml-1">{t('mon_compte.fields.birth_date')}</Label>
                           <div className="relative group">
                             <Popover>
                               <PopoverTrigger asChild>
                                 <Button
                                   disabled={!isEditing}
                                   variant="outline"
                                   className={cn(
                                     "h-11 w-full justify-start text-[14px] font-normal rounded-xl bg-slate-50/50 transition-all pl-10 hover:bg-white hover:text-gray-400 focus:ring-4 focus:ring-blue-500/5 transition-all focus-visible:ring-4 focus-visible:ring-blue-500/5 focus:bg-white disabled:opacity-100 disabled:cursor-default border-none text-black",
                                     !userInfo.dateNaissance && "text-slate-400"
                                   )}
                                 >
                                   {userInfo.dateNaissance ? format(new Date(userInfo.dateNaissance), "dd/MM/yyyy") : (t('mon_compte.placeholders.birth_date') || (i18n.language === 'fr' ? "Date de naissance" : "Birth Date"))}
                                 </Button>
                               </PopoverTrigger>
                               <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-100" align="start">
                                 <Calendar
                                   mode="single"
                                   selected={userInfo.dateNaissance ? new Date(userInfo.dateNaissance) : undefined}
                                   onSelect={(date) => {
                                     setUserInfo(prev => ({ ...prev, dateNaissance: date ? date.toISOString().split('T')[0] : '' }));
                                   }}
                                   disabled={(date) => date > new Date()}
                                   captionLayout="dropdown-buttons"
                                   fromYear={1934}
                                   toYear={new Date().getFullYear()}
                                   initialFocus
                                 />
                               </PopoverContent>
                             </Popover>
                             <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[14px] font-medium uppercase tracking-wider text-slate-600 ml-1">{t('mon_compte.fields.phone')}</Label>
                          <div className="relative group">
                             <Input
                                id="telephone"
                                value={userInfo.telephone}
                                onChange={handleChange}
                                disabled={!isEditing}
                                placeholder={t('mon_compte.placeholders.phone')}
                                className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all pl-10 text-black"
                             />
                             <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                       </div>

                        <div className="space-y-2 md:col-span-2">
                           <Label className="text-[14px] font-medium uppercase tracking-wider text-slate-600 ml-1">{t('mon_compte.fields.address')}</Label>
                          <div className="relative group">
                             <Input
                                id="adresse"
                                value={userInfo.adresse}
                                onChange={handleChange}
                                disabled={!isEditing}
                                placeholder={t('mon_compte.placeholders.address')}
                                className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all pl-10 text-black"
                             />
                             <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                       </div>
                    </div>
                 </CardContent>
               </Card>
            </div>

          </div>
        </div>
        {!isUserAdmin && <Footer />}
      </div>
    );
  };

  // Si l'utilisateur est admin, utiliser AdminLayout, sinon afficher normalement (sans Header car géré par App.tsx)
  if (isUserAdmin) {
    return (
      <AdminLayout>
        <ProfileContent />
      </AdminLayout>
    );
  }

  // Pour les clients, afficher seulement le contenu (le Header est géré par App.tsx)
  return (
    <PublicLayout>
      <ProfileContent />
    </PublicLayout>
  );
};

export default MonCompte;