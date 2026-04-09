import { formatDateDisplay } from "@/utils/dateUtils";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

interface DatePickerProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  variant?: "default" | "filter";
}

const variants = {
  default: "h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 hover:text-slate-700",
  filter: "h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-50 text-slate-700 hover:text-slate-700 hover:border-slate-300 focus:outline-none",
};

export function DatePicker({
  selected,
  onSelect,
  placeholder,
  disabled,
  className,
  variant = "default",
}: DatePickerProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              variants[variant],
              "flex items-center justify-between w-full transition-colors",
              !selected ? "text-slate-400" : "text-slate-700"
            )}
          >
            <span className="truncate">
              {selected ? (
                formatDateDisplay(selected, "dd/MM/yyyy", i18n.language)
              ) : (
                placeholder || t("admin_reservations.filters.select_date")
              )}
            </span>
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-slate-100" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={onSelect}
            disabled={disabled}
            initialFocus
            colorScheme="blue"
          />
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(undefined);
          }}
          className="absolute right-10 p-0.5 hover:bg-slate-100 rounded-full transition-colors group"
          title={t("admin_reservations.filters.reset")}
        >
          <X className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
        </button>
      )}
    </div>
  );
}
