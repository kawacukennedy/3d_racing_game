import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class DynamicEvents {
    constructor(game) {
        this.game = game;
        this.activeEvents = new Map();
        this.eventQueue = [];
        this.lastEventTime = 0;
        this.eventCooldown = 15000; // 15 seconds between events

        // Event types and their configurations
        this.eventTypes = {
            weather_change: {
                weight: 0.2,
                duration: 30000,
                weathers: ['rain', 'heavy_rain', 'snow', 'fog']
            },
            hazard_spawn: {
                weight: 0.25,
                duration: 10000,
                hazards: ['oil_spill', 'hazard', 'jump_ramp']
            },
            power_up_spawn: {
                weight: 0.3,
                duration: 15000,
                powerUps: ['boost', 'shield', 'nitro', 'magnet']
            },
            track_modification: {
                weight: 0.15,
                duration: 20000,
                modifications: ['speed_zone', 'slow_zone', 'shortcut']
            },
            environmental_effect: {
                weight: 0.1,
                duration: 25000,
                effects: ['wind_gust', 'earthquake', 'time_dilation']
            }
        };

        // Power-up system
        this.powerUps = new Map();
        this.activePowerUps = new Map();

        // Track modification zones
        this.modificationZones = new Map();

        this.initializeDynamicEvents();
    }

    initializeDynamicEvents() {
        console.log('🌪️ Dynamic Events system initialized - weather, hazards, and power-ups');

        // Set up power-up system
        this.initializePowerUpSystem();

        // Start event scheduling
        this.scheduleNextEvent();
    }

    initializePowerUpSystem() {
        // Define power-up types
        this.powerUpTypes = {
            boost: {
                name: 'Speed Boost',
                duration: 3000,
                effect: (vehicle) => {
                    // Temporarily increase engine force
                    const originalForce = vehicle.maxEngineForce;
                    vehicle.maxEngineForce *= 1.5;
                    setTimeout(() => {
                        vehicle.maxEngineForce = originalForce;
                    }, 3000);
                },
                visual: { color: 0xffff00, icon: '🚀' }
            },
            shield: {
                name: 'Shield',
                duration: 10000,
                effect: (vehicle) => {
                    // Make vehicle immune to hazards for duration
                    vehicle.hasShield = true;
                    setTimeout(() => {
                        vehicle.hasShield = false;
                    }, 10000);
                },
                visual: { color: 0x00ffff, icon: '🛡️' }
            },
            nitro: {
                name: 'Nitro Boost',
                duration: 2000,
                effect: (vehicle) => {
                    // Extreme speed boost
                    const originalForce = vehicle.maxEngineForce;
                    vehicle.maxEngineForce *= 2.0;
                    setTimeout(() => {
                        vehicle.maxEngineForce = originalForce;
                    }, 2000);
                },
                visual: { color: 0xff6600, icon: '💨' }
            },
            magnet: {
                name: 'Power-up Magnet',
                duration: 8000,
                effect: (vehicle) => {
                    // Attract nearby power-ups
                    vehicle.hasMagnet = true;
                    setTimeout(() => {
                        vehicle.hasMagnet = false;
                    }, 8000);
                },
                visual: { color: 0xff00ff, icon: '🧲' }
            }
        };
    }

    update(deltaTime) {
        // Update active events
        this.updateActiveEvents(deltaTime);

        // Check for event triggers
        this.checkEventTriggers();

        // Update power-ups
        this.updatePowerUps(deltaTime);

        // Update track modifications
        this.updateTrackModifications(deltaTime);
    }

    checkEventTriggers() {
        const now = Date.now();

        // Don't trigger events too frequently
        if (now - this.lastEventTime < this.eventCooldown) return;

        // Check race conditions for event triggers
        const shouldTriggerEvent = this.evaluateEventConditions();

        if (shouldTriggerEvent) {
            this.triggerRandomEvent();
            this.lastEventTime = now;
        }
    }

    evaluateEventConditions() {
        // Evaluate current race state to determine if an event should be triggered

        // Check race intensity
        const raceIntensity = this.game.aiDirector ? this.game.aiDirector.raceIntensity : 0.5;
        const highIntensity = raceIntensity > 0.7;

        // Check number of active events
        const tooManyEvents = this.activeEvents.size > 2;

        // Check player performance (simplified)
        const playerSpeed = this.getPlayerSpeed();
        const highSpeed = playerSpeed > 20;

        // Random chance based on conditions
        let triggerChance = 0.05; // Base 5% chance

        if (highIntensity) triggerChance += 0.1;
        if (highSpeed) triggerChance += 0.05;
        if (tooManyEvents) triggerChance -= 0.1;

        return Math.random() < triggerChance;
    }

    triggerRandomEvent() {
        // Select event type based on weights
        const eventKeys = Object.keys(this.eventTypes);
        const totalWeight = eventKeys.reduce((sum, key) => sum + this.eventTypes[key].weight, 0);

        let random = Math.random() * totalWeight;
        let selectedEvent = null;

        for (const key of eventKeys) {
            random -= this.eventTypes[key].weight;
            if (random <= 0) {
                selectedEvent = key;
                break;
            }
        }

        if (selectedEvent) {
            this.createEvent(selectedEvent);
        }
    }

    createEvent(eventType) {
        const eventConfig = this.eventTypes[eventType];
        const event = {
            type: eventType,
            startTime: Date.now(),
            duration: eventConfig.duration,
            active: true,
            data: this.generateEventData(eventType)
        };

        this.activeEvents.set(eventType + '_' + Date.now(), event);
        this.executeEvent(event);

        console.log(`🌪️ Dynamic event triggered: ${eventType}`);
    }

    generateEventData(eventType) {
        switch (eventType) {
            case 'weather_change': {
                const weather = this.eventTypes.weather_change.weathers[
                    Math.floor(Math.random() * this.eventTypes.weather_change.weathers.length)
                ];
                return {
                    weather: weather,
                    intensity: Math.random() * 0.5 + 0.5
                };
            }

            case 'hazard_spawn': {
                const hazard = this.eventTypes.hazard_spawn.hazards[
                    Math.floor(Math.random() * this.eventTypes.hazard_spawn.hazards.length)
                ];
                return {
                    hazardType: hazard,
                    position: this.generateRandomTrackPosition(),
                    radius: hazard === 'oil_spill' ? 3 : 1
                };
            }

            case 'power_up_spawn': {
                const powerUp = this.eventTypes.power_up_spawn.powerUps[
                    Math.floor(Math.random() * this.eventTypes.power_up_spawn.powerUps.length)
                ];
                return {
                    powerUpType: powerUp,
                    position: this.generateRandomTrackPosition(),
                    value: Math.random() * 100 + 50 // Point value
                };
            }

            case 'track_modification': {
                const modification = this.eventTypes.track_modification.modifications[
                    Math.floor(Math.random() * this.eventTypes.track_modification.modifications.length)
                ];
                return {
                    modificationType: modification,
                    position: this.generateRandomTrackPosition(),
                    radius: 10,
                    effect: modification === 'speed_zone' ? 1.5 : 0.7
                };
            }

            case 'environmental_effect': {
                const effect = this.eventTypes.environmental_effect.effects[
                    Math.floor(Math.random() * this.eventTypes.environmental_effect.effects.length)
                ];
                return {
                    effectType: effect,
                    intensity: Math.random() * 0.8 + 0.2
                };
            }

            default: {
                return {};
            }
        }
    }

    executeEvent(event) {
        switch (event.type) {
            case 'weather_change': {
                this.executeWeatherChange(event);
                break;
            }
            case 'hazard_spawn': {
                this.executeHazardSpawn(event);
                break;
            }
            case 'power_up_spawn': {
                this.executePowerUpSpawn(event);
                break;
            }
            case 'track_modification': {
                this.executeTrackModification(event);
                break;
            }
            case 'environmental_effect': {
                this.executeEnvironmentalEffect(event);
                break;
            }
        }
    }

    executeWeatherChange(event) {
        if (this.game.weatherManager) {
            this.game.weatherManager.setWeather(event.data.weather, event.data.intensity);
        }
    }

    executeHazardSpawn(event) {
        if (this.game.trackElementsManager) {
            this.game.trackElementsManager.createElement(
                event.data.hazardType,
                event.data.position,
                new THREE.Euler(),
                { radius: event.data.radius }
            );
        }
    }

    executePowerUpSpawn(event) {
        // Create power-up pickup
        const powerUpMesh = this.createPowerUpMesh(event.data.powerUpType, event.data.position);
        this.game.scene.add(powerUpMesh);

        const powerUp = {
            id: 'powerup_' + Date.now(),
            type: event.data.powerUpType,
            position: event.data.position,
            mesh: powerUpMesh,
            value: event.data.value,
            collected: false,
            spawnTime: Date.now()
        };

        this.powerUps.set(powerUp.id, powerUp);

        // Auto-remove after duration
        setTimeout(() => {
            if (!powerUp.collected) {
                this.removePowerUp(powerUp.id);
            }
        }, 15000); // 15 seconds
    }

    executeTrackModification(event) {
        const zoneId = 'zone_' + Date.now();
        const zone = {
            id: zoneId,
            type: event.data.modificationType,
            position: event.data.position,
            radius: event.data.radius,
            effect: event.data.effect,
            mesh: this.createZoneMesh(event.data.modificationType, event.data.position, event.data.radius)
        };

        this.modificationZones.set(zoneId, zone);
        this.game.scene.add(zone.mesh);

        // Apply zone effect to vehicles in range
        this.applyZoneEffect(zone);
    }

    executeEnvironmentalEffect(event) {
        switch (event.data.effectType) {
            case 'wind_gust': {
                this.applyWindGust(event.data.intensity);
                break;
            }
            case 'earthquake': {
                this.applyEarthquake(event.data.intensity);
                break;
            }
            case 'time_dilation': {
                this.applyTimeDilation(event.data.intensity);
                break;
            }
        }
    }

    createPowerUpMesh(type, position) {
        const powerUpType = this.powerUpTypes[type];
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshLambertMaterial({
            color: powerUpType.visual.color,
            emissive: powerUpType.visual.color,
            emissiveIntensity: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y += 1; // Float above ground

        // Add rotation animation
        mesh.userData = { rotationSpeed: 0.02 };

        return mesh;
    }

    createZoneMesh(type, position, radius) {
        const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 16);
        let color;

        switch (type) {
            case 'speed_zone':
                color = 0x00ff00;
                break;
            case 'slow_zone':
                color = 0xff0000;
                break;
            case 'shortcut':
                color = 0x0000ff;
                break;
            default:
                color = 0xffffff;
        }

        const material = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y += 0.05;

        return mesh;
    }

    updateActiveEvents(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Update event timers and remove expired events
        for (const [eventId, event] of this.activeEvents) {
            const elapsed = Date.now() - event.startTime;

            if (elapsed >= event.duration) {
                this.endEvent(eventId, event);
            }
        }
    }

    endEvent(eventId, event) {
        // Clean up event effects
        switch (event.type) {
            case 'weather_change':
                if (this.game.weatherManager) {
                    this.game.weatherManager.setWeather('clear', 0);
                }
                break;
            case 'hazard_spawn':
                // Hazards are removed by trackElementsManager
                break;
            case 'power_up_spawn':
                // Power-ups are removed when collected or timed out
                break;
            case 'track_modification':
                this.removeZone(eventId.replace('track_modification_', 'zone_'));
                break;
            case 'environmental_effect':
                this.resetEnvironmentalEffect(event.data.effectType);
                break;
        }

        this.activeEvents.delete(eventId);
        console.log(`🌪️ Dynamic event ended: ${event.type}`);
    }

    updatePowerUps(deltaTime) {
        // Rotate power-up meshes
        this.powerUps.forEach(powerUp => {
            if (powerUp.mesh) {
                powerUp.mesh.rotation.y += powerUp.mesh.userData.rotationSpeed;
            }
        });

        // Check for power-up collection
        this.checkPowerUpCollection();

        // Update active power-up effects
        this.updateActivePowerUpEffects(deltaTime);
    }

    checkPowerUpCollection() {
        const playerVehicle = this.game.physicsManager.getVehicle(0);
        if (!playerVehicle || !playerVehicle.chassisBody) return;

        const playerPos = playerVehicle.chassisBody.position;

        this.powerUps.forEach((powerUp, id) => {
            if (!powerUp.collected) {
                const distance = playerPos.distanceTo(powerUp.position);
                if (distance < 2) { // Collection radius
                    this.collectPowerUp(id);
                }
            }
        });
    }

    collectPowerUp(powerUpId) {
        const powerUp = this.powerUps.get(powerUpId);
        if (!powerUp) return;

        powerUp.collected = true;

        // Apply power-up effect
        const playerVehicle = this.game.physicsManager.getVehicle(0);
        if (playerVehicle) {
            this.powerUpTypes[powerUp.type].effect(playerVehicle);
        }

        // Add to active power-ups
        this.activePowerUps.set(powerUpId, {
            ...powerUp,
            activationTime: Date.now()
        });

        // Remove visual
        this.removePowerUp(powerUpId);

        // Add points/analytics
        if (this.game.analyticsManager) {
            this.game.analyticsManager.trackPowerUpCollected(powerUp.type, powerUp.value);
        }

        console.log(`⚡ Collected power-up: ${powerUp.type}`);
    }

    removePowerUp(powerUpId) {
        const powerUp = this.powerUps.get(powerUpId);
        if (powerUp && powerUp.mesh) {
            this.game.scene.remove(powerUp.mesh);
        }
        this.powerUps.delete(powerUpId);
    }

    updateActivePowerUpEffects(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Update durations and remove expired power-ups
        const now = Date.now();
        for (const [id, powerUp] of this.activePowerUps) {
            const elapsed = now - powerUp.activationTime;
            const duration = this.powerUpTypes[powerUp.type].duration;

            if (elapsed >= duration) {
                this.activePowerUps.delete(id);
            }
        }
    }

    updateTrackModifications(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Apply zone effects to vehicles in range
        this.modificationZones.forEach(zone => {
            this.applyZoneEffect(zone);
        });
    }

    applyZoneEffect(zone) {
        const vehicles = [this.game.physicsManager.getVehicle(0)]; // Player vehicle

        // Add AI vehicles
        if (this.game.sceneManager && this.game.sceneManager.aiVehicles) {
            this.game.sceneManager.aiVehicles.forEach(aiVehicle => {
                vehicles.push(aiVehicle.physicsVehicle);
            });
        }

        vehicles.forEach(vehicle => {
            if (!vehicle || !vehicle.chassisBody) return;

            const distance = vehicle.chassisBody.position.distanceTo(zone.position);
            if (distance <= zone.radius) {
                // Apply zone effect
                switch (zone.type) {
                    case 'speed_zone': {
                        // Temporarily boost speed
                        if (!vehicle.zoneBoost) {
                            vehicle.zoneBoost = true;
                            vehicle.maxEngineForce *= zone.effect;
                        }
                        break;
                    }
                    case 'slow_zone': {
                        // Temporarily reduce speed
                        if (!vehicle.zoneSlow) {
                            vehicle.zoneSlow = true;
                            vehicle.maxEngineForce *= zone.effect;
                        }
                        break;
                    }
                }
            } else {
                // Reset zone effects when leaving zone
                if (vehicle.zoneBoost) {
                    vehicle.zoneBoost = false;
                    vehicle.maxEngineForce /= zone.effect;
                }
                if (vehicle.zoneSlow) {
                    vehicle.zoneSlow = false;
                    vehicle.maxEngineForce /= zone.effect;
                }
            }
        });
    }

    removeZone(zoneId) {
        const zone = this.modificationZones.get(zoneId);
        if (zone && zone.mesh) {
            this.game.scene.remove(zone.mesh);
        }
        this.modificationZones.delete(zoneId);
    }

    // Environmental effects
    applyWindGust(intensity) {
        // Apply wind force to all vehicles
        const windForce = new CANNON.Vec3(intensity * 1000, 0, 0);
        const vehicles = [this.game.physicsManager.getVehicle(0)];

        if (this.game.sceneManager && this.game.sceneManager.aiVehicles) {
            this.game.sceneManager.aiVehicles.forEach(aiVehicle => {
                vehicles.push(aiVehicle.physicsVehicle);
            });
        }

        vehicles.forEach(vehicle => {
            if (vehicle && vehicle.chassisBody) {
                vehicle.chassisBody.applyForce(windForce, vehicle.chassisBody.position);
            }
        });
    }

    applyEarthquake(intensity) {
        // Shake camera and apply random forces
        if (this.game.camera) {
            const shake = intensity * 0.1;
            this.game.camera.position.x += (Math.random() - 0.5) * shake;
            this.game.camera.position.y += (Math.random() - 0.5) * shake;
        }
    }

    applyTimeDilation(intensity) {
        // Slow down time (reduce physics simulation speed)
        if (this.game.physicsManager && this.game.physicsManager.world) {
            // This would require modifying the physics world time step
            // For now, just log the effect
            console.log(`⏰ Time dilation applied: ${intensity}`);
        }
    }

    resetEnvironmentalEffect(effectType) {
        switch (effectType) {
            case 'time_dilation': {
                console.log('⏰ Time dilation reset');
                break;
            }
        }
    }

    // Utility methods
    generateRandomTrackPosition() {
        // Generate a random position near the track
        // This is a simplified implementation
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 40; // Track radius variation
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return new THREE.Vector3(x, 0, z);
    }

    getPlayerSpeed() {
        const playerVehicle = this.game.physicsManager.getVehicle(0);
        if (!playerVehicle || !playerVehicle.chassisBody) return 0;

        const velocity = playerVehicle.chassisBody.velocity;
        return Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    }

    scheduleNextEvent() {
        // Schedule next event check
        const delay = 5000 + Math.random() * 10000; // 5-15 seconds
        setTimeout(() => {
            this.checkEventTriggers();
            this.scheduleNextEvent();
        }, delay);
    }

    getEventStatus() {
        return {
            activeEvents: this.activeEvents.size,
            powerUps: this.powerUps.size,
            activePowerUps: this.activePowerUps.size,
            modificationZones: this.modificationZones.size,
            eventTypes: Object.keys(this.eventTypes)
        };
    }

    // Manual event triggers (for testing or special occasions)
    triggerSpecificEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            startTime: Date.now(),
            duration: this.eventTypes[eventType]?.duration || 10000,
            active: true,
            data: { ...this.generateEventData(eventType), ...data }
        };

        this.activeEvents.set(eventType + '_manual_' + Date.now(), event);
        this.executeEvent(event);

        console.log(`🎯 Manual event triggered: ${eventType}`);
    }
}