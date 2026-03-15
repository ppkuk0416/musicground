import { AudioAnalyzer } from './audioAnalyzer.js';
import { MusicScene } from './scene.js';

// ─────────────────────────────────────
//  앱 초기화
// ─────────────────────────────────────
const canvas = document.getElementById('bg');
const scene = new MusicScene(canvas);
const analyzer = new AudioAnalyzer();

// UI 요소
const btnFile            = document.getElementById('btn-file');
const btnMic             = document.getElementById('btn-mic');
const btnSystem          = document.getElementById('btn-system');
const fileInput          = document.getElementById('file-input');
const statusDot          = document.getElementById('status-dot');
const statusText         = document.getElementById('status-text');
const moodText           = document.getElementById('mood-text');
const bpmText            = document.getElementById('bpm-text');
const energyText         = document.getElementById('energy-text');
const themeBtns          = document.querySelectorAll('.theme-btn');
const player             = document.getElementById('player');
const trackName          = document.getElementById('track-name');
const progressFill       = document.getElementById('progress-fill');
const progressThumb      = document.getElementById('progress-thumb');
const progressBar        = document.getElementById('progress-bar');
const timeCurrent        = document.getElementById('time-current');
const timeTotal          = document.getElementById('time-total');
const btnPlayPause       = document.getElementById('btn-play-pause');
const iconPlay           = document.getElementById('icon-play');
const iconPause          = document.getElementById('icon-pause');
const btnScreenshot      = document.getElementById('btn-screenshot');
const btnFullscreen      = document.getElementById('btn-fullscreen');
const iconFsEnter        = document.getElementById('icon-fullscreen-enter');
const iconFsExit         = document.getElementById('icon-fullscreen-exit');
const fsLabel            = document.getElementById('fullscreen-label');
const dropOverlay        = document.getElementById('drop-overlay');
// 설정
const btnSettingsToggle  = document.getElementById('btn-settings-toggle');
const settingsPanel      = document.getElementById('settings-panel');
const sliderSensitivity  = document.getElementById('slider-sensitivity');
const valSensitivity     = document.getElementById('val-sensitivity');
const sliderParticles    = document.getElementById('slider-particles');
const valParticles       = document.getElementById('val-particles');
const colorPrimary       = document.getElementById('color-primary');
const colorAccent        = document.getElementById('color-accent');
const swatchPrimary      = document.getElementById('swatch-primary');
const swatchAccent       = document.getElementById('swatch-accent');
const btnApplyCustom     = document.getElementById('btn-apply-custom');
const btnThemeCustom     = document.getElementById('btn-theme-custom');
// PWA
const btnInstall         = document.getElementById('btn-install');

// ─────────────────────────────────────
//  오디오 파일 로드
// ─────────────────────────────────────
async function loadFile(file) {
  if (!file || !file.type.startsWith('audio/')) {
    setStatus('지원하지 않는 파일 형식입니다', false);
    return;
  }

  setStatus('파일 로딩 중...', false);
  clearSourceButtons();

  try {
    await analyzer.startFile(file, onFileEnded);
    showPlayer(file.name);
    setStatus('재생 중', true);
    setPlayPauseIcon(true);
    btnFile.classList.add('active-source');
    startInfoLoop();
  } catch (err) {
    console.error(err);
    setStatus(`파일 오류: ${err.message}`, false);
  }
}

function onFileEnded() {
  setStatus('재생 완료', false);
  setPlayPauseIcon(false);
}

function showPlayer(name) {
  const baseName = name.replace(/\.[^/.]+$/, '');
  trackName.textContent = baseName;
  timeTotal.textContent = formatTime(analyzer.duration);
  player.classList.remove('hidden');
}

function hidePlayer() {
  player.classList.add('hidden');
}

// ─────────────────────────────────────
//  마이크 / 시스템 오디오
// ─────────────────────────────────────
async function startAudio(mode) {
  try {
    setStatus('연결 중...', false);
    clearSourceButtons();
    hidePlayer();

    if (mode === 'mic') {
      await analyzer.startMic();
      setStatus('마이크 감지 중', true);
      btnMic.classList.add('active-source');
    } else {
      await analyzer.startSystem();
      setStatus('시스템 오디오 감지 중', true);
      btnSystem.classList.add('active-source');
    }

    startInfoLoop();
  } catch (err) {
    console.error(err);
    if (err.name === 'NotAllowedError') {
      setStatus('권한이 거부되었습니다', false);
    } else if (err.name === 'NotFoundError') {
      setStatus('오디오 장치를 찾을 수 없습니다', false);
    } else {
      setStatus(`오류: ${err.message}`, false);
    }
  }
}

