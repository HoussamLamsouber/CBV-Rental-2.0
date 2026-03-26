import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { emailJSService } from "@/services/emailJSService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { formatDisplayDate, calculateDaysDifference, formatDateForDB } from "@/utils/dateUtils";
import { useNavigate } from "react-router-dom";

type Car = Database["public"]["Tables"]["cars"]["Row"];
type SearchData = {
  pickupLocation: string;
  returnLocation?: string;
  sameLocation: boolean;
  pickupDate: Date;
  returnDate: Date;
  pickupTime: string;
  returnTime: string;
  carType?: string;
  priceRange?: [number, number];
  transmission?: string;
  fuel?: string;
};

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car | null;
  searchData: SearchData | null;
  user: any;
  onReserved: () => void;
}

export const ReservationModal = ({
  isOpen,
  onClose,
  car,
  searchData,
  user,
  onReserved,
}: ReservationModalProps) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [pickupLocationName, setPickupLocationName] = useState("");
  const [returnLocationName, setReturnLocationName] = useState("");

  // REMOVED: getLocationId as searchData already provides UUIDs

  useEffect(() => {
    // 1. ROBUST Scroll Lock & Shift Prevention
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Save original styles
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPadding = document.body.style.paddingRight;

    // Lock both html and body
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;

    // Cleanup on Unmount
    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalBodyPadding;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // 2. Authentication Check
      if (!user) {
        toast({
          title: t('reservation_modal.messages.authentication_required'),
          description: t('reservation_modal.messages.please_login_to_reserve'),
          variant: "destructive",
        });
        navigate('/auth');
        onClose();
        return;
      }

      // 3. Availability and Names Check
      if (car && searchData) {
        checkAvailability();
        loadLocationNames();
      }
    }
  }, [isOpen, car, searchData, user, navigate, toast, t, onClose]);

  const checkAvailability = async () => {
    const available = await checkRealTimeAvailability();
    setIsAvailable(available);
  };

  const loadLocationNames = async () => {
    if (!searchData) return;
    const pickupId = searchData.pickupLocation;
    const returnId = searchData.sameLocation
      ? searchData.pickupLocation
      : searchData.returnLocation || searchData.pickupLocation;

    const [pName, rName] = await Promise.all([
      getLocationName(pickupId),
      getLocationName(returnId)
    ]);

    setPickupLocationName(pName);
    setReturnLocationName(rName);
  };

  const checkRealTimeAvailability = async (): Promise<boolean> => {
    if (!car || !searchData?.pickupDate || !searchData?.returnDate) return false;

    try {
      // 1. Vérifier si le modèle est marqué comme disponible
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select('available, quantity')
        .eq('id', car.id)
        .is('is_deleted', false)
        .single();

      if (carError || !carData || !carData.available) {
        return false;
      }

      const stockQuantity = Number(carData.quantity);
      console.log(`Checking modal availability for ${car.name}, stock:`, stockQuantity);

      if (stockQuantity <= 0) return false;

      const startUTC = formatDateForDB(searchData.pickupDate);
      const endUTC = formatDateForDB(searchData.returnDate);

      // 3. Compter les réservations acceptées pour cette période
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('id')
        .eq('car_id', car.id)
        .eq('status', 'accepted')
        .or(`and(pickup_date.lte.${endUTC},return_date.gte.${startUTC})`);

      if (reservationsError) throw reservationsError;

      const totalReserved = reservations?.length || 0;
      
      return stockQuantity - totalReserved >= 1;
      
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error);
      return false;
    }
  };

  const calculateTotalPrice = () => {
    if (!car || !searchData) return 0;
    const numberOfDays = calculateDaysDifference(searchData.pickupDate, searchData.returnDate);
    return car.price * numberOfDays;
  };

  const getLocationName = async (id: string) => {
    const { data, error } = await supabase
      .from("localisation_translations")
      .select("display_name")
      .eq("localisation_id", id)
      .eq("language", i18n.language)
      .single();

    if (error || !data) return id; // fallback uuid

    return data.display_name;
  };

  const handleConfirm = async () => {
    if (!car || !searchData || !user) return;

    const pickupLocationId = searchData.pickupLocation;
    const returnLocationId = searchData.sameLocation
      ? searchData.pickupLocation
      : searchData.returnLocation || searchData.pickupLocation;

    const isAvailable = await checkRealTimeAvailability();
    if (!isAvailable) {
      toast({
        title: t('reservation_modal.messages.vehicle_unavailable'),
        description: t('reservation_modal.messages.vehicle_unavailable_description'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const pickupDateStr = formatDateForDB(searchData.pickupDate);
      const returnDateStr = formatDateForDB(searchData.returnDate);
      const totalPrice = calculateTotalPrice();

      const reservationData = {
        car_id: car.id,
        car_name: car.name,
        car_category: car.category,
        car_price: car.price,
        car_image: car.image_url || null,
        pickup_location: pickupLocationId,
        return_location: returnLocationId,
        pickup_date: pickupDateStr,
        pickup_time: searchData.pickupTime,
        return_date: returnDateStr,
        return_time: searchData.returnTime,
        total_price: totalPrice,
        status: "pending",
        date: formatDateForDB(new Date()),
        user_id: user.id,
      };

      const { data: newReservation, error } = await supabase
        .from("reservations")
        .insert([reservationData])
        .select()
        .single();

      if (error) throw error;

      // Récupérer les informations du profil utilisateur
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, telephone, email")
        .eq("id", user.id)
        .single();

      const clientEmail = userProfile?.email || user.email;
      const clientName = userProfile?.full_name || user.email;
      const clientPhone = userProfile?.telephone || t('reservation_modal.messages.not_provided');

      // AJOUT: Récupérer la langue actuelle
      const currentLanguage = i18n.language;

      const pickupLocationName = await getLocationName(pickupLocationId);
      const returnLocationName = await getLocationName(
        searchData.sameLocation
          ? pickupLocationId
          : returnLocationId
      );

      await emailJSService.sendNewReservationAdminEmail({
        reservationId: newReservation.id,
        clientName,
        clientEmail,
        clientPhone,
        carName: car.name,
        carCategory: t(`offers_page.categories.${car.category}`),
        pickupDate: formatDisplayDate(searchData.pickupDate.toString()),
        pickupTime: searchData.pickupTime,
        returnDate: formatDisplayDate(searchData.returnDate.toString()),
        returnTime: searchData.returnTime,
        pickupLocation: pickupLocationName,
        returnLocation: returnLocationName,
        totalPrice,
        language: currentLanguage
      });

      toast({
        title: t('reservation_modal.messages.request_sent'),
        description: t('reservation_modal.messages.request_sent_description'),
      });

      onReserved();
      onClose();
    } catch (err: any) {
      console.error("Erreur réservation:", err);
      toast({
        title: t("error"),
        description: err.message || t('reservation_modal.messages.cannot_make_reservation'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!car || !searchData || !user) return null;

  const totalPrice = calculateTotalPrice();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
    >
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose} />
      
      <Dialog.Panel className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl relative z-10 transform transition-all overflow-hidden">
        {/* Mobile Pull Handle */}
        <div className="w-full flex justify-center pt-4 pb-2 sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>
        
        <div className="px-6 pb-6 sm:p-8 overflow-y-auto custom-scrollbar flex-grow">
          <Dialog.Title className="text-xl font-bold mb-6 tracking-tight text-gray-900">
            {t('reservation_modal.title').replace('{carName}', car.name)}
          </Dialog.Title>

          <div className="relative rounded-2xl overflow-hidden mb-6 bg-slate-50 border border-gray-100 flex items-center justify-center p-4">
            <img
              src={car.image_url || "/placeholder-car.jpg"}
              alt={car.name}
              className="w-full h-40 object-contain drop-shadow-lg"
            />
            <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm border border-gray-200/50">
              {t(`offers_page.categories.${car.category}`)}
            </span>
            <span className="absolute bottom-4 right-4 bg-gray-900 text-white px-3 py-1.5 rounded-xl font-bold shadow-lg">
              {car.price} {t('reservation_modal.currency_per_day')}
            </span>
          </div>

          <div className="mb-6 space-y-3 bg-slate-50/50 rounded-2xl p-5 border border-slate-100/50">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">{t('reservation_modal.fields.pickup_location')}</span>
              <span className="font-bold text-slate-900">{pickupLocationName}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">{t('reservation_modal.fields.pickup_date')}</span>
              <span className="font-bold text-slate-900">{formatDisplayDate(searchData.pickupDate.toString())} • {searchData.pickupTime}</span>
            </div>
            <div className="h-px w-full bg-gray-200/60 my-2" />
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">{t('reservation_modal.fields.return_location')}</span>
              <span className="font-bold text-slate-900">{returnLocationName}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">{t('reservation_modal.fields.return_date')}</span>
              <span className="font-bold text-slate-900">{formatDisplayDate(searchData.returnDate.toString())} • {searchData.returnTime}</span>
            </div>
          </div>

          {/* Section informations utilisateur */}
          <div className="mb-6 p-5 bg-blue-50/50 border border-blue-100/50 rounded-2xl">
            <h4 className="font-bold text-sm mb-3 text-blue-900">{t('reservation_modal.user_info.title')}</h4>
            <div className="space-y-2">
              <p className="text-sm text-blue-800 flex justify-between">
                <span className="text-blue-600/80">{t('reservation_modal.fields.full_name')}</span>
                <span className="font-semibold">{user.user_metadata?.full_name || user.email}</span>
              </p>
              <p className="text-sm text-blue-800 flex justify-between">
                <span className="text-blue-600/80">{t('reservation_modal.fields.email')}</span>
                <span className="font-semibold">{user.email}</span>
              </p>
            </div>
          </div>

          {!isAvailable && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <p className="text-red-700 text-sm font-medium">
                {t('reservation_modal.messages.vehicle_no_longer_available')}
              </p>
            </div>
          )}

          <div className="mb-8 p-5 bg-green-50/50 border border-green-100 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-800 font-bold">{t('reservation_modal.total_price')}</span>
              <span className="font-extrabold text-xl text-green-700">{totalPrice} {t('reservation_modal.currency')}</span>
            </div>
            <p className="text-green-600/80 text-xs font-medium">
              {t('reservation_modal.reservation_confirmation_note')}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="sm:w-auto w-full h-12 rounded-xl font-bold border-gray-200">
              {t('reservation_modal.actions.cancel')}
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!isAvailable || isLoading}
              className="sm:w-auto w-full h-12 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
            >
              {isLoading 
                ? t('reservation_modal.actions.reserving') 
                : (!isAvailable 
                    ? t('reservation_modal.actions.unavailable') 
                    : t('reservation_modal.actions.confirm_reservation')
                  )
              }
            </Button>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};