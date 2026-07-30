import { describe, it, expect } from "vitest";

describe("SMTP Configuration", () => {
  it("should have SMTP_EMAIL environment variable", () => {
    expect(process.env.SMTP_EMAIL).toBeDefined();
    expect(process.env.SMTP_EMAIL).toBe("gezielseveriano@gmail.com");
  });

  it("should have SMTP_PASSWORD environment variable", () => {
    expect(process.env.SMTP_PASSWORD).toBeDefined();
    expect(process.env.SMTP_PASSWORD).toHaveLength(16);
  });

  it("should have SMTP_SERVER environment variable", () => {
    expect(process.env.SMTP_SERVER).toBeDefined();
    expect(process.env.SMTP_SERVER).toBe("smtp.gmail.com");
  });

  it("should have SMTP_PORT environment variable", () => {
    expect(process.env.SMTP_PORT).toBeDefined();
    expect(process.env.SMTP_PORT).toBe("587");
  });

  it("should have valid SMTP configuration", () => {
    const smtpConfig = {
      email: process.env.SMTP_EMAIL,
      password: process.env.SMTP_PASSWORD,
      server: process.env.SMTP_SERVER,
      port: parseInt(process.env.SMTP_PORT || "587"),
    };

    expect(smtpConfig.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(smtpConfig.password).toHaveLength(16);
    expect(smtpConfig.server).toBe("smtp.gmail.com");
    expect(smtpConfig.port).toBe(587);
  });
});
