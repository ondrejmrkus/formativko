import { Calendar } from "lucide-react";

interface DateFieldProps {
  date: string;
  label?: string;
}

export function DateField({ date, label = "Datum" }: DateFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground block mb-1">{label}</label>
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{date}</span>
      </div>
    </div>
  );
}
