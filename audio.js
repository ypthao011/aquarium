class AudioEngine {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.volume = 0.3;

        // Piano melody state
        this.melodyInterval = null;
        this.currentNoteIndex = 0;
    }

    init() {
        if (this.isInitialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();

            // Master Gain to control overall volume
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.context.destination);

            this.isInitialized = true;
            console.log("Audio Engine Initialized");
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    start() {
        if (!this.isInitialized) this.init();
        if (this.isPlaying) return;

        // Resume context if suspended (browser policy)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        this.isPlaying = true;
        this.playPianoMelody();
    }

    stop() {
        if (!this.isPlaying) return;

        // Fade out
        this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.context.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, this.context.currentTime + 2);

        setTimeout(() => {
            if (this.melodyInterval) clearInterval(this.melodyInterval);
            this.isPlaying = false;
        }, 2000);
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            // Smooth transition
            this.masterGain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.1);
        }
    }

    // Piano-like tone generator
    createPianoNote(frequency, startTime, duration, velocity = 0.3) {
        // Oscillator for fundamental
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency;

        // Add harmonics for piano-like timbre
        const osc2 = this.context.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = frequency * 2; // Octave

        const osc3 = this.context.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = frequency * 3; // Fifth

        // Gain envelopes for piano attack-decay-sustain-release
        const gainNode = this.context.createGain();
        const gainNode2 = this.context.createGain();
        const gainNode3 = this.context.createGain();

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.01); // Fast attack
        gainNode.gain.exponentialRampToValueAtTime(velocity * 0.7, startTime + 0.1); // Decay
        gainNode.gain.exponentialRampToValueAtTime(velocity * 0.3, startTime + duration * 0.7); // Sustain
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Release

        gainNode2.gain.setValueAtTime(0, startTime);
        gainNode2.gain.linearRampToValueAtTime(velocity * 0.3, startTime + 0.01);
        gainNode2.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        gainNode3.gain.setValueAtTime(0, startTime);
        gainNode3.gain.linearRampToValueAtTime(velocity * 0.15, startTime + 0.01);
        gainNode3.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gainNode);
        osc2.connect(gainNode2);
        osc3.connect(gainNode3);

        gainNode.connect(this.masterGain);
        gainNode2.connect(this.masterGain);
        gainNode3.connect(this.masterGain);

        osc.start(startTime);
        osc2.start(startTime);
        osc3.start(startTime);

        osc.stop(startTime + duration);
        osc2.stop(startTime + duration);
        osc3.stop(startTime + duration);
    }

    // "Kiss the Rain" inspired melody - gentle, flowing piano arpeggios
    playPianoMelody() {
        // Note frequencies (A minor pentatonic scale - melancholic and beautiful)
        const notes = {
            'A3': 220.00,
            'C4': 261.63,
            'D4': 293.66,
            'E4': 329.63,
            'G4': 392.00,
            'A4': 440.00,
            'C5': 523.25,
            'D5': 587.33,
            'E5': 659.25,
            'G5': 783.99,
            'A5': 880.00
        };

        // Melody pattern inspired by "Kiss the Rain" - gentle, flowing arpeggios
        const melody = [
            // Phrase 1 - gentle opening
            { note: 'A4', duration: 0.8, delay: 0 },
            { note: 'E4', duration: 0.8, delay: 0.4 },
            { note: 'C4', duration: 0.8, delay: 0.8 },
            { note: 'E4', duration: 0.8, delay: 1.2 },
            { note: 'A4', duration: 1.2, delay: 1.6 },

            // Phrase 2 - ascending
            { note: 'C5', duration: 0.8, delay: 3.2 },
            { note: 'A4', duration: 0.8, delay: 3.6 },
            { note: 'E4', duration: 0.8, delay: 4.0 },
            { note: 'A4', duration: 0.8, delay: 4.4 },
            { note: 'C5', duration: 1.2, delay: 4.8 },

            // Phrase 3 - variation
            { note: 'D5', duration: 0.8, delay: 6.4 },
            { note: 'C5', duration: 0.8, delay: 6.8 },
            { note: 'A4', duration: 0.8, delay: 7.2 },
            { note: 'E4', duration: 0.8, delay: 7.6 },
            { note: 'D4', duration: 1.6, delay: 8.0 },

            // Phrase 4 - resolution
            { note: 'E4', duration: 0.8, delay: 10.0 },
            { note: 'A4', duration: 0.8, delay: 10.4 },
            { note: 'C5', duration: 0.8, delay: 10.8 },
            { note: 'E5', duration: 1.2, delay: 11.2 },
            { note: 'A4', duration: 2.0, delay: 12.8 }
        ];

        // Bass notes for depth
        const bass = [
            { note: 'A3', duration: 3.2, delay: 0 },
            { note: 'C4', duration: 3.2, delay: 3.2 },
            { note: 'D4', duration: 3.2, delay: 6.4 },
            { note: 'A3', duration: 3.2, delay: 9.6 },
            { note: 'E4', duration: 2.4, delay: 12.8 }
        ];

        const playSequence = () => {
            if (!this.isPlaying) return;

            const now = this.context.currentTime;
            const sequenceDuration = 15.2; // Total length of one loop

            // Play melody notes
            melody.forEach(({ note, duration, delay }) => {
                this.createPianoNote(notes[note], now + delay, duration, 0.15);
            });

            // Play bass notes (softer)
            bass.forEach(({ note, duration, delay }) => {
                this.createPianoNote(notes[note], now + delay, duration, 0.08);
            });

            // Schedule next sequence
            setTimeout(() => playSequence(), sequenceDuration * 1000);
        };

        playSequence();
    }
}

// Create global instance
window.audioEngine = new AudioEngine();
