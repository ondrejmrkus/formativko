import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Trash2, Users, Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useClasses, useClassStudents, useUpdateClass, useDeleteClass } from "@/hooks/useClasses";
import { useStudentGroups, useCreateStudentGroup, useUpdateStudentGroup, useDeleteStudentGroup } from "@/hooks/useStudentGroups";
import { StudentPicker } from "@/components/shared/StudentPicker";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function A04EditClass() {
  usePageTitle("Upravit třídu");
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: allStudents = [] } = useStudents();
  const { data: classes = [] } = useClasses();
  const { data: classStudents = [] } = useClassStudents(classId);
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const [className, setClassName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Quick Groups
  const { data: groups = [] } = useStudentGroups(classId);
  const createGroup = useCreateStudentGroup();
  const updateGroup = useUpdateStudentGroup();
  const deleteGroup = useDeleteStudentGroup();
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupMembers, setEditGroupMembers] = useState<string[]>([]);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ id: string; name: string } | null>(null);

  const currentClass = classes.find((c) => c.id === classId);

  useEffect(() => {
    if (!initialized && currentClass && classStudents) {
      setClassName(currentClass.name);
      setSelectedStudentIds(classStudents.map((s: any) => s.id));
      setInitialized(true);
    }
  }, [currentClass, classStudents, initialized]);

  const addStudent = (id: string) => {
    setSelectedStudentIds((prev) => [...prev, id]);
  };

  const removeStudent = (id: string) => {
    setSelectedStudentIds((prev) => prev.filter((s) => s !== id));
  };

  const handleSave = async () => {
    if (!className.trim()) {
      toast({ title: "Zadejte název třídy", variant: "destructive" });
      return;
    }
    if (!classId) return;
    try {
      await updateClass.mutateAsync({ classId, name: className.trim(), studentIds: selectedStudentIds });
      toast({ title: `Třída "${className}" uložena` });
      navigate("/classes");
    } catch (err) {
      console.error("Chyba při ukládání třídy", err);
      toast({ title: "Chyba při ukládání třídy", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!classId) return;
    try {
      await deleteClass.mutateAsync(classId);
      toast({ title: "Třída smazána" });
      navigate("/classes");
    } catch (err) {
      console.error("Chyba při mazání třídy", err);
      toast({ title: "Chyba při mazání třídy", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Třídy", href: "/classes" },
            { label: currentClass?.name || "Upravit třídu" },
          ]}
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Upravit třídu</h1>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-2 hover:bg-destructive/10 rounded-lg" title="Smazat třídu">
                <Trash2 className="h-5 w-5 text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Smazat třídu?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tím smažete třídu „{currentClass?.name}". Žáci nebudou smazáni, jen odpojeni od třídy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Smazat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mb-6">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Název třídy</label>
          <Input placeholder="např. 6.A" value={className} onChange={(e) => setClassName(e.target.value)} className="bg-card max-w-xs" />
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Žáci ve třídě</label>
          <div className="mb-3">
            <StudentPicker
              allStudents={allStudents}
              selectedStudentIds={selectedStudentIds}
              onAdd={addStudent}
              onRemove={removeStudent}
              addLabel="Přidat žáka"
            />
          </div>
        </div>

        {/* Quick Groups */}
        <div className="mb-6">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
            Skupiny žáků
          </label>

          {groups.length === 0 && !newGroupName && (
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border mb-3">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">Zatím žádné skupiny.</p>
              <p className="text-xs mt-1">Skupiny můžete vytvořit zde nebo přímo v zachytávači.</p>
            </div>
          )}

          <div className="space-y-2 mb-3">
            {groups.map((group) => {
              const isEditing = editingGroupId === group.id;
              return (
                <div key={group.id} className="p-3 rounded-xl bg-card border border-border">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-8 text-sm flex-1"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-8 px-2"
                          disabled={!editGroupName.trim() || updateGroup.isPending}
                          onClick={() => {
                            updateGroup.mutate(
                              { groupId: group.id, classId: classId!, name: editGroupName.trim(), memberIds: editGroupMembers },
                              {
                                onSuccess: () => setEditingGroupId(null),
                                onError: (e: any) => toast({ title: "Chyba při ukládání skupiny", description: e?.message, variant: "destructive" }),
                              }
                            );
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <button
                          onClick={() => setEditingGroupId(null)}
                          className="p-1.5 hover:bg-accent rounded"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedStudentIds.map((sid) => {
                          const s = allStudents.find((st) => st.id === sid);
                          if (!s) return null;
                          const isMember = editGroupMembers.includes(sid);
                          return (
                            <button
                              key={sid}
                              onClick={() => setEditGroupMembers((prev) =>
                                isMember ? prev.filter((id) => id !== sid) : [...prev, sid]
                              )}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                isMember
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {getStudentDisplayName(s)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-foreground">{group.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {group.member_ids.length} {group.member_ids.length === 1 ? "žák" : group.member_ids.length < 5 ? "žáci" : "žáků"}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {group.member_ids.map((sid) => {
                            const s = allStudents.find((st) => st.id === sid);
                            if (!s) return null;
                            return (
                              <span key={sid} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {getStudentDisplayName(s)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => {
                            setEditingGroupId(group.id);
                            setEditGroupName(group.name);
                            setEditGroupMembers([...group.member_ids]);
                          }}
                          className="p-1.5 hover:bg-accent rounded"
                          title="Upravit skupinu"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteGroupTarget({ id: group.id, name: group.name })}
                          className="p-1.5 hover:bg-destructive/10 rounded"
                          title="Smazat skupinu"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new group */}
          <div className="flex items-center gap-2">
            <Input
              className="h-8 text-sm flex-1"
              placeholder="Název nové skupiny"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newGroupName.trim() && classId) {
                  createGroup.mutate(
                    { classId, name: newGroupName.trim(), memberIds: [] },
                    {
                      onSuccess: (group) => {
                        setNewGroupName("");
                        setEditingGroupId(group.id);
                        setEditGroupName(newGroupName.trim());
                        setEditGroupMembers([]);
                      },
                      onError: (e: any) => toast({ title: "Chyba při vytváření skupiny", description: e?.message, variant: "destructive" }),
                    },
                  );
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={!newGroupName.trim() || createGroup.isPending}
              onClick={() => {
                if (!classId) return;
                createGroup.mutate(
                  { classId, name: newGroupName.trim(), memberIds: [] },
                  {
                    onSuccess: (group) => {
                      setNewGroupName("");
                      setEditingGroupId(group.id);
                      setEditGroupName(newGroupName.trim());
                      setEditGroupMembers([]);
                    },
                    onError: (e: any) => toast({ title: "Chyba při vytváření skupiny", description: e?.message, variant: "destructive" }),
                  },
                );
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Přidat
            </Button>
          </div>
        </div>

        {/* Delete group confirmation */}
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
                  if (deleteGroupTarget && classId) {
                    deleteGroup.mutate({ groupId: deleteGroupTarget.id, classId });
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

        <Button className="w-full" size="lg" onClick={handleSave} disabled={updateClass.isPending}>
          {updateClass.isPending ? "Ukládání…" : "Uložit změny"}
        </Button>
      </div>
    </AppLayout>
  );
}
