// Web Audio API and Speech Synthesis for queue notifications

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private getAudioContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Classic service hall two-tone chime (e.g. airport / bank ding-dong)
   */
  public playDingDong() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: High tone (A5, 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);

    // Tone 2: Lower harmonic tone (F#5, 739.99Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(739.99, now + 0.35);
    gain2.gain.setValueAtTime(0, now + 0.35);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.4);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.35);
    osc2.stop(now + 1.2);
  }

  /**
   * Harmonic pleasant success sound for token generation
   */
  public playSuccessSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  /**
   * Warning buzzer when leaving geofence perimeter
   */
  public playWarningAlert() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(280, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Automated voice announcement using SpeechSynthesis
   */
  public speakAnnouncement(text: string) {
    if (!this.soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // slightly slower for clarity
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.lang.startsWith('en')) && !v.name.includes('Bad')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // SpeechSynthesis may be restricted or unsupported
    }
  }

  /**
   * High-level helper: play chime followed by vocal call
   */
  public announceTokenCall(tokenNumber: string, counterNumber: string) {
    this.playDingDong();

    setTimeout(() => {
      // Format e.g., "T-104" to "Token T one zero four" for clean pronunciation
      const cleanToken = tokenNumber.replace(/([A-Z])-?(\d+)/, (_, letter, num) => {
        const spokenDigits = num.split('').join(' ');
        return `Token ${letter}, ${spokenDigits}`;
      });
      this.speakAnnouncement(`${cleanToken}. Please proceed to ${counterNumber}.`);
    }, 900);
  }
}

export const soundManager = new SoundManager();
