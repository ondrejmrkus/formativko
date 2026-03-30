import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Home, X, Check, Users, Plus, LayoutGrid, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useClassStudents } from "@/hooks/useClasses";
import { useCourse, useCourses, useCourseLessons, useCourseSeating, useSaveCourseSeating } from "@/hooks/useCourses";
import { useLessonGoals, useLessonStudentOverview } from "@/hooks/useLessons";
import { getStudentShortName } from "@/hooks/useStudents";
import { useStudentGroups, useCreateStudentGroup, useDeleteStudentGroup } from "@/hooks/useStudentGroups";
import { useCustomProofTypes } from "@/hooks/useProofTypes";
import { PROOF_TYPE_COLORS, ICON_MAP, BUILTIN_PROOF_TYPES, type ProofTypeColor } from "@/constants/proofTypes";
import CapturePanel from "@/components/capture/CapturePanel";
import ProofTypeManager from "@/components/capture/ProofTypeManager";
import SeatingChartEditor from "@/components/shared/SeatingChartEditor";

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
  const { data: customProofTypes = [] } = useCustomProofTypes();
  const proofTypes = useMemo(
    () => [...BUILTIN_PROOF_TYPES, ...customProofTypes],
    [customProofTypes]
  );
  const { toast } = useToast();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [activeProofTypeId, setActiveProofTypeId] = useState<string | null>(null);
  const [proofDots, setProofDots] = useState<Record<string, string[]>>({});
  const [lessonOpen, setLessonOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [manageMode, setManageMode] = useState(false);

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

  // Fetch goals for selected lesson (for coverage coloring only)
  const { data: lessonGoals = [] } = useLessonGoals(selectedLesson || undefined);
  const lessonGoalIds = useMemo(() => lessonGoals.map((g) => g.id), [lessonGoals]);

  const { data: studentOverview = [] } = useLessonStudentOverview(
    lessonGoalIds.length > 0 ? classId : undefined,
    lessonGoalIds
  );

  const coverageMap = useMemo(() => {
    if (lessonGoalIds.length === 0) return {};
    const map: Record<string, "all" | "some" | "none"> = {};
    for (const so of studentOverview) {
      const counts = Object.values(so.goalCounts);
      const covered = counts.filter((c) => c > 0).length;
      if (covered === 0 || counts.length === 0) map[so.student.id] = "none";
      else if (covered >= lessonGoalIds.length) map[so.student.id] = "all";
      else map[so.student.id] = "some";
    }
    return map;
  }, [studentOverview, lessonGoalIds]);

  useEffect(() => {
    setSelectedGoalIds([]);
  }, [selectedLesson, courseId]);

  // Proof type helpers
  const proofTypeMap = useMemo(
    () => new Map(proofTypes.map((pt) => [pt.id, pt])),
    [proofTypes]
  );
  const activeProofType = activeProofTypeId ? proofTypeMap.get(activeProofTypeId) : undefined;

  const sessionTotal = useMemo(
    () => Object.values(proofDots).reduce((sum, dots) => sum + dots.length, 0),
    [proofDots]
  );

  const classLessons = courseLessons.filter(
    (l: any) => l.status === "ongoing" || l.status === "prepared"
  );

  useEffect(() => {
    if (!selectedLesson && classLessons.length === 1) {
      setSelectedLesson(classLessons[0].id);
    }
  }, [classLessons, selectedLesson]);

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

  const handleCapture = (proofTypeId: string) => {
    setActiveProofTypeId(activeProofTypeId === proofTypeId ? null : proofTypeId);
  };

  const handleCaptured = (studentIds: string[], proofTypeId: string) => {
    setProofDots((prev) => {
      const updated = { ...prev };
      studentIds.forEach((id) => {
        updated[id] = [...(updated[id] || []), proofTypeId];
      });
      return updated;
    });
    setSelectedStudents([]);
  };

  const selectedLessonObj = classLessons.find((l) => l.id === selectedLesson);

  // --- Shared UI pieces ---

  const gridCols = Math.min(proofTypes.length, 3);
  const actionButtons = (
    <div
      className="flex items-center justify-center gap-4 lg:gap-3"
      style={{ display: "flex", flexWrap: "wrap" }}
    >
      {proofTypes.map((pt) => {
        const Icon = ICON_MAP[pt.icon] || ICON_MAP["pencil"];
        const colors = PROOF_TYPE_COLORS[pt.color as ProofTypeColor] || PROOF_TYPE_COLORS.slate;
        const isActive = activeProofTypeId === pt.id;
        return (
          <button
            key={pt.id}
            onClick={() => handleCapture(pt.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors lg:aspect-square lg:justify-center lg:gap-2 lg:border lg:w-[100px] ${
              isActive
                ? `ring-2 ${colors.ring}`
                : "lg:border-border hover:bg-accent lg:hover:border-primary/40 lg:hover:bg-primary/5"
            }`}
          >
            <Icon className={`h-6 w-6 ${colors.text}`} />
            <span className="text-xs text-muted-foreground">{pt.name}</span>
          </button>
        );
      })}
      <button
        onClick={() => { setManageMode(true); setActiveProofTypeId(null); }}
        className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent lg:aspect-square lg:justify-center lg:gap-2 lg:border lg:border-dashed lg:border-border lg:w-[100px]"
      >
        <Settings className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Upravit</span>
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 relative">
          <Badge
            variant="secondary"
            className="text-sm py-1 px-3 lg:text-base lg:py-1.5 lg:px-4 cursor-pointer"
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
              className="text-xs py-1 px-3 lg:text-sm lg:py-1.5 lg:px-4 cursor-pointer"
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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Student grid */}
        <div
          className="flex-1 p-3 flex flex-col min-h-0 lg:overflow-hidden"
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
                const dots = proofDots[student.id] || [];
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
                    {dots.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 lg:gap-2 lg:mt-2">
                        {dots.slice(0, 5).map((ptId, i) => {
                          const pt = proofTypeMap.get(ptId);
                          const dotColor = pt
                            ? (PROOF_TYPE_COLORS[pt.color as ProofTypeColor]?.dot || "bg-gray-400")
                            : "bg-gray-400";
                          return (
                            <div
                              key={i}
                              className={`w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 rounded-full ${dotColor}`}
                            />
                          );
                        })}
                        {dots.length > 5 && (
                          <span className="text-[10px] text-muted-foreground">+{dots.length - 5}</span>
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
          {lessonGoalIds.length > 0 && (
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

        {/* Desktop right panel */}
        <div className="hidden lg:flex lg:flex-col w-[380px] shrink-0 border-l border-border bg-card min-h-0">
          {manageMode ? (
            <div className="flex-1 p-4 overflow-auto min-h-0">
              <ProofTypeManager proofTypes={customProofTypes} onClose={() => setManageMode(false)} />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border shrink-0">
                {actionButtons}
              </div>
              {activeProofType && (
                <div className="flex-1 p-4 overflow-auto min-h-0">
                  <CapturePanel
                    key={activeProofTypeId}
                    proofType={activeProofType}
                    selectedStudents={selectedStudents}
                    students={students}
                    selectedLesson={selectedLesson}
                    courseId={courseId}
                    selectedGoalIds={selectedGoalIds}
                    setSelectedGoalIds={setSelectedGoalIds}
                    onCaptured={handleCaptured}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile: bottom bar */}
      <div className="lg:hidden">
        {manageMode ? (
          <div className="border-t border-border bg-card p-3 max-h-[70vh] overflow-auto">
            <ProofTypeManager proofTypes={proofTypes} onClose={() => setManageMode(false)} />
          </div>
        ) : (
          <>
            <div className="border-t border-border bg-card p-3">
              {actionButtons}
            </div>
            {activeProofType && (
              <div className="border-t border-border bg-card p-3 max-h-[60vh] overflow-auto">
                <CapturePanel
                  key={activeProofTypeId}
                  proofType={activeProofType}
                  selectedStudents={selectedStudents}
                  students={students}
                  selectedLesson={selectedLesson}
                  courseId={courseId}
                  selectedGoalIds={selectedGoalIds}
                  setSelectedGoalIds={setSelectedGoalIds}
                  onCaptured={handleCaptured}
                />
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
