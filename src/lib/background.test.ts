import { describe, expect, it, vi } from "vitest";

import { runAfterResponse } from "@/lib/background";

describe("runAfterResponse", () => {
  it("executa la tasca de forma asíncrona sense fallar fora del context de petició", async () => {
    let executed = false;
    const task = vi.fn(() => {
      executed = true;
    });

    runAfterResponse(task);

    // Dins l'entorn de test (fora de Next.js request context), s'ha d'executar a la cua de promeses
    await Promise.resolve();

    expect(task).toHaveBeenCalled();
    expect(executed).toBe(true);
  });

  it("atrapa errors llançats dins la tasca sense tombar el procés", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failingTask = () => {
      throw new Error("Error simulat");
    };

    runAfterResponse(failingTask);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
