import { CONFIG, type SteppedSetting } from '../config';
import type { GameSettings } from '../model/GameModel';

export type ControlId = keyof GameSettings;
export type StepHandler = (control: ControlId, direction: 1 | -1) => void;

interface ControlElements {
  readonly value: HTMLElement;
  readonly decrease: HTMLButtonElement;
  readonly increase: HTMLButtonElement;
}

const LIMITS: Record<ControlId, SteppedSetting> = {
  spawnRate: CONFIG.spawnRate,
  gravity: CONFIG.gravity,
};

export class ControlsView {
  private readonly controls = new Map<ControlId, ControlElements>();

  constructor(
    private readonly root: HTMLElement,
    private readonly onStep: StepHandler,
  ) {
    for (const id of Object.keys(LIMITS) as ControlId[]) {
      const element = root.querySelector<HTMLElement>(`[data-control="${id}"]`);
      const value = element?.querySelector<HTMLElement>('output');
      const decrease = element?.querySelector<HTMLButtonElement>('[data-direction="-1"]');
      const increase = element?.querySelector<HTMLButtonElement>('[data-direction="1"]');
      if (!value || !decrease || !increase) throw new Error(`Missing control: ${id}`);
      this.controls.set(id, { value, decrease, increase });
    }
    root.addEventListener('click', this.handleClick);
  }

  render(settings: GameSettings): void {
    this.controls.forEach((elements, id) => {
      const value = settings[id];
      elements.value.textContent = String(value);
      elements.decrease.disabled = value <= LIMITS[id].min;
      elements.increase.disabled = value >= LIMITS[id].max;
    });
  }

  destroy(): void {
    this.root.removeEventListener('click', this.handleClick);
    this.controls.clear();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-direction]');
    const id = button?.closest<HTMLElement>('[data-control]')?.dataset.control as
      | ControlId
      | undefined;
    if (!button || !id || !this.controls.has(id)) return;
    this.onStep(id, button.dataset.direction === '1' ? 1 : -1);
  };
}
