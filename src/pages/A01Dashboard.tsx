import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { Users, School, Camera, FileText } from "lucide-react";

const actions = [
  {
    title: "Vytvořit žákovské profily",
    description: "Přidejte žáky do systému jednotlivě nebo hromadným nahráním.",
    icon: Users,
    href: "/create-student-profiles",
  },
  {
    title: "Vytvořit třídu",
    description: "Seskupte žáky do tříd pro snadnější správu.",
    icon: School,
    href: "/create-class",
  },
  {
    title: "Sbírat důkazy o učení v hodině",
    description: "Zaznamenejte pozorování, poznámky nebo soubory k žákům.",
    icon: Camera,
    href: "/capture",
  },
  {
    title: "Vytvořit slovní hodnocení",
    description: "Vygenerujte návrhy hodnocení pro vaše žáky.",
    icon: FileText,
    href: "/evaluations/create",
  },
];

export default function A01Dashboard() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Dobrý den, Radovane!</h1>
        <p className="text-muted-foreground mb-8">
          Jak vám mohu dnes pomoci?
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <action.icon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">{action.title}</h2>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
