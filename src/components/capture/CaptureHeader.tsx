import { Link } from "react-router-dom";
import { Home, Settings, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CaptureHeaderProps {
  courseName: string;
  courseDropdownOpen: boolean;
  onCourseDropdownToggle: () => void;
  allCourses: any[];
  currentCourseId: string | undefined;
  onCourseSelect: (courseId: string) => void;
  lessonOpen: boolean;
  onLessonToggle: () => void;
  selectedLesson: string | null;
  selectedLessonTitle: string | null;
  classLessons: any[];
  onLessonSelect: (lessonId: string | null) => void;
  sessionTotal: number;
  allSelected: boolean;
  onToggleAll: () => void;
  manageMode: boolean;
  onToggleManage: () => void;
  onOpenSeating: () => void;
}

export function CaptureHeader({
  courseName,
  courseDropdownOpen,
  onCourseDropdownToggle,
  allCourses,
  currentCourseId,
  onCourseSelect,
  lessonOpen,
  onLessonToggle,
  selectedLesson,
  selectedLessonTitle,
  classLessons,
  onLessonSelect,
  sessionTotal,
  allSelected,
  onToggleAll,
  manageMode,
  onToggleManage,
  onOpenSeating,
}: CaptureHeaderProps) {
  return (
    <header className="flex items-center justify-between p-2 sm:p-3 border-b border-border bg-card gap-1">
      <div className="flex items-center gap-1.5 sm:gap-2 relative min-w-0 flex-1">
        <Badge
          variant="secondary"
          className="text-xs sm:text-sm py-1 px-2 sm:px-3 lg:text-base lg:py-1.5 lg:px-4 cursor-pointer truncate max-w-[120px] sm:max-w-none"
          onClick={onCourseDropdownToggle}
        >
          {courseName}
        </Badge>
        {courseDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[200px] max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-auto">
            {allCourses.filter((c) => c.id !== currentCourseId).map((c) => (
              <button
                key={c.id}
                onClick={() => onCourseSelect(c.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-accent text-foreground transition-colors"
              >
                {c.name}
                <span className="text-xs text-muted-foreground ml-2">
                  {c.classes?.name}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <Badge
            variant={selectedLesson ? "default" : "outline"}
            className="text-[11px] sm:text-xs py-1 px-2 sm:px-3 lg:text-sm lg:py-1.5 lg:px-4 cursor-pointer truncate max-w-[100px] sm:max-w-none"
            onClick={onLessonToggle}
          >
            {selectedLessonTitle || "Lekce"}
          </Badge>
          {lessonOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[200px] max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-auto">
              {classLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2">Žádné dostupné lekce</p>
              ) : (
                classLessons.map((lesson: any) => (
                  <button
                    key={lesson.id}
                    onClick={() => onLessonSelect(selectedLesson === lesson.id ? null : lesson.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      selectedLesson === lesson.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    {lesson.title}
                    {lesson.subjects?.name && <span className="text-xs text-muted-foreground ml-2">· {lesson.subjects.name}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {sessionTotal > 0 && (
          <span className="hidden sm:inline text-xs text-muted-foreground mr-1">
            {sessionTotal} {sessionTotal === 1 ? "důkaz" : sessionTotal < 5 ? "důkazy" : "důkazů"}
          </span>
        )}
        <button
          onClick={onToggleAll}
          className="px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
        >
          {allSelected ? "Zrušit" : "Vše"}
        </button>
        <button
          onClick={onToggleManage}
          className={`p-2 rounded-lg transition-colors ${manageMode ? "bg-accent" : "hover:bg-accent"}`}
          title="Upravit typy důkazů"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenSeating}
          className="p-2 hover:bg-accent rounded-lg"
          title="Uspořádat žáky"
        >
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
        </button>
        <Link to="/" className="p-2 hover:bg-accent rounded-lg" title="Zpět na úvod">
          <Home className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>
    </header>
  );
}
