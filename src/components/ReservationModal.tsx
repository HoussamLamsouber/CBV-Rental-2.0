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

  const getLocationId = async (value: string) => {
    const { data, error } = await supabase
      .from("active_localisations")
      .select("id")
      .eq("localisation_value", value)
      .is("deleted_at", null)
      .single();

    if (error || !data) throw new Error("Location not found: " + value);

    return data.id;
  };

  useEffect(() => {
    if (isOpen) {
      // Vérifier si l'utilisateur est connecté
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

      if (car && searchData) {
        checkAvailability();
      }
    }
  }, [isOpen, car, searchData, user, navigate, toast, t, onClose]);

  const checkAvailability = async () => {
    const available = await checkRealTimeAvailability();
    setIsAvailable(available);
  };

  const loadLocationNames = async () => {
    if (!searchData) return;

    const pickupId = await getLocationId(searchData.pickupLocation);
    const returnId = await getLocationId(
      searchData.sameLocation
        ? searchData.pickupLocation
        : searchData.returnLocation || searchData.pickupLocation
    );

    setPickupLocationName(await getLocationName(pickupId));
    setReturnLocationName(await getLocationName(returnId));
  };

  loadLocationNames();

  const checkRealTimeAvailability = async (): Promise<boolean> => {
    if (!car || !searchData?.pickupDate || !searchData?.returnDate) return false;

    try {
      const { data: carData, error } = await supabase
        .from('cars')
        .select('available, quantity')
        .eq('id', car.id)
        .is('is_deleted', false)
        .single();

      if (error) throw error;

      if (!carData.available) {
        return false;
      }

      const startUTC = formatDateForDB(searchData.pickupDate);
      const endUTC = formatDateForDB(searchData.returnDate);

      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('id')
        .eq('car_id', car.id)
        .eq('status', 'accepted')
        .or(`and(pickup_date.lte.${endUTC},return_date.gte.${startUTC})`);

      if (reservationsError) throw reservationsError;

      const totalReserved = reservations?.length || 0;
      const availableQuantity = carData.quantity - totalReserved;

      return availableQuantity >= 1;
      
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
    const pickupLocationId = await getLocationId(searchData.pickupLocation);

    const returnLocationId = await getLocationId(
      searchData.sameLocation
        ? searchData.pickupLocation
        : searchData.returnLocation || searchData.pickupLocation
    );

    if (!car || !searchData || !user) return;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
    >
      <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <Dialog.Title className="text-lg font-semibold mb-4">
          {t('reservation_modal.title').replace('{carName}', car.name)}
        </Dialog.Title>

        <img
          src={car.image_url || "/placeholder-car.jpg"}
          alt={car.name}
          className="w-full h-48 object-cover rounded mb-4"
        />

        <p className="mb-2 text-sm text-gray-600">{t(`offers_page.categories.${car.category}`)}</p>
        <p className="mb-4 font-semibold">{car.price} {t('reservation_modal.currency_per_day')}</p>

        <div className="mb-4 space-y-2 text-sm">
          <p><strong>{t('reservation_modal.fields.pickup_location')}:</strong> {pickupLocationName}</p>
          <p><strong>{t('reservation_modal.fields.return_location')}:</strong> {returnLocationName}</p>
          <p><strong>{t('reservation_modal.fields.pickup_date')}:</strong> {formatDisplayDate(searchData.pickupDate.toString())} {t('reservation_modal.at_time')} {searchData.pickupTime}</p>
          <p><strong>{t('reservation_modal.fields.return_date')}:</strong> {formatDisplayDate(searchData.returnDate.toString())} {t('reservation_modal.at_time')} {searchData.returnTime}</p>
        </div>

        {/* Section informations utilisateur */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-sm mb-2">{t('reservation_modal.user_info.title')}</h4>
          <p className="text-sm text-blue-700">
            <strong>{t('reservation_modal.fields.full_name')}:</strong> {user.user_metadata?.full_name || user.email}
          </p>
          <p className="text-sm text-blue-700">
            <strong>{t('reservation_modal.fields.email')}:</strong> {user.email}
          </p>
        </div>

        {!isAvailable && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 text-sm">
              ⚠️ {t('reservation_modal.messages.vehicle_no_longer_available')}
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-700 text-sm">
            <strong>{t('reservation_modal.total_price')}:</strong> <span className="font-semibold text-lg">{totalPrice} {t('reservation_modal.currency')}</span>
          </p>
          <p className="text-green-600 text-xs mt-1">
            {t('reservation_modal.reservation_confirmation_note')}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('reservation_modal.actions.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isAvailable || isLoading}
            className="bg-green-600 hover:bg-green-700"
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
      </Dialog.Panel>
    </Dialog>
  );
};