function clearSourceButtons() {
  [btnFile, btnMic, btnSystem].forEach(b => b.classList.remove('active-source'));
}

// ─────────────────────────────────────
//  재생/일시정지 토글
// ─────────────────────────────────────
async function togglePlayPause() {
  if (analyzer.mode !== 'file') return;
  if (analyzer.isPlaying) {
    analyzer.pauseFile();
    setStatus('일시정지', false);
    setPlayPauseIcon(false);
  } else {
    await analyzer.resumeFile();
    setStatus('재생 중', true);
    setPlayPauseIcon(true);
  }
}

function setPlayPauseIcon(playing) {
  iconPlay.style.display  = playing ? 'none' : 'block';
  iconPause.style.display = playing ? 'block' : 'none';
}

// ─────────────────────────────────────
//  재생바 진행 표시
// ─────────────────────────────────────
function updateProgressBar() {
  if (analyzer.mode !== 'file' || !analyzer.duration) return;
  const pct = Math.min(analyzer.currentTime / analyzer.duration, 1) * 100;
  progressFill.style.width = `${pct}%`;
  progressThumb.style.left = `${pct}%`;
  timeCurrent.textContent  = formatTime(analyzer.currentTime);
}

progressBar.addEventListener('click', async (e) => {
  if (analyzer.mode !== 'file' || !analyzer.duration) return;
  const rect = progressBar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const wasPlaying = analyzer.isPlaying;
  analyzer.pauseFile();
  analyzer._pauseOffset = ratio * analyzer.duration;
  if (wasPlaying) {
    await analyzer.resumeFile();
    setPlayPauseIcon(true);
  }
});

// ─────────────────────────────────────
//  정보 패널 업데이트 루프
// ─────────────────────────────────────
let _infoInterval = null;

function startInfoLoop() {
  if (_infoInterval) clearInterval(_infoInterval);
  _infoInterval = setInterval(() => {
    if (!analyzer.isActive) return;
    moodText.textContent   = analyzer.getMood();
    bpmText.textContent    = analyzer.bpm > 0 ? `${analyzer.bpm} BPM` : '감지 중...';
    energyText.textContent = `${Math.round(analyzer.energy * 100)}%`;
    updateProgressBar();
  }, 50);
}

// RAF 루프 — 시각화 갱신
;(function audioRafLoop() {
  requestAnimationFrame(audioRafLoop);
  if (analyzer.isActive) {
    analyzer.update();
    scene.updateAudio(analyzer);
  }
})();

// ─────────────────────────────────────
//  전체화면
// ─────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(console.error);
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  const isFs = !!document.fullscreenElement;
  iconFsEnter.style.display = isFs ? 'none' : 'block';
  iconFsExit.style.display  = isFs ? 'block' : 'none';
  fsLabel.textContent       = isFs ? '전체화면 해제' : '전체화면';
});

// ─────────────────────────────────────
//  스크린샷
// ─────────────────────────────────────
function takeScreenshot() {
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `musicground-${Date.now()}.png`;
  a.click();
}

// ─────────────────────────────────────
//  설정 패널 토글
// ─────────────────────────────────────
btnSettingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
  btnSettingsToggle.classList.toggle('active', !settingsPanel.classList.contains('hidden'));
});

// 감도 슬라이더
sliderSensitivity.addEventListener('input', () => {
  const v = parseFloat(sliderSensitivity.value);
  scene.setSensitivity(v);
  valSensitivity.textContent = `${v.toFixed(1)}×`;
});

// 파티클 밀도 슬라이더
sliderParticles.addEventListener('input', () => {
  const v = parseInt(sliderParticles.value);
  scene.setParticleDensity(v / 100);
  valParticles.textContent = `${v}%`;
});

// 색상 picker 스와치 연동
colorPrimary.addEventListener('input', () => {
  swatchPrimary.style.background = colorPrimary.value;
});
colorAccent.addEventListener('input', () => {
  swatchAccent.style.background = colorAccent.value;
});
swatchPrimary.addEventListener('click', () => colorPrimary.click());
swatchAccent.addEventListener('click',  () => colorAccent.click());

