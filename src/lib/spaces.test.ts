import { describe, expect, it } from "vitest";

import { spaceName } from "@/lib/spaces";

describe("spaceName", () => {
  it("posa el número oficial davant i el nom darrere", () => {
    expect(spaceName({ number: "A.004", roomName: "Rosalia" })).toBe("A.004 · Rosalia");
  });

  it("un espai sense número es diu pel nom, i una aula sense nom pel número", () => {
    expect(spaceName({ number: null, roomName: "Consergeria" })).toBe("Consergeria");
    expect(spaceName({ number: "A.105", roomName: "" })).toBe("A.105");
  });

  it("no repeteix el número si el nom és el mateix, i retalla els espais", () => {
    expect(spaceName({ number: " A.004 ", roomName: "a.004" })).toBe("A.004");
    expect(spaceName({ number: "  ", roomName: " Rosalia " })).toBe("Rosalia");
  });
});
