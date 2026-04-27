import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, X, ArrowLeft, Phone, Mail, Calendar, Car, User, Rows3, MapPin, Navigation, Check, ChevronDown } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { emailJSService } from "@/services/emailJSService";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { formatDateDisplay } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/DatePicker";
import { getReservationStatus } from "@/utils/reservationStatus";

export default function ReservationsAdmin() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    date: "",
    vehicleModel: "",
    status: ""
  });

  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    reservation: null,
    reason: ""
  });

  const [vehicleSelectionModal, setVehicleSelectionModal] = useState({
    isOpen: false,
    reservation: null,
    availableVehicles: [],
    selectedVehicleId: null
  });

  // Vérifier les statuts des véhicules au chargement et toutes les minutes
  useEffect(() => {
    // Vérifier immédiatement au chargement
    checkAndUpdateVehicleStatus();
  }, []);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user');

  const { t, i18n } = useTranslation();

  const getProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, telephone")
      .eq("id", userId)
      .single();

    return data;
  };
  const getTranslation = (translations, lang) => {
    return (
      translations?.find(t => t.language === lang) ||
      translations?.find(t => t.language === "en") ||
      translations?.[0] ||
      null
    );
  };

  const translate = (key: string, fallback: string, params: Record<string, any> = {}) => {
    try {
      let translation = t(key);

      // Remplacer les paramètres si présents
      if (params && Object.keys(params).length > 0) {
        Object.keys(params).forEach(param => {
          const placeholder = `{{${param}}}`;
          if (translation.includes(placeholder)) {
            translation = translation.replace(placeholder, params[param]);
          }
        });
      }

      return translation || fallback;
    } catch (error) {
      // Fallback avec remplacement des paramètres
      let fallbackText = fallback;
      if (params && Object.keys(params).length > 0) {
        Object.keys(params).forEach(param => {
          const placeholder = `{{${param}}}`;
          if (fallbackText.includes(placeholder)) {
            fallbackText = fallbackText.replace(placeholder, params[param]);
          }
        });
      }
      return fallbackText;
    }
  };

  const checkAndUpdateVehicleStatus = async () => {
    try {

      // Récupérer toutes les réservations avec leurs véhicules assignés
      const { data: allReservations, error } = await supabase
        .from("reservations")
        .select(`
          id,
          assigned_vehicle_id,
          return_date,
          return_time,
          status,
          pickup_date,
          pickup_time
        `)
        .not("assigned_vehicle_id", "is", null);

      if (error) {
        console.error("❌ Erreur chargement réservations:", error);
        return;
      }

      const now = new Date();
      let updatedCount = 0;

      // Pour chaque réservation avec véhicule assigné, vérifier si elle est terminée
      for (const reservation of allReservations || []) {
        const returnDateTime = new Date(`${reservation.return_date}T${reservation.return_time || "23:59:59"}`);
        const pickupDateTime = new Date(`${reservation.pickup_date}T${reservation.pickup_time}`);

        // Vérifier si la réservation est terminée (date de retour passée)
        // OU si elle est expirée (date de pickup passée et status pending)
        const isCompleted = now > returnDateTime;
        const isExpired = reservation.status === 'pending' && now > pickupDateTime;

        if ((isCompleted || isExpired) && reservation.assigned_vehicle_id) {

          // Mettre à jour le statut du véhicule à "available"
          const { error: vehicleError } = await supabase
            .from("vehicles")
            .update({
              status: "available",
              updated_at: new Date().toISOString()
            })
            .eq("id", reservation.assigned_vehicle_id);

          if (vehicleError) {
            console.error(`❌ Erreur mise à jour véhicule ${reservation.assigned_vehicle_id}:`, vehicleError);
          } else {
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        // Recharger les réservations pour refléter les changements
        await fetchReservations();
      }

    } catch (error) {
      console.error("❌ Erreur vérification statuts véhicules:", error);
    }
  };

  async function fetchReservations() {
    setLoading(true);

    try {
      // Récupérer toutes les réservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select(`
          *,
          pickup_loc:active_localisations!reservations_pickup_location_fkey (
            id,
            localisation_translations (
              display_name,
              language
            )
          ),
          return_loc:active_localisations!reservations_return_location_fkey (
            id,
            localisation_translations (
              display_name,
              language
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (reservationsError) {
        console.error("Erreur réservations:", reservationsError);
        throw reservationsError;
      }

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        setLoading(false);
        return;
      }

      const reservationsWithDetails = await Promise.all(
        reservationsData.map(async (reservation: any) => {
          let profileInfo: any = null;
          let vehicleInfo: any = null;
          let depotInfo: any = null;

          // --- Profils utilisateur ---
          if (reservation.user_id) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("full_name, email, telephone")
                .eq("id", reservation.user_id)
                .single();

              if (!profileError && profileData) {
                profileInfo = profileData;
              }
            } catch (error) {
              console.warn(`Impossible de charger le profil pour ${reservation.user_id}`);
            }
          }

          // --- Véhicules ---
          if (reservation.assigned_vehicle_id) {
            try {
              const { data: vehicleData, error: vehicleError } = await supabase
                .from("vehicles")
                .select(`
                  id,
                  matricule,
                  status,
                  depot_id,
                  depots (
                    id,
                    phone,
                    depot_translations (
                      name,
                      address,
                      city,
                      language_code
                    )
                  ),
                  cars ( name, image_url )
                `)
                .eq("id", reservation.assigned_vehicle_id)
                .single();

              if (!vehicleError && vehicleData) {
                // Sélection de la traduction correspondant à la langue actuelle
                depotInfo = vehicleData.depots?.depot_translations?.find(
                  (dt: any) => dt.language_code === i18n.language
                ) || null;

                vehicleInfo = {
                  id: vehicleData.id,
                  registration_number: vehicleData.matricule,
                  status: vehicleData.status,
                  depot_info: depotInfo,
                  depot_phone: vehicleData.depots?.phone,
                };
              }
            } catch (error) {
              console.warn(`Impossible de charger le véhicule pour ${reservation.assigned_vehicle_id}`);
            }
          }


          return {
            id: reservation.id,
            car_name: reservation.car_name,
            car_image: reservation.car_image,
            car_category: reservation.car_category,
            pickup_date: reservation.pickup_date,
            return_date: reservation.return_date,
            pickup_time: reservation.pickup_time,
            return_time: reservation.return_time,
            pickup_location:
              reservation.pickup_loc?.localisation_translations?.find(
                (t: any) => t.language === i18n.language
              )?.display_name ?? "—",
            return_location:
              reservation.return_loc?.localisation_translations?.find(
                (t: any) => t.language === i18n.language
              )?.display_name ?? "—",
            total_price: reservation.total_price,
            status: reservation.status,
            computed_status: getReservationStatus({
              status: reservation.status,
              start_date: reservation.pickup_date,
              end_date: reservation.return_date
            }),
            created_at: reservation.created_at,
            updated_at: reservation.updated_at,
            user_id: reservation.user_id,
            profiles: profileInfo,
            rejection_reason: reservation.rejection_reason,
            assigned_vehicle_id: reservation.assigned_vehicle_id,
            vehicle_info: vehicleInfo,
            depot_info: depotInfo,
          };
        })
      );

      setReservations(reservationsWithDetails);
    } catch (error: any) {
      console.error("Erreur chargement réservations:", error);
    } finally {
      setLoading(false);
    }
  }



  const [userProfile, setUserProfile] = useState(null);
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  async function fetchUserProfile() {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      if (!error && profileData) {
        setUserProfile(profileData);
        setSearchTerm(profileData.email);
      }
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    }
  }

  const checkVehicleAvailability = async (
    carName: string,
    pickupDate: Date,
    returnDate: Date,
    excludeReservationId?: string
  ): Promise<boolean> => {
    try {
      // 1. Récupérer le car_id et la quantité à partir du nom
      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("id, quantity")
        .eq("name", carName)
        .single();

      if (carError || !carData) {
        return false;
      }

      const stockQuantity = Number(carData.quantity);
      console.log(`Checking admin availability for ${carName}, stock:`, stockQuantity);

      if (stockQuantity <= 0) return false;

      // 2. Compter les réservations acceptées qui chevauchent la période
      const { data: activeReservations, error: reservationsError } = await supabase
        .from("reservations")
        .select("id, pickup_date, return_date")
        .eq("car_name", carName)
        .eq("status", "accepted");

      if (reservationsError) {
        return false;
      }

      const overlappingReservations = activeReservations?.filter(res => {
        const resPickup = new Date(res.pickup_date);
        const resReturn = new Date(res.return_date);
        return (pickupDate <= resReturn && returnDate >= resPickup);
      }) || [];

      const reservedCount = excludeReservationId
        ? overlappingReservations.filter(r => r.id !== excludeReservationId).length
        : overlappingReservations.length;

      return reservedCount < stockQuantity;

    } catch (error) {
      console.error("Erreur vérification disponibilité:", error);
      return false;
    }
  };

  const openRejectModal = (reservation: any) => {
    setRejectModal({
      isOpen: true,
      reservation: reservation,
      reason: ""
    });
  };

  const closeRejectModal = () => {
    setRejectModal({
      isOpen: false,
      reservation: null,
      reason: ""
    });
  };

  const handleRejectWithReason = async () => {
    if (!rejectModal.reservation) return;

    if (!rejectModal.reason.trim()) {
      toast({
        title: translate('admin_reservations.reject_modal.missing_reason', 'Raison manquante'),
        description: translate('admin_reservations.reject_modal.missing_reason_desc', 'Veuillez saisir la raison du refus.'),
        variant: "destructive",
      });
      return;
    }

    try {
      const reservation = rejectModal.reservation;

      // Si la réservation avait un véhicule assigné, le libérer
      if (reservation.assigned_vehicle_id) {
        const { error: vehicleError } = await supabase
          .from("vehicles")
          .update({
            status: "available",
            updated_at: new Date().toISOString()
          })
          .eq("id", reservation.assigned_vehicle_id);

        if (vehicleError) {
          console.error("❌ Erreur libération véhicule:", vehicleError);
        } else {
          console.log(`✅ Véhicule ${reservation.assigned_vehicle_id} libéré après refus`);
        }
      }

      // UNE SEULE mise à jour de la réservation
      const { error } = await supabase
        .from("reservations")
        .update({
          status: "refused",
          rejection_reason: rejectModal.reason,
          assigned_vehicle_id: null // Retirer l'assignation du véhicule
        })
        .eq("id", reservation.id);

      if (error) {
        throw new Error(`Impossible de refuser: ${error.message}`);
      }

      // 🔥 ENVOYER L'EMAIL DE REFUS MANUEL
      try {
        const clientEmail = await getReservationEmail(reservation);

        if (clientEmail) {
          const emailData = {
            reservationId: reservation.id,
            clientName: reservation.profiles?.full_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
            clientEmail: clientEmail,
            clientPhone: reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
            carName: reservation.car_name,
            carCategory: getTranslatedCategory(reservation.car_category),
            pickupDate: new Date(reservation.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
            pickupTime: reservation.pickup_time || "14:00",
            returnDate: new Date(reservation.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
            returnTime: reservation.return_time || "14:00",
            pickupLocation: getTranslatedLocation(reservation.pickup_location),
            returnLocation: getTranslatedLocation(reservation.return_location),
            totalPrice: reservation.total_price,
            rejectionReason: rejectModal.reason,
            language: i18n.language
          };

          await emailJSService.sendReservationRejectedEmail(emailData);
        }
      } catch (emailError) {
        console.error("Erreur envoi email refus manuel:", emailError);
      }

      // Fermer la modal et rafraîchir
      closeRejectModal();
      await fetchReservations();

      toast({
        title: translate('admin_reservations.toast.reservation_rejected', '❌ Réservation refusée'),
      });

    } catch (error: any) {
      console.error("Erreur refus:", error);
      toast({
        title: translate('admin_reservations.toast.error', 'Erreur'),
        description: error.message || translate('admin_reservations.toast.update_error', 'Impossible de refuser la réservation.'),
        variant: "destructive",
      });
    }
  };

  const AUTO_REFUSE_MESSAGE = t(
    'admin_reservations.auto_reject_message',
    'Votre réservation a été refusée car le véhicule n’est plus disponible pour cette période.'
  );

  const handleAcceptReservation = async (reservation: any) => {
    try {
      const isAvailable = await checkVehicleAvailability(
        reservation.car_name,
        new Date(reservation.pickup_date),
        new Date(reservation.return_date),
        reservation.id
      );

      if (!isAvailable) {
        toast({
          title: t('admin_reservations.toast.not_available', 'Véhicule non disponible'),
          description: t('admin_reservations.toast.no_vehicles_available', 'Aucun véhicule disponible pour cette période.'),
          variant: "destructive",
        });
        return;
      }

      // Ouvrir le pop-up de sélection de véhicule
      setVehicleSelectionModal({
        isOpen: true,
        reservation: reservation,
        availableVehicles: [], // Sera rempli plus tard
        selectedVehicleId: null
      });

      // Charger les véhicules disponibles
      await loadAvailableVehicles(reservation);

    } catch (error: any) {
      console.error("Erreur vérification disponibilité:", error);
      toast({
        title: t('admin_reservations.toast.error', 'Erreur'),
        description: t('admin_reservations.toast.availability_check_error', 'Impossible de vérifier la disponibilité.'),
        variant: "destructive",
      });
    }
  };

  const loadAvailableVehicles = async (reservation: any) => {
    try {
      console.log("🔍 Recherche véhicules pour le modèle:", reservation.car_name);

      // Récupérer le car_id
      const { data: carData, error: carError } = await supabase
        .from("cars")
        .select("id")
        .eq("name", reservation.car_name)
        .single();

      if (carError || !carData) {
        console.error("❌ Modèle de voiture non trouvé:", carError);
        toast({
          title: t('admin_reservations.toast.car_not_found', 'Modèle non trouvé'),
          description: t('admin_reservations.toast.car_not_found_desc', 'Le modèle de véhicule n\'a pas été trouvé.'),
          variant: "destructive",
        });
        return;
      }

      const carId = carData.id;

      // Récupérer tous les véhicules disponibles avec infos depot_translations
      const { data: allVehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select(`
          id,
          car_id,
          matricule,
          status,
          depot_id,
          depots (
            id,
            phone,
            depot_translations (
              name,
              address,
              city,
              language_code
            )
          ),
          cars ( name, image_url )
        `)
        .eq("car_id", carId)
        .eq("status", "available")
        .is("deleted_at", null)
        .order("matricule");

      if (vehiclesError) {
        console.error("❌ Erreur chargement véhicules:", vehiclesError);
        throw vehiclesError;
      }

      if (!allVehicles || allVehicles.length === 0) {
        setVehicleSelectionModal(prev => ({ ...prev, availableVehicles: [] }));
        toast({
          title: t('admin_reservations.toast.no_vehicles', 'Aucun véhicule disponible'),
          description: t('admin_reservations.toast.no_vehicles_model', 'Aucun véhicule de ce modèle n\'est actuellement disponible.'),
          variant: "destructive",
        });
        return;
      }

      const availableVehicles = await Promise.all(
        allVehicles.map(async (vehicle: any) => {

          const depotTranslation = getTranslation(
            vehicle.depots?.depot_translations,
            i18n.language
          );
          const depotInfo = vehicle.depots?.depot_translations?.find(
            (dt: any) => dt.language_code === i18n.language
          ) || null;

          const isVehicleAvailable = await checkSpecificVehicleAvailability(
            vehicle.id,
            new Date(reservation.pickup_date),
            new Date(reservation.return_date)
          );

          return {
            id: vehicle.id,
            name: vehicle.cars?.name || reservation.car_name,
            image: vehicle.cars?.image_url,
            status: vehicle.status,
            registration_number: vehicle.matricule,
            depot_info: depotInfo,
            depot_city: depotInfo?.city,
            depot_name: depotInfo?.name,
            depot_address: depotInfo?.address,
            depot_phone: vehicle.depots?.phone,
            isAvailable: isVehicleAvailable
          };
        })
      );

      const actuallyAvailableVehicles = availableVehicles.filter(v => v.isAvailable);

      setVehicleSelectionModal(prev => ({
        ...prev,
        availableVehicles: actuallyAvailableVehicles,
        selectedVehicleId: actuallyAvailableVehicles[0]?.id || null,
        reservation: reservation
      }));

      if (actuallyAvailableVehicles.length === 0) {
        toast({
          title: t('admin_reservations.toast.no_available_vehicles', 'Aucun véhicule disponible'),
          description: t('admin_reservations.toast.all_vehicles_reserved', 'Tous les véhicules de ce modèle sont réservés pour cette période.'),
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("❌ Erreur chargement véhicules:", error);
      toast({
        title: t('admin_reservations.toast.error', 'Erreur'),
        description: t('admin_reservations.toast.vehicles_load_error', 'Impossible de charger les véhicules disponibles.'),
        variant: "destructive",
      });
    }
  };

  const extractCityFromLocation = (location: string): string => {
    // Logique pour extraire la ville de la location
    // Ex: "airport_casablanca" -> "casablanca"
    // Ex: "station_rabat" -> "rabat"

    const parts = location.split('_');
    if (parts.length > 1) {
      return parts[1];
    }
    return location;
  };

  const checkSpecificVehicleAvailability = async (vehicleId: string, pickupDate: Date, returnDate: Date) => {
    try {
      console.log("🔍 Vérification disponibilité véhicule:", vehicleId);

      // Vérifier les réservations qui utilisent ce véhicule spécifique
      const { data: vehicleReservations, error } = await supabase
        .from("reservations")
        .select("id, pickup_date, return_date, assigned_vehicle_id, status")
        .eq("assigned_vehicle_id", vehicleId)
        .eq("status", "accepted")
        .is("deleted_at", null);

      if (error) {
        console.warn("⚠️ Erreur vérification réservations véhicule:", error);
        // Si la colonne assigned_vehicle_id n'existe pas encore, considérer le véhicule comme disponible
        return true;
      }

      console.log("🔍 Réservations existantes pour ce véhicule:", vehicleReservations);

      // Vérifier les chevauchements de dates
      const hasOverlap = vehicleReservations?.some(reservation => {
        try {
          const resPickup = new Date(reservation.pickup_date);
          const resReturn = new Date(reservation.return_date);

          // Vérifier si les périodes se chevauchent
          const overlaps = (pickupDate <= resReturn && returnDate >= resPickup);
          if (overlaps) {
            console.log(`🚫 Chevauchement détecté avec réservation ${reservation.id}`);
          }
          return overlaps;
        } catch (dateError) {
          console.error("❌ Erreur conversion date:", dateError);
          return false;
        }
      });

      console.log(`🔍 Véhicule ${vehicleId} disponible:`, !hasOverlap);
      return !hasOverlap;

    } catch (error) {
      console.error("❌ Erreur vérification véhicule spécifique:", error);
      return false;
    }
  };

  const finalizeReservationAcceptance = async () => {
    if (!vehicleSelectionModal.selectedVehicleId) {
      toast({
        title: t('admin_reservations.toast.select_vehicle', 'Sélection requise'),
        description: t('admin_reservations.toast.select_vehicle_desc', 'Veuillez sélectionner un véhicule.'),
        variant: "destructive",
      });
      return;
    }

    try {
      const reservation = vehicleSelectionModal.reservation;
      const selectedVehicleId = vehicleSelectionModal.selectedVehicleId;

      console.log("🔍 Finalisation réservation:", reservation.id, "avec véhicule:", selectedVehicleId);

      // 1. Mettre à jour la réservation avec le véhicule attribué
      const updateData: any = {
        status: "accepted",
        assigned_vehicle_id: selectedVehicleId // C'est maintenant un UUID qui référence vehicles(id)
      };

      const { error: reservationError } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", reservation.id);

      if (reservationError) {
        console.error("❌ Erreur mise à jour réservation:", reservationError);
        throw reservationError;
      }

      console.log("✅ Réservation mise à jour");

      // 2. Mettre à jour le statut du véhicule
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({
          status: "reserved",
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedVehicleId);

      if (vehicleError) {
        console.error("❌ Erreur mise à jour véhicule:", vehicleError);
        throw vehicleError;
      }

      console.log("✅ Véhicule mis à jour (status: reserved)");

      // 3. Envoyer l'email d'acceptation
      try {
        const acceptanceEmailData = {
          reservationId: reservation.id,
          clientName: reservation.profiles?.full_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
          clientEmail: reservation.profiles?.email,
          clientPhone: reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
          carName: reservation.car_name,
          carCategory: getTranslatedCategory(reservation.car_category),
          pickupDate: new Date(reservation.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
          pickupTime: reservation.pickup_time || "14:00",
          returnDate: new Date(reservation.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
          returnTime: reservation.return_time || "14:00",
          pickupLocation: getTranslatedLocation(reservation.pickup_location),
          returnLocation: getTranslatedLocation(reservation.return_location),
          totalPrice: reservation.total_price,
          language: i18n.language
        };

        if (acceptanceEmailData.clientEmail) {
          await emailJSService.sendReservationAcceptedEmail(acceptanceEmailData);
        }
      } catch (emailError) {
        console.error("❌ Erreur envoi email acceptation:", emailError);
      }

      // 4. Refuser automatiquement les réservations en conflit
      const { data: allPendingReservations } = await supabase
        .from("reservations")
        .select(`
          id, car_name, pickup_date, return_date, 
          car_category, pickup_time, return_time, pickup_location, 
          return_location, total_price, user_id
        `)
        .eq("car_name", reservation.car_name)
        .eq("status", "pending")
        .neq("id", reservation.id);

      let refusedCount = 0;

      if (allPendingReservations && allPendingReservations.length > 0) {
        const reservationsToRefuse = allPendingReservations.filter(req => {
          const reqPickup = new Date(req.pickup_date);
          const reqReturn = new Date(req.return_date);
          const resPickup = new Date(reservation.pickup_date);
          const resReturn = new Date(reservation.return_date);

          return (reqPickup <= resReturn && reqReturn >= resPickup);
        });

        for (const req of reservationsToRefuse) {
          try {
            const { error: rejectError } = await supabase
              .from("reservations")
              .update({
                status: "refused",
                rejection_reason: AUTO_REFUSE_MESSAGE
              })
              .eq("id", req.id);

            if (!rejectError) {
              refusedCount++;

              const clientEmail = await getReservationEmail(req);

              if (clientEmail) {
                try {
                  const emailData = {
                    reservationId: req.id,
                    clientName: (await getProfile(req.user_id))?.full_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
                    clientEmail: clientEmail,
                    clientPhone: (await getProfile(req.user_id))?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
                    carName: req.car_name,
                    carCategory: getTranslatedCategory(req.car_category),
                    pickupDate: new Date(req.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
                    pickupTime: req.pickup_time || "14:00",
                    returnDate: new Date(req.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
                    returnTime: req.return_time || "14:00",
                    pickupLocation: getTranslatedLocation(req.pickup_location),
                    returnLocation: getTranslatedLocation(req.return_location),
                    totalPrice: req.total_price,
                    rejectionReason: AUTO_REFUSE_MESSAGE,
                    language: i18n.language
                  };

                  await emailJSService.sendReservationRejectedEmail(emailData);
                } catch (emailError) {
                  console.error(`❌ Erreur email refus ${req.id}:`, emailError);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Erreur refus ${req.id}:`, error);
          }
        }
      }

      // Fermer le pop-up et rafraîchir
      setVehicleSelectionModal({
        isOpen: false,
        reservation: null,
        availableVehicles: [],
        selectedVehicleId: null
      });

      await fetchReservations();

      // Message de succès
      const selectedVehicle = vehicleSelectionModal.availableVehicles.find(
        v => v.id === selectedVehicleId
      );

      toast({
        title: t('admin_reservations.toast.accept_success', '✅ Réservation acceptée'),
        description: selectedVehicle?.registration_number
          ? t('admin_reservations.toast.vehicle_assigned', 'Véhicule {{registration}} attribué', {
            registration: selectedVehicle.registration_number
          })
          : t('admin_reservations.toast.reservation_accepted', 'Réservation acceptée avec succès'),
      });

    } catch (error: any) {
      console.error("❌ Erreur finalisation réservation:", error);
      toast({
        title: t('admin_reservations.toast.error', 'Erreur'),
        description: t('admin_reservations.toast.accept_error', 'Impossible de finaliser l\'acceptation.'),
        variant: "destructive",
      });
    }
  };

  const getReservationEmail = async (reservation: any): Promise<string | null> => {
    if (reservation.guest_email) {
      return reservation.guest_email;
    }

    if (reservation.user_id) {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", reservation.user_id)
          .single();

        if (!error && profile?.email) {
          return profile.email;
        }
      } catch (error) {
        console.error("Erreur recherche profil:", error);
      }
    }

    return null;
  };

  const getTranslatedLocation = (locationValue: string) => {
    const airportKey = locationValue.replace('airport_', '');
    const airportTranslation = t(`airports.${airportKey}`);
    if (airportTranslation && !airportTranslation.startsWith('airports.')) {
      return airportTranslation;
    }

    const stationKey = locationValue.replace('station_', '');
    const stationTranslation = t(`stations.${stationKey}`);
    if (stationTranslation && !stationTranslation.startsWith('stations.')) {
      return stationTranslation;
    }

    return locationValue;
  };

  const getTranslatedCategory = (category: string) => {
    // Essayer d'abord les catégories spécifiques admin
    const adminCategoryTranslation = t(`admin_reservations.categories.${category}`);
    if (adminCategoryTranslation && !adminCategoryTranslation.startsWith('admin_reservations.categories.')) {
      return adminCategoryTranslation;
    }

    // Fallback aux catégories générales
    const categoryTranslation = t(`offers_page.categories.${category}`);
    if (categoryTranslation && !categoryTranslation.startsWith('offers_page.categories.')) {
      return categoryTranslation;
    }

    const adminVehiclesCategoryTranslation = t(`admin_vehicles.categories.${category}`);
    if (adminVehiclesCategoryTranslation && !adminVehiclesCategoryTranslation.startsWith('admin_vehicles.categories.')) {
      return adminVehiclesCategoryTranslation;
    }

    return category;
  };

  const handleChangeVehicle = async (reservation: any) => {
    try {
      // Ouvrir le pop-up de sélection de véhicule
      setVehicleSelectionModal({
        isOpen: true,
        reservation: reservation,
        availableVehicles: [],
        selectedVehicleId: reservation.assigned_vehicle_id // Pré-sélectionner le véhicule actuel
      });

      // Charger les véhicules disponibles
      await loadAvailableVehicles(reservation);

    } catch (error: any) {
      console.error("Erreur ouverture modal changement véhicule:", error);
      toast({
        title: t('admin_reservations.toast.error', 'Erreur'),
        description: t('admin_reservations.toast.cannot_change_vehicle', 'Impossible d\'ouvrir le modal de changement de véhicule.'),
        variant: "destructive",
      });
    }
  };

  const finalizeVehicleChange = async () => {
    if (!vehicleSelectionModal.selectedVehicleId) {
      toast({
        title: t('admin_reservations.toast.select_vehicle', 'Sélection requise'),
        description: t('admin_reservations.toast.select_vehicle_desc', 'Veuillez sélectionner un véhicule.'),
        variant: "destructive",
      });
      return;
    }

    try {
      const reservation = vehicleSelectionModal.reservation;
      const selectedVehicleId = vehicleSelectionModal.selectedVehicleId;

      // Si le véhicule sélectionné est le même que l'actuel, ne rien faire
      if (selectedVehicleId === reservation.assigned_vehicle_id) {
        toast({
          title: t('admin_reservations.toast.same_vehicle', 'Véhicule identique'),
          description: t('admin_reservations.toast.same_vehicle_desc', 'Le véhicule sélectionné est le même que celui actuellement attribué.'),
          variant: "default",
        });
        setVehicleSelectionModal({
          isOpen: false,
          reservation: null,
          availableVehicles: [],
          selectedVehicleId: null
        });
        return;
      }

      console.log("🔄 Changement de véhicule pour la réservation:", reservation.id);

      // 1. Libérer l'ancien véhicule s'il existe
      if (reservation.assigned_vehicle_id) {
        const { error: freeOldVehicleError } = await supabase
          .from("vehicles")
          .update({
            status: "available",
            updated_at: new Date().toISOString()
          })
          .eq("id", reservation.assigned_vehicle_id);

        if (freeOldVehicleError) {
          console.error("❌ Erreur libération ancien véhicule:", freeOldVehicleError);
        } else {
          console.log(`✅ Ancien véhicule ${reservation.assigned_vehicle_id} libéré`);
        }
      }

      // 2. Mettre à jour la réservation avec le nouveau véhicule
      const { error: reservationError } = await supabase
        .from("reservations")
        .update({
          assigned_vehicle_id: selectedVehicleId
        })
        .eq("id", reservation.id);

      if (reservationError) {
        console.error("❌ Erreur mise à jour réservation:", reservationError);
        throw reservationError;
      }

      // 3. Réserver le nouveau véhicule
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({
          status: "reserved",
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedVehicleId);

      if (vehicleError) {
        console.error("❌ Erreur réservation nouveau véhicule:", vehicleError);
        throw vehicleError;
      }

      console.log("✅ Véhicule changé avec succès");

      // Fermer le pop-up et rafraîchir
      setVehicleSelectionModal({
        isOpen: false,
        reservation: null,
        availableVehicles: [],
        selectedVehicleId: null
      });

      await fetchReservations();

      // Message de succès
      const selectedVehicle = vehicleSelectionModal.availableVehicles.find(
        v => v.id === selectedVehicleId
      );

      toast({
        title: t('admin_reservations.toast.vehicle_changed', '✅ Véhicule changé'),
        description: selectedVehicle?.registration_number
          ? t('admin_reservations.toast.new_vehicle_assigned', 'Nouveau véhicule {{registration}} attribué', {
            registration: selectedVehicle.registration_number
          })
          : t('admin_reservations.toast.vehicle_changed_success', 'Véhicule changé avec succès'),
      });

    } catch (error: any) {
      console.error("❌ Erreur changement véhicule:", error);
      toast({
        title: t('admin_reservations.toast.error', 'Erreur'),
        description: error.message || t('admin_reservations.toast.cannot_change_vehicle', 'Impossible de changer le véhicule.'),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [i18n.language]);

  const getReservationsCountByStatus = (status: string) => {
    let list = reservations;
    
    if (filters.date) {
      // Apply the same logic as filter for consistency
      const selectedDate = new Date(filters.date);
      selectedDate.setHours(0, 0, 0, 0);
      list = list.filter(r => {
        const p = new Date(r.pickup_date);
        const ret = new Date(r.return_date);
        p.setHours(0, 0, 0, 0);
        ret.setHours(0, 0, 0, 0);
        return p <= selectedDate && ret >= selectedDate;
      });
    }

    if (userId) {
      list = list.filter(r => r.user_id === userId);
    }

    return list.filter(r => r.computed_status === status).length;
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (activeTab !== "all" && reservation.computed_status !== activeTab) {
      return false;
    }

    if (userId && reservation.user_id !== userId) {
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    if (searchTerm) {
      const matchesSearch =
        (reservation.profiles?.full_name?.toLowerCase().includes(searchLower) ||
          reservation.profiles?.email?.toLowerCase().includes(searchLower) ||
          reservation.guest_name?.toLowerCase().includes(searchLower) ||
          reservation.guest_email?.toLowerCase().includes(searchLower) ||
          reservation.car_name?.toLowerCase().includes(searchLower) ||
          reservation.car_category?.toLowerCase().includes(searchLower) ||
          reservation.pickup_location?.toLowerCase().includes(searchLower) ||
          reservation.return_location?.toLowerCase().includes(searchLower) ||
          reservation.rejection_reason?.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    if (filters.date) {
      const selectedDate = new Date(filters.date);
      const pickupDate = new Date(reservation.pickup_date);
      const returnDate = new Date(reservation.return_date);

      // Normaliser (enlever l'heure)
      selectedDate.setHours(0, 0, 0, 0);
      pickupDate.setHours(0, 0, 0, 0);
      returnDate.setHours(0, 0, 0, 0);

      // Logique correcte : overlap
      if (!(pickupDate <= selectedDate && returnDate >= selectedDate)) {
        return false;
      }
    }

    if (filters.vehicleModel) {
      const vehicleLower = filters.vehicleModel.toLowerCase();
      if (!reservation.car_name?.toLowerCase().includes(vehicleLower) &&
        !reservation.car_category?.toLowerCase().includes(vehicleLower)) {
        return false;
      }
    }

    if (filters.status && filters.status !== "all" && reservation.status !== filters.status) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({
      date: "",
      vehicleModel: "",
      status: ""
    });
    setSearchTerm("");
    if (userId) {
      navigate('/admin/reservations');
    }
  };

  const tabs = [
    {
      key: "pending",
      label: t('reservationStatus.pending'),
      count: getReservationsCountByStatus("pending"),
      icon: "⏳"
    },
    {
      key: "accepted",
      label: t('reservationStatus.accepted'),
      count: getReservationsCountByStatus("accepted"),
      icon: "✅"
    },
    {
      key: "active",
      label: t('reservationStatus.active'),
      count: getReservationsCountByStatus("active"),
      icon: "🚗"
    },
    {
      key: "completed",
      label: t('reservationStatus.completed'),
      count: getReservationsCountByStatus("completed"),
      icon: "🏁"
    },
    {
      key: "expired",
      label: t('reservationStatus.expired'),
      count: getReservationsCountByStatus("expired"),
      icon: "⏱️"
    },
    {
      key: "refused",
      label: t('reservationStatus.refused'),
      count: getReservationsCountByStatus("refused"),
      icon: "❌"
    },
    {
      key: "cancelled",
      label: t('reservationStatus.cancelled'),
      count: getReservationsCountByStatus("cancelled"),
      icon: "🚫"
    },
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return translate('admin_reservations.reservation.not_provided', 'Non spécifié');
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'MAD',
    }).format(price);
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return translate('admin_reservations.reservation.not_provided', 'Non spécifié');
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const translateLocation = (location: string) => {
    if (!location) return location;

    const cleanLocation = location
      .replace('airport_', '')
      .replace('station_', '');

    const airportKey = `airports.${cleanLocation}`;
    const airportTrans = t(airportKey);
    if (airportTrans !== airportKey) {
      return airportTrans;
    }

    const stationKey = `stations.${cleanLocation}`;
    const stationTrans = t(stationKey);
    if (stationTrans !== stationKey) {
      return stationTrans;
    }

    return location;
  };

  const translateCategory = (category: string) => {
    if (!category) return category;

    // Essayer d'abord les catégories spécifiques admin
    const adminCategoryKey = `admin_reservations.categories.${category}`;
    const adminCategoryTrans = t(adminCategoryKey);
    if (adminCategoryTrans !== adminCategoryKey) {
      return adminCategoryTrans;
    }

    // Fallback aux autres namespaces
    const categoryKey = `admin_vehicles.categories.${category}`;
    const categoryTrans = t(categoryKey);
    if (categoryTrans !== categoryKey) {
      return categoryTrans;
    }

    const directCategoryKey = `categories.${category}`;
    const directCategoryTrans = t(directCategoryKey);
    if (directCategoryTrans !== directCategoryKey) {
      return directCategoryTrans;
    }

    return category;
  };

  const hasActiveFilters = searchTerm || filters.date || filters.vehicleModel || (filters.status && filters.status !== "all") || userId;

  const TableView = ({ reservations }: { reservations: any[] }) => (
    <div className="flex flex-col min-h-[500px]">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="w-full md:overflow-visible overflow-x-auto">
          <table className="w-full md:min-w-0 min-w-[700px] table-auto">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.reservation.vehicle', 'Véhicule')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.vehicle_info.title', 'Véhicule attribué')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.reservation.pickup', 'Période')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.reservation.location', 'Lieux')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.reservation.contact', 'Contact')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.reservation.total_price', 'Prix')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.reservation.status', 'Statut')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {translate('admin_reservations.actions.title', 'Infos')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {reservation.car_image ? (
                        <img
                          src={reservation.car_image}
                          alt={reservation.car_name}
                          className="w-10 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <Car className="h-3 w-3 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate max-w-[120px]">
                          {reservation.car_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[120px]">
                          {reservation.profiles?.full_name || reservation.guest_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié')}
                          {reservation.guest_name && (
                            <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                              {translate('admin_reservations.reservation.guest', 'Invité')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {reservation.vehicle_info ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {reservation.vehicle_info.registration_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reservation.depot_info?.name || translate('admin_reservations.vehicle_info.no_depot', 'Dépôt non spécifié')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reservation.depot_info?.city}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 italic">
                        {translate('admin_reservations.vehicle_info.not_assigned', 'Non attribué')}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {formatDate(reservation.pickup_date)}
                    </div>
                    <div className="text-sm text-gray-900">
                      {formatDate(reservation.return_date)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {reservation.pickup_time} - {reservation.return_time}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {reservation.pickup_location}
                    </div>
                    <div className="text-sm text-gray-900">
                      {reservation.return_location}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 truncate max-w-[120px]">
                      {reservation.guest_email || reservation.profiles?.email}
                    </div>
                    <div className="text-sm text-gray-600 truncate max-w-[120px]">
                      {reservation.guest_phone || reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné')}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatPrice(reservation.total_price)}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                      reservation.computed_status === "pending" && "bg-yellow-100 text-yellow-800",
                      reservation.computed_status === "accepted" && "bg-blue-100 text-blue-800",
                      reservation.computed_status === "active" && "bg-green-100 text-green-800",
                      reservation.computed_status === "completed" && "bg-gray-100 text-gray-800",
                      reservation.computed_status === "expired" && "bg-orange-100 text-orange-800",
                      reservation.computed_status === "cancelled" && "bg-purple-100 text-purple-800",
                      reservation.computed_status === "refused" && "bg-red-100 text-red-800",
                    )}>
                      {reservation.computed_status === "pending" && "⏳"}
                      {reservation.computed_status === "accepted" && "✅"}
                      {reservation.computed_status === "active" && "🚗"}
                      {reservation.computed_status === "completed" && "🏁"}
                      {reservation.computed_status === "expired" && "⏱️"}
                      {reservation.computed_status === "cancelled" && "🚫"}
                      {reservation.computed_status === "refused" && "❌"}
                      <span className="ml-1 hidden sm:inline">
                        {t(`reservationStatus.${reservation.computed_status}`)}
                      </span>
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {reservation.status === "pending" && reservation.computed_status !== "expired" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptReservation(reservation)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                        >
                          {translate('admin_reservations.actions.accept', 'Accepter')}
                        </button>
                        <button
                          onClick={() => openRejectModal(reservation)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                        >
                          {translate('admin_reservations.actions.reject', 'Refuser')}
                        </button>
                      </div>
                    )}

                    {/* Bouton pour changer de véhicule - SEULEMENT pour les réservations acceptées mais pas encore actives */}
                    {reservation.status === "accepted" && reservation.computed_status === "accepted" && reservation.assigned_vehicle_id && (
                      <button
                        onClick={() => handleChangeVehicle(reservation)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        {translate('admin_reservations.actions.change_vehicle', 'Changer véhicule')}
                      </button>
                    )}


                    {reservation.computed_status === "expired" && (
                      <div className="text-xs text-orange-600 italic">
                        {translate('admin_reservations.messages.expired_reservation', 'Réservation expirée')}
                      </div>
                    )}

                    {(reservation.status !== "pending" && reservation.computed_status !== "expired") && (
                      <div className="text-xs text-gray-500 italic flex flex-col gap-0.5">
                        <span className="font-medium text-slate-600 not-italic whitespace-nowrap">
                          {translate('admin_reservations.reservation.reservation_date', 'Date de réservation')}:
                        </span>
                        <span className="whitespace-nowrap">{formatDateTime(reservation.created_at)}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">{translate('admin_reservations.messages.loading', 'Chargement des réservations...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {userId && (
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{translate('admin_reservations.actions.back_users', 'Retour aux utilisateurs')}</span>
                <span className="sm:hidden">{translate('admin_reservations.actions.back', 'Retour')}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-[24px] font-semibold text-slate-900 mb-2">
                  {userId && userProfile
                    ? `${translate('admin_reservations.title', 'Gestion des réservations')} - ${userProfile.full_name || userProfile.email}`
                    : translate('admin_reservations.title', 'Gestion des réservations')
                  }
                </h1>
                <p className="text-gray-600 text-sm sm:text-base font-medium">
                  {userId
                    ? `${getReservationsCountByStatus("pending") + getReservationsCountByStatus("accepted") + getReservationsCountByStatus("expired") + getReservationsCountByStatus("refused")} ${translate('admin_reservations.client_reservations', 'réservation(s) pour ce client')}`
                    : `${reservations.length} ${translate('admin_reservations.total_reservations', 'réservation(s) au total')}`
                  }
                  {hasActiveFilters && ` • ${filteredReservations.length} ${translate('admin_reservations.results', 'résultat(s)')}`}
                </p>
              </div>
            </div>

            {userId && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm w-full sm:w-auto justify-center"
              >
                <X className="h-4 w-4" />
                {translate('admin_reservations.actions.see_all', 'Voir toutes les réservations')}
              </button>
            )}
          </div>
        </div>

        {!userId && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={translate('admin_reservations.search.placeholder', 'Rechercher par nom, email, modèle...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-lg w-full focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center gap-2 px-4 h-10 text-sm border rounded-lg font-medium transition-all whitespace-nowrap",
                    showFilters || hasActiveFilters
                      ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span>{translate('admin_reservations.filters.title', 'Filtres')}</span>
                  {hasActiveFilters && (
                    <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-black animate-in zoom-in-50 duration-300">
                      !
                    </span>
                  )}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 h-10 px-4 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 font-medium transition-all shadow-sm"
                  >
                    <X className="h-4 w-4" />
                    <span>{translate('admin_reservations.filters.reset', 'Effacer')}</span>
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status Filter */}
                  <div className="space-y-1.5 flex-1 min-w-[150px]">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {translate('admin_reservations.filters.status', 'Statut')}
                    </label>
                    <div className="relative">
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="h-10 px-3 pr-10 text-sm border border-slate-200 rounded-lg w-full appearance-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none cursor-pointer transition-all"
                      >
                        <option value="all">{translate('admin_reservations.filters.all_status', 'Tous les statuts')}</option>
                        <option value="pending">{translate('admin_reservations.status.pending', 'En attente')}</option>
                        <option value="accepted">{translate('admin_reservations.status.accepted', 'Acceptée')}</option>
                        <option value="refused">{translate('admin_reservations.status.refused', 'Refusée')}</option>
                        <option value="cancelled">{translate('admin_reservations.status.cancelled', 'Annulée')}</option>
                        <option value="active">{translate('admin_reservations.status.active', 'Active')}</option>
                        <option value="completed">{translate('admin_reservations.status.completed', 'Terminée')}</option>
                        <option value="expired">{translate('admin_reservations.status.expired', 'Expirée')}</option>
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Date Filter */}
                  <div className="space-y-1.5 flex-1 min-w-[150px]">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {translate('admin_reservations.filters.date', 'Date spécifique')}
                    </label>
                    <div className="relative group">
                      <DatePicker
                        variant="filter"
                        className="h-10 px-3 text-sm"
                        selected={filters.date ? new Date(filters.date + "T00:00:00") : undefined}
                        onSelect={(date) => setFilters({ ...filters, date: date ? formatDateDisplay(date, "yyyy-MM-dd", i18n.language) : "" })}
                        placeholder={translate('admin_reservations.filters.select_date', 'Sélectionner une date')}
                      />
                    </div>
                  </div>

                  {/* Vehicle Model Filter */}
                  <div className="space-y-1.5 flex-1 min-w-[150px]">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {translate('admin_reservations.filters.vehicle_model', 'Modèle de véhicule')}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Car className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        placeholder={translate('admin_reservations.filters.vehicle_placeholder', 'Ex: Volvo XC60')}
                        value={filters.vehicleModel}
                        onChange={(e) => setFilters({ ...filters, vehicleModel: e.target.value })}
                        className="h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-lg w-full bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border w-full md:overflow-visible overflow-x-auto flex-1">
            <div className="flex md:flex-wrap flex-nowrap whitespace-nowrap gap-2 min-w-max w-full">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-2 flex items-center justify-center gap-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex-1 min-w-0 ${activeTab === tab.key
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                  <span className={`px-2 py-1 rounded-full text-xs min-w-6 flex-shrink-0 ${activeTab === tab.key
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-600"
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-slate-300 text-4xl sm:text-6xl mb-4">🔍</div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters
                ? userId
                  ? translate('admin_reservations.messages.no_client_reservations', 'Aucune réservation pour ce client')
                  : translate('admin_reservations.messages.no_results', 'Aucun résultat trouvé')
                : `${translate('admin_reservations.messages.no_reservations', 'Aucune réservation')} ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}`
              }
            </h3>
            <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-4">
              {hasActiveFilters
                ? userId
                  ? translate('admin_reservations.messages.client_no_reservations', 'Ce client n\'a effectué aucune réservation pour le moment.')
                  : translate('admin_reservations.messages.try_search', 'Essayez de modifier vos critères de recherche.')
                : activeTab === "pending"
                  ? translate('admin_reservations.messages.new_reservations', 'Les nouvelles réservations apparaîtront ici.')
                  : translate('admin_reservations.messages.no_category_reservations', 'Aucune réservation dans cette catégorie.')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                {userId ? translate('admin_reservations.actions.see_all', 'Voir toutes les réservations') : translate('admin_reservations.filters.reset', 'Réinitialiser')}
              </button>
            )}
          </div>
        ) : (
          <TableView reservations={filteredReservations} />
        )}
      </div>

      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {translate('admin_reservations.reject_modal.title', 'Refuser la réservation')}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translate('admin_reservations.reject_modal.reason', 'Raison du refus *')}
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder={translate('admin_reservations.reject_modal.placeholder', 'Veuillez saisir la raison du refus (cette raison sera communiquée au client)...')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-subtle text-sm resize-none"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                {translate('admin_reservations.reject_modal.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleRejectWithReason}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                {translate('admin_reservations.reject_modal.confirm', 'Confirmer le refus')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de véhicule */}
      {vehicleSelectionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {vehicleSelectionModal.reservation?.assigned_vehicle_id
                  ? translate('admin_reservations.vehicle_modal.change_vehicle_title', 'Changer le véhicule attribué')
                  : translate('admin_reservations.vehicle_modal.title', 'Attribuer un véhicule')
                }
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {vehicleSelectionModal.reservation?.assigned_vehicle_id
                  ? translate('admin_reservations.vehicle_modal.change_vehicle_subtitle', 'Sélectionnez le nouveau véhicule à attribuer à cette réservation')
                  : translate('admin_reservations.vehicle_modal.subtitle', 'Sélectionnez le véhicule à attribuer à cette réservation')
                }
              </p>

              {/* Info réservation avec détails de location */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-4">
                  {vehicleSelectionModal.reservation?.car_image && (
                    <img
                      src={vehicleSelectionModal.reservation.car_image}
                      alt={vehicleSelectionModal.reservation.car_name}
                      className="w-16 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-medium text-gray-900 text-lg">
                        {vehicleSelectionModal.reservation?.car_name}
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {translateCategory(vehicleSelectionModal.reservation?.car_category)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {/* Dans la section info réservation */}
                      <div>
                        <div className="font-medium text-gray-700 mb-1">
                          📍 {translate('admin_reservations.reservation.pickup_location', 'Lieu de prise en charge')}
                        </div>
                        <div className="text-gray-900">
                          {translateLocation(vehicleSelectionModal.reservation?.pickup_location)}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {formatDate(vehicleSelectionModal.reservation?.pickup_date)} à {vehicleSelectionModal.reservation?.pickup_time}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-700 mb-1">
                          🎯 {translate('admin_reservations.reservation.return_location', 'Lieu de restitution')}
                        </div>
                        <div className="text-gray-900">
                          {translateLocation(vehicleSelectionModal.reservation?.return_location)}
                        </div>
                        <div className="text-gray-600 text-xs">
                          {formatDate(vehicleSelectionModal.reservation?.return_date)} à {vehicleSelectionModal.reservation?.return_time}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {vehicleSelectionModal.availableVehicles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🚗</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {translate('admin_reservations.vehicle_modal.no_vehicles', 'Aucun véhicule disponible')}
                  </h4>
                  <p className="text-gray-600">
                    {translate('admin_reservations.vehicle_modal.no_vehicles_desc', 'Tous les véhicules de ce modèle sont réservés pour cette période.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehicleSelectionModal.availableVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      onClick={() => setVehicleSelectionModal(prev => ({
                        ...prev,
                        selectedVehicleId: vehicle.id
                      }))}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${vehicleSelectionModal.selectedVehicleId === vehicle.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                        } ${!vehicle.isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        {vehicle.image ? (
                          <img
                            src={vehicle.image}
                            alt={vehicle.name}
                            className="w-20 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-20 h-14 bg-gray-200 rounded flex items-center justify-center">
                            <Car className="h-6 w-6 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium text-gray-900">
                              {vehicle.registration_number}
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${vehicle.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : vehicle.status === 'reserved'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                              {vehicle.status === 'available' && translate('admin_reservations.vehicle_status.available', 'Disponible')}
                              {vehicle.status === 'reserved' && translate('admin_reservations.vehicle_status.reserved', 'Réservé')}
                              {vehicle.status === 'maintenance' && translate('admin_reservations.vehicle_status.maintenance', 'Maintenance')}
                            </span>

                          </div>

                          {/* Informations de localisation */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="flex items-center gap-2 text-gray-700 mb-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">
                                  {translate('admin_reservations.vehicle_modal.depot', 'Dépôt')} : {vehicle.depot_name}
                                </span>
                              </div>
                              {vehicle.depot_address && (
                                <div className="text-gray-600 text-xs">
                                  {vehicle.depot_address}
                                </div>
                              )}
                              {vehicle.depot_phone && (
                                <div className="text-gray-600 text-xs flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {vehicle.depot_phone}
                                </div>
                              )}
                            </div>
                          </div>

                          {!vehicle.isAvailable && (
                            <div className="text-xs text-red-600 mt-2">
                              {translate('admin_reservations.vehicle_modal.not_available_period', 'Non disponible pour cette période')}
                            </div>
                          )}
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${vehicleSelectionModal.selectedVehicleId === vehicle.id
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                          } ${!vehicle.isAvailable ? 'border-gray-200' : ''}`}>
                          {vehicleSelectionModal.selectedVehicleId === vehicle.id && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {translate('admin_reservations.vehicle_modal.found', '{{count}} véhicule(s) trouvé(s)', {
                    count: vehicleSelectionModal.availableVehicles.length
                  })}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setVehicleSelectionModal({
                      isOpen: false,
                      reservation: null,
                      availableVehicles: [],
                      selectedVehicleId: null
                    })}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {translate('admin_reservations.vehicle_modal.cancel', 'Annuler')}
                  </button>
                  <button
                    onClick={vehicleSelectionModal.reservation?.assigned_vehicle_id ? finalizeVehicleChange : finalizeReservationAcceptance}
                    disabled={!vehicleSelectionModal.selectedVehicleId}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {vehicleSelectionModal.reservation?.assigned_vehicle_id
                      ? translate('admin_reservations.vehicle_modal.change_vehicle', 'Changer le véhicule')
                      : translate('admin_reservations.vehicle_modal.confirm', 'Confirmer l\'attribution')
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}