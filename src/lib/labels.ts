import {
  KeyboardIcon,
  MonitorIcon,
  MousePointer2Icon,
  PowerIcon,
  WifiIcon,
  CircleHelpIcon,
  type LucideIcon,
} from "lucide-react";
import type {
  ChromebookStatus,
  StudentDeviceReason,
  StudentDeviceRequestStatus,
  GoogleService,
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
  IncidentTargetType,
  InventoryItemStatus,
  LoanRequestStatus,
  QueryStatus,
  ReservationStatus,
  Role,
} from "@prisma/client";

export const inventoryItemStatusLabels: Record<InventoryItemStatus, string> = {
  ACTIU: "Actiu",
  EN_REPARACIO: "En reparació",
  BAIXA: "Donat de baixa",
};

export const chromebookStatusLabels: Record<ChromebookStatus, string> = {
  DISPONIBLE: "Disponible",
  RESERVAT: "Reservat",
  ASSIGNAT: "Assignat a alumnat",
  EN_INCIDENCIA: "En incidència",
  BAIXA: "Donat de baixa",
};

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  CONFIRMADA: "Confirmada",
  CANCELLADA: "Cancel·lada",
  COMPLETADA: "Completada",
};

export const incidentTargetTypeLabels: Record<IncidentTargetType, string> = {
  INVENTORY_ITEM: "Equip d'inventari",
  CHROMEBOOK: "Chromebook",
  CART: "Carro de Chromebooks",
  GOOGLE_WORKSPACE: "Entorn Google",
  GENERAL: "Altre / espai general",
};

// L'ordre d'aquest mapa és el que veu el professorat al desplegable: davant, el
// que es reporta més sovint; "Un altre servei" sempre al final.
export const googleServiceLabels: Record<GoogleService, string> = {
  CLASSROOM: "Classroom",
  COMPTE: "Compte i accés (contrasenya, no puc entrar)",
  GMAIL: "Correu (Gmail)",
  DRIVE: "Drive i documents",
  MEET: "Meet",
  CALENDAR: "Calendar",
  YOUTUBE: "YouTube",
  CHROME: "Chrome i navegador",
  ALTRE: "Un altre servei de Google",
};

export const incidentPriorityLabels: Record<IncidentPriority, string> = {
  BAIXA: "Baixa",
  MITJANA: "Mitjana",
  ALTA: "Alta",
};

export const incidentCategoryLabels: Record<IncidentCategory, string> = {
  PANTALLA: "Pantalla",
  TECLAT: "Teclat",
  TOUCHPAD: "Touchpad",
  WIFI_INTERNET: "Sense Wi-Fi / Internet",
  NO_S_ENCEN: "No s'engega",
  ALTRE: "Altre problema",
};

export const incidentCategoryIcons: Record<IncidentCategory, LucideIcon> = {
  PANTALLA: MonitorIcon,
  TECLAT: KeyboardIcon,
  TOUCHPAD: MousePointer2Icon,
  WIFI_INTERNET: WifiIcon,
  NO_S_ENCEN: PowerIcon,
  ALTRE: CircleHelpIcon,
};

// Categories que bloquegen completament l'ús del Chromebook: prioritat alta per defecte.
export const incidentCategoryDefaultPriority: Record<IncidentCategory, IncidentPriority> = {
  PANTALLA: "MITJANA",
  TECLAT: "MITJANA",
  TOUCHPAD: "BAIXA",
  WIFI_INTERNET: "ALTA",
  NO_S_ENCEN: "ALTA",
  ALTRE: "MITJANA",
};

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  OBERTA: "Oberta",
  EN_CURS: "En curs",
  RESOLTA: "Resolta",
  TANCADA: "Tancada",
};

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Administrador/a",
  ADMIN: "Coordinador/a TIC",
  CONSERGERIA: "Consergeria",
  PROFESSOR: "Professorat",
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const incidentStatusVariants: Record<IncidentStatus, BadgeVariant> = {
  OBERTA: "destructive",
  EN_CURS: "default",
  RESOLTA: "secondary",
  TANCADA: "outline",
};

