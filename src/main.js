import './style.css';
import { translations } from './data/translations.js';
import { createUniverse } from './scene/universe.js';

const html = document.documentElement;
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const pause = document.querySelector('#pause');
const pauseLabel = document.querySelector('#pause-label');
const catalog = document.querySelector('#flower-catalog');
const message = document.querySelector('#flower-message');
const canvas = document.querySelector('#universe');
let universe;
let manuallyPaused = false;

for (const translation of translations) {
  const item = document.createElement('li');
  const text = document.createElement('span');
  text.lang = translation.lang;
  text.textContent = translation.text;
  const language = document.createElement('small');
  language.textContent = translation.language;
  item.append(text, language);
  document.querySelector('#translation-list').append(item);
}

function showMessage(translation) {
  message.replaceChildren();
  message.classList.toggle('is-visible', Boolean(translation));
  if (!translation) return;
  const language = document.createElement('small');
  language.textContent = translation.language;
  const text = document.createElement('span');
  text.lang = translation.lang;
  text.textContent = translation.text;
  message.append(language, text);
}

function fallback() {
  html.classList.add('no-webgl', 'scene-ready');
  document.querySelector('.fallback').hidden = false;
  pause.hidden = true;
  document.querySelector('.interaction-hint').hidden = true;
  canvas.hidden = true;
}

function syncMotion() {
  const still = motionQuery.matches || manuallyPaused;
  html.dataset.still = String(still);
  html.dataset.paused = String(manuallyPaused);
  pause.setAttribute('aria-pressed', String(still));
  pause.setAttribute('aria-label', motionQuery.matches ? 'Movimiento reducido activado en tu dispositivo' : manuallyPaused ? 'Reanudar el movimiento' : 'Pausar el movimiento');
  pauseLabel.textContent = motionQuery.matches ? 'Sin movimiento' : manuallyPaused ? 'Reanudar' : 'Pausar';
  pause.disabled = motionQuery.matches;
  universe?.setPaused(manuallyPaused);
}

pause.addEventListener('click', () => { manuallyPaused = !manuallyPaused; syncMotion(); });
motionQuery.addEventListener('change', syncMotion);
document.querySelector('#open-flowers').addEventListener('click', () => { catalog.showModal(); universe?.setSuspended(true); });
document.querySelector('#close-flowers').addEventListener('click', () => catalog.close());
catalog.addEventListener('click', (event) => {
  const rect = catalog.getBoundingClientRect();
  if (event.target === catalog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) catalog.close();
});
catalog.addEventListener('close', () => universe?.setSuspended(false));

syncMotion();
try {
  universe = createUniverse({ canvas, labels: document.querySelector('#labels'), motionQuery, onSelect: showMessage, onFailure: fallback });
  html.classList.add('scene-ready');
} catch (error) {
  console.warn('No se pudo iniciar el universo 3D:', error.message);
  fallback();
}

if (import.meta.hot) import.meta.hot.dispose(() => universe?.destroy());
