import { describe, it, expect } from "vitest";
import { CHECKLISTS_CONFIG, getChecklistConfig, ChecklistType } from "../lib/checklist-configs";

describe("Checklist Configs - Etapas", () => {
  it("deve ter 8 checklists configurados", () => {
    const keys = Object.keys(CHECKLISTS_CONFIG);
    expect(keys.length).toBe(8);
  });

  it("CL-ENG-1029 deve ter etapas", () => {
    const config = getChecklistConfig("CL-ENG-1029");
    expect(config.etapas.length).toBeGreaterThan(0);
  });

  it("etapas de CL-ENG-1029 devem ter sistema, subsistema, atividade e resultadoEsperado", () => {
    const config = getChecklistConfig("CL-ENG-1029");
    for (const etapa of config.etapas) {
      expect(etapa.numero).toBeGreaterThan(0);
      expect(etapa.sistema).toBeTruthy();
      expect(etapa.subsistema).toBeTruthy();
      expect(etapa.atividade).toBeTruthy();
      expect(etapa.resultadoEsperado).toBeTruthy();
      expect(Array.isArray(etapa.medidas)).toBe(true);
    }
  });

  it("CL-ENG-1029 deve ter 15 etapas", () => {
    const config = getChecklistConfig("CL-ENG-1029");
    expect(config.etapas.length).toBe(15);
  });

  it("CL-ENG-1029 etapa 1 deve ter dados corretos", () => {
    const config = getChecklistConfig("CL-ENG-1029");
    const etapa1 = config.etapas[0];
    expect(etapa1.numero).toBe(1);
    expect(etapa1.sistema).toBe("Laterais");
    expect(etapa1.subsistema).toContain("Orelhas do Pedestal");
    expect(etapa1.atividade).toContain("calibre");
    expect(etapa1.resultadoEsperado).toContain("passa");
  });

  it("CL-ENG-1029 deve ter 15 etapas (Lateral Barba)", () => {
    const config = getChecklistConfig("CL-ENG-1029");
    expect(config.etapas.length).toBe(15);
    expect(config.categoria).toBe("Lateral");
  });

  it("outros checklists laterais devem ter etapas quando populados", () => {
    const laterais: ChecklistType[] = ["CL-ENG-1030", "CL-ENG-1031", "CL-ENG-1032"];
    for (const codigo of laterais) {
      const config = getChecklistConfig(codigo);
      expect(config.categoria).toBe("Lateral");
      // Etapas serão populadas quando dados forem enviados
    }
  });

  it("checklists travessas devem ter etapas quando populados", () => {
    const travessas: ChecklistType[] = ["CL-ENG-1033", "CL-ENG-1034", "CL-ENG-1035", "CL-ENG-1036"];
    for (const codigo of travessas) {
      const config = getChecklistConfig(codigo);
      expect(config.categoria).toBe("Travessa");
      // Etapas serão populadas quando dados forem enviados
    }
  });

  it("getChecklistConfig deve retornar a configuração correta", () => {
    const config = getChecklistConfig("CL-ENG-1029");
    expect(config.codigo).toBe("CL-ENG-1029");
    expect(config.titulo).toContain("Barba");
    expect(config.modelos.length).toBeGreaterThan(0);
    expect(config.validadeAte).toBeTruthy();
  });

  it("cada etapa deve ter medidas como array", () => {
    for (const [_, config] of Object.entries(CHECKLISTS_CONFIG)) {
      for (const etapa of config.etapas) {
        expect(Array.isArray(etapa.medidas)).toBe(true);
        for (const medida of etapa.medidas) {
          expect(medida.label).toBeTruthy();
          expect(medida.unidade).toBeTruthy();
        }
      }
    }
  });
});
