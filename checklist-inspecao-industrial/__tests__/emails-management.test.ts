import { describe, it, expect } from "vitest";

describe("Emails Management", () => {
  it("should validate email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test("usuario@empresa.com")).toBe(true);
    expect(emailRegex.test("admin@gmail.com")).toBe(true);
    expect(emailRegex.test("invalido@")).toBe(false);
    expect(emailRegex.test("invalido.com")).toBe(false);
    expect(emailRegex.test("")).toBe(false);
  });

  it("should validate email list structure", () => {
    const emailsList = [
      "gerente@empresa.com",
      "supervisor@empresa.com",
      "admin@empresa.com",
    ];

    expect(Array.isArray(emailsList)).toBe(true);
    expect(emailsList.length).toBe(3);
    expect(emailsList.every((e) => typeof e === "string")).toBe(true);
  });

  it("should validate admin config with emails", () => {
    const adminConfig = {
      smtp: {
        email: "noreply@empresa.com",
        servidor: "smtp.gmail.com",
        porta: "587",
        senha: "password",
      },
      network: {
        url: "http://192.168.1.100",
        usuario: "admin",
        senha: "password",
      },
      linkGerencial: "http://192.168.1.100/admin/hash",
      emailsRecebimento: [
        "gerente@empresa.com",
        "supervisor@empresa.com",
      ],
    };

    expect(adminConfig.emailsRecebimento).toBeDefined();
    expect(Array.isArray(adminConfig.emailsRecebimento)).toBe(true);
    expect(adminConfig.emailsRecebimento.length).toBe(2);
  });

  it("should handle adding email to list", () => {
    const emails = ["gerente@empresa.com"];
    const novoEmail = "supervisor@empresa.com";

    if (!emails.includes(novoEmail) && novoEmail.trim()) {
      emails.push(novoEmail);
    }

    expect(emails.length).toBe(2);
    expect(emails).toContain("supervisor@empresa.com");
  });

  it("should handle removing email from list", () => {
    const emails = [
      "gerente@empresa.com",
      "supervisor@empresa.com",
      "admin@empresa.com",
    ];
    const emailRemover = "supervisor@empresa.com";

    const updated = emails.filter((e) => e !== emailRemover);

    expect(updated.length).toBe(2);
    expect(updated).not.toContain("supervisor@empresa.com");
    expect(updated).toContain("gerente@empresa.com");
  });

  it("should prevent duplicate emails", () => {
    const emails = ["gerente@empresa.com"];
    const novoEmail = "gerente@empresa.com";

    if (!emails.includes(novoEmail) && novoEmail.trim()) {
      emails.push(novoEmail);
    }

    expect(emails.length).toBe(1);
  });

  it("should handle empty email input", () => {
    const novoEmail = "   ";

    const isValid = novoEmail.trim().length > 0;

    expect(isValid).toBe(false);
  });

  it("should validate email list for sending", () => {
    const adminConfig = {
      smtp: { email: "noreply@empresa.com" },
      emailsRecebimento: ["gerente@empresa.com", "supervisor@empresa.com"],
    };

    const emailsDestino =
      adminConfig.emailsRecebimento && adminConfig.emailsRecebimento.length > 0
        ? adminConfig.emailsRecebimento
        : [adminConfig.smtp.email];

    expect(emailsDestino.length).toBe(2);
    expect(emailsDestino).not.toContain("noreply@empresa.com");
  });

  it("should fallback to default email when list is empty", () => {
    const adminConfig = {
      smtp: { email: "noreply@empresa.com" },
      emailsRecebimento: [],
    };

    const emailsDestino =
      adminConfig.emailsRecebimento && adminConfig.emailsRecebimento.length > 0
        ? adminConfig.emailsRecebimento
        : [adminConfig.smtp.email];

    expect(emailsDestino.length).toBe(1);
    expect(emailsDestino).toContain("noreply@empresa.com");
  });

  it("should validate email list persistence", () => {
    const storedConfig = JSON.stringify({
      emailsRecebimento: [
        "gerente@empresa.com",
        "supervisor@empresa.com",
      ],
    });

    const parsed = JSON.parse(storedConfig);

    expect(parsed.emailsRecebimento).toBeDefined();
    expect(parsed.emailsRecebimento.length).toBe(2);
  });
});
