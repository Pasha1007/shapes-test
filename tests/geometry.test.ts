import { describe, expect, it } from 'vitest';
import {
  CircleGeometry,
  EllipseGeometry,
  IrregularGeometry,
  RegularPolygonGeometry,
  SHARED_GEOMETRIES,
  StarGeometry,
  UNIT_RADIUS,
} from '../src/model/geometry/ShapeGeometry';
import {
  clippedPolygonArea,
  pointInPolygon,
  polygonArea,
} from '../src/model/geometry/polygonMath';
import { Shape } from '../src/model/Shape';

const SQUARE = [0, 0, 10, 0, 10, 10, 0, 10];

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('polygonMath', () => {
  it('measures area regardless of winding', () => {
    expect(polygonArea(SQUARE)).toBe(100);
    expect(polygonArea([0, 10, 10, 10, 10, 0, 0, 0])).toBe(100);
  });

  it('tests points against a polygon', () => {
    expect(pointInPolygon(SQUARE, 5, 5)).toBe(true);
    expect(pointInPolygon(SQUARE, 15, 5)).toBe(false);
  });

  it('clips against each edge of the rectangle', () => {
    expect(clippedPolygonArea(SQUARE, 1, 20, 20, 100, 100)).toBeCloseTo(100);
    expect(clippedPolygonArea(SQUARE, 1, 20, -5, 100, 100)).toBeCloseTo(50);
    expect(clippedPolygonArea(SQUARE, 1, 20, 95, 100, 100)).toBeCloseTo(50);
    expect(clippedPolygonArea(SQUARE, 1, -5, -5, 100, 100)).toBeCloseTo(25);
    expect(clippedPolygonArea(SQUARE, 1, 95, 95, 100, 100)).toBeCloseTo(25);
    expect(clippedPolygonArea(SQUARE, 1, 200, 20, 100, 100)).toBe(0);
    expect(clippedPolygonArea(SQUARE, 2, 0, 0, 100, 100)).toBeCloseTo(400);
  });

  it('clips a concave polygon correctly', () => {
    const star = new StarGeometry();
    const whole = polygonArea(star.outline);
    expect(clippedPolygonArea(star.outline, 1, 0, 150, 300, 300)).toBeCloseTo(whole / 2, 6);
  });
});

describe('geometries', () => {
  it('provides the seven listed shape types', () => {
    expect(SHARED_GEOMETRIES.map((geometry) => geometry.key)).toEqual([
      'polygon-3',
      'polygon-4',
      'polygon-5',
      'polygon-6',
      'circle',
      'ellipse',
      'star-5',
    ]);
  });

  it('computes exact areas', () => {
    const r = UNIT_RADIUS;
    expect(new RegularPolygonGeometry(4).area).toBeCloseTo(2 * r * r);
    expect(new RegularPolygonGeometry(6).area).toBeCloseTo(((3 * Math.sqrt(3)) / 2) * r * r);
    expect(new CircleGeometry().area).toBeCloseTo(Math.PI * r * r);
    expect(new EllipseGeometry(r, r / 2).area).toBeCloseTo((Math.PI * r * r) / 2);
  });

  it('rests regular polygons on a flat bottom edge', () => {
    for (const sides of [3, 4, 5, 6]) {
      const { outline, maxY } = new RegularPolygonGeometry(sides);
      const lowest = outline.filter((value, i) => i % 2 === 1 && Math.abs(value - maxY) < 1e-9);
      expect(lowest).toHaveLength(2);
    }
  });

  it('hit-tests curves exactly and stars by their concave outline', () => {
    const circle = new CircleGeometry();
    expect(circle.contains(70, 70)).toBe(true);
    expect(circle.contains(72, 72)).toBe(false);

    const star = new StarGeometry();
    expect(star.contains(0, 0)).toBe(true);
    expect(star.contains(60, -60)).toBe(false);
  });

  it('builds irregular shapes that differ, fit the unit circle and are not shared', () => {
    const rng = seeded(7);
    const a = new IrregularGeometry(rng);
    const b = new IrregularGeometry(rng);
    expect(a.key).toBeNull();
    expect(a.outline).not.toEqual(b.outline);
    for (const geometry of [a, b]) {
      expect(geometry.outline.length).toBeGreaterThanOrEqual(10);
      expect(geometry.outline.length).toBeLessThanOrEqual(24);
      expect(geometry.area).toBeGreaterThan(0);
      for (let i = 0; i < geometry.outline.length; i += 2) {
        expect(Math.hypot(geometry.outline[i], geometry.outline[i + 1])).toBeLessThanOrEqual(
          UNIT_RADIUS + 1e-9,
        );
      }
    }
  });
});

describe('Shape', () => {
  it('scales area with the square of its scale', () => {
    const shape = new Shape(new CircleGeometry(), 0xffffff, 0.5);
    expect(shape.area).toBeCloseTo(Math.PI * 50 * 50);
  });

  it('reports the visible part of its area', () => {
    const shape = new Shape(new CircleGeometry(), 0xffffff, 0.5);
    shape.x = 200;

    shape.y = -50;
    expect(shape.visibleArea(400, 400)).toBe(0);

    shape.y = 0;
    expect(shape.visibleArea(400, 400)).toBeCloseTo(shape.area / 2, 6);

    shape.y = 200;
    expect(shape.visibleArea(400, 400)).toBe(shape.area);
  });

  it('hit-tests in rectangle coordinates', () => {
    const shape = new Shape(new RegularPolygonGeometry(4), 0xffffff, 0.5);
    shape.x = 100;
    shape.y = 100;
    expect(shape.contains(100, 100)).toBe(true);
    expect(shape.contains(100, 140)).toBe(false);
  });
});
