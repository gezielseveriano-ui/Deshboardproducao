import { describe, it, expect } from "vitest";
import { CHECKLISTS_CONFIG, ChecklistType } from "../lib/checklist-configs";

describe("PDF Dynamic Titles", () => {
  const checklistTypes: ChecklistType[] = [
    "CL-ENG-1029",
    "CL-ENG-1030",
    "CL-ENG-1031",
    "CL-ENG-1032",
    "CL-ENG-1033",
    "CL-ENG-1034",
    "CL-ENG-1035",
    "CL-ENG-1036",
  ];

  checklistTypes.forEach((type) => {
    it(`should have correct title for ${type}`, () => {
      const config = CHECKLISTS_CONFIG[type];
      expect(config).toBeDefined();
      expect(config.titulo).toBeDefined();
      // Barba é parte legítima do título para CL-ENG-1029
      expect(config.codigo).toBe(type);
      expect(config.versao).toBeDefined();
      expect(config.validadeAte).toBeDefined();
    });

    it(`should have correct codigo/versao format for ${type}`, () => {
      const config = CHECKLISTS_CONFIG[type];
      const expectedFormat = `${config.codigo}/${config.versao}`;
      expect(expectedFormat).toMatch(/^CL-ENG-\d{4}\/\d{2}\.\d{2}$/);
    });
  });

  it("should have unique titles for each checklist", () => {
    const titles = checklistTypes.map((type) => CHECKLISTS_CONFIG[type].titulo);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it("should have all expected titles", () => {
    const expectedTitles = {
      "CL-ENG-1029": "Inspeção da Lateral do Truque Barba",
      "CL-ENG-1030": "Inspeção da Lateral do Truque Swing Motion",
      "CL-ENG-1031": "Inspeção da Lateral do Truque Ride Control",
      "CL-ENG-1032": "Inspeção da Lateral do Truque Ride Master, Motion Control, Híbrido",
      "CL-ENG-1033": "Inspeção da Travessa do Truque Ride Master, Motion Control",
      "CL-ENG-1034": "Inspeção da Travessa do Truque Barber",
      "CL-ENG-1035": "Inspeção da Travessa do Truque Ride Control",
      "CL-ENG-1036": "Inspeção da Travessa do Truque Swing Motion",
    };

    checklistTypes.forEach((type) => {
      const config = CHECKLISTS_CONFIG[type];
      expect(config.titulo).toBe(expectedTitles[type]);
    });
  });
});
