import { Game } from './Game';

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

const stage = required<HTMLElement>('#stage');

Game.create({
  stage,
  hud: required<HTMLElement>('.hud'),
  controls: required<HTMLElement>('#controls'),
})
  .then((game) => {
    import.meta.hot?.dispose(() => game.destroy());
    if (import.meta.env.DEV) Object.assign(window, { game });
  })
  .catch((error: unknown) => {
    console.error(error);
    const message = document.createElement('p');
    message.className = 'stage__error';
    message.textContent = 'This browser could not start the graphics engine.';
    stage.appendChild(message);
  });
