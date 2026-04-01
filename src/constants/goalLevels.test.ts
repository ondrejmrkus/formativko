import { describe, it, expect } from "vitest";
import { getLevelColor } from "./goalLevels";

describe("getLevelColor", () => {
  it("returns neutral style for unknown level", () => {
    expect(getLevelColor("unknown", ["A", "B"])).toContain("bg-muted");
  });

  it("returns green for single level", () => {
    expect(getLevelColor("A", ["A"])).toContain("bg-green");
  });

  it("returns red/green for two levels", () => {
    const levels = ["Low", "High"];
    expect(getLevelColor("Low", levels)).toContain("bg-red");
    expect(getLevelColor("High", levels)).toContain("bg-green");
  });

  it("returns red/yellow/green for three levels", () => {
    const levels = ["Začínám", "Rozvíjím se", "Ovládám"];
    expect(getLevelColor("Začínám", levels)).toContain("bg-red");
    expect(getLevelColor("Rozvíjím se", levels)).toContain("bg-yellow");
    expect(getLevelColor("Ovládám", levels)).toContain("bg-green");
  });

  it("handles 4+ levels with orange", () => {
    const levels = ["L1", "L2", "L3", "L4"];
    expect(getLevelColor("L1", levels)).toContain("bg-red");
    expect(getLevelColor("L4", levels)).toContain("bg-green");
  });
});
