import { describe, it, expect } from "vitest";
import { getStudentDisplayName, getStudentShortName } from "./student";

describe("getStudentDisplayName", () => {
  it("returns first name + last initial", () => {
    expect(getStudentDisplayName({ first_name: "Jan", last_name: "Novák" }))
      .toBe("Jan N.");
  });

  it("returns just first name when last name is empty", () => {
    expect(getStudentDisplayName({ first_name: "Jan", last_name: "" }))
      .toBe("Jan");
  });
});

describe("getStudentShortName", () => {
  it("returns first name + last initial", () => {
    expect(getStudentShortName({ first_name: "Petra", last_name: "Svobodová" }))
      .toBe("Petra S.");
  });

  it("handles empty last name", () => {
    expect(getStudentShortName({ first_name: "Petra", last_name: "" }))
      .toBe("Petra .");
  });
});
