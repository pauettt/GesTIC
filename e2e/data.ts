/**
 * Textos de les dades de prova que les proves busquen a la pantalla. Van a part
 * de `fixtures.ts` perquè les proves no carreguin Prisma només per llegir-los.
 */

export const USERS = {
  superAdmin: { email: "superadmin@e2e.test", name: "Superadmin E2E", role: "SUPER_ADMIN", isTutor: false },
  admin: { email: "coordinacio@e2e.test", name: "Coordinadora E2E", role: "ADMIN", isTutor: false },
  professor: { email: "professor@e2e.test", name: "Professor Un", role: "PROFESSOR", isTutor: false },
  professor2: { email: "professora2@e2e.test", name: "Professora Dos", role: "PROFESSOR", isTutor: false },
  tutor: { email: "tutora@e2e.test", name: "Tutora E2E", role: "PROFESSOR", isTutor: true },
  concierge: { email: "consergeria@e2e.test", name: "Consergeria E2E", role: "CONSERGERIA", isTutor: false },
  // Algú que deixa el centre: s'hi prova que retirar l'accés tanca la sessió.
  leaver: { email: "substituta@e2e.test", name: "Substituta E2E", role: "PROFESSOR", isTutor: false },
} as const;

export type UserKey = keyof typeof USERS;

/** Cita que la Professora Dos té demanada la setmana vinent. */
export const FOREIGN_APPOINTMENT_PURPOSE = "Revisar el compte de Classroom de 2n B";

/** Incidència de la Professora Dos que el Professor Un no ha de poder veure. */
export const PRIVATE_INCIDENT_TITLE = "Incidència privada de la Professora Dos";

/** Incidència d'un compte del dev login: l'esborrat de dades de prova se l'ha d'endur. */
export const DEV_ACCOUNT_INCIDENT_TITLE = "Incidència d'un compte de prova";

/**
 * Vídeos dels tutorials, cadascun a la seva categoria. Els identificadors tenen
 * la forma dels de YouTube però no existeixen: les proves no surten a internet.
 */
export const TUTORIAL_VIDEOS = [
  { youtubeId: "e2eClassr01", title: "Crear una classe a Classroom", category: "Classroom" },
  { youtubeId: "e2eChromeb1", title: "Iniciar sessió al Chromebook", category: "Chromebooks" },
] as const;

/** Identificadors que crea cada execució i que les proves necessiten. */
export type Fixtures = {
  cartId: string;
  cartChromebooks: Record<"E2E-01" | "E2E-02" | "E2E-03" | "E2E-04", string>;
  poolChromebooks: Record<"ALU-01" | "ALU-02", string>;
  privateIncidentId: string;
  /** Dilluns de la setmana vinent, "YYYY-MM-DD": les graelles s'hi obren amb `?week=`. */
  nextWeek: string;
};
