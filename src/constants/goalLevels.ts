export interface LevelDescriptor {
  level: string;
  description: string;
}

export const DEFAULT_LEVEL_DESCRIPTORS: LevelDescriptor[] = [
  { level: "Začínám", description: "" },
  { level: "Rozvíjím se", description: "" },
  { level: "Ovládám", description: "" },
];

/**
 * Returns Tailwind classes for a level based on its index in the ordered level list.
 * Index 0 = lowest (red), last = highest (green), middle = yellow/orange.
 * Returns neutral style if level is not found.
 */
export function getLevelColor(level: string, levelNames: string[]): string {
  const idx = levelNames.indexOf(level);
  if (idx < 0) return "bg-muted text-muted-foreground border-border";
  const len = levelNames.length;
  if (len <= 1) return "bg-green-100 text-green-700 border-green-200";
  if (len === 2)
    return idx === 0
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-green-100 text-green-700 border-green-200";
  if (len === 3) {
    if (idx === 0) return "bg-red-100 text-red-700 border-red-200";
    if (idx === 1) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-green-100 text-green-700 border-green-200";
  }
  // 4+ levels: red, orange, yellow, green
  if (idx === 0) return "bg-red-100 text-red-700 border-red-200";
  if (idx === len - 1) return "bg-green-100 text-green-700 border-green-200";
  if (idx <= len / 3) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-yellow-100 text-yellow-700 border-yellow-200";
}
