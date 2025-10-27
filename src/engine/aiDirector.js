import * as THREE from 'three';

export class AIDirector {
    constructor(game) {
        this.game = game;
        this.aiControllers = [];
        this.eventQueue = [];
        this.raceIntensity = 0.5; // 0-1 scale
        this.lastEventTime = 0;
        this.eventCooldown = 30000; // 30 seconds between major events

        // Dynamic event types
        this.eventTypes = {
            overtake_opportunity: { weight: 0.3, duration: 10000 },
            position_battle: { weight: 0.25, duration: 15000 },
            caution_period: { weight: 0.15, duration: 20000 },
            weather_change: { weight: 0.1, duration: 30000 },
            hazard_appearance: { weight: 0.1, duration: 5000 },
            power_up_spawn: { weight: 0.1, duration: 10000 }
        };

        // Race state tracking
        this.raceState = {
            positions: [],
            gaps: [],
            incidents: [],
            weather: 'clear',
            hazards: []
        };

        this.initializeAIDirector();
    }

    initializeAIDirector() {
        console.log('🎬 AI Director initialized - managing dynamic race events');

        // Set up event scheduling
        this.scheduleNextEvent();

        // Initialize race state monitoring
        this.updateRaceState();
    }

    addAIController(aiController) {
        this.aiControllers.push(aiController);
        console.log(`🤖 AI Controller added to director (${this.aiControllers.length} total)`);
    }

    update(deltaTime) {
        // Update race state
        this.updateRaceState();

        // Process active events
        this.processEvents(deltaTime);

        // Check for new event triggers
        this.checkEventTriggers();

        // Adjust AI behaviors based on race dynamics
        this.adjustAIBehaviors();

        // Update race intensity
        this.updateRaceIntensity();
    }

    updateRaceState() {
        if (!this.game.physicsManager || !this.game.physicsManager.vehicles) return;

        const vehicles = this.game.physicsManager.vehicles;
        const playerVehicle = this.game.physicsManager.vehicle;

        // Update positions
        this.raceState.positions = vehicles.map((vehicle, index) => ({
            id: index,
            position: vehicle.chassisBody.position.clone(),
            velocity: vehicle.chassisBody.velocity.clone(),
            speed: vehicle.chassisBody.velocity.length(),
            isPlayer: vehicle === playerVehicle
        }));

        // Calculate gaps between vehicles
        this.raceState.gaps = [];
        for (let i = 1; i < this.raceState.positions.length; i++) {
            const gap = this.calculateGap(
                this.raceState.positions[i-1].position,
                this.raceState.positions[i].position
            );
            this.raceState.gaps.push(gap);
        }

        // Update incidents (collisions, off-track, etc.)
        this.updateIncidents();
    }

    calculateGap(pos1, pos2) {
        // Calculate distance along track (simplified)
        return pos1.distanceTo(pos2);
    }

    updateIncidents() {
        // Track recent incidents for AI behavior adjustment
        const now = Date.now();

        // Clean old incidents
        this.raceState.incidents = this.raceState.incidents.filter(
            incident => now - incident.time < 60000 // Remember for 1 minute
        );

        // Check for new incidents (this would be expanded with collision detection)
        // For now, just track based on speed drops or position changes
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

        // Check for close racing (small gaps)
        const closeRacing = this.raceState.gaps.some(gap => gap < 5);

        // Check race intensity
        const highIntensity = this.raceIntensity > 0.7;

        // Check for incidents
        const recentIncidents = this.raceState.incidents.filter(
            incident => Date.now() - incident.time < 10000
        ).length > 0;

        // Random chance based on conditions
        let triggerChance = 0.1; // Base 10% chance

        if (closeRacing) triggerChance += 0.2;
        if (highIntensity) triggerChance += 0.15;
        if (recentIncidents) triggerChance += 0.1;

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

        this.eventQueue.push(event);
        this.executeEvent(event);

        console.log(`🎭 AI Director triggered: ${eventType}`);
    }

