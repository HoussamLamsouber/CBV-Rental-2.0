import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  Users, 
  MapPin, 
  Warehouse,
  LogOut,
  Home,
  Globe,
  ChevronDown,
  User,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const AdminHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ 
        title: t("logout_success"), 
        description: t("see_you_soon") 
      });
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

  const navItems = [
    {
      path: "/admin/dashboard",
      label: t("admindashboard"),
      icon: LayoutDashboard,
    },
    {
      path: "/admin/vehicles",
      label: t("manage_vehicles"),
      icon: Car,
    },
    {
      path: "/admin/reservations",
      label: t("manage_reservations"),
      icon: Calendar,
    },
    {
      path: "/admin/users",
      label: t("manage_users"),
      icon: Users,
    },
    {
      path: "/admin/localisations",
      label: t("manage_localisations"),
      icon: MapPin,
    },
    {
      path: "/admin/depots",
      label: t("manage_depots"),
      icon: Warehouse,
    },
  ];

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-[14px] font-medium",
          isActive
            ? "bg-blue-600 text-white shadow-md shadow-blue-200"
            : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
      {/* En-tête du sidebar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-dark.webp" 
            alt="Logo" 
            className="h-8 md:h-10"
          />
          <div>
            <h1 className="text-[18px] font-bold text-slate-900">Administration</h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Panel de gestion</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}
      </nav>

      {/* Pied de page */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* Dropdown utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 p-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100 transition font-bold no-focus-ring">
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
                    "A"
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left truncate">
                {user?.user_metadata?.full_name || user?.email || t("my_account")}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl shadow-xl border-slate-100">
            <DropdownMenuItem asChild className="rounded-lg focus:bg-blue-50 focus:text-blue-700 py-2.5 no-focus-ring">
              <Link to="/admin/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg focus:bg-blue-50 focus:text-blue-700 py-2.5 no-focus-ring">
              <Link to="/changer-mot-de-passe" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                {t("change_password")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bouton de langue */}
        <Button
          variant="outline"
          onClick={toggleLanguage}
          className="w-full justify-start gap-3 h-11"
        >
          <Globe className="h-4 w-4" />
          <span className="flex-1 text-left">
            {i18n.language === "fr" ? "English" : "Français"}
          </span>
        </Button>

        {/* Bouton de déconnexion */}
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 h-11 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );
};