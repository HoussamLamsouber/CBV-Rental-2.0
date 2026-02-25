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

const Offres = () => {
  const { t, i18n } = useTranslation();
  const [cars, setCars] = useState<Car[]>([]);
  const [offers, setOffers] = useState<Record<string, CarOffer[]>>({});
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cars")
          .select("*")
          .is("is_deleted", false)
          .eq("available", true);

        if (error) {
          console.error("Erreur fetch cars:", error);
          return;
        }
        setCars(data as Car[]);
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
      console.log(records);

      records.forEach((o) => {
        if (!map[o.car_id]) map[o.car_id] = [];

        // ⚠️ ON GARDE LA VALEUR BRUTE
        map[o.car_id].push({
          period: o.period,
          price: {
            value: o.price,
            fr: o.price_label_fr,
            en: o.price_label_en
          }
        });
      });

      setOffers(map);
    };

    fetchOffers();
  }, []);

  const openOffersModal = (carId: string) => setSelectedCarId(carId);
  const closeOffersModal = () => setSelectedCarId(null);

  const currentCarOffers = selectedCarId ? offers[selectedCarId] || [] : [];
  const currentCar = selectedCarId ? cars.find((c) => c.id === selectedCarId) : null;

  const getTranslatedPeriod = (periodJson: string) => {
    if (!periodJson) return "";

    try {
      // Si periodJson est déjà un objet, on le garde
      const periodObj = typeof periodJson === "string" ? JSON.parse(periodJson) : periodJson;

      // Récupérer la langue courante
      const lang = i18n.language || "fr";

      return periodObj[lang] || Object.values(periodObj)[0] || "";
    } catch (err) {
      console.warn("Erreur parsing period JSON:", periodJson, err);
      return periodJson;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t("offers_page.loadingOffers")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {t("offers_page.title")}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
            {t("offers_page.subtitle")}
          </p>
        </div>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("offers_page.vehicle", "Véhicule")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("offers_page.category", "Catégorie")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("offers_page.specifications", "Spécifications")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("offers_page.price", "Prix")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("offers_page.offers", "Offres")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("offers_page.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cars.map((car) => (
                  <tr key={car.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Colonne Véhicule */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={car.image_url} 
                          alt={car.name} 
                          className="w-16 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{car.name}</h3>
                          {offers[car.id] && offers[car.id].length > 0 && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-xs mt-1">
                              <Tag className="h-3 w-3 mr-1" />
                              {offers[car.id].length} {t("offers_page.offers_plural", { count: offers[car.id].length })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Colonne Catégorie */}
                    <td className="px-4 py-4">
                      <Badge variant="secondary" className="text-xs">
                        {t(`offers_page.categories.${car.category}`)}
                      </Badge>
                    </td>

                    {/* Colonne Spécifications */}
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span>⛽</span>
                          <span>{t(`car_card.fuel_types.${car.fuel}`)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>⚙️</span>
                          <span>{t(`car_card.transmission_types.${car.transmission}`)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span>{car.seats || 5} {t("offers_page.seats")}</span>
                        </div>
                      </div>
                    </td>

                    {/* Colonne Prix */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-lg font-bold text-primary">
                          {car.price} MAD
                        </p>
                        <p className="text-sm text-gray-500">{t("offers_page.perDay")}</p>
                      </div>
                    </td>

                    {/* Colonne Offres */}
                    <td className="px-4 py-4">
                      {offers[car.id] && offers[car.id].length > 0 ? (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">{offers[car.id].length} {t("offers_page.offers_available", "offre(s) spéciale(s)")}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t("offers_page.from", "À partir de")} {Math.min(...offers[car.id].map(o => o.price.value))}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">{t("offers_page.noOffers", "Aucune offre")}</p>
                      )}
                    </td>

                    {/* Colonne Actions */}
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => openOffersModal(car.id)} 
                          size="sm" 
                          className="flex items-center gap-1"
                        >
                          <span>{t("offers_page.view")}</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Link
                          to="/"
                          className="inline-flex items-center justify-center px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                        >
                          {t("offers_page.bookNow")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {cars.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("offers_page.noCarsTitle")}
            </h3>
            <p className="text-gray-600 mb-6">{t("offers_page.noCarsSubtitle")}</p>
            <Button onClick={() => window.location.reload()}>
              {t("offers_page.refresh")}
            </Button>
          </div>
        )}

        {selectedCarId && currentCar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeOffersModal}
          >
            <div
              className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b">
                <div className="flex items-center gap-3">
                  <img src={currentCar.image_url} alt={currentCar.name} className="w-12 h-12 object-cover rounded-lg" />
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">{currentCar.name}</h2>
                    <p className="text-gray-600 text-sm">{t(`offers_page.categories.${currentCar.category}`)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={closeOffersModal} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 sm:p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">{t("offers_page.standardPrice")}</p>
                      <p className="text-blue-900 text-sm">{t("offers_page.dailyRental")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-900">{currentCar.price} MAD</p>
                      <p className="text-blue-800 text-sm">{t("offers_page.perDay")}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    {t("offers_page.specialOffers")}
                  </h3>

                  {currentCarOffers.length > 0 ? (
                    <div className="space-y-3">
                      {currentCarOffers.map((offer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-900">
                              {getTranslatedPeriod(offer.period)}
                            </span>
                          </div>
                          <div className="flex flex-col items-end leading-tight">
                            <span className="text-lg font-bold text-green-600">
                              {offer.price.value} MAD
                            </span>
                            <span className="text-sm text-green-800">
                              {i18n.language === "fr"
                                ? offer.price.fr || offer.price.en
                                : offer.price.en || offer.price.fr}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">{t("offers_page.noSpecialOffers")}</p>
                      <p className="text-gray-500 text-xs mt-1">{t("offers_page.checkStandardRates")}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Link
                    to="/"
                    onClick={closeOffersModal}
                    className="block w-full text-center py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {t("offers_page.bookNow")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Offres;