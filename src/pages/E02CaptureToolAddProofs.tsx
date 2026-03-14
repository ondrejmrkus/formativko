import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Camera, Settings, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getClassById,
  getStudentsByClass,
  getStudentShortName,
  lessons,
} from "@/data/mockData";
import E03CaptureToolSettings from "./E03CaptureToolSettings";

type CaptureMode = null | "note" | "photo";

export default function E02CaptureToolAddProofs() {
  const { classId } = useParams<{ classId: string }>();
  const cls = getClassById(classId || "c1")!;
  const students = getStudentsByClass(cls.id);
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [noteText, setNoteText] = useState("");
  const [proofCounts, setProofCounts] = useState<Record<string, number>>({});
  const [lessonOpen, setLessonOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const classLessons = lessons.filter(
    (l) => l.classId === cls.id && (l.status === "ongoing" || l.status === "prepared")
  );

  // Adaptive grid: fill screen as much as possible
  const gridConfig = useMemo(() => {
    const count = students.length;
    if (count <= 6) return { cols: 2, rows: 3 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 3, rows: 4 };
    if (count <= 16) return { cols: 4, rows: 4 };
    if (count <= 20) return { cols: 4, rows: 5 };
    if (count <= 24) return { cols: 4, rows: 6 };
    return { cols: 5, rows: Math.ceil(count / 5) };
  }, [students.length]);

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

  const handleSaveNote = () => {
    if (!noteText.trim()) {
      toast({ title: "Napište poznámku", variant: "destructive" });
      return;
    }
    setProofCounts((prev) => {
      const updated = { ...prev };
      selectedStudents.forEach((id) => {
        updated[id] = (updated[id] || 0) + 1;
      });
      return updated;
    });
    toast({ title: `Poznámka uložena pro ${selectedStudents.length} žáků` });
    setNoteText("");
    setCaptureMode(null);
    setSelectedStudents([]);
  };

  const handleSavePhoto = () => {
    setProofCounts((prev) => {
      const updated = { ...prev };
      selectedStudents.forEach((id) => {
        updated[id] = (updated[id] || 0) + 1;
      });
      return updated;
    });
    toast({ title: `Foto uloženo pro ${selectedStudents.length} žáků` });
    setCaptureMode(null);
    setSelectedStudents([]);
  };

  const selectedLessonObj = classLessons.find((l) => l.id === selectedLesson);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Link to="/capture">
            <Badge variant="secondary" className="text-sm py-1 px-3 cursor-pointer">
              {cls.name}
            </Badge>
          </Link>
          <Badge
            variant={selectedLesson ? "default" : "outline"}
            className="text-xs py-1 px-3 cursor-pointer"
            onClick={() => setLessonOpen(!lessonOpen)}
          >
            {selectedLessonObj ? selectedLessonObj.title : "Přiřadit lekci"}
          </Badge>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 hover:bg-accent rounded-lg"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      {/* Lesson picker dropdown */}
      {lessonOpen && (
        <div className="border-b border-border bg-card p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Vyberte lekci:</p>
          {classLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné dostupné lekce</p>
          ) : (
            classLessons.map((lesson) => (
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
                <span className="text-xs text-muted-foreground ml-2">· {lesson.subject}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Student grid — fills available space */}
      <div
        className="flex-1 p-3 overflow-auto"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
          gridAutoRows: "1fr",
          gap: "0.5rem",
          alignContent: "stretch",
        }}
      >
        {students.map((student) => {
          const isSelected = selectedStudents.includes(student.id);
          const count = proofCounts[student.id] || 0;
          return (
            <button
              key={student.id}
              onClick={() => toggleStudent(student.id)}
              className={`flex flex-col items-center justify-center rounded-xl border transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <span className="text-sm font-medium text-foreground text-center leading-tight">
                {getStudentShortName(student)}
              </span>
              {count > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  ))}
                  {count > 5 && (
                    <span className="text-[10px] text-muted-foreground">+{count - 5}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Capture panel (note or photo) */}
      {captureMode === "note" && (
        <div className="border-t border-border bg-card p-3 space-y-2">
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
          <Button className="w-full gap-1" onClick={handleSaveNote}>
            <Check className="h-4 w-4" />
            Uložit poznámku
          </Button>
        </div>
      )}

      {captureMode === "photo" && (
        <div className="border-t border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Foto pro {selectedStudents.length} žáků
            </span>
            <button onClick={() => setCaptureMode(null)} className="p-1 hover:bg-accent rounded">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-background">
            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Klepněte pro vyfocení</p>
            <Button variant="outline" className="gap-1" onClick={handleSavePhoto}>
              <Check className="h-4 w-4" />
              Simulovat foto
            </Button>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      {!captureMode && (
        <div className="border-t border-border bg-card p-3 flex items-center justify-center gap-6">
          <button
            onClick={() => handleCapture("note")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors ${
              selectedStudents.length === 0 ? "opacity-40" : ""
            }`}
          >
            <Pencil className="h-6 w-6 text-primary" />
            <span className="text-xs text-muted-foreground">Poznámka</span>
          </button>
          <button
            onClick={() => handleCapture("photo")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors ${
              selectedStudents.length === 0 ? "opacity-40" : ""
            }`}
          >
            <Camera className="h-6 w-6 text-primary" />
            <span className="text-xs text-muted-foreground">Foto</span>
          </button>
        </div>
      )}

      {/* Selection indicator */}
      {selectedStudents.length > 0 && !captureMode && (
        <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-medium">
          {selectedStudents.length} žáků vybráno
        </div>
      )}

      {/* Settings modal */}
      <E03CaptureToolSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
