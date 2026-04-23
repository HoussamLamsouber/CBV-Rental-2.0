import { Menu, X, LogOut, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, authLoading, isAuthenticated, isUserAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: t("logout_success"), description: t("see_you_soon") });
      navigate("/");
    } catch {
      toast({
        title: t("error"),
        description: t("logout_error"),
        variant: "destructive",
      });
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(newLang);
  };

  const navLink = (path: string, label: string) => (
    <Link
      to={path}
      className={cn(
        "text-sm font-bold uppercase tracking-wider transition-all duration-300",
        location.pathname === path
          ? "text-blue-600"
          : "text-gray-500 hover:text-blue-600"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-slate-100">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 transition-transform hover:scale-105 active:scale-95 duration-300">
          <img src="/logo-dark.webp" alt="Logo" className="h-8 md:h-12" />
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {navLink("/", t("home"))}
          {navLink("/offers", t("offers.nav"))}
          {navLink("/about", t("about"))}
          {navLink("/contact", t("contact.label"))}
        </nav>

        {/* Espace utilisateur + bouton langue */}
        <div className="flex items-center gap-3">
          {!authLoading && (
            <div className="hidden md:flex items-center">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100 transition font-bold no-focus-ring">
                      <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                        <AvatarImage
                          src={
                            user?.user_metadata?.avatar_url ||
                            "/images/default-avatar.png"
                          }
                          alt="Profil"
                        />
                        <AvatarFallback className="bg-blue-600 text-white font-bold">
                          {(
                            user?.user_metadata?.full_name?.[0] ||
                            user?.email?.[0] ||
                            "U"
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[120px] truncate">
                        {user?.user_metadata?.full_name || user?.email || t("my_account")}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border-slate-100">
                    <DropdownMenuItem asChild className="rounded-lg focus:bg-blue-50 focus:text-blue-700 py-2.5 no-focus-ring">
                      <Link to="/profile">{t("profile")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg focus:bg-blue-50 focus:text-blue-700 py-2.5 no-focus-ring">
                      <Link to="/my-reservation">{t("my_reservations")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg focus:bg-blue-50 focus:text-blue-700 py-2.5 no-focus-ring">
                      <Link to="/changer-mot-de-passe">{t("change_password")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-700 transition-colors py-3 no-focus-ring"
                    >
                      <LogOut className="h-4 w-4 mr-2" /> {t("logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-blue-600/20">
                  <Link to="/auth">{t("login")}</Link>
                </Button>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all rounded-full px-4"
          >
            <Globe size={18} className="opacity-70" />
            <span className="hidden sm:inline-block font-semibold text-xs uppercase tracking-widest">{i18n.language === "fr" ? "EN" : "FR"}</span>
          </Button>

          {/* Bouton menu mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-gray-900 hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 w-full md:hidden px-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col space-y-1">
              {navLink("/", t("home"))}
              {navLink("/offres", t("offers.nav"))}
              {navLink("/about", t("about"))}
              {navLink("/contact", t("contact.label"))}
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {!authLoading && isAuthenticated ? (
              <div className="space-y-3">
                <Link to="/profile" className="block text-sm font-semibold text-slate-600" onClick={() => setIsMenuOpen(false)}>{t("profile")}</Link>
                <Link to="/my-reservation" className="block text-sm font-semibold text-slate-600" onClick={() => setIsMenuOpen(false)}>{t("my_reservations")}</Link>
                <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 p-0 h-auto" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" /> {t("logout")}
                </Button>
              </div>
            ) : (
              <Button asChild className="w-full bg-blue-600 rounded-xl" onClick={() => setIsMenuOpen(false)}>
                <Link to="/auth">{t("login")}</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>

  );
};