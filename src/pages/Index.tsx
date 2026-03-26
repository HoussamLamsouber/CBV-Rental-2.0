import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { CarGrid } from "@/components/CarGrid";
import { SearchData } from "@/components/SearchForm";
import { Database } from "@/integrations/supabase/types";
import { ReservationModal } from "@/components/ReservationModal";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

type Car = Database["public"]["Tables"]["cars"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

const Index = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [searchResults, setSearchResults] = useState<Car[]>([]);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        
        // 1. Récupérer les modèles disponibles avec stock > 0
        const { data: carsData, error: carsError } = await supabase
          .from("cars")
          .select("*")
          .eq("is_deleted", false)
          .eq("available", true)
          .gt("quantity", 0);

        if (carsError) throw carsError;

        // 2. Filtrage JS de sécurité + logging
        const availableVehicles = (carsData || []).filter(v => {
          const s = Number(v.quantity);
          console.log(`Home Vehicle ${v.name} stock:`, s);
          return s > 0;
        });

        setCars(availableVehicles);
      } catch (err) {
        console.error("Erreur fetchCars:", err);
        toast({
          title: t("error"),
          description: t('index.messages.loading_error'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
  }, [toast, t]);

  // Authentification
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Vérifier la disponibilité
  const isDateInReservation = (
    date: string,
    pickupDate: string,
    returnDate: string
  ) => {
    const currentDate = new Date(date);
    const startDate = new Date(pickupDate);
    const endDate = new Date(returnDate);
    return currentDate >= startDate && currentDate <= endDate;
  };

  const getReservedQuantityForDate = async (
    carId: string,
    date: string
  ): Promise<number> => {
    try {
      const { data: reservations, error } = await supabase
        .from("reservations")
        .select("pickup_date, return_date")
        .eq("car_id", carId)
        .eq("status", "accepted"); // Utiliser 'accepted' au lieu de 'active'

      if (error) {
        console.error("Erreur récupération réservations:", error);
        return 0;
      }

      const reservedQuantity = (reservations || []).filter((reservation) =>
        isDateInReservation(date, reservation.pickup_date, reservation.return_date)
      ).length;

      return reservedQuantity;
    } catch (err) {
      console.error("Erreur getReservedQuantityForDate:", err);
      return 0;
    }
  };

  const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    while (currentDate < end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const checkPeriodAvailability = async (
    carId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> => {
    try {
      // 1. Récupérer le stock (quantity)
      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("quantity, name")
        .eq("id", carId)
        .single();

      if (carError || !carData) return false;

      const stockQuantity = Number(carData.quantity);
      console.log(`Checking availability for ${carData.name}, stock:`, stockQuantity);

      if (stockQuantity <= 0) return false;

      // 2. Compter les réservations
      const dates = getDatesInRange(new Date(startDate), new Date(endDate));

      for (const date of dates) {
        const dateString = date.toISOString().split("T")[0];
        const reservedQuantity = await getReservedQuantityForDate(carId, dateString);
        if (stockQuantity - reservedQuantity <= 0) return false;
      }

      return true;
    } catch (err) {
      console.error("Erreur checkPeriodAvailability:", err);
      return false;
    }
  };

  // Recherche
  const handleSearch = async (data: SearchData) => {
    setSearchData(data);
    setSearchLoading(true);

    const startDate = data.pickupDate?.toISOString().split("T")[0];
    const endDate = data.returnDate?.toISOString().split("T")[0];

    if (!startDate || !endDate) {
      toast({
        title: t('index.messages.missing_dates'),
        description: t('index.messages.select_rental_dates'),
        variant: "destructive",
      });
      setSearchLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("cars")
        .select("*")
        .eq("is_deleted", false)
        .eq("available", true);

      if (data.filters?.category) {
        query = query.eq("category", data.filters.category);
      }

      if (data.filters?.transmission) {
        query = query.eq("transmission", data.filters.transmission);
      }

      if (data.filters?.fuel) {
        query = query.eq("fuel", data.filters.fuel);
      }

      const { data: allCars, error } = await query;

      if (error) throw error;

      // Vérifier la disponibilité pour chaque véhicule
      const availableCars = await Promise.all(
        (allCars || []).map(async (car) => ({
          ...car,
          isAvailable: await checkPeriodAvailability(
            car.id,
            startDate,
            endDate
          ),
        }))
      );

      const finalCars = availableCars.filter((car) => car.isAvailable);
      setSearchResults(finalCars);

      toast({
        title: t('index.messages.search_complete'),
        description: t('index.messages.vehicles_available', { count: finalCars.length })
      });

    } catch (err) {
      console.error("Erreur recherche:", err);
      toast({
        title: t('index.messages.search_error'),
        description: t('index.messages.search_error_description'),
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };


  const handleOpenReserve = (car: Car) => {
    if (!searchData?.pickupDate || !searchData?.returnDate) {
      toast({
        title: t('index.messages.missing_information'),
        description: t('index.messages.search_with_dates_first'),
        variant: "destructive",
      });
      return;
    }

    setSelectedCar(car);
    setShowModal(true);
  };

  const isSearchReady =
    !!searchData?.pickupLocation &&
    !!searchData?.pickupDate &&
    !!searchData?.returnDate &&
    (searchData.sameLocation || !!searchData?.returnLocation);

  const CarCardSkeleton = () => (
    <div className="border border-slate-100 rounded-2xl p-6 h-full flex flex-col gap-4 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 h-56 rounded-xl w-full animate-pulse" />
      <div className="h-6 bg-slate-100/50 rounded w-1/2 animate-pulse mt-2" />
      <div className="flex gap-2 mt-2">
        <div className="h-8 bg-slate-50 rounded-lg w-16 animate-pulse" />
        <div className="h-8 bg-slate-50 rounded-lg w-20 animate-pulse" />
        <div className="h-8 bg-slate-50 rounded-lg w-16 animate-pulse" />
      </div>
      <div className="mt-auto flex justify-between items-end pt-5">
        <div className="h-10 bg-slate-100 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-slate-100 rounded-xl w-1/3 animate-pulse" />
      </div>
    </div>
  );

    if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="relative h-[600px] bg-slate-900 border-b border-slate-800 overflow-hidden pointer-events-none">
           <div className="absolute inset-0 bg-black/40" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
              <div className="h-8 w-40 bg-white/5 rounded-full animate-pulse mx-auto mb-6" />
              <div className="h-20 w-[600px] bg-white/5 rounded-2xl animate-pulse backdrop-blur-md" />
           </div>
        </div>
        <div className="w-full py-16 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section avec recherche */}
      <div className="relative">
        <Hero onSearch={handleSearch} />
        
        {searchLoading && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="bg-white/90 backdrop-blur-md rounded-full px-6 py-3 shadow-xl border border-blue-100 flex items-center gap-3"
            >
              <div className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600"></span>
              </div>
              <span className="text-[14px] font-semibold text-slate-800">
                {t('index.messages.search_in_progress')}
              </span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Réservation Modal */}
      {showModal && (
        <ReservationModal
          isOpen={true}
          onClose={() => setShowModal(false)}
          car={selectedCar}
          searchData={searchData}
          user={user}
          onReserved={() => {
            setShowModal(false);
            navigate("/ma-reservation");
          }}
        />
      )}

      {/* Section Résultats ou Véhicules Vedettes */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          
          <div className="space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-[24px] font-semibold text-slate-900 mb-4">
                {!searchData && t("about_page.featured_vehicles")}
              </h2>
              {!searchData && (
                <p className="text-[14px] font-normal text-slate-500 max-w-2xl mx-auto">
                  {t("about_page.featured_vehicles_subtitle")}
                </p>
              )}
            </div>

            {searchData ? (
              <CarGrid
                cars={searchResults}
                onReserve={handleOpenReserve}
                canReserve={isSearchReady}
              />
            ) : (
              <CarGrid
                cars={cars.slice(0, 4)}
                onReserve={handleOpenReserve}
                canReserve={false}
              />
            )}
          </div>

          {/* Message si aucun résultat après recherche */}
          {searchData && searchResults.length === 0 && !searchLoading && (
            <div className="text-center py-12">
              <div className="text-slate-300 text-6xl mb-4">🚫</div>
              <h3 className="text-[20px] font-semibold text-slate-900 mb-2">
                {t('index.messages.no_vehicles_available')}
              </h3>
              <p className="text-[14px] font-normal text-slate-500 max-w-md mx-auto mb-6">
                {t('index.messages.no_vehicles_match_criteria')}
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;