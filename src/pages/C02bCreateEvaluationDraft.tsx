import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";

export default function C02bCreateEvaluationDraft() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Hodnocení", href: "/evaluations" },
            { label: "Vytvořit hodnocení", href: "/evaluations/create" },
            { label: "Náhled konceptu" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-2">Náhled konceptu</h1>
        <p className="text-muted-foreground mb-6">Krok 2 ze 2 — Kontrola a úpravy</p>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-card border border-border">
            <h2 className="font-semibold mb-1">Adam Novák</h2>
            <p className="text-xs text-muted-foreground mb-3">Český jazyk · 1. pololetí</p>
            <Textarea
              className="min-h-[160px] bg-background"
              defaultValue="Adam se v hodinách českého jazyka aktivně zapojuje do diskuzí a prokazuje dobré porozumění literárním textům. Jeho písemný projev se zlepšuje, ale stále je třeba pracovat na pravopisu. V oblasti slohových prací projevuje kreativitu a originalitu. Doporučuji pokračovat v pravidelném čtení a procvičování pravopisu."
            />
          </div>

          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1" size="lg">
              <Link to="/evaluations/create">Zpět</Link>
            </Button>
            <Button asChild className="flex-1" size="lg">
              <Link to="/evaluations/edit/e1">Uložit koncepty</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