    generateEventData(eventType) {
        switch (eventType) {
            case 'overtake_opportunity': {
                return {
                    position: Math.floor(Math.random() * this.aiControllers.length),
                    duration: 10000
                };
            }

            case 'position_battle': {
                return {
                    positions: [1, 2], // Positions involved in battle
                    intensity: Math.random() * 0.5 + 0.5
                };
            }

            case 'caution_period': {
                return {
                    reason: 'incident',
                    affectedArea: 'sector_2'
                };
            }

            case 'weather_change': {
                const weathers = ['rain', 'fog', 'wind'];
                return {
                    newWeather: weathers[Math.floor(Math.random() * weathers.length)],
                    intensity: Math.random()
                };
            }

            case 'hazard_appearance': {
                return {
                    hazardType: 'oil_spill',
                    position: new THREE.Vector3(
                        (Math.random() - 0.5) * 40,
                        0,
                        (Math.random() - 0.5) * 40
                    ),
                    radius: 3
                };
            }

            case 'power_up_spawn': {
                return {
                    powerUpType: 'boost',
                    position: new THREE.Vector3(
                        (Math.random() - 0.5) * 30,
                        1,
                        (Math.random() - 0.5) * 30
                    )
                };
            }

            default: {
                return {};
            }
        }
    }

    executeEvent(event) {
        switch (event.type) {
            case 'overtake_opportunity': {
                this.executeOvertakeOpportunity(event);
                break;
            }
            case 'position_battle': {
                this.executePositionBattle(event);
                break;
            }
            case 'caution_period': {
                this.executeCautionPeriod(event);
                break;
            }
            case 'weather_change': {
                this.executeWeatherChange(event);
                break;
            }
            case 'hazard_appearance': {
                this.executeHazardAppearance(event);
                break;
            }
            case 'power_up_spawn': {
                this.executePowerUpSpawn(event);
                break;
            }
        }
    }

    executeOvertakeOpportunity(event) {
        // Make AI at specific position more aggressive for overtaking
        const targetAI = this.aiControllers[event.data.position];
        if (targetAI) {
            targetAI.personality.stats.aggressiveness = Math.min(1.0, targetAI.personality.stats.aggressiveness + 0.3);
            targetAI.personality.stats.riskTaking = Math.min(1.0, targetAI.personality.stats.riskTaking + 0.2);

            // Reset after event duration
            setTimeout(() => {
                targetAI.personality.stats.aggressiveness -= 0.3;
                targetAI.personality.stats.riskTaking -= 0.2;
            }, event.duration);
        }
    }

    executePositionBattle(event) {
        // Make multiple AIs more competitive
        event.data.positions.forEach(pos => {
            if (this.aiControllers[pos]) {
                const ai = this.aiControllers[pos];
                ai.behaviorState = 'blocking';
                ai.maxEngineForce *= 1.1; // Temporary speed boost

                setTimeout(() => {
                    ai.behaviorState = 'racing';
                    ai.maxEngineForce /= 1.1;
                }, event.duration);
            }
        });
    }

    executeCautionPeriod(event) {
        // Make all AIs more conservative during caution
        this.aiControllers.forEach(ai => {
            ai.maxEngineForce *= 0.7;
            ai.personality.stats.riskTaking *= 0.5;
        });

        setTimeout(() => {
            this.aiControllers.forEach(ai => {
                ai.maxEngineForce /= 0.7;
                ai.personality.stats.riskTaking /= 0.5;
            });
        }, event.duration);
    }

    executeWeatherChange(event) {
        // Adjust AI behavior for weather conditions
        this.raceState.weather = event.data.newWeather;

        const weatherMultiplier = event.data.intensity;

        this.aiControllers.forEach(ai => {
            switch (event.data.newWeather) {
                case 'rain':
                    ai.maxEngineForce *= (0.8 - weatherMultiplier * 0.2);
                    ai.maxSteerValue *= (0.9 - weatherMultiplier * 0.1);
                    break;
                case 'fog':
                    ai.lookAheadDistance *= (0.7 - weatherMultiplier * 0.2);
                    break;
                case 'wind':
                    // Wind affects steering randomly
                    ai.maxSteerValue *= 0.9;
                    break;
            }
        });

        // Reset weather effects after duration
        setTimeout(() => {
            this.raceState.weather = 'clear';
            this.resetWeatherEffects();
        }, event.duration);
    }

