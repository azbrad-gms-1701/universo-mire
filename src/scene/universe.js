import * as THREE from 'three';
import { createFlowerLibrary, createFlower, petalGeometry, flowerNames } from './flowers.js';
import { createAtmosphere } from '../effects/galactic-atmosphere.js';
import { spiralPoint, scatterPoint } from './galaxy.js';
import { translations } from '../data/translations.js';
import { random, damp, easeOut, TAU } from './math.js';

const anchors = [
  [-8.5, 4.3, 2], [8.4, 4, 1], [-7.8, -4.6, 1.8], [8, -4.9, 2.5],
  [1.1, 7.6, -1], [-1.7, -7.6, 1], [-12.8, .2, -3], [12.6, .1, -2],
  [-13.3, 7.5, -4], [13.6, -7, -3], [-4.6, 8.9, -5], [6.1, -8.5, -4],
  [-12.9, -7.4, -1], [12.5, 7.6, -3], [6.2, 8.1, -3],
];
const axes = [new THREE.Vector3(.12, .42, 1), new THREE.Vector3(.65, .08, 1), new THREE.Vector3(.2, 1, .8), new THREE.Vector3(-.65, .1, 1)].map(axis => axis.normalize());

export function createUniverse({ canvas, labels, motionQuery, onSelect, onFailure }) {
  const compact = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !compact, alpha: true, powerPreference: 'default' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c1021, .011);
  const camera = new THREE.PerspectiveCamera(46, 1, .1, 140);
  scene.add(new THREE.HemisphereLight(0xa8bcd8, 0x291c35, 1.0));
  const sunlight = new THREE.DirectionalLight(0xffe8b5, 2.3);
  sunlight.position.set(-4, 6, 13);
  scene.add(sunlight);
  const rim = new THREE.DirectionalLight(0x9daede, .8);
  rim.position.set(9, -4, -3);
  scene.add(rim);
  const coreLight = new THREE.PointLight(0xffc65a, 80, 30, 1.8);
  coreLight.position.z = 2;
  scene.add(coreLight);

  const library = createFlowerLibrary();
  const atmosphere = createAtmosphere(scene, compact, renderer);
  const flowerCount = compact ? 44 : 60;
  const flowers = [];
  const hits = [];
  const pointer = new THREE.Vector2(10, 10);
  const parallax = new THREE.Vector2();
  const smoothed = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const coreBounds = document.querySelector('.core');
  let width = 1, height = 1, portrait = false, horizontal = 1;
  let paused = false, suspended = false, reduced = motionQuery.matches;
  let focused = null, hovered = null, selected = null, selectedUntil = 0;
  let animationTime = 0, introTime = reduced ? 5 : 0, uiTime = 0;
  let frame = 0, stillTimer = 0, lastTime = 0, running = false;
  let slowFrames = 0, qualityReduced = false, frameCount = 0, frameElapsed = 0;
  let safeCore = { left: 0, right: 0, top: 0, bottom: 0 };
  const events = new AbortController();
  const eventOptions = { signal: events.signal };

  for (let i = 0; i < flowerCount; i++) {
    const flower = createFlower(library, i);
    let base;
    if (i < anchors.length) base = new THREE.Vector3(...anchors[i]);
    else {
      const radius = 6.5 + random(i + 6) * 15;
      base = new THREE.Vector3(...(i % 5 === 0 ? scatterPoint(i, radius) : spiralPoint(i, radius, 1.2)));
    }
    let scale = i < 15 ? .66 + random(i + 23) * .29 : .29 + random(i + 63) * .56;
    if (i === flowerCount - 2) { base.set(-12.8, -7.7, 10.5); scale = 1.6; }
    if (i === flowerCount - 1) { base.set(14.8, 5.7, 9); scale = 1.38; }
    Object.assign(flower, { index: i, base, scale, phase: random(i + 41) * TAU, angle: 0, hover: 0, speed: (.008 + random(i + 91) * .01) * (i % 2 ? -1 : 1), button: null, labelVisible: false, screenX: 0, screenY: 0 });
    if (i < translations.length) {
      const translation = translations[i];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'flower-target';
      button.setAttribute('aria-label', `${translation.language}: ${translation.text}`);
      const label = document.createElement('span');
      label.className = 'flower-label';
      const text = document.createElement('span');
      text.lang = translation.lang;
      text.dir = translation.dir || 'auto';
      text.textContent = translation.text;
      const language = document.createElement('small');
      language.textContent = `${translation.language} · ${flowerNames[flower.type]}`;
      label.append(text, language);
      button.append(label);
      labels.append(button);
      flower.button = button;
      button.addEventListener('pointerenter', () => { hovered = flower; }, eventOptions);
      button.addEventListener('pointerleave', () => { hovered = null; }, eventOptions);
      button.addEventListener('focus', () => { focused = flower; }, eventOptions);
      button.addEventListener('blur', () => { focused = null; }, eventOptions);
      button.addEventListener('click', () => selectFlower(flower), eventOptions);
    }
    hits.push(flower.petals, flower.heart);
    scene.add(flower.group);
    flowers.push(flower);
  }

  // Two draws per species, plus foliage only for the stemmed varieties.
  hits.length = 0;
  const batches = library.map((geometry, type) => {
    const entries = flowers.filter(flower => flower.type === type);
    const petals = new THREE.InstancedMesh(geometry.petals, entries[0].petals.material, entries.length);
    const hearts = new THREE.InstancedMesh(geometry.heart, entries[0].heart.material, entries.length);
    const foliage = geometry.foliage ? new THREE.InstancedMesh(geometry.foliage, new THREE.MeshStandardMaterial({ color: 0x67734a, roughness: .9, side: THREE.DoubleSide }), entries.length) : null;
    if (foliage) { foliage.instanceMatrix.setUsage(THREE.DynamicDrawUsage); foliage.frustumCulled = false; scene.add(foliage); }
    for (const mesh of [petals, hearts]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.userData.flowerIndices = entries.map(flower => flower.index);
      scene.add(mesh);
      hits.push(mesh);
    }
    entries.forEach((flower, index) => {
      scene.remove(flower.group);
      flower.batchIndex = index;
      petals.setColorAt(index, new THREE.Color(1, 1, 1));
      if (index > 0) { flower.petals.material.dispose(); flower.heart.material.dispose(); }
    });
    petals.instanceColor.setUsage(THREE.DynamicDrawUsage);
    return { petals, hearts, foliage, entries };
  });
  const instanceTint = new THREE.Color();

  // A handful of instanced petals revolve close to the heart of the universe.
  const petalMesh = new THREE.InstancedMesh(petalGeometry(.26, .07, .06), new THREE.MeshStandardMaterial({ color: 0xffd979, vertexColors: true, side: THREE.DoubleSide, roughness: .6, emissive: 0x9f6d15, emissiveIntensity: .3 }), 18);
  const dummy = new THREE.Object3D();
  petalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petalMesh.frustumCulled = false;
  scene.add(petalMesh);

  const pairs = [[0, 8], [8, 10], [1, 13], [13, 14], [2, 12], [3, 9], [9, 11]];
  const linePositions = new Float32Array(pairs.length * 6);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xd8b66f, transparent: true, opacity: .1, depthWrite: false });
  const constellation = new THREE.LineSegments(lineGeometry, lineMaterial);
  constellation.frustumCulled = false;
  scene.add(constellation);

  function selectFlower(flower) {
    selected = flower;
    selectedUntil = uiTime + 5;
    onSelect({ ...translations[flower.index % translations.length], flower: flowerNames[flower.type] });
    requestFrame();
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    portrait = width / height < 1;
    horizontal = THREE.MathUtils.clamp(width / height / 1.66, .32, 1.35);
    camera.aspect = width / height;
    camera.fov = portrait ? 50 : 46;
    camera.updateProjectionMatrix();
    atmosphere.resize(camera.aspect, horizontal, portrait);
    renderer.setPixelRatio(Math.min(devicePixelRatio, qualityReduced ? 1 : compact || portrait ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    const bounds = coreBounds.getBoundingClientRect();
    safeCore = { left: width / 2 - Math.min(150, width * .28), right: width / 2 + Math.min(150, width * .28), top: bounds.top - 18, bottom: bounds.bottom + 18 };
    requestFrame();
  }

  function pointerMove(event) {
    if (event.target.closest('dialog, .footer, .masthead')) return;
    pointer.set(event.clientX / width * 2 - 1, -event.clientY / height * 2 + 1);
    parallax.copy(pointer);
    requestFrame();
  }
  canvas.addEventListener('pointermove', pointerMove, { ...eventOptions, passive: true });
  labels.addEventListener('pointermove', pointerMove, { ...eventOptions, passive: true });
  canvas.addEventListener('pointerdown', pointerMove, { ...eventOptions, passive: true });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'touch') { pointerMove(event); pick(); }
    if (hovered) selectFlower(hovered);
  }, eventOptions);
  canvas.addEventListener('pointerleave', () => { pointer.set(10, 10); parallax.set(0, 0); hovered = null; }, eventOptions);

  function pick() {
    if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1) return;
    raycaster.setFromCamera(pointer, camera);
    const intersection = raycaster.intersectObjects(hits, false)[0];
    hovered = intersection ? flowers[intersection.object.userData.flowerIndices[intersection.instanceId]] : null;
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  }

  function projectLabels() {
    const occupied = [];
    const active = focused || selected || hovered;
    let shown = 0;
    // Active labels win collision checks; primary labels remain understated.
    const ordered = active?.button ? [active, ...flowers.filter(f => f !== active && f.button)] : flowers.filter(f => f.button);
    for (const flower of ordered) {
      projected.copy(flower.group.position).project(camera);
      const x = (projected.x * .5 + .5) * width;
      const y = (-projected.y * .5 + .5) * height;
      flower.screenX = x;
      flower.screenY = y;
      const inCore = x > safeCore.left && x < safeCore.right && y > safeCore.top && y < safeCore.bottom;
      const withinView = projected.z > -1 && projected.z < 1 && x > 32 && x < width - 32 && y > 80 && y < height - 125 && !inCore;
      const focusedButton = document.activeElement === flower.button;
      flower.button.hidden = !withinView && !focusedButton;
      if (!withinView && !focusedButton) continue;
      const bx = focusedButton ? THREE.MathUtils.clamp(x, 40, width - 40) : x;
      const by = focusedButton ? THREE.MathUtils.clamp(y, 90, height - 130) : y;
      flower.button.style.left = `${bx.toFixed(1)}px`;
      flower.button.style.top = `${by.toFixed(1)}px`;
      const labelHalf = portrait ? 75 : 105;
      const labelX = THREE.MathUtils.clamp(bx, labelHalf + 12, width - labelHalf - 12);
      flower.button.firstElementChild.style.left = `${26 + labelX - bx}px`;
      const labelHitsCore = labelX + labelHalf > safeCore.left && labelX - labelHalf < safeCore.right && by + 31 < safeCore.bottom && by + 85 > safeCore.top;
      flower.button.firstElementChild.style.visibility = labelHitsCore ? 'hidden' : 'visible';
      const isActive = flower === active;
      const collides = occupied.some(p => Math.abs(p.x - x) < (portrait ? 135 : 185) && Math.abs(p.y - y) < 85);
      const awayFromEdge = x > (portrait ? 75 : 110) && x < width - (portrait ? 75 : 110);
      const show = isActive || (!selected && flower.index < 8 && awayFromEdge && !collides && shown < (portrait ? 2 : 4));
      flower.button.classList.toggle('is-active', isActive);
      flower.button.classList.toggle('is-visible', show && introTime > 3.5);
      if (show) { occupied.push({ x, y }); shown++; }
    }
  }

  function update(now) {
    running = false;
    if (document.hidden || suspended) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60;
    const rawDelta = lastTime ? (now - lastTime) / 1000 : dt;
    lastTime = now;
    uiTime += rawDelta;
    const moving = !paused && !reduced;
    if (moving) { animationTime += dt; introTime = Math.min(5, introTime + rawDelta); }
    if (reduced) introTime = 5;
    if (selected && uiTime > selectedUntil) { selected = null; onSelect(null); }
    const intro = easeOut(Math.min(1, introTime / 4.5));
    if (moving) smoothed.lerp(parallax, damp(1.7, dt));
    const z = (portrait ? 28 : 27) + (1 - intro) * 11;
    if (moving || frameCount === 0) {
      camera.position.set(smoothed.x * (portrait ? .9 : 1.6) + (reduced ? 0 : Math.sin(animationTime * .09) * .18), smoothed.y * .9, z);
      cameraTarget.set(0, portrait ? .3 : 0, 0);
      camera.lookAt(cameraTarget);
    }
    camera.updateMatrixWorld();

    let visibleCount = 0;
    for (const flower of flowers) {
      const active = flower === hovered || flower === focused || flower === selected;
      flower.hover += ((active ? 1 : 0) - flower.hover) * damp(6, dt);
      if (moving) flower.angle += dt * flower.speed * (active ? .13 : 1);
      flower.group.position.copy(flower.base).applyAxisAngle(axes[flower.index % axes.length], flower.angle);
      flower.group.position.x *= horizontal;
      flower.group.position.y *= portrait ? 1.25 : 1;
      flower.group.position.y += Math.sin(animationTime * .19 + flower.phase) * .18;
      flower.group.position.z += Math.sin(animationTime * .13 + flower.phase) * .42;
      if (moving) flower.group.rotation.z += dt * (.018 + random(flower.index) * .018) * (active ? .25 : 1);
      flower.group.scale.setScalar(flower.scale * (portrait ? .78 : 1) * (.75 + intro * .25) * (1 + flower.hover * .16));
      // Reserve a soft rectangle around the dedication, even while flowers orbit.
      projected.copy(flower.group.position).project(camera);
      const coreX = (safeCore.left + safeCore.right) / 2;
      const coreY = (safeCore.top + safeCore.bottom) / 2;
      const radiusX = (safeCore.right - safeCore.left) / 2 + 30;
      const radiusY = (safeCore.bottom - safeCore.top) / 2 + 28;
      let dx = (projected.x * .5 + .5) * width - coreX;
      const dy = (-projected.y * .5 + .5) * height - coreY;
      if (Math.abs(dx) + Math.abs(dy) < .1) dx = .1;
      const coreDistance = Math.pow((dx / radiusX) ** 4 + (dy / radiusY) ** 4, .25);
      if (coreDistance < 1) {
        projected.x = ((coreX + dx / coreDistance) / width - .5) * 2;
        projected.y = -((coreY + dy / coreDistance) / height - .5) * 2;
        flower.group.position.copy(projected.unproject(camera));
      }
      flower.group.updateMatrix();
      const batch = batches[flower.type];
      batch.petals.setMatrixAt(flower.batchIndex, flower.group.matrix);
      batch.hearts.setMatrixAt(flower.batchIndex, flower.group.matrix);
      batch.foliage?.setMatrixAt(flower.batchIndex, flower.group.matrix);
      instanceTint.setRGB(1 + flower.hover * .55, 1 + flower.hover * .45, 1 + flower.hover * .25);
      batch.petals.setColorAt(flower.batchIndex, instanceTint);
      projected.copy(flower.group.position).project(camera);
      if (Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1 && projected.z < 1) visibleCount++;
    }
    for (const batch of batches) {
      batch.petals.instanceMatrix.needsUpdate = true;
      batch.hearts.instanceMatrix.needsUpdate = true;
      if (batch.foliage) batch.foliage.instanceMatrix.needsUpdate = true;
      batch.petals.instanceColor.needsUpdate = true;
      batch.petals.computeBoundingSphere();
      batch.hearts.computeBoundingSphere();
    }

    for (let i = 0; i < petalMesh.count; i++) {
      const a = i / petalMesh.count * TAU + animationTime * (.014 + random(i) * .013);
      const radius = 3.2 + random(i + 17) * 2;
      dummy.position.set(Math.cos(a) * radius * horizontal, Math.sin(a) * radius * .8, Math.sin(a * 2 + i) * 2);
      dummy.rotation.set(a, a * .5, a + i);
      dummy.scale.setScalar(.4 + random(i + 56) * .6);
      dummy.updateMatrix();
      petalMesh.setMatrixAt(i, dummy.matrix);
    }
    petalMesh.instanceMatrix.needsUpdate = true;
    pairs.forEach(([a, b], index) => {
      flowers[a].group.position.toArray(linePositions, index * 6);
      flowers[b].group.position.toArray(linePositions, index * 6 + 3);
    });
    lineGeometry.attributes.position.needsUpdate = true;
    lineMaterial.opacity = .055 + (Math.sin(animationTime * .23) * .5 + .5) * .075;
    atmosphere.update(animationTime, renderer.getPixelRatio());
    coreLight.intensity = 80 + Math.sin(animationTime * .55) * 5;
    scene.updateMatrixWorld();
    if (frameCount % 3 === 0) pick();
    projectLabels();
    renderer.render(scene, camera);
    frameCount++;
    frameElapsed += rawDelta;
    if (moving && introTime >= 5 && !qualityReduced) {
      slowFrames = rawDelta > .026 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 18) { qualityReduced = true; atmosphere.reduceQuality(); resize(); }
    }
    if (frameCount % 60 === 0) {
      canvas.dataset.flowers = String(flowerCount);
      canvas.dataset.varieties = String(library.length);
      canvas.dataset.languages = String(translations.length);
      canvas.dataset.visibleFlowers = String(visibleCount);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.fps = String(Math.round(60 / frameElapsed));
      canvas.dataset.quality = qualityReduced ? 'balanced' : compact ? 'mobile' : 'full';
      frameElapsed = 0;
    }
    // 60 fps when animated; a light 12 fps interaction loop in the still state.
    if (moving) requestFrame();
    else stillTimer = window.setTimeout(requestFrame, 80);
  }

  function requestFrame() {
    if (!running && !document.hidden && !suspended) {
      window.clearTimeout(stillTimer);
      running = true;
      frame = requestAnimationFrame(update);
    }
  }
  function stop() { cancelAnimationFrame(frame); clearTimeout(stillTimer); running = false; lastTime = 0; }
  document.addEventListener('visibilitychange', () => { stop(); if (!document.hidden) requestFrame(); }, eventOptions);
  addEventListener('resize', resize, eventOptions);
  motionQuery.addEventListener('change', () => {
    reduced = motionQuery.matches;
    if (reduced) { introTime = 5; smoothed.set(0, 0); camera.position.set(0, 0, portrait ? 28 : 27); camera.lookAt(0, portrait ? .3 : 0, 0); }
    requestFrame();
  }, eventOptions);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); stop(); onFailure(); }, eventOptions);
  canvas.addEventListener('webglcontextrestored', () => { location.reload(); }, eventOptions);
  resize();
  camera.position.set(0, 0, reduced ? (portrait ? 28 : 27) : 38);
  camera.lookAt(0, portrait ? .3 : 0, 0);
  requestFrame();

  return {
    setPaused(value) { paused = value; introTime = 5; requestFrame(); },
    setSuspended(value) { suspended = value; stop(); if (!value) requestFrame(); },
    destroy() {
      stop(); events.abort();
      atmosphere.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      materials.forEach(material => { if (material.map) textures.add(material.map); material.dispose(); });
      geometries.forEach(geometry => geometry.dispose());
      textures.forEach(texture => texture.dispose());
      renderer.dispose(); labels.replaceChildren();
    },
  };
}
