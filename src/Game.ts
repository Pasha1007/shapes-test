import { Application, type FederatedPointerEvent, type Ticker } from 'pixi.js';
import { CONFIG } from './config';
import { FrameClock } from './core/FrameClock';
import { GameModel } from './model/GameModel';
import { releaseClipBuffers } from './model/geometry/polygonMath';
import { ControlsView, type ControlId } from './view/ControlsView';
import { HudView } from './view/HudView';
import { StageView } from './view/StageView';

export interface GameElements {
  readonly stage: HTMLElement;
  readonly hud: ParentNode;
  readonly controls: HTMLElement;
}

export class Game {
  readonly model = new GameModel();
  readonly stageView = new StageView();

  private readonly hud: HudView;
  private readonly controls: ControlsView;
  private readonly resizeObserver: ResizeObserver;
  private readonly unsubscribe: Array<() => void> = [];
  private readonly clock = new FrameClock({ maxStep: CONFIG.maxFrameSeconds });

  private constructor(
    private readonly app: Application,
    private readonly elements: GameElements,
  ) {
    this.hud = new HudView(elements.hud);
    this.controls = new ControlsView(elements.controls, this.handleStep);

    const { model, stageView } = this;
    this.unsubscribe.push(
      model.events.on('shapeAdded', (shape) => stageView.add(shape)),
      model.events.on('shapeRemoved', (shape) => stageView.remove(shape)),
      model.events.on('settingsChanged', (settings) => this.controls.render(settings)),
    );
    this.controls.render(model.settings);

    app.stage.addChild(stageView.root);
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', this.handlePointerDown);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(elements.stage);
    this.handleResize();

    app.ticker.add(this.tick);
  }

  static async create(elements: GameElements): Promise<Game> {
    const app = new Application();
    await app.init({
      preference: 'webgl',
      antialias: true,
      backgroundAlpha: 0,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio),
      width: Math.max(1, elements.stage.clientWidth),
      height: Math.max(1, elements.stage.clientHeight),
    });
    elements.stage.appendChild(app.canvas);
    return new Game(app, elements);
  }

  destroy(): void {
    this.app.ticker.remove(this.tick);
    this.app.stage.off('pointerdown', this.handlePointerDown);
    this.resizeObserver.disconnect();
    this.unsubscribe.forEach((off) => off());
    this.unsubscribe.length = 0;
    this.model.events.clear();
    this.controls.destroy();
    this.stageView.destroy();
    this.app.destroy({ removeView: true }, { children: true });
    releaseClipBuffers();
  }

  private readonly tick = (ticker: Ticker): void => {
    const dt = this.clock.step(ticker.elapsedMS / 1000);
    this.model.update(dt);
    this.stageView.sync();
    this.hud.update(this.model.stats, ticker.lastTime);
  };

  private readonly handlePointerDown = (event: FederatedPointerEvent): void => {
    if (event.button !== 0) return;
    this.model.handlePointer(event.global.x, event.global.y);
  };

  private readonly handleStep = (control: ControlId, direction: 1 | -1): void => {
    if (control === 'gravity') {
      this.model.stepGravity(direction);
    } else {
      this.model.stepSpawnRate(direction);
    }
  };

  private readonly handleResize = (): void => {
    const width = this.elements.stage.clientWidth;
    const height = this.elements.stage.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.app.renderer.resize(width, height);
    this.model.resize(width, height);
    this.stageView.resize(width, height);
  };
}
