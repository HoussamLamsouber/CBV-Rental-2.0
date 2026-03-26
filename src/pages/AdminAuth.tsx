import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Car, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useTranslation } from "react-i18next";

const AdminLogin = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin/vehicles");
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          title: t("admin_login.error_login"),
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        const { data: profile, error: roleError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (roleError || !profile || profile.role !== "admin") {
          await supabase.auth.signOut();
          toast({
            title: t("error"),
            description: t("admin_login.error_unauthorized"),
            variant: "destructive",
          });
          return;
        }

        toast({
          title: t("admin_login.success_title"),
          description: t("admin_login.success_message"),
        });
        navigate("/admin/dashboard");
      }
    } catch {
      toast({
        title: t("error"),
        description: t("admin_login.error_generic"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/10">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/10">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tighter uppercase italic">CBV Rental</h1>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em] mt-3">
            {t("admin_login.access_restricted")}
          </p>
        </div>

        <Card className="shadow-2xl shadow-slate-900/5 border-slate-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 uppercase tracking-tight">
              <Shield className="h-5 w-5 text-blue-600" />
              {t("admin_login.title")}
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm mt-1">
              {t("admin_login.description")}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 ml-1">
                  {t("admin_login.email_label")}
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@cbvrental.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 ml-1">
                  {t("admin_login.password_label")}
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-slate-900/10 hover:bg-blue-600 hover:shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                disabled={loading}
              >
                {loading ? t("admin_login.button_loading") : t("admin_login.button_login")}
              </Button>
            </form>

            <div className="pt-6 border-t border-slate-100">
              <Button
                variant="ghost"
                className="w-full h-11 text-slate-500 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 hover:text-blue-600"
                onClick={() => navigate("/auth")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("admin_login.back_button")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
