import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { ObjectPool } from '../src/core/ObjectPool';
import { GameModel } from '../src/model/GameModel';
import type { Shape } from '../src/model/Shape';
import { ShapeFactory } from '../src/model/ShapeFactory';

const WIDTH = 800;
const HEIGHT = 600;
const FRAME = 1 / 60;

function createModel(): GameModel {
  const model = new GameModel();
  model.resize(WIDTH, HEIGHT);
  return model;
}

function run(model: GameModel, seconds: number, frame = FRAME): void {
  const frames = Math.round(seconds / frame);
  for (let i = 0; i < frames; i++) model.update(frame);
}

describe('GameModel generation', () => {
  it('starts each shape fully above the rectangle, within its sides', () => {
    const model = createModel();
    const added: Shape[] = [];
    model.events.on('shapeAdded', (shape) => {
      expect(shape.bottom).toBeCloseTo(0);
      expect(shape.left).toBeGreaterThanOrEqual(-1e-9);
      expect(shape.right).toBeLessThanOrEqual(WIDTH + 1e-9);
      added.push(shape);
    });
    run(model, 20);
    expect(added.length).toBeGreaterThan(15);
    expect(new Set(added.map((shape) => shape.geometry.key)).size).toBeGreaterThan(1);
    expect(new Set(added.map((shape) => shape.color)).size).toBeGreaterThan(1);
  });

  it('generates one shape per second by default', () => {
    const model = createModel();
    let added = 0;
    model.events.on('shapeAdded', () => added++);
    model.update(FRAME);
    expect(added).toBe(1);
    run(model, 10);
    expect(added).toBe(11);
  });

  it('keeps the rate exact at a low frame rate', () => {
    const model = createModel();
    for (let i = 0; i < 3; i++) model.stepSpawnRate(1);
    let added = 0;
    model.events.on('shapeAdded', () => added++);
    run(model, 5, 0.1);
    expect(added).toBe(21);
  });

  it('stops generating at a rate of zero', () => {
    const model = createModel();
    model.stepSpawnRate(-1);
    expect(model.spawnRate).toBe(0);
    let added = 0;
    model.events.on('shapeAdded', () => added++);
    run(model, 5);
    expect(added).toBe(0);
  });
});

describe('GameModel falling', () => {
  it('accelerates shapes by the gravity value', () => {
    const model = createModel();
    model.update(FRAME);
    const shape = model.shapes[0];
    const startY = shape.y - shape.vy * FRAME;
    run(model, 1);
    expect(shape.vy).toBeCloseTo(CONFIG.gravity.initial * (1 + FRAME), 6);
    const t = 1 + FRAME;
    expect(shape.y - startY).toBeGreaterThan((CONFIG.gravity.initial * t * t) / 2);
    expect(shape.y - startY).toBeLessThan((CONFIG.gravity.initial * t * t) / 2 + 5);
  });

  it('falls faster when gravity is increased', () => {
    const slow = createModel();
    const fast = createModel();
    for (let i = 0; i < 8; i++) fast.stepGravity(1);
    run(slow, 1);
    run(fast, 1);
    expect(fast.shapes[0].vy).toBeGreaterThan(slow.shapes[0].vy);
  });

  it('removes shapes once they are fully below the rectangle', () => {
    const model = createModel();
    const removed: Shape[] = [];
    model.events.on('shapeRemoved', (shape) => {
      expect(shape.top).toBeGreaterThanOrEqual(HEIGHT);
      removed.push(shape);
    });
    run(model, 30);
    expect(removed.length).toBeGreaterThan(20);
    expect(model.shapes.length).toBeLessThan(6);
  });

  it('clamps settings to their limits', () => {
    const model = createModel();
    for (let i = 0; i < 500; i++) model.stepGravity(-1);
    expect(model.gravity).toBe(CONFIG.gravity.min);
    for (let i = 0; i < 500; i++) model.stepGravity(1);
    expect(model.gravity).toBe(CONFIG.gravity.max);
    for (let i = 0; i < 500; i++) model.stepSpawnRate(1);
    expect(model.spawnRate).toBe(CONFIG.spawnRate.max);
  });

  it('announces setting changes only when the value changes', () => {
    const model = createModel();
    let events = 0;
    model.events.on('settingsChanged', () => events++);
    model.stepSpawnRate(-1);
    model.stepSpawnRate(-1);
    expect(events).toBe(1);
  });
});

