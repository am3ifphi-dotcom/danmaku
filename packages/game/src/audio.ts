/** Procedural WebAudio BGM/SFX — no external files, generated at runtime. */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  intensity = 0; // 0 calm .. 2 intense
  muted = false;

  init() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.startSequencer();
  }
  setMuted(m: boolean) { this.muted = m; if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.35, this.ctx.currentTime, 0.05); }
  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest?: AudioNode) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest ?? this.master); o.start(t); o.stop(t + dur);
  }
  private startSequencer() {
    if (!this.ctx) return;
    const scales = [ [220,261.6,329.6,392,493.9], [196,246.9,293.7,369.9,440], [174.6,220,261.6,329.6,392] ];
    this.timer = window.setInterval(() => {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + 0.05;
      const scale = scales[Math.min(this.intensity, 2)];
      const bpmStep = this.step++;
      // bass
      if (bpmStep % 4 === 0) this.note(scale[0] / 2, t, 0.35, 'triangle', 0.18);
      // arpeggio
      const idx = [0,2,4,3,1,4,2,0][bpmStep % 8];
      this.note(scale[idx] * (this.intensity >= 2 && bpmStep % 2 ? 2 : 1), t, 0.18, 'square', 0.045);
      // pad every 16
      if (bpmStep % 16 === 0) { this.note(scale[0], t, 1.6, 'sine', 0.06); this.note(scale[2], t, 1.6, 'sine', 0.05); }
      // hat noise-ish
      if (this.intensity >= 1 && bpmStep % 2 === 0) this.note(6000 + Math.random()*2000, t, 0.03, 'square', 0.008);
    }, 190);
  }
  sfx(kind: 'hit'|'phase'|'clear'|'gameover'|'select') {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    if (kind === 'hit') { this.note(160, t, 0.3, 'sawtooth', 0.25); this.note(60, t, 0.4, 'square', 0.2); }
    if (kind === 'phase') { [523,659,784].forEach((f,i)=>this.note(f, t+i*0.07, 0.2, 'square', 0.08)); }
    if (kind === 'clear') { [523,659,784,1046,1318].forEach((f,i)=>this.note(f, t+i*0.1, 0.3, 'triangle', 0.12)); }
    if (kind === 'gameover') { [392,330,262,196].forEach((f,i)=>this.note(f, t+i*0.18, 0.3, 'triangle', 0.12)); }
    if (kind === 'select') this.note(880, t, 0.08, 'square', 0.07);
  }
  dispose() { if (this.timer) clearInterval(this.timer); }
}
