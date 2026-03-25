export const COMMUNICATION_OPTIONS = [
  { value: "ustni", label: "Preferuje ústní komunikaci" },
  { value: "pisemna", label: "Preferuje písemnou komunikaci" },
  { value: "vizualni", label: "Reaguje lépe na vizuální podklady" },
  { value: "vice_casu", label: "Potřebuje více času na odpověď" },
  { value: "individualni", label: "Preferuje individuální rozhovor" },
] as const;

export const LEARNING_STYLE_OPTIONS = [
  { value: "vizualni", label: "Vizuální" },
  { value: "sluchovy", label: "Sluchový" },
  { value: "kinesteticky", label: "Kinestetický" },
  { value: "cteni_psani", label: "Čtení/psaní" },
  { value: "skupinova", label: "Skupinová práce" },
  { value: "samostatna", label: "Samostatná práce" },
] as const;

export function parseCommaSeparated(value: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function toCommaSeparated(values: string[]): string {
  return values.filter(Boolean).join(",");
}

export function getOptionLabels(
  values: string[],
  options: readonly { value: string; label: string }[]
): string[] {
  return values.map((v) => options.find((o) => o.value === v)?.label || v);
}
