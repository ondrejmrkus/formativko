import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { getLevelColor } from "@/constants/goalLevels";

interface StudentGoalMatrixProps {
  students: any[];
  goals: any[];
  resolvedGoalLevels: Record<string, string[]>;
  studentGoalLevels: Record<string, Record<string, string>>;
  onLevelClick: (studentId: string, goalId: string) => void;
}

function abbreviateLevel(level: string) {
  return level.charAt(0).toUpperCase();
}

function getGoalLevelColor(level: string, goalId: string, resolvedGoalLevels: Record<string, string[]>) {
  const levels = resolvedGoalLevels[goalId] || [];
  return getLevelColor(level, levels);
}

export function StudentGoalMatrix({
  students,
  goals,
  resolvedGoalLevels,
  studentGoalLevels,
  onLevelClick,
}: StudentGoalMatrixProps) {
  if (students.length === 0 || goals.length === 0) return null;

  const goalIds = goals.map((g: any) => g.id);
  const exampleGoalId = goalIds[0];
  const exampleLevels = resolvedGoalLevels[exampleGoalId] || [];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-muted-foreground" />
        Úroveň žáků podle cílů
      </h2>
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left font-medium text-muted-foreground px-3 py-2 sticky left-0 bg-muted/50 z-10 min-w-[120px]">
                Žák
              </th>
              {goals.map((goal: any) => (
                <th
                  key={goal.id}
                  className="px-1.5 py-2 text-center font-medium text-muted-foreground"
                >
                  <Link
                    to={`/goals/${goal.id}`}
                    className="hover:text-primary transition-colors"
                    title={goal.title}
                  >
                    <span className="block max-w-[80px] truncate text-xs mx-auto">
                      {goal.title}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...students]
              .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name))
              .map((student: any) => (
                <tr
                  key={student.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-1.5 sticky left-0 bg-card z-10 font-medium">
                    <Link
                      to={`/student-profiles/${student.id}`}
                      className="hover:text-primary transition-colors whitespace-nowrap"
                    >
                      {getStudentDisplayName(student)}
                    </Link>
                  </td>
                  {goals.map((goal: any) => {
                    const level = studentGoalLevels[student.id]?.[goal.id] || null;
                    return (
                      <td key={goal.id} className="px-1.5 py-1.5 text-center">
                        <button
                          onClick={() => onLevelClick(student.id, goal.id)}
                          className={`inline-flex items-center justify-center min-w-[2rem] h-7 px-1.5 rounded-md text-[11px] font-medium border cursor-pointer transition-all hover:scale-105 ${
                            level
                              ? getGoalLevelColor(level, goal.id, resolvedGoalLevels)
                              : "bg-muted/50 text-muted-foreground/40 border-transparent hover:border-border"
                          }`}
                          title={
                            level
                              ? `${level} — klikněte pro změnu`
                              : "Klikněte pro nastavení úrovně"
                          }
                        >
                          {level ? abbreviateLevel(level) : "–"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      {exampleLevels.length > 0 && (
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
          <span className="text-muted-foreground/60">Kliknutím měníte úroveň:</span>
          {exampleLevels.map((lvl) => (
            <span key={lvl} className="flex items-center gap-1">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-sm border ${getGoalLevelColor(lvl, exampleGoalId, resolvedGoalLevels)}`}
              />
              {lvl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
