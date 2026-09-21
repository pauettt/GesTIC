/**
 * Adreces IPv4 de l'equipament del centre. Les IP es desen normalitzades
 * («10.1.2.3», sense zeros davant) perquè dues maneres d'escriure la mateixa
 * adreça no passin per dues de diferents i l'índex únic les pugui aturar.
 */

const OCTET = /^(0|[1-9]\d{0,2})$/;

/** La forma canònica d'una IPv4 escrita a mà, o `null` si no ho és. Accepta zeros davant («010»). */
export function normalizeIPv4(value: string): string | null {
  const parts = value.trim().split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    const trimmed = part.replace(/^0+(?=\d)/, "");
    if (!OCTET.test(trimmed)) return null;
    const octet = Number(trimmed);
    if (octet > 255) return null;
    octets.push(octet);
  }
  return octets.join(".");
}

export function ipToNumber(ip: string): number {
  return ip.split(".").reduce((total, octet) => total * 256 + Number(octet), 0);
}

/** Per ordenar adreces com a números: «10.0.0.9» va abans que «10.0.0.10». */
export function compareIPs(a: string, b: string): number {
  return ipToNumber(a) - ipToNumber(b);
}

/** La xarxa /24 d'una adreça: «10.1.2.3» → «10.1.2». Al centre, cada planta o servei en té una. */
export function subnetOf(ip: string): string {
  return ip.split(".").slice(0, 3).join(".");
}

export type IpRange = { from: number; to: number };

/**
 * Les adreces lliures d'una /24, agrupades en trams seguits. Queden fora la .0
 * (la xarxa) i la .255 (difusió), que no es poden donar a cap equip.
 */
export function freeRanges(usedHosts: number[]): IpRange[] {
  const used = new Set(usedHosts);
  const ranges: IpRange[] = [];
  for (let host = 1; host <= 254; host++) {
    if (used.has(host)) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.to === host - 1) last.to = host;
    else ranges.push({ from: host, to: host });
  }
  return ranges;
}

export function formatRange(subnet: string, range: IpRange): string {
  return range.from === range.to
    ? `${subnet}.${range.from}`
    : `${subnet}.${range.from} – ${subnet}.${range.to}`;
}

export type SubnetSummary = {
  subnet: string;
  used: number;
  free: number;
  firstFree: string | null;
  freeRanges: string[];
};

/** Per a cada /24 que ja fa servir algun equip: quantes n'hi ha d'ocupades i quines queden. */
export function summarizeSubnets(ips: string[]): SubnetSummary[] {
  const bySubnet = new Map<string, number[]>();
  for (const ip of ips) {
    const subnet = subnetOf(ip);
    const host = Number(ip.split(".")[3]);
    bySubnet.set(subnet, [...(bySubnet.get(subnet) ?? []), host]);
  }
  return [...bySubnet.entries()]
    .sort(([a], [b]) => compareIPs(`${a}.0`, `${b}.0`))
    .map(([subnet, hosts]) => {
      const ranges = freeRanges(hosts);
      const free = ranges.reduce((total, range) => total + range.to - range.from + 1, 0);
      return {
        subnet,
        used: new Set(hosts.filter((host) => host >= 1 && host <= 254)).size,
        free,
        firstFree: ranges[0] ? `${subnet}.${ranges[0].from}` : null,
        freeRanges: ranges.map((range) => formatRange(subnet, range)),
      };
    });
}
