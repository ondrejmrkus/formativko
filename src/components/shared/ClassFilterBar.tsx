import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FilterGroup {
  label: string;
  options: string[];
}

interface ClassFilterBarProps {
  groups: FilterGroup[];
  selectedValues?: Record<string, string[]>;
  onToggle?: (groupLabel: string, option: string) => void;
  vertical?: boolean;
}

export function ClassFilterBar({ groups, selectedValues = {}, onToggle, vertical = false }: ClassFilterBarProps) {
  const [addSearch, setAddSearch] = useState<Record<string, string>>({});
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <div className={`${vertical ? "flex flex-col gap-3" : "flex flex-wrap gap-4"} mb-4`}>
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
                {isSelected && <X className="h-3 w-3 ml-1" />}
              </Badge>
            );
          })}
          <Popover
            open={openGroup === group.label}
            onOpenChange={(open) => {
              setOpenGroup(open ? group.label : null);
              if (!open) setAddSearch((prev) => ({ ...prev, [group.label]: "" }));
            }}
          >
            <PopoverTrigger asChild>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent gap-1"
              >
                <Plus className="h-3 w-3" />
                Přidat
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <Input
                placeholder={`Hledat ${group.label.toLowerCase()}...`}
                value={addSearch[group.label] || ""}
                onChange={(e) =>
                  setAddSearch((prev) => ({ ...prev, [group.label]: e.target.value }))
                }
                className="mb-2 h-8 text-sm"
                autoFocus
              />
              <div className="max-h-48 overflow-auto space-y-0.5">
                {group.options
                  .filter((o) =>
                    !addSearch[group.label] ||
                    o.toLowerCase().includes((addSearch[group.label] || "").toLowerCase())
                  )
                  .map((option) => {
                    const isSelected = selectedValues[group.label]?.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          onToggle?.(group.label, option);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ))}
    </div>
  );
}
