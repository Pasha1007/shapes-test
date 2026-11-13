export type Random = () => number;

export function randomRange(rng: Random, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function randomInt(rng: Random, min: number, max: number): number {
  return Math.floor(randomRange(rng, min, max + 1));
}

export function randomItem<T>(rng: Random, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

export function hslToHex(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number): number => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (channel(0) << 16) | (channel(8) << 8) | channel(4);
}

export function randomColor(rng: Random): number {
  return hslToHex(rng(), randomRange(rng, 0.65, 0.95), randomRange(rng, 0.5, 0.65));
}
