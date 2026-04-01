import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
import {
  PROOF_TYPE_COLORS,
  ICON_MAP,
  ICON_KEYS,
  COLOR_KEYS,
  FIELD_LABELS,
  BUILTIN_PROOF_TYPES,
  type ProofTypeColor,
  type ProofFieldKind,
  type ProofTypeRow,
} from "@/constants/proofTypes";
import {
  useCreateProofType,
  useUpdateProofType,
  useDeleteProofType,
  useReorderProofTypes,
} from "@/hooks/useProofTypes";
import { useToast } from "@/hooks/use-toast";

interface ProofTypeManagerProps {
  proofTypes: ProofTypeRow[];
  onClose: () => void;
}

export default function ProofTypeManager({ proofTypes, onClose }: ProofTypeManagerProps) {
  const { toast } = useToast();
  const createType = useCreateProofType();
  const updateType = useUpdateProofType();
  const deleteType = useDeleteProofType();
  const reorder = useReorderProofTypes();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState<ProofTypeColor>("blue");
  const [editFields, setEditFields] = useState<ProofFieldKind[]>(["text"]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const startEdit = (pt: ProofTypeRow) => {
    setEditingId(pt.id);
    setEditName(pt.name);
    setEditDescription(pt.description || "");
    setEditIcon(pt.icon);
    setEditColor(pt.color as ProofTypeColor);
    setEditFields(pt.fields as ProofFieldKind[]);
    setShowIconPicker(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowIconPicker(false);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateType.mutateAsync({
        id: editingId,
        name: editName.trim(),
        description: editDescription.trim(),
        icon: editIcon,
        color: editColor,
        fields: editFields,
      });
      setEditingId(null);
    } catch (err) {
      console.error("Chyba při ukládání", err);
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const handleAdd = async () => {
    const nextOrder = proofTypes.length;
    try {
      const created = await createType.mutateAsync({
        name: "Nový typ",
        icon: "pencil",
        color: "slate",
        fields: ["text"],
        sort_order: nextOrder,
      });
      startEdit(created);
    } catch (err: any) {
      console.error("Create proof type error:", err);
      toast({ title: "Chyba při vytváření", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat tento typ důkazu?")) return;
    try {
      await deleteType.mutateAsync(id);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      console.error("Chyba při mazání", err);
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= proofTypes.length) return;
    const items = proofTypes.map((pt, i) => ({
      id: pt.id,
      sort_order: i === index ? newIndex : i === newIndex ? index : i,
    }));
    await reorder.mutateAsync(items);
  };

  const toggleField = (field: ProofFieldKind) => {
    if (field === "none") {
      setEditFields(["none"]);
      return;
    }
    const without = editFields.filter((f) => f !== "none");
    if (without.includes(field)) {
      const next = without.filter((f) => f !== field);
      setEditFields(next.length === 0 ? ["none"] : next);
    } else {
      setEditFields([...without, field]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Typy důkazů</h3>
        <button onClick={onClose} className="p-1 hover:bg-accent rounded">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {/* Built-in types (read-only) */}
        {BUILTIN_PROOF_TYPES.map((pt) => {
          const Icon = ICON_MAP[pt.icon] || ICON_MAP["pencil"];
          const colors = PROOF_TYPE_COLORS[pt.color as ProofTypeColor] || PROOF_TYPE_COLORS.slate;
          return (
            <div
              key={pt.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-border opacity-60"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${colors.text}`} />
              </div>
              <span className="text-sm font-medium text-foreground flex-1 truncate">
                {pt.name}
              </span>
              <span className="text-[10px] text-muted-foreground">výchozí</span>
            </div>
          );
        })}

        {proofTypes.length > 0 && (
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider pt-2">Vlastní typy</div>
        )}

        {/* Custom types (editable) */}
        {proofTypes.map((pt, index) => {
          const Icon = ICON_MAP[pt.icon] || ICON_MAP["pencil"];
          const colors = PROOF_TYPE_COLORS[pt.color as ProofTypeColor] || PROOF_TYPE_COLORS.slate;
          const isEditing = editingId === pt.id;

          if (isEditing) {
            const EditIcon = ICON_MAP[editIcon] || ICON_MAP["pencil"];
            const editColors = PROOF_TYPE_COLORS[editColor] || PROOF_TYPE_COLORS.slate;

            return (
              <div key={pt.id} className="border border-primary/30 rounded-xl p-3 space-y-3 bg-primary/5">
                {/* Name */}
                <Input
                  className="h-8 text-sm"
                  placeholder="Název"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />

                {/* Description (význam) */}
                <Textarea
                  className="min-h-[56px] text-xs bg-background"
                  placeholder="Význam — popište, co tento typ důkazu znamená a jak se má interpretovat..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />

                {/* Icon + Color row */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Ikona a barva</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center ${editColors.ring} ring-2`}
                    >
                      <EditIcon className={`h-5 w-5 ${editColors.text}`} />
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_KEYS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full transition-all ${PROOF_TYPE_COLORS[c].dot} ${
                            editColor === c ? "ring-2 ring-offset-1 ring-foreground/30 scale-110" : "hover:scale-110"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {showIconPicker && (
                    <div className="grid grid-cols-5 gap-1.5 p-2 border border-border rounded-lg bg-background">
                      {ICON_KEYS.map((key) => {
                        const I = ICON_MAP[key];
                        return (
                          <button
                            key={key}
                            onClick={() => { setEditIcon(key); setShowIconPicker(false); }}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                              editIcon === key
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "hover:bg-accent"
                            }`}
                          >
                            <I className="h-4 w-4 text-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Co sbírat</span>
                  {(["text", "image", "level", "audio", "none"] as ProofFieldKind[]).map((field) => (
                    <label key={field} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFields.includes(field)}
                        onChange={() => toggleField(field)}
                        className="rounded border-border"
                      />
                      <span className="text-xs text-foreground">{FIELD_LABELS[field]}</span>
                    </label>
                  ))}
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={saveEdit} disabled={updateType.isPending}>
                    <Check className="h-3 w-3 mr-1" />
                    Uložit
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEdit}>
                    Zrušit
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={pt.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/20 transition-colors group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.dot}/20`}>
                <Icon className={`h-4 w-4 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">
                  {pt.name}
                </span>
                {pt.description && (
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{pt.description}</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleMove(index, -1)}
                  className="p-1 hover:bg-accent rounded"
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  className="p-1 hover:bg-accent rounded"
                  disabled={index === proofTypes.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => startEdit(pt)} className="p-1 hover:bg-accent rounded">
                  <span className="text-xs text-muted-foreground">Upravit</span>
                </button>
                <button
                  onClick={() => handleDelete(pt.id)}
                  className="p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border mt-3 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1"
          onClick={handleAdd}
          disabled={createType.isPending}
        >
          <Plus className="h-4 w-4" />
          Přidat typ důkazu
        </Button>
        <Button size="sm" className="w-full" onClick={onClose}>
          Hotovo
        </Button>
      </div>
    </div>
  );
}
