import { describe, expect, it } from 'vitest';
import { FrameClock } from '../src/core/FrameClock';

const FRAME = 1 / 60;

describe('FrameClock', () => {
  it('evens out timestamp jitter without losing time', () => {
    const clock = new FrameClock({ maxStep: 0.1 });
    let real = 0;
    let simulated = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 600; i++) {
      const raw = FRAME + (i % 2 === 0 ? 0.001 : -0.001);
      const dt = clock.step(raw);
      real += raw;
      simulated += dt;
      if (i > 60) {
        min = Math.min(min, dt);
        max = Math.max(max, dt);
      }
    }
    expect(max - min).toBeLessThan(0.0003);
    expect(simulated).toBeCloseTo(real, 1);
  });

  it('passes a genuine hitch through and caps it', () => {
    const clock = new FrameClock({ maxStep: 0.1 });
    for (let i = 0; i < 30; i++) clock.step(FRAME);
    expect(clock.step(0.05)).toBeCloseTo(0.05);
    expect(clock.step(5)).toBe(0.1);
    expect(clock.step(FRAME)).toBeCloseTo(FRAME);
  });

  it('follows a change of refresh rate', () => {
    const clock = new FrameClock({ maxStep: 0.1 });
    for (let i = 0; i < 30; i++) clock.step(FRAME);
    let dt = 0;
    for (let i = 0; i < 30; i++) dt = clock.step(1 / 120 + (i % 2 === 0 ? 0.0005 : -0.0005));
    expect(dt).toBeCloseTo(1 / 120, 3);
    expect(Math.abs(dt - 1 / 120)).toBeLessThan(0.0002);
  });
});
