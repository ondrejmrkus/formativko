import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { useSubject, useCreateSubject, useUpdateSubject } from "@/hooks/useSubjects";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function H02CreateSubject() {
  usePageTitle("Předmět");
  const { subjectId } = useParams<{ subjectId: string }>();
  const isEdit = !!subjectId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existingSubject } = useSubject(isEdit ? subjectId : undefined);
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();

  const [name, setName] = useState("");

  useEffect(() => {
    if (existingSubject) {
      setName(existingSubject.name);
    }
  }, [existingSubject]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Zadejte název předmětu", variant: "destructive" });
      return;
    }

    try {
      if (isEdit) {
        await updateSubject.mutateAsync({ id: subjectId!, name: name.trim() });
        toast({ title: "Předmět upraven" });
      } else {
        await createSubject.mutateAsync({ name: name.trim() });
        toast({ title: "Předmět vytvořen" });
      }
      navigate("/subjects");
    } catch (err) {
      console.error("Chyba při ukládání", err);
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const isPending = createSubject.isPending || updateSubject.isPending;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Předměty", href: "/subjects" },
            { label: isEdit ? "Upravit předmět" : "Nový předmět" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">{isEdit ? "Upravit předmět" : "Nový předmět"}</h1>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Název předmětu
            </label>
            <Input
              placeholder="Např. Matematika, Český jazyk..."
              className="bg-card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <Button className="w-full" size="lg" onClick={handleSave} disabled={isPending}>
            {isPending ? "Ukládání..." : isEdit ? "Uložit změny" : "Vytvořit předmět"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
