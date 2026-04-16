// src/pages/AdminVehicleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog } from "@headlessui/react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Calendar, Trash2, Pencil, CalendarIcon, Edit } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateDisplay } from "@/utils/dateUtils";
import i18n from "@/i18n";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateTimeField } from "@/components/SearchForm";

type CarRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean | null;
  created_at: string;
  updated_at: string;
  quantity: number;
  image_url: string | null;
  fuel?: string | null;
  seats?: number | null;
  transmission?: string | null;
};

type ReservationRow = {
  id: string;
  car_id: string;
  pickup_date: string;
  return_date: string;
  status: string;
  pickup_location: string;
  return_location: string;
  car_name: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
  car_category?: string;
  car_price?: number;
  car_image?: string | null;
  pickup_time?: string;
  return_time?: string;
  total_price?: number;
  date?: string;
  created_at?: string;
  assigned_vehicle_id?: string;
  vehicles?: {
    id: string;
    matricule: string;
    status: string;
  } | null;
};

type Vehicle = {
  id: string;
  car_id: string;
  matricule: string;
  obd: string;
  date_obd: string;
  objet: string;
  status?: string;
  created_at: string;
  depot_id?: string;

  depots?: {
    id: string;
    phone: string;
    email: string;
    depot_translations: {
      name: string;
      city: string;
      address: string;
      language_code: string;
    }[];
  } | null;

  depot?: {
    id?: string;
    phone?: string;
    email?: string;
    name: string;
    city: string;
    address: string;
  };
};