    executeHazardAppearance(event) {
        // AIs avoid hazard area
        this.raceState.hazards.push(event.data);

        this.aiControllers.forEach(ai => {
            // Modify waypoints to avoid hazard
            ai.avoidHazard(event.data.position, event.data.radius);
        });

        setTimeout(() => {
            this.raceState.hazards = this.raceState.hazards.filter(h => h !== event.data);
        }, event.duration);
    }

    executePowerUpSpawn(event) {
        // AIs compete for power-up
        this.aiControllers.forEach(ai => {
            if (Math.random() < 0.7) { // 70% chance to go for power-up
                ai.targetPowerUp(event.data.position);
            }
        });
    }

    processEvents(deltaTime) {
        // Update active events and remove expired ones
        this.eventQueue = this.eventQueue.filter(event => {
            const elapsed = Date.now() - event.startTime;

            if (elapsed >= event.duration) {
                this.endEvent(event);
                return false;
            }

            return true;
        });
    }

    endEvent(event) {
        // Clean up event effects
        console.log(`🎭 AI Director event ended: ${event.type}`);
    }

    adjustAIBehaviors() {
        // Adjust AI behaviors based on current race state
        this.aiControllers.forEach((ai, index) => {
            // Adjust based on position
            if (index === 0) {
                // Leader AI - more conservative
                ai.personality.stats.riskTaking = Math.max(0.3, ai.personality.stats.riskTaking * 0.9);
            } else if (index < 3) {
                // Top contenders - more aggressive
                ai.personality.stats.aggressiveness = Math.min(1.0, ai.personality.stats.aggressiveness * 1.1);
            }

            // Adjust based on gaps
            if (index > 0 && this.raceState.gaps[index - 1] < 3) {
                // Close behind - try to overtake
                ai.behaviorState = 'blocking'; // Actually should be overtaking, but using blocking for now
            }
        });
    }

    updateRaceIntensity() {
        // Calculate race intensity based on various factors
        let intensity = 0.5; // Base intensity

        // Factor in close racing
        const closeRacingFactor = this.raceState.gaps.filter(gap => gap < 5).length * 0.1;
        intensity += closeRacingFactor;

        // Factor in speed variance
        const speeds = this.raceState.positions.map(p => p.speed);
        const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
        const speedVariance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
        const speedVarianceFactor = Math.min(0.2, speedVariance / 10);
        intensity += speedVarianceFactor;

        // Factor in active events
        const eventFactor = this.eventQueue.length * 0.1;
        intensity += eventFactor;

        // Clamp intensity
        this.raceIntensity = Math.max(0, Math.min(1, intensity));
    }

    scheduleNextEvent() {
        // Schedule next event check
        const delay = 10000 + Math.random() * 20000; // 10-30 seconds
        setTimeout(() => {
            this.checkEventTriggers();
            this.scheduleNextEvent();
        }, delay);
    }

    resetWeatherEffects() {
        // Reset all weather-related AI modifications
        this.aiControllers.forEach(ai => {
            // Reset to base values (this would need to store original values)
            ai.maxEngineForce = ai.constructor.defaultMaxEngineForce || 1200;
            ai.maxSteerValue = ai.constructor.defaultMaxSteerValue || 0.3;
            ai.lookAheadDistance = ai.constructor.defaultLookAheadDistance || 10;
        });
    }

    getRaceStatus() {
        return {
            intensity: this.raceIntensity,
            activeEvents: this.eventQueue.length,
            weather: this.raceState.weather,
            hazards: this.raceState.hazards.length,
            positions: this.raceState.positions.length,
            averageGap: this.raceState.gaps.length > 0 ?
                this.raceState.gaps.reduce((sum, gap) => sum + gap, 0) / this.raceState.gaps.length : 0
        };
    }

    // Emergency event triggers (called by game systems)
    triggerEmergencyEvent(eventType, data = {}) {
        const emergencyEvent = {
            type: eventType,
            startTime: Date.now(),
            duration: 5000, // Short emergency event
            active: true,
            data: data,
            emergency: true
        };

        this.eventQueue.push(emergencyEvent);
        this.executeEvent(emergencyEvent);

        console.log(`🚨 AI Director emergency event: ${eventType}`);
    }
}