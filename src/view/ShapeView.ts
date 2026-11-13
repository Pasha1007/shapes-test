import { Graphics, GraphicsContext } from 'pixi.js';
import type { Shape } from '../model/Shape';

export class ShapeView {
  private static readonly EMPTY = new GraphicsContext();

  readonly graphics = new Graphics(ShapeView.EMPTY);
  private shape: Shape | null = null;
  private context: GraphicsContext = ShapeView.EMPTY;

  get boundContext(): GraphicsContext {
    return this.context;
  }

  bind(shape: Shape, context: GraphicsContext): void {
    this.shape = shape;
    this.context = context;
    this.graphics.context = context;
    this.graphics.tint = shape.color;
    this.graphics.scale.set(shape.scale);
    this.graphics.position.set(shape.x, shape.y);
  }

  unbind(): void {
    this.shape = null;
    this.context = ShapeView.EMPTY;
    this.graphics.context = ShapeView.EMPTY;
  }

  sync(): void {
    if (this.shape) this.graphics.position.set(this.shape.x, this.shape.y);
  }

  destroy(): void {
    this.unbind();
    this.graphics.destroy();
  }
}
