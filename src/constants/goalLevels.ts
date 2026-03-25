export interface LevelDescriptor {
  level: string;
  description: string;
}

export const DEFAULT_LEVEL_DESCRIPTORS: LevelDescriptor[] = [
  { level: "Začínám", description: "" },
  { level: "Rozvíjím se", description: "" },
  { level: "Ovládám", description: "" },
];
