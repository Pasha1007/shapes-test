import type { ShapeGeometry } from './geometry/ShapeGeometry';
import { clippedPolygonArea } from './geometry/polygonMath';

export class Shape {
  x = 0;
  y = 0;
  vy = 0;

  constructor(
    readonly geometry: ShapeGeometry,
    readonly color: number,
    readonly scale: number,
  ) {}

  get left(): number {
    return this.x + this.geometry.minX * this.scale;
  }

  get right(): number {
    return this.x + this.geometry.maxX * this.scale;
  }

  get top(): number {
    return this.y + this.geometry.minY * this.scale;
  }

  get bottom(): number {
    return this.y + this.geometry.maxY * this.scale;
  }

  get area(): number {
    return this.geometry.area * this.scale * this.scale;
  }

  contains(x: number, y: number): boolean {
    return this.geometry.contains((x - this.x) / this.scale, (y - this.y) / this.scale);
  }

  visibleArea(width: number, height: number): number {
    const { left, right, top, bottom } = this;
    if (right <= 0 || left >= width || bottom <= 0 || top >= height) return 0;
    if (left >= 0 && right <= width && top >= 0 && bottom <= height) return this.area;
    return (
      clippedPolygonArea(this.geometry.outline, this.scale, this.x, this.y, width, height) *
      this.geometry.areaCorrection
    );
  }
}
