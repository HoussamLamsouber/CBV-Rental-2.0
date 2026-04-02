import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import type { Database } from "@/integrations/supabase/types";
import { formatDisplayDate } from "@/utils/dateUtils";
import { emailJSService } from "@/services/emailJSService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  MapPin, 
  Car, 
  User, 
  Phone, 
  Mail, 
  Clock,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type ReservationWithProfile = ReservationRow & {
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  pickup_location_name?: string;
  return_location_name?: string;
};

const MaReservation = () => {
  const [reservations, setReservations] = useState<ReservationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;

    const loadReservations = async () => {
      try {
        setLoading(true);

        if (!user) {
          setReservations([]);
          return;
        }

        await loadUserReservations();

      } catch (err) {
        console.error(err);
        if (mounted) toast({ 
          title: t("error"), 
          description: t('ma_reservation.messages.cannot_load_reservations'), 
          variant: "destructive" 
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadUserReservations = async () => {
      // 1️⃣ Récupérer les réservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (reservationsError) throw reservationsError;

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        return;
      }

      // 2️⃣ Récupérer le profil utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, telephone")
        .eq("id", user.id)
        .single();

      if (profileError) console.error("Erreur chargement profil:", profileError);

      // 3️⃣ Récupérer les localisations traduites
      const locationIds = [
        ...new Set(
          reservationsData.flatMap(r => [r.pickup_location, r.return_location])
        )
      ];

      const { data: locationsData, error: locationsError } = await supabase
        .from("localisation_translations")
        .select("localisation_id, language, display_name")
        .in("localisation_id", locationIds)
        .eq("language", i18n.language);

      if (locationsError) console.error("Erreur chargement localisations:", locationsError);

      // 4️⃣ Construire un dictionnaire pour lookup rapide
      const locationMap = new Map<string, string>();
      locationsData?.forEach(loc => {
        locationMap.set(loc.localisation_id, loc.display_name);
      });

      // 5️⃣ Construire les réservations finales
      const reservationsWithProfile: ReservationWithProfile[] = reservationsData.map(reservation => ({
        ...reservation,
        client_name: profileData?.full_name || user.email || t('ma_reservation.messages.not_specified'),
        client_email: profileData?.email || user.email,
        client_phone: profileData?.telephone,
        pickup_location_name: locationMap.get(reservation.pickup_location) || reservation.pickup_location,
        return_location_name: locationMap.get(reservation.return_location) || reservation.return_location,
      }));

      setReservations(reservationsWithProfile);
    };


    loadReservations();
    return () => { mounted = false; };
  }, [user, t]);

  const getLocationName = async (id: string) => {
    const { data, error } = await supabase
      .from("localisation_translations")
      .select("display_name")
      .eq("localisation_id", id)
      .eq("language", i18n.language)
      .single();

    if (error || !data) return id;

    return data.display_name;
  };

  const handleCancelReservation = async (res: ReservationWithProfile) => {
    if (!confirm(t('ma_reservation.messages.confirm_cancellation'))) {
      return;
    }
  
    try {
      setCancellingId(res.id);
  
      // 🔥 REMPLACER LA SUPPRESSION PAR UN SOFT DELETE
      const { error } = await supabase
        .from("reservations")
        .update({ 
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", res.id);
  
      if (error) throw error;
  
      const currentLanguage = i18n.language;
  
      console.log('📧 Tentative envoi emails annulation pour:', res.client_email);

      const pickupLocationName = await getLocationName(res.pickup_location);
      const returnLocationName = await getLocationName(res.return_location);
  
      // Envoyer les emails d'annulation
      const emailResult = await emailJSService.sendCancellationEmails({
        reservationId: res.id,
        clientName: res.client_name,
        clientEmail: res.client_email,
        clientPhone: res.client_phone,
        carName: res.car_name,
        carCategory: getTranslatedCategory(res.car_category),
        pickupDate: formatDisplayDate(res.pickup_date),
        pickupTime: res.pickup_time,
        returnDate: formatDisplayDate(res.return_date),
        returnTime: res.return_time,
        pickupLocation: pickupLocationName,
        returnLocation: returnLocationName,
        totalPrice: res.total_price,
        language: currentLanguage
      });
  
      console.log('📧 Résultat emails annulation:', emailResult);
  
      if (!emailResult.success) {
        console.warn('Emails d\'annulation non envoyés:', emailResult.error);
      } else {
        console.log('✅ Emails d\'annulation envoyés avec succès');
      }
  
      toast({ 
        title: t('ma_reservation.messages.reservation_cancelled'), 
        description: t('ma_reservation.messages.reservation_cancelled_for').replace('{carName}', res.car_name)
      });
      
      // 🔥 METTRE À JOUR LE STATUT LOCALEMENT AU LIEU DE SUPPRIMER
      setReservations(prev => prev.map(r => 
        r.id === res.id ? { ...r, status: 'cancelled' } : r
      ));
    } catch (err) {
      console.error("Erreur annulation:", err);
      toast({ 
        title: t("error"), 
        description: t('ma_reservation.messages.cannot_cancel_reservation'), 
        variant: "destructive" 
      });
    } finally {
      setCancellingId(null);
    }
  };

  // const isReservationPassed = (res: ReservationWithProfile): boolean => {
  //   const now = new Date();
    
  //   // Combiner la date de retour et l'heure de retour
  //   const time = res.return_time || "23:59";
  //   const [returnHours, returnMinutes] = time.split(":").map(Number);
  //   const returnDateTime = new Date(res.return_date);
  //   // Vérifier si la date/heure de retour est passée
  //   return now > returnDateTime;
  // };

  const getReservationState = (res: ReservationWithProfile) => {
    const now = new Date();

    const pickupDateTime = new Date(res.pickup_date);
    if (res.pickup_time) {
      const [hours, minutes] = res.pickup_time.split(":").map(Number);
      pickupDateTime.setHours(hours, minutes, 0, 0);
    } else {
      pickupDateTime.setHours(0, 0, 0, 0);
    }

    const returnDateTime = new Date(res.return_date);
    if (res.return_time) {
      const [hours, minutes] = res.return_time.split(":").map(Number);
      returnDateTime.setHours(hours, minutes, 0, 0);
    } else {
      returnDateTime.setHours(23, 59, 59, 999);
    }

    if (now < pickupDateTime) return "upcoming";
    if (now >= pickupDateTime && now <= returnDateTime) return "active";
    return "completed";
  };

  const getTranslatedCategory = (category: string) => {
    const categoryTranslation = t(`offers_page.categories.${category}`);
    if (categoryTranslation && !categoryTranslation.startsWith('offers_page.categories.')) {
      return categoryTranslation;
    }
    return category;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        label: t('ma_reservation.status.pending'), 
        color: "bg-yellow-100 text-yellow-800" 
      },
      accepted: { 
        label: t('ma_reservation.status.accepted'), 
        color: "bg-green-100 text-green-800" 
      },
      active: { 
        label: t('ma_reservation.status.active'), 
        color: "bg-blue-100 text-blue-800" 
      },
      completed: { 
        label: t('ma_reservation.status.completed'), 
        color: "bg-gray-100 text-gray-800" 
      },
      refused: { 
        label: t('ma_reservation.status.refused'), 
        color: "bg-red-100 text-red-800" 
      },
      cancelled: { 
        label: t('ma_reservation.status.cancelled'), 
        color: "bg-red-100 text-red-800" 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant="secondary" className={cn("px-3 py-1 rounded-lg text-[12px] font-bold uppercase tracking-widest border-none transition-colors", config.color)}>
        {config.label}
      </Badge>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message={t('ma_reservation.messages.loading_reservations')} />
        </div>
      );
    }

    if (!reservations.length) {
      return (
        <div className="flex-1 overflow-y-auto w-full pt-32">
          <div className="max-w-md mx-auto">
            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {t('ma_reservation.messages.no_reservations')}
            </h1>
            <p className="text-slate-500 mb-6">
              {t('ma_reservation.messages.no_reservations_user')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/")}>
                {t('ma_reservation.actions.view_vehicles')}
              </Button>
              {!user && (
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  {t('auth.tabs.signup')}
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">
              {t('ma_reservation.title')}
            </h1>
            <p className="text-slate-500 text-[14px] font-normal mt-1">
              {t('ma_reservation.messages.reservations_found').replace('{count}', reservations.length.toString())}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {reservations.map(res => (
            <Card key={res.id} className="group overflow-hidden border-slate-200 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-500 rounded-2xl bg-white">
               <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row h-full">
                     {/* Car Image Section */}
                     <div className="sm:w-2/5 relative overflow-hidden bg-slate-100 aspect-video sm:aspect-auto">
                        <img 
                          src={res.car_image || "/placeholder-car.jpg"} 
                          alt={res.car_name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute top-4 left-4">
                           {getStatusBadge(res.status)}
                        </div>
                     </div>

                     {/* Info Section */}
                     <div className="sm:w-3/5 p-6 flex flex-col justify-between">
                        <div>
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                 <h3 className="text-[18px] font-semibold text-slate-900 uppercase italic tracking-tight">{res.car_name}</h3>
                                 <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest mt-1 border-slate-200 text-slate-500">
                                   {t(`offers_page.categories.${res.car_category}`)}
                                 </Badge>
                              </div>
                              <div className="text-right">
                                 <p className="text-[24px] font-semibold text-blue-600 leading-none">{res.total_price} <span className="text-[12px]">{t('ma_reservation.currency')}</span></p>
                                 <p className="text-[12px] font-normal text-slate-400 uppercase tracking-widest mt-1">{t('ma_reservation.total_price')}</p>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-6 py-4 border-y border-slate-50">
                              <div className="space-y-3">
                                 <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 p-1 bg-blue-50 rounded-md">
                                       <Calendar className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div>
                                       <p className="text-[14px] font-medium text-slate-400 uppercase tracking-wider">{t('ma_reservation.pickup')}</p>
                                       <p className="text-[14px] font-normal text-slate-900 mt-0.5">{formatDisplayDate(res.pickup_date)}</p>
                                       <p className="text-[12px] text-slate-500">{res.pickup_time}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 p-1 bg-slate-50 rounded-md">
                                       <MapPin className="h-3 w-3 text-slate-400" />
                                    </div>
                                    <p className="text-[14px] font-normal text-slate-600 leading-tight">{res.pickup_location_name}</p>
                                 </div>
                              </div>

                              <div className="space-y-3">
                                 <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 p-1 bg-blue-50 rounded-md">
                                       <Calendar className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div>
                                       <p className="text-[14px] font-medium text-slate-400 uppercase tracking-wider">{t('ma_reservation.return')}</p>
                                       <p className="text-[14px] font-normal text-slate-900 mt-0.5">{formatDisplayDate(res.return_date)}</p>
                                       <p className="text-[12px] text-slate-500">{res.return_time}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 p-1 bg-slate-50 rounded-md">
                                       <MapPin className="h-3 w-3 text-slate-400" />
                                    </div>
                                    <p className="text-[14px] font-normal text-slate-600 leading-tight">{res.return_location_name}</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="mt-6">
                          {(() => {
                            const state = getReservationState(res);
                            const isCancellableStatus = res.status === 'pending' || res.status === 'accepted';
                            const showCancelButton = isCancellableStatus && state === "upcoming";

                            if (showCancelButton) {
                              return (
                                <Button
                                  variant="ghost"
                                  className="w-full h-11 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-[10px] uppercase tracking-wider border border-red-100 transition-all"
                                  onClick={() => handleCancelReservation(res)}
                                  disabled={cancellingId === res.id}
                                >
                                  {cancellingId === res.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500 mr-2"></div>
                                      {t('ma_reservation.actions.cancelling')}
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      {t('ma_reservation.actions.cancel')}
                                    </>
                                  )}
                                </Button>
                              );
                            } else {
                               let messageKey = 'ma_reservation.messages.cannot_cancel';
                               
                               if (res.status === 'cancelled' || res.status === 'refused') {
                                   messageKey = 'ma_reservation.messages.cannot_cancel';
                               } else if (state === 'active' || res.status === 'active') {
                                   messageKey = 'ma_reservation.messages.cannot_cancel_active';
                               } else if (state === 'completed' || res.status === 'completed') {
                                   messageKey = 'ma_reservation.messages.cannot_cancel_completed';
                               }

                               return (
                                <div className="flex items-center justify-center h-11 bg-slate-50 rounded-xl border border-slate-100 italic text-[10px] text-slate-400 font-bold uppercase tracking-widest px-4 text-center">
                                  {t(messageKey)}
                                </div>
                              );
                            }
                          })()}
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="container mx-auto px-4 pt-32 pb-6 sm:pb-8 flex-1">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default MaReservation;