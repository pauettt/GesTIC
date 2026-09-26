import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireAdmin, revalidatePath } = vi.hoisted(() => ({
  db: { emailFailure: { findUnique: vi.fn(), deleteMany: vi.fn() } },
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { dismissEmailFailures } from "@/actions/email-failures";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("dismissEmailFailures", () => {
  it("només la coordinació", async () => {
    const denied = new Error("NEXT_REDIRECT");
    requireAdmin.mockRejectedValue(denied);
    await expect(dismissEmailFailures({ upToId: "f-1" })).rejects.toBe(denied);
    expect(db.emailFailure.deleteMany).not.toHaveBeenCalled();
  });

  it("treu les que s'han vist, no les que han arribat després", async () => {
    const seenAt = new Date("2026-09-28T07:05:00Z");
    db.emailFailure.findUnique.mockResolvedValue({ createdAt: seenAt });

    expect(await dismissEmailFailures({ upToId: "f-1" })).toEqual({ success: true });
    expect(db.emailFailure.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lte: seenAt } } });
  });

  it("si algú altre ja les ha tretes, no toca res", async () => {
    db.emailFailure.findUnique.mockResolvedValue(null);
    expect(await dismissEmailFailures({ upToId: "f-1" })).toEqual({ success: true });
    expect(db.emailFailure.deleteMany).not.toHaveBeenCalled();
  });
});