export default function AdminVehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authLoading, adminLoading, isUserAdmin } = useAuth();
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<"fr" | "en">("fr");
  const [activePriceLabelLang, setActivePriceLabelLang] = useState<"fr" | "en">("fr");
  const [vehicle, setVehicle] = useState<CarRow | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<'availability' | 'vehicles' | 'offers' | 'special_offers' | 'reservations' | 'calendar'>('availability');
  const [locationsMap, setLocationsMap] = useState<Record<string, string>>({});
  type Offer = {
    id: string;
    period: string;
    price: number;
    price_label_fr: string;
    price_label_en: string;
  };
  const { i18n } = useTranslation();
  const [offers, setOffers] = useState<Offer[]>([]);
  
  type SpecialOffer = {
    id: string;
    car_id: string;
    title: string;
    price: number;
    period: string;
    start_date: string;
    end_date: string;
    badge_text: string | null;
    highlight_color: string | null;
    is_active: boolean;
    is_deleted: boolean;
    created_at?: string;
    price_label_fr?: string | null;
    price_label_en?: string | null;
    title_fr?: string | null;
    title_en?: string | null;
    period_fr?: string | null;
    period_en?: string | null;
  };
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [isCreateSpecialOfferModalOpen, setIsCreateSpecialOfferModalOpen] = useState(false);
  const [editingSpecialOfferId, setEditingSpecialOfferId] = useState<string | null>(null);
  const [newSpecialOffer, setNewSpecialOffer] = useState({
    title: "",
    price: "",
    period: "",
    badge_text: "",
    is_active: true
  });
  
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState("");
  const [priceLabelFr, setPriceLabelFr] = useState("");
  const [priceLabelEn, setPriceLabelEn] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [periodFr, setPeriodFr] = useState("");
  const [periodEn, setPeriodEn] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);
  const [isCreateVehicleModalOpen, setIsCreateVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateObdOpen, setIsCreateObdOpen] = useState(false);
  const [isEditObdOpen, setIsEditObdOpen] = useState(false);

  const [newOffer, setNewOffer] = useState({
    price: "",
    period: { fr: "", en: "" },
    price_label_fr: "",
    price_label_en: ""
  });
  const [newVehicle, setNewVehicle] = useState({
    matricule: "",
    obd: "",
    date_obd: formatDateDisplay(new Date(), "yyyy-MM-dd", i18n.language),
    objet: "",
    status: "available" as 'available' | 'reserved' | 'maintenance'
  });
  const [allReservations, setAllReservations] = useState<ReservationRow[]>([]);
  
  const lang = i18n.language;

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };
  const fetchVehicles = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("vehicles")
      .select(`
        *,
        depots (
          id,
          phone,
          email,
          depot_translations (
            name,
            city,
            address,
            language_code
          )
        )
      `)
      .eq("car_id", id)
      .is("is_deleted", false)
      .order("matricule");


    const mapped = data?.map(v => {
      const tr = v.depots?.depot_translations?.find(
        t => t.language_code === i18n.language
      );

      return {
        ...v,
        depot: {
          id: v.depots?.id,
          phone: v.depots?.phone,
          email: v.depots?.email,
          name: tr?.name ?? "—",
          city: tr?.city ?? "—",
          address: tr?.address ?? "—"
        }
      };
    });

    setVehicles(mapped || []);
  };


  const handleSubmit = async () => {
    if (!editingVehicle) return;

    const payload = {
      matricule: editingVehicle.matricule,
      obd: editingVehicle.obd,
      date_obd: editingVehicle.date_obd,
      objet: editingVehicle.objet,
      status: editingVehicle.status,
      depot_id: editingVehicle.depot_id ?? null
    };

    const { error } = await supabase
      .from("vehicles")
      .update(payload)
      .eq("id", editingVehicle.id);

    if (error) {
      console.error(error);
      return;
    }

    setIsModalOpen(false);
    setEditingVehicle(null);

    await fetchVehicles(); // refresh propre
    console.log("ALL SPECIAL OFFERS:", specialOffers);
    console.log("NOW:", new Date());
  };

  
  // Nouvelles variables pour le calendrier
  const [dates, setDates] = useState<string[]>([]);
  const [acceptedReservations, setAcceptedReservations] = useState<ReservationRow[]>([]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // 1. Charger le modèle de véhicule
        const { data: vData, error: vErr } = await supabase
          .from("cars")
          .select("*")
          .eq("id", id)
          .single();

        if (vErr) throw vErr;
        if (!mounted) return;
        
        if (vData) {
          // Log full object for debugging as requested by user
          console.log('Vehicle details from DB (AdminCarsDetails):', vData);
          setVehicle(vData as CarRow);
        }

        // 2. Charger les véhicules individuels avec leurs dépôts
        const { data: vehiclesData, error } = await supabase
          .from("vehicles")
          .select(`
            *,
            depots (
              id,
              phone,
              email,
              depot_translations (
                name,
                city,
                address,
                language_code
              )
            )
          `)
          .eq("car_id", id)
          .is("is_deleted", false)
          .order("matricule");

        const vehicles = vehiclesData?.map(v => {
          const tr = v.depots?.depot_translations?.find(
            t => t.language_code === i18n.language
          );

          return {
            ...v,
            depot: {
              id: v.depots?.id,
              phone: v.depots?.phone,
              email: v.depots?.email,
              name: tr?.name ?? "—",
              city: tr?.city ?? "—",
              address: tr?.address ?? "—"
            }
          };
        });


        setVehicles(vehicles || []);

        const { data: locations } = await supabase
          .from("localisation_translations")
          .select("localisation_id, display_name, language")
          .eq("language", i18n.language);

        if (locations) {
          const map: Record<string, string> = {};
          locations.forEach(loc => {
            map[loc.localisation_id] = loc.display_name;
          });
          setLocationsMap(map);
        }


        // 3. Charger TOUTES les réservations avec les données associées
        console.log("🔄 Chargement des réservations...");

        // D'abord charger les réservations sans jointures
        const { data: simpleReservationsData, error: reservationsError } = await supabase
          .from("reservations")
          .select(`
            *,
            pickup_location:active_localisations!reservations_pickup_location_fkey (
              id,
              translations:localisation_translations (
                language,
                display_name
              )
            ),
            return_location:active_localisations!reservations_return_location_fkey (
              id,
              translations:localisation_translations (
                language,
                display_name
              )
            )
          `)
          .eq("car_id", id)
          .order("pickup_date", { ascending: false });

        if (reservationsError) {
          console.error("❌ Erreur chargement réservations:", reservationsError);
          setAllReservations([]);
        } else {
          console.log("✅ Réservations chargées:", simpleReservationsData?.length);
          
          // Enrichir les réservations avec les données des profils et véhicules
          const enrichedReservations = await Promise.all(
            (simpleReservationsData || []).map(async (reservation) => {
              let profileInfo = null;
              let vehicleInfo = null;

              // Charger les informations du profil si user_id existe
              if (reservation.user_id) {
                try {
                  const { data: profileData } = await supabase
                    .from("profiles")
                    .select("full_name, email")
                    .eq("id", reservation.user_id)
                    .single();
                  
                  profileInfo = profileData;
                } catch (error) {
                  console.warn(`Impossible de charger le profil pour ${reservation.user_id}`);
                }
              }

              // Charger les informations du véhicule si assigned_vehicle_id existe
              if (reservation.assigned_vehicle_id) {
                try {
                  const { data: vehicleData } = await supabase
                    .from("vehicles")
                    .select("id, matricule, status")
                    .eq("id", reservation.assigned_vehicle_id)
                    .is("is_deleted", false)
                    .single();
                  
                  vehicleInfo = vehicleData;
                } catch (error) {
                  console.warn(`Impossible de charger le véhicule pour ${reservation.assigned_vehicle_id}`);
                }
              }

              return {
                id: reservation.id,
                car_id: reservation.car_id,
                pickup_date: reservation.pickup_date,
                return_date: reservation.return_date,
                status: reservation.status,
                pickup_location: reservation.pickup_location,
                return_location: reservation.return_location,
                car_name: reservation.car_name,
                user_id: reservation.user_id,
                profiles: profileInfo,
                vehicles: vehicleInfo,
                car_category: reservation.car_category,
                car_price: reservation.car_price,
                car_image: reservation.car_image,
                pickup_time: reservation.pickup_time,
                return_time: reservation.return_time,
                total_price: reservation.total_price,
                date: reservation.date,
                created_at: reservation.created_at,
                assigned_vehicle_id: reservation.assigned_vehicle_id
              };
            })
          );
          
          setAllReservations(enrichedReservations);
        }
        
        // 4. Charger les réservations acceptées pour le calendrier
        const { data: acceptedReservationsData } = await supabase
          .from("reservations")
          .select("*")
          .eq("car_id", id)
          .eq("status", "accepted");

        setAcceptedReservations(acceptedReservationsData || []);

        // 5. Charger les offres du véhicule
        await loadOffers();
        await loadSpecialOffers();

        // 6. Générer les dates pour le calendrier (30 jours)
        const today = new Date();
        const nextDays = Array.from({ length: 30 }, (_, i) =>
          formatDateDisplay(addDays(today, i), "yyyy-MM-dd", i18n.language)
        );
        setDates(nextDays);

      } catch (err: any) {
        console.error("Erreur load vehicle detail:", err);
        toast({ 
          title: t("error"), 
          description: String(err.message || err), 
          variant: "destructive" 
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id, toast, t]);

  const loadOffers = async () => {
    if (!id) return;
    
    const { data: offersData, error } = await supabase
      .from("offers")
      .select("*")
      .eq("car_id", id)
      .is("is_deleted", false);
    
    if (error) {
      console.error("Erreur chargement offres:", error);
      return;
    }

    // Sort numerically by the leading integer in the period label (e.g. "1-3 jours" → 1)
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

    const sorted = [...(offersData || [])].sort(
      (a, b) => getMinDays(a.period) - getMinDays(b.period)
    );
    
    setOffers(sorted);
  };

  const loadSpecialOffers = async () => {
    if (!id) return;
    
    const { data: specialOffersData, error } = await supabase
      .from("special_offers")
      .select("*")
      .eq("car_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Erreur chargement offres spéciales:", error);
      return;
    }

    setSpecialOffers(specialOffersData || []);
  };


  // Fonctions pour le calendrier de disponibilité
  const isDateInReservation = (date: string, reservation: ReservationRow) => {
    const currentDate = new Date(date);
    const pickupDate = new Date(reservation.pickup_date);
    const returnDate = new Date(reservation.return_date);
    
    return currentDate >= pickupDate && currentDate <= returnDate;
  };

  const getReservedCountForDate = (date: string) => {
    return acceptedReservations
      .filter(r => isDateInReservation(date, r))
      .length;
  };

  const getDailyAvailability = (date: string) => {
    if (!vehicle) return 0;

    if (!vehicle.available) {
      return 0;
    }

    const reserved = getReservedCountForDate(date);
    const totalCount = Number(vehicle.quantity || 0);
    return Math.max(0, totalCount - reserved);
  };

  // Fonction pour obtenir les informations du client
  const getClientInfo = (reservation: ReservationRow) => {
    if (reservation.profiles) {
      return {
        name: reservation.profiles.full_name || t('admin_vehicle_detail.reservations.not_specified'),
        email: reservation.profiles.email,
        type: t('admin_vehicle_detail.reservations.registered_user')
      };
    }
    
    return {
      name: t('admin_vehicle_detail.reservations.not_specified'),
      email: t('admin_vehicle_detail.reservations.not_specified'),
      type: t('admin_vehicle_detail.reservations.unknown')
    };
  };

  const handleCreateVehicle = async () => {
    if (!newVehicle.matricule) {
      toast({
        title: t('admin_vehicle_detail.messages.missing_field'),
        description: t('admin_vehicle_detail.modals.license_plate_required'),
        variant: "destructive",
      });
      return;
    }
  
    setSaving(true);
    try {
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("matricule")
        .eq("matricule", newVehicle.matricule)
        .is("is_deleted", false)
        .single();
  
      if (existingVehicle) {
        toast({
          title: t('admin_vehicle_detail.messages.duplicate_license'),
          description: t('admin_vehicle_detail.messages.duplicate_license') + ` "${newVehicle.matricule}" ${t('admin_vehicle_detail.messages.already_exists')}`,
          variant: "destructive",
        });
        return;
      }
  
      const { data, error } = await supabase
        .from("vehicles")
        .insert([{
          car_id: id,
          matricule: newVehicle.matricule,
          obd: newVehicle.obd || null,
          date_obd: newVehicle.date_obd,
          objet: newVehicle.objet || null,
          status: newVehicle.status,
          created_at: new Date().toISOString(),
        }])
        .is("is_deleted", false)
        .select()
        .single();
  
      if (error) throw error;
  
      toast({
        title: t('admin_vehicle_detail.messages.vehicle_created'),
        description: t('admin_vehicle_detail.messages.vehicle_created') + ` ${newVehicle.matricule} ${t('admin_vehicle_detail.messages.has_been_added')}`,
      });
  
      setNewVehicle({
        matricule: "",
        obd: "",
        date_obd: formatDateDisplay(new Date(), "yyyy-MM-dd", i18n.language),
        objet: "",
        status: "available"
      });
  
      setIsCreateVehicleModalOpen(false);
      
      await fetchVehicles();
  
      const { data: updatedVehicle } = await supabase
        .from("cars")
        .select("quantity")
        .eq("id", id)
        .single();
      
      if (updatedVehicle) {
        setVehicle(prev => prev ? { ...prev, quantity: updatedVehicle.quantity } : prev);
      }
  
    } catch (error: any) {
      console.error("Erreur création véhicule:", error);
      toast({
        title: t("error"),
        description: error.message || t('admin_vehicle_detail.messages.cannot_create_vehicle'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Afficher un spinner pendant le chargement de l'authentification
  if (authLoading || adminLoading) {
    return (
      <LoadingSpinner message={t('admin_vehicle_detail.messages.checking_permissions')} />
    );
  }

  // Vérifier les droits admin
  if (!isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('admin_vehicle_detail.access_denied')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('admin_vehicle_detail.admin_required')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/admin/vehicles")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('admin_vehicle_detail.back_to_vehicles')}
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              {t('admin_vehicle_detail.back_to_home')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fonction pour déterminer le statut d'un véhicule
  const getVehicleStatus = (vehicleItem: Vehicle) => {
    const statusConfig = {
      available: { 
        text: t('admin_vehicle_detail.status.available'), 
        color: 'bg-green-100 text-green-800 border border-green-200',
        icon: '✅'
      },
      reserved: { 
        text: t('admin_vehicle_detail.status.reserved'), 
        color: 'bg-blue-100 text-blue-800 border border-blue-200',
        icon: '🚗'
      },
      maintenance: { 
        text: t('admin_vehicle_detail.status.maintenance'), 
        color: 'bg-orange-100 text-orange-800 border border-orange-200',
        icon: '🔧'
      }
    };

    return statusConfig[vehicleItem.status as keyof typeof statusConfig] || statusConfig.available;
  };

  // Fonction utilitaire pour obtenir le texte du statut
  const getStatusText = (status: string) => {
    const statusMap = {
      available: t('admin_vehicle_detail.status.available'),
      reserved: t('admin_vehicle_detail.status.reserved'), 
      maintenance: t('admin_vehicle_detail.status.maintenance')
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  // Compter les véhicules par statut
  const getVehicleStats = () => {
    const stats = {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      reserved: vehicles.filter(v => v.status === 'reserved').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length
    };
    return stats;
  };

  const handleDeleteVehicle = async (vehicleId: string, matricule: string) => {
    if (!confirm(t('admin_vehicle_detail.messages.confirm_archive_vehicle') + ` "${matricule}" ? ` + t('admin_vehicle_detail.messages.archive_warning'))) {
      return;
    }
  
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq("id", vehicleId);
  
      if (error) throw error;
  
      toast({
        title: t('admin_vehicle_detail.messages.vehicle_archived'),
        description: t('admin_vehicle_detail.messages.vehicle_archived') + ` ${matricule} ` + t('admin_vehicle_detail.messages.stock_updated'),
      });
  
      // Recharger la liste des véhicules
      await fetchVehicles();
  
      // Recharger les données du véhicule pour avoir la quantité mise à jour
      const { data: updatedVehicle } = await supabase
        .from("cars")
        .select("quantity")
        .eq("id", id)
        .single();
      
      if (updatedVehicle) {
        setVehicle(prev => prev ? { ...prev, quantity: updatedVehicle.quantity } : prev);
      }
  
    } catch (error: any) {
      console.error("Erreur archivage véhicule:", error);
      toast({
        title: t("error"),
        description: error.message || t('admin_vehicle_detail.messages.cannot_archive_vehicle'),
        variant: "destructive",
      });
    }
  };

  // Fonction pour changer le statut d'un véhicule
  const handleChangeVehicleStatus = async (vehicleId: string, newStatus: 'available' | 'reserved' | 'maintenance') => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .is("is_deleted", false)
        .eq("id", vehicleId);

      if (error) throw error;

      // Mettre à jour l'état local
      setVehicles(prev => 
        prev.map(vehicle => 
          vehicle.id === vehicleId 
            ? { ...vehicle, status: newStatus }
            : vehicle
        )
      );

      toast({
        title: t('admin_vehicle_detail.messages.status_updated'),
        description: t('admin_vehicle_detail.messages.status_updated') + ` ${getStatusText(newStatus).toLowerCase()}.`,
      });

    } catch (error: any) {
      console.error("Erreur changement statut:", error);
      toast({
        title: t("error"),
        description: error.message || t('admin_vehicle_detail.messages.cannot_change_status'),
        variant: "destructive",
      });
    }
  };

  // Fonction pour créer une offre
  const handleCreateOffer = async () => {
    if (
      !newOffer.period.fr ||
      !newOffer.period.en ||
      !newOffer.price ||
      !newOffer.price_label_fr ||
      !newOffer.price_label_en
    ) {
      toast({
        title: t('admin_vehicle_detail.messages.missing_fields'),
        description: t('admin_vehicle_detail.messages.fill_all_offer_fields'),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("offers")
        .insert([{
          car_id: id,
          period: JSON.stringify(newOffer.period),
          price: Number(newOffer.price),
          price_label_fr: newOffer.price_label_fr,
          price_label_en: newOffer.price_label_en,
        }]);

      if (error) throw error;

      setNewOffer({
        price: "",
        period: { fr: "", en: "" },
        price_label_fr: "",
        price_label_en: ""
      });

      setIsCreateOfferModalOpen(false);
      await loadOffers();

    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getTranslatedMonth = (dateString: string) => {
    const monthIndex = new Date(dateString).getMonth();

    const monthKeys = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec"
    ];

    const key = monthKeys[monthIndex];

    return t(`common.months.${key}`);
  };

  // Fonction pour supprimer une offre
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm(t('admin_vehicle_detail.messages.confirm_archive_offer'))) {
      return;
    }

    try {
      const { error } = await supabase
        .from("offers")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq("id", offerId);

      if (error) throw error;

      toast({
        title: t('admin_vehicle_detail.messages.offer_archived'),
        description: t('admin_vehicle_detail.messages.offer_archived_success'),
      });

      await loadOffers();
    } catch (error: any) {
      console.error("Erreur archivage offre:", error);
      toast({
        title: t("error"),
        description: error.message || t('admin_vehicle_detail.messages.cannot_archive_offer'),
        variant: "destructive",
      });
    }
  };

  const handleCreateSpecialOffer = async () => {
    if (
      !newSpecialOffer.title?.trim() ||
      !newSpecialOffer.price ||
      !newSpecialOffer.period?.trim() ||
      !startDate || !startTime ||
      !endDate || !endTime
    ) {
      toast({
        title: t('admin_vehicle_detail.messages.missing_fields'),
        description: "Veuillez sélectionner la date et l'heure de début et de fin",
        variant: "destructive",
      });
      return;
    }

    const combineDateTime = (date: Date, time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      const d = new Date(date);
      d.setHours(hours);
      d.setMinutes(minutes);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d.toISOString();
    };

    const formattedStartDate = combineDateTime(startDate!, startTime);
    const formattedEndDate = combineDateTime(endDate!, endTime);

    if (new Date(formattedStartDate) >= new Date(formattedEndDate)) {
      toast({
        title: "Dates invalides",
        description: "La date de fin doit être après la date de début",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingSpecialOfferId !== null) {
        const { error } = await supabase
          .from("special_offers")
          .update({
            title: newSpecialOffer.title,
            title_fr: titleFr || null,
            title_en: titleEn || null,
            price: Number(newSpecialOffer.price),
            period: newSpecialOffer.period,
            period_fr: periodFr || null,
            period_en: periodEn || null,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            price_label_fr: priceLabelFr || null,
            price_label_en: priceLabelEn || null,
            badge_text: newSpecialOffer.badge_text || null,
            highlight_color: "#EF4444",
            is_active: isActive
          })
          .eq("id", editingSpecialOfferId);

        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        toast({ title: t("specialOffers.successUpdate") });
      } else {
        const { error } = await supabase
          .from("special_offers")
          .insert([{
            car_id: id,
            title: newSpecialOffer.title,
            title_fr: titleFr || null,
            title_en: titleEn || null,
            price: Number(newSpecialOffer.price),
            period: newSpecialOffer.period,
            period_fr: periodFr || null,
            period_en: periodEn || null,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            price_label_fr: priceLabelFr || null,
            price_label_en: priceLabelEn || null,
            badge_text: newSpecialOffer.badge_text || null,
            highlight_color: "#EF4444",
            is_active: isActive
          }]);

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        toast({ title: t("specialOffers.successCreate") });
      }

      setEditingSpecialOfferId(null);
      setNewSpecialOffer({
        title: "",
        price: "",
        period: "",
        badge_text: "",
        is_active: true
      });
      setStartDate(undefined);
      setStartTime("09:00");
      setEndDate(undefined);
      setEndTime("09:00");
      setPriceLabelFr("");
      setPriceLabelEn("");
      setTitleFr("");
      setTitleEn("");
      setPeriodFr("");
      setPeriodEn("");
      setIsActive(false);
      setEditingSpecialOfferId(null);
      setIsCreateSpecialOfferModalOpen(false);
      await loadSpecialOffers();
    } catch (err: any) {
      console.error(err);
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpecialOffer = async (offerId: string) => {
    if (!confirm(t('admin_vehicle_detail.messages.confirm_archive_offer'))) return;

    try {
      const { error } = await supabase
        .from("special_offers")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq("id", offerId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Offre spéciale supprimée",
      });
      await loadSpecialOffers();
    } catch (error: any) {
      console.error("Erreur suppression offre spéciale:", error);
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // RETOURS CONDITIONNELS FINAUX
  if (!id) { 
    return <div><main className="container mx-auto p-6">{t('admin_vehicle_detail.messages.missing_id')}</main></div>;
  } 
  
  if (!vehicle) { 
    return <div><main className="container mx-auto p-6">{t('admin_vehicle_detail.messages.vehicle_not_found')}</main></div>;
  }

  // Le reste du rendu JSX
  const stats = getVehicleStats();

  // Réservations actuellement en cours
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentReservations = acceptedReservations.filter((reservation) => {
    const start = new Date(reservation.pickup_date);
    const end = new Date(reservation.return_date);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return start <= today && end >= today;
  });

  // Fonction utilitaire pour traduire les lieux
  const translateLocation = (loc?: any) => {
    if (!loc) return "-";

    // cas où c'est déjà une string (fallback)
    if (typeof loc === "string") {
      return locationsMap[loc] || loc.slice(0, 6);
    }

    // cas jointure supabase (objet)
    const translation = loc.translations?.find(
      (t: any) => t.language === i18n.language
    );

    return translation?.display_name || loc.id?.slice(0, 6) || "-";
  };

  return (
    <>
      <main className="container bg-gray-50 mx-auto p-6">
        {/* En-tête du véhicule */}
        <div className="flex items-start gap-6 mb-6">
          <div className="w-48">
            {vehicle.image_url ? (
              <img src={vehicle.image_url} alt={vehicle.name} className="w-full h-auto object-cover rounded-lg" />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">{t('admin_vehicle_detail.messages.no_image')}</div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{vehicle.name}</h1>
            <p className="text-muted-foreground mb-2">{t(`admin_vehicles.categories.${vehicle.category}`)}</p>
            <p className="mb-2">{t('admin_vehicle_detail.vehicle_info.price_per_day')} <strong>{vehicle.price} / {t('admin_vehicle_detail.messages.day')}</strong></p>

            {/* Stock affiché simplement sans input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">{t('admin_vehicle_detail.vehicle_info.total_stock')} : {vehicle.quantity || 0}</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  ({t('admin_vehicle_detail.vehicle_info.auto_sync')} {vehicle.quantity || 0} {t('admin_vehicle_detail.vehicle_info.vehicles_active')})
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate("/admin/vehicles")}>{t('admin_vehicle_detail.back_to_vehicles')}</Button>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        {/* Onglets */}
        <div className="border-b mb-6">
          <div className="flex space-x-8">
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'availability'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('availability')}
            >
              {t('admin_vehicle_detail.tabs.availability')}
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'vehicles'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('vehicles')}
            >
              {t('admin_vehicle_detail.tabs.vehicles')} ({vehicles.length})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'offers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('offers')}
            >
              {t('admin_vehicle_detail.tabs.offers')} ({offers.length})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'special_offers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('special_offers')}
            >
              {t("specialOffers.title")} ({specialOffers.length})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'reservations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('reservations')}
            >
              {t('admin_vehicle_detail.tabs.reservations')} ({allReservations.length})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'calendar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('calendar')}
            >
              {t('admin_vehicle_detail.tabs.calendar')}
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'availability' && (
          <>
            <h2 className="text-xl font-semibold mb-3">{t('admin_vehicle_detail.tabs.availability')}</h2>
            
            {/* Cartes de statut */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('admin_vehicle_detail.availability.vehicles_available')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {vehicles.filter(v => v.status === 'available').length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('admin_vehicle_detail.availability.ready_to_rent')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('admin_vehicle_detail.availability.vehicles_reserved')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {vehicles.filter(v => v.status === 'reserved').length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('admin_vehicle_detail.availability.currently_rented')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('admin_vehicle_detail.availability.under_maintenance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {vehicles.filter(v => v.status === 'maintenance').length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('admin_vehicle_detail.availability.temporarily_unavailable')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'vehicles' && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">{t('admin_vehicle_detail.vehicles_management.individual_vehicles')}</h2>
              <Button onClick={() => setIsCreateVehicleModalOpen(true)}>
                + {t('admin_vehicle_detail.vehicles_management.add_vehicle')}
              </Button>
            </div>
            
            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">{t('admin_vehicle_detail.vehicles_management.total_vehicles')}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm border-green-200">
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <div className="text-sm text-gray-600">{t('admin_vehicle_detail.vehicles_management.available')}</div>
                <div className="text-xs text-green-600 mt-1">✅ {t('admin_vehicle_detail.availability.ready_to_rent')}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{stats.reserved}</div>
                <div className="text-sm text-gray-600">{t('admin_vehicle_detail.vehicles_management.reserved')}</div>
                <div className="text-xs text-blue-600 mt-1">🚗 {t('admin_vehicle_detail.availability.currently_rented')}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
                <div className="text-sm text-gray-600">{t('admin_vehicle_detail.vehicles_management.maintenance')}</div>
                <div className="text-xs text-orange-600 mt-1">🔧 {t('admin_vehicle_detail.availability.temporarily_unavailable')}</div>
              </div>
            </div>

            {/* Tableau des véhicules */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.license_plate')}</th>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.obd_code')}</th>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.obd_date')}</th>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.depot')}</th>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.object')}</th>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.status')}</th>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.change_status')}</th>
                    <th className="p-4 text-left font-semibold">{t('admin_vehicle_detail.vehicles_management.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicleItem) => {
                    const statusInfo = getVehicleStatus(vehicleItem);
                    
                    return (
                      <tr key={vehicleItem.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono font-semibold">{vehicleItem.matricule}</td>
                        <td className="p-4">{vehicleItem.obd || '-'}</td>
                        <td className="p-4">
                          {vehicleItem.date_obd ? formatDateDisplay(new Date(vehicleItem.date_obd), "dd/MM/yyyy", i18n.language) : '-'}
                        </td>
                        <td className="p-4">
                          {vehicleItem.depot ? (
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{vehicleItem.depot.name}</div>
                              <div className="text-xs text-gray-600">{vehicleItem.depot.city}</div>
                              {vehicleItem.depot.address && (
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {vehicleItem.depot.address}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">
                              {t('admin_vehicle_detail.vehicles_management.no_depot_assigned')}
                            </span>
                          )}
                        </td>
                        <td className="p-4">{vehicleItem.objet || '-'}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        </td>
                        <td className="p-4">
                          <select 
                            value={vehicleItem.status}
                            onChange={(e) => handleChangeVehicleStatus(vehicleItem.id, e.target.value as any)}
                            className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="available">{t('admin_vehicle_detail.status.available')}</option>
                            <option value="reserved">{t('admin_vehicle_detail.status.reserved')}</option>
                            <option value="maintenance">{t('admin_vehicle_detail.status.maintenance')}</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(vehicleItem)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteVehicle(vehicleItem.id, vehicleItem.matricule)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>


                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {vehicles.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">🚗</div>
                  <p>{t('admin_vehicle_detail.vehicles_management.no_vehicles')}</p>
                  <Button 
                    onClick={() => setIsCreateVehicleModalOpen(true)}
                    className="mt-4"
                  >
                    {t('admin_vehicle_detail.vehicles_management.add_first_vehicle')}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'offers' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{t('admin_vehicle_detail.offers_management.special_offers')}</h2>
              <Button onClick={() => setIsCreateOfferModalOpen(true)}>
                + {t('admin_vehicle_detail.offers_management.add_offer')}
              </Button>
            </div>

            {offers.length === 0 ? (
              <Card>
                <CardContent>
                  <div className="flex flex-col items-start">
                    <p className="text-2xl font-bold text-primary">Aucune offre disponible</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => {
                  const parsed = JSON.parse(offer.period || "{}");
                  const displayPeriod = i18n.language === "fr" ? parsed.fr : parsed.en;

                  return (
                    <Card key={offer.id} className="relative group hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          {displayPeriod}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-primary">
                          {offer.price} MAD/{i18n.language === "fr" ? offer.price_label_fr : offer.price_label_en}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {t('admin_vehicle_detail.offers_management.special_price_for')} {displayPeriod.toLowerCase()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Contenu de l'onglet réservations */}
        {activeTab === 'reservations' && (
          <>
            <h2 className="text-xl font-semibold mb-3">{t('admin_vehicle_detail.reservations.all_reservations')}</h2>
            
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">ID</th>
                    <th className="p-4 text-left">{t('admin_vehicle_detail.reservations.client')}</th>
                    <th className="p-4 text-left">{t('admin_vehicle_detail.reservations.period')}</th>
                    <th className="p-4 text-left">{t('admin_vehicle_detail.reservations.status')}</th>
                    <th className="p-4 text-left">{t('admin_vehicle_detail.reservations.assigned_vehicle', 'Véhicule attribué')}</th>
                    <th className="p-4 text-left">{t('admin_vehicle_detail.reservations.localisations')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allReservations.map((reservation) => {
                    const clientInfo = getClientInfo(reservation);
                    
                    return (
                      <tr key={reservation.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono text-sm">{reservation.id.slice(0, 8)}...</td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium">{clientInfo.name}</div>
                            <div className="text-sm text-gray-600">{clientInfo.email}</div>
                            <div className="text-xs text-gray-500">{clientInfo.type}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          {formatDateDisplay(new Date(reservation.pickup_date), "dd/MM/yyyy", i18n.language)}{" "}-{" "}
                          {formatDateDisplay(new Date(reservation.return_date), "dd/MM/yyyy", i18n.language)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            reservation.status === 'accepted' 
                              ? 'bg-green-100 text-green-800' 
                              : reservation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {reservation.status === 'accepted' ? '✅ ' + t('admin_reservations.status.accepted') : 
                            reservation.status === 'pending' ? '⏳ ' + t('admin_reservations.status.pending') : 
                            '❌ ' + t('admin_reservations.status.refused')}
                          </span>
                        </td>
                        <td className="p-4">
                          {reservation.vehicles ? (
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <div className="font-mono font-semibold text-sm text-gray-900 truncate">
                                  {reservation.vehicles.matricule}
                                </div>
                              </div>
                            </div>
                          ) : reservation.assigned_vehicle_id ? (
                            <div className="flex items-center gap-2 text-amber-600">
                              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs">⚠️</span>
                              </div>
                              <div className="text-sm italic">
                                {t('admin_vehicle_detail.reservations.vehicle_not_loaded', 'Véhicule non chargé')}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs">—</span>
                              </div>
                              <div className="text-sm italic">
                                {t('admin_vehicle_detail.reservations.no_vehicle_assigned', 'Aucun véhicule')}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          {translateLocation(reservation.pickup_location)}{" "}→{" "}
                          {translateLocation(reservation.return_location)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {allReservations.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  {t('admin_vehicle_detail.reservations.no_reservations')}
                </div>
              )}
            </div>
          </>
        )}

        {/* Onglet Offres Spéciales */}
        {activeTab === 'special_offers' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{t("specialOffers.title")}</h2>
              <Button onClick={() => {
                setEditingSpecialOfferId(null);
                setNewSpecialOffer({
                  title: "",
                  price: "",
                  period: "",
                  badge_text: "",
                  is_active: true
                });
                
                const now = new Date();
                const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                setStartDate(now);
                setStartTime("09:00");
                setEndDate(nextWeek);
                setEndTime("09:00");
                setPriceLabelFr("");
                setPriceLabelEn("");
                setIsActive(false);

                setIsCreateSpecialOfferModalOpen(true);
              }}>
                + {t("specialOffers.createButton")}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {specialOffers.map((offer) => {
                const now = new Date();
                const isOfferActive = offer.is_active && offer.start_date && offer.end_date && new Date(offer.start_date) <= now && new Date(offer.end_date) >= now;
                return (
                  <Card key={offer.id} className={`overflow-hidden ${isOfferActive ? 'ring-2 ring-red-500' : 'opacity-70'}`}>
                    <div className="h-2 w-full" style={{ backgroundColor: offer.highlight_color || '#3b82f6' }} />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {i18n.language === "fr" 
                              ? (offer.title_fr || offer.title_en || offer.title) 
                              : (offer.title_en || offer.title_fr || offer.title)}
                          </CardTitle>
                          {offer.badge_text && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase" style={{ backgroundColor: offer.highlight_color || '#3b82f6' }}>
                              {offer.badge_text}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${isOfferActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isOfferActive ? t("status.active") : t("status.inactive")}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t("specialOffers.price")}:</span>
                          <span className="font-bold">{offer.price} MAD</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t("specialOffers.period")}:</span>
                          <span className="font-medium">
                            {i18n.language === "fr" 
                              ? (offer.period_fr || offer.period_en || offer.period) 
                              : (offer.period_en || offer.period_fr || offer.period)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t("specialOffers.from")}:</span>
                          <span>{offer.start_date ? formatDateDisplay(new Date(offer.start_date), "dd/MM/yyyy", i18n.language) : "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t("specialOffers.to")}:</span>
                          <span>{offer.end_date ? formatDateDisplay(new Date(offer.end_date), "dd/MM/yyyy", i18n.language) : "-"}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full flex-1"
                          onClick={() => {
                            const extractTime = (date: string): string => {
                              if (!date) return "";
                              const d = new Date(date);
                              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            };

                            if (offer?.start_date) {
                              setStartDate(new Date(offer.start_date));
                              setStartTime(extractTime(offer.start_date));
                            }
                            if (offer?.end_date) {
                              setEndDate(new Date(offer.end_date));
                              setEndTime(extractTime(offer.end_date));
                            }

                            setEditingSpecialOfferId(offer.id);
                            setNewSpecialOffer({
                              title: offer.title,
                              price: offer.price.toString(),
                              period: offer.period,
                              badge_text: offer.badge_text || "",
                              is_active: Boolean(offer.is_active)
                            });
                            setPriceLabelFr(offer.price_label_fr || "");
                            setPriceLabelEn(offer.price_label_en || "");
                            setTitleFr(offer.title_fr || "");
                            setTitleEn(offer.title_en || "");
                            setPeriodFr(offer.period_fr || "");
                            setPeriodEn(offer.period_en || "");
                            setIsActive(Boolean(offer.is_active));
                            setIsCreateSpecialOfferModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t("admin_vehicles.actions.edit")}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full flex-1"
                          onClick={() => handleDeleteSpecialOffer(offer.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("specialOffers.delete")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {specialOffers.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed">
                  {t("specialOffers.empty")}
                </div>
              )}
            </div>
          </>
        )}

        {/* Nouvel onglet Calendrier */}
        {activeTab === 'calendar' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{t('admin_vehicle_detail.calendar.availability_calendar')}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{t('admin_vehicle_detail.calendar.days_availability')} {dates.length} {t('admin_vehicle_detail.calendar.days')}</span>
              </div>
            </div>

            {/* Timeline de disponibilité améliorée */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('admin_vehicle_detail.calendar.reservation_calendar')}
                </h4>
                <div className="text-sm text-gray-500">
                  {t('admin_vehicle_detail.calendar.total_stock')} {vehicle?.quantity || 0} {t('admin_vehicle_detail.calendar.vehicles')}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {dates.map((date) => {
                    const available = getDailyAvailability(date);
                    const reserved = getReservedCountForDate(date);
                    const isToday = date === formatDateDisplay(new Date(), "yyyy-MM-dd", i18n.language);
                    const isFullyBooked = available === 0;
                    const totalStockCount = Number(vehicle?.quantity || 0);
                    const isPartiallyAvailable = available > 0 && available < totalStockCount;
                    const isFullyAvailable = totalStockCount > 0 && available === totalStockCount;
                    
                    return (
                      <div
                        key={date}
                        className={`flex flex-col items-center p-2 rounded-lg border text-xs font-medium min-w-12 transition-all duration-200 ${
                          isFullyBooked 
                            ? "bg-red-50 border-red-200 text-red-700" 
                            : isPartiallyAvailable
                            ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                            : "bg-green-50 border-green-200 text-green-700"
                        } ${isToday ? "ring-2 ring-blue-500 ring-opacity-50 transform scale-105" : ""}`}
                        title={`${formatDateDisplay(new Date(date), "dd/MM/yyyy", i18n.language)}
                        ${available} ${t('admin_vehicle_detail.calendar.available')}
                        ${reserved} ${t('admin_vehicle_detail.messages.vehicles_reserved')}
                        ${t('admin_vehicle_detail.calendar.total_stock')} ${vehicle?.quantity || 0} ${t('admin_vehicle_detail.calendar.vehicles')}`}
                      >
                        <span className="font-semibold">{formatDateDisplay(new Date(date), "dd", i18n.language)}</span>
                        <span className="text-[10px] opacity-70">{getTranslatedMonth(date)}</span>
                        <div className="mt-1 flex flex-col items-center space-y-0.5">
                          {/* Indicateur visuel simple */}
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold ${
                              isFullyBooked ? "text-red-600" :
                              isPartiallyAvailable ? "text-yellow-600" :
                              "text-green-600"
                            }`}>
                              {available}
                            </span>
                            <span className="text-[10px] text-gray-500">{t('admin_vehicle_detail.calendar.available')}</span>
                          </div>
                          
                          {/* Barre de progression visuelle */}
                          <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                isFullyBooked ? "bg-red-400" :
                                isPartiallyAvailable ? "bg-yellow-400" :
                                "bg-green-400"
                              }`}
                              style={{ 
                                width: `${Number(vehicle?.quantity || 0) > 0 ? (available / Number(vehicle.quantity)) * 100 : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Légende simplifiée */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span>{t('admin_vehicle_detail.calendar.fully_available')} ({vehicle?.quantity || 0} {t('admin_vehicle_detail.calendar.vehicles')})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span>{t('admin_vehicle_detail.calendar.partially_available')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span>{t('admin_vehicle_detail.calendar.fully_booked')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 ring-2 ring-blue-500 ring-opacity-50 rounded"></div>
                  <span>{t('admin_vehicle_detail.calendar.today')}</span>
                </div>
              </div>

              {/* Explication du système */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 text-center">
                  <strong>{t('admin_vehicle_detail.calendar.how_to_read')}</strong> {t('admin_vehicle_detail.calendar.calendar_explanation')}
                </p>
              </div>
            </div>

            {/* Statistiques de réservation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('admin_vehicle_detail.calendar.available_today')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {getDailyAvailability(formatDateDisplay(new Date(), "yyyy-MM-dd", i18n.language))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('admin_vehicle_detail.calendar.out_of')} {vehicle.quantity || 0} {t('admin_vehicle_detail.calendar.total')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('admin_vehicle_detail.calendar.current_reservations')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {currentReservations.length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('admin_vehicle_detail.calendar.accepted_reservations')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('admin_vehicle_detail.calendar.occupancy_rate')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {Number(vehicle.quantity || 0) > 0 
                      ? `${Math.round((currentReservations.length / Number(vehicle.quantity)) * 100)}%`
                      : '0%'
                    }
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('admin_vehicle_detail.calendar.global_average')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Modal de création de véhicule individuel */}
        <Dialog open={isCreateVehicleModalOpen} onClose={() => setIsCreateVehicleModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {t('admin_vehicle_detail.modals.add_vehicle')}
              </Dialog.Title>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="matricule">{t('admin_vehicle_detail.modals.license_plate_required')}</Label>
                  <Input
                    id="matricule"
                    value={newVehicle.matricule}
                    onChange={(e) => setNewVehicle({...newVehicle, matricule: e.target.value})}
                    placeholder={t('admin_vehicle_detail.modals.license_plate_placeholder')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="obd">{t('admin_vehicle_detail.modals.obd_code_label')}</Label>
                  <Input
                    id="obd"
                    value={newVehicle.obd}
                    onChange={(e) => setNewVehicle({...newVehicle, obd: e.target.value})}
                    placeholder={t('admin_vehicle_detail.modals.obd_code_label')}
                  />
                </div>

                <div>
                  <Label htmlFor="date_obd">{t('admin_vehicle_detail.modals.obd_date_label')}</Label>
                  <Popover open={isCreateObdOpen} onOpenChange={setIsCreateObdOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full h-10 px-3 text-sm text-black bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-colors"
                      >
                        <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className={newVehicle.date_obd ? "text-black" : "text-slate-400"}>
                          {newVehicle.date_obd
                            ? formatDateDisplay(new Date(newVehicle.date_obd + "T00:00:00"), "dd/MM/yyyy", i18n.language)
                            : t('admin_vehicle_detail.modals.obd_date_placeholder', 'Select OBD date')}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        colorScheme="blue"
                        selected={newVehicle.date_obd ? new Date(newVehicle.date_obd + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setNewVehicle({ ...newVehicle, date_obd: formatDateDisplay(date, "yyyy-MM-dd", i18n.language) });
                            setIsCreateObdOpen(false);
                          }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="objet">{t('admin_vehicle_detail.modals.object_label')}</Label>
                  <Input
                    id="objet"
                    value={newVehicle.objet}
                    onChange={(e) => setNewVehicle({...newVehicle, objet: e.target.value})}
                    placeholder={t('admin_vehicle_detail.modals.object_placeholder')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsCreateVehicleModalOpen(false)}>
                  {t('admin_vehicle_detail.modals.cancel')}
                </Button>
                <Button onClick={handleCreateVehicle} disabled={saving}>
                  {saving ? t('admin_vehicle_detail.modals.creating') : t('admin_vehicle_detail.modals.add_vehicle_button')}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal édition véhicule */}
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Modifier véhicule
              </Dialog.Title>

              {editingVehicle && (
                <div className="space-y-4">

                  <div>
                    <Label>Matricule</Label>
                    <Input
                      value={editingVehicle.matricule}
                      onChange={(e) =>
                        setEditingVehicle({ ...editingVehicle, matricule: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>OBD</Label>
                    <Input
                      value={editingVehicle.obd || ""}
                      onChange={(e) =>
                        setEditingVehicle({ ...editingVehicle, obd: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Date OBD</Label>
                    <Popover open={isEditObdOpen} onOpenChange={setIsEditObdOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full h-10 px-3 text-sm text-black bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-colors"
                        >
                          <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className={editingVehicle.date_obd ? "text-black" : "text-slate-400"}>
                            {editingVehicle.date_obd
                              ? format(new Date(editingVehicle.date_obd + "T00:00:00"), "dd/MM/yyyy")
                              : t('admin_vehicle_detail.modals.obd_date_placeholder', 'Select OBD date')}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          colorScheme="blue"
                          selected={editingVehicle.date_obd ? new Date(editingVehicle.date_obd + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setEditingVehicle({ ...editingVehicle, date_obd: format(date, "yyyy-MM-dd") });
                              setIsEditObdOpen(false);
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Objet</Label>
                    <Input
                      value={editingVehicle.objet || ""}
                      onChange={(e) =>
                        setEditingVehicle({ ...editingVehicle, objet: e.target.value })
                      }
                    />
                  </div>

                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit}>
                  Enregistrer
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>


        {/* Modal de création d'offre */}
        <Dialog open={isCreateOfferModalOpen} onClose={() => setIsCreateOfferModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {t('admin_vehicle_detail.modals.add_offer')}
              </Dialog.Title>

              <div className="space-y-4">
                {/* Bouton FR/EN pour switcher les deux champs texte */}
                <div className="flex gap-2 mb-2">
                  {["fr", "en"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLang(lang as "fr" | "en")}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                        activeLang === lang
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Période */}
                <div className="space-y-1">
                  <Label>{t("admin_vehicle_detail.modals.period_label")}</Label>
                  <Input
                    value={newOffer.period[activeLang]}
                    onChange={(e) =>
                      setNewOffer((prev) => ({
                        ...prev,
                        period: { ...prev.period, [activeLang]: e.target.value },
                      }))
                    }
                    placeholder={`${t("admin_vehicle_detail.modals.period_placeholder")} (${activeLang.toUpperCase()})`}
                  />
                </div>

                {/* Prix */}
                <div>
                  <Label htmlFor="price">{t('admin_vehicle_detail.modals.price_required')}</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newOffer.price}
                    onChange={(e) => setNewOffer({ ...newOffer, price: e.target.value })}
                    placeholder={t('admin_vehicle_detail.modals.price_placeholder')}
                    required
                  />
                </div>

                {/* Label prix FR/EN */}
                <div className="space-y-1">
                  <Label>{t('admin_vehicle_detail.modals.price_label')}</Label>
                  <Input
                    value={activeLang === "fr" ? newOffer.price_label_fr : newOffer.price_label_en}
                    onChange={(e) =>
                      setNewOffer((prev) => ({
                        ...prev,
                        price_label_fr: activeLang === "fr" ? e.target.value : prev.price_label_fr,
                        price_label_en: activeLang === "en" ? e.target.value : prev.price_label_en,
                      }))
                    }
                    placeholder={activeLang === "fr" ? "/jour" : "/day"}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsCreateOfferModalOpen(false)}>
                  {t('admin_vehicle_detail.modals.cancel')}
                </Button>
                <Button onClick={handleCreateOffer} disabled={saving}>
                  {saving ? t('admin_vehicle_detail.modals.creating_offer') : t('admin_vehicle_detail.modals.create_offer')}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de création / édition d'offre spéciale */}
        <Dialog open={isCreateSpecialOfferModalOpen} onClose={() => {
          setIsCreateSpecialOfferModalOpen(false);
          setEditingSpecialOfferId(null);
        }} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {editingSpecialOfferId ? t("specialOffers.edit") : t("specialOffers.create")}
              </Dialog.Title>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("specialOffers.titleFr")}</Label>
                    <Input
                      value={titleFr}
                      onChange={(e) => setTitleFr(e.target.value)}
                      placeholder={t("specialOffers.titleFr")}
                    />
                  </div>
                  <div>
                    <Label>{t("specialOffers.titleEn")}</Label>
                    <Input
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder={t("specialOffers.titleEn")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("specialOffers.periodFr")}</Label>
                    <Input
                      value={periodFr}
                      onChange={(e) => setPeriodFr(e.target.value)}
                      placeholder={t("specialOffers.periodFr")}
                    />
                  </div>
                  <div>
                    <Label>{t("specialOffers.periodEn")}</Label>
                    <Input
                      value={periodEn}
                      onChange={(e) => setPeriodEn(e.target.value)}
                      placeholder={t("specialOffers.periodEn")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("specialOffers.pricePlaceholder")}</Label>
                    <Input
                      type="number"
                      value={newSpecialOffer.price}
                      onChange={(e) => setNewSpecialOffer({ ...newSpecialOffer, price: e.target.value })}
                      placeholder={t("specialOffers.pricePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("specialOffers.badge")}</Label>
                    <Input
                      value={newSpecialOffer.badge_text}
                      onChange={(e) => setNewSpecialOffer({ ...newSpecialOffer, badge_text: e.target.value })}
                      placeholder={t("specialOffers.badgePlaceholder")}
                    />
                  </div>
                </div>

                {/* Date de début */}
                <div className="space-y-1">
                  <Label>{t("specialOffers.startDate")}</Label>
                  <div className="border rounded-md px-3 py-2">
                    <DateTimeField
                      date={startDate}
                      time={startTime}
                      onDateChange={setStartDate}
                      onTimeChange={setStartTime}
                      placeholder={t("specialOffers.startDatePlaceholder")}
                      colorScheme="default"
                    />
                  </div>
                </div>

                {/* Date de fin */}
                <div className="space-y-1">
                  <Label>{t("specialOffers.endDate")}</Label>
                  <div className="border rounded-md px-3 py-2">
                    <DateTimeField
                      date={endDate}
                      time={endTime}
                      onDateChange={setEndDate}
                      onTimeChange={setEndTime}
                      placeholder={t("specialOffers.endDatePlaceholder")}
                      colorScheme="default"
                    />
                  </div>
                </div>



                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("specialOffers.priceLabelFr")}</Label>
                    <Input
                      value={priceLabelFr}
                      onChange={(e) => setPriceLabelFr(e.target.value)}
                      placeholder={t("specialOffers.priceLabelPlaceholderFr")}
                    />
                  </div>
                  <div>
                    <Label>{t("specialOffers.priceLabelEn")}</Label>
                    <Input
                      value={priceLabelEn}
                      onChange={(e) => setPriceLabelEn(e.target.value)}
                      placeholder={t("specialOffers.priceLabelPlaceholderEn")}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">{t("specialOffers.isActive")}</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => {
                  setIsCreateSpecialOfferModalOpen(false);
                  setEditingSpecialOfferId(null);
                }}>
                  {t("specialOffers.cancel")}
                </Button>
                <Button onClick={handleCreateSpecialOffer} disabled={saving}>
                  {saving ? t("admin_vehicle_detail.messages.loading") : (editingSpecialOfferId ? t("specialOffers.updateButton") : t("specialOffers.createButton"))}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </main>
    </>
  );
}