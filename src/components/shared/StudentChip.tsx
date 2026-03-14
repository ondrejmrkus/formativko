import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudentChipProps {
  name: string;
  removable?: boolean;
  onRemove?: () => void;
}

export function StudentChip({ name, removable = false, onRemove }: StudentChipProps) {
  return (
    <Badge variant="secondary" className="gap-1 py-1 px-3 text-sm">
      {name}
      {removable && (
        <X
          className="h-3 w-3 cursor-pointer hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        />
      )}
    </Badge>
  );
}
