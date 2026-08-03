import { describe, it, expect } from "vitest";
import { CHECKLISTS_CONFIG, ChecklistType } from "../lib/checklist-configs";

describe("PDF Dynamic Procedures (Procedimento de Origem)", () => {
  const checklistProcedures: Record<ChecklistType, string> = {
    "CL-ENG-1029": "POP-ENG-1088",
    "CL-ENG-1030": "POP-ENG-1092",
    "CL-ENG-1031": "POP-ENG-1090",
    "CL-ENG-1032": "POP-ENG-1091",
    "CL-ENG-1033": "POP-ENG-1091",
    "CL-ENG-1034": "POP-ENG-1088",
    "CL-ENG-1035": "POP-ENG-1090",
    "CL-ENG-1036": "POP-ENG-1092",
  };

  Object.entries(checklistProcedures).forEach(([type, expectedProcedure]) => {
    it(`should have correct procedure for ${type}`, () => {
      const config = CHECKLISTS_CONFIG[type as ChecklistType];
      expect(config).toBeDefined();
      expect(config.procedimentoOrigem).toBe(expectedProcedure);
    });
  });

  it("should have all procedures defined", () => {
    const types: ChecklistType[] = [
      "CL-ENG-1029",
      "CL-ENG-1030",
      "CL-ENG-1031",
      "CL-ENG-1032",
      "CL-ENG-1033",
      "CL-ENG-1034",
      "CL-ENG-1035",
      "CL-ENG-1036",
    ];

    types.forEach((type) => {
      const config = CHECKLISTS_CONFIG[type];
      expect(config.procedimentoOrigem).toBeDefined();
      expect(config.procedimentoOrigem).toMatch(/^POP-ENG-\d{4}$/);
    });
  });

  it("should have correct procedure format", () => {
    const types: ChecklistType[] = [
      "CL-ENG-1029",
      "CL-ENG-1030",
      "CL-ENG-1031",
      "CL-ENG-1032",
      "CL-ENG-1033",
      "CL-ENG-1034",
      "CL-ENG-1035",
      "CL-ENG-1036",
    ];

    types.forEach((type) => {
      const config = CHECKLISTS_CONFIG[type];
      expect(config.procedimentoOrigem).toMatch(/^POP-ENG-\d{4}$/);
    });
  });

  it("should allow repeated procedures (lateral and travessa share same procedure)", () => {
    // CL-ENG-1029 (Barba) and CL-ENG-1034 (Travessa Barber) both use POP-ENG-1088
    const barba = CHECKLISTS_CONFIG["CL-ENG-1029"];
    const travessaBarber = CHECKLISTS_CONFIG["CL-ENG-1034"];
    expect(barba.procedimentoOrigem).toBe(travessaBarber.procedimentoOrigem);
    expect(barba.procedimentoOrigem).toBe("POP-ENG-1088");
  });
});
