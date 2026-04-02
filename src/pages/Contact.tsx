import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function Contact() {
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
      
      <main className="flex-grow pt-24 pb-16">
        {/* Header Section */}
        <section className="py-16 mb-12">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
              <h1 className="text-[32px] font-bold text-slate-900 mb-6 tracking-tight italic">
                {t('contact.title')}
              </h1>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                {t('contact.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Column: Contact Info */}
          <motion.div {...fadeIn} className="bg-blue-50 rounded-[2rem] border border-slate-100 p-8 shadow-sm h-full">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">{t('contact.logo_text')}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{t('contact.brand_name')}</h2>
            </div>
            
            <div className="space-y-8">
              {/* Address */}
              <div className="flex gap-5">
                <div className="shrink-0 w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('contact.address')}</h3>
                  <p className="text-slate-900 font-bold">{t('about_page.station_tangier')}</p>
                  <p className="text-slate-500 text-xs font-semibold">{t('morocco')}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex gap-5">
                <div className="shrink-0 w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('contact.phone')}</h3>
                  <p className="text-slate-700 font-bold text-lg">
                    {t('contact.phone_display')}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex gap-5">
                <div className="shrink-0 w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('about_page.email_support')}</h3>
                  <p className="text-slate-700 font-bold">
                    {t('contact.email')}
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('contact.hours')}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium">{t('monday_friday')}</span>
                    <span className="text-slate-900 font-bold">{t('contact.hours_weekday')}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium">{t('saturday')}</span>
                    <span className="text-slate-900 font-bold">{t('contact.hours_saturday')}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 font-medium">{t('sunday')}</span>
                    <span className="text-slate-900 font-bold">{t('contact.hours_sunday')}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Map Section */}
          <motion.div {...fadeIn} className="rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm h-full min-h-[500px] relative group">
            <div className="p-6 bg-blue-50 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{t('contact.location')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('contact.locationDescription')}</p>
            </div>
            <iframe
              title={t('contact.mapTitle')}
              width="100%"
              height="100%"
              loading="lazy"
              allowFullScreen
              className="border-0 grayscale hover:grayscale-0 transition-all duration-1000 min-h-[400px]"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3234.0965461072135!2d-5.902518524177639!3d35.80101057245095!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd0b793b5b197351%3A0x19a1726633563973!2sGare%20Tanger%20Ville%20(TGV)!5e0!3m2!1sfr!2sma!4v1700000000000"
            />
            <div className="absolute bottom-4 left-0 right-0 px-6 pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-100 shadow-lg text-center opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-semibold text-slate-600">{t('contact.mapHelp')}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
