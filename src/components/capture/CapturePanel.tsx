import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateProof } from "@/hooks/useProofs";
import { useSetStudentGoalLevel } from "@/hooks/useStudentGoalLevels";
import { useGoal, useGoalsForCourse } from "@/hooks/useGoals";
import { useLessonGoals } from "@/hooks/useLessons";
import { getStudentShortName } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import type { ProofTypeRow, ProofFieldKind } from "@/constants/proofTypes";

interface CapturePanelProps {
  proofType: ProofTypeRow;
  selectedStudents: string[];
  students: any[];
  selectedLesson: string | null;
  courseId: string | undefined;
  selectedGoalIds: string[];
  setSelectedGoalIds: (ids: string[]) => void;
  onCaptured: (studentIds: string[], proofTypeId: string) => void;
}

export default function CapturePanel({
  proofType,
  selectedStudents,
  students,
  selectedLesson,
  courseId,
  selectedGoalIds,
  setSelectedGoalIds,
  onCaptured,
}: CapturePanelProps) {
  const { toast } = useToast();
  const createProof = useCreateProof();
  const setStudentGoalLevel = useSetStudentGoalLevel();

  const fields = proofType.fields as ProofFieldKind[];
  const hasText = fields.includes("text");
  const hasImage = fields.includes("image");
  const hasLevel = fields.includes("level");
  const isInstant = fields.includes("none") || fields.length === 0;
  const dbProofTypeId = proofType.builtin ? undefined : proofType.id;

  // Text state
  const [noteText, setNoteText] = useState("");

  // Image state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Level state
  const [progressLevel, setProgressLevel] = useState("");
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Goals
  const { data: lessonGoals = [] } = useLessonGoals(selectedLesson || undefined);
  const { data: courseGoals = [] } = useGoalsForCourse(courseId);
  const availableGoals = useMemo(
    () => (selectedLesson && lessonGoals.length > 0 ? lessonGoals : courseGoals),
    [selectedLesson, lessonGoals, courseGoals]
  );

  const singleGoalId = selectedGoalIds.length === 1 ? selectedGoalIds[0] : undefined;
  const { data: goalDetail } = useGoal(singleGoalId);

  const levelNames = useMemo(() => {
    if (singleGoalId) {
      const fromCourse = courseGoals.find((g) => g.id === singleGoalId);
      if (fromCourse?.evaluation_criteria?.length) {
        return fromCourse.evaluation_criteria[0].level_descriptors.map((ld) => ld.level);
      }
    }
    if (!goalDetail?.evaluation_criteria?.length) return [];
    return goalDetail.evaluation_criteria[0].level_descriptors.map((ld) => ld.level);
  }, [singleGoalId, courseGoals, goalDetail]);

  // Auto-select when there's only one available goal
  useEffect(() => {
    if (hasLevel && availableGoals.length === 1 && selectedGoalIds.length === 0) {
      setSelectedGoalIds([availableGoals[0].id]);
    }
  }, [hasLevel, availableGoals, selectedGoalIds.length]);

  // Instant capture: fire on mount if no fields needed and students selected
  useEffect(() => {
    if (isInstant && selectedStudents.length > 0) {
      handleSave();
    }
  }, []); // only on mount

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (selectedStudents.length === 0) {
      toast({ title: "Vyberte žáky", variant: "destructive" });
      return;
    }

    // Validate based on fields
    if (hasText && !hasLevel && !hasImage && !noteText.trim()) {
      toast({ title: "Napište poznámku", variant: "destructive" });
      return;
    }
    if (hasImage && !photoFile) {
      toast({ title: "Nejdříve vyfoťte nebo vyberte obrázek", variant: "destructive" });
      return;
    }
    if (hasLevel) {
      if (!singleGoalId) {
        toast({ title: "Vyberte právě jeden cíl", variant: "destructive" });
        return;
      }
      if (!progressLevel) {
        toast({ title: "Vyberte úroveň", variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Handle level field: upsert student_goal_levels
      if (hasLevel && singleGoalId) {
        for (const sid of selectedStudents) {
          await setStudentGoalLevel.mutateAsync({
            studentId: sid,
            goalId: singleGoalId,
            level: progressLevel,
          });
          // Create a proof with per-student note if provided
          const note = studentNotes[sid]?.trim();
          if (note) {
            await createProof.mutateAsync({
              title: `${proofType.name}: ${progressLevel}`,
              type: "text",
              note,
              date: today,
              lessonId: selectedLesson,
              studentIds: [sid],
              goalIds: [singleGoalId],
              proofTypeId: dbProofTypeId,
            });
          }
        }
      }

      // Handle image field
      if (hasImage && photoFile) {
        setUploading(true);
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("proof-files")
          .upload(path, photoFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("proof-files").getPublicUrl(path);

        await createProof.mutateAsync({
          title: `${proofType.name} ${today}`,
          type: "camera",
          note: noteText || "",
          date: today,
          lessonId: selectedLesson,
          studentIds: selectedStudents,
          fileName: photoFile.name,
          fileUrl: urlData.publicUrl,
          goalIds: selectedGoalIds.length > 0 ? selectedGoalIds : undefined,
          proofTypeId: dbProofTypeId,
        });
      }
      // Handle text-only (no level, no image)
      else if (hasText && !hasLevel) {
        await createProof.mutateAsync({
          title: `${proofType.name} ${today}`,
          type: "text",
          note: noteText,
          date: today,
          lessonId: selectedLesson,
          studentIds: selectedStudents,
          goalIds: selectedGoalIds.length > 0 ? selectedGoalIds : undefined,
          proofTypeId: dbProofTypeId,
        });
      }
      // Handle instant capture (no fields)
      else if (isInstant) {
        await createProof.mutateAsync({
          title: `${proofType.name} ${today}`,
          type: "text",
          note: "",
          date: today,
          lessonId: selectedLesson,
          studentIds: selectedStudents,
          proofTypeId: dbProofTypeId,
        });
      }

      onCaptured(selectedStudents, proofType.id);

      toast({
        title: `${proofType.name} uloženo pro ${selectedStudents.length} žáků`,
      });

      // Reset form state
      setNoteText("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setProgressLevel("");
      setStudentNotes({});
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const studentCount = selectedStudents.length;
  const headerText = studentCount > 0
    ? `${proofType.name} pro ${studentCount} žáků`
    : `${proofType.name} — vyberte žáky`;

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium text-foreground">{headerText}</span>

      {/* Level field: goal picker + level picker + per-student notes */}
      {hasLevel && (
        <>
          {availableGoals.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Cíl</span>
              <div className="flex flex-wrap gap-1.5">
                {availableGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() =>
                      setSelectedGoalIds(singleGoalId === goal.id ? [] : [goal.id])
                    }
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
          {singleGoalId && levelNames.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Úroveň</span>
              <div className="flex flex-wrap gap-1.5">
                {levelNames.map((level) => (
                  <button
                    key={level}
                    onClick={() =>
                      setProgressLevel(progressLevel === level ? "" : level)
                    }
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
          {singleGoalId && levelNames.length > 0 && studentCount > 0 && (
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
                      onChange={(e) =>
                        setStudentNotes((prev) => ({ ...prev, [sid]: e.target.value }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Image field */}
      {hasImage && (
        <>
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
              <img
                src={photoPreview}
                alt="Náhled"
                className="w-full max-h-48 object-contain rounded-xl border border-border"
              />
              <button
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
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
              <p className="text-sm text-muted-foreground">
                Klepněte pro vyfocení nebo výběr obrázku
              </p>
            </button>
          )}
        </>
      )}

      {/* Text field */}
      {hasText && (
        <Textarea
          className="min-h-[80px] bg-background"
          placeholder={hasImage ? "Volitelná poznámka k fotce..." : "Napište poznámku..."}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          autoFocus={!hasLevel && !hasImage}
        />
      )}

      {/* Save button (not shown for instant types — they auto-save) */}
      {!isInstant && (
        <Button
          className="w-full gap-1"
          onClick={handleSave}
          disabled={saving || uploading}
        >
          <Check className="h-4 w-4" />
          {saving || uploading ? "Ukládání…" : `Uložit ${proofType.name.toLowerCase()}`}
        </Button>
      )}
    </div>
  );
}
