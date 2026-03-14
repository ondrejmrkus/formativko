import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Circle } from "lucide-react";
import { useState } from "react";
import { evaluations, getStudentById, getStudentDisplayName } from "@/data/mockData";

const draftStudents = [
  { id: "s1", status: "draft" as const },
  { id: "s2", status: "final" as const },
  { id: "s3", status: "draft" as const },
  { id: "s4", status: "draft" as const },
  { id: "s5", status: "draft" as const },
];

export default function C03EditEvaluationDrafts() {
  const [selectedStudentId, setSelectedStudentId] = useState("s1");
  const selectedStudent = getStudentById(selectedStudentId)!;
  const evaluation = evaluations.find((e) => e.studentId === selectedStudentId);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Hodnocení", href: "/evaluations" },
            { label: "Úprava konceptů" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Úprava konceptů</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: student list */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="space-y-1">
              {draftStudents.map((ds) => {
                const student = getStudentById(ds.id);
                if (!student) return null;
                return (
                  <button
                    key={ds.id}
                    onClick={() => setSelectedStudentId(ds.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      selectedStudentId === ds.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    {ds.status === "final" ? (
                      <Check className="h-4 w-4 text-proof-file shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{getStudentDisplayName(student)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: editor */}
          <div className="flex-1 min-w-0">
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-semibold">{getStudentDisplayName(selectedStudent)}</h2>
                <Badge variant="secondary" className="text-xs">6.A</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Český jazyk · 1. pololetí</p>

              <Textarea
                className="min-h-[200px] bg-background mb-4"
                defaultValue={
                  evaluation?.text ||
                  "Koncept hodnocení pro tohoto žáka zatím nebyl vygenerován."
                }
              />

              <div className="flex gap-3">
                <Button className="flex-1" size="lg">
                  Uložit
                </Button>
                <Button variant="outline" className="flex-1" size="lg">
                  Exportovat
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
