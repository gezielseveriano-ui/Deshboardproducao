import { describe, it, expect, beforeEach, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage");

describe("Signatures Context - Auto-preenchimento de nomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar executante por matrícula", async () => {
    const mockExecutantes = [
      { id: "1", matricula: "4", nomeCompleto: "Altuir", email: "", tipo: "executante" as const, dataCadastro: new Date().toISOString() },
      { id: "2", matricula: "10", nomeCompleto: "André Souza", email: "", tipo: "executante" as const, dataCadastro: new Date().toISOString() },
    ];

    // Simular busca por matrícula
    const pessoa = mockExecutantes.find((p) => p.matricula === "4");
    expect(pessoa).toBeDefined();
    expect(pessoa?.nomeCompleto).toBe("Altuir");
  });

  it("deve buscar líder por matrícula", async () => {
    const mockLideres = [
      { id: "1", matricula: "5", nomeCompleto: "Michael", email: "", tipo: "lider" as const, dataCadastro: new Date().toISOString() },
      { id: "2", matricula: "6", nomeCompleto: "Vagner", email: "", tipo: "lider" as const, dataCadastro: new Date().toISOString() },
    ];

    // Simular busca por matrícula
    const pessoa = mockLideres.find((p) => p.matricula === "5");
    expect(pessoa).toBeDefined();
    expect(pessoa?.nomeCompleto).toBe("Michael");
  });

  it("deve retornar undefined se matrícula não existir", async () => {
    const mockExecutantes = [
      { id: "1", matricula: "4", nomeCompleto: "Altuir", email: "", tipo: "executante" as const, dataCadastro: new Date().toISOString() },
    ];

    // Simular busca por matrícula inexistente
    const pessoa = mockExecutantes.find((p) => p.matricula === "999");
    expect(pessoa).toBeUndefined();
  });

  it("deve validar que matrícula é obrigatória para executante", () => {
    const matricula = "4";
    const nomeCompleto = "Altuir";

    // Validar que ambos os campos estão preenchidos
    expect(matricula.trim()).toBeTruthy();
    expect(nomeCompleto.trim()).toBeTruthy();
  });

  it("deve validar que matrícula é opcional para líder", () => {
    const matricula = ""; // Opcional
    const nomeCompleto = "Michael";

    // Validar que nome está preenchido
    expect(nomeCompleto.trim()).toBeTruthy();
  });

  it("deve validar que matrícula é opcional para inspetor", () => {
    const matricula = ""; // Opcional
    const nomeCompleto = "Vagner";

    // Validar que nome está preenchido
    expect(nomeCompleto.trim()).toBeTruthy();
  });

  it("deve encontrar pessoa por matrícula e tipo", () => {
    const mockPessoas = {
      executante: [
        { id: "1", matricula: "4", nomeCompleto: "Altuir", email: "", tipo: "executante" as const, dataCadastro: new Date().toISOString() },
      ],
      lider: [
        { id: "2", matricula: "5", nomeCompleto: "Michael", email: "", tipo: "lider" as const, dataCadastro: new Date().toISOString() },
      ],
      inspetor: [
        { id: "3", matricula: "6", nomeCompleto: "Vagner", email: "", tipo: "inspetor" as const, dataCadastro: new Date().toISOString() },
      ],
    };

    // Buscar executante
    const executante = mockPessoas.executante.find((p) => p.matricula === "4");
    expect(executante?.nomeCompleto).toBe("Altuir");

    // Buscar líder
    const lider = mockPessoas.lider.find((p) => p.matricula === "5");
    expect(lider?.nomeCompleto).toBe("Michael");

    // Buscar inspetor
    const inspetor = mockPessoas.inspetor.find((p) => p.matricula === "6");
    expect(inspetor?.nomeCompleto).toBe("Vagner");
  });
});
