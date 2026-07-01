export function parseTtlSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);

  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 60 * 60;
  return value * 24 * 60 * 60;
}

export function parseTtlMs(ttl: string): number {
  return parseTtlSeconds(ttl) * 1000;
}
