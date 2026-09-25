import { after } from "next/server";

/**
 * Executa una tasca asíncrona (com ara enviaments de correu o notificacions)
 * després que la resposta HTTP s'hagi enviat al navegador de l'usuari.
 *
 * A Next.js (App Router / Server Actions), `after()` permet desacoblar els sockets
 * TCP de SMTP de la resposta de l'usuari, fent que la interfície respongui a l'instant.
 *
 * Si s'executa fora del context d'una petició HTTP (com ara en proves unitàries de Vitest),
 * atrapa l'error de context i executa la tasca asíncronament via microtasca sense bloquejar.
 */
export function runAfterResponse(task: () => Promise<void> | void): void {
  try {
    after(task);
  } catch {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        console.error("[background] error en tasca asíncrona:", error);
      });
  }
}
