import { describe, it, expect } from "vitest";
import { LESSON_STATUS_LABELS, LESSON_STATUS_COLORS } from "./lessonStatus";

describe("lessonStatus constants", () => {
  it("has labels for all statuses", () => {
    expect(LESSON_STATUS_LABELS.prepared).toBe("Připravená");
    expect(LESSON_STATUS_LABELS.ongoing).toBe("Probíhající");
    expect(LESSON_STATUS_LABELS.past).toBe("Proběhlá");
  });

  it("has colors for all statuses", () => {
    expect(LESSON_STATUS_COLORS.prepared).toContain("bg-blue");
    expect(LESSON_STATUS_COLORS.ongoing).toContain("bg-green");
    expect(LESSON_STATUS_COLORS.past).toContain("bg-muted");
  });
});
