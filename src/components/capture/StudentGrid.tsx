import { useMemo } from "react";
import { Check } from "lucide-react";
import { getStudentShortName } from "@/hooks/useStudents";
import { PROOF_TYPE_COLORS, type ProofTypeColor } from "@/constants/proofTypes";

interface StudentGridProps {
  students: any[];
  selectedStudents: string[];
  proofDots: Record<string, string[]>;
  proofTypeMap: Map<string, any>;
  coverageMap: Record<string, "all" | "some" | "none">;
  seatingData: {
    grid: (any | null)[][];
    rows: number;
    cols: number;
    unseated: any[];
    emptyRows: Set<number>;
    emptyCols: Set<number>;
  } | null;
  lessonGoalIds: string[];
  onToggleStudent: (id: string) => void;
}

export function StudentGrid({
  students,
  selectedStudents,
  proofDots,
  proofTypeMap,
  coverageMap,
  seatingData,
  lessonGoalIds,
  onToggleStudent,
}: StudentGridProps) {
  // Responsive grid columns: fewer columns on small screens for larger touch targets
  const gridConfig = useMemo(() => {
    if (seatingData) return { cols: seatingData.cols, colsSm: seatingData.cols, colsMd: seatingData.cols };
    const count = students.length;
    // Mobile (< 640px): max 3 cols for fat-finger targets
    // Tablet (640-1024px): up to 4 cols
    // Desktop (1024+): up to 5 cols
    if (count <= 4) return { cols: 2, colsSm: 2, colsMd: 2 };
    if (count <= 6) return { cols: 2, colsSm: 3, colsMd: 3 };
    if (count <= 9) return { cols: 3, colsSm: 3, colsMd: 3 };
    if (count <= 16) return { cols: 3, colsSm: 4, colsMd: 4 };
    if (count <= 25) return { cols: 3, colsSm: 4, colsMd: 5 };
    return { cols: 3, colsSm: 5, colsMd: 5 };
  }, [students.length, seatingData]);

  const renderCell = (student: any) => {
    const isSelected = selectedStudents.includes(student.id);
    const dots = proofDots[student.id] || [];
    const coverage = coverageMap[student.id];
    const coverageStyle = isSelected
      ? "border-primary bg-primary/15 shadow-sm ring-2 ring-primary/30"
      : coverage === "all"
        ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30 hover:border-green-400"
        : coverage === "some"
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 hover:border-amber-400"
          : "border-border bg-card hover:border-primary/30";
    return (
      <button
        key={student.id}
        onClick={() => onToggleStudent(student.id)}
        className={`relative flex flex-col items-center justify-center rounded-xl border transition-all min-h-[3rem] sm:min-h-0 ${coverageStyle}`}
      >
        {isSelected && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
        <span className="text-sm sm:text-base md:text-lg font-medium text-foreground text-center leading-tight px-1">
          {getStudentShortName(student)}
        </span>
        {dots.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 lg:gap-2 lg:mt-2">
            {dots.slice(0, 5).map((ptId, i) => {
              const pt = proofTypeMap.get(ptId);
              const dotColor = pt
                ? (PROOF_TYPE_COLORS[pt.color as ProofTypeColor]?.dot || "bg-gray-400")
                : "bg-gray-400";
              return (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 rounded-full ${dotColor}`}
                />
              );
            })}
            {dots.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{dots.length - 5}</span>
            )}
          </div>
        )}
      </button>
    );
  };

  const gridCells = (() => {
    if (seatingData) {
      const cells: React.ReactNode[] = [];
      for (let r = 0; r < seatingData.rows; r++) {
        for (let c = 0; c < seatingData.cols; c++) {
          const student = seatingData.grid[r][c];
          if (student) {
            cells.push(renderCell(student));
          } else {
            cells.push(<div key={`empty-${r}-${c}`} className="rounded-xl" />);
          }
        }
      }
      seatingData.unseated.forEach((s: any) => cells.push(renderCell(s)));
      return cells;
    }
    return students.map((s: any) => renderCell(s));
  })();

  return (
    <div className="flex-1 p-2 sm:p-3 flex flex-col min-h-0 lg:overflow-hidden">
      {/* Responsive grid columns via CSS custom properties */}
      {!seatingData && (
        <style>{`
          .capture-grid {
            --grid-cols: ${gridConfig.cols};
          }
          @media (min-width: 640px) {
            .capture-grid { --grid-cols: ${gridConfig.colsSm}; }
          }
          @media (min-width: 1024px) {
            .capture-grid { --grid-cols: ${gridConfig.colsMd}; }
          }
        `}</style>
      )}
      <div
        className={`flex-1 grid gap-1.5 sm:gap-2 ${!seatingData ? "capture-grid" : ""}`}
        style={{
          ...(seatingData
            ? {
                gridTemplateColumns: Array.from({ length: seatingData.cols }, (_, c) =>
                  seatingData.emptyCols.has(c) ? "0.15fr" : "1fr"
                ).join(" "),
                gridTemplateRows: Array.from({ length: seatingData.rows }, (_, r) =>
                  seatingData.emptyRows.has(r) ? "0.15fr" : "1fr"
                ).join(" ") + (seatingData.unseated.length > 0
                  ? " " + Array.from({ length: Math.ceil(seatingData.unseated.length / gridConfig.cols) }, () => "1fr").join(" ")
                  : ""),
              }
            : {
                gridTemplateColumns: `repeat(var(--grid-cols), 1fr)`,
                gridAutoRows: "1fr",
              }),
          alignContent: "stretch",
        }}
      >
        {gridCells}
      </div>
      {lessonGoalIds.length > 0 && (
        <div className="flex items-center gap-4 pt-2 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-300" />
            Splněno
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-300" />
            Částečně
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-card border border-border" />
            Bez důkazů
          </span>
        </div>
      )}
    </div>
  );
}
