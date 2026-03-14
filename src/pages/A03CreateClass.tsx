import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function A03CreateClass() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [className, setClassName] = useState("");
  const [studentInputs, setStudentInputs] = useState(["", "", ""]);

  const updateStudent = (index: number, value: string) => {
    setStudentInputs((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const addStudent = () => setStudentInputs((prev) => [...prev, ""]);

  const removeStudent = (index: number) => {
    if (studentInputs.length <= 1) return;
    setStudentInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!className.trim()) {
      toast({ title: "Zadejte název třídy", variant: "destructive" });
      return;
    }
    const filled = studentInputs.filter((s) => s.trim());
    toast({ title: `Třída "${className}" vytvořena`, description: `${filled.length} žáků přidáno` });
    navigate("/student-profiles");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Vytvořit třídu" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Vytvořit třídu</h1>

        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground block mb-2">Název třídy</label>
          <Input
            placeholder="např. 6.A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="bg-card max-w-xs"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">Přidat žáky</label>
          <div className="space-y-3">
            {studentInputs.map((name, i) => (
              <div key={i} className="flex gap-3 items-center">
                <Input
                  placeholder="Začněte psát jméno žáka..."
                  value={name}
                  onChange={(e) => updateStudent(i, e.target.value)}
                  className="bg-card"
                />
                {studentInputs.length > 1 && (
                  <button onClick={() => removeStudent(i)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button variant="ghost" className="gap-2 text-primary mb-8" onClick={addStudent}>
          <Plus className="h-4 w-4" />
          Přidat dalšího žáka
        </Button>

        <Button className="w-full" size="lg" onClick={handleCreate}>
          Vytvořit třídu
        </Button>
      </div>
    </AppLayout>
  );
}
