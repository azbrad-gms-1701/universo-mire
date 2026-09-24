import * as THREE from 'three';
import { random, TAU } from '../scene/math.js';
import { spiralPoint, scatterPoint } from '../scene/galaxy.js';

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#fff4dfff');
  gradient.addColorStop(.12, '#ffe3a699');
  gradient.addColorStop(.45, '#c9904325');
  gradient.addColorStop(1, '#c9904300');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function starCloud(count, kind) {
  const positions = [], sizes = [], phases = [], colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = kind === 'galaxy' ? 2 + Math.pow(random(i + 711), .7) * 24 : 12 + random(i + 3) * 48;
    const point = kind === 'galaxy' ? spiralPoint(i, r, 1.7) : scatterPoint(i, r);
    if (kind === 'stars') point[2] -= 15;
    positions.push(...point);
    sizes.push(kind === 'galaxy' ? .75 + random(i + 371) * 2.2 : 1.1 + Math.pow(random(i + 172), 5) * 5.5);
    phases.push(random(i + 591) * TAU);
    color.set(kind === 'galaxy' ? (random(i + 971) < .8 ? '#efd3a0' : '#99afcf') : (i % 6 ? '#a8badb' : '#ffefce'));
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRatio: { value: 1 }, uOpacity: { value: kind === 'galaxy' ? .75 : .87 } },
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uRatio;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec3 p = position;
        p.z += sin(uTime * .08 + aPhase) * .18;
        vec4 view = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(aSize * uRatio * 42. / max(3., -view.z), .8, 10. * uRatio);
        vAlpha = .7 + .3 * sin(uTime * .7 + aPhase);
        vColor = color;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec2 p = gl_PointCoord - .5;
        float d = length(p) * 2.;
        float glow = exp(-d*d*5.) * (1.-smoothstep(.7,1.,d));
        float rays = exp(-abs(p.x)*70.-abs(p.y)*10.)+exp(-abs(p.y)*70.-abs(p.x)*10.);
        gl_FragColor = vec4(vColor, (glow+rays*.1)*vAlpha*uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Points(geometry, material);
}

function nebulaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAspect: { value: 1 } },
    depthWrite: false, depthTest: false,
    vertexShader: `varying vec2 vUv; void main() { vUv=uv; gl_Position=vec4(position.xy,.9999,1.); }`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uAspect;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
      }
      float fbm(vec2 p) {
        float sum=0., amplitude=.5;
        for(int i=0; i<4; i++) { sum+=noise(p)*amplitude; p=mat2(.8,.6,-.6,.8)*p*2.04+2.1; amplitude*=.5; }
        return sum;
      }
      void main() {
        vec2 p=(vUv-.5)*vec2(max(uAspect,.85),1.);
        p=mat2(.946,-.324,.324,.946)*p;
        vec2 disk=p/vec2(1.,.65);
        float r=length(disk), angle=atan(disk.y,disk.x);
        float cloud=fbm(p*7.+vec2(uTime*.003,-uTime*.002));
        float detail=fbm(p*17.+cloud*2.);
        float arm=pow(.5+.5*cos(angle*2.-r*10.+cloud*2.),6.);
        float band=arm*exp(-r*1.35)*smoothstep(.07,.27,r);
        float veil=smoothstep(.22,.75,cloud)*exp(-r*.65);
        vec3 color=vec3(.012,.018,.043);
        color+=vec3(.043,.049,.10)*veil;
        color+=vec3(.23,.143,.055)*band*(.4+detail)*.8;
        color+=vec3(.095,.074,.034)*exp(-r*r*9.)*(.5+cloud);
        color*=1.-smoothstep(.35,1.4,r)*.35;
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createAtmosphere(scene, compact, renderer) {
  const texture=glowTexture();
  const stars=starCloud(compact ? 1900 : 3300,'stars');
  const spiral=starCloud(compact ? 4700 : 9000,'galaxy');
  scene.add(stars,spiral);
  // The soft clouds need little resolution and drift slowly. Cache them at 8 Hz
  // so the expensive noise shader does not run over every display pixel/frame.
  const cloudTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
  });
  const cloudScene = new THREE.Scene();
  const cloudCamera = new THREE.Camera();
  const cloudMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nebulaMaterial());
  cloudMesh.frustumCulled = false;
  cloudScene.add(cloudMesh);
  let lastCloudTime = -Infinity;
  const nebula = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uCloud: { value: cloudTarget.texture } },
    depthWrite: false, depthTest: false,
    vertexShader: `varying vec2 vUv; void main() { vUv=uv; gl_Position=vec4(position.xy,.9999,1.); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uCloud;
      void main() {
        gl_FragColor = texture2D(uCloud, vUv);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  nebula.frustumCulled=false;
  nebula.renderOrder=-100;
  scene.add(nebula);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xf4c876,opacity:.43,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  halo.position.z=-7;
  halo.scale.set(22,17,1);
  scene.add(halo);
  const bokeh=new THREE.Group();
  for(let i=0;i<(compact?7:13);i++) {
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xe8c484,transparent:true,opacity:.11+random(i+501)*.09,depthWrite:false,blending:THREE.AdditiveBlending}));
    sprite.position.set(...scatterPoint(i+70,8+random(i)*12));
    sprite.position.z=10+random(i+51)*5;
    sprite.scale.setScalar(.22+random(i+39)*.7);
    bokeh.add(sprite);
  }
  scene.add(bokeh);
  const meteor=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(2.4,.7,-.5)]),new THREE.LineBasicMaterial({color:0xffdfa0,transparent:true,opacity:0,depthWrite:false}));
  meteor.position.z=-15;
  scene.add(meteor);
  return {
    resize(aspect,horizontal,portrait) {
      cloudMesh.material.uniforms.uAspect.value = aspect;
      const cloudWidth = Math.round(Math.min(768, (compact ? 256 : 360) * aspect));
      cloudTarget.setSize(cloudWidth, Math.max(1, Math.round(cloudWidth / aspect)));
      lastCloudTime = -Infinity;
      spiral.scale.set(horizontal,portrait?1.25:1,1);
      bokeh.scale.set(horizontal,portrait?1.15:1,1);
    },
    update(time,ratio) {
      for(const points of [stars,spiral]) {
        points.material.uniforms.uTime.value=time;
        points.material.uniforms.uRatio.value=ratio;
      }
      if (time - lastCloudTime >= .125) {
        cloudMesh.material.uniforms.uTime.value = time;
        const previousTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(cloudTarget);
        renderer.render(cloudScene, cloudCamera);
        renderer.setRenderTarget(previousTarget);
        lastCloudTime = time;
      }
      stars.rotation.y=time*.0008;
      spiral.rotation.z=Math.sin(time*.012)*.035;
      bokeh.rotation.z=time*.003;
      halo.material.opacity=.43+Math.sin(time*.55)*.025;
      const passage=(time+9)%48;
      meteor.material.opacity=passage<1.8?Math.sin(passage/1.8*Math.PI)*.5:0;
      meteor.position.x=20-passage*13;
      meteor.position.y=10-passage*3;
    },
    reduceQuality() {
      spiral.geometry.setDrawRange(0,Math.floor(spiral.geometry.attributes.position.count*.7));
      stars.geometry.setDrawRange(0,Math.floor(stars.geometry.attributes.position.count*.75));
    },
    dispose() {
      cloudTarget.dispose();
      cloudMesh.geometry.dispose();
      cloudMesh.material.dispose();
    },
  };
}
