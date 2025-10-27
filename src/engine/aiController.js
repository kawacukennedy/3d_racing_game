import * as THREE from 'three';

export class AIController {
    constructor(track) {
        this.track = track; // Reference to track for pathfinding
        this.vehicle = null;
        this.physicsVehicle = null;
        this.maxEngineForce = 1200;
        this.maxBrakeForce = 120;
        this.maxSteerValue = 0.3;
        this.targetWaypoint = 0;
        this.waypoints = this.generateWaypoints();
        this.lookAheadDistance = 10;
        this.skillLevel = 0.8; // 0-1, affects reaction time and accuracy
        this.difficulty = 'normal'; // easy, normal, hard, expert

        // Behavior tree components
        this.behaviorState = 'racing'; // racing, drafting, blocking, recovering
        this.personality = this.generatePersonality();
        this.reactionTime = 0;
        this.lastDecisionTime = 0;
        this.rubberBanding = { boost: 0, brake: 0 };

        // Difficulty-based settings
        this.setDifficulty(this.difficulty);

        // Advanced AI features
        this.draftingTarget = null;
        this.blockingTarget = null;
        this.collisionMemory = [];
        this.lapTimes = [];
        this.optimalLine = this.calculateOptimalLine();
    }

    generateWaypoints() {
        // Generate waypoints around a simple oval track
        const waypoints = [];
        const trackRadius = 20;
        const numWaypoints = 16;

        for (let i = 0; i < numWaypoints; i++) {
            const angle = (i / numWaypoints) * Math.PI * 2;
            const x = Math.cos(angle) * trackRadius;
            const z = Math.sin(angle) * trackRadius;
            waypoints.push(new THREE.Vector3(x, 0, z));
        }

        return waypoints;
    }

    generatePersonality() {
        const personalities = ['aggressive', 'defensive', 'balanced', 'erratic'];
        const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];

        const baseStats = {
            aggressiveness: 0.5,
            riskTaking: 0.5,
            precision: 0.5,
            adaptability: 0.5,
            reactionTime: 0.2
        };

        // Modify stats based on personality
        switch (randomPersonality) {
            case 'aggressive':
                baseStats.aggressiveness = 0.8;
                baseStats.riskTaking = 0.7;
                baseStats.precision = 0.6;
                break;
            case 'defensive':
                baseStats.aggressiveness = 0.3;
                baseStats.riskTaking = 0.3;
                baseStats.precision = 0.8;
                break;
            case 'balanced':
                // Keep default values
                break;
            case 'erratic':
                baseStats.adaptability = 0.8;
                baseStats.reactionTime = 0.4;
                baseStats.precision = 0.4;
                break;
        }

