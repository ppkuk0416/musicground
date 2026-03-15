/**
 * AudioAnalyzer
 * Web Audio API를 이용해 마이크 또는 시스템 오디오를 실시간 분석한다.
 */
export class AudioAnalyzer {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;

    this.fftSize = 2048;
    this.freqData = null;
    this.timeData = null;

    // 분석 결과 (매 프레임 갱신)
    this.bass = 0;       // 저음 (20–250 Hz)
    this.mid = 0;        // 중음 (250–2000 Hz)
    this.treble = 0;     // 고음 (2000–20000 Hz)
    this.energy = 0;     // 전체 에너지
    this.beat = false;   // 비트 감지 플래그

    // BPM 추정을 위한 내부 상태
    this._beatTimes = [];
    this._lastEnergy = 0;
    this.bpm = 0;
  }

  get isActive() {
    return this.analyser !== null;
  }

  async startMic() {
    await this._stop();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this._init(this.stream);
  }

  /**
   * 시스템 오디오 캡처 – Chrome에서 getDisplayMedia의 audio 트랙을 사용한다.
   */
  async startSystem() {
    await this._stop();
    // 사용자가 화면 공유 창에서 "탭 오디오 공유" 또는 창을 선택하면 오디오 트랙이 포함된다.
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,   // video 없이는 getDisplayMedia 자체가 거부될 수 있음
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 44100,
      },
    });
    this._init(this.stream);
  }

  _init(stream) {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.8;

    this.source = this.ctx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    const bufLen = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(bufLen);
    this.timeData = new Uint8Array(bufLen);
  }

  async _stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
    }
    this.analyser = null;
    this.source = null;
    this._beatTimes = [];
    this.bpm = 0;
  }

  /** 매 프레임 호출 — 주파수 데이터 갱신 및 특징 추출 */
  update() {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    const sampleRate = this.ctx.sampleRate;
    const binCount = this.analyser.frequencyBinCount;
    const binHz = sampleRate / (this.fftSize);

    // 주파수 대역 인덱스 계산
    const bassEnd   = Math.floor(250  / binHz);
    const midEnd    = Math.floor(2000 / binHz);
    const trebleEnd = Math.floor(16000 / binHz);

    this.bass   = this._avg(0, bassEnd);
    this.mid    = this._avg(bassEnd, midEnd);
    this.treble = this._avg(midEnd, Math.min(trebleEnd, binCount - 1));
    this.energy = (this.bass * 0.5 + this.mid * 0.35 + this.treble * 0.15) / 255;

    // 비트 감지 (에너지 급증 감지)
    const currentEnergy = this.bass / 255;
    const threshold = this._lastEnergy * 1.3 + 0.15;
    if (currentEnergy > threshold && currentEnergy > 0.1) {
      this.beat = true;
      this._recordBeat();
    } else {
      this.beat = false;
    }
    this._lastEnergy = this._lastEnergy * 0.9 + currentEnergy * 0.1;
  }

  _avg(start, end) {
    let sum = 0;
    for (let i = start; i <= end; i++) sum += this.freqData[i];
    return sum / (end - start + 1);
  }

  _recordBeat() {
    const now = performance.now();
    this._beatTimes.push(now);
    // 최근 8개 비트만 유지
    if (this._beatTimes.length > 8) this._beatTimes.shift();

    if (this._beatTimes.length >= 4) {
      const intervals = [];
      for (let i = 1; i < this._beatTimes.length; i++) {
        intervals.push(this._beatTimes[i] - this._beatTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      this.bpm = Math.round(60000 / avgInterval);
    }
  }

  /** 현재 음악 분위기를 문자열로 반환 */
  getMood() {
    if (!this.isActive || this.energy < 0.02) return '조용함';
    if (this.bass / 255 > 0.6) return '강렬함 🔥';
    if (this.treble / 255 > 0.5 && this.mid / 255 > 0.4) return '밝고 경쾌함 ✨';
    if (this.mid / 255 > 0.5) return '풍부한 중음 🎸';
    if (this.bass / 255 > 0.3 && this.energy > 0.3) return '리드미컬 🥁';
    if (this.energy > 0.4) return '에너지 넘침 ⚡';
    if (this.treble / 255 > 0.3) return '맑고 투명함 🔮';
    return '편안함 🌙';
  }
}
