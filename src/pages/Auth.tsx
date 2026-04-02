// src/pages/Auth.tsx (version mobile optimisée et internationalisée)
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, UserPlus, Eye, EyeOff, User, Mail, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const isValidPassword = signupPassword.length >= 8 && /[A-Z]/.test(signupPassword);
  const passwordsMatch = signupPassword !== "" && signupPassword === confirmPassword;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: t('auth.messages.missing_field'),
        description: t('auth.messages.enter_full_name'),
        variant: "destructive",
      });
      return;
    }

    if (!signupEmail.trim()) {
      toast({
        title: t('auth.messages.missing_field'),
        description: t('auth.messages.enter_email'),
        variant: "destructive",
      });
      return;
    }

    if (!isValidPassword) {
      toast({
        title: t('auth.messages.invalid_password'),
        description: t('auth.errors.password_rules'),
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: t('auth.messages.signup_error', 'Sign up error'),
        description: t('auth.errors.password_mismatch'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("Tentative d'inscription pour:", signupEmail);
      
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
          },
        }
      });

      console.log("Réponse Supabase:", { data, error });

      if (error) {
        console.error("Erreur d'inscription:", error);
        
        if (error.message?.includes("already registered") || error.code === 'user_already_exists') {
          toast({
            title: t('auth.messages.existing_account'),
            description: t('auth.messages.email_already_used'),
            variant: "destructive",
          });
        } else if (error.message?.includes("password")) {
          toast({
            title: t('auth.messages.invalid_password'),
            description: t('auth.messages.password_min_length'),
            variant: "destructive",
          });
        } else if (error.message?.includes("email")) {
          toast({
            title: t('auth.messages.invalid_email'),
            description: t('auth.messages.enter_valid_email'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.messages.signup_error'),
            description: error.message || t('auth.messages.unexpected_error'),
            variant: "destructive",
          });
        }
      } else {
        console.log("Inscription réussie, données:", data);
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast({
            title: t('auth.messages.existing_account'),
            description: t('auth.messages.email_already_used'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.messages.signup_success'),
            description: t('auth.messages.account_created_success'),
          });
          
          // Réinitialiser le formulaire
          setSignupEmail("");
          setSignupPassword("");
          setConfirmPassword("");
          setFullName("");
          setShowSignupPassword(false);
          setShowConfirmPassword(false);
          
          // Basculer vers l'onglet connexion
          setTimeout(() => {
            const loginTrigger = document.querySelector('[value="login"]') as HTMLElement;
            if (loginTrigger) {
              loginTrigger.click();
            }
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      toast({
        title: t('auth.messages.unexpected_error_title'),
        description: error.message || t('auth.messages.unexpected_error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast({
        title: t('auth.messages.missing_fields'),
        description: t('auth.messages.enter_email_password'),
        variant: "destructive",
      });
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("Tentative de connexion pour:", loginEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });
  
      console.log("Réponse connexion Supabase:", { data, error });
  
      if (error) {
        console.error("Erreur de connexion:", error);
        
        if (error.message?.includes("Invalid login credentials")) {
          toast({
            title: t('auth.messages.invalid_credentials'),
            description: t('auth.messages.incorrect_email_password'),
            variant: "destructive",
          });
        } else if (error.message?.includes("Email not confirmed")) {
          toast({
            title: t('auth.messages.email_not_confirmed'),
            description: t('auth.messages.verify_email'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.messages.login_error'),
            description: error.message || t('auth.messages.unexpected_error'),
            variant: "destructive",
          });
        }
      } else {
        console.log("Connexion réussie:", data);
        
        // Récupérer le nom complet depuis les metadata utilisateur
        const userName = data.user?.user_metadata?.full_name || data.user?.email || '';
        
        toast({
          title: t('auth.messages.login_success'),
          description: t('auth.messages.welcome', { name: userName }),
        });
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      toast({
        title: t("error"),
        description: error.message || t('auth.messages.unexpected_error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    // Réinitialiser les champs quand on change d'onglet
    setLoginEmail("");
    setLoginPassword("");
    setSignupEmail("");
    setSignupPassword("");
    setConfirmPassword("");
    setFullName("");
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen flex overflow-y-auto bg-white">
      {/* Left Design Side (Desktop only) */}
      <div className="hidden lg:flex w-1/2 min-h-screen sticky top-0 relative overflow-hidden bg-slate-950 items-center justify-center p-12">
        <div className="absolute inset-0 z-0 opacity-20">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.2),transparent_70%)]" />
           <div className="absolute w-full h-full bg-[url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80')] bg-cover bg-center" />
        </div>
        
        <div className="relative z-10 max-w-lg space-y-8">
           <Link to="/" className="flex items-center gap-3 group">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12">
               <span className="text-white font-bold text-xs">CBV</span>
             </div>
             <h3 className="text-2xl font-bold text-white tracking-tighter italic uppercase underline decoration-blue-500 decoration-4 underline-offset-8">CBV RENTAL</h3>
           </Link>
           
           <h2 className="text-[32px] font-bold text-white leading-tight tracking-tight">
             EXPLORE THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">PREMIUM</span> WAY OF TRAVEL.
           </h2>
           
           <p className="text-slate-400 text-[14px] font-normal leading-relaxed">
             Join our community of travelers and experience the road like never before. Exclusive cars, seamless booking, and royal treatment.
           </p>

           <div className="grid grid-cols-2 gap-6 pt-8">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                 <p className="text-[24px] font-bold text-white mb-1">2.5k+</p>
                 <p className="text-[12px] font-normal text-slate-400 uppercase tracking-widest">Happy Clients</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                 <p className="text-[24px] font-bold text-white mb-1">500+</p>
                 <p className="text-[12px] font-normal text-slate-400 uppercase tracking-widest">Premium Cars</p>
              </div>
           </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-[#f8fafc]">
        <div className="w-full max-w-md flex flex-col animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="space-y-3">
            <h1 className="text-[32px] mt-10 mb-1 font-bold text-slate-900 tracking-tight uppercase">{t('auth.title')}</h1>
          </div>

          <Tabs defaultValue="login" onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-100/50 backdrop-blur-sm border border-slate-200 rounded-lg p-1 mb-6">
              <TabsTrigger value="login" className="rounded-md font-bold text-[13px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">
                <LogIn className="h-3.5 w-3.5 mr-2" />
                {t('auth.tabs.login')}
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-md font-bold text-[13px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                {t('auth.tabs.signup')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0">
              <div className="min-h-[450px] flex flex-col justify-center">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-slate-700 ml-1">{t('auth.fields.email')}</Label>
                    <div className="relative group overflow-visible">
                      <Input
                        id="login-email"
                        type="email"
                        placeholder={t('auth.placeholders.email')}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 transition-all pl-10 text-sm"
                        autoComplete="email"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-slate-700 ml-1">{t('auth.fields.password')}</Label>
                    <div className="relative group overflow-visible">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder={t('auth.placeholders.password')}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 transition-all pl-10 pr-12 text-sm"
                        autoComplete="current-password"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={loading}
                      >
                        {showLoginPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs font-normal uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      {t("forgot_password")}
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-10 bg-slate-900 text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50" 
                    disabled={loading}
                  >
                    {loading ? t('auth.buttons.logging_in') : t('auth.buttons.login')}
                  </Button>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => navigate("/admin")}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors underline underline-offset-4"
                    >
                      {t('auth.admin_link.button')}
                    </button>
                  </div>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-2">
              <div className="min-h-[400px] flex flex-col justify-start">
                <form onSubmit={handleSignUp} className="flex flex-col justify-between h-full max-h-[550px]">
                  <div className="overflow-visible flex flex-col gap-2 py-2 px-0.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-fullname" className="text-sm font-medium text-slate-700 ml-1">{t('auth.fields.full_name')} *</Label>
                      <div className="relative group overflow-visible">
                        <Input
                          id="signup-fullname"
                          type="text"
                          placeholder={t('auth.placeholders.full_name')}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          disabled={loading}
                          className="h-10 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 transition-all pl-10 text-sm"
                          autoComplete="name"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <User className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email" className="text-sm font-medium text-slate-700 ml-1">{t('auth.fields.email')} *</Label>
                      <div className="relative group overflow-visible">
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder={t('auth.placeholders.email')}
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          disabled={loading}
                          className="h-10 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 transition-all pl-10 text-sm"
                          autoComplete="email"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-sm font-medium text-slate-700 ml-1">{t('auth.fields.password')} *</Label>
                      <div className="relative group overflow-visible">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder={t('auth.placeholders.password_min_length')}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          minLength={6}
                          disabled={loading}
                          className="h-10 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 transition-all pl-10 pr-12 text-sm"
                          autoComplete="new-password"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          disabled={loading}
                        >
                          {showSignupPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="min-h-[20px] mt-1 pl-1">
                        {signupPassword && !isValidPassword && (
                          <p className="text-red-500 text-[10px] sm:text-xs">
                            {t('auth.errors.password_rules')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm-password" className="text-sm font-medium text-slate-700 ml-1">{t('auth.confirm_password')} *</Label>
                      <div className="relative group overflow-visible">
                        <Input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t('auth.confirm_password')}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          disabled={loading}
                          className={`h-10 bg-white border-slate-200 rounded-lg focus:ring-4 transition-all pl-10 pr-12 text-sm ${
                            confirmPassword 
                              ? signupPassword === confirmPassword 
                                 ? 'border-green-500 focus:ring-green-500/10' 
                                 : 'border-red-500 focus:ring-red-500/10'
                              : 'focus:ring-blue-500/10'
                          }`}
                          autoComplete="new-password"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ShieldCheck className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          disabled={loading}
                        >
                          {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="min-h-[20px] mt-1 pl-1">
                        {confirmPassword && !passwordsMatch && (
                          <p className="text-red-500 text-[10px] sm:text-xs">
                            {t('auth.errors.password_mismatch')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-auto">
                    <Button 
                      type="submit" 
                      className="w-full h-10 bg-slate-900 text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50" 
                      disabled={loading || !isValidPassword || !passwordsMatch}
                    >
                      {loading ? t('auth.buttons.signing_up') : t('auth.buttons.signup')}
                    </Button>

                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => navigate("/admin")}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors underline underline-offset-4"
                      >
                        {t('auth.admin_link.button')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  );
};

export default Auth;