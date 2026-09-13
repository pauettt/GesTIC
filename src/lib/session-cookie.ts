// Noms de la cookie de sessió d'Auth.js: porta el prefix `__Secure-` quan
// l'aplicació va per HTTPS (producció) i no el porta en local.
export const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];
