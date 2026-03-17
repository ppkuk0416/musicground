import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { THEMES } from './themes.js';

const _MAX_PARTICLES = 4000;

export class MusicScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.themeName = 'cosmic';
    this.theme = THEMES.cosmic;
    this.sensitivity = 1.0;
    this._baseParticleSize = THEMES.cosmic.particleSize;
    this._visibleParticleCount = THEMES.cosmic.particleCount;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._buildScene();

    this._initComposer();

    this._clock = new THREE.Clock();
    this._time = 0;

    this._animate = this._animate.bind(this);
    this._animate();

    window.addEventListener('resize', () => this._onResize());
  }

  // ─────────────────────────────────────
  //  초기화
  // ─────────────────────────────────────
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.theme.fog, 0.015);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 0, 50);
  }

  // ─────────────────────────────────────
  //  씬 구성
  // ─────────────────────────────────────
  _buildScene() {
    this._buildBackground();
    this._buildParticles();
    this._buildWaveRing();
    this._buildCoreOrb();
    this._buildFreqBars();
    this._buildAmbientLight();
  }

  _buildBackground() {
    const geo = new THREE.SphereGeometry(500, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: this.theme.bg[0],
      side: THREE.BackSide,
    });
    this.bgMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.bgMesh);
  }

  _buildParticles() {
    const t = this.theme;
    const count = _MAX_PARTICLES;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const c1 = new THREE.Color(t.primary[0]);
    const c2 = new THREE.Color(t.secondary[0]);

    for (let i = 0; i < count; i++) {
      const r = 30 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const mix = Math.random();
      const col = c1.clone().lerp(c2, mix);
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      scales[i] = 0.5 + Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale',   new THREE.BufferAttribute(scales, 1));
    geo.setDrawRange(0, t.particleCount);

    const tex = this._makeCircleTexture(64);

    this._particleMat = new THREE.PointsMaterial({
      size: t.particleSize,
      map: tex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geo, this._particleMat);
    this._particleOrigins = positions.slice();
    this.scene.add(this.particles);
  }

  _makeCircleTexture(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  _buildWaveRing() {
    const segments = 256;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions[i * 3]     = Math.cos(angle) * 20;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * 20;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(Array.from({ length: segments + 1 }, (_, i) => i % segments));

    this._wavePositions = positions;
    this._waveGeo = geo;

    const mat = new THREE.LineBasicMaterial({
      color: this.theme.primary[0],
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.waveRing = new THREE.LineLoop(geo, mat);
    this.scene.add(this.waveRing);

    this.waveRing2 = this.waveRing.clone();
    this.waveRing2.material = mat.clone();
    this.waveRing2.material.color.set(this.theme.secondary[0]);
    this.waveRing2.scale.set(1.3, 1.3, 1.3);
    this.scene.add(this.waveRing2);
  }

  _buildCoreOrb() {
    const geo = new THREE.IcosahedronGeometry(5, 6);
    const mat = new THREE.MeshPhongMaterial({
      color: this.theme.primary[0],
      emissive: this.theme.primary[1],
      emissiveIntensity: 0.5,
      wireframe: false,
      transparent: true,
      opacity: 0.9,
    });

    this.coreOrb = new THREE.Mesh(geo, mat);
    this.scene.add(this.coreOrb);

    const glowGeo = new THREE.IcosahedronGeometry(6, 4);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.theme.primary[0],
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    this.coreGlow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(this.coreGlow);

    const wireMat = new THREE.MeshBasicMaterial({
      color: this.theme.accent[0],
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    this.coreWire = new THREE.Mesh(glowGeo.clone(), wireMat);
    this.coreWire.scale.set(1.2, 1.2, 1.2);
    this.scene.add(this.coreWire);
  }

  _buildFreqBars() {
    const barCount = 64;
    this._freqBars = [];

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 12;

      const geo = new THREE.BoxGeometry(0.3, 1, 0.3);
      const mat = new THREE.MeshBasicMaterial({
        color: this.theme.secondary[0],
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });

      const bar = new THREE.Mesh(geo, mat);
      bar.position.x = Math.cos(angle) * radius;
      bar.position.z = Math.sin(angle) * radius;
      bar.userData.angle = angle;
      bar.userData.radius = radius;

      this.scene.add(bar);
      this._freqBars.push(bar);
    }
  }

  _initComposer() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      1.2,   // strength
      0.4,   // radius
      0.1,   // threshold
    );
    this.composer.addPass(this._bloomPass);
    this.composer.addPass(new OutputPass());
  }

  _buildAmbientLight() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    this._pointLight = new THREE.PointLight(this.theme.primary[0], 2, 60);
    this._pointLight.position.set(0, 0, 0);
    this.scene.add(this._pointLight);

    this._beatLight = new THREE.PointLight(this.theme.accent[0], 0, 80);
    this._beatLight.position.set(0, 20, 0);
    this.scene.add(this._beatLight);
  }

  // ─────────────────────────────────────
  //  테마 전환
  // ─────────────────────────────────────
  setTheme(name) {
    if (name === this.themeName) return;
    this.themeName = name;
    this.theme = THEMES[name];
    this._applyThemeColors(this.theme);
    this._baseParticleSize = this.theme.particleSize;
    this.setParticleDensity(this.theme.particleCount / _MAX_PARTICLES);
  }

  /** 임의 테마 오브젝트를 직접 적용 (커스텀 색상용) */
  applyCustomTheme(themeObj) {
    this.themeName = 'custom';
    this.theme = themeObj;
    this._applyThemeColors(themeObj);
    this._baseParticleSize = themeObj.particleSize || 1.5;
  }

  _applyThemeColors(t) {
    this.bgMesh.material.color.set(t.bg[0]);
    this.scene.fog.color.set(t.fog);

    this.waveRing.material.color.set(t.primary[0]);
    this.waveRing2.material.color.set(t.secondary[0]);

    this.coreOrb.material.color.set(t.primary[0]);
    this.coreOrb.material.emissive.set(t.primary[1]);
    this.coreGlow.material.color.set(t.primary[0]);
    this.coreWire.material.color.set(t.accent[0]);

    this._pointLight.color.set(t.primary[0]);
    this._beatLight.color.set(t.accent[0]);

    const colors = this.particles.geometry.attributes.color;
    const c1 = new THREE.Color(t.primary[0]);
    const c2 = new THREE.Color(t.secondary[0]);
    for (let i = 0; i < colors.count; i++) {
      const col = c1.clone().lerp(c2, Math.random());
      colors.setXYZ(i, col.r, col.g, col.b);
    }
    colors.needsUpdate = true;

    this._freqBars.forEach(bar => bar.material.color.set(t.secondary[0]));
  }

  // ─────────────────────────────────────
  //  감도 / 파티클 밀도 조절
  // ─────────────────────────────────────
  setSensitivity(val) {
    this.sensitivity = Math.max(0.2, Math.min(4, val));
  }

  setParticleDensity(frac) {
    const n = Math.floor(Math.max(0.05, Math.min(1, frac)) * _MAX_PARTICLES);
    this._visibleParticleCount = n;
    this.particles.geometry.setDrawRange(0, n);
  }

  // ─────────────────────────────────────
  //  오디오 데이터로 씬 갱신
  // ─────────────────────────────────────
  updateAudio(analyzer) {
    if (!analyzer || !analyzer.isActive) return;

    const { bass, mid, treble, energy, beat, freqData } = analyzer;
    const s = this.sensitivity;
    const bn = Math.min((bass   / 255) * s, 1);
    const mn = Math.min((mid    / 255) * s, 1);
    const tn = Math.min((treble / 255) * s, 1);
    const en = Math.min(energy  * s, 1);

    // 코어 오브 크기
    const targetScale = 1 + bn * 1.8 + en * 0.5;
    const sc = this.coreOrb.scale;
    sc.x += (targetScale - sc.x) * 0.12;
    sc.y = sc.z = sc.x;
    this.coreGlow.scale.copy(sc).multiplyScalar(1.1);
    this.coreWire.scale.copy(sc).multiplyScalar(1.2);

    this.coreOrb.material.emissiveIntensity = 0.3 + bn * 1.5;
    this.coreGlow.material.opacity = 0.05 + en * 0.25;

    // 비트 플래시
    if (beat) {
      this._beatLight.intensity = 8 + bn * 12;
    } else {
      this._beatLight.intensity *= 0.85;
    }

    this._pointLight.intensity = 1 + en * 3;

    // 파형 링
    if (freqData) {
      const count = this._wavePositions.length / 3;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const freqIdx = Math.floor((i / count) * freqData.length * 0.5);
        const amp = (freqData[freqIdx] / 255) * 10 * s;
        const r = 20 + amp;
        this._wavePositions[i * 3]     = Math.cos(angle) * r;
        this._wavePositions[i * 3 + 2] = Math.sin(angle) * r;
        this._wavePositions[i * 3 + 1] = (freqData[freqIdx + 1] / 255 - 0.5) * 8 * Math.min(s, 2);
      }
      this._waveGeo.attributes.position.needsUpdate = true;
    }

    // 주파수 막대
    if (freqData && this._freqBars.length > 0) {
      this._freqBars.forEach((bar, i) => {
        const freqIdx = Math.floor((i / this._freqBars.length) * freqData.length * 0.5);
        const val = Math.min((freqData[freqIdx] / 255) * s, 1);
        const targetH = 0.2 + val * 12;
        bar.scale.y += (targetH - bar.scale.y) * 0.2;
        bar.position.y = bar.scale.y * 0.5;

        if (beat && val > 0.7) {
          bar.material.color.set(this.theme.accent[0]);
        } else {
          bar.material.color.lerpColors(
            new THREE.Color(this.theme.secondary[0]),
            new THREE.Color(this.theme.accent[0]),
            val,
          );
        }
      });
    }

    // 파티클 맥동 — 가시 파티클만 처리
    const pos = this.particles.geometry.attributes.position;
    const origin = this._particleOrigins;
    const pCount = this._visibleParticleCount;
    const factor = 1 + bn * 0.08 + mn * 0.04;
    for (let i = 0; i < pCount; i++) {
      pos.setXYZ(
        i,
        origin[i * 3]     * factor,
        origin[i * 3 + 1] * factor,
        origin[i * 3 + 2] * factor,
      );
    }
    pos.needsUpdate = true;

    this._particleMat.size = this._baseParticleSize * (1 + en * 0.8);

    // Bloom — 비트/에너지에 반응
    this._bloomPass.strength = beat
      ? 1.8 + bn * 1.2
      : 1.0 + en * 0.8;
  }

  // ─────────────────────────────────────
  //  애니메이션 루프
  // ─────────────────────────────────────
  _animate() {
    requestAnimationFrame(this._animate);
    const delta = this._clock.getDelta();
    this._time += delta;
    const t = this._time;

    this.camera.position.x = Math.sin(t * 0.08) * 60;
    this.camera.position.z = Math.cos(t * 0.08) * 60;
    this.camera.position.y = Math.sin(t * 0.05) * 15;
    this.camera.lookAt(0, 0, 0);

    this.particles.rotation.y += delta * 0.03;
    this.particles.rotation.x += delta * 0.01;

    this.waveRing.rotation.y  += delta * 0.4;
    this.waveRing.rotation.x  = Math.sin(t * 0.3) * 0.3;
    this.waveRing2.rotation.y -= delta * 0.25;
    this.waveRing2.rotation.z  = Math.cos(t * 0.2) * 0.2;

    this.coreOrb.rotation.y  += delta * 0.5;
    this.coreOrb.rotation.x  += delta * 0.3;
    this.coreWire.rotation.y -= delta * 0.4;
    this.coreWire.rotation.z += delta * 0.2;

    this._freqBars.forEach((bar) => {
      const angle = bar.userData.angle + t * 0.1;
      const r = bar.userData.radius;
      bar.position.x = Math.cos(angle) * r;
      bar.position.z = Math.sin(angle) * r;
      bar.lookAt(0, bar.position.y, 0);
      bar.rotateY(Math.PI * 0.5);
    });

    this.composer.render();
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }
}
