import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useCreateClass } from "@/hooks/useClasses";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function A03CreateClass() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: allStudents = [] } = useStudents();
  const createClass = useCreateClass();
  const [className, setClassName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const availableStudents = allStudents
    .filter((s) => !selectedStudentIds.includes(s.id))
    .filter((s) => !search || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()));

  const addStudent = (id: string) => {
    setSelectedStudentIds((prev) => [...prev, id]);
    setSearchOpen(false);
    setSearch("");
  };

  const removeStudent = (id: string) => {
    setSelectedStudentIds((prev) => prev.filter((s) => s !== id));
  };

  const handleCreate = async () => {
    if (!className.trim()) {
      toast({ title: "Zadejte název třídy", variant: "destructive" });
      return;
    }
    try {
      await createClass.mutateAsync({ name: className.trim(), studentIds: selectedStudentIds });
      toast({ title: `Třída "${className}" vytvořena`, description: `${selectedStudentIds.length} žáků přidáno` });
      navigate("/student-profiles");
    } catch {
      toast({ title: "Chyba při vytváření třídy", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Vytvořit třídu" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Vytvořit třídu</h1>

        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground block mb-2">Název třídy</label>
          <Input
            placeholder="např. 6.A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="bg-card max-w-xs"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">Žáci ve třídě</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedStudentIds.map((sid) => {
              const s = allStudents.find((st) => st.id === sid);
              if (!s) return null;
              return (
                <span key={sid} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  {getStudentDisplayName(s)}
                  <button onClick={() => removeStudent(sid)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            <Popover open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setSearch(""); }}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:bg-accent transition-colors">
                  <Plus className="h-3 w-3" />
                  Přidat žáka
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
                        onClick={() => addStudent(s.id)}
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
          {allStudents.length === 0 && (
            <p className="text-xs text-muted-foreground">Nejdříve vytvořte žákovské profily.</p>
          )}
        </div>

        <Button className="w-full" size="lg" onClick={handleCreate} disabled={createClass.isPending}>
          {createClass.isPending ? "Vytváření…" : "Vytvořit třídu"}
        </Button>
      </div>
    </AppLayout>
  );
}
