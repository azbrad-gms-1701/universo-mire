import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { random, TAU } from './math.js';

// Each petal is a curved surface, with a warm throat and a lighter rim.
// Shared merged geometry keeps a whole blossom to just two draw calls.
export function petalGeometry(length, width, cup, tint = 0) {
  const rows = 7;
  const columns = 4;
  const vertices = [], colors = [], indices = [];
  const base = new THREE.Color('#bd7413');
  const tip = new THREE.Color().setHSL(.132 + tint, .96, .55);
  const color = new THREE.Color();
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const shape = Math.pow(Math.sin(Math.PI * t), .65);
    for (let col = 0; col <= columns; col++) {
      const u = col / columns * 2 - 1;
      const x = u * width * shape;
      const y = .12 + t * length;
      const z = cup * t * t + .14 * u * u * shape - .11 * Math.sin(t * Math.PI) + .025 * Math.cos(u * 3 * Math.PI) * shape;
      vertices.push(x, y, z);
      color.copy(base).lerp(tip, .27 + .73 * Math.sin(t * Math.PI / 2));
      color.multiplyScalar(1 - .07 * Math.abs(u));
      colors.push(color.r, color.g, color.b);
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col;
        indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const recipes = [
  // daisy, sunflower, ranunculus, tulip, wildflower, fantasy blossom
  [[13, 1.08, .22, .21], [11, .82, .21, .3]],
  [[18, 1.17, .19, .11], [15, .94, .19, .25]],
  [[13, .98, .34, .25], [12, .8, .32, .38], [10, .62, .29, .5], [8, .43, .23, .6]],
  [[3, .88, .55, 1.12], [3, .76, .53, 1.2]],
  [[5, .94, .42, .24], [5, .65, .26, .32]],
  [[9, 1.22, .16, .19], [9, .74, .23, .48]],
];

export function createFlowerLibrary() {
  return recipes.map((layers, type) => {
    const parts = [];
    layers.forEach(([count, length, width, cup], layer) => {
      for (let petal = 0; petal < count; petal++) {
        const geometry = petalGeometry(length * (1 + random(petal + layer * 20) * .07), width, cup, type === 1 ? -.018 : type === 2 ? .012 : 0);
        geometry.rotateZ(petal / count * TAU + layer * .27);
        geometry.translate(0, 0, layer * .055);
        parts.push(geometry);
      }
    });
    const petals = mergeGeometries(parts);
    parts.forEach(part => part.dispose());
    const radius = [ .23, .37, .13, .13, .19, .18 ][type];
    const center = new THREE.SphereGeometry(radius, 14, 8);
    center.scale(1, 1, .45);
    center.translate(0, 0, .08);
    const seeds = [center];
    const seedCount = type === 1 ? 96 : 38;
    for (let i = 0; i < seedCount; i++) {
      const a = i * 2.399963;
      const r = Math.sqrt((i + .5) / seedCount) * radius;
      const seed = new THREE.SphereGeometry(type === 1 ? .027 : .023, 4, 3);
      seed.translate(Math.cos(a) * r, Math.sin(a) * r, .09 + .12 * (1 - r / radius));
      seeds.push(seed);
    }
    const heart = mergeGeometries(seeds);
    seeds.forEach(part => part.dispose());
    return { petals, heart };
  });
}

export function createFlower(library, index) {
  const type = index % library.length;
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(.12, .2, .88 + random(index) * .1),
    vertexColors: true,
    roughness: .56,
    metalness: .035,
    side: THREE.DoubleSide,
    emissive: 0xd19525,
    emissiveIntensity: .08,
  });
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: type === 1 ? 0x55300b : type === 2 ? 0xd9992b : 0xa56818,
    roughness: .9,
    emissive: 0x73400b,
    emissiveIntensity: .12,
  });
  const group = new THREE.Group();
  const petals = new THREE.Mesh(library[type].petals, petalMaterial);
  const heart = new THREE.Mesh(library[type].heart, centerMaterial);
  group.add(petals, heart);
  group.rotation.set((random(index + 50) - .5) * 1.2, (random(index + 80) - .5) * 1.25, random(index + 90) * TAU);
  petals.userData.flowerIndex = index;
  heart.userData.flowerIndex = index;
  return { group, petals, heart, type };
}
