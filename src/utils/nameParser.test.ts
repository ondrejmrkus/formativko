import { describe, it, expect } from "vitest";
import { parseNamesFromText, isTextFile } from "./nameParser";

describe("parseNamesFromText", () => {
  it("parses comma-separated names", () => {
    const result = parseNamesFromText("Jan, Novák\nPetra, Svobodová");
    expect(result).toEqual([
      { first: "Jan", last: "Novák" },
      { first: "Petra", last: "Svobodová" },
    ]);
  });

  it("parses space-separated names", () => {
    const result = parseNamesFromText("Jan Novák\nPetra Svobodová");
    expect(result).toEqual([
      { first: "Jan", last: "Novák" },
      { first: "Petra", last: "Svobodová" },
    ]);
  });

  it("parses tab-separated names", () => {
    const result = parseNamesFromText("Jan\tNovák\nPetra\tSvobodová");
    expect(result).toEqual([
      { first: "Jan", last: "Novák" },
      { first: "Petra", last: "Svobodová" },
    ]);
  });

  it("handles multi-word first names", () => {
    const result = parseNamesFromText("Jan Pavel Novák");
    expect(result).toEqual([{ first: "Jan Pavel", last: "Novák" }]);
  });

  it("handles single word as first name with empty last", () => {
    const result = parseNamesFromText("Jan");
    expect(result).toEqual([{ first: "Jan", last: "" }]);
  });

  it("skips empty lines", () => {
    const result = parseNamesFromText("Jan Novák\n\n\nPetra Svobodová");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(parseNamesFromText("")).toEqual([]);
    expect(parseNamesFromText("  \n  ")).toEqual([]);
  });

  it("handles semicolon separator", () => {
    const result = parseNamesFromText("Jan; Novák");
    expect(result).toEqual([{ first: "Jan", last: "Novák" }]);
  });

  it("trims whitespace from names", () => {
    const result = parseNamesFromText("  Jan ,  Novák  ");
    expect(result).toEqual([{ first: "Jan", last: "Novák" }]);
  });
});

describe("isTextFile", () => {
  it("returns true for text/* MIME types", () => {
    const file = new File([""], "test.csv", { type: "text/csv" });
    expect(isTextFile(file)).toBe(true);
  });

  it("returns true for .csv extension", () => {
    const file = new File([""], "data.csv", { type: "application/octet-stream" });
    expect(isTextFile(file)).toBe(true);
  });

  it("returns true for .txt extension", () => {
    const file = new File([""], "names.txt", { type: "" });
    expect(isTextFile(file)).toBe(true);
  });

  it("returns true for .tsv extension", () => {
    const file = new File([""], "data.tsv", { type: "" });
    expect(isTextFile(file)).toBe(true);
  });

  it("returns false for image files", () => {
    const file = new File([""], "photo.jpg", { type: "image/jpeg" });
    expect(isTextFile(file)).toBe(false);
  });

  it("returns false for PDF files", () => {
    const file = new File([""], "doc.pdf", { type: "application/pdf" });
    expect(isTextFile(file)).toBe(false);
  });
});
