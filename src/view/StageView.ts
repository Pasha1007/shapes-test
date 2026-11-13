import { Container, Graphics } from 'pixi.js';
import { CONFIG } from '../config';
import { ObjectPool } from '../core/ObjectPool';
import type { Shape } from '../model/Shape';
import { GeometryContextCache } from './GeometryContextCache';
import { ShapeView } from './ShapeView';

export class StageView {
  readonly root = new Container();

  private readonly layer = new Container();
  private readonly mask = new Graphics();
  private readonly views = new Map<Shape, ShapeView>();
  private readonly contexts = new GeometryContextCache();
  private readonly pool = new ObjectPool<ShapeView>(
    () => new ShapeView(),
    (view) => view.destroy(),
    CONFIG.viewPoolSize,
  );
  private readonly syncView = (view: ShapeView): void => view.sync();

  constructor() {
    this.root.eventMode = 'none';
    this.layer.mask = this.mask;
    this.root.addChild(this.mask, this.layer);
  }

  get activeCount(): number {
    return this.views.size;
  }

  get pooledCount(): number {
    return this.pool.size;
  }

  resize(width: number, height: number): void {
    this.mask.clear().rect(0, 0, width, height).fill(0xffffff);
  }

  add(shape: Shape): void {
    const view = this.pool.acquire();
    view.bind(shape, this.contexts.acquire(shape.geometry));
    this.views.set(shape, view);
    this.layer.addChild(view.graphics);
  }

  remove(shape: Shape): void {
    const view = this.views.get(shape);
    if (!view) return;
    this.views.delete(shape);
    this.layer.removeChild(view.graphics);
    const context = view.boundContext;
    view.unbind();
    this.contexts.release(shape.geometry, context);
    this.pool.release(view);
  }

  sync(): void {
    this.views.forEach(this.syncView);
  }

  destroy(): void {
    for (const shape of [...this.views.keys()]) this.remove(shape);
    this.pool.drain();
    this.contexts.destroy();
    this.root.destroy({ children: true });
  }
}