describe('GameModel pointer input', () => {
  function emptyModel(): GameModel {
    const model = createModel();
    model.stepSpawnRate(-1);
    return model;
  }

  it('creates a shape at the pointer on empty space', () => {
    const model = emptyModel();
    model.handlePointer(300, 200);
    expect(model.shapes).toHaveLength(1);
    const shape = model.shapes[0];
    expect(shape.x).toBe(300);
    expect(shape.y).toBe(200);
    expect(shape.vy).toBe(0);
    model.update(FRAME);
    expect(shape.y).toBeGreaterThan(200);
  });

  it('creates either an irregular or a listed shape on a click', () => {
    const irregular = new GameModel(new ShapeFactory(), () => 0);
    irregular.resize(WIDTH, HEIGHT);
    irregular.handlePointer(300, 200);
    expect(irregular.shapes[0].geometry.key).toBeNull();

    const listed = new GameModel(new ShapeFactory(), () => 0.99);
    listed.resize(WIDTH, HEIGHT);
    listed.handlePointer(300, 200);
    expect(listed.shapes[0].geometry.key).not.toBeNull();
    expect(listed.shapes[0].x).toBe(300);
    expect(listed.shapes[0].y).toBe(200);
  });

  it('removes a shape when it is clicked', () => {
    const model = emptyModel();
    model.handlePointer(300, 200);
    const shape = model.shapes[0];
    model.handlePointer(shape.x, shape.y);
    expect(model.shapes).toHaveLength(0);
    expect(model.stats.count).toBe(0);
  });

  it('removes only the front-most of two overlapping shapes', () => {
    const model = emptyModel();
    model.handlePointer(300, 200);
    const back = model.shapes[0];
    model.handlePointer(300 + back.right - back.x + 1, 200);
    expect(model.shapes).toHaveLength(2);
    const front = model.shapes[1];
    front.x = back.x;
    front.y = back.y;
    model.handlePointer(back.x, back.y);
    expect(model.shapes).toEqual([back]);
  });
});

describe('GameModel statistics', () => {
  it('counts only visible shapes and sums their visible area', () => {
    const model = createModel();
    model.update(0);
    expect(model.shapes).toHaveLength(1);
    expect(model.stats).toEqual({ count: 0, area: 0 });

    model.stepSpawnRate(-1);
    const shape = model.shapes[0];
    run(model, 0.4);
    expect(model.stats.count).toBe(1);
    expect(model.stats.area).toBeGreaterThan(0);
    expect(model.stats.area).toBeLessThan(shape.area);

    run(model, 1);
    expect(model.stats.area).toBeCloseTo(shape.area);
  });

  it('removes shapes left beyond the right edge after a resize', () => {
    const model = createModel();
    model.stepSpawnRate(-1);
    model.handlePointer(700, 100);
    model.resize(400, HEIGHT);
    model.update(FRAME);
    expect(model.shapes).toHaveLength(0);
  });
});

describe('ObjectPool', () => {
  it('reuses released items and disposes the overflow', () => {
    let created = 0;
    const disposed: number[] = [];
    const pool = new ObjectPool<number>(
      () => ++created,
      (item) => disposed.push(item),
      2,
    );
    const a = pool.acquire();
    const b = pool.acquire();
    const c = pool.acquire();
    pool.release(a);
    pool.release(b);
    pool.release(c);
    expect(disposed).toEqual([c]);
    expect(pool.size).toBe(2);
    expect(pool.acquire()).toBe(b);
    expect(created).toBe(3);
    pool.drain();
    expect(pool.size).toBe(0);
    expect(disposed).toEqual([c, a]);
  });
});
