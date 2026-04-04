import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast({
        title: t("error"),
        description: t("password_mismatch"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // ✅ Message de succès avec compte à rebours
      setCountdown(3);
      toast({
        title: t("success"),
        description: `${t("password_updated_success")} (${t("redirecting_in")} 3s...)`,
      });

      setPassword("");
      setConfirm("");
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

  // 🔁 Gestion du compte à rebours et redirection
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      navigate("/login", { replace: true });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-[#e8f1ff] shadow-md border border-blue-100 rounded-2xl">
          <CardHeader className="text-center space-y-1">
            <div className="flex justify-center mb-2">
              <Lock className="h-10 w-10 text-blue-700" />
            </div>
            <CardTitle className="text-2xl font-semibold text-blue-900">
              {t("reset_password")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Label className="block mb-1 text-sm font-medium text-slate-700 ml-1">
                  {t("new_password")}
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                />
              </div>

              <div>
                <Label className="block mb-1 text-sm font-medium text-slate-700 ml-1">
                  {t("confirm_password")}
                </Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="h-10 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                />
              </div>

              <Button
                type="submit"
                className="w-auto px-4 mx-auto flex items-center justify-center h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-slate-900/10 transition-all"
                disabled={loading}
              >
                {loading ? t("saving") + "..." : t("update_password")}
              </Button>

              {countdown !== null && (
                <p className="text-center text-sm text-blue-800 mt-2">
                  ✅ {t("redirecting_in")} {countdown}s...
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
