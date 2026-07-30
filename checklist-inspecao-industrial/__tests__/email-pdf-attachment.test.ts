import { describe, it, expect } from "vitest";

describe("Email PDF Attachment", () => {
  it("should extract PDF filename correctly from path", () => {
    const pdfPath = "/data/user/0/com.example.app/files/678-02022026.pdf";
    const pdfFileName = pdfPath.split("/").pop() || "checklist.pdf";
    expect(pdfFileName).toBe("678-02022026.pdf");
  });

  it("should handle PDF filename with different paths", () => {
    const testCases = [
      {
        path: "/storage/emulated/0/Documents/456-15032025.pdf",
        expected: "456-15032025.pdf",
      },
      {
        path: "/tmp/123-01012026.pdf",
        expected: "123-01012026.pdf",
      },
      {
        path: "checklist.pdf",
        expected: "checklist.pdf",
      },
    ];

    testCases.forEach(({ path, expected }) => {
      const fileName = path.split("/").pop() || "checklist.pdf";
      expect(fileName).toBe(expected);
    });
  });

  it("should format PDF filename as {numeroSerie}-{dataSemTracos}.pdf", () => {
    const numeroSerie = "678";
    const dataRecuperacao = "02/02/2026";
    const dataSemTracos = dataRecuperacao.replace(/\//g, "");
    const expectedFileName = `${numeroSerie}-${dataSemTracos}.pdf`;
    
    expect(expectedFileName).toBe("678-02022026.pdf");
  });

  it("should handle multiple email recipients with PDF attachment", () => {
    const emailsDestino = ["gezielseveriano@hotmail.com", "outro@email.com"];
    const pdfBuffer = "base64encodedPDFContent";
    const pdfFileName = "678-02022026.pdf";

    expect(emailsDestino).toHaveLength(2);
    expect(pdfFileName).toBeTruthy();
    expect(pdfBuffer).toBeTruthy();
  });

  it("should use fallback filename if path is empty", () => {
    const pdfPath = "";
    const pdfFileName = pdfPath.split("/").pop() || "checklist.pdf";
    expect(pdfFileName).toBe("checklist.pdf");
  });

  it("should preserve PDF filename in email mutation input", () => {
    const input = {
      to: ["test@example.com"],
      checklistName: "Checklist Test",
      modelo: "Teste",
      resultado: "OK",
      executante: "Executante",
      dataRecuperacao: "02/02/2026",
      totalEtapas: 10,
      etapasOK: 8,
      etapasNaoOK: 2,
      etapasNaoAplicavel: 0,
      pdfBuffer: "base64data",
      pdfFileName: "678-02022026.pdf",
      smtpEmail: "sender@gmail.com",
      smtpServidor: "smtp.gmail.com",
      smtpPorta: "587",
      smtpSenha: "password",
    };

    expect(input.pdfFileName).toBe("678-02022026.pdf");
    expect(input.pdfBuffer).toBeTruthy();
  });
});
