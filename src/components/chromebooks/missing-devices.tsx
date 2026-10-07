import { missingDevicesLines, type MissingDevice } from "@/lib/device-reservations";
import { cn } from "@/lib/utils";

/**
 * Els equips que no seran al carro, en vermell: quins són i qui els té, una
 * línia per persona. A la graella les caselles són estretes: la línia es talla
 * i sencera surt en passar-hi el ratolí.
 */
export function MissingDevices({ devices, className }: { devices: MissingDevice[]; className?: string }) {
  if (devices.length === 0) return null;
  return (
    <span className={cn("block text-red-700", className)}>
      {missingDevicesLines(devices).map((line) => (
        <span key={line} title={`Falta ${line}`} className="block truncate">
          {line}
        </span>
      ))}
    </span>
  );
}
