import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { Users, School, Camera, FileText, Clock } from "lucide-react";
import eliImage from "@/assets/Eli.svg";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useEvaluationGroups } from "@/hooks/useEvaluations";

const actions = [
  {
    title: "Vytvořit žákovské profily",
    description: "Přidejte žáky do systému jednotlivě nebo hromadným nahráním.",
    icon: Users,
    href: "/create-student-profiles",
  },
  {
    title: "Vytvořit třídu",
    description: "Seskupte žáky do tříd pro snadnější správu.",
    icon: School,
    href: "/create-class",
  },
  {
    title: "Sbírat důkazy o učení v hodině",
    description: "Zaznamenejte pozorování, poznámky nebo soubory k žákům.",
    icon: Camera,
    href: "/capture",
  },
  {
    title: "Vytvořit slovní hodnocení",
    description: "Vygenerujte návrhy hodnocení pro vaše žáky.",
    icon: FileText,
    href: "/evaluations/create",
  },
];

export default function A01Dashboard() {
  const { user } = useAuth();
  const { displayName } = useProfile();
  const { data: allStudents = [] } = useStudents();
  const { data: evaluationGroups = [] } = useEvaluationGroups();

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


  // Group pending evaluations by group
  const pendingByGroup = pendingEvaluations.reduce<Record<string, typeof pendingEvaluations>>((acc, ev) => {
    const gid = ev.group_id || "ungrouped";
    if (!acc[gid]) acc[gid] = [];
    acc[gid].push(ev);
    return acc;
  }, {});


  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 mb-8">
          <img src={eliImage} alt="Eli mascot" className="h-32 w-32 sm:h-44 sm:w-44 md:h-56 md:w-56 object-contain shrink-0" />
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold mb-1">
              Dobrý den{displayName ? `, ${displayName}` : ""}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Jak vám mohu dnes pomoci?
            </p>
          </div>
        </div>


        {/* Pending evaluations */}
        {Object.keys(pendingByGroup).length > 0 && (
          <div className="mb-8">
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

        {/* Quick actions */}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Rychlé akce
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <action.icon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">{action.title}</h2>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
