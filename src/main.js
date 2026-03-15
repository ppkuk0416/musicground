import { AudioAnalyzer } from './audioAnalyzer.js';
import { MusicScene } from './scene.js';

// ─────────────────────────────────────
//  앱 초기화
// ─────────────────────────────────────
const canvas = document.getElementById('bg');
const scene = new MusicScene(canvas);
const analyzer = new AudioAnalyzer();

// UI 요소
const btnMic    = document.getElementById('btn-mic');
const btnSystem = document.getElementById('btn-system');
const statusDot  = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const moodText   = document.getElementById('mood-text');
const bpmText    = document.getElementById('bpm-text');
const energyText = document.getElementById('energy-text');
const themeBtns  = document.querySelectorAll('.theme-btn');

// ─────────────────────────────────────
//  오디오 시작
// ─────────────────────────────────────
async function startAudio(mode) {
  try {
    setStatus('연결 중...', false);
    if (mode === 'mic') {
      await analyzer.startMic();
      setStatus('마이크 감지 중', true);
    } else {
      await analyzer.startSystem();
      setStatus('시스템 오디오 감지 중', true);
    }

    // 버튼 활성화 표시
    btnMic.classList.toggle('active-source', mode === 'mic');
    btnSystem.classList.toggle('active-source', mode === 'system');

    // 정보 업데이트 루프
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

// ─────────────────────────────────────
//  정보 패널 업데이트 루프
// ─────────────────────────────────────
let _infoInterval = null;

function startInfoLoop() {
  if (_infoInterval) return;
  _infoInterval = setInterval(() => {
    if (!analyzer.isActive) return;

    // 매 프레임 오디오 분석 (requestAnimationFrame과 별도)
    analyzer.update();
    scene.updateAudio(analyzer);

    // UI 업데이트
    moodText.textContent   = analyzer.getMood();
    bpmText.textContent    = analyzer.bpm > 0 ? `${analyzer.bpm} BPM` : '감지 중...';
    const ePct = Math.round(analyzer.energy * 100);
    energyText.textContent = `${ePct}%`;
  }, 50); // 20fps로 UI 갱신
}

// 더 정밀한 오디오 갱신은 requestAnimationFrame에서
;(function audioRafLoop() {
  requestAnimationFrame(audioRafLoop);
  if (analyzer.isActive) {
    analyzer.update();
    scene.updateAudio(analyzer);
  }
})();

// ─────────────────────────────────────
//  상태 표시
// ─────────────────────────────────────
function setStatus(text, active) {
  statusText.textContent = text;
  statusDot.classList.toggle('active', active);
}

// ─────────────────────────────────────
//  이벤트 바인딩
// ─────────────────────────────────────
btnMic.addEventListener('click', () => startAudio('mic'));
btnSystem.addEventListener('click', () => startAudio('system'));

themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    themeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    scene.setTheme(btn.dataset.theme);
  });
});

// 키보드 단축키
document.addEventListener('keydown', e => {
  switch (e.key) {
    case '1': scene.setTheme('cosmic');  syncThemeBtn('cosmic');  break;
    case '2': scene.setTheme('ocean');   syncThemeBtn('ocean');   break;
    case '3': scene.setTheme('forest');  syncThemeBtn('forest');  break;
    case '4': scene.setTheme('fire');    syncThemeBtn('fire');    break;
    case 'm': startAudio('mic');    break;
    case 's': startAudio('system'); break;
  }
});

function syncThemeBtn(name) {
  themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === name));
}
