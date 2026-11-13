import type { Random } from '../../core/random';
import { randomInt, randomRange } from '../../core/random';
import { pointInPolygon, polygonArea } from './polygonMath';

export const UNIT_RADIUS = 100;

export interface ShapePath {
  poly(points: number[], close?: boolean): unknown;
  ellipse(x: number, y: number, radiusX: number, radiusY: number): unknown;
}

export abstract class ShapeGeometry {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly area: number;
  readonly areaCorrection: number;

  protected constructor(
    readonly key: string | null,
    readonly outline: number[],
    exactArea?: number,
  ) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < outline.length; i += 2) {
      minX = Math.min(minX, outline[i]);
      maxX = Math.max(maxX, outline[i]);
      minY = Math.min(minY, outline[i + 1]);
      maxY = Math.max(maxY, outline[i + 1]);
    }
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;

    const outlineArea = polygonArea(outline);
    this.area = exactArea ?? outlineArea;
    this.areaCorrection = outlineArea > 0 ? this.area / outlineArea : 1;
  }

  abstract trace(path: ShapePath): void;

  contains(x: number, y: number): boolean {
    return pointInPolygon(this.outline, x, y);
  }
}

export class PolygonGeometry extends ShapeGeometry {
  constructor(key: string | null, outline: number[]) {
    super(key, outline);
  }

  trace(path: ShapePath): void {
    path.poly(this.outline, true);
  }
}

export class RegularPolygonGeometry extends PolygonGeometry {
  constructor(readonly sides: number) {
    super(`polygon-${sides}`, RegularPolygonGeometry.buildOutline(sides));
  }

  private static buildOutline(sides: number): number[] {
    const outline: number[] = [];
    const start = Math.PI / 2 - Math.PI / sides;
    for (let i = 0; i < sides; i++) {
      const angle = start + (i * 2 * Math.PI) / sides;
      outline.push(Math.cos(angle) * UNIT_RADIUS, Math.sin(angle) * UNIT_RADIUS);
    }
    return outline;
  }
}

export class StarGeometry extends PolygonGeometry {
  constructor(
    readonly points = 5,
    readonly innerRatio = 0.45,
  ) {
    super(`star-${points}`, StarGeometry.buildOutline(points, innerRatio));
  }

  private static buildOutline(points: number, innerRatio: number): number[] {
    const outline: number[] = [];
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? UNIT_RADIUS : UNIT_RADIUS * innerRatio;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      outline.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    return outline;
  }
}

export class IrregularGeometry extends PolygonGeometry {
  constructor(rng: Random) {
    super(null, IrregularGeometry.buildOutline(rng));
  }

  private static buildOutline(rng: Random): number[] {
    const corners = randomInt(rng, 5, 12);
    const slice = (2 * Math.PI) / corners;
    const rotation = rng() * 2 * Math.PI;
    const outline: number[] = [];
    for (let i = 0; i < corners; i++) {
      const angle = rotation + (i + randomRange(rng, 0.1, 0.9)) * slice;
      const radius = randomRange(rng, 0.35, 1) * UNIT_RADIUS;
      outline.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    return outline;
  }
}

export class EllipseGeometry extends ShapeGeometry {
  private static readonly SEGMENTS = 64;

  constructor(
    readonly radiusX: number,
    readonly radiusY: number,
    key = 'ellipse',
  ) {
    super(key, EllipseGeometry.buildOutline(radiusX, radiusY), Math.PI * radiusX * radiusY);
  }

  private static buildOutline(radiusX: number, radiusY: number): number[] {
    const outline: number[] = [];
    for (let i = 0; i < EllipseGeometry.SEGMENTS; i++) {
      const angle = (i * 2 * Math.PI) / EllipseGeometry.SEGMENTS;
      outline.push(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY);
    }
    return outline;
  }

  trace(path: ShapePath): void {
    path.ellipse(0, 0, this.radiusX, this.radiusY);
  }

  override contains(x: number, y: number): boolean {
    const nx = x / this.radiusX;
    const ny = y / this.radiusY;
    return nx * nx + ny * ny <= 1;
  }
}

export class CircleGeometry extends EllipseGeometry {
  constructor() {
    super(UNIT_RADIUS, UNIT_RADIUS, 'circle');
  }
}

export const SHARED_GEOMETRIES: readonly ShapeGeometry[] = [
  new RegularPolygonGeometry(3),
  new RegularPolygonGeometry(4),
  new RegularPolygonGeometry(5),
  new RegularPolygonGeometry(6),
  new CircleGeometry(),
  new EllipseGeometry(UNIT_RADIUS, UNIT_RADIUS * 0.6),
  new StarGeometry(),
];
