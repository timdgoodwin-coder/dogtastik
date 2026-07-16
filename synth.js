// Web Audio API Synthesizer for DogTastik custom sample tunes

class DogJingleSynth {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.activeTimeouts = [];
    this.currentTempo = 120;
    this.progressInterval = null;
    this.duration = 10; // 10 second demo jingles
    this.currentTime = 0;
    this.onProgressCallback = null;
    this.onEndedCallback = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // resume if suspended (browser security policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  stop() {
    this.isPlaying = false;
    this.activeTimeouts.forEach(clearTimeout);
    this.activeTimeouts = [];
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.currentTime = 0;
    if (this.onProgressCallback) {
      this.onProgressCallback(0);
    }
  }

  // Synthesize note helper
  playNote(frequency, startTime, duration, type = 'sine', volume = 0.1, fadeOut = true) {
    if (!this.isPlaying || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(volume, startTime);
    if (fadeOut) {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    } else {
      gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    }

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Synthesize chord helper
  playChord(frequencies, startTime, duration, type = 'sine', volume = 0.05) {
    frequencies.forEach(freq => {
      this.playNote(freq, startTime, duration, type, volume, true);
    });
  }

  // Tune 1: Energetic (Fast, bubbly, major-key synth pop)
  playEnergetic(onProgress, onEnded) {
    this.init();
    this.stop();
    this.isPlaying = true;
    this.onProgressCallback = onProgress;
    this.onEndedCallback = onEnded;

    const startCtxTime = this.audioCtx.currentTime;
    const tempo = 135; // BPM
    const beatDuration = 60 / tempo; // duration of one beat in seconds

    // Major Pentatonic scale frequencies: C4, D4, E4, G4, A4, C5, D5, E5, G5, A5
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

    // Chords (C Major, G Major, A Minor, F Major)
    const chords = [
      [130.81, 196.00, 261.63, 329.63], // C
      [98.00, 146.83, 196.00, 293.66],  // G
      [110.00, 165.00, 220.00, 261.63], // Am
      [87.31, 130.81, 174.61, 261.63]   // F
    ];

    // Arpeggio and melody sequences (pitch indices in scale)
    const arpeggio = [0, 2, 3, 5, 3, 2, 0, 2];
    const melody = [5, 5, 7, 8, 7, 5, 3, 5, 5, 5, 7, 8, 9, 8, 7, 9];

    let totalDuration = 10; // seconds
    let notesToPlay = Math.floor(totalDuration / (beatDuration / 2)); // 8th notes

    for (let i = 0; i < notesToPlay; i++) {
      const time = startCtxTime + (i * beatDuration / 2);
      
      // Play bass/chord every 4 beats (8 eighth-notes)
      if (i % 8 === 0) {
        const chordIndex = Math.floor(i / 8) % chords.length;
        this.playChord(chords[chordIndex], time, beatDuration * 4, 'triangle', 0.04);
      }

      // Play arpeggio (eighth notes) on triangle wave for retro bouncy sound
      const arpNote = scale[arpeggio[i % arpeggio.length]];
      this.playNote(arpNote, time, beatDuration * 0.4, 'sine', 0.05, true);

      // Play lead melody (quarter notes) on a bubbly square wave (less volume)
      if (i % 2 === 0) {
        const melodyIdx = Math.floor(i / 2) % melody.length;
        const leadNote = scale[melody[melodyIdx]];
        this.playNote(leadNote, time, beatDuration * 0.8, 'square', 0.02, true);
      }
    }

    this.startProgressTracker(totalDuration, onProgress, onEnded);
  }

  // Tune 2: Sleepy (Slow, warm, relaxing lullaby chords)
  playSleepy(onProgress, onEnded) {
    this.init();
    this.stop();
    this.isPlaying = true;
    this.onProgressCallback = onProgress;
    this.onEndedCallback = onEnded;

    const startCtxTime = this.audioCtx.currentTime;
    const tempo = 75; // BPM
    const beatDuration = 60 / tempo;

    // Cozy G-major / C-major chord progression
    const chords = [
      [98.00, 196.00, 246.94, 293.66, 392.00], // G maj
      [130.81, 261.63, 329.63, 392.00, 523.25], // C maj
      [110.00, 220.00, 261.63, 329.63, 440.00], // A min
      [130.81, 261.63, 349.23, 392.00, 523.25]  // F maj 9
    ];

    const melody = [
      392.00, 440.00, 493.88, 587.33, 493.88, 392.00,
      329.63, 392.00, 523.25, 493.88, 392.00, 293.66
    ];

    let totalDuration = 10; // seconds
    let beats = Math.floor(totalDuration / beatDuration);

    for (let i = 0; i < beats; i++) {
      const time = startCtxTime + (i * beatDuration);

      // Play soft warm chord every 2 beats
      if (i % 2 === 0) {
        const chordIdx = Math.floor(i / 2) % chords.length;
        this.playChord(chords[chordIdx], time, beatDuration * 2, 'sine', 0.05);
      }

      // Play simple sleepy melody on soft triangle
      const noteFreq = melody[i % melody.length];
      this.playNote(noteFreq, time + (beatDuration * 0.5), beatDuration * 0.9, 'triangle', 0.02, true);
    }

    this.startProgressTracker(totalDuration, onProgress, onEnded);
  }

  // Tune 3: Playful/Sassy (Medium-upbeat, funky bass and pitch bends)
  playPlayful(onProgress, onEnded) {
    this.init();
    this.stop();
    this.isPlaying = true;
    this.onProgressCallback = onProgress;
    this.onEndedCallback = onEnded;

    const startCtxTime = this.audioCtx.currentTime;
    const tempo = 110; // BPM
    const beatDuration = 60 / tempo;

    // Funky bluesy-pentatonic scale
    const scale = [196.00, 220.00, 233.08, 246.94, 293.66, 329.63, 392.00, 440.00, 466.16, 493.88];

    // Bassline notes
    const bassline = [
      110.00, 110.00, 146.83, 130.81,
      110.00, 110.00, 165.00, 146.83,
      116.54, 116.54, 146.83, 130.81,
      98.00, 98.00, 130.81, 110.00
    ];

    // Funky chirpy melody notes
    const melody = [
      392.00, 0, 440.00, 493.88, 0, 392.00, 293.66, 0,
      329.63, 329.63, 0, 392.00, 440.00, 466.16, 440.00, 392.00
    ];

    let totalDuration = 10;
    let eighthNotes = Math.floor(totalDuration / (beatDuration / 2));

    for (let i = 0; i < eighthNotes; i++) {
      const time = startCtxTime + (i * beatDuration / 2);

      // Play bass notes on beat
      if (i % 2 === 0) {
        const bassNote = bassline[Math.floor(i / 2) % bassline.length];
        this.playNote(bassNote, time, beatDuration * 0.45, 'triangle', 0.08, true);
      }

      // Play funky chirps (eighth notes)
      const melNote = melody[i % melody.length];
      if (melNote > 0) {
        // Occasionally add pitch slide for sassiness
        if (i % 6 === 0) {
          this.playSassyChirp(melNote, melNote * 1.15, time, beatDuration * 0.3);
        } else {
          this.playNote(melNote, time, beatDuration * 0.25, 'sine', 0.04, true);
        }
      }
    }

    this.startProgressTracker(totalDuration, onProgress, onEnded);
  }

  // Pitch slide note for playfulness
  playSassyChirp(startFreq, endFreq, startTime, duration) {
    if (!this.isPlaying || !this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    gainNode.gain.setValueAtTime(0.04, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Track playback progress
  startProgressTracker(duration, onProgress, onEnded) {
    const startTimeStamp = Date.now();
    
    this.progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTimeStamp) / 1000;
      this.currentTime = Math.min(elapsed, duration);
      
      const percentage = (this.currentTime / duration) * 100;
      if (onProgress) {
        onProgress(percentage);
      }

      if (this.currentTime >= duration) {
        this.stop();
        if (onEnded) {
          onEnded();
        }
      }
    }, 100);
  }
}

// Export single instance globally
window.dogJingleSynth = new DogJingleSynth();
