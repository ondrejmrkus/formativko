import {
  Pencil, Camera, TrendingUp, Mic, FileText, Image, MessageCircle,
  CheckCircle, Star, BookOpen, Lightbulb, Clipboard, Eye, Hand,
  Zap, Heart, Flag, Award, Volume2, Puzzle,
} from "lucide-react";

// --- Field kinds ---

export type ProofFieldKind = "text" | "image" | "level" | "audio" | "none";

export const FIELD_LABELS: Record<ProofFieldKind, string> = {
  text: "Textová poznámka",
  image: "Fotka / soubor",
  level: "Úroveň (cíl + kritéria)",
  audio: "Zvuková nahrávka",
  none: "Okamžité zachycení",
};

// --- Color palette ---

export const PROOF_TYPE_COLORS = {
  blue:    { dot: "bg-blue-400",    ring: "ring-blue-300 border-blue-300 bg-blue-50 dark:bg-blue-950/30",       text: "text-blue-400" },
  emerald: { dot: "bg-emerald-400", ring: "ring-emerald-300 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-400" },
  amber:   { dot: "bg-amber-400",   ring: "ring-amber-300 border-amber-300 bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-400" },
  rose:    { dot: "bg-rose-400",    ring: "ring-rose-300 border-rose-300 bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-400" },
  violet:  { dot: "bg-violet-400",  ring: "ring-violet-300 border-violet-300 bg-violet-50 dark:bg-violet-950/30", text: "text-violet-400" },
  cyan:    { dot: "bg-cyan-400",    ring: "ring-cyan-300 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30",       text: "text-cyan-400" },
  orange:  { dot: "bg-orange-400",  ring: "ring-orange-300 border-orange-300 bg-orange-50 dark:bg-orange-950/30", text: "text-orange-400" },
  pink:    { dot: "bg-pink-400",    ring: "ring-pink-300 border-pink-300 bg-pink-50 dark:bg-pink-950/30",       text: "text-pink-400" },
  teal:    { dot: "bg-teal-400",    ring: "ring-teal-300 border-teal-300 bg-teal-50 dark:bg-teal-950/30",       text: "text-teal-400" },
  slate:   { dot: "bg-slate-400",   ring: "ring-slate-300 border-slate-300 bg-slate-50 dark:bg-slate-950/30",   text: "text-slate-400" },
} as const;

export type ProofTypeColor = keyof typeof PROOF_TYPE_COLORS;

export const COLOR_KEYS = Object.keys(PROOF_TYPE_COLORS) as ProofTypeColor[];

// --- Icon map ---

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "pencil": Pencil,
  "camera": Camera,
  "trending-up": TrendingUp,
  "mic": Mic,
  "file-text": FileText,
  "image": Image,
  "message-circle": MessageCircle,
  "check-circle": CheckCircle,
  "star": Star,
  "book-open": BookOpen,
  "lightbulb": Lightbulb,
  "clipboard": Clipboard,
  "eye": Eye,
  "hand": Hand,
  "zap": Zap,
  "heart": Heart,
  "flag": Flag,
  "award": Award,
  "volume-2": Volume2,
  "puzzle": Puzzle,
};

export const ICON_KEYS = Object.keys(ICON_MAP);

// --- Types ---

export interface ProofTypeRow {
  id: string;
  teacher_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  fields: ProofFieldKind[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  builtin?: boolean;
}

// --- Built-in proof types (not stored in DB, always present, not editable) ---

export const BUILTIN_PROOF_TYPES: ProofTypeRow[] = [
  { id: "__builtin_note",     teacher_id: "", name: "Poznámka", description: "Textová poznámka zachycující pozorování učitele o práci žáka.", icon: "pencil",      color: "blue",    fields: ["text"],  sort_order: -3, created_at: "", updated_at: "", builtin: true },
  { id: "__builtin_level",    teacher_id: "", name: "Úroveň",   description: "Záznam dosažené úrovně žáka podle kritérií vzdělávacího cíle.", icon: "trending-up", color: "emerald", fields: ["level"], sort_order: -2, created_at: "", updated_at: "", builtin: true },
  { id: "__builtin_photo",    teacher_id: "", name: "Foto",      description: "Fotografie práce žáka jako vizuální důkaz učení.",              icon: "camera",      color: "amber",   fields: ["image"], sort_order: -1, created_at: "", updated_at: "", builtin: true },
];
