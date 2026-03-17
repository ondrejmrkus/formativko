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
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Úvod</Link>
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground">Zachytávač</h1>
          <p className="text-sm text-muted-foreground">Vyberte třídu</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex-1 p-4 flex flex-col gap-3 max-w-md mx-auto w-full">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">Zatím nemáte žádnou třídu.</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Link to="/create-class" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
                Vytvořit třídu
              </Link>
              <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card text-foreground px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
                Zpět na úvod
              </Link>
            </div>
          </div>
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
