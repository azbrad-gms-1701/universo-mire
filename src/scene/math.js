export const TAU = Math.PI * 2;

export function random(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export const damp = (rate, delta) => 1 - Math.exp(-rate * delta);
export const easeOut = (value) => 1 - (1 - value) ** 3;
