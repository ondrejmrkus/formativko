import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterGroup {
  label: string;
  options: string[];
}

interface ClassFilterBarProps {
  groups: FilterGroup[];
}

export function ClassFilterBar({ groups }: ClassFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {groups.map((group) => (
        <div key={group.label} className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">{group.label}:</span>
          {group.options.map((option) => (
            <Badge
              key={option}
              variant="secondary"
              className="cursor-pointer hover:bg-accent"
            >
              {option}
            </Badge>
          ))}
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent gap-1"
          >
            <Plus className="h-3 w-3" />
            Přidat
          </Badge>
        </div>
      ))}
    </div>
  );
}
