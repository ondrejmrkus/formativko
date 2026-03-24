import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { Camera, Clock, FileText } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useEvaluationGroups } from "@/hooks/useEvaluations";
import { useClasses } from "@/hooks/useClasses";

export default function A01Dashboard() {
  const { user } = useAuth();
  const { displayName } = useProfile();
  const { data: allStudents = [] } = useStudents();
  const { data: evaluationGroups = [] } = useEvaluationGroups();
  const { data: classes = [] } = useClasses();

  // Pending evaluations (waiting status)
  const { data: pendingEvaluations = [] } = useQuery({
    queryKey: ["evaluations", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, student_id, group_id, subject, period, status")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Proofs captured this week
  const { data: proofsThisWeek = 0 } = useQuery({
    queryKey: ["proofs", "this-week"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count, error } = await supabase
        .from("proofs_of_learning")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Class student counts
  const { data: classCounts = {} } = useQuery({
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

  // Group pending evaluations by group
  const pendingByGroup = pendingEvaluations.reduce<Record<string, typeof pendingEvaluations>>((acc, ev) => {
    const gid = ev.group_id || "ungrouped";
    if (!acc[gid]) acc[gid] = [];
    acc[gid].push(ev);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dobrý den{displayName ? `, ${displayName}` : ""}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Jak vám mohu dnes pomoci?</p>
        </div>

        {/* Primary CTA */}
        <Link
          to="/capture"
          className="flex items-center gap-4 p-5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 shrink-0">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">Přidat důkazy</p>
            <p className="text-sm opacity-80">Spustit zachytávač pro třídu</p>
          </div>
        </Link>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{allStudents.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">žáků</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{proofsThisWeek}</p>
            <p className="text-xs text-muted-foreground mt-0.5">důkazů tento týden</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{pendingEvaluations.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">hodnocení čeká</p>
          </div>
        </div>

        {/* Pending evaluations */}
        {Object.keys(pendingByGroup).length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hodnocení čekající na kontrolu
            </h2>
            <div className="space-y-2">
              {Object.entries(pendingByGroup).map(([groupId, evals]) => {
                const group = evaluationGroups.find((g) => g.id === groupId);
                const studentNames = evals
                  .slice(0, 3)
                  .map((ev) => {
                    const s = allStudents.find((st) => st.id === ev.student_id);
                    return s ? getStudentDisplayName(s) : "—";
                  });
                const remaining = evals.length - 3;

                return (
                  <Link
                    key={groupId}
                    to={`/evaluations/edit/${groupId}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {group?.name || "Hodnocení"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {studentNames.join(", ")}
                        {remaining > 0 && ` a ${remaining} dalších`}
                      </p>
                    </div>
                    <span className="shrink-0 ml-3 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      {evals.length} čeká
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Classes */}
        {classes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Vaše třídy
              </h2>
              <Link to="/classes" className="text-xs text-primary hover:underline">
                Zobrazit vše
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  to={`/capture/${cls.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="font-semibold text-foreground">{cls.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {classCounts[cls.id] || 0} žáků
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Camera className="h-3.5 w-3.5" />
                    Přidat důkazy
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Evaluations shortcut */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Ostatní
          </h2>
          <Link
            to="/evaluations/create"
            className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Vytvořit slovní hodnocení</p>
              <p className="text-xs text-muted-foreground">Generovat návrhy hodnocení pro žáky</p>
            </div>
          </Link>
        </div>

      </div>
    </AppLayout>
  );
}
