import { describe, it, expect } from "vitest";
import { CHECKLISTS_CONFIG } from "../lib/checklist-configs";

describe("PDF Dates - Dynamic Data Validation", () => {
  it("should have correct emission dates for all checklists", () => {
    const expectedDates = {
      "CL-ENG-1029": "25/06/2024",
      "CL-ENG-1030": "25/06/2024",
      "CL-ENG-1031": "25/06/2024",
      "CL-ENG-1032": "25/06/2024",
      "CL-ENG-1033": "12/08/2024",
      "CL-ENG-1034": "12/08/2024",
      "CL-ENG-1035": "12/08/2024",
      "CL-ENG-1036": "12/08/2024",
    };

    Object.entries(expectedDates).forEach(([code, expectedDate]) => {
      const config = CHECKLISTS_CONFIG[code as keyof typeof CHECKLISTS_CONFIG];
      expect(config.dataEmissao).toBe(expectedDate);
    });
  });

  it("CL-ENG-1029 should have emission date 25/06/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1029"];
    expect(config.dataEmissao).toBe("25/06/2024");
  });

  it("CL-ENG-1030 should have emission date 25/06/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1030"];
    expect(config.dataEmissao).toBe("25/06/2024");
  });

  it("CL-ENG-1031 should have emission date 25/06/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1031"];
    expect(config.dataEmissao).toBe("25/06/2024");
  });

  it("CL-ENG-1032 should have emission date 25/06/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1032"];
    expect(config.dataEmissao).toBe("25/06/2024");
  });

  it("CL-ENG-1033 should have emission date 12/08/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1033"];
    expect(config.dataEmissao).toBe("12/08/2024");
  });

  it("CL-ENG-1034 should have emission date 12/08/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1034"];
    expect(config.dataEmissao).toBe("12/08/2024");
  });

  it("CL-ENG-1035 should have emission date 12/08/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1035"];
    expect(config.dataEmissao).toBe("12/08/2024");
  });

  it("CL-ENG-1036 should have emission date 12/08/2024", () => {
    const config = CHECKLISTS_CONFIG["CL-ENG-1036"];
    expect(config.dataEmissao).toBe("12/08/2024");
  });

  it("all checklists should have dataEmissao field", () => {
    Object.values(CHECKLISTS_CONFIG).forEach((config) => {
      expect(config.dataEmissao).toBeDefined();
      expect(typeof config.dataEmissao).toBe("string");
      expect(config.dataEmissao).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  it("lateral checklists (1029-1032) should have 25/06/2024", () => {
    const lateralCodes = ["CL-ENG-1029", "CL-ENG-1030", "CL-ENG-1031", "CL-ENG-1032"];
    lateralCodes.forEach((code) => {
      const config = CHECKLISTS_CONFIG[code as keyof typeof CHECKLISTS_CONFIG];
      expect(config.dataEmissao).toBe("25/06/2024");
      expect(config.categoria).toBe("Lateral");
    });
  });

  it("travessa checklists (1033-1036) should have 12/08/2024", () => {
    const travessaCodes = ["CL-ENG-1033", "CL-ENG-1034", "CL-ENG-1035", "CL-ENG-1036"];
    travessaCodes.forEach((code) => {
      const config = CHECKLISTS_CONFIG[code as keyof typeof CHECKLISTS_CONFIG];
      expect(config.dataEmissao).toBe("12/08/2024");
      expect(config.categoria).toBe("Travessa");
    });
  });
});
