import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, recordEmailFailure } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  recordEmailFailure: vi.fn(),
}));

vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));
vi.mock("@/lib/email-failures", () => ({ recordEmailFailure }));

// La configuració del correu es llegeix en carregar el mòdul.
vi.stubEnv("SMTP_USER", "gestic@iesjmthomas.eu");
vi.stubEnv("SMTP_PASSWORD", "contrasenya-d-aplicacio");
const { sendEmail } = await import("@/lib/email");

const message = { subject: "Nova incidència (alta): Projector", text: "…", html: "<p>…</p>" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendEmail", () => {
  it("un correu que surt no deixa cap rastre de fallada", async () => {
    sendMail.mockResolvedValue({});
    expect(await sendEmail({ to: "professor@iesjmthomas.eu", ...message })).toEqual({ sent: true });
    expect(recordEmailFailure).not.toHaveBeenCalled();
  });

  it("un correu que no surt queda apuntat, sense les adreces", async () => {
    sendMail.mockRejectedValue(new Error("Invalid login: 535-5.7.8 Username and Password not accepted"));
    const result = await sendEmail({ to: ["a@iesjmthomas.eu", "b@iesjmthomas.eu"], ...message });

    expect(result).toEqual({ sent: false, reason: "Invalid login: 535-5.7.8 Username and Password not accepted" });
    expect(recordEmailFailure).toHaveBeenCalledWith({
      subject: message.subject,
      recipients: 2,
      reason: "Invalid login: 535-5.7.8 Username and Password not accepted",
    });
  });

  it("les adreces de prova no s'envien ni compten com a fallada", async () => {
    expect(await sendEmail({ to: "professor.prova@local.test", ...message })).toEqual({
      sent: false,
      reason: "Cap destinatari amb adreça real",
    });
    expect(sendMail).not.toHaveBeenCalled();
    expect(recordEmailFailure).not.toHaveBeenCalled();
  });
});
