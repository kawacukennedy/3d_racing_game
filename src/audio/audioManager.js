import { Howl, Howler } from 'howler';

export class AudioManager {
    constructor() {
        this.engineSound = null;
        this.collisionSounds = [];
        this.tireSquealSound = null;
        this.isInitialized = false;
        this.currentRPM = 0;
        this.maxRPM = 8000;
        this.idleRPM = 800;
    }

    init() {
        if (this.isInitialized) return;

        // Initialize engine sound (placeholder - would load actual audio files)
        this.engineSound = new Howl({
            src: ['assets/audio/engine_loop.mp3'], // Placeholder path
            loop: true,
            volume: 0.3,
            onload: () => {
                console.log('Engine sound loaded');
            },
            onloaderror: () => {
                console.log('Engine sound failed to load - using placeholder');
                // Create a simple synthesized engine sound for demo
                this.createSynthesizedEngineSound();
            }
        });

        // Initialize collision sounds
        for (let i = 0; i < 3; i++) {
            this.collisionSounds.push(new Howl({
                src: ['assets/audio/collision_' + (i + 1) + '.mp3'], // Placeholder paths
                volume: 0.5,
                onloaderror: () => {
                    console.log('Collision sound ' + (i + 1) + ' failed to load');
                }
            }));
        }

        // Initialize tire squeal
        this.tireSquealSound = new Howl({
            src: ['assets/audio/tire_squeal.mp3'], // Placeholder path
            volume: 0.2,
            onloaderror: () => {
                console.log('Tire squeal sound failed to load');
            }
        });

        this.isInitialized = true;
    }

    createSynthesizedEngineSound() {
        // Create a simple synthesized engine sound using Web Audio API
        // This is a placeholder for actual audio files
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        // This would be replaced with actual audio playback
        // For now, we'll just log that synthesis is ready
        console.log('Synthesized engine sound ready');
    }

    updateEngineSound(speed, vehiclePosition = null, listenerPosition = null) {
        if (!this.engineSound) return;

        // Calculate RPM based on speed with more realistic curve
        const gearRatios = [3.5, 2.2, 1.5, 1.0, 0.8]; // 5-speed transmission
        const currentGear = Math.min(4, Math.floor(speed / 10)); // Simple gear selection
        const gearRatio = gearRatios[currentGear];

        this.currentRPM = Math.max(this.idleRPM, Math.min(this.maxRPM,
            this.idleRPM + (speed * gearRatio * 80) + (Math.random() * 200 - 100) // Add engine variation
        ));

        // Adjust pitch based on RPM with gear changes
        const pitch = this.currentRPM / this.idleRPM;
        this.engineSound.rate(Math.max(0.5, Math.min(2.0, pitch)));

        // Adjust volume based on RPM and distance
        let volume = 0.1 + (this.currentRPM / this.maxRPM) * 0.4;

        // Apply spatial audio if positions provided
        if (vehiclePosition && listenerPosition) {
            const distance = vehiclePosition.distanceTo(listenerPosition);
            const maxDistance = 50;
            const distanceAttenuation = Math.max(0, 1 - (distance / maxDistance));
            volume *= distanceAttenuation;

            // Doppler effect (simplified)
            const relativeSpeed = speed * 0.1; // Simplified doppler
            const dopplerPitch = 1 + (relativeSpeed / 343); // Speed of sound = 343 m/s
            this.engineSound.rate(Math.max(0.5, Math.min(2.0, pitch * dopplerPitch)));
        }

        this.engineSound.volume(Math.max(0, Math.min(1, volume)));

        if (!this.engineSound.playing()) {
            this.engineSound.play();
        }
    }

    updateSpatialAudio(vehiclePosition, listenerPosition, vehicleRotation) {
        if (!vehiclePosition || !listenerPosition) return;

        // Update engine sound with spatial information
        this.updateEngineSound(
            this.lastKnownSpeed || 0,
            vehiclePosition,
            listenerPosition
        );

        // Update environmental audio
        this.updateEnvironmentalAudio(vehiclePosition);
    }

    updateEnvironmentalAudio(vehiclePosition) {
        // Add wind noise based on speed
        if (this.lastKnownSpeed > 5) {
            const windVolume = Math.min(0.3, this.lastKnownSpeed / 50);
            // Could play wind sound here if available
        }

        // Add crowd noise near grandstands (would need track data)
        // This is a placeholder for environmental audio
    }

    playTireSqueal(intensity = 1, position = null) {
        if (this.tireSquealSound) {
            let volume = 0.1 * intensity;

            // Apply spatial attenuation if position provided
            if (position && this.listenerPosition) {
                const distance = position.distanceTo(this.listenerPosition);
                volume *= Math.max(0, 1 - distance / 30);
            }

            this.tireSquealSound.volume(volume);
            this.tireSquealSound.play();
        }
    }

    playCollisionSound(intensity = 1, position = null) {
        if (this.collisionSounds.length === 0) return;

        const soundIndex = Math.floor(Math.random() * this.collisionSounds.length);
        const sound = this.collisionSounds[soundIndex];
        if (sound) {
            let volume = 0.3 * intensity;

            // Apply spatial attenuation
            if (position && this.listenerPosition) {
                const distance = position.distanceTo(this.listenerPosition);
                volume *= Math.max(0, 1 - distance / 20);
            }

            sound.volume(volume);
            sound.play();
        }
    }

    setListenerPosition(position) {
        this.listenerPosition = position;
    }

    setMasterVolume(volume) {
        Howler.volume(volume);
    }

    pauseAll() {
        Howler.pause();
    }

    resumeAll() {
        Howler.resume();
    }

    cleanup() {
        // Stop all sounds
        if (this.engineSound) {
            this.engineSound.stop();
            this.engineSound.unload();
        }

        if (this.tireSquealSound) {
            this.tireSquealSound.stop();
            this.tireSquealSound.unload();
        }

        this.collisionSounds.forEach(sound => {
            if (sound) {
                sound.stop();
                sound.unload();
            }
        });

        // Clear arrays
        this.collisionSounds = [];

        console.log('Audio manager cleaned up');
    }

    // Settings methods
    setMasterVolume(volume) {
        this.masterVolume = volume;
        Howler.volume(volume);
    }

    setMusicVolume(volume) {
        this.musicVolume = volume;
        // If there's background music, set its volume
        if (this.backgroundMusic) {
            this.backgroundMusic.volume(volume);
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = volume;
        // Adjust collision and tire sounds
        this.collisionSounds.forEach(sound => {
            if (sound) sound.volume(volume * 0.5);
        });
        if (this.tireSquealSound) this.tireSquealSound.volume(volume * 0.2);
    }

    setScreenReader(enabled) {
        this.screenReaderEnabled = enabled;
        // Implementation for screen reader integration
    }

    setAudioCues(enabled) {
        this.audioCuesEnabled = enabled;
        // Enable/disable UI audio feedback
    }
}