// ─────────────────────────────────────
//  커스텀 테마 적용
// ─────────────────────────────────────
btnApplyCustom.addEventListener('click', applyCustomTheme);
btnThemeCustom.addEventListener('click', applyCustomTheme);

function applyCustomTheme() {
  const primaryHex = colorPrimary.value;
  const accentHex  = colorAccent.value;
  const themeObj   = deriveTheme(primaryHex, accentHex);
  scene.applyCustomTheme(themeObj);
  // 테마 버튼 UI 동기화
  themeBtns.forEach(b => b.classList.remove('active'));
  btnThemeCustom.classList.add('active');
}

/** hex '#rrggbb' 두 색으로 THEMES 호환 오브젝트 생성 */
function deriveTheme(primaryHex, accentHex) {
  const [r, g, b] = hexToRgb(primaryHex);
  const [h, s, l] = rgbToHsl(r, g, b);

  return {
    name: '커스텀',
    bg:        [hslToNum(h, Math.min(s, 0.25), 0.03),  hslToNum(h, Math.min(s, 0.25), 0.06)],
    primary:   [parseInt(primaryHex.slice(1), 16),      hslToNum(h, s, Math.max(l - 0.15, 0.05))],
    secondary: [hslToNum(h, s * 0.6, Math.min(l + 0.22, 0.85)), hslToNum(h, s * 0.4, Math.min(l + 0.32, 0.9))],
    accent:    [parseInt(accentHex.slice(1), 16),       parseInt(accentHex.slice(1), 16)],
    fog:       hslToNum(h, Math.min(s, 0.25), 0.04),
    particleCount: 3000,
    particleSize: 1.5,
  };
}

// ─── 색상 유틸 ────────────────────────
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToNum(h, s, l) {
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

// ─────────────────────────────────────
//  상태 표시
// ─────────────────────────────────────
function setStatus(text, active) {
  statusText.textContent = text;
  statusDot.classList.toggle('active', active);
}

// ─────────────────────────────────────
//  드래그앤드롭
// ─────────────────────────────────────
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropOverlay.classList.add('visible');
});

document.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null) dropOverlay.classList.remove('visible');
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  dropOverlay.classList.remove('visible');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// ─────────────────────────────────────
//  이벤트 바인딩
// ─────────────────────────────────────
btnFile.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadFile(file);
  fileInput.value = '';
});

btnMic.addEventListener('click', () => startAudio('mic'));
btnSystem.addEventListener('click', () => startAudio('system'));
btnPlayPause.addEventListener('click', togglePlayPause);
btnFullscreen.addEventListener('click', toggleFullscreen);
btnScreenshot.addEventListener('click', takeScreenshot);

themeBtns.forEach(btn => {
  if (btn.id === 'btn-theme-custom') return; // 별도 처리
  btn.addEventListener('click', () => {
    themeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    scene.setTheme(btn.dataset.theme);
  });
});

// ─────────────────────────────────────
//  키보드 단축키
// ─────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  switch (e.key) {
    case ' ':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 's':
    case 'S':
      takeScreenshot();
      break;
    case '1': scene.setTheme('cosmic'); syncThemeBtn('cosmic'); break;
    case '2': scene.setTheme('ocean');  syncThemeBtn('ocean');  break;
    case '3': scene.setTheme('forest'); syncThemeBtn('forest'); break;
    case '4': scene.setTheme('fire');   syncThemeBtn('fire');   break;
  }
});

function syncThemeBtn(name) {
  themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === name));
}

// ─────────────────────────────────────
//  PWA — Service Worker 등록
// ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

// PWA 설치 프롬프트
let _deferredInstall = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstall = e;
  btnInstall.classList.remove('hidden');
});

btnInstall.addEventListener('click', async () => {
  if (!_deferredInstall) return;
  _deferredInstall.prompt();
  const { outcome } = await _deferredInstall.userChoice;
  if (outcome === 'accepted') btnInstall.classList.add('hidden');
  _deferredInstall = null;
});

window.addEventListener('appinstalled', () => {
  btnInstall.classList.add('hidden');
  _deferredInstall = null;
});

// ─────────────────────────────────────
//  시간 포맷 헬퍼
// ─────────────────────────────────────
function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
