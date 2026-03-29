import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Pencil, Camera, Home, X, Check, TrendingUp, Users, Plus, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useClassStudents } from "@/hooks/useClasses";
import { useCourse, useCourses, useCourseLessons, useCourseSeating, useSaveCourseSeating } from "@/hooks/useCourses";
import { useLessonGoals, useLessonStudentOverview } from "@/hooks/useLessons";
import { getStudentShortName } from "@/hooks/useStudents";
import { useCreateProof } from "@/hooks/useProofs";
import { useGoal } from "@/hooks/useGoals";
import { useSetStudentGoalLevel } from "@/hooks/useStudentGoalLevels";
import { useStudentGroups, useCreateStudentGroup, useDeleteStudentGroup } from "@/hooks/useStudentGroups";
import SeatingChartEditor from "@/components/shared/SeatingChartEditor";
import { supabase } from "@/integrations/supabase/client";

type CaptureMode = null | "note" | "photo" | "progress";

export default function E02CaptureToolAddProofs() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: course } = useCourse(courseId);
  const { data: allCourses = [] } = useCourses();
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const classId = course?.class_id;
  const { data: students = [] } = useClassStudents(classId);
  const { data: courseLessons = [] } = useCourseLessons(courseId);
  const createProof = useCreateProof();
  const setStudentGoalLevel = useSetStudentGoalLevel();
  const { toast } = useToast();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [noteText, setNoteText] = useState("");
  const [proofCounts, setProofCounts] = useState<Record<string, number>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  // Progress mode state: one level for all, per-student notes
  const [progressLevel, setProgressLevel] = useState("");
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [savingProgress, setSavingProgress] = useState(false);

  // Quick Groups
  const { data: groups = [] } = useStudentGroups(classId);
  const createGroup = useCreateStudentGroup();
  const deleteGroup = useDeleteStudentGroup();
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Seating chart (per-course)
  const { data: courseSeating = [] } = useCourseSeating(courseId);
  const saveSeating = useSaveCourseSeating();
  const [showSeatingEditor, setShowSeatingEditor] = useState(false);

  // Auto-select lesson from URL param
  useEffect(() => {
    const lessonParam = searchParams.get("lesson");
    if (lessonParam) setSelectedLesson(lessonParam);
  }, [searchParams]);

  // Fetch goals for selected lesson
  const { data: lessonGoals = [] } = useLessonGoals(selectedLesson || undefined);
  const goalIds = useMemo(() => lessonGoals.map((g) => g.id), [lessonGoals]);

  // When exactly one goal is selected, fetch its criteria
  const singleGoalId = selectedGoalIds.length === 1 ? selectedGoalIds[0] : undefined;
  const { data: goalDetail } = useGoal(singleGoalId);

  // Fetch student goal coverage when lesson has goals
  const { data: studentOverview = [] } = useLessonStudentOverview(
    goalIds.length > 0 ? classId : undefined,
    goalIds
  );

  // Build coverage map: studentId -> "all" | "some" | "none"
  const coverageMap = useMemo(() => {
    if (goalIds.length === 0) return {};
    const map: Record<string, "all" | "some" | "none"> = {};
    for (const so of studentOverview) {
      const counts = Object.values(so.goalCounts);
      const covered = counts.filter((c) => c > 0).length;
      if (covered === 0 || counts.length === 0) map[so.student.id] = "none";
      else if (covered >= goalIds.length) map[so.student.id] = "all";
      else map[so.student.id] = "some";
    }
    return map;
  }, [studentOverview, goalIds]);

  // Reset selected goals when lesson changes
  useEffect(() => {
    setSelectedGoalIds([]);
  }, [selectedLesson]);

  const sessionTotal = useMemo(
    () => Object.values(proofCounts).reduce((sum, c) => sum + c, 0),
    [proofCounts]
  );

  const classLessons = courseLessons.filter(
    (l: any) => l.status === "ongoing" || l.status === "prepared"
  );

  // Auto-select when there's only one lesson available
  useEffect(() => {
    if (!selectedLesson && classLessons.length === 1) {
      setSelectedLesson(classLessons[0].id);
    }
  }, [classLessons, selectedLesson]);

  // Auto-select when there's only one goal for the selected lesson
  useEffect(() => {
    if (selectedLesson && lessonGoals.length === 1 && selectedGoalIds.length === 0) {
      setSelectedGoalIds([lessonGoals[0].id]);
    }
  }, [lessonGoals, selectedLesson, selectedGoalIds.length]);

  // Seating layout: merge course seating with students
  const seatingData = useMemo(() => {
    if (courseSeating.length === 0) return null;
    const seatMap = new Map(courseSeating.map((s) => [s.student_id, s]));
    let maxRow = 0, maxCol = 0;
    for (const s of courseSeating) {
      if (s.seat_row > maxRow) maxRow = s.seat_row;
      if (s.seat_col > maxCol) maxCol = s.seat_col;
    }
    // Build grid: [row][col] -> student | null
    const grid: (any | null)[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      grid[r] = [];
      for (let c = 0; c <= maxCol; c++) {
        grid[r][c] = null;
      }
    }
    for (const student of students as any[]) {
      const seat = seatMap.get(student.id);
      if (seat) grid[seat.seat_row][seat.seat_col] = student;
    }
    // Detect which rows are completely empty (spacer rows)
    const emptyRows = new Set<number>();
    for (let r = 0; r <= maxRow; r++) {
      if (grid[r].every((cell) => cell === null)) emptyRows.add(r);
    }
    // Detect which columns are completely empty (spacer columns)
    const emptyCols = new Set<number>();
    for (let c = 0; c <= maxCol; c++) {
      let allEmpty = true;
      for (let r = 0; r <= maxRow; r++) {
        if (grid[r][c] !== null) { allEmpty = false; break; }
      }
      if (allEmpty) emptyCols.add(c);
    }
    // Unseated students
    const seatedIds = new Set(courseSeating.map((s) => s.student_id));
    const unseated = students.filter((s: any) => !seatedIds.has(s.id));
    return { grid, rows: maxRow + 1, cols: maxCol + 1, unseated, emptyRows, emptyCols };
  }, [students, courseSeating]);

  const gridConfig = useMemo(() => {
    if (seatingData) return { cols: seatingData.cols };
    const count = students.length;
    if (count <= 6) return { cols: 2 };
    if (count <= 9) return { cols: 3 };
    if (count <= 16) return { cols: 4 };
    return { cols: 5 };
  }, [students.length, seatingData]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCapture = (mode: CaptureMode) => {
    if (selectedStudents.length === 0) {
      toast({ title: "Nejdříve vyberte žáky", variant: "destructive" });
      return;
    }
    setCaptureMode(mode);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      toast({ title: "Napište poznámku", variant: "destructive" });
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      await createProof.mutateAsync({
        title: `Poznámka ${today}`,
        type: "text",
        note: noteText,
        date: today,
        lessonId: selectedLesson,
        studentIds: selectedStudents,
        goalIds: selectedGoalIds.length > 0 ? selectedGoalIds : undefined,
      });
      setProofCounts((prev) => {
        const updated = { ...prev };
        selectedStudents.forEach((id) => { updated[id] = (updated[id] || 0) + 1; });
        return updated;
      });
      toast({ title: `Poznámka uložena pro ${selectedStudents.length} žáků` });
      setNoteText("");
      setCaptureMode(null);
      setSelectedStudents([]);
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const handleSaveProgress = async () => {
    if (!singleGoalId) {
      toast({ title: "Vyberte právě jeden cíl", variant: "destructive" });
      return;
    }
    if (!progressLevel) {
      toast({ title: "Vyberte úroveň", variant: "destructive" });
      return;
    }
    setSavingProgress(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      for (const sid of selectedStudents) {
        await setStudentGoalLevel.mutateAsync({
          studentId: sid,
          goalId: singleGoalId!,
          level: progressLevel,
        });
        const note = studentNotes[sid]?.trim();
        if (note) {
          await createProof.mutateAsync({
            title: `Úroveň: ${progressLevel}`,
            type: "text",
            note,
            date: today,
            lessonId: selectedLesson,
            studentIds: [sid],
            goalIds: [singleGoalId!],
          });
          setProofCounts((prev) => ({
            ...prev,
            [sid]: (prev[sid] || 0) + 1,
          }));
        }
      }
      toast({ title: `Úroveň uložena pro ${selectedStudents.length} žáků` });
      setProgressLevel("");
      setStudentNotes({});
      setCaptureMode(null);
      setSelectedStudents([]);
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    } finally {
      setSavingProgress(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSavePhoto = async () => {
    if (!photoFile) {
      toast({ title: "Nejdříve vyfoťte nebo vyberte obrázek", variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("proof-files")
        .upload(path, photoFile);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("proof-files").getPublicUrl(path);

      await createProof.mutateAsync({
        title: `Foto ${today}`,
        type: "camera",
        note: noteText || "",
        date: today,
        lessonId: selectedLesson,
        studentIds: selectedStudents,
        fileName: photoFile.name,
        fileUrl: urlData.publicUrl,
        goalIds: selectedGoalIds.length > 0 ? selectedGoalIds : undefined,
      });

      setProofCounts((prev) => {
        const updated = { ...prev };
        selectedStudents.forEach((id) => { updated[id] = (updated[id] || 0) + 1; });
        return updated;
      });
      toast({ title: `Foto uloženo pro ${selectedStudents.length} žáků` });
      setNoteText("");
      setPhotoFile(null);
      setPhotoPreview(null);
      // Stay in photo mode — keep students selected for the next photo
    } catch {
      toast({ title: "Chyba při nahrávání", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectedLessonObj = classLessons.find((l) => l.id === selectedLesson);

  // Get level names from the goal's first criterion (they share the same levels)
  const levelNames = useMemo(() => {
    if (!goalDetail?.evaluation_criteria?.length) return [];
    return goalDetail.evaluation_criteria[0].level_descriptors.map((ld) => ld.level);
  }, [goalDetail]);

  // --- Shared UI pieces ---

  const actionButtons = (
    <div className="flex items-center justify-center gap-6 lg:grid lg:grid-cols-3 lg:gap-3">
      {([
        { mode: "note" as const, icon: Pencil, label: "Poznámka" },
        { mode: "progress" as const, icon: TrendingUp, label: "Úroveň" },
        { mode: "photo" as const, icon: Camera, label: "Foto" },
      ]).map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => handleCapture(mode)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors lg:aspect-square lg:justify-center lg:gap-2 lg:border lg:border-border lg:hover:border-primary/40 lg:hover:bg-primary/5 ${
            selectedStudents.length === 0 ? "opacity-40" : ""
          }`}
        >
          <Icon className="h-6 w-6 text-primary" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );

  const selectionStatus = selectedStudents.length > 0 ? (
    <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-medium lg:rounded-lg lg:mt-2">
      {selectedStudents.length} žáků vybráno
    </div>
  ) : null;

  // Capture panel content
  const capturePanelContent = (() => {
    if (captureMode === "note") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Poznámka pro {selectedStudents.length} žáků
            </span>
            <button onClick={() => setCaptureMode(null)} className="p-1 hover:bg-accent rounded">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <Textarea
            className="min-h-[80px] bg-background"
            placeholder="Napište poznámku..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            autoFocus
          />
          <Button className="w-full gap-1" onClick={handleSaveNote} disabled={createProof.isPending}>
            <Check className="h-4 w-4" />
            {createProof.isPending ? "Ukládání…" : "Uložit poznámku"}
          </Button>
        </div>
      );
    }

    if (captureMode === "progress") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Dosažená úroveň pro {selectedStudents.length} žáků
            </span>
            <button onClick={() => { setCaptureMode(null); setProgressLevel(""); setStudentNotes({}); }} className="p-1 hover:bg-accent rounded">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {/* Goal picker — uses lesson selected at top level */}
          {selectedLesson && lessonGoals.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Cíl</span>
              <div className="flex flex-wrap gap-1.5">
                {lessonGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoalIds(singleGoalId === goal.id ? [] : [goal.id])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      singleGoalId === goal.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {goal.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Single level picker for all students */}
          {singleGoalId && levelNames.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Úroveň</span>
              <div className="flex flex-wrap gap-1.5">
                {levelNames.map((level) => (
                  <button
                    key={level}
                    onClick={() => setProgressLevel(progressLevel === level ? "" : level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      progressLevel === level
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Per-student notes */}
          {singleGoalId && levelNames.length > 0 && (
            <div className="space-y-2 max-h-[40vh] lg:max-h-none overflow-auto">
              {selectedStudents.map((sid) => {
                const s = students.find((st: any) => st.id === sid);
                if (!s) return null;
                return (
                  <div key={sid} className="space-y-1">
                    <span className="text-xs font-medium text-foreground">
                      {getStudentShortName(s)}
                    </span>
                    <Textarea
                      className="min-h-[36px] bg-background text-xs"
                      placeholder="Poznámka (volitelné)..."
                      value={studentNotes[sid] || ""}
                      onChange={(e) => setStudentNotes((prev) => ({ ...prev, [sid]: e.target.value }))}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <Button className="w-full gap-1" onClick={handleSaveProgress} disabled={savingProgress || !singleGoalId || !progressLevel}>
            <Check className="h-4 w-4" />
            {savingProgress ? "Ukládání…" : "Uložit pokrok"}
          </Button>
        </div>
      );
    }

    if (captureMode === "photo") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Foto pro {selectedStudents.length} žáků
            </span>
            <button onClick={() => { setCaptureMode(null); setPhotoFile(null); setPhotoPreview(null); setNoteText(""); }} className="p-1 hover:bg-accent rounded">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Náhled" className="w-full max-h-48 object-contain rounded-xl border border-border" />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center bg-background hover:bg-accent/50 transition-colors"
            >
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Klepněte pro vyfocení nebo výběr obrázku</p>
            </button>
          )}
          <Textarea
            className="min-h-[60px] bg-background"
            placeholder="Volitelná poznámka k fotce..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button className="w-full gap-1" onClick={handleSavePhoto} disabled={uploadingPhoto || !photoFile}>
            <Check className="h-4 w-4" />
            {uploadingPhoto ? "Nahrávání…" : "Uložit foto"}
          </Button>
        </div>
      );
    }

    return null;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 relative">
          <Badge
            variant="secondary"
            className="text-sm py-1 px-3 cursor-pointer"
            onClick={() => { setCourseDropdownOpen(!courseDropdownOpen); setLessonOpen(false); }}
          >
            {course?.name || "Kurz"}
          </Badge>
          {courseDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[200px] max-h-[60vh] overflow-auto">
              {allCourses.filter((c) => c.id !== courseId).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCourseDropdownOpen(false);
                    navigate(`/capture/${c.id}`);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent text-foreground transition-colors"
                >
                  {c.name}
                  <span className="text-xs text-muted-foreground ml-2">
                    {c.classes?.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <Badge
              variant={selectedLesson ? "default" : "outline"}
              className="text-xs py-1 px-3 cursor-pointer"
              onClick={() => { setLessonOpen(!lessonOpen); setCourseDropdownOpen(false); }}
            >
              {selectedLessonObj ? selectedLessonObj.title : "Přiřadit lekci"}
            </Badge>
            {lessonOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[200px] max-h-[60vh] overflow-auto">
                {classLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-2">Žádné dostupné lekce</p>
                ) : (
                  classLessons.map((lesson: any) => (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLesson(selectedLesson === lesson.id ? null : lesson.id);
                        setLessonOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedLesson === lesson.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent text-foreground"
                      }`}
                    >
                      {lesson.title}
                      {lesson.subjects?.name && <span className="text-xs text-muted-foreground ml-2">· {lesson.subjects.name}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {sessionTotal > 0 && (
            <span className="text-xs text-muted-foreground mr-1">
              {sessionTotal} {sessionTotal === 1 ? "důkaz" : sessionTotal < 5 ? "důkazy" : "důkazů"}
            </span>
          )}
          <button
            onClick={() => {
              if (selectedStudents.length === students.length) {
                setSelectedStudents([]);
              } else {
                setSelectedStudents(students.map((s: any) => s.id));
              }
            }}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
          >
            {selectedStudents.length === students.length ? "Zrušit vše" : "Vybrat vše"}
          </button>
          <button
            onClick={() => setShowSeatingEditor(true)}
            className="p-2 hover:bg-accent rounded-lg"
            title="Uspořádat žáky"
          >
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          </button>
          <Link to="/" className="p-2 hover:bg-accent rounded-lg" title="Zpět na úvod">
            <Home className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>
      </header>

      {/* Group pill bar */}
      {(groups.length > 0 || selectedStudents.length >= 2) && (
        <div className="border-b border-border bg-card px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          {groups.map((group) => {
            const isActive = group.member_ids.length > 0 &&
              group.member_ids.every((id) => selectedStudents.includes(id));
            return (
              <span key={group.id} className="inline-flex items-center shrink-0">
                <button
                  onClick={() => {
                    if (isActive) {
                      setSelectedStudents((prev) =>
                        prev.filter((id) => !group.member_ids.includes(id))
                      );
                    } else {
                      setSelectedStudents((prev) => {
                        const set = new Set(prev);
                        group.member_ids.forEach((id) => set.add(id));
                        return Array.from(set);
                      });
                    }
                  }}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-l-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {group.name} ({group.member_ids.length})
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Smazat skupinu „${group.name}"?`)) {
                      deleteGroup.mutate(
                        { groupId: group.id, classId: classId! },
                        { onError: (err: any) => toast({ title: "Chyba při mazání", description: err?.message, variant: "destructive" }) }
                      );
                    }
                  }}
                  className={`px-1 py-1 rounded-r-lg text-xs transition-all ${
                    isActive
                      ? "bg-primary/80 text-primary-foreground hover:bg-destructive"
                      : "bg-muted text-muted-foreground/50 hover:text-destructive hover:bg-accent"
                  }`}
                  title="Smazat skupinu"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          {selectedStudents.length >= 2 && !showSaveGroup && (
            <button
              onClick={() => setShowSaveGroup(true)}
              className="whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-accent flex items-center gap-1 border border-dashed border-border"
            >
              <Plus className="h-3 w-3" />
              Uložit skupinu
            </button>
          )}
          {showSaveGroup && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                className="h-7 w-28 text-xs"
                placeholder="Název skupiny"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newGroupName.trim()) {
                    createGroup.mutate(
                      { classId: classId!, name: newGroupName.trim(), memberIds: selectedStudents },
                      {
                        onSuccess: () => {
                          toast({ title: `Skupina „${newGroupName.trim()}" vytvořena` });
                          setNewGroupName("");
                          setShowSaveGroup(false);
                        },
                        onError: (e: any) => toast({ title: "Chyba při vytváření skupiny", description: e?.message, variant: "destructive" }),
                      }
                    );
                  }
                  if (e.key === "Escape") {
                    setShowSaveGroup(false);
                    setNewGroupName("");
                  }
                }}
              />
              <Button
                size="sm"
                className="h-7 text-xs px-2"
                disabled={!newGroupName.trim() || createGroup.isPending}
                onClick={() => {
                  createGroup.mutate(
                    { classId: classId!, name: newGroupName.trim(), memberIds: selectedStudents },
                    {
                      onSuccess: () => {
                        toast({ title: `Skupina „${newGroupName.trim()}" vytvořena` });
                        setNewGroupName("");
                        setShowSaveGroup(false);
                      },
                    }
                  );
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
              <button
                onClick={() => { setShowSaveGroup(false); setNewGroupName(""); }}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Seating chart editor overlay */}
      {showSeatingEditor && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Uspořádat žáky</h2>
              <button onClick={() => setShowSeatingEditor(false)} className="p-1 hover:bg-accent rounded">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <SeatingChartEditor
              students={students as any}
              initialPositions={courseSeating}
              onSave={(positions) => {
                saveSeating.mutate(
                  { courseId: courseId!, positions },
                  {
                    onSuccess: () => {
                      toast({ title: "Rozmístění uloženo" });
                      setShowSeatingEditor(false);
                    },
                    onError: (e: any) => toast({ title: "Chyba při ukládání", description: e?.message, variant: "destructive" }),
                  }
                );
              }}
              saving={saveSeating.isPending}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Student grid — hidden on mobile when capture panel is open */}
        <div
          className={`flex-1 p-3 overflow-auto flex flex-col ${captureMode ? "hidden lg:flex" : ""}`}
        >
          <div
            className="flex-1"
            style={{
              display: "grid",
              ...(seatingData
                ? {
                    gridTemplateColumns: Array.from({ length: seatingData.cols }, (_, c) =>
                      seatingData.emptyCols.has(c) ? "0.15fr" : "1fr"
                    ).join(" "),
                    gridTemplateRows: Array.from({ length: seatingData.rows }, (_, r) =>
                      seatingData.emptyRows.has(r) ? "0.15fr" : "1fr"
                    ).join(" ") + (seatingData.unseated.length > 0
                      ? " " + Array.from({ length: Math.ceil(seatingData.unseated.length / gridConfig.cols) }, () => "1fr").join(" ")
                      : ""),
                  }
                : {
                    gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
                    gridAutoRows: "1fr",
                  }),
              gap: "0.5rem",
              alignContent: "stretch",
            }}
          >
            {(() => {
              const renderCell = (student: any) => {
                const isSelected = selectedStudents.includes(student.id);
                const count = proofCounts[student.id] || 0;
                const coverage = coverageMap[student.id];
                const coverageStyle = isSelected
                  ? "border-primary bg-primary/15 shadow-sm ring-2 ring-primary/30"
                  : coverage === "all"
                    ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30 hover:border-green-400"
                    : coverage === "some"
                      ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 hover:border-amber-400"
                      : "border-border bg-card hover:border-primary/30";
                return (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`relative flex flex-col items-center justify-center rounded-xl border transition-all ${coverageStyle}`}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-sm sm:text-base md:text-lg font-medium text-foreground text-center leading-tight px-1">
                      {getStudentShortName(student)}
                    </span>
                    {count > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-primary" />
                        ))}
                        {count > 5 && (
                          <span className="text-[10px] text-muted-foreground">+{count - 5}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              };

              if (seatingData) {
                // Render seating grid with empty cells
                const cells: React.ReactNode[] = [];
                for (let r = 0; r < seatingData.rows; r++) {
                  for (let c = 0; c < seatingData.cols; c++) {
                    const student = seatingData.grid[r][c];
                    if (student) {
                      cells.push(renderCell(student));
                    } else {
                      cells.push(
                        <div key={`empty-${r}-${c}`} className="rounded-xl" />
                      );
                    }
                  }
                }
                // Append unseated students
                seatingData.unseated.forEach((s: any) => cells.push(renderCell(s)));
                return cells;
              }

              return students.map((s: any) => renderCell(s));
            })()}
          </div>
          {/* Coverage legend */}
          {goalIds.length > 0 && (
            <div className="flex items-center gap-4 pt-2 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-300" />
                Splněno
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-300" />
                Částečně
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-card border border-border" />
                Bez důkazů
              </span>
            </div>
          )}
        </div>

        {/* Desktop right panel — always present, stable width */}
        <div className="hidden lg:flex lg:flex-col w-[380px] shrink-0 border-l border-border bg-card">
          {captureMode ? (
            <div className="flex-1 p-4 overflow-auto">
              {capturePanelContent}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center p-4">
              {actionButtons}
              {selectionStatus}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: bottom capture panel */}
      {captureMode && (
        <div className="lg:hidden border-t border-border bg-card p-3 max-h-[60vh] overflow-auto">
          {capturePanelContent}
        </div>
      )}

      {/* Mobile: bottom action bar */}
      {!captureMode && (
        <div className="lg:hidden">
          <div className="border-t border-border bg-card p-3">
            {actionButtons}
          </div>
          {selectionStatus}
        </div>
      )}

    </div>
  );
}
