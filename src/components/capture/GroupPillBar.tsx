import { useState } from "react";
import { X, Check, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCreateStudentGroup, useDeleteStudentGroup } from "@/hooks/useStudentGroups";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GroupPillBarProps {
  groups: any[];
  classId: string;
  selectedStudents: string[];
  onSetSelectedStudents: (updater: (prev: string[]) => string[]) => void;
}

export function GroupPillBar({
  groups,
  classId,
  selectedStudents,
  onSetSelectedStudents,
}: GroupPillBarProps) {
  const { toast } = useToast();
  const createGroup = useCreateStudentGroup();
  const deleteGroup = useDeleteStudentGroup();
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate(
      { classId, name: newGroupName.trim(), memberIds: selectedStudents },
      {
        onSuccess: () => {
          toast({ title: `Skupina „${newGroupName.trim()}" vytvořena` });
          setNewGroupName("");
          setShowSaveGroup(false);
        },
        onError: (e: any) => toast({ title: "Chyba při vytváření skupiny", description: e?.message, variant: "destructive" }),
      }
    );
  };

  if (groups.length === 0 && selectedStudents.length < 2) return null;

  return (
    <>
      <div className="border-b border-border bg-card px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        {groups.map((group) => {
          const isActive = group.member_ids.length > 0 &&
            group.member_ids.every((id: string) => selectedStudents.includes(id));
          return (
            <span key={group.id} className="inline-flex items-center shrink-0">
              <button
                onClick={() => {
                  if (isActive) {
                    onSetSelectedStudents((prev) =>
                      prev.filter((id) => !group.member_ids.includes(id))
                    );
                  } else {
                    onSetSelectedStudents((prev) => {
                      const set = new Set(prev);
                      group.member_ids.forEach((id: string) => set.add(id));
                      return Array.from(set);
                    });
                  }
                }}
                className={`whitespace-nowrap px-2.5 py-1.5 sm:py-1 rounded-l-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {group.name} ({group.member_ids.length})
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteGroupTarget({ id: group.id, name: group.name });
                }}
                className={`px-1.5 py-1.5 sm:py-1 rounded-r-lg text-xs transition-all ${
                  isActive
                    ? "bg-primary/80 text-primary-foreground hover:bg-destructive"
                    : "bg-muted text-muted-foreground/50 hover:text-destructive hover:bg-accent"
                }`}
                title="Smazat skupinu"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        {selectedStudents.length >= 2 && !showSaveGroup && (
          <button
            onClick={() => setShowSaveGroup(true)}
            className="whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-accent flex items-center gap-1 border border-dashed border-border"
          >
            <Plus className="h-3 w-3" />
            Uložit skupinu
          </button>
        )}
        {showSaveGroup && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Input
              className="h-7 w-28 text-xs"
              placeholder="Název skupiny"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateGroup();
                if (e.key === "Escape") {
                  setShowSaveGroup(false);
                  setNewGroupName("");
                }
              }}
            />
            <Button
              size="sm"
              className="h-7 text-xs px-2"
              disabled={!newGroupName.trim() || createGroup.isPending}
              onClick={handleCreateGroup}
            >
              <Check className="h-3 w-3" />
            </Button>
            <button
              onClick={() => { setShowSaveGroup(false); setNewGroupName(""); }}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteGroupTarget} onOpenChange={(open) => { if (!open) setDeleteGroupTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat skupinu?</AlertDialogTitle>
            <AlertDialogDescription>
              Tím smažete skupinu „{deleteGroupTarget?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteGroupTarget) {
                  deleteGroup.mutate(
                    { groupId: deleteGroupTarget.id, classId },
                    { onError: (err: any) => toast({ title: "Chyba při mazání", description: err?.message, variant: "destructive" }) }
                  );
                }
                setDeleteGroupTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
