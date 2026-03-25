import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Plus, Heart, MessageCircle, BookOpen, AlertCircle, StickyNote, Target, Check, Minus } from "lucide-react";
import {
  COMMUNICATION_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  parseCommaSeparated,
  toCommaSeparated,
  getOptionLabels,
} from "@/constants/studentProfile";
import { useStudent, useUpdateStudent, useDeleteStudent, getStudentDisplayName } from "@/hooks/useStudents";
import { useStudentClasses } from "@/hooks/useClasses";
import { useProofsForStudent, useDeleteProof } from "@/hooks/useProofs";
import { useGoalCoverageForStudent } from "@/hooks/useGoals";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function B02StudentProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: student, isLoading } = useStudent(id);
  const { data: studentClasses = [] } = useStudentClasses(id);
  const { data: proofs = [] } = useProofsForStudent(id);
  const classIds = studentClasses.map((c) => c.id);
  const { data: goalCoverage = [] } = useGoalCoverageForStudent(id, classIds);
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const deleteProof = useDeleteProof();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editSvp, setEditSvp] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editCommPrefs, setEditCommPrefs] = useState<string[]>([]);
  const [editCommOther, setEditCommOther] = useState("");
  const [editLearningStyles, setEditLearningStyles] = useState<string[]>([]);
  const [editLearningOther, setEditLearningOther] = useState("");
  const [editSvpDetails, setEditSvpDetails] = useState("");

  const toggleFilter = (group: string, option: string) => {
    setFilters((prev) => {
      const current = prev[group] || [];
      return {
        ...prev,
        [group]: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });
  };

  const filteredProofs = useMemo(() => {
    let result = [...proofs];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || (p.note || "").toLowerCase().includes(q)
      );
    }
    const selectedTypes = filters["Typ důkazu"] || [];
    if (selectedTypes.length > 0) {
      const typeMap: Record<string, string> = { Text: "text", Hlas: "voice", Foto: "camera", Soubor: "file" };
      const types = selectedTypes.map((t) => typeMap[t]).filter(Boolean);
      result = result.filter((p) => types.includes(p.type));
    }
    return result;
  }, [proofs, search, filters]);

  const handleEditOpen = () => {
    if (student) {
      setEditFirst(student.first_name);
      setEditLast(student.last_name);
      setEditSvp(student.svp ?? false);
      setEditNotes(student.notes ?? "");
      setEditInterests(student.interests ?? "");
      const commValues = parseCommaSeparated(student.communication_preferences ?? "");
      const knownCommValues = COMMUNICATION_OPTIONS.map((o) => o.value);
      setEditCommPrefs(commValues.filter((v) => knownCommValues.includes(v)));
      setEditCommOther(commValues.filter((v) => !knownCommValues.includes(v)).join(", "));
      const learnValues = parseCommaSeparated(student.learning_styles ?? "");
      const knownLearnValues = LEARNING_STYLE_OPTIONS.map((o) => o.value);
      setEditLearningStyles(learnValues.filter((v) => knownLearnValues.includes(v)));
      setEditLearningOther(learnValues.filter((v) => !knownLearnValues.includes(v)).join(", "));
      setEditSvpDetails(student.svp_details ?? "");
      setEditOpen(true);
    }
  };

  const handleEditSave = async () => {
    if (!id || !editFirst.trim() || !editLast.trim()) return;
    const commOtherValues = editCommOther.split(",").map((s) => s.trim()).filter(Boolean);
    const allCommPrefs = toCommaSeparated([...editCommPrefs, ...commOtherValues]);
    const learnOtherValues = editLearningOther.split(",").map((s) => s.trim()).filter(Boolean);
    const allLearnStyles = toCommaSeparated([...editLearningStyles, ...learnOtherValues]);
    try {
      await updateStudent.mutateAsync({
        id,
        first_name: editFirst.trim(),
        last_name: editLast.trim(),
        svp: editSvp,
        notes: editNotes,
        interests: editInterests,
        communication_preferences: allCommPrefs,
        learning_styles: allLearnStyles,
        svp_details: editSvp ? editSvpDetails : "",
      });
      toast({ title: "Profil žáka upraven" });
      setEditOpen(false);
    } catch {
      toast({ title: "Chyba při úpravě", variant: "destructive" });
    }
  };

  const handleDeleteStudent = async () => {
    if (!id) return;
    try {
      await deleteStudent.mutateAsync(id);
      toast({ title: "Profil žáka smazán" });
      navigate("/student-profiles");
    } catch {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  const handleDeleteProof = async (proofId: string) => {
    try {
      await deleteProof.mutateAsync(proofId);
      toast({ title: "Důkaz smazán" });
    } catch {
      toast({ title: "Chyba při mazání důkazu", variant: "destructive" });
    }
  };

  if (isLoading || !student) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci", href: "/student-profiles" },
            { label: getStudentDisplayName(student) },
          ]}
        />

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h1 className="text-2xl font-bold">{getStudentDisplayName(student)}</h1>
          {student.svp && (
            <Badge variant="destructive" className="text-xs">SVP</Badge>
          )}
          {studentClasses.map((c) => (
            <Badge key={c.id} variant="secondary">{c.name}</Badge>
          ))}
          <div className="ml-auto flex gap-1">
            <button onClick={handleEditOpen} className="p-2 hover:bg-accent rounded-lg" title="Upravit jméno">
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 hover:bg-destructive/10 rounded-lg" title="Smazat žáka">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat profil žáka?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tím smažete profil {getStudentDisplayName(student)} a všechna související data. Tuto akci nelze vrátit zpět.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Smazat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upravit profil žáka</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Jméno */}
              <div className="space-y-2">
                <Input placeholder="Jméno" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
                <Input placeholder="Příjmení" value={editLast} onChange={(e) => setEditLast(e.target.value)} />
              </div>

              {/* Zájmy a motivace */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Zájmy a motivace</label>
                <Textarea
                  placeholder="Co žáka baví, co ho motivuje k učení…"
                  className="min-h-[60px] bg-card"
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                />
              </div>

              {/* Komunikační preference */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Komunikační preference</label>
                <div className="space-y-2">
                  {COMMUNICATION_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={editCommPrefs.includes(opt.value)}
                        onCheckedChange={(checked) =>
                          setEditCommPrefs((prev) =>
                            checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)
                          )
                        }
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <Input
                  placeholder="Jiné…"
                  className="mt-2"
                  value={editCommOther}
                  onChange={(e) => setEditCommOther(e.target.value)}
                />
              </div>

              {/* Preferované styly učení */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Preferované styly učení</label>
                <div className="space-y-2">
                  {LEARNING_STYLE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={editLearningStyles.includes(opt.value)}
                        onCheckedChange={(checked) =>
                          setEditLearningStyles((prev) =>
                            checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)
                          )
                        }
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <Input
                  placeholder="Jiné…"
                  className="mt-2"
                  value={editLearningOther}
                  onChange={(e) => setEditLearningOther(e.target.value)}
                />
              </div>

              {/* SVP */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setEditSvp((v) => !v)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${editSvp ? "bg-destructive" : "bg-muted"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${editSvp ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Žák se speciálními vzdělávacími potřebami (SVP)
                  </span>
                </label>
                {editSvp && (
                  <Textarea
                    placeholder="Popište speciální vzdělávací potřeby žáka…"
                    className="min-h-[60px] bg-card mt-2"
                    value={editSvpDetails}
                    onChange={(e) => setEditSvpDetails(e.target.value)}
                  />
                )}
              </div>

              {/* Ostatní poznámky */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Ostatní poznámky</label>
                <Textarea
                  placeholder="Další poznámky k žákovi…"
                  className="min-h-[60px] bg-card"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Zrušit</Button>
              <Button onClick={handleEditSave} disabled={updateStudent.isPending}>Uložit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {(() => {
          const commValues = parseCommaSeparated(student.communication_preferences ?? "");
          const commLabels = getOptionLabels(commValues, COMMUNICATION_OPTIONS);
          const learnValues = parseCommaSeparated(student.learning_styles ?? "");
          const learnLabels = getOptionLabels(learnValues, LEARNING_STYLE_OPTIONS);
          const hasProfile = student.interests || commValues.length > 0 || learnValues.length > 0 || (student.svp && student.svp_details) || student.notes;

          if (!hasProfile) {
            return (
              <div className="mb-4 p-4 rounded-xl bg-muted/50 border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground mb-2">Vyplňte profil žáka pro lepší hodnocení</p>
                <Button variant="outline" size="sm" onClick={handleEditOpen}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Vyplnit profil
                </Button>
              </div>
            );
          }

          return (
            <div className="mb-4 p-4 rounded-xl bg-muted/50 border border-border space-y-2.5">
              {student.interests && (
                <div className="flex items-start gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Zájmy a motivace</span>
                    <p className="text-sm">{student.interests}</p>
                  </div>
                </div>
              )}
              {commLabels.length > 0 && (
                <div className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Komunikační preference</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {commLabels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">{label}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {learnLabels.length > 0 && (
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Preferované styly učení</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {learnLabels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">{label}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {student.svp && student.svp_details && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Speciální vzdělávací potřeby</span>
                    <p className="text-sm">{student.svp_details}</p>
                  </div>
                </div>
              )}
              {student.notes && (
                <div className="flex items-start gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Ostatní poznámky</span>
                    <p className="text-sm">{student.notes}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {goalCoverage.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2.5">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Pokrytí cílů</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {goalCoverage.map(({ goal, proofCount }) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs hover:bg-accent transition-colors"
                >
                  {proofCount > 0 ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={proofCount > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {goal.title}
                  </span>
                  {proofCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{proofCount}</Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <SearchBar placeholder="Hledat důkaz..." value={search} onChange={setSearch} />
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link to={`/student-profiles/${student.id}/add-proof`}>
              <Plus className="h-4 w-4" />
              Přidat důkaz
            </Link>
          </Button>
        </div>

        <ClassFilterBar
          vertical
          groups={[{ label: "Typ důkazu", options: ["Text", "Hlas", "Foto", "Soubor"] }]}
          selectedValues={filters}
          onToggle={toggleFilter}
        />

        {filteredProofs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {proofs.length === 0 ? "Zatím žádné důkazy o učení." : "Žádné důkazy neodpovídají vyhledávání."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProofs.map((proof) => (
              <div key={proof.id} className="flex items-start gap-2">
                <Link
                  to={
                    proof.type === "file" || proof.type === "camera"
                      ? `/student-profiles/${student.id}/proof-file/${proof.id}`
                      : `/student-profiles/${student.id}/proof/${proof.id}`
                  }
                  className="flex-1 block p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{proof.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{proof.note}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{proof.date}</span>
                        <Badge variant="outline" className="text-xs capitalize">{proof.type}</Badge>
                      </div>
                    </div>
                  </div>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 mt-3 hover:bg-destructive/10 rounded-lg shrink-0" title="Smazat důkaz">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Smazat důkaz o učení?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tím smažete „{proof.title}". Tuto akci nelze vrátit zpět.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteProof(proof.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Smazat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
