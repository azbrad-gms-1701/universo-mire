import { random, TAU } from './math.js';

// Two spiral arms with real thickness, shared by flowers and stardust.
export function spiralPoint(index, radius, spread = 1) {
  const angle = index % 2 * Math.PI + radius * .31 + (random(index + 21) - .5) * .55 * spread;
  const r = radius + (random(index + 48) - .5) * 1.7 * spread;
  const x = Math.cos(angle) * r, y = Math.sin(angle) * r * .69;
  return [x * .946 + y * .324, -x * .324 + y * .946, Math.sin(angle) * radius * .28 + (random(index + 82) - .5) * 3.7 * spread - 4];
}

export function scatterPoint(index, radius) {
  const angle = random(index + 112) * TAU;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius * .7, (random(index + 197) - .5) * 24 - 5];
}
