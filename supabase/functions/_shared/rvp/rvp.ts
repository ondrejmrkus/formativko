const rvp1Stupen = await Deno.readTextFile(
  new URL("./rvp-1-stupen.md", import.meta.url),
);

const rvp2Stupen = await Deno.readTextFile(
  new URL("./rvp-2-stupen.md", import.meta.url),
);

/**
 * Determine school stage from className string.
 * Matches patterns like "1. třída", "5.A", "3. ročník", "9.B", etc.
 * Returns 1 for 1.-5. ročník, 2 for 6.-9. ročník, or null if unknown.
 */
function detectStage(className?: string): 1 | 2 | null {
  if (!className) return null;
  const match = className.match(/(\d+)/);
  if (!match) return null;
  const grade = parseInt(match[1], 10);
  if (grade >= 1 && grade <= 5) return 1;
  if (grade >= 6 && grade <= 9) return 2;
  return null;
}

/**
 * Get the RVP reference text for the given class/grade.
 * If the stage can't be determined, returns both documents.
 */
export function getRvpContext(className?: string): string {
  const stage = detectStage(className);

  if (stage === 1) {
    return `\n\n--- REFERENČNÍ DOKUMENT: RVP ZV 2025 (1. stupeň) ---\n${rvp1Stupen}`;
  }
  if (stage === 2) {
    return `\n\n--- REFERENČNÍ DOKUMENT: RVP ZV 2025 (2. stupeň) ---\n${rvp2Stupen}`;
  }

  // Unknown stage — include both
  return `\n\n--- REFERENČNÍ DOKUMENT: RVP ZV 2025 (1. stupeň) ---\n${rvp1Stupen}\n\n--- REFERENČNÍ DOKUMENT: RVP ZV 2025 (2. stupeň) ---\n${rvp2Stupen}`;
}
