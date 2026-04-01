import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStudentDisplayName } from "@/hooks/useStudents";

interface StudentPickerProps {
  allStudents: any[];
  selectedStudentIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  addLabel?: string;
}

export function StudentPicker({
  allStudents,
  selectedStudentIds,
  onAdd,
  onRemove,
  addLabel = "Vybrat žáka",
}: StudentPickerProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const availableStudents = allStudents
    .filter((s) => !selectedStudentIds.includes(s.id))
    .filter((s) => !search || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = (id: string) => {
    onAdd(id);
    setSearchOpen(false);
    setSearch("");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {selectedStudentIds.map((sid) => {
        const s = allStudents.find((st) => st.id === sid);
        if (!s) return null;
        return (
          <span key={sid} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
            {getStudentDisplayName(s)}
            <button onClick={() => onRemove(sid)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <Popover open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setSearch(""); }}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:bg-accent transition-colors">
            <Plus className="h-3 w-3" />
            {addLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            placeholder="Hledat žáka..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 text-sm"
            autoFocus
          />
          <div className="max-h-48 overflow-auto space-y-0.5">
            {availableStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-1">Žádní žáci</p>
            ) : (
              availableStudents.slice(0, 20).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleAdd(s.id)}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent text-foreground transition-colors"
                >
                  {getStudentDisplayName(s)}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
