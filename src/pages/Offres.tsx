import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Tag, Calendar, X, ArrowRight, Clock } from "lucide-react";

interface Car {
  id: string;
  name: string;
  category: string;
  transmission?: string;
  price: number;
  image_url: string;
  fuel?: string;
  seats?: number;
}

interface CarOffer {
  period: string;
  price: {
    value: number;
    fr: string;
    en: string;
  };
}

interface OfferRecord {
  id: string;
  car_id: string;
  period: string;
  price: number;
  price_label_fr: string;
  price_label_en: string;
}

const OffersModal = ({ 
  isOpen, 
  onClose, 
  currentCar, 
  currentCarOffers, 
  currentCarSpecialOffer,
  getTranslatedPeriod, 
  i18n, 
  t 
}: {
  isOpen: boolean;
  onClose: () => void;
  currentCar: Car | null;
  currentCarOffers: CarOffer[];
  currentCarSpecialOffer: SpecialOffer | null;
  getTranslatedPeriod: (p: string) => string;
  i18n: any;
  t: any;
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // 1. ROBUST Scroll Lock & Shift Prevention
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Save original styles
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPadding = document.body.style.paddingRight;

    // Lock both html and body (ensures coverage for different browser/OS behaviors)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;

    // Cleanup on Unmount or close
    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalBodyPadding;
    };
  }, [isOpen]);

  if (!isOpen || !currentCar) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 pb-2 shrink-0">
           <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-6 right-6 h-10 w-10 rounded-full bg-slate-50 hover:bg-slate-100">
             <X className="h-5 w-5 text-slate-400" />
           </Button>
           
           <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg shadow-blue-600/10">
                 <img src={currentCar.image_url} alt={currentCar.name} className="w-full h-full object-cover" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">{t(`offers_page.categories.${currentCar.category}`)}</p>
                 <h2 className="text-2xl font-bold text-slate-900 italic tracking-tight">{currentCar.name}</h2>
              </div>
           </div>
        </div>

        <div className="p-6 pt-2 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
           <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex items-center justify-between">
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("offers_page.standardRate")}</p>
                 <p className="text-xs font-bold text-slate-900">{t("offers_page.dailyRental")}</p>
              </div>
              <div className="text-right">
                 <p className="text-3xl font-bold text-slate-900 leading-none">{currentCar.price}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">MAD/{t("offers_page.day")}</p>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                 {t("offers_page.specialOffers")}
              </h3>

              {!currentCarSpecialOffer && currentCarOffers.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t("offers_page.noSpecialOffers")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCarSpecialOffer && (
                    <div className="group flex items-center justify-between p-5 bg-red-50 border-2 border-red-500 rounded-xl transition-all hover:shadow-lg hover:shadow-red-500/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-red-600 uppercase tracking-tight">
                            {currentCarSpecialOffer.period}
                          </span>
                          {currentCarSpecialOffer.badge_text && (
                            <span className="block text-[10px] mt-0.5 font-bold text-red-500 uppercase tracking-widest">
                              {currentCarSpecialOffer.badge_text}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="block text-xl font-bold text-red-600">
                           {currentCarSpecialOffer.price}
                         </span>
                         <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                            MAD
                          </span>
                      </div>
                    </div>
                  )}

                  {currentCarOffers.map((offer, idx) => (
                    <div key={idx} className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-slate-900 uppercase tracking-tight">
                            {getTranslatedPeriod(offer.period)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="block text-xl font-bold text-blue-600">
                           {offer.price.value}
                         </span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            MAD/
                            {i18n.language === "fr"
                              ? offer.price.fr || offer.price.en
                              : offer.price.en || offer.price.fr}
                          </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>

           <Button asChild className="w-full h-16 bg-slate-900 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-blue-600 transition-all">
              <Link to="/" onClick={onClose}>
                 {t("offers_page.bookNow")}
              </Link>
           </Button>
        </div>
      </div>
    </div>
  );
};

type SpecialOffer = {
  id: string;
  car_id: string;
  title: string;
  description: string | null;
  price: number;
  period: string;
  start_date: string;
  end_date: string;
  badge_text: string | null;
  highlight_color: string | null;
  is_active: boolean;
  is_deleted: boolean;
};

const Offres = () => {
  const { t, i18n } = useTranslation();
  const [cars, setCars] = useState<Car[]>([]);
  const [offers, setOffers] = useState<Record<string, CarOffer[]>>({});
  const [specialOffers, setSpecialOffers] = useState<Record<string, SpecialOffer>>({});
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        // 1. Récupérer les modèles disponibles avec stock > 0
        const { data: carsData, error: carsError } = await supabase
          .from("cars")
          .select("*")
          .is("is_deleted", false)
          .eq("available", true)
          .gt("quantity", 0);

        if (carsError) throw carsError;

        // 2. Double filtrage en JS par sécurité et logging
        const filteredCars = (carsData || []).filter(v => {
          const s = Number(v.quantity);
          return s > 0;
        });

        setCars(filteredCars as Car[]);
      } catch (error) {
        console.error("Erreur lors du chargement des véhicules:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  useEffect(() => {
    const fetchOffers = async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .is("is_deleted", false);

      if (error) {
        console.error("Erreur fetch offers:", error);
        return;
      }

      const records = data as OfferRecord[];
      const map: Record<string, CarOffer[]> = {};

      records.forEach((o) => {
        if (!map[o.car_id]) map[o.car_id] = [];

        map[o.car_id].push({
          period: o.period,
          price: {
            value: o.price,
            fr: o.price_label_fr,
            en: o.price_label_en
          }
        });
      });

      // Sort each car's offers numerically by the leading number in the period label
      const getMinDays = (periodJson: string): number => {
        try {
          const obj = typeof periodJson === "string" ? JSON.parse(periodJson) : periodJson;
          const label: string = obj.fr || obj.en || "";
          const match = label.match(/\d+/);
          return match ? parseInt(match[0], 10) : Infinity;
        } catch {
          return Infinity;
        }
      };

      Object.keys(map).forEach((carId) => {
        map[carId].sort((a, b) => getMinDays(a.period) - getMinDays(b.period));
      });

      setOffers(map);
    };

    const fetchSpecialOffers = async () => {
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("is_deleted", false);

      if (error) {
        console.error("Erreur fetch special_offers:", error);
        return;
      }

      console.log("SPECIAL OFFERS:", data);

      if (data) {
        const records = data as SpecialOffer[];
        const specialOffersMap: Record<string, SpecialOffer> = {};
        const now = new Date();
        
        records.forEach((offer) => {
          if (!offer.is_active) return;
          const start = new Date(offer.start_date);
          const end = new Date(offer.end_date);
          
          if (start <= now && end >= now) {
            if (!specialOffersMap[offer.car_id]) {
              specialOffersMap[offer.car_id] = offer;
            }
          }
        });

        console.log("FILTERED (active + in range):", specialOffersMap);
        setSpecialOffers(specialOffersMap);
      }
    };

    fetchOffers();
    fetchSpecialOffers();
  }, []);

  const openOffersModal = (carId: string) => setSelectedCarId(carId);
  const closeOffersModal = () => setSelectedCarId(null);

  const isOfferActive = (offer: SpecialOffer): boolean => {
    if (!offer) return false;
    const now = new Date().getTime();
    const start = offer.start_date ? new Date(offer.start_date).getTime() : null;
    const end = offer.end_date ? new Date(offer.end_date).getTime() : null;
    console.log("[isOfferActive]", offer.id, { is_active: offer.is_active, start, end, now, startOk: !start || start <= now, endOk: !end || end >= now });
    return offer.is_active === true && (!start || start <= now) && (!end || end >= now);
  };

  const currentCarOffers = selectedCarId ? offers[selectedCarId] || [] : [];
  const currentCar = selectedCarId ? cars.find((c) => c.id === selectedCarId) : null;

  const getTranslatedPeriod = (periodJson: string) => {
    if (!periodJson) return "";

    try {
      const periodObj = typeof periodJson === "string" ? JSON.parse(periodJson) : periodJson;
      const lang = i18n.language || "fr";
      return periodObj[lang] || Object.values(periodObj)[0] || "";
    } catch (err) {
      console.warn("Erreur parsing period JSON:", periodJson, err);
      return periodJson;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 pb-20">
        <div className="h-10 w-64 bg-slate-200 animate-pulse rounded-lg mb-4" />
          <div className="h-4 w-96 bg-slate-100 animate-pulse rounded-lg mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 pb-20">
      <div className="mb-16 space-y-4">

          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight italic">
            {t("offers_page.title")}
          </h1>
          <p className="text-slate-500 text-[14px] font-normal max-w-2xl leading-relaxed">
            {t("offers_page.subtitle")}
          </p>
        </div>

        {cars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cars.map((car) => {
              const activeSpecialOffer = specialOffers[car.id];
              console.log(`[Offres render] car=${car.id} activeSpecialOffer=`, activeSpecialOffer ?? 'none');
              return (
              <div 
                key={car.id} 
                className={`group bg-white rounded-2xl border p-4 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden ${activeSpecialOffer ? "ring-2 ring-red-500 shadow-lg border-transparent" : "border-slate-100 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)]"}`}
              >
                {/* Car Image Container */}
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-50 mb-6">
                  <img 
                    src={car.image_url} 
                    alt={car.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4">
                     <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none shadow-sm font-bold text-[12px] px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-white/95">
                        {t(`offers_page.categories.${car.category}`)}
                     </Badge>
                  </div>
                </div>

                {/* Info Container */}
                <div className="px-2 pb-2">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[18px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic tracking-tight">{car.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                         <div className="flex items-center gap-1.5 text-[12px] font-normal text-slate-400 uppercase tracking-widest">
                           <Car className="w-3 h-3 text-blue-500" />
                           {t(`car_card.transmission_types.${car.transmission}`)}
                         </div>
                         <div className="flex items-center gap-1.5 text-[12px] font-normal text-slate-400 uppercase tracking-widest">
                           <Tag className="w-3 h-3 text-blue-500" />
                           {t(`car_card.fuel_types.${car.fuel}`)}
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-50 w-full mb-6" />

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-[12px] font-normal text-slate-400 uppercase tracking-[0.2em] mb-1">{t("offers_page.startingFrom")}</p>
                      <div className="flex flex-col">
                        <span className="text-[24px] font-semibold text-slate-900 leading-none">{car.price}</span>
                        <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest mt-1">MAD/{t("offers_page.day")}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => openOffersModal(car.id)}
                         className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all"
                       >
                         <Tag className="h-5 w-5" />
                       </Button>
                       <Link
                         to="/"
                         className="h-12 px-6 flex items-center justify-center bg-blue-600 text-white font-bold text-[14px] uppercase tracking-widest rounded-xl shadow-[0_12px_24px_-8px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all"
                       >
                         {t("offers_page.bookNow")}
                       </Link>
                    </div>
                  </div>
                </div>

                {activeSpecialOffer && activeSpecialOffer.badge_text && (
                  <div className="absolute top-6 left-6 animate-bounce">
                    <div className="text-white font-bold text-[10px] px-3 py-1.5 rounded-md uppercase tracking-widest shadow-lg flex items-center gap-1.5 bg-red-500 shadow-red-500/40">
                      {activeSpecialOffer.badge_text}
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-slate-200">
            <Car className="h-16 w-16 text-slate-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2 italic uppercase tracking-tight">
              {t("offers_page.noCarsTitle")}
            </h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">{t("offers_page.noCarsSubtitle")}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-widest px-8 h-12 rounded-xl"
            >
              {t("offers_page.refresh")}
            </Button>
          </div>
        )}

        {/* Modal handling */}
        <OffersModal
          isOpen={!!selectedCarId}
          onClose={closeOffersModal}
          currentCar={currentCar}
          currentCarOffers={currentCarOffers}
          currentCarSpecialOffer={selectedCarId ? specialOffers[selectedCarId] : null}
          getTranslatedPeriod={getTranslatedPeriod}
          i18n={i18n}
          t={t}
        />
    </div>
  );
};

export default Offres;