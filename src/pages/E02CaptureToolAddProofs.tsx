import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Camera, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClassById,
  getStudentsByClass,
  getStudentShortName,
  lessons,
} from "@/data/mockData";
import E03CaptureToolSettings from "./E03CaptureToolSettings";

export default function E02CaptureToolAddProofs() {
  const { classId } = useParams<{ classId: string }>();
  const cls = getClassById(classId || "c1")!;
  const students = getStudentsByClass(cls.id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Determine grid columns: ≤16 → 2 cols, >16 → 3 cols
  const cols = students.length <= 16 ? 2 : 3;

  const classLessons = lessons.filter(
    (l) => l.classId === cls.id && (l.status === "ongoing" || l.status === "prepared")
  );

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

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
          <Badge variant="outline" className="text-xs py-1 px-3 cursor-pointer">
            Přiřadit lekci
          </Badge>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 hover:bg-accent rounded-lg"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      {/* Student grid */}
      <div
        className="flex-1 p-3 overflow-auto"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "0.5rem",
          alignContent: "start",
        }}
      >
        {students.map((student) => {
          const isSelected = selectedStudents.includes(student.id);
          return (
            <button
              key={student.id}
              onClick={() => toggleStudent(student.id)}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 min-h-[72px] transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <span className="text-sm font-medium text-foreground text-center leading-tight">
                {getStudentShortName(student)}
              </span>
              {/* Proof count circles - empty at start */}
              <div className="flex gap-1 mt-1.5 min-h-[20px]">
                {/* Will be populated when proofs are added */}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom toolbar */}
      <div className="border-t border-border bg-card p-3 flex items-center justify-center gap-6">
        <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors">
          <Pencil className="h-6 w-6 text-primary" />
          <span className="text-xs text-muted-foreground">Poznámka</span>
        </button>
        <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors">
          <Camera className="h-6 w-6 text-primary" />
          <span className="text-xs text-muted-foreground">Foto</span>
        </button>
      </div>

      {/* Settings modal */}
      <E03CaptureToolSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
