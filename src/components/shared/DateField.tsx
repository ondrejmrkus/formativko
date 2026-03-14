import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateFieldProps {
  date: Date;
  onDateChange?: (date: Date) => void;
  label?: string;
}

export function DateField({ date, onDateChange, label = "Datum" }: DateFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground block mb-1">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-card",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
            {date ? format(date, "d. M. yyyy", { locale: cs }) : "Vyberte datum"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange?.(d)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
