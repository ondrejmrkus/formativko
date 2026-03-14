import { Link } from "react-router-dom";
import { classes, getStudentsByClass } from "@/data/mockData";

export default function E01CaptureToolChooseClass() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 text-center border-b border-border bg-card">
        <h1 className="text-lg font-bold text-foreground">Zachytávač</h1>
        <p className="text-sm text-muted-foreground">Vyberte třídu</p>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-3 max-w-md mx-auto w-full">
        {classes.map((cls) => {
          const count = getStudentsByClass(cls.id).length;
          return (
            <Link
              key={cls.id}
              to={`/capture/${cls.id}`}
              className="flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
            >
              <span className="text-lg font-semibold text-foreground">{cls.name}</span>
              <span className="text-sm text-muted-foreground">{count} žáků</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
