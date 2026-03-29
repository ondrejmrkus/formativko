import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Upload, X } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects, useCreateSubject } from "@/hooks/useSubjects";
import { useCourse, useCreateCourse, useUpdateCourse } from "@/hooks/useCourses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function K02CreateCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const isEdit = !!courseId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();
  const { data: existingCourse } = useCourse(isEdit ? courseId : undefined);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();

  const [name, setName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [planFileName, setPlanFileName] = useState<string | null>(null);
  const [planFileUrl, setPlanFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (existingCourse) {
      setName(existingCourse.name);
      setSelectedClassId(existingCourse.class_id);
      setSelectedSubjectId(existingCourse.subject_id);
      setPlanFileName(existingCourse.thematic_plan_file_name);
      setPlanFileUrl(existingCourse.thematic_plan_file_url);
    }
  }, [existingCourse]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("course-files")
        .upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("course-files")
        .getPublicUrl(path);

      setPlanFileName(file.name);
      setPlanFileUrl(urlData.publicUrl);
      toast({ title: "Soubor nahrán" });
    } catch (err: any) {
      toast({ title: "Chyba při nahrávání", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setPlanFileName(null);
    setPlanFileUrl(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Zadejte název kurzu", variant: "destructive" });
      return;
    }
    if (!selectedClassId) {
      toast({ title: "Vyberte třídu", variant: "destructive" });
      return;
    }
    if (!selectedSubjectId) {
      toast({ title: "Vyberte předmět", variant: "destructive" });
      return;
    }

    try {
      if (isEdit) {
        await updateCourse.mutateAsync({
          id: courseId!,
          name: name.trim(),
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          thematicPlanFileName: planFileName,
          thematicPlanFileUrl: planFileUrl,
        });
        toast({ title: "Kurz upraven" });
        navigate(`/courses/${courseId}`);
      } else {
        const course = await createCourse.mutateAsync({
          name: name.trim(),
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          thematicPlanFileName: planFileName,
          thematicPlanFileUrl: planFileUrl,
        });
        toast({ title: "Kurz vytvořen" });
        navigate("/");
      }
    } catch (err: any) {
      console.error("Course save error:", err);
      toast({ title: "Chyba při ukládání", description: err?.message, variant: "destructive" });
    }
  };

  const isPending = createCourse.isPending || updateCourse.isPending;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Kurzy", href: "/courses" },
            { label: isEdit ? "Upravit kurz" : "Nový kurz" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">{isEdit ? "Upravit kurz" : "Nový kurz"}</h1>

        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Název kurzu</label>
            <Input
              placeholder="Např. Matematika 5.A - jaro 2026..."
              className="bg-card"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Class */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Třída</label>
            <div className="flex flex-wrap gap-2">
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Zatím nemáte žádné třídy.</p>
              ) : (
                classes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedClassId === c.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Předmět</label>
            {subjects.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        selectedSubjectId === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 mb-1.5">Nebo vytvořte nový předmět:</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">Zatím nemáte žádné předměty. Vytvořte svůj první:</p>
            )}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Název předmětu..."
                className="bg-card flex-1"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newSubjectName.trim()) {
                      createSubject.mutate({ name: newSubjectName.trim() }, {
                        onSuccess: (data) => {
                          setSelectedSubjectId(data.id);
                          setNewSubjectName("");
                        },
                      });
                    }
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newSubjectName.trim() || createSubject.isPending}
                onClick={() => {
                  if (newSubjectName.trim()) {
                    createSubject.mutate({ name: newSubjectName.trim() }, {
                      onSuccess: (data) => {
                        setSelectedSubjectId(data.id);
                        setNewSubjectName("");
                      },
                    });
                  }
                }}
              >
                {createSubject.isPending ? "..." : "Vytvořit"}
              </Button>
            </div>
          </div>

          {/* Thematic plan upload */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Tematický plán</label>
            {planFileName ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="text-sm flex-1 truncate">{planFileName}</span>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-card hover:border-primary/30 transition-colors cursor-pointer">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Nahrávání..." : "Nahrát tematický plán (PDF, DOC, ...)"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,.txt"
                />
              </label>
            )}
          </div>

          <Button className="w-full" size="lg" onClick={handleSave} disabled={isPending}>
            {isPending ? "Ukládání..." : isEdit ? "Uložit změny" : "Vytvořit kurz"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
