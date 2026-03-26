import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { enUS, fr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  colorScheme?: "blue" | "green" | "default";
};

function Calendar({ className, classNames, showOutsideDays = true, colorScheme = "default", ...props }: CalendarProps) {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language?.startsWith('fr') ? fr : enUS;

  return (
    <DayPicker
      locale={currentLocale}
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown-buttons"
      fromYear={1924}
      toYear={new Date().getFullYear() + 10}
      className={cn("p-2 text-xs", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center w-full min-w-full",
        caption_label: "hidden",
        caption_dropdowns: "flex justify-center items-center gap-2 ml-4",
        nav: "flex items-center static",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center border border-slate-200 rounded-md z-10"
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse space-y-1",
        head_row: "flex justify-center",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-1 justify-center",
        cell:
          "h-9 w-9 text-center text-sm p-0 relative rounded-md transition-colors \
          [&:has([aria-selected].day-range-end)]:rounded-r-md \
          [&:has([aria-selected].day-outside)]:bg-accent/50 \
          [&:has([aria-selected])]:bg-transparent \
          first:[&:has([aria-selected])]:rounded-l-md \
          last:[&:has([aria-selected])]:rounded-r-md \
          focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 text-sm font-normal aria-selected:opacity-100 flex items-center justify-center rounded-md transition-colors",
          colorScheme === "blue" && "hover:bg-blue-100 hover:text-blue-600 text-slate-900 border-transparent",
          colorScheme === "green" && "hover:bg-green-100 hover:text-green-600 text-slate-900 border-transparent",
          colorScheme === "default" && "hover:bg-blue-100 hover:text-blue-600 text-slate-900 border-transparent",
          "aria-disabled:pointer-events-none aria-disabled:opacity-30 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "aria-selected:opacity-100",
          colorScheme === "blue" && "bg-blue-400 text-white hover:bg-blue-500 hover:text-white focus:bg-blue-600",
          colorScheme === "green" && "bg-green-400 text-white hover:bg-green-500 hover:text-white focus:bg-green-600",
          colorScheme === "default" && "bg-blue-400 text-white hover:bg-blue-500 hover:text-white focus:bg-blue-600"
        ),
        day_today: cn(
          "bg-blue-500 text-blue-100",
          colorScheme === "blue" && "bg-blue-500 text-blue-100",
          colorScheme === "green" && "bg-green-500 text-green-100"
        ),
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        dropdown: "h-7 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold focus-subtle",
        dropdown_month: "flex-1",
        dropdown_year: "w-20",
        vhidden: "hidden",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
