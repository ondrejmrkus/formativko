import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { useLessons } from "@/hooks/useLessons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface LessonLinkFieldProps {
  lessonId?: string | null;
  onLessonChange?: (lessonId: string | null) => void;
}

export function LessonLinkField({ lessonId, onLessonChange }: LessonLinkFieldProps) {
  const { data: lessons = [] } = useLessons();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLesson = lessons.find((l) => l.id === lessonId);

  const filtered = lessons.filter(
    (l) => !search || l.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground block mb-1">Lekce</label>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent transition-colors">
            {selectedLesson ? (
              <>
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground flex-1">{selectedLesson.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLessonChange?.(null);
                  }}
                  className="p-0.5 hover:bg-accent rounded"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Připojit lekci</span>
              </>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <Input
            placeholder="Hledat lekci..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 text-sm"
            autoFocus
          />
          <div className="max-h-56 overflow-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-1">Žádné lekce</p>
            ) : (
              filtered.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    onLessonChange?.(lesson.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    lessonId === lesson.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  {lesson.title}
                  {lesson.subjects?.name && <span className="text-xs text-muted-foreground ml-1">· {lesson.subjects.name}</span>}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
