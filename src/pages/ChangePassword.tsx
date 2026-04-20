import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";


export default function ChangePassword() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // États séparés pour la visibilité de chaque champ
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();
  const { isUserAdmin } = useAuth();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: t("error"),
        description: t("password_mismatch"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: t("success"),
        description: t("password_updated_success"),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({
        title: t("error"),
        description: t("password_update_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        {/* Carte à fond blanc discret */}
        <Card className="w-full max-w-md bg-white shadow-2xl shadow-slate-900/5 border border-slate-200 rounded-2xl overflow-hidden relative">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              absolute left-4 top-4
              h-9 w-9
              flex items-center justify-center
              rounded-full
              bg-slate-900
              text-white
              hover:bg-blue-600
              outline-none
              shadow-lg shadow-slate-900/10
              transition-all duration-300 hover:scale-110
              z-20
            "
            aria-label={t("back")}
          >
            <ArrowLeft size={18} />
          </button>
          <CardHeader className="text-center space-y-1 relative">
            <div className="flex justify-center mb-2">
              <Lock className="h-10 w-10 text-blue-600" />
            </div>

            <CardTitle className="text-2xl font-bold text-slate-900 uppercase italic tracking-tight">
              {t("changepassword")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Mot de passe actuel */}
              <div>
                <label className="block mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {t("current_password")}
                </label>
                <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 h-12 pr-10 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showCurrent ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {t("new_password")}
                </label>
                <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 h-12 pr-10 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>
              </div>

              {/* Confirmation du mot de passe */}
              <div>
                <label className="block mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  {t("confirm_password")}
                </label>
                <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 h-12 pr-10 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>
              </div>

              <CardFooter className="p-0 mt-4">
                <Button
                  type="submit"
                  className="w-fit px-8 mx-auto h-12 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  disabled={loading}
                >
                  {loading ? t("saving") + "..." : t("update_password")}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
