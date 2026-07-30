import { describe, it, expect } from "vitest";
import { CompletedChecklistRecord } from "../lib/reports-types";

describe("Histórico - Dados Iniciais", () => {
  it("deve salvar número de série no histórico", () => {
    const record: CompletedChecklistRecord = {
      id: "test-1",
      checklistCode: "CL-ENG-1030",
      checklistName: "Lateral Swing Motion",
      categoria: "Lateral",
      modelo: "Lateral Swing Motion 7x12",
      resultado: "OK",
      executanteName: "Alex",
      executanteMatricula: "10",
      dataRecuperacao: "23/02/2026",
      dataFabricacao: "01/02/2026",
      numeroSerie: "456",
      numeroOP: "677",
      timestamp: Date.now(),
      pdfFileName: "456-23022026.pdf",
    };

    expect(record.numeroSerie).toBe("456");
    expect(record.numeroSerie).not.toBeUndefined();
  });

  it("deve salvar número de OP no histórico", () => {
    const record: CompletedChecklistRecord = {
      id: "test-1",
      checklistCode: "CL-ENG-1030",
      checklistName: "Lateral Swing Motion",
      categoria: "Lateral",
      modelo: "Lateral Swing Motion 7x12",
      resultado: "OK",
      executanteName: "Alex",
      executanteMatricula: "10",
      dataRecuperacao: "23/02/2026",
      dataFabricacao: "01/02/2026",
      numeroSerie: "456",
      numeroOP: "677",
      timestamp: Date.now(),
      pdfFileName: "456-23022026.pdf",
    };

    expect(record.numeroOP).toBe("677");
    expect(record.numeroOP).not.toBeUndefined();
  });

  it("deve salvar data de fabricação no histórico", () => {
    const record: CompletedChecklistRecord = {
      id: "test-1",
      checklistCode: "CL-ENG-1030",
      checklistName: "Lateral Swing Motion",
      categoria: "Lateral",
      modelo: "Lateral Swing Motion 7x12",
      resultado: "OK",
      executanteName: "Alex",
      executanteMatricula: "10",
      dataRecuperacao: "23/02/2026",
      dataFabricacao: "01/02/2026",
      numeroSerie: "456",
      numeroOP: "677",
      timestamp: Date.now(),
      pdfFileName: "456-23022026.pdf",
    };

    expect(record.dataFabricacao).toBe("01/02/2026");
    expect(record.dataFabricacao).not.toBeUndefined();
  });

  it("deve permitir valores vazios para dados opcionais", () => {
    const record: CompletedChecklistRecord = {
      id: "test-1",
      checklistCode: "CL-ENG-1030",
      checklistName: "Lateral Swing Motion",
      categoria: "Lateral",
      modelo: "Lateral Swing Motion 7x12",
      resultado: "OK",
      executanteName: "Alex",
      executanteMatricula: "10",
      dataRecuperacao: "23/02/2026",
      dataFabricacao: "",
      numeroSerie: "",
      numeroOP: "",
      timestamp: Date.now(),
      pdfFileName: "456-23022026.pdf",
    };

    expect(record.numeroSerie).toBe("");
    expect(record.numeroOP).toBe("");
    expect(record.dataFabricacao).toBe("");
  });
});