export const incidentPriorityVariants: Record<IncidentPriority, BadgeVariant> = {
  ALTA: "destructive",
  MITJANA: "default",
  BAIXA: "secondary",
};

export const inventoryItemStatusVariants: Record<InventoryItemStatus, BadgeVariant> = {
  ACTIU: "secondary",
  EN_REPARACIO: "default",
  BAIXA: "outline",
};

export const chromebookStatusVariants: Record<ChromebookStatus, BadgeVariant> = {
  DISPONIBLE: "secondary",
  RESERVAT: "default",
  // Comparteix variant amb RESERVAT perquè tots dos volen dir "ocupat" i no
  // surten mai a la mateixa llista: RESERVAT és d'equips de carro i ASSIGNAT
  // del pool de préstec.
  ASSIGNAT: "default",
  EN_INCIDENCIA: "destructive",
  BAIXA: "outline",
};

// Colors per a la graella visual de Chromebooks (un quadrat per Chromebook).
export const chromebookStatusSquareClasses: Record<ChromebookStatus, string> = {
  DISPONIBLE: "border-green-400 bg-green-100 text-green-800 hover:bg-green-200",
  RESERVAT: "border-blue-400 bg-blue-100 text-blue-800 hover:bg-blue-200",
  ASSIGNAT: "border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200",
  EN_INCIDENCIA: "border-red-400 bg-red-100 text-red-800 hover:bg-red-200",
  BAIXA: "border-slate-300 bg-slate-100 text-slate-500 opacity-70 hover:opacity-100",
};

export const queryStatusLabels: Record<QueryStatus, string> = {
  OBERTA: "Oberta",
  EN_CURS: "En curs",
  RESOLTA: "Resolta",
  TANCADA: "Tancada",
};

export const queryStatusVariants: Record<QueryStatus, BadgeVariant> = {
  OBERTA: "destructive",
  EN_CURS: "default",
  RESOLTA: "secondary",
  TANCADA: "outline",
};

export const loanRequestStatusLabels: Record<LoanRequestStatus, string> = {
  PENDENT: "Pendent",
  APROVADA: "Aprovada",
  REBUTJADA: "Rebutjada",
  RETORNADA: "Retornada",
  CANCELLADA: "Cancel·lada",
};

// L'ordre és el que veu el tutor al desplegable: primer el cas més habitual i
// "Un altre motiu" sempre al final, com al desplegable de serveis de Google.
export const studentDeviceReasonLabels: Record<StudentDeviceReason, string> = {
  SENSE_DISPOSITIU: "No té cap dispositiu a casa",
  DISPOSITIU_AVARIAT: "El dispositiu que tenia s'ha espatllat",
  NECESSITAT_EDUCATIVA: "Necessitat educativa específica",
  ALTRE: "Un altre motiu",
};

export const studentDeviceRequestStatusLabels: Record<StudentDeviceRequestStatus, string> = {
  PENDENT: "Pendent",
  APROVADA: "Aprovada",
  REBUTJADA: "Rebutjada",
  RETORNADA: "Retornada",
  CANCELLADA: "Cancel·lada",
};

export const studentDeviceRequestStatusVariants: Record<
  StudentDeviceRequestStatus,
  BadgeVariant
> = {
  PENDENT: "default",
  APROVADA: "secondary",
  REBUTJADA: "destructive",
  RETORNADA: "outline",
  CANCELLADA: "outline",
};

export const loanRequestStatusVariants: Record<LoanRequestStatus, BadgeVariant> = {
  PENDENT: "default",
  APROVADA: "secondary",
  REBUTJADA: "destructive",
  RETORNADA: "outline",
  CANCELLADA: "outline",
};
