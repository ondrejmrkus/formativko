import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { StudentChip } from "@/components/shared/StudentChip";
import { LessonLinkField } from "@/components/shared/LessonLinkField";
import { DateField } from "@/components/shared/DateField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Mic, Camera, Upload, FileText } from "lucide-react";
import { useParams } from "react-router-dom";
import { getStudentById, getStudentDisplayName } from "@/data/mockData";

type ProofType = "text" | "voice" | "camera" | "file";

const proofTypes: { type: ProofType; label: string; icon: React.ElementType }[] = [
  { type: "text", label: "Textová poznámka", icon: FileText },
  { type: "voice", label: "Hlasová poznámka", icon: Mic },
  { type: "camera", label: "Vyfotit obrázek", icon: Camera },
  { type: "file", label: "Nahrát soubor", icon: Upload },
];

export default function B04AddProofOfLearning() {
  const { id } = useParams<{ id: string }>();
  const student = getStudentById(id || "s1")!;
  const [selectedType, setSelectedType] = useState<ProofType>("text");

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci", href: "/student-profiles" },
            { label: getStudentDisplayName(student), href: `/student-profiles/${student.id}` },
            { label: "Přidat důkaz o učení" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Přidat důkaz o učení</h1>

        {/* Type selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {proofTypes.map((pt) => (
            <button
              key={pt.type}
              onClick={() => setSelectedType(pt.type)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                selectedType === pt.type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              <pt.icon className="h-5 w-5" />
              <span className="text-xs font-medium text-center">{pt.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Type-specific content */}
          {selectedType === "text" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Poznámka</label>
              <Textarea className="min-h-[120px] bg-card" placeholder="Napište poznámku..." />
            </div>
          )}

          {selectedType === "voice" && (
            <div className="space-y-4">
              <Button variant="outline" className="w-full gap-2 h-16 text-base">
                <Mic className="h-5 w-5" />
                Začít diktovat
              </Button>
              <Textarea className="min-h-[80px] bg-card" placeholder="Přepis hlasové poznámky se zobrazí zde..." />
            </div>
          )}

          {selectedType === "camera" && (
            <Button variant="outline" className="w-full gap-2 h-16 text-base">
              <Camera className="h-5 w-5" />
              Vyfotit obrázek
            </Button>
          )}

          {selectedType === "file" && (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-card">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Nahrát soubor
              </Button>
            </div>
          )}

          {/* Common fields */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Název důkazu</label>
            <Input placeholder="Pojmenujte důkaz o učení..." className="bg-card" />
          </div>

          <LessonLinkField />
          <DateField date="2026-03-14" />

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Žáci</label>
            <div className="flex flex-wrap gap-2">
              <StudentChip name={getStudentDisplayName(student)} removable />
            </div>
          </div>

          {selectedType !== "text" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Poznámka</label>
              <Textarea className="min-h-[80px] bg-card" placeholder="Volitelná poznámka..." />
            </div>
          )}

          <Button className="w-full" size="lg">
            Uložit
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
