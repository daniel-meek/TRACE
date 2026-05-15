
class AudioManager {
    constructor(game) {
        this.audioCtx = new AudioContext();
    }

    playCustomNote(frequency = 440, duration = 0.1, oscillatorType = 'square', rampTime = 0.0001) {
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        // 'square' is the classic 8-bit sound; 'sawtooth' is also common
        oscillator.type = oscillatorType; 
        oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        oscillator.start();
        // Quickly fade out to prevent clicking sounds
        gainNode.gain.exponentialRampToValueAtTime(rampTime, this.audioCtx.currentTime + duration);
        oscillator.stop(this.audioCtx.currentTime + duration);
    }

    playPlayerMove() {
        const randomInt = Math.floor(Math.random() * 3);

        if (randomInt === 0) {
            this.playCustomNote(65.4, 0.1, 'square', 0.0001)
        } else if (randomInt === 1) {
            this.playCustomNote(130.8, 0.1, 'square', 0.0001)
        } else {
            this.playCustomNote(261.6, 0.1, 'square', 0.0001)
        }
    }

};