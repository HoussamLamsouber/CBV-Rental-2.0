import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { motion } from "framer-motion";
import { Car, Headphones, Train, Shield, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow pt-24">
        {/* --- Hero Section --- */}
        <section className="relative py-20 bg-slate-50/50">
          <div className="container mx-auto px-6 text-center">
            <motion.h1 
              {...fadeIn}
              className="text-[32px] font-bold text-slate-900 tracking-tight italic mb-6"
            >
              {t("about_page.title")}
            </motion.h1>
            <motion.p 
              {...fadeIn}
              className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
            >
              {t("about_page.subtitle")}
            </motion.p>
          </div>
        </section>

        {/* --- Main Content Section (Cards) --- */}
        <section className="py-20 bg-slate-50/50">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Car, title: t("about_page.card1.title"), text: t("about_page.card1.text") },
                { icon: Headphones, title: t("about_page.card2.title"), text: t("about_page.card2.text") },
                { icon: Train, title: t("about_page.card3.title"), text: t("about_page.card3.text") },
                { icon: Shield, title: t("about_page.card4.title"), text: t("about_page.card4.text") },
                { icon: Clock, title: t("about_page.card5.title"), text: t("about_page.card5.text") },
                { icon: MapPin, title: t("about_page.card6.title"), text: t("about_page.card6.text") }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  {...fadeIn} 
                  whileHover={{ y: -5 }}
                  className="h-full"
                >
                  <Card className="h-full border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-[2rem] overflow-hidden bg-gradient-to-br from-white to-blue-50 hover:to-blue-100">
                    <CardContent className="p-8 space-y-6 flex flex-col h-full">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <item.icon className="h-7 w-7 text-blue-600" />
                      </div>
                      <div className="space-y-4 flex-grow">
                        <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* --- Action Section --- */}
            <motion.div {...fadeIn} className="pt-16 text-center">
              <Link to="/offres">
                <Button size="lg" className="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {t("about_page.button")}
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
