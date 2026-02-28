// src/components/SearchForm.tsx
import { useState, useEffect } from "react";
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
  ChevronsUpDown,
  Search,
  ArrowRightLeft,
  Car,
  SlidersHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---
export interface SearchData {
  pickupLocation: string;
  returnLocation: string;
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

// --- Autocomplete Input ---
const AutoCompleteInput = ({
  items,
  placeholder,
  value,
  onSelect,
  icon
}: {
  items: { value: string; label: string }[];
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  icon?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);
  const { t } = useTranslation();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 border-gray-300 hover:border-blue-500 transition-colors min-w-0"
        >
          <div className="flex items-center gap-2 flex-1 text-left min-w-0">
            {icon}
            <span className={cn("truncate", !selectedItem && "text-muted-foreground")}>
              {selectedItem ? selectedItem.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[60vh] overflow-y-auto" 
        align="start"
        side="bottom"
      >
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            {t("searchForm.noLocations")}
          </CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={item.label}
                onSelect={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === item.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// --- Date Picker ---
const DatePickerField = ({
  label,
  date,
  onDateChange,
  icon,
  color = "blue",
  disabledCondition
}: {
  label: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  icon: React.ReactNode;
  color?: "blue" | "green";
  disabledCondition?: (date: Date) => boolean;
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-12 border-gray-300 text-sm relative",
              color === "blue" 
                ? "hover:border-blue-500 focus:border-blue-500" 
                : "hover:border-green-500 focus:border-green-500",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd/MM/yy") : t("searchForm.select")}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 mx-4 sm:mx-0" 
          align="center"
          side="bottom"
          avoidCollisions
          collisionPadding={16}
        >
          <div className="max-h-[80vh] overflow-y-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                onDateChange(selectedDate);
                setIsCalendarOpen(false);
              }}
              disabled={disabledCondition}
              initialFocus
              className="pointer-events-auto"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// --- Time Picker ---
const TimePickerField = ({
  label,
  value,
  onChange,
  color = "blue",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  color?: string;
}) => {
  const [open, setOpen] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00","05","10","15","20","25","30","35","40","45","50","55"];
  const { t } = useTranslation();

  return (
    <div className="space-y-3 ml-20">
      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <ClockIcon className={`h-4 w-4 ${color === 'blue' ? 'text-blue-600' : 'text-green-600'}`} />
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-12 w-32 justify-start text-left text-gray-800 border-gray-300 focus:border-${color}-500 cursor-pointer`}
          >
            {value || t("searchForm.selectTime")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{t("searchForm.hours")}</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {hours.map((h) => (
                  <Button
                    key={h}
                    variant={value.startsWith(h) ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      const m = value.split(":")[1] || "00";
                      onChange(`${h}:${m}`);
                    }}
                  >
                    {h}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{t("searchForm.minutes")}</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {minutes.map((m) => (
                  <Button
                    key={m}
                    variant={value.endsWith(m) ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      const h = value.split(":")[0] || "00";
                      onChange(`${h}:${m}`);
                      setOpen(false);
                    }}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

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

  const [filters, setFilters] = useState({
    category: "",
    transmission: "",
    fuel: ""
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const [filterOptions, setFilterOptions] = useState({
    category: [] as string[],
    transmission: [] as string[],
    fuel: [] as string[]
  });

  useEffect(() => { fetchFilters(); fetchActiveLocations(); }, []);

  const fetchFilters = async () => {
    const { data, error } = await supabase.from("cars").select("category, transmission, fuel");
    if (error || !data) return;
    const unique = (key: string) => [...new Set(data.map((car) => car[key]).filter(Boolean))];
    setFilterOptions({ category: unique("category"), transmission: unique("transmission"), fuel: unique("fuel") });
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
      const formatted = locations.map((loc: any) => {
        const tr = translations.find((t: any) => t.localisation_id === loc.id);
        const label = tr ? tr.display_name : loc.localisation_value;
        return {
          value: loc.localisation_value,
          label,
          type: loc.localisation_type
        };
      });

      setActiveLocations(formatted);

    } catch (err) {
      console.error("Erreur chargement locations:", err);
      setActiveLocations(getFallbackLocations());
    } finally {
      setIsLoading(false);
    }
  };


  const getFallbackLocations = () => {
    const airports = ["agadir","casablanca","marrakech","rabat","tanger"].map(a => ({
      value: `airport_${a}`,
      label: t(`airports.${a}`),
      type: "airport"
    }));
    const stations = ["casa_voyageurs","rabat_agdal","marrakech"].map(s => ({
      value: `station_${s}`,
      label: t(`stations.${s}`),
      type: "station"
    }));
    return [...airports, ...stations];
  };



  const getLocationLabel = (value: string) => activeLocations.find(item => item.value === value)?.label || value;

  const handleSearch = () => {
    if (!pickupLocation || !pickupDate || !returnDate) return console.error(t("searchForm.errorRequired"));
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
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-500/5 relative overflow-visible">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8" >
        <div className="p-2 bg-blue-100 rounded-lg">
          <Car className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t("searchForm.title")}</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {t("searchForm.filters")}
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs py-0.5 px-2 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="p-4 w-72 space-y-4">
            {/* Catégorie */}
            <div>
              <Label className="font-medium text-sm mb-1 block">
                {t("searchForm.category")}
              </Label>
              <select
                className="w-full border p-2 rounded"
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
            </div>

            {/* Transmission */}
            <div>
              <Label className="font-medium text-sm mb-1 block">
                {t("searchForm.transmission")}
              </Label>
              <select
                className="w-full border p-2 rounded"
                value={filters.transmission}
                onChange={(e) => setFilters({ ...filters, transmission: e.target.value })}
              >
                <option value="">{t("searchForm.all")}</option>
                {filterOptions.transmission.map((tr) => (
                  <option key={tr} value={tr}>
                    {t(`searchForm.transmission_types.${tr.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Carburant */}
            <div>
              <Label className="font-medium text-sm mb-1 block">
                {t("searchForm.fuel")}
              </Label>
              <select
                className="w-full border p-2 rounded"
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
            </div>

            {/* Reset filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                className="w-full text-red-500"
                onClick={() => setFilters({ category: "", transmission: "", fuel: "" })}
              >
                {t("searchForm.resetFilters")}
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Locations */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:gap-4 mb-6 sm:mb-8">
        <div className="flex-1 space-y-3 min-w-0">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-blue-600" />
            {t("searchForm.pickupPlaceholder")}
          </Label>
          <AutoCompleteInput
            items={activeLocations}
            placeholder={isLoading ? t("searchForm.loadingLocations") : t("searchForm.pickupPlaceholder")}
            value={pickupLocation}
            onSelect={setPickupLocation}
            icon={<MapPinIcon className="h-4 w-4 text-blue-600" />}
          />
        </div>

        <div className="flex justify-center sm:justify-start sm:pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSameLocation(!sameLocation)}
            className={cn(
              "rounded-full p-3 border-2 transition-all duration-300",
              sameLocation
                ? "bg-green-50 border-green-200 text-green-600"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
            )}
            title={t("searchForm.swap")}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-green-600" />
            {t("searchForm.returnPlaceholder")}
          </Label>
          {sameLocation ? (
            <div className="relative">
              <Input
                value={getLocationLabel(pickupLocation)}
                readOnly
                className="bg-green-50 border-green-200 cursor-not-allowed h-12"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm text-green-700 bg-green-50/80 px-2 sm:px-3 py-1 rounded-full font-medium">
                  {t("searchForm.swap")}
                </span>
              </div>
            </div>
          ) : (
            <AutoCompleteInput
              items={activeLocations}
              placeholder={isLoading ? t("searchForm.loadingLocations") : t("searchForm.returnPlaceholder")}
              value={returnLocation}
              onSelect={setReturnLocation}
              icon={<MapPinIcon className="h-4 w-4 text-green-600" />}
            />
          )}
        </div>
      </div>

      {/* Dates & Times */}
      <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="font-semibold text-gray-900">{t("searchForm.pickupDate")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <DatePickerField
              label={t("searchForm.pickupDate")}
              date={pickupDate}
              onDateChange={setPickupDate}
              icon={<CalendarIcon className="h-4 w-4 text-blue-600" />}
              color="blue"
              disabledCondition={(date) => date < new Date()}
            />
            <TimePickerField
              label={t("searchForm.pickupTime")}
              value={pickupTime}
              onChange={setPickupTime}
              color="blue"
            />
          </div>
        </div>

        <div className="space-y-4 ml-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-6 bg-green-600 rounded-full"></div>
            <h3 className="font-semibold text-gray-900">{t("searchForm.returnDate")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <DatePickerField
              label={t("searchForm.returnDate")}
              date={returnDate}
              onDateChange={setReturnDate}
              icon={<CalendarIcon className="h-4 w-4 text-green-600" />}
              color="green"
              disabledCondition={(date) => date < (pickupDate || new Date())}
            />
            <TimePickerField
              label={t("searchForm.returnTime")}
              value={returnTime}
              onChange={setReturnTime}
              color="green"
            />
          </div>
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-4">
        <Button
          onClick={handleSearch}
          className="w-full bg-blue-600 text-white h-12 text-lg"
          disabled={!pickupLocation || !pickupDate}
        >
          <Search className="mr-2 h-5 w-5" />
          {t("searchForm.search")}
        </Button>
      </div>
    </div>
  );
};
