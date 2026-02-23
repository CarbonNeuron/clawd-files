const EXPIRY_PRESETS: Record<string, number> = {
  "1h": 3600,
  "6h": 21600,
  "12h": 43200,
  "1d": 86400,
  "3d": 259200,
  "1w": 604800,
  "2w": 1209600,
  "1m": 2592000,
  never: 0,
};

export function parseExpiry(input?: string): number | null {
  if (!input || input === "never") return null;
  const seconds = EXPIRY_PRESETS[input];
  if (seconds !== undefined && seconds > 0) {
    return Math.floor(Date.now() / 1000) + seconds;
  }
  const num = parseInt(input, 10);
  if (!isNaN(num) && num > 0) {
    return Math.floor(Date.now() / 1000) + num;
  }
  return Math.floor(Date.now() / 1000) + 604800;
}

export function isExpired(expiresAt: number | null): boolean {
  if (expiresAt === null) return false;
  return expiresAt < Math.floor(Date.now() / 1000);
}

export function secondsRemaining(expiresAt: number | null): number | null {
  if (expiresAt === null) return null;
  return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
}
