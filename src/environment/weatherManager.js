import * as THREE from 'three';

export class WeatherManager {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.currentWeather = 'clear';
        this.weatherParticles = [];
        this.weatherIntensity = 0;
        this.transitionTime = 0;
        this.transitionDuration = 5000; // 5 seconds

        this.weatherTypes = {
            clear: { particleCount: 0, windSpeed: 0, visibility: 1.0, frictionMultiplier: 1.0 },
            rain: { particleCount: 1000, windSpeed: 2, visibility: 0.7, frictionMultiplier: 0.8 },
            heavyRain: { particleCount: 2000, windSpeed: 5, visibility: 0.5, frictionMultiplier: 0.6 },
            snow: { particleCount: 800, windSpeed: 1, visibility: 0.8, frictionMultiplier: 0.9 },
            fog: { particleCount: 50, windSpeed: 0.5, visibility: 0.4, frictionMultiplier: 1.0 }
        };

        this.initializeWeatherEffects();
    }

    initializeWeatherEffects() {
        // Create particle systems for different weather types
        this.createRainSystem();
        this.createSnowSystem();
        this.createFogSystem();
    }

    createRainSystem() {
        const rainGeometry = new THREE.BufferGeometry();
        const rainPositions = [];
        const rainCount = 2000;

        for (let i = 0; i < rainCount; i++) {
            rainPositions.push(
                (Math.random() - 0.5) * 200, // x
                Math.random() * 50,          // y
                (Math.random() - 0.5) * 200  // z
            );
        }

        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));

        const rainMaterial = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });

        this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    }

    createSnowSystem() {
        const snowGeometry = new THREE.BufferGeometry();
        const snowPositions = [];
        const snowCount = 1000;

        for (let i = 0; i < snowCount; i++) {
            snowPositions.push(
                (Math.random() - 0.5) * 200,
                Math.random() * 30,
                (Math.random() - 0.5) * 200
            );
        }

        snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowPositions, 3));

        const snowMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.8
        });

        this.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
        this.snowParticles.visible = false;
        this.scene.add(this.snowParticles);
    }

    createFogSystem() {
        // Create fog effect
        this.fog = new THREE.Fog(0xcccccc, 10, 100);
        this.scene.fog = null; // Start without fog
    }

    setWeather(weatherType, intensity = 1.0) {
        if (!this.weatherTypes[weatherType]) return;

        this.transitionTime = Date.now();
        this.targetWeather = weatherType;
        this.targetIntensity = intensity;

        console.log(`Weather changing to ${weatherType} with intensity ${intensity}`);
    }

    update(deltaTime) {
        const now = Date.now();
        const transitionProgress = Math.min(1, (now - this.transitionTime) / this.transitionDuration);

        // Smooth weather transitions
        if (this.targetWeather && transitionProgress < 1) {
            this.updateWeatherTransition(transitionProgress);
        } else if (this.targetWeather) {
            this.currentWeather = this.targetWeather;
            this.weatherIntensity = this.targetIntensity;
            this.targetWeather = null;
        }

        // Update particle systems
        this.updateParticles(deltaTime);

        // Update environmental effects
        this.updateEnvironmentalEffects();
    }

    updateWeatherTransition(progress) {
        this.weatherIntensity = this.targetIntensity * progress;

        // Interpolate particle counts, etc.
        // For simplicity, we'll just set the target when transition completes
    }

    updateParticles(deltaTime) {
        // Update rain particles
        if (this.rainParticles) {
            this.rainParticles.visible = ['rain', 'heavyRain'].includes(this.currentWeather);

            if (this.rainParticles.visible) {
                const positions = this.rainParticles.geometry.attributes.position.array;

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] -= deltaTime * 20 * this.weatherIntensity; // Fall speed

                    // Reset raindrops that fall below ground
                    if (positions[i + 1] < 0) {
                        positions[i + 1] = 50;
                        positions[i] = (Math.random() - 0.5) * 200;
                        positions[i + 2] = (Math.random() - 0.5) * 200;
                    }
                }

                this.rainParticles.geometry.attributes.position.needsUpdate = true;
                this.rainParticles.material.opacity = 0.6 * this.weatherIntensity;
            }
        }

        // Update snow particles
        if (this.snowParticles) {
            this.snowParticles.visible = this.currentWeather === 'snow';

            if (this.snowParticles.visible) {
                const positions = this.snowParticles.geometry.attributes.position.array;

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] -= deltaTime * 5 * this.weatherIntensity; // Slower fall
                    positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.01; // Gentle sway

                    if (positions[i + 1] < 0) {
                        positions[i + 1] = 30;
                        positions[i] = (Math.random() - 0.5) * 200;
                        positions[i + 2] = (Math.random() - 0.5) * 200;
                    }
                }

                this.snowParticles.geometry.attributes.position.needsUpdate = true;
                this.snowParticles.material.opacity = 0.8 * this.weatherIntensity;
            }
        }
    }

    updateEnvironmentalEffects() {
        const weatherConfig = this.weatherTypes[this.currentWeather];

        // Update fog
        if (this.currentWeather === 'fog') {
            if (!this.scene.fog) {
                this.scene.fog = this.fog;
            }
            this.scene.fog.near = 10 * (2 - this.weatherIntensity);
            this.scene.fog.far = 100 * (2 - this.weatherIntensity);
        } else if (this.scene.fog) {
            this.scene.fog = null;
        }

        // Update lighting based on weather
        this.updateWeatherLighting();

        // Return current friction multiplier for physics
        return weatherConfig.frictionMultiplier;
    }

    updateWeatherLighting() {
        // Find directional light (sun)
        this.scene.traverse((object) => {
            if (object.isDirectionalLight) {
                const weatherConfig = this.weatherTypes[this.currentWeather];
                const intensity = 1.0 - ((1.0 - weatherConfig.visibility) * this.weatherIntensity);
                object.intensity = Math.max(0.3, intensity);
            }
        });
    }

    getCurrentWeatherEffects() {
        return {
            weather: this.currentWeather,
            intensity: this.weatherIntensity,
            visibility: this.weatherTypes[this.currentWeather].visibility,
            frictionMultiplier: this.weatherTypes[this.currentWeather].frictionMultiplier
        };
    }

    // Weather presets for different race conditions
    setRaceWeather(raceType) {
        const weatherPresets = {
            normal: ['clear', 'clear', 'clear', 'rain'],
            extreme: ['heavyRain', 'snow', 'fog', 'clear'],
            random: Object.keys(this.weatherTypes)
        };

        const availableWeather = weatherPresets[raceType] || ['clear'];
        const randomWeather = availableWeather[Math.floor(Math.random() * availableWeather.length)];
        const randomIntensity = 0.5 + Math.random() * 0.5;

        this.setWeather(randomWeather, randomIntensity);
    }
}