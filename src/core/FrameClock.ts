export interface FrameClockOptions {
  readonly maxStep: number;
  readonly tolerance?: number;
  readonly smoothing?: number;
  readonly resyncAfter?: number;
}

export class FrameClock {
  private readonly maxStep: number;
  private readonly tolerance: number;
  private readonly smoothing: number;
  private readonly resyncAfter: number;
  private average = 0;
  private outliers = 0;

  constructor(options: FrameClockOptions) {
    this.maxStep = options.maxStep;
    this.tolerance = options.tolerance ?? 0.25;
    this.smoothing = options.smoothing ?? 0.1;
    this.resyncAfter = options.resyncAfter ?? 5;
  }

  step(rawSeconds: number): number {
    const raw = Math.min(Math.max(rawSeconds, 0), this.maxStep);
    if (this.average === 0) {
      this.average = raw;
      return raw;
    }
    if (Math.abs(raw - this.average) <= this.average * this.tolerance) {
      this.outliers = 0;
      this.average += (raw - this.average) * this.smoothing;
      return this.average;
    }
    if (++this.outliers >= this.resyncAfter) {
      this.outliers = 0;
      this.average = raw;
    }
    return raw;
  }

  reset(): void {
    this.average = 0;
    this.outliers = 0;
  }
}