        return {
            type: randomPersonality,
            stats: baseStats
        };
    }

    calculateOptimalLine() {
        // Calculate racing line that minimizes lap time
        // For now, return the basic waypoints
        return this.waypoints.map(wp => wp.clone());
    }

    init(world) {
        // Similar to VehicleController but for AI
    }

    update(deltaTime) {
        if (!this.physicsVehicle || !this.physicsVehicle.chassisBody) return;

        const currentTime = Date.now();
        this.reactionTime += deltaTime;

        // Update behavior tree based on personality and situation
        if (currentTime - this.lastDecisionTime > (this.personality.stats.reactionTime * 1000)) {
            this.updateBehaviorTree();
            this.lastDecisionTime = currentTime;
        }

        // Apply rubber banding
        this.updateRubberBanding();

        const vehiclePosition = this.physicsVehicle.chassisBody.position;
        const vehicleQuaternion = this.physicsVehicle.chassisBody.quaternion;

        // Find next waypoint based on current behavior
        const targetWaypoint = this.getBehavioralWaypoint(vehiclePosition);

        // Calculate steering with personality modifiers
        const steerValue = this.calculateSteering(vehiclePosition, vehicleQuaternion, targetWaypoint);

        // Calculate throttle with behavior modifiers
        const engineForce = this.calculateThrottle(vehiclePosition, targetWaypoint);

        // Apply brake if needed
        const brakeForce = this.calculateBraking(vehiclePosition, targetWaypoint);

        // Apply forces to all wheels
        for (let i = 0; i < this.physicsVehicle.wheelInfos.length; i++) {
            this.physicsVehicle.applyEngineForce(engineForce, i);
            this.physicsVehicle.setBrake(brakeForce, i);

            // Steering for front wheels only
            if (i < 2) {
                this.physicsVehicle.setSteeringValue(steerValue, i);
            }
        }

        // Update collision memory
        this.updateCollisionMemory();
    }

    updateBehaviorTree() {
        const vehiclePosition = this.physicsVehicle.chassisBody.position;
        const vehicleVelocity = this.physicsVehicle.chassisBody.velocity;

        // Evaluate current situation
        const speed = Math.sqrt(vehicleVelocity.x ** 2 + vehicleVelocity.z ** 2);
        const isInCorner = this.isApproachingCorner(vehiclePosition);
        const hasNearbyOpponents = this.checkForNearbyOpponents(vehiclePosition);

        // Behavior tree logic
        if (this.behaviorState === 'recovering' && speed > 5) {
            this.behaviorState = 'racing';
        }

        if (this.personality.type === 'aggressive' && hasNearbyOpponents) {
            if (Math.random() < this.personality.stats.aggressiveness) {
                this.behaviorState = 'blocking';
                this.blockingTarget = hasNearbyOpponents[0];
            }
        }

        if (this.personality.type === 'defensive' && hasNearbyOpponents) {
            if (Math.random() < (1 - this.personality.stats.riskTaking)) {
                this.behaviorState = 'drafting';
                this.draftingTarget = hasNearbyOpponents[0];
            }
        }

        // Reset to racing if no special behavior applies
        if (!hasNearbyOpponents || Math.random() < 0.1) {
            this.behaviorState = 'racing';
            this.draftingTarget = null;
            this.blockingTarget = null;
        }
    }

    updateRubberBanding() {
        // Simple rubber banding - boost slower AIs, brake faster ones
        const targetSpeed = 15; // Target speed for rubber banding
        const currentSpeed = this.getCurrentSpeed();

        if (currentSpeed < targetSpeed * 0.8) {
            this.rubberBanding.boost = Math.min(1, (targetSpeed - currentSpeed) / targetSpeed);
        } else if (currentSpeed > targetSpeed * 1.2) {
            this.rubberBanding.brake = Math.min(1, (currentSpeed - targetSpeed) / targetSpeed);
        } else {
            this.rubberBanding.boost = 0;
            this.rubberBanding.brake = 0;
        }
    }

    getBehavioralWaypoint(vehiclePosition) {
        let baseWaypoint = this.getNextWaypoint(vehiclePosition);

        switch (this.behaviorState) {
            case 'blocking':
                // Position to block opponent
                if (this.blockingTarget) {
                    const blockOffset = new THREE.Vector3(0, 0, -3); // Block by positioning ahead
                    return baseWaypoint.clone().add(blockOffset);
                }
                break;
            case 'drafting':
                // Position behind opponent for slipstream
                if (this.draftingTarget) {
                    const draftOffset = new THREE.Vector3(0, 0, 2); // Position behind
                    return baseWaypoint.clone().add(draftOffset);
                }
                break;
            case 'recovering':
                // Take safer line
                return this.optimalLine[this.targetWaypoint] || baseWaypoint;
        }

        return baseWaypoint;
    }

    isApproachingCorner(vehiclePosition) {
        const nextWaypoint = this.getNextWaypoint(vehiclePosition);
        const distance = vehiclePosition.distanceTo(nextWaypoint);
        return distance < 8; // Within corner approach distance
    }

    checkForNearbyOpponents(vehiclePosition) {
        // This would check against other vehicles in a real implementation
        // For now, return empty array
        return [];
    }

    getCurrentSpeed() {
        if (!this.physicsVehicle || !this.physicsVehicle.chassisBody) return 0;
        const velocity = this.physicsVehicle.chassisBody.velocity;
        return Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    }

    updateCollisionMemory() {
        // Clean old collision memories
        const now = Date.now();
        this.collisionMemory = this.collisionMemory.filter(
            collision => now - collision.time < 30000 // Remember for 30 seconds
        );
    }

    getNextWaypoint(vehiclePosition) {
        // Find the closest waypoint ahead
        let closestIndex = 0;
        let closestDistance = Infinity;

        for (let i = 0; i < this.waypoints.length; i++) {
            const distance = vehiclePosition.distanceTo(this.waypoints[i]);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }

        // Return the waypoint a bit ahead for smoother pathing
        const lookAheadIndex = (closestIndex + Math.floor(this.lookAheadDistance / 5)) % this.waypoints.length;
        return this.waypoints[lookAheadIndex];
    }

    calculateSteering(vehiclePosition, vehicleQuaternion, targetWaypoint) {
        // Calculate desired direction
        const toTarget = new THREE.Vector3().subVectors(targetWaypoint, vehiclePosition).normalize();

        // Get vehicle's forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(vehicleQuaternion);

        // Calculate angle between forward and target direction
        const dot = forward.dot(toTarget);
        const cross = new THREE.Vector3().crossVectors(forward, toTarget);
        const angle = Math.atan2(cross.y, dot);

        // Base steering calculation
        let baseSteer = Math.max(-1, Math.min(1, angle / (Math.PI / 3)));

        // Apply personality modifiers
        if (this.personality.type === 'erratic') {
            baseSteer += (Math.random() - 0.5) * 0.4; // More unpredictable steering
        }

        // Precision modifier
        const precisionModifier = 1 + (this.personality.stats.precision - 0.5) * 0.4;
        baseSteer *= precisionModifier;

        // Behavior modifiers
        switch (this.behaviorState) {
            case 'blocking':
                baseSteer *= 1.2; // More aggressive steering to block
                break;
            case 'drafting':
                baseSteer *= 0.8; // Smoother steering while drafting
                break;
        }

        // Add skill-based variation
        const skillVariation = (Math.random() - 0.5) * (1 - this.skillLevel) * 0.3;
        baseSteer += skillVariation;

        return Math.max(-this.maxSteerValue, Math.min(this.maxSteerValue, baseSteer));
    }

    calculateThrottle(vehiclePosition, targetWaypoint) {
        const distance = vehiclePosition.distanceTo(targetWaypoint);
        const currentSpeed = this.getCurrentSpeed();

        // Base throttle calculation
        let throttle = 1.0;
        if (distance < 5) {
            throttle = 0.5; // Slow down approaching waypoint
        }

        // Apply personality modifiers
        if (this.personality.type === 'aggressive') {
            throttle *= 1.1; // Aggressive drivers push harder
        } else if (this.personality.type === 'defensive') {
            throttle *= 0.9; // Defensive drivers are more conservative
        }

        // Apply rubber banding
        throttle += this.rubberBanding.boost;
        throttle -= this.rubberBanding.brake * 0.5;

        // Behavior modifiers
        switch (this.behaviorState) {
            case 'blocking':
                throttle *= 1.2; // Speed up to block
                break;
            case 'drafting':
                throttle *= 0.9; // Slow down to draft
                break;
            case 'recovering':
                throttle *= 0.7; // Conservative speed
                break;
        }

        // Add personality-based variation
        const personalityVariation = (Math.random() - 0.5) * this.personality.stats.riskTaking * 0.3;
        throttle += personalityVariation;

        // Add skill-based variation
        const skillVariation = (Math.random() - 0.5) * (1 - this.skillLevel) * 0.2;
        throttle += skillVariation;

        throttle = Math.max(0, Math.min(1.5, throttle)); // Allow slight over-throttle for aggressive drivers

        return throttle * this.maxEngineForce;
    }

    calculateBraking(vehiclePosition, targetWaypoint) {
        // Simple braking logic - brake before sharp turns
        const distance = vehiclePosition.distanceTo(targetWaypoint);

        if (distance < 8) {
            // Check if next waypoint requires sharp turn
            const nextIndex = (this.waypoints.indexOf(targetWaypoint) + 1) % this.waypoints.length;
            const nextWaypoint = this.waypoints[nextIndex];
            const currentDir = new THREE.Vector3().subVectors(targetWaypoint, vehiclePosition).normalize();
            const nextDir = new THREE.Vector3().subVectors(nextWaypoint, targetWaypoint).normalize();

            const turnAngle = Math.acos(currentDir.dot(nextDir));
            if (turnAngle > Math.PI / 4) { // Sharp turn
                return this.maxBrakeForce * 0.5;
            }
        }

        return 0;
    }

    setVehicle(vehicle) {
        this.vehicle = vehicle;
    }

    setPhysicsVehicle(physicsVehicle) {
        this.physicsVehicle = physicsVehicle;
    }

    setSkillLevel(skill) {
        this.skillLevel = Math.max(0, Math.min(1, skill));
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;

        // Adjust AI parameters based on difficulty
        switch (difficulty) {
            case 'easy':
                this.skillLevel = 0.4;
                this.maxEngineForce = 800;
                this.maxSteerValue = 0.2;
                this.reactionTime = 0.5; // Slower reactions
                this.lookAheadDistance = 8;
                break;

            case 'normal':
                this.skillLevel = 0.7;
                this.maxEngineForce = 1200;
                this.maxSteerValue = 0.3;
                this.reactionTime = 0.2;
                this.lookAheadDistance = 12;
                break;

            case 'hard':
                this.skillLevel = 0.9;
                this.maxEngineForce = 1500;
                this.maxSteerValue = 0.35;
                this.reactionTime = 0.1;
                this.lookAheadDistance = 15;
                break;

            case 'expert':
                this.skillLevel = 1.0;
                this.maxEngineForce = 1800;
                this.maxSteerValue = 0.4;
                this.reactionTime = 0.05; // Very fast reactions
                this.lookAheadDistance = 18;
                break;

            default:
                this.setDifficulty('normal');
                return;
        }

        console.log(`AI difficulty set to ${difficulty} (skill: ${this.skillLevel})`);
    }



    getReactionTime() {
        // Base reaction time modified by skill level and personality
        let baseTime = 0.15; // 150ms base

        // Skill level affects reaction time (better AI reacts faster)
        baseTime *= (1 - this.skillLevel * 0.5);

        // Personality affects reaction time
        switch (this.personality.type) {
            case 'aggressive': baseTime *= 0.8; break; // Faster reactions
            case 'defensive': baseTime *= 1.2; break; // Slower, more careful
            case 'erratic': baseTime *= (0.5 + Math.random()); break; // Random
        }

        return Math.max(0.05, baseTime); // Minimum 50ms
    }

    updateBehaviorState() {
        // Determine current racing situation and choose appropriate behavior

        // Check if we should draft
        if (this.shouldDraft()) {
            this.behaviorState = 'drafting';
        }
        // Check if we should block
        else if (this.shouldBlock()) {
            this.behaviorState = 'blocking';
        }
        // Check if we need to recover from a mistake
        else if (this.shouldRecover()) {
            this.behaviorState = 'recovering';
        }
        // Default racing behavior
        else {
            this.behaviorState = 'racing';
        }
    }

    shouldDraft() {
        // Look for vehicles ahead to draft behind
        // This would need access to other vehicles' positions
        // For now, return false - drafting logic would be implemented here
        return false;
    }

    shouldBlock() {
        // Check if a faster car is approaching from behind
        // This would need access to other vehicles' positions and speeds
        return false;
    }

    shouldRecover() {
        // Check if we're off-track or in a bad position
        if (!this.vehicle) return false;

        // Simple recovery: if we're not moving toward the next waypoint
        const targetWaypoint = this.getTargetWaypoint();
        if (!targetWaypoint) return false;

        const toWaypoint = new THREE.Vector3().subVectors(targetWaypoint, this.vehicle.position);
        const velocity = this.physicsVehicle.chassisBody.velocity;
        const velocityDir = new THREE.Vector3(velocity.x, 0, velocity.z).normalize();

        if (velocityDir.length() > 0) {
            const dotProduct = velocityDir.dot(toWaypoint.normalize());
            return dotProduct < 0.3; // Not moving toward waypoint
        }

        return true; // Not moving at all
    }

    executeBehavior() {
        switch (this.behaviorState) {
            case 'racing':
                this.executeRacingBehavior();
                break;
            case 'drafting':
                this.executeDraftingBehavior();
                break;
            case 'blocking':
                this.executeBlockingBehavior();
                break;
            case 'recovering':
                this.executeRecoveryBehavior();
                break;
        }
    }

    executeRacingBehavior() {
        const targetWaypoint = this.getTargetWaypoint();
        if (!targetWaypoint) return;

        // Calculate steering toward waypoint
        const steerValue = this.calculateSteering(this.vehicle.position, this.vehicle.rotation, targetWaypoint);

        // Calculate throttle based on situation
        const throttle = this.calculateThrottle(this.vehicle.position, targetWaypoint);

        // Calculate braking
        const brakeForce = this.calculateBraking(this.vehicle.position, targetWaypoint);

        // Apply controls
        this.applyControls(steerValue, throttle, brakeForce);
    }

    executeDraftingBehavior() {
        // Follow closely behind another vehicle to reduce air resistance
        // This would implement slipstreaming mechanics
        this.executeRacingBehavior(); // For now, just race normally
    }

    executeBlockingBehavior() {
        // Try to prevent faster cars from passing
        // This could involve defensive driving maneuvers
        this.executeRacingBehavior(); // For now, just race normally
    }

    executeRecoveryBehavior() {
        // Try to get back on track or recover from a spin
        const targetWaypoint = this.getTargetWaypoint();
        if (!targetWaypoint) return;

        // More aggressive steering to get back on track
        const steerValue = this.calculateSteering(this.vehicle.position, this.vehicle.rotation, targetWaypoint) * 1.5;

        // Conservative throttle
        const throttle = 0.3;

        // Light braking
        const brakeForce = this.maxBrakeForce * 0.2;

        this.applyControls(steerValue, throttle, brakeForce);
    }

    applyControls(steerValue, throttle, brakeForce) {
        if (!this.physicsVehicle) return;

        // Apply steering
        this.physicsVehicle.setSteeringValue(steerValue, 0); // Front left
        this.physicsVehicle.setSteeringValue(steerValue, 1); // Front right

        // Apply engine force
        const engineForce = throttle * this.maxEngineForce;
        this.physicsVehicle.applyEngineForce(engineForce, 2); // Rear left
        this.physicsVehicle.applyEngineForce(engineForce, 3); // Rear right

        // Apply braking
        if (brakeForce > 0) {
            this.physicsVehicle.setBrake(brakeForce, 0); // Front left
            this.physicsVehicle.setBrake(brakeForce, 1); // Front right
            this.physicsVehicle.setBrake(brakeForce, 2); // Rear left
            this.physicsVehicle.setBrake(brakeForce, 3); // Rear right
        } else {
            // Release brakes
            this.physicsVehicle.setBrake(0, 0);
            this.physicsVehicle.setBrake(0, 1);
            this.physicsVehicle.setBrake(0, 2);
            this.physicsVehicle.setBrake(0, 3);
        }
    }

    // Racing statistics and learning
    recordLapTime(lapTime) {
        this.lapTimes.push(lapTime);

        // Keep only last 5 lap times
        if (this.lapTimes.length > 5) {
            this.lapTimes.shift();
        }

        // Calculate average lap time for performance tracking
        const avgLapTime = this.lapTimes.reduce((sum, time) => sum + time, 0) / this.lapTimes.length;
        console.log(`${this.personality.name} completed lap in ${lapTime.toFixed(2)}ms (avg: ${avgLapTime.toFixed(2)}ms)`);
    }

    // Get AI status for debugging
    getStatus() {
        return {
            difficulty: this.difficulty,
            skillLevel: this.skillLevel,
            behaviorState: this.behaviorState,
            personality: this.personality,
            lapTimes: this.lapTimes,
            targetWaypoint: this.targetWaypoint
        };
    }
}