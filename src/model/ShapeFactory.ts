import { CONFIG } from '../config';
import type { Random } from '../core/random';
import { randomColor, randomItem, randomRange } from '../core/random';
import { Shape } from './Shape';
import type { ShapeGeometry } from './geometry/ShapeGeometry';
import { IrregularGeometry, SHARED_GEOMETRIES, UNIT_RADIUS } from './geometry/ShapeGeometry';

export class ShapeFactory {
  constructor(
    private readonly rng: Random = Math.random,
    private readonly geometries: readonly ShapeGeometry[] = SHARED_GEOMETRIES,
  ) {}

  createRandom(): Shape {
    return this.build(randomItem(this.rng, this.geometries));
  }

  createIrregular(): Shape {
    return this.build(new IrregularGeometry(this.rng));
  }

  private build(geometry: ShapeGeometry): Shape {
    const { min, max } = CONFIG.shapeRadius;
    const scale = randomRange(this.rng, min, max) / UNIT_RADIUS;
    return new Shape(geometry, randomColor(this.rng), scale);
  }
}
