import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { StudentChip } from "@/components/shared/StudentChip";
import { LessonLinkField } from "@/components/shared/LessonLinkField";
import { DateField } from "@/components/shared/DateField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, Camera, Upload, FileText, Plus, Star } from "lucide-react";
import { useStudent, useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useCreateProof } from "@/hooks/useProofs";
import { useStudentClasses } from "@/hooks/useClasses";
import { useGoalsForClass, type EducationalGoal } from "@/hooks/useGoals";
import { useToast } from "@/hooks/use-toast";

type ProofType = "text" | "voice" | "camera" | "file" | "grade";

const proofTypes: { type: ProofType; label: string; icon: React.ElementType }[] = [
  { type: "text", label: "Textová poznámka", icon: FileText },
  { type: "grade", label: "Známka", icon: Star },
  { type: "voice", label: "Hlasová poznámka", icon: Mic },
  { type: "camera", label: "Vyfotit obrázek", icon: Camera },
  { type: "file", label: "Nahrát soubor", icon: Upload },
];

export default function B04AddProofOfLearning() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: student, isLoading } = useStudent(id);
  const { data: allStudents = [] } = useStudents();
  const createProof = useCreateProof();
  const [selectedType, setSelectedType] = useState<ProofType>("text");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [studentGrades, setStudentGrades] = useState<Record<string, string>>({});
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [attachedStudentIds, setAttachedStudentIds] = useState<string[]>(id ? [id] : []);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [goalSearchOpen, setGoalSearchOpen] = useState(false);

  const handleSave = async () => {
    if (selectedType === "grade") {
      const studentsWithGrades = attachedStudentIds.filter((sid) => studentGrades[sid]);
      if (studentsWithGrades.length === 0) {
        toast({ title: "Přiřaďte alespoň jednu známku", variant: "destructive" });
        return;
      }
      try {
        const dateStr = date.toISOString().split("T")[0];
        for (const sid of studentsWithGrades) {
          const grade = studentGrades[sid];
          await createProof.mutateAsync({
            title: title.trim() || `Známka ${grade}`,
            type: "grade",
            note,
            date: dateStr,
            lessonId: selectedLessonId,
            studentIds: [sid],
          });
        }
        toast({ title: "Známky uloženy" });
        navigate(`/student-profiles/${id}`);
      } catch {
        toast({ title: "Chyba při ukládání", variant: "destructive" });
      }
      return;
    }

    if (!title.trim()) {
      toast({ title: "Zadejte název důkazu", variant: "destructive" });
      return;
    }
    try {
      await createProof.mutateAsync({
        title: title.trim(),
        type: selectedType,
        note,
        date: date.toISOString().split("T")[0],
        lessonId: selectedLessonId,
        studentIds: attachedStudentIds,
        goalIds: selectedGoalIds,
      });
      toast({ title: "Důkaz o učení uložen" });
      navigate(`/student-profiles/${id}`);
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const removeStudent = (sid: string) => {
    if (attachedStudentIds.length <= 1) return;
    setAttachedStudentIds((prev) => prev.filter((s) => s !== sid));
  };

  const addStudent = (sid: string) => {
    if (!attachedStudentIds.includes(sid)) {
      setAttachedStudentIds((prev) => [...prev, sid]);
    }
    setStudentSearchOpen(false);
    setStudentSearch("");
  };

  // Fetch goals for the primary student's classes
  const { data: studentClasses = [] } = useStudentClasses(id);
  const classIds = studentClasses.map((c) => c.id);
  // Fetch goals for all classes — use first class as primary, query all
  const { data: classGoals = [] } = useGoalsForClass(classIds[0]);

  const availableGoals = classGoals.filter((g) => !selectedGoalIds.includes(g.id));

  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  const availableStudents = allStudents
    .filter((s) => !attachedStudentIds.includes(s.id))
    .filter(
      (s) =>
        !studentSearch ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())
    );

  if (isLoading || !student) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci", href: "/student-profiles" },
            { label: getStudentDisplayName(student), href: `/student-profiles/${student.id}` },
            { label: "Přidat důkaz o učení" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Přidat důkaz o učení</h1>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {proofTypes.map((pt) => (
            <button
              key={pt.type}
              onClick={() => setSelectedType(pt.type)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                selectedType === pt.type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              <pt.icon className="h-5 w-5" />
              <span className="text-xs font-medium text-center">{pt.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {selectedType === "text" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Poznámka</label>
              <Textarea
                className="min-h-[120px] bg-card"
                placeholder="Napište poznámku..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          {selectedType === "grade" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground block">Známky</label>
              {attachedStudentIds.map((sid) => {
                const s = allStudents.find((st) => st.id === sid);
                if (!s) return null;
                const currentGrade = studentGrades[sid] || "";
                return (
                  <div key={sid} className="flex items-center gap-3">
                    <span className="text-sm text-foreground min-w-[100px] truncate flex-shrink-0">
                      {getStudentDisplayName(s)}
                    </span>
                    <div className="flex gap-1">
                      {["1", "2", "3", "4", "5"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setStudentGrades((prev) => ({
                            ...prev,
                            [sid]: prev[sid] === g ? "" : g,
                          }))}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                            currentGrade === g
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2">
                <label className="text-sm font-medium text-muted-foreground block mb-2">Poznámka</label>
                <Textarea
                  className="min-h-[80px] bg-card"
                  placeholder="Volitelná poznámka ke známkám..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          )}

          {selectedType === "voice" && (
            <div className="space-y-4">
              <Button variant="outline" className="w-full gap-2 h-16 text-base">
                <Mic className="h-5 w-5" />
                Začít diktovat
              </Button>
              <Textarea className="min-h-[80px] bg-card" placeholder="Přepis hlasové poznámky se zobrazí zde..." />
            </div>
          )}

          {selectedType === "camera" && (
            <Button variant="outline" className="w-full gap-2 h-16 text-base">
              <Camera className="h-5 w-5" />
              Vyfotit obrázek
            </Button>
          )}

          {selectedType === "file" && (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-card">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Nahrát soubor
              </Button>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Název důkazu</label>
            <Input
              placeholder="Pojmenujte důkaz o učení..."
              className="bg-card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LessonLinkField lessonId={selectedLessonId} onLessonChange={setSelectedLessonId} />
            <DateField date={date} onDateChange={setDate} />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Žáci</label>
            <div className="flex flex-wrap gap-2">
              {attachedStudentIds.map((sid) => {
                const s = allStudents.find((st) => st.id === sid);
                if (!s) return null;
                return (
                  <StudentChip
                    key={sid}
                    name={getStudentDisplayName(s)}
                    removable={attachedStudentIds.length > 1}
                    onRemove={() => removeStudent(sid)}
                  />
                );
              })}
              <Popover
                open={studentSearchOpen}
                onOpenChange={(o) => {
                  setStudentSearchOpen(o);
                  if (!o) setStudentSearch("");
                }}
              >
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:bg-accent transition-colors">
                    <Plus className="h-3 w-3" />
                    Připojit žáka
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <Input
                    placeholder="Hledat žáka..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
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
          </div>

          {/* Goals selector */}
          {classGoals.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Vzdělávací cíle (volitelné)</label>
              <div className="flex flex-wrap gap-2">
                {selectedGoalIds.map((gid) => {
                  const g = classGoals.find((goal) => goal.id === gid);
                  if (!g) return null;
                  return (
                    <button
                      key={gid}
                      onClick={() => toggleGoal(gid)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary"
                    >
                      {g.title}
                      <span className="ml-1 text-xs">&times;</span>
                    </button>
                  );
                })}
                <Popover
                  open={goalSearchOpen}
                  onOpenChange={setGoalSearchOpen}
                >
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:bg-accent transition-colors">
                      <Plus className="h-3 w-3" />
                      Přidat cíl
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <div className="max-h-48 overflow-auto space-y-0.5">
                      {availableGoals.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-2 py-1">Žádné další cíle</p>
                      ) : (
                        availableGoals.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => {
                              toggleGoal(g.id);
                              setGoalSearchOpen(false);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent text-foreground transition-colors"
                          >
                            <span className="font-medium">{g.title}</span>
                            {g.subjects?.name && <span className="text-xs text-muted-foreground ml-2">{g.subjects.name}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {selectedType !== "text" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Poznámka</label>
              <Textarea className="min-h-[80px] bg-card" placeholder="Volitelná poznámka..." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleSave} disabled={createProof.isPending}>
            {createProof.isPending ? "Ukládání…" : "Uložit"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
