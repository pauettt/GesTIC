import { z } from "zod";

/** La fallada més nova que s'ha vist: les que arribin després no es donen per revisades. */
export const dismissEmailFailuresSchema = z.object({ upToId: z.string().min(1) });
