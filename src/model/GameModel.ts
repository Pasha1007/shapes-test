import { CONFIG, type SteppedSetting } from '../config';
import { EventEmitter } from '../core/EventEmitter';
import type { Random } from '../core/random';
import { randomRange } from '../core/random';
import type { Shape } from './Shape';
import { ShapeFactory } from './ShapeFactory';

export interface GameSettings {
  readonly spawnRate: number;
  readonly gravity: number;
}

export interface GameStats {
  count: number;
  area: number;
}

export type GameEvents = {
  shapeAdded: Shape;
  shapeRemoved: Shape;
  settingsChanged: GameSettings;
};

function step(value: number, direction: 1 | -1, setting: SteppedSetting): number {
  return Math.min(setting.max, Math.max(setting.min, value + direction * setting.step));
}

export class GameModel {
  readonly events = new EventEmitter<GameEvents>();
  readonly stats: GameStats = { count: 0, area: 0 };

  private readonly list: Shape[] = [];
  private width = 0;
  private height = 0;
  private gravityValue: number = CONFIG.gravity.initial;
  private spawnRateValue: number = CONFIG.spawnRate.initial;
  private spawnDebt = 1;

  constructor(
    private readonly factory: ShapeFactory = new ShapeFactory(),
    private readonly rng: Random = Math.random,
  ) {}

  get shapes(): readonly Shape[] {
    return this.list;
  }

  get gravity(): number {
    return this.gravityValue;
  }

  get spawnRate(): number {
    return this.spawnRateValue;
  }

  get settings(): GameSettings {
    return { spawnRate: this.spawnRateValue, gravity: this.gravityValue };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  stepGravity(direction: 1 | -1): void {
    const next = step(this.gravityValue, direction, CONFIG.gravity);
    if (next === this.gravityValue) return;
    this.gravityValue = next;
    this.events.emit('settingsChanged', this.settings);
  }

  stepSpawnRate(direction: 1 | -1): void {
    const next = step(this.spawnRateValue, direction, CONFIG.spawnRate);
    if (next === this.spawnRateValue) return;
    this.spawnRateValue = next;
    if (next === 0) this.spawnDebt = 0;
    this.events.emit('settingsChanged', this.settings);
  }

  update(dt: number): void {
    if (this.width <= 0 || this.height <= 0) return;

    this.spawnDebt += this.spawnRateValue * dt;
    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      this.spawnAtTop();
    }

    const list = this.list;
    let kept = 0;
    for (let i = 0; i < list.length; i++) {
      const shape = list[i];
      shape.vy += this.gravityValue * dt;
      shape.y += shape.vy * dt;
      if (shape.top >= this.height || shape.left >= this.width) {
        this.events.emit('shapeRemoved', shape);
      } else {
        list[kept++] = shape;
      }
    }
    list.length = kept;

    this.measure();
  }

  handlePointer(x: number, y: number): void {
    const hit = this.shapeAt(x, y);
    if (hit) {
      this.remove(hit);
    } else {
      const irregular = this.rng() < CONFIG.irregularClickChance;
      this.add(irregular ? this.factory.createIrregular() : this.factory.createRandom(), x, y);
    }
    this.measure();
  }

  shapeAt(x: number, y: number): Shape | undefined {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].contains(x, y)) return this.list[i];
    }
    return undefined;
  }

  clear(): void {
    for (const shape of this.list) this.events.emit('shapeRemoved', shape);
    this.list.length = 0;
    this.measure();
  }

  private spawnAtTop(): void {
    const shape = this.factory.createRandom();
    const minX = -shape.geometry.minX * shape.scale;
    const maxX = this.width - shape.geometry.maxX * shape.scale;
    const x = minX < maxX ? randomRange(this.rng, minX, maxX) : this.width / 2;
    const y = -shape.geometry.maxY * shape.scale;
    this.add(shape, x, y);
  }

  private add(shape: Shape, x: number, y: number): void {
    shape.x = x;
    shape.y = y;
    shape.vy = 0;
    this.list.push(shape);
    this.events.emit('shapeAdded', shape);
  }

  private remove(shape: Shape): void {
    const index = this.list.indexOf(shape);
    if (index === -1) return;
    this.list.splice(index, 1);
    this.events.emit('shapeRemoved', shape);
  }

  private measure(): void {
    let count = 0;
    let area = 0;
    for (let i = 0; i < this.list.length; i++) {
      const visible = this.list[i].visibleArea(this.width, this.height);
      if (visible > 0) {
        count++;
        area += visible;
      }
    }
    this.stats.count = count;
    this.stats.area = area;
  }
}
