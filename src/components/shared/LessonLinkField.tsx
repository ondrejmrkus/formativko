import { Plus } from "lucide-react";

interface LessonLinkFieldProps {
  lessonTitle?: string;
}

export function LessonLinkField({ lessonTitle }: LessonLinkFieldProps) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent transition-colors">
      <Plus className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {lessonTitle || "Připojit lekci"}
      </span>
    </div>
  );
}
