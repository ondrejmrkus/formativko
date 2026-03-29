import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus, Minus } from "lucide-react";
import { getStudentShortName } from "@/hooks/useStudents";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface SeatPosition {
  student_id: string;
  seat_row: number;
  seat_col: number;
}

interface SeatingChartEditorProps {
  students: Student[];
  initialPositions?: SeatPosition[];
  onSave: (positions: { studentId: string; row: number | null; col: number | null }[]) => void;
  saving?: boolean;
}

// Draggable student chip
function DraggableStudent({ student, isOverlay }: { student: Student; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: student.id,
    data: { student },
  });

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground cursor-grab active:cursor-grabbing select-none whitespace-nowrap ${
        isDragging ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg scale-105" : ""}`}
    >
      {getStudentShortName(student)}
    </div>
  );
}

// Droppable grid cell
function GridCell({
  row,
  col,
  student,
  children,
}: {
  row: number;
  col: number;
  student: Student | null;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-center rounded-lg border-2 border-dashed min-h-[44px] transition-colors ${
        isOver
          ? "border-primary bg-primary/10"
          : student
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-card hover:border-muted-foreground/30"
      }`}
    >
      {children}
    </div>
  );
}

// Droppable unassigned area
function UnassignedArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned",
    data: { row: null, col: null },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-wrap gap-2 p-3 rounded-xl border-2 border-dashed min-h-[52px] transition-colors ${
        isOver ? "border-primary bg-primary/10" : "border-border bg-muted/30"
      }`}
    >
      {children}
    </div>
  );
}

const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 5;

export default function SeatingChartEditor({ students, initialPositions = [], onSave, saving }: SeatingChartEditorProps) {
  // Compute initial grid size from existing positions
  const initialSize = useMemo(() => {
    let maxRow = DEFAULT_ROWS - 1;
    let maxCol = DEFAULT_COLS - 1;
    for (const p of initialPositions) {
      if (p.seat_row > maxRow) maxRow = p.seat_row;
      if (p.seat_col > maxCol) maxCol = p.seat_col;
    }
    return { rows: maxRow + 1, cols: maxCol + 1 };
  }, [initialPositions]);

  const [rows, setRows] = useState(initialSize.rows);
  const [cols, setCols] = useState(initialSize.cols);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Local positions state: studentId -> { row, col } or null
  const [positions, setPositions] = useState<Record<string, { row: number; col: number } | null>>(
    () => {
      const posMap = new Map(initialPositions.map((p) => [p.student_id, p]));
      const map: Record<string, { row: number; col: number } | null> = {};
      for (const s of students) {
        const p = posMap.get(s.id);
        map[s.id] = p ? { row: p.seat_row, col: p.seat_col } : null;
      }
      return map;
    }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  // Build grid lookup: "row-col" -> student
  const gridMap = useMemo(() => {
    const map: Record<string, Student> = {};
    for (const s of students) {
      const pos = positions[s.id];
      if (pos) map[`${pos.row}-${pos.col}`] = s;
    }
    return map;
  }, [students, positions]);

  const unassigned = useMemo(
    () => students.filter((s) => !positions[s.id]),
    [students, positions]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const studentId = active.id as string;
    const target = over.data.current as { row: number | null; col: number | null };

    if (target.row == null || target.col == null) {
      // Dropped on unassigned area
      setPositions((prev) => ({ ...prev, [studentId]: null }));
      return;
    }

    // Check if target cell is occupied by another student
    const key = `${target.row}-${target.col}`;
    const occupant = gridMap[key];

    setPositions((prev) => {
      const next = { ...prev };
      if (occupant && occupant.id !== studentId) {
        // Swap: move occupant to where dragged student was
        next[occupant.id] = prev[studentId] || null;
      }
      next[studentId] = { row: target.row!, col: target.col! };
      return next;
    });
  }, [gridMap]);

  const handleReset = () => {
    const map: Record<string, { row: number; col: number } | null> = {};
    for (const s of students) map[s.id] = null;
    setPositions(map);
  };

  const handleSave = () => {
    const result = students.map((s) => ({
      studentId: s.id,
      row: positions[s.id]?.row ?? null,
      col: positions[s.id]?.col ?? null,
    }));
    onSave(result);
  };

  const activeStudent = activeId ? students.find((s) => s.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Grid size controls */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Řádky</span>
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setRows((r) => Math.max(1, r - 1))}
            disabled={rows <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-5 text-center font-medium">{rows}</span>
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setRows((r) => Math.min(10, r + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sloupce</span>
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setCols((c) => Math.max(1, c - 1))}
            disabled={cols <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-5 text-center font-medium">{cols}</span>
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setCols((c) => Math.min(10, c + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto gap-1 text-xs" onClick={handleReset}>
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Grid */}
        <div className="border border-border rounded-xl p-2 bg-muted/20">
          <div className="text-[10px] text-muted-foreground text-center mb-2">Tabule</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: "0.375rem",
            }}
          >
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const student = gridMap[`${r}-${c}`];
                return (
                  <GridCell key={`${r}-${c}`} row={r} col={c} student={student}>
                    {student && <DraggableStudent student={student} />}
                  </GridCell>
                );
              })
            )}
          </div>
        </div>

        {/* Unassigned students */}
        {unassigned.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              Nepřiřazení ({unassigned.length})
            </p>
            <UnassignedArea>
              {unassigned.map((s) => (
                <DraggableStudent key={s.id} student={s} />
              ))}
            </UnassignedArea>
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {activeStudent ? <DraggableStudent student={activeStudent} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* If all assigned, show drop zone to unassign */}
      {unassigned.length === 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Přetáhněte sem pro odebrání z plánu
          </p>
          <UnassignedArea>
            <span className="text-xs text-muted-foreground/50 py-1">Všichni žáci jsou rozmístěni</span>
          </UnassignedArea>
        </div>
      )}

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Ukládání…" : "Uložit rozmístění"}
      </Button>
    </div>
  );
}
