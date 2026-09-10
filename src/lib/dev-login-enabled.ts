/**
 * El dev login crea una sessió vàlida sense contrasenya: si mai s'activés en
 * producció, qualsevol podria entrar com a administrador. Per això demana DUES
 * condicions independents, no una:
 *
 *  1. que no sigui una compilació de producció, i
 *  2. que algú hagi posat explícitament ENABLE_DEV_LOGIN="true".
 *
 * Amb dos panys, una variable d'entorn mal configurada no n'obre cap.
 */
export function isDevLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "true";
}
