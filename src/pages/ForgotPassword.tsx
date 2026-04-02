import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/reset-password"
      });

      if (error) throw error;

      toast({
        title: t("success"),
        description: t("reset_email_sent"),
      });

      setEmail("");
    } catch {
      toast({
        title: t("error"),
        description: t("reset_email_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-white shadow-2xl shadow-slate-900/5 border border-slate-200 rounded-2xl overflow-hidden relative">
          <button
            type="button"
            onClick={() => navigate("/auth")}
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
              z-10
            "
            aria-label={t("back")}
          >
            <ArrowLeft size={18} />
          </button>
          <CardHeader className="text-center space-y-1 relative">
            <div className="flex justify-center mb-2">
              <Mail className="h-10 w-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 uppercase italic tracking-tight">
              {t("forgotpassword")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label className="block mb-2 text-sm font-medium text-slate-700 ml-1">
                  {t("email")}
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="h-10 bg-slate-50 border-slate-200 text-slate-900 focus:ring-4 focus:ring-blue-500/10 rounded-lg transition-all text-sm"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-slate-900 hover:bg-blue-600 text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-slate-900/10 hover:shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                disabled={loading}
              >
                {loading ? t("sending") + "..." : t("send_reset_link")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
