import { describe, it, expect, beforeEach } from "vitest";
import { getChecklistConfig } from "../checklist-configs";

describe("Checklist Context - Multiple Checklists Flow", () => {
  it("should create different checklists for different checklistTypes", () => {
    // Simular o fluxo: Barba -> Swing Motion
    const barbConfig = getChecklistConfig("CL-ENG-1029");
    const swingConfig = getChecklistConfig("CL-ENG-1030");

    // Verificar que cada checklist tem o numero correto de etapas
    expect(barbConfig.etapas.length).toBe(15); // Barba tem 15 etapas
    expect(swingConfig.etapas.length).toBe(6); // Swing Motion tem 6 etapas

    // Ambas comecam com etapa 1, mas tem subsistema diferente
    expect(barbConfig.etapas[0].subsistema).not.toBe(swingConfig.etapas[0].subsistema);
  });

  it("should have correct models for each checklist type", () => {
    const barbConfig = getChecklistConfig("CL-ENG-1029");
    const swingConfig = getChecklistConfig("CL-ENG-1030");

    // Barba tem modelos
    expect(barbConfig.modelos.length).toBeGreaterThan(0);
    expect(barbConfig.modelos[0]).toContain("Barber");

    // Swing Motion tem modelos
    expect(swingConfig.modelos.length).toBeGreaterThan(0);
    expect(swingConfig.modelos[0]).toContain("Swing Motion");

    // Modelos sao diferentes
    expect(barbConfig.modelos[0]).not.toBe(swingConfig.modelos[0]);
  });

  it("should have etapa numbers starting from 1 for each checklist", () => {
    const barbConfig = getChecklistConfig("CL-ENG-1029");
    const swingConfig = getChecklistConfig("CL-ENG-1030");

    // Barba etapas comecam em 1
    expect(barbConfig.etapas[0].numero).toBe(1);
    expect(barbConfig.etapas[1].numero).toBe(2);

    // Swing Motion etapas tambem comecam em 1
    expect(swingConfig.etapas[0].numero).toBe(1);
    expect(swingConfig.etapas[1].numero).toBe(2);
  });

  it("should have different subsistemas for different checklists", () => {
    const barbConfig = getChecklistConfig("CL-ENG-1029");
    const swingConfig = getChecklistConfig("CL-ENG-1030");

    // Barba etapa 1 deve ter subsistema
    const barbEtapa1 = barbConfig.etapas[0];
    expect(barbEtapa1.subsistema).toBeTruthy();

    // Swing Motion etapa 1 deve ter subsistema
    const swingEtapa1 = swingConfig.etapas[0];
    expect(swingEtapa1.subsistema).toBeTruthy();

    // Os subsistemas devem ser diferentes
    expect(barbEtapa1.subsistema).not.toBe(swingEtapa1.subsistema);
  });

  it("should verify all 8 checklists have correct structure", () => {
    const checklistTypes = [
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
      const config = getChecklistConfig(type as any);

      // Cada checklist deve ter etapas
      expect(config.etapas.length).toBeGreaterThan(0);

      // Cada checklist deve ter modelos
      expect(config.modelos.length).toBeGreaterThan(0);

      // Cada etapa deve ter numero unico
      const numeros = config.etapas.map((e) => e.numero);
      expect(new Set(numeros).size).toBe(numeros.length);

      // Cada etapa deve ter sistema, subsistema, atividade
      config.etapas.forEach((etapa) => {
        expect(etapa.sistema).toBeTruthy();
        expect(etapa.subsistema).toBeTruthy();
        expect(etapa.atividade).toBeTruthy();
        expect(etapa.resultadoEsperado).toBeTruthy();
      });
    });
  });
});
