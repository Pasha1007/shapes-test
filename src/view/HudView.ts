import { CONFIG } from '../config';
import type { GameStats } from '../model/GameModel';

export class HudView {
  private readonly countElement: HTMLElement;
  private readonly areaElement: HTMLElement;
  private readonly fpsElement: HTMLElement;
  private readonly format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  private lastWrite = -Infinity;
  private shownCount = -1;
  private shownArea = -1;
  private shownFps = -1;
  private fpsWindowStart = -1;
  private fpsFrames = 0;

  constructor(root: ParentNode) {
    this.countElement = HudView.find(root, '#shape-count');
    this.areaElement = HudView.find(root, '#shape-area');
    this.fpsElement = HudView.find(root, '#fps');
  }

  private static find(root: ParentNode, selector: string): HTMLElement {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing HUD element: ${selector}`);
    return element;
  }

  update(stats: GameStats, now: number): void {
    this.countFrame(now);
    if (now - this.lastWrite < CONFIG.hudIntervalMs) return;
    this.lastWrite = now;

    if (stats.count !== this.shownCount) {
      this.shownCount = stats.count;
      this.countElement.textContent = String(stats.count);
    }
    const area = Math.round(stats.area);
    if (area !== this.shownArea) {
      this.shownArea = area;
      this.areaElement.textContent = this.format.format(area);
    }
  }

  private countFrame(now: number): void {
    if (this.fpsWindowStart < 0) {
      this.fpsWindowStart = now;
      return;
    }
    this.fpsFrames++;
    const elapsed = now - this.fpsWindowStart;
    if (elapsed < CONFIG.fpsIntervalMs) return;
    const fps = Math.round((this.fpsFrames * 1000) / elapsed);
    this.fpsWindowStart = now;
    this.fpsFrames = 0;
    if (fps !== this.shownFps) {
      this.shownFps = fps;
      this.fpsElement.textContent = String(fps);
    }
  }
}
