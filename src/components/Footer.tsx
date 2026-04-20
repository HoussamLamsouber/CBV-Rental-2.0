import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(newLang);
  };

  return (
    <footer className="bg-slate-950 text-slate-400 mt-20 pt-20 pb-10 border-t border-slate-900 font-sans">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center transition-transform group-hover:rotate-6">
                <span className="text-white font-bold text-[10px]">CBV</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight uppercase">CBV RENTAL</h3>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              {t("footer_description")}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-6">{t("navigation")}</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link to="/" className="hover:text-blue-500 transition-colors">{t("home")}</Link></li>
              <li><Link to="/offers" className="hover:text-blue-500 transition-colors">{t("offers.nav")}</Link></li>
              <li><Link to="/about" className="hover:text-blue-500 transition-colors">{t("about")}</Link></li>
              <li><Link to="/contact" className="hover:text-blue-500 transition-colors">{t("contact.label")}</Link></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-6">Contact & Info</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-blue-500" />
                <span className="text-white font-semibold">+212 6 65 29 13 14</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-blue-500" />
                <span>contact@cbvrental.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-blue-500 mt-1 shrink-0" />
                <span>Gare TGV, Tanger, {t("morocco")}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; {currentYear} CBV RENTAL. All rights reserved.</p>
          <div className="flex gap-6 uppercase tracking-widest font-bold">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>

  );
};
