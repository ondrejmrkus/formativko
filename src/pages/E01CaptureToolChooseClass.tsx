import { Link } from "react-router-dom";
import { useClasses } from "@/hooks/useClasses";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function E01CaptureToolChooseClass() {
  const { data: classes = [], isLoading } = useClasses();
  const { user } = useAuth();

  const { data: counts = {} } = useQuery({
    queryKey: ["class_student_counts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("class_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      data.forEach((r) => { map[r.class_id] = (map[r.class_id] || 0) + 1; });
      return map;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 text-center border-b border-border bg-card">
        <h1 className="text-lg font-bold text-foreground">Zachytávač</h1>
        <p className="text-sm text-muted-foreground">Vyberte třídu</p>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-3 max-w-md mx-auto w-full">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nejdříve vytvořte třídu.</div>
        ) : (
          classes.map((cls) => (
            <Link
              key={cls.id}
              to={`/capture/${cls.id}`}
              className="flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
            >
              <span className="text-lg font-semibold text-foreground">{cls.name}</span>
              <span className="text-sm text-muted-foreground">{counts[cls.id] || 0} žáků</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
