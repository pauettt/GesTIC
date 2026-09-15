import { z } from "zod";

export const upsertCredentialCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom").max(100),
  order: z.string().optional().or(z.literal("")),
});

export const deleteCredentialCategorySchema = z.object({ id: z.string() });

export const reorderCredentialCategorySchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});

/** Buit, o una adreça web: res de `javascript:` en un enllaç que es clica. */
export function isWebUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value);
}

export const upsertCredentialSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Selecciona una categoria"),
  name: z.string().trim().min(1, "Indica de què és").max(150),
  username: z.string().trim().max(200),
  // Sense retallar: un espai al principi o al final pot ser part de la contrasenya.
  password: z.string().max(500),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || isWebUrl(value), "L'enllaç ha de començar per http:// o https://"),
  notes: z.string().trim().max(2000),
  superAdminOnly: z.boolean(),
});
export type UpsertCredentialInput = z.infer<typeof upsertCredentialSchema>;

export const deleteCredentialSchema = z.object({ id: z.string() });

/** Per a què es demana la contrasenya: és el que queda escrit al registre. */
export const revealCredentialSchema = z.object({
  id: z.string(),
  purpose: z.enum(["view", "copy", "edit"]),
});

export const importCredentialsSchema = z.object({
  credentials: z
    .array(
      z.object({
        category: z.string().trim().min(1).max(100),
        name: z.string().trim().min(1).max(150),
        username: z.string().trim().max(200),
        password: z.string().max(500),
        url: z.string().trim().max(500),
        notes: z.string().trim().max(2000),
        superAdminOnly: z.boolean(),
      }),
    )
    .min(1, "No hi ha cap contrasenya per importar")
    .max(1000, "Com a molt 1.000 contrasenyes per importació"),
});
export type ImportCredentialsInput = z.infer<typeof importCredentialsSchema>;
