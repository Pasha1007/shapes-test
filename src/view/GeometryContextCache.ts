import { GraphicsContext } from 'pixi.js';
import type { ShapeGeometry } from '../model/geometry/ShapeGeometry';

export class GeometryContextCache {
  private readonly shared = new Map<string, GraphicsContext>();

  acquire(geometry: ShapeGeometry): GraphicsContext {
    if (geometry.key === null) return this.build(geometry);
    let context = this.shared.get(geometry.key);
    if (!context) {
      context = this.build(geometry);
      this.shared.set(geometry.key, context);
    }
    return context;
  }

  release(geometry: ShapeGeometry, context: GraphicsContext): void {
    if (geometry.key === null) context.destroy();
  }

  destroy(): void {
    this.shared.forEach((context) => context.destroy());
    this.shared.clear();
  }

  private build(geometry: ShapeGeometry): GraphicsContext {
    const context = new GraphicsContext();
    geometry.trace(context);
    context.fill(0xffffff);
    return context;
  }
}
