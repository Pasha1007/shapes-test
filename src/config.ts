export interface SteppedSetting {
  readonly initial: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export const CONFIG = {
  gravity: { initial: 200, min: 25, max: 2000, step: 25 } as SteppedSetting,
  spawnRate: { initial: 1, min: 0, max: 50, step: 1 } as SteppedSetting,
  shapeRadius: { min: 28, max: 56 },
  irregularClickChance: 0.5,
  maxFrameSeconds: 0.1,
  maxPixelRatio: 2,
  hudIntervalMs: 100,
  fpsIntervalMs: 500,
  viewPoolSize: 256,
} as const;
