import { useState, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Camera, Settings, X, Check, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useClasses, useClassStudents } from "@/hooks/useClasses";
import { useLessons } from "@/hooks/useLessons";
import { getStudentShortName } from "@/hooks/useStudents";
import { useCreateProof } from "@/hooks/useProofs";
import { supabase } from "@/integrations/supabase/client";
import E03CaptureToolSettings from "./E03CaptureToolSettings";

type CaptureMode = null | "note" | "photo" | "grade";

export default function E02CaptureToolAddProofs() {
  const { classId } = useParams<{ classId: string }>();
  const { data: classes = [] } = useClasses();
  const { data: students = [] } = useClassStudents(classId);
  const { data: allLessons = [] } = useLessons();
  const createProof = useCreateProof();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [noteText, setNoteText] = useState("");
  const [studentGrades, setStudentGrades] = useState<Record<string, string>>({});
  const [proofCounts, setProofCounts] = useState<Record<string, number>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const cls = classes.find((c) => c.id === classId);
  const classLessons = allLessons.filter(
    (l) => l.class_id === classId && (l.status === "ongoing" || l.status === "prepared")
  );

  const gridConfig = useMemo(() => {
    const count = students.length;
    if (count <= 6) return { cols: 2 };
    if (count <= 9) return { cols: 3 };
    if (count <= 16) return { cols: 4 };
    return { cols: 5 };
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

  const handleSaveGrades = async () => {
    const studentsWithGrades = selectedStudents.filter((id) => studentGrades[id]);
    if (studentsWithGrades.length === 0) {
      toast({ title: "Přiřaďte alespoň jednu známku", variant: "destructive" });
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      for (const sid of studentsWithGrades) {
        const grade = studentGrades[sid];
        await createProof.mutateAsync({
          title: `Známka ${grade}`,
          type: "grade",
          note: noteText || "",
          date: today,
          lessonId: selectedLesson,
          studentIds: [sid],
        });
      }
      setProofCounts((prev) => {
        const updated = { ...prev };
        studentsWithGrades.forEach((id) => { updated[id] = (updated[id] || 0) + 1; });
        return updated;
      });
      toast({ title: `Známky uloženy pro ${studentsWithGrades.length} žáků` });
      setNoteText("");
      setStudentGrades({});
      setCaptureMode(null);
      setSelectedStudents([]);
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
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
      setCaptureMode(null);
      setSelectedStudents([]);
    } catch {
      toast({ title: "Chyba při nahrávání", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectedLessonObj = classLessons.find((l) => l.id === selectedLesson);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Link to="/capture">
            <Badge variant="secondary" className="text-sm py-1 px-3 cursor-pointer">
              {cls?.name || "Třída"}
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
        <button onClick={() => setSettingsOpen(true)} className="p-2 hover:bg-accent rounded-lg">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

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
        {students.map((student: any) => {
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
              <span className="text-sm sm:text-base md:text-lg font-medium text-foreground text-center leading-tight">
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
        })}
      </div>

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
          <Button className="w-full gap-1" onClick={handleSaveNote} disabled={createProof.isPending}>
            <Check className="h-4 w-4" />
            {createProof.isPending ? "Ukládání…" : "Uložit poznámku"}
          </Button>
        </div>
      )}

      {captureMode === "grade" && (
        <div className="border-t border-border bg-card p-3 space-y-3 max-h-[60vh] overflow-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Známky pro {selectedStudents.length} žáků
            </span>
            <button onClick={() => { setCaptureMode(null); setStudentGrades({}); }} className="p-1 hover:bg-accent rounded">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2">
            {selectedStudents.map((sid) => {
              const s = students.find((st: any) => st.id === sid);
              if (!s) return null;
              const currentGrade = studentGrades[sid] || "";
              return (
                <div key={sid} className="flex items-center gap-2">
                  <span className="text-sm text-foreground min-w-[80px] truncate flex-shrink-0">
                    {getStudentShortName(s)}
                  </span>
                  <div className="flex gap-1">
                    {["1", "2", "3", "4", "5"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setStudentGrades((prev) => ({
                          ...prev,
                          [sid]: prev[sid] === g ? "" : g,
                        }))}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
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
          </div>
          <Textarea
            className="min-h-[60px] bg-background"
            placeholder="Volitelná poznámka ke známkám..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button className="w-full gap-1" onClick={handleSaveGrades} disabled={createProof.isPending}>
            <Check className="h-4 w-4" />
            {createProof.isPending ? "Ukládání…" : "Uložit známky"}
          </Button>
        </div>
      )}

      {captureMode === "photo" && (
        <div className="border-t border-border bg-card p-3 space-y-2">
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
      )}

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
            onClick={() => handleCapture("grade")}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors ${
              selectedStudents.length === 0 ? "opacity-40" : ""
            }`}
          >
            <Star className="h-6 w-6 text-primary" />
            <span className="text-xs text-muted-foreground">Známka</span>
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

      {selectedStudents.length > 0 && !captureMode && (
        <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-medium">
          {selectedStudents.length} žáků vybráno
        </div>
      )}

      <E03CaptureToolSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
