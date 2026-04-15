// src/components/SearchForm.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ArrowRightLeft,
  Car,
  SlidersHorizontal,
  Repeat,
  RotateCcw,
  X
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { capitalizeFirstLetter } from "@/utils/dateUtils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// --- Types ---
export interface SearchData {
  pickupLocation: string; // uuid
  returnLocation: string; // uuid
  sameLocation: boolean;
  pickupDate: Date | undefined;
  returnDate: Date | undefined;
  pickupTime: string;
  returnTime: string;
  filters?: {
    category?: string;
    transmission?: string;
    fuel?: string;
  };
}

interface SearchFormProps {
  onSearch: (searchData: SearchData) => void;
}

const MIN_BOOKING_DELAY_HOURS = 2;
const MIN_RENTAL_DURATION_MINUTES = 60;

// --- Autocomplete Input ---
const AutoCompleteInput = ({
  items,
  placeholder,
  value,
  onSelect,
  icon,
  color = "blue"
}: {
  items: { value: string; label: string }[];
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  icon?: React.ReactNode;
  color?: "blue" | "green";
}) => {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const selectedEl = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: "nearest" });
        }
      }, 0);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "group w-full justify-between h-8 px-1 border-transparent shadow-none transition-all bg-transparent overflow-hidden max-w-full hover:bg-transparent focus:ring-0",
            color === "blue"
              ? "hover:text-blue-700 text-gray-900"
              : "hover:text-green-700 text-gray-900"
          )}
        >
          <div className="flex items-center gap-2 flex-1 text-left min-w-0 pr-2">
            <span
              className={cn(
                "block truncate transition-colors text-xs font-semibold w-full",
                !selectedItem && "text-slate-400 font-medium"
              )}
            >
              {selectedItem ? selectedItem.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40 group-hover:opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[60vh] overflow-y-auto"
        align="start"
        side="bottom"
      >
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            className="focus-visible:ring-0 focus-visible:ring-offset-0 border-none focus-visible:bg-slate-50/50 transition-colors"
          />
          <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
            {t("searchForm.noLocations")}
          </CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto" ref={listRef}>
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={item.label}
                onSelect={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  color === "blue"
                    ? "data-[selected=true]:bg-blue-600 data-[selected=true]:text-white"
                    : "data-[selected=true]:bg-green-600 data-[selected=true]:text-white"
                )}
                data-selected={value === item.value}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === item.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const DateTimeField = ({
  date,
  time,
  onDateChange,
  onTimeChange,
  color = "blue",
  disabledDates,
  minTime,
  placeholder,
  colorScheme = "default"
}: {
  date?: Date
  time: string
  onDateChange: (d?: Date) => void
  onTimeChange: (t: string) => void
  color?: "blue" | "green"
  disabledDates?: (date: Date) => boolean
  minTime?: string
  placeholder?: string
  colorScheme?: "blue" | "green" | "default"
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false)
  const timeListRef = useRef<HTMLDivElement>(null);

  // Generate 24hr time slots (every 30 mins)
  const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
    const hours = Math.floor(i / 2).toString().padStart(2, "0");
    const mins = (i % 2 === 0 ? "00" : "30");
    return `${hours}:${mins}`;
  });

  // Scroll to selected time when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const selectedEl = timeListRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: "center" });
        }
      }, 0);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>

      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-xs px-1 font-semibold border-transparent shadow-none transition-all bg-transparent hover:bg-transparent focus:ring-0",
            color === "blue"
              ? "hover:text-blue-700 text-slate-900"
              : "hover:text-green-700 text-slate-900",
            !date && "text-slate-400 font-medium"
          )}
        >
          {date
            ? `${capitalizeFirstLetter(format(date, "dd MMM"))} • ${time}`
            : placeholder || t("searchForm.selectDateTime")}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[290px] p-2"
        align="start"
        side="bottom"
      >

        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onDateChange(d)
          }}
          disabled={disabledDates}
          captionLayout="dropdown-buttons"
          fromYear={new Date().getFullYear()}
          toYear={new Date().getFullYear() + 2}
          className="p-2 text-xs"
          colorScheme={colorScheme}
        />

        {date && (
          <>
            <div className="mt-2 text-center text-xs text-gray-700 font-medium mb-1 pt-2 border-t border-slate-100">
              {t("searchForm.time")}
            </div>
            <div 
              className="px-2 pb-2 h-32 overflow-y-auto grid grid-cols-4 gap-1"
              ref={timeListRef}
            >
              {TIME_SLOTS.map((slot) => {
                const isDisabled = minTime && slot < minTime;
                const isSelected = slot === time;
                return (
                  <button
                    key={slot}
                    type="button"
                    data-selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => {
                        onTimeChange(slot);
                        setOpen(false); // OPTIONAL: Fermer après selection heure ? 
                    }}
                    className={cn(
                      "text-[10px] py-1.5 rounded-md transition-all text-center border font-medium",
                      isDisabled && "opacity-30 pointer-events-none cursor-not-allowed border-transparent bg-transparent text-gray-400",
                      !isDisabled && !isSelected && colorScheme === "blue" && "hover:bg-blue-100 hover:text-blue-600 border-gray-100 text-gray-700",
                      !isDisabled && !isSelected && colorScheme === "green" && "hover:bg-green-100 hover:text-green-600 border-gray-100 text-gray-700",
                      !isDisabled && !isSelected && colorScheme === "default" && "hover:bg-slate-100 border-gray-100 text-gray-700",
                      isSelected && colorScheme === "blue" && "bg-blue-400 text-white border-blue-400 shadow-sm hover:bg-blue-500 hover:text-white",
                      isSelected && colorScheme === "green" && "bg-green-400 text-white border-green-400 shadow-sm hover:bg-green-500 hover:text-white",
                      isSelected && colorScheme === "default" && "bg-blue-400 text-white border-blue-400 shadow-sm hover:bg-blue-500 hover:text-white"
                    )}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          </>
        )}

      </PopoverContent>

    </Popover>
  )
}

// --- Search Form ---
export const SearchForm = ({ onSearch }: SearchFormProps) => {
  const { t, i18n } = useTranslation();
  const [pickupLocation, setPickupLocation] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [sameLocation, setSameLocation] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("09:00");
  const [returnTime, setReturnTime] = useState("09:00");
  const [activeLocations, setActiveLocations] = useState<{ value: string; label: string; type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    category: "",
    transmission: "",
    fuel: ""
  });

  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  const [filterOptions, setFilterOptions] = useState({
    category: [] as string[],
    fuel: [] as string[]
  });

  useEffect(() => {
    fetchActiveLocations();
  }, [i18n.language]);

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    const { data, error } = await supabase.from("cars").select("category, fuel");
    if (error || !data) return;
    const unique = (key: keyof typeof data[0]) =>
      [...new Set(data.map((car) => car[key]).filter(Boolean))];
    setFilterOptions({ category: unique("category"), fuel: unique("fuel") });
  };

  const buildDateTime = (date?: Date, time?: string) => {
    if (!date || !time) return null;

    const [h, m] = time.split(":");
    const d = new Date(date);
    d.setHours(parseInt(h), parseInt(m), 0, 0);

    return d;
  };

  const getMinPickupTime = () => {
    if (!pickupDate) return undefined;
    
    // Si la date choisie est aujourd'hui (ou avant -> bloqué de toute facon par disableDates), on impose +2h
    const now = new Date();
    if (startOfDay(pickupDate).getTime() === startOfDay(now).getTime()) {
       now.setHours(now.getHours() + MIN_BOOKING_DELAY_HOURS);
       const h = now.getHours().toString().padStart(2, "0");
       const m = now.getMinutes().toString().padStart(2, "0");
       return `${h}:${m}`;
    }
    
    return undefined;
  };

  const getMinReturnTime = () => {
    if (!pickupDate || !returnDate || !pickupTime) return undefined;

    // Si la date de retour est la même que la date de pickup, on force pickupTime + 1h
    if (startOfDay(pickupDate).getTime() === startOfDay(returnDate).getTime()) {
      const pTimeStr = pickupTime.split(":");
      const pDateWithTime = new Date(pickupDate);
      pDateWithTime.setHours(parseInt(pTimeStr[0]), parseInt(pTimeStr[1]), 0, 0);
      
      const minReturn = new Date(pDateWithTime.getTime() + MIN_RENTAL_DURATION_MINUTES * 60000);
      
      const h = minReturn.getHours().toString().padStart(2, "0");
      const m = minReturn.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }

    return undefined;
  };

  useEffect(() => {
    const pickupDateTime = buildDateTime(pickupDate, pickupTime);
    const returnDateTime = buildDateTime(returnDate, returnTime);

    if (!pickupDateTime || !returnDateTime) return;

    const minReturn = new Date(
      pickupDateTime.getTime() + MIN_RENTAL_DURATION_MINUTES * 60000
    );

    if (returnDateTime < minReturn) {
      const h = minReturn.getHours().toString().padStart(2, "0");
      const m = minReturn.getMinutes().toString().padStart(2, "0");

      setReturnDate(minReturn);
      setReturnTime(`${h}:${m}`);
    }
  }, [pickupDate, pickupTime]);

  const isPickupTimeValid = () => {
    if (!pickupDate) return true;

    const now = new Date();

    const pickupDateTime = new Date(pickupDate);
    const [h, m] = pickupTime.split(":");
    pickupDateTime.setHours(parseInt(h), parseInt(m), 0, 0);

    const minPickup = new Date(now.getTime() + MIN_BOOKING_DELAY_HOURS * 60 * 60 * 1000);

    return pickupDateTime >= minPickup;
  };

  const isReturnAfterPickup = () => {
    if (!pickupDate || !returnDate) return true;

    const pickup = new Date(pickupDate);
    const [ph, pm] = pickupTime.split(":");
    pickup.setHours(parseInt(ph), parseInt(pm), 0, 0);

    const ret = new Date(returnDate);
    const [rh, rm] = returnTime.split(":");
    ret.setHours(parseInt(rh), parseInt(rm), 0, 0);

    return ret > pickup;
  };

  const fetchActiveLocations = async () => {
    try {
      setIsLoading(true);

      // Récupération des localisations actives
      const { data: locations, error: locError } = await supabase
        .from("active_localisations")
        .select("id, localisation_value, localisation_type")
        .eq("is_active", true)
        .order("localisation_type")
        .order("localisation_value");

      if (locError) throw locError;

      // Récupération des traductions pour la langue courante
      const { data: translations, error: transError } = await supabase
        .from("localisation_translations")
        .select("localisation_id, display_name, language")
        .eq("language", i18n.language); // utilise la langue courante
      if (transError) throw transError;

      // Fusion localisation + traduction
      const translationMap = new Map(
        translations.map((t: any) => [t.localisation_id, t.display_name])
      );

      const formatted = locations.map((loc: any) => ({
        value: loc.id,
        label: translationMap.get(loc.id) ?? loc.localisation_value,
        type: loc.localisation_type
      }));

      setActiveLocations(formatted);

    } catch (err) {
      console.error("Erreur chargement locations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationLabel = (value: string) =>
    activeLocations.find((l) => l.value === value)?.label ?? value;

  const handleSearch = () => {
    if (!pickupLocation || !pickupDate || !returnDate) {
      toast({
        title: t("searchForm.error"),
        description: t("searchForm.errorRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!isPickupTimeValid()) {
      toast({
        title: t("searchForm.invalidPickup"),
        description: t("searchForm.pickupTooSoon"),
        variant: "destructive",
      });
      return;
    }

    if (!isReturnAfterPickup()) {
      toast({
        title: t("searchForm.invalidReturn"),
        description: t("searchForm.returnBeforePickup"),
        variant: "destructive",
      });
      return;
    }

    const pickupDateTime = buildDateTime(pickupDate, pickupTime);
    const returnDateTime = buildDateTime(returnDate, returnTime);

    if (pickupDateTime && returnDateTime) {
      const diffMinutes = (returnDateTime.getTime() - pickupDateTime.getTime()) / 60000;

      if (diffMinutes < MIN_RENTAL_DURATION_MINUTES) {
        toast({
          title: t("searchForm.invalidDuration"),
          description: t("searchForm.rentalTooShort"),
          variant: "destructive",
        });
        return;
      }
    }
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    onSearch({
      pickupLocation,
      returnLocation: sameLocation ? pickupLocation : returnLocation,
      sameLocation,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      filters
    });
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-3 sm:p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] relative z-10 w-full max-w-6xl mx-auto transition-all">
      {/* Header & Style Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 px-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl border border-slate-100 flex items-center justify-center shadow-sm">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">{t("searchForm.title")}</h2>
          </div>
        </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "bg-slate-50 hover:bg-blue-600 border-none text-xs font-semibold h-8 px-4 rounded-full transition-all shadow-sm flex items-center gap-2 w-22 justify-center overflow-hidden no-focus-ring",
                    activeFilterCount > 0 && "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t("searchForm.filters")}</span>
                  {activeFilterCount > 0 && (
                    <span className="shrink-0 bg-blue-600 text-white text-[10px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-40 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-4 rounded-2xl shadow-2xl border-slate-100" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{t("searchForm.filters")}</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Categorie */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("searchForm.category")}</Label>
                      <div className="relative group">
                        <select
                          className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl cursor-pointer focus-subtle font-sans"
                          value={filters.category}
                          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        >
                          <option value="">{t("searchForm.all")}</option>
                          {filterOptions.category.map((cat) => (
                            <option key={cat} value={cat}>
                              {t(`searchForm.categories.${cat.toLowerCase()}`)}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Transmission */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("searchForm.transmission")}</Label>
                      <div className="relative group">
                        <select
                          className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl cursor-pointer focus-subtle font-sans"
                          value={filters.transmission}
                          onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
                        >
                          <option value="">{t("searchForm.all")}</option>
                          <option value="automatic">{t("transmission.automatic")}</option>
                          <option value="manual">{t("transmission.manual")}</option>
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Carburant */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("searchForm.fuel")}</Label>
                      <div className="relative group">
                        <select
                          className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl cursor-pointer focus-subtle font-sans"
                          value={filters.fuel}
                          onChange={(e) => setFilters({ ...filters, fuel: e.target.value })}
                        >
                          <option value="">{t("searchForm.allFuel")}</option>
                          {filterOptions.fuel.map((f) => (
                            <option key={f} value={f}>
                              {t(`searchForm.fuel_types.${f.toLowerCase()}`)}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-[10px] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full uppercase tracking-widest no-focus-ring flex items-center gap-1.5 transition-all border border-transparent hover:border-red-100"
                onClick={() => setFilters({ category: "", transmission: "", fuel: "" })}
              >
                <RotateCcw className="h-3 w-3" />
                {t("searchForm.resetFilters")}
              </Button>
            )}
          </div>
        </div>


      {/* Main Search Row - Hyper-Clean Container */}
      <div className="bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center lg:divide-x lg:divide-slate-100">
          
          {/* Pickup Section */}
          <div className="flex-[1.4] w-full min-w-0 bg-white lg:bg-transparent rounded-xl lg:rounded-none border border-slate-200 lg:border-none p-3 lg:px-6 lg:py-2.5 transition-all hover:bg-slate-50/50">
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 flex flex-row items-center gap-2">
              <MapPinIcon className="h-3.5 w-3.5 text-blue-600/70" />
              {t("searchForm.pickupPlaceholder")}
            </Label>
            <AutoCompleteInput
              items={activeLocations}
              placeholder={isLoading ? t("searchForm.loadingLocations") : t("searchForm.pickupPlaceholder")}
              value={pickupLocation}
              onSelect={setPickupLocation}
              icon={<MapPinIcon className="h-4 w-4 text-blue-600" />}
              color="blue"
            />
          </div>

          {/* Date & Time Pickup */}
          <div className="flex-[1.2] w-full min-w-0 bg-white lg:bg-transparent rounded-xl lg:rounded-none border border-slate-200 lg:border-none p-3 lg:px-6 lg:py-2.5 transition-all hover:bg-slate-50/50">
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 flex flex-row items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600/70" />
              {t("searchForm.pickupDate")}
            </Label>
            <DateTimeField
              date={pickupDate}
              time={pickupTime}
              onDateChange={setPickupDate}
              onTimeChange={setPickupTime}
              color="blue"
              disabledDates={(date) => date < startOfDay(new Date())}
              minTime={getMinPickupTime()}
              placeholder={t("searchForm.pickupDatePlaceholder")}
              colorScheme="blue"
            />
          </div>

          {/* Same Location Button (Swap) */}
          <div className="flex shrink-0 w-full lg:w-14 items-center justify-center lg:py-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSameLocation(!sameLocation)}
              className={cn(
                "h-9 w-full lg:w-9 rounded-xl border-slate-200 transition-all bg-white shadow-sm z-10",
                "hover:scale-110 active:scale-95",
                sameLocation
                  ? "bg-green-50/80 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700"
                  : "text-slate-400 hover:bg-blue-50/80 hover:text-blue-600 hover:border-blue-200"
              )}
              title={t("searchForm.swap")}
            >
              <ArrowRightLeft className={cn("h-3.5 w-3.5 transition-transform duration-500", sameLocation && "rotate-180")} />
              <span className="inline-block lg:hidden text-xs font-semibold ml-2">
                {sameLocation ? t("searchForm.sameLocation") : t("searchForm.differentLocation")}
              </span>
            </Button>
          </div>

          {/* Return Section */}
          <div className="flex-[1.4] w-full min-w-0 bg-white lg:bg-transparent rounded-xl lg:rounded-none border border-slate-200 lg:border-none p-3 lg:px-6 lg:py-2.5 transition-all hover:bg-slate-50/50">
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 flex flex-row items-center gap-2">
              <MapPinIcon className="h-3.5 w-3.5 text-green-600/70" />
              {t("searchForm.returnPlaceholder")}
            </Label>
            {sameLocation ? (
              <div className="relative">
                <Input
                  disabled
                  className={cn(
                    "bg-slate-50/50 border-slate-200 h-8 w-full shadow-none truncate pr-2 cursor-not-allowed opacity-60 text-xs px-1",
                    pickupLocation ? "text-slate-900 font-semibold" : "text-slate-400 font-medium"
                  )}
                  value={getLocationLabel(pickupLocation) || t("searchForm.pickupPlaceholder")}
                  readOnly
                />
              </div>
            ) : (
              <AutoCompleteInput
                items={activeLocations}
                placeholder={isLoading ? t("searchForm.loadingLocations") : t("searchForm.returnPlaceholder")}
                value={returnLocation}
                onSelect={setReturnLocation}
                icon={<MapPinIcon className="h-4 w-4 text-green-600" />}
                color="green"
              />
            )}
          </div>

          {/* Date & Time Return */}
          <div className="flex-[1.2] w-full min-w-0 bg-white lg:bg-transparent rounded-xl lg:rounded-none border border-slate-200 lg:border-none p-3 lg:px-6 lg:py-2.5 transition-all hover:bg-slate-50/50">
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 flex flex-row items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 text-green-600/70" />
              {t("searchForm.returnDate")}
            </Label>
            <DateTimeField
              date={returnDate}
              time={returnTime}
              onDateChange={setReturnDate}
              onTimeChange={setReturnTime}
              color="green"
              disabledDates={(date) => {
                const today = startOfDay(new Date());
                return date < today || (pickupDate ? date < startOfDay(pickupDate) : false);
              }}
              minTime={getMinReturnTime()}
              placeholder={t("searchForm.returnDatePlaceholder")}
              colorScheme="green"
            />
          </div>

          {/* Final Search Action */}
          <div className="shrink-0 lg:px-4">
            <Button
              onClick={handleSearch}
              className="bg-blue-600 text-white h-12 w-full lg:w-16 rounded-xl transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 disabled:opacity-40"
              disabled={!pickupLocation || (!sameLocation && !returnLocation) || !pickupDate || !returnDate}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
