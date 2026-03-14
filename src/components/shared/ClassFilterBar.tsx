import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterGroup {
  label: string;
  options: string[];
}

interface ClassFilterBarProps {
  groups: FilterGroup[];
  selectedValues?: Record<string, string[]>;
  onToggle?: (groupLabel: string, option: string) => void;
}

export function ClassFilterBar({ groups, selectedValues = {}, onToggle }: ClassFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {groups.map((group) => (
        <div key={group.label} className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">{group.label}:</span>
          {group.options.map((option) => {
            const isSelected = selectedValues[group.label]?.includes(option);
            return (
              <Badge
                key={option}
                variant={isSelected ? "default" : "secondary"}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "" : "hover:bg-accent"
                }`}
                onClick={() => onToggle?.(group.label, option)}
              >
                {option}
              </Badge>
            );
          })}
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
