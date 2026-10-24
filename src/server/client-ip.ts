// src/server/client-ip.ts
// IP real del cliente detrás de FortiGate y HAProxy: recorre X-Forwarded-For de derecha a izquierda y salta los
// proxies de confianza (TRUSTED_PROXIES). La usan el límite de intentos de login y la auditoría (ADR-05, ADR-14).

// TRAMPA: el primer valor de X-Forwarded-For lo escribe el cliente; solo el último salto no confiable es real.
export function clientIpFrom(
  forwardedFor: string | null,
  trustedProxies: readonly string[],
): string | null {
  const hops = (forwardedFor ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i];
    if (!trustedProxies.some((proxy) => matches(hop, proxy))) return hop;
  }
  return null;
}

// REGLA: lista separada por comas de IP o rangos CIDR IPv4 de los proxies propios, nunca una red de clientes.
export function trustedProxiesFromEnv(
  value = process.env.TRUSTED_PROXIES,
): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function matches(ip: string, proxy: string): boolean {
  const [network, prefixText] = proxy.split("/");
  if (prefixText === undefined) return ip === network;
  const ipValue = ipv4ToNumber(ip);
  const networkValue = ipv4ToNumber(network);
  const prefix = Number(prefixText);
  if (ipValue === null || networkValue === null) return false;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipValue & mask) >>> 0 === (networkValue & mask) >>> 0;
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!/^\d{1,3}$/.test(part) || octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}
