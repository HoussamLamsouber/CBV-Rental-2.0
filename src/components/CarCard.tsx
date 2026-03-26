import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Fuel, Users, Cog, Zap, Car } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Car = Database["public"]["Tables"]["cars"]["Row"];

interface CarCardProps {
  car: Car & {
    isAvailable?: boolean;
  };
  onReserve: (car: Car) => void;
  canReserve: boolean;
}

export const CarCard = ({ car, onReserve, canReserve }: CarCardProps) => {
  const { t } = useTranslation();
  
  // Utilisez isAvailable si fourni, sinon fallback sur car.available
  const isCarAvailable = car.isAvailable !== undefined ? car.isAvailable : car.available;

  // Fonction pour obtenir l'icône de carburant
  const getFuelIcon = (fuelType: string | null) => {
    switch (fuelType?.toLowerCase()) {
      case 'electrique':
        return <Zap className="h-4 w-4" />;
      case 'diesel':
      case 'essence':
      case 'hybride':
      default:
        return <Fuel className="h-4 w-4" />;
    }
  };

  // Fonction pour obtenir le label de carburant
  const getFuelLabel = (fuelType: string | null) => {
    if (!fuelType) return t('car_card.messages.not_specified');
    
    const translation = t(`car_card.fuel_types.${fuelType}`);
    
    // Fallback pour les anciennes données
    if (translation.startsWith('car_card.fuel_types.')) {
      const fallbackMap = {
        'Essence': 'Essence',
        'Electrique': 'Électrique',
        'Diesel': 'Diesel',
        'Hybride': 'Hybride'
      };
      return fallbackMap[fuelType] || fuelType;
    }
    
    return translation;
  };

  // Fonction pour obtenir le label de transmission
  const getTransmissionLabel = (transmission: string | null) => {
    if (!transmission) return t('car_card.messages.not_specified');
    
    const translation = t(`car_card.transmission_types.${transmission}`);
    
    // Fallback pour les anciennes données
    if (translation.startsWith('car_card.transmission_types.')) {
      const fallbackMap = {
        'Manuelle': 'Manuelle',
        'Automatique': 'Automatique'
      };
      return fallbackMap[transmission] || transmission;
    }
    
    return translation;
  };

  return (
    <div className="group relative border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-500 flex flex-col h-full">
      {/* Image Container */}
      <div className="relative h-56 w-full bg-slate-50/50 p-6 shrink-0 overflow-hidden flex items-center justify-center">
        {/* Subtle background gradient radial */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-gray-200/20 via-slate-50/10 to-transparent pointer-events-none" />
        
        <img
          src={car.image_url || "/placeholder.png"}
          alt={car.name}
          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-in-out drop-shadow-xl z-0"
        />
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {car.category && (
            <span className="bg-white/80 backdrop-blur-md text-[12px] px-3 py-1.5 rounded-full font-bold shadow-sm border border-white/40">
              {t(`car_card.categories.${car.category}`)}
            </span>
          )}
          {car.fuel?.toLowerCase() === 'electrique' && (
            <span className="bg-green-600/90 backdrop-blur-md text-white text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full font-bold shadow-sm flex flex-row items-center gap-1 w-fit">
              <Zap className="h-3 w-3 fill-white" />
              {t('car_card.fuel_types.electrique')}
            </span>
          )}
        </div>

        {!isCarAvailable && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20 transition-opacity duration-300">
            <span className="bg-gray-900 text-white px-5 py-2 rounded-full text-[14px] font-bold shadow-xl">
              {t('car_card.status.unavailable')}
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6 flex flex-col flex-grow bg-white relative z-10">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-[18px] font-semibold text-slate-900 line-clamp-1 tracking-tight">{car.name}</h3>
        </div>
        
        {/* Specs Row */}
        <div className="flex flex-wrap items-center gap-2 mt-4 mb-auto text-[12px] text-slate-500 font-normal uppercase tracking-wider">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{car.seats || '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
            <Cog className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{getTransmissionLabel(car.transmission)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
            <div className="text-slate-400 shrink-0">{getFuelIcon(car.fuel)}</div>
            <span className="truncate max-w-[80px]">{getFuelLabel(car.fuel)}</span>
          </div>
        </div>

        <div className="w-full h-[1px] bg-slate-100 my-5" />

        {/* Footer: Price & CTA */}
        <div className="flex items-end justify-between gap-4 mt-auto">
          <div>
            <p className="text-[12px] text-slate-500 font-normal uppercase tracking-wider mb-0.5">{t('car_card.from')}</p>
            <p className="flex items-baseline text-slate-900">
              <span className="text-[18px] font-semibold">{car.price} {t('car_card.currency')}</span>
              <span className="text-[12px] text-slate-500 font-normal ml-1">/ {t('car_card.per_day', { defaultValue: 'j' })}</span>
            </p>
          </div>

          <Button
            className={cn(
              "px-5 h-12 text-[14px] font-medium transition-all duration-300 rounded-xl",
              isCarAvailable && canReserve 
                ? "bg-slate-900 text-white hover:bg-slate-950 hover:scale-105 shadow-xl hover:shadow-slate-900/20" 
                : "bg-gray-100 text-slate-400"
            )}
            onClick={() => onReserve(car)}
            disabled={!canReserve || !isCarAvailable}
          >
            {!isCarAvailable 
              ? t('car_card.actions.unavailable') 
              : t('car_card.actions.reserve_now')
            }
          </Button>
        </div>

        {!canReserve && (
          <p className="text-[12px] text-red-500/80 bg-red-50 px-3 py-2 rounded-lg text-center mt-4 font-semibold">
            {t('car_card.messages.complete_search_to_reserve')}
          </p>
        )}
      </div>
    </div>
  );
};