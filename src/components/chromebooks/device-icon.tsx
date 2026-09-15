import { LaptopIcon, MonitorSmartphoneIcon, TabletIcon } from "lucide-react";
import type { DeviceType } from "@prisma/client";

/** La icona de cada tipus d'equip, perquè a la graella es distingeixin d'un cop d'ull. */
export function DeviceIcon({ type, className }: { type: DeviceType; className?: string }) {
  if (type === "IPAD" || type === "TAULETA") return <TabletIcon className={className} />;
  if (type === "ALTRE") return <MonitorSmartphoneIcon className={className} />;
  return <LaptopIcon className={className} />;
}
