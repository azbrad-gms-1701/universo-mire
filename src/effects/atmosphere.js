import * as THREE from 'three';
import { random, TAU } from '../scene/math.js';

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#fff9e5cc');
  gradient.addColorStop(.15, '#ffedbb55');
  gradient.addColorStop(.45, '#edbd5715');
  gradient.addColorStop(1, '#edbd5700');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function particles(count, radius, color, size, dust = false) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = random(i + count) * TAU;
    const r = radius * (.12 + Math.sqrt(random(i + 301)) * .88);
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r * (dust ? .54 : .8);
    positions[i * 3 + 2] = (random(i + 96) - .5) * radius * (dust ? 1.1 : 1.8) - (dust ? 0 : 10);
    sizes[i] = size * (.35 + random(i + 74) * 1.1);
    phases[i] = random(i + 173) * TAU;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRatio: { value: 1 }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: dust ? .58 : .74 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uRatio;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * .11 + aPhase) * .14;
        vec4 view = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(aSize * uRatio * 34. / max(3., -view.z), .7, 8. * uRatio);
        vAlpha = .68 + .32 * sin(uTime * .6 + aPhase);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        float glow = exp(-d * d * 5.) * smoothstep(1., .65, d);
        gl_FragColor = vec4(uColor, glow * vAlpha * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Points(geometry, material);
}

export function createAtmosphere(scene, compact) {
  const texture = glowTexture();
  const stars = particles(compact ? 650 : 1300, 52, 0xc4cee5, 1.7);
  const dust = particles(compact ? 230 : 480, 23, 0xffd67b, 2.2, true);
  const near = particles(compact ? 45 : 90, 20, 0xffe4a4, 2.7, true);
  near.position.z = 5;
  scene.add(stars, dust, near);

  function glow(color, scale, opacity, x = 0, y = 0, z = 0) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color, opacity, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sprite.scale.set(scale, scale, 1);
    sprite.position.set(x, y, z);
    scene.add(sprite);
    return sprite;
  }
  const halo = glow(0xffcf6f, 20, .7, 0, 0, -3);
  const haze = glow(0x555488, 37, .22, -14, 5, -18);
  haze.scale.x = 55;
  glow(0x7c5f38, 26, .2, 14, -3, -10);

  const rings = new THREE.Group();
  for (let j = 0; j < 3; j++) {
    const positions = [];
    for (let i = 0; i <= 192; i++) {
      const a = i / 192 * TAU;
      positions.push(new THREE.Vector3(Math.cos(a) * (5.1 + j * 2.5), Math.sin(a) * (4.2 + j * 1.7), 0));
    }
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(positions), new THREE.LineBasicMaterial({ color: 0xd3af67, transparent: true, opacity: .075 - j * .015, depthWrite: false }));
    ring.rotation.set(.65 + j * .34, .25 - j * .25, -.4 + j * .9);
    rings.add(ring);
  }
  scene.add(rings);

  // A small golden torus of dust, with real thickness rather than a flat ring.
  const coreDust = particles(compact ? 130 : 230, 5, 0xffd78e, 1.4, true);
  const p = coreDust.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = i / p.count * TAU;
    const radius = 3.8 + random(i + 8) * 1.5;
    p.setXYZ(i, Math.cos(a) * radius, Math.sin(a) * radius * .66, (random(i + 17) - .5) * 2);
  }
  coreDust.rotation.z = -.32;
  scene.add(coreDust);

  return {
    glow,
    update(time, ratio) {
      for (const points of [stars, dust, near, coreDust]) {
        points.material.uniforms.uTime.value = time;
        points.material.uniforms.uRatio.value = ratio;
      }
      stars.rotation.y = time * .0015;
      dust.rotation.z = time * -.004;
      near.rotation.y = time * .008;
      coreDust.rotation.y = Math.sin(time * .07) * .2;
      halo.material.opacity = .7 + Math.sin(time * .65) * .035;
      rings.rotation.y = Math.sin(time * .04) * .12;
    },
    reduceQuality() {
      stars.geometry.setDrawRange(0, Math.floor(stars.geometry.attributes.position.count * .65));
      dust.geometry.setDrawRange(0, Math.floor(dust.geometry.attributes.position.count * .7));
    },
  };
}
