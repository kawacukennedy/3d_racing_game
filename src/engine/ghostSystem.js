import * as THREE from 'three';

export class GhostSystem {
    constructor(game) {
        this.game = game;
        this.ghostData = null;
        this.ghostVehicle = null;
        this.ghostWheelMeshes = [];
        this.isReplaying = false;
        this.currentReplayTime = 0;
        this.replaySpeed = 1.0;
        this.ghostOpacity = 0.6;

        // Recording state
        this.isRecording = false;
        this.recordedLaps = [];
        this.currentLapData = null;
        this.lastRecordTime = 0;
        this.recordInterval = 50; // Record every 50ms

        this.initializeGhostSystem();
    }

    initializeGhostSystem() {
        console.log('👻 Ghost System initialized - recording and replaying lap times');

        // Load saved ghost data
        this.loadGhostData();

        // Set up event listeners for lap completion
        this.setupLapRecording();
    }

    setupLapRecording() {
        // This will be called when a lap is completed
        // Integration with gameModeManager for lap events
    }

    startRecording() {
        if (this.isRecording) return;

        console.log('🎬 Started recording lap data');
        this.isRecording = true;
        this.currentLapData = {
            startTime: Date.now(),
            positions: [],
            rotations: [],
            timestamps: [],
            vehicleType: this.game.sceneManager.currentVehicleType,
            trackId: 'default_track' // TODO: Get actual track ID
        };
        this.lastRecordTime = Date.now();
    }

    stopRecording() {
        if (!this.isRecording) return;

        console.log('⏹️ Stopped recording lap data');
        this.isRecording = false;

        if (this.currentLapData && this.currentLapData.positions.length > 0) {
            // Calculate lap time
            const lapTime = Date.now() - this.currentLapData.startTime;
            this.currentLapData.lapTime = lapTime;

            // Save this lap
            this.recordedLaps.push(this.currentLapData);

            // Keep only the best 5 laps
            this.recordedLaps.sort((a, b) => a.lapTime - b.lapTime);
            if (this.recordedLaps.length > 5) {
                this.recordedLaps = this.recordedLaps.slice(0, 5);
            }

            // Check if this is a new personal best
            if (!this.ghostData || lapTime < this.ghostData.lapTime) {
                this.ghostData = { ...this.currentLapData };
                this.saveGhostData();
                console.log(`🏆 New personal best: ${this.formatTime(lapTime)}`);
            }

            this.currentLapData = null;
        }
    }

    recordFrame() {
        if (!this.isRecording || !this.currentLapData) return;

        const now = Date.now();
        if (now - this.lastRecordTime < this.recordInterval) return;

        const playerVehicle = this.game.physicsManager.getVehicle(0);
        if (!playerVehicle || !playerVehicle.chassisBody) return;

        const position = playerVehicle.chassisBody.position.clone();
        const quaternion = playerVehicle.chassisBody.quaternion.clone();

        this.currentLapData.positions.push(position);
        this.currentLapData.rotations.push(quaternion);
        this.currentLapData.timestamps.push(now - this.currentLapData.startTime);

        this.lastRecordTime = now;
    }

    startReplay() {
        if (!this.ghostData || this.isReplaying) return;

        console.log('👻 Starting ghost replay');
        this.isReplaying = true;
        this.currentReplayTime = 0;

        // Create ghost vehicle
        this.createGhostVehicle();

        // Start replay loop
        this.replayLoop();
    }

    stopReplay() {
        if (!this.isReplaying) return;

        console.log('👻 Stopped ghost replay');
        this.isReplaying = false;
        this.currentReplayTime = 0;

        // Remove ghost vehicle
        this.removeGhostVehicle();
    }

    createGhostVehicle() {
        if (!this.ghostData) return;

        // Create ghost vehicle mesh (semi-transparent version of player's vehicle)
        const vehicleConfig = this.game.sceneManager.vehicleConfigManager.getVehicleConfig(this.ghostData.vehicleType);
        if (!vehicleConfig) return;

        // Create main body
        const geometry = new THREE.BoxGeometry(vehicleConfig.width, vehicleConfig.height, vehicleConfig.length);
        const material = new THREE.MeshLambertMaterial({
            color: vehicleConfig.color,
            transparent: true,
            opacity: this.ghostOpacity
        });

        this.ghostVehicle = new THREE.Mesh(geometry, material);
        this.ghostVehicle.castShadow = false; // Ghosts don't cast shadows
        this.ghostVehicle.receiveShadow = false;

        // Create wheels
        this.ghostWheelMeshes = [];
        for (let i = 0; i < 4; i++) {
            const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
            const wheelMaterial = new THREE.MeshLambertMaterial({
                color: 0x333333,
                transparent: true,
                opacity: this.ghostOpacity
            });
            const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelMesh.castShadow = false;
            wheelMesh.receiveShadow = false;
            this.ghostWheelMeshes.push(wheelMesh);
            this.game.scene.add(wheelMesh);
        }

        this.game.scene.add(this.ghostVehicle);

        // Position wheels relative to vehicle
        this.updateGhostWheelPositions();
    }

    removeGhostVehicle() {
        if (this.ghostVehicle) {
            this.game.scene.remove(this.ghostVehicle);
            this.ghostVehicle = null;
        }

        this.ghostWheelMeshes.forEach(wheel => {
            this.game.scene.remove(wheel);
        });
        this.ghostWheelMeshes = [];
    }

    replayLoop() {
        if (!this.isReplaying || !this.ghostData) return;

        // Find the appropriate frame for current replay time
        const targetTime = this.currentReplayTime;
        let frameIndex = 0;

        // Find the closest timestamp
        for (let i = 0; i < this.ghostData.timestamps.length; i++) {
            if (this.ghostData.timestamps[i] >= targetTime) {
                frameIndex = i;
                break;
            }
        }

        if (frameIndex < this.ghostData.positions.length) {
            // Interpolate between frames for smoother replay
            const currentPos = this.ghostData.positions[frameIndex];
            const currentRot = this.ghostData.rotations[frameIndex];

            if (this.ghostVehicle) {
                this.ghostVehicle.position.copy(currentPos);
                this.ghostVehicle.quaternion.copy(currentRot);
                this.updateGhostWheelPositions();
            }
        }

        // Advance replay time
        this.currentReplayTime += (16.67 * this.replaySpeed); // ~60 FPS

        // Check if replay is complete
        if (this.currentReplayTime >= this.ghostData.lapTime) {
            if (this.shouldLoopReplay()) {
                this.currentReplayTime = 0; // Loop replay
            } else {
                this.stopReplay();
                return;
            }
        }

        // Continue replay loop
        setTimeout(() => this.replayLoop(), 16); // ~60 FPS
    }

    updateGhostWheelPositions() {
        if (!this.ghostVehicle || this.ghostWheelMeshes.length !== 4) return;

        const vehicleConfig = this.game.sceneManager.vehicleConfigManager.getVehicleConfig(this.ghostData.vehicleType);
        if (!vehicleConfig) return;

        // Position wheels relative to vehicle body
        const wheelPositions = [
            new THREE.Vector3(-vehicleConfig.width/2, -vehicleConfig.height/2, vehicleConfig.length/2), // Front left
            new THREE.Vector3(vehicleConfig.width/2, -vehicleConfig.height/2, vehicleConfig.length/2),  // Front right
            new THREE.Vector3(-vehicleConfig.width/2, -vehicleConfig.height/2, -vehicleConfig.length/2), // Rear left
            new THREE.Vector3(vehicleConfig.width/2, -vehicleConfig.height/2, -vehicleConfig.length/2)   // Rear right
        ];

        this.ghostWheelMeshes.forEach((wheel, index) => {
            wheel.position.copy(this.ghostVehicle.position).add(wheelPositions[index]);
            wheel.quaternion.copy(this.ghostVehicle.quaternion);
        });
    }

    shouldLoopReplay() {
        // For now, always loop during replay mode
        return this.isReplaying;
    }

    update(deltaTime) {
        // Record current frame if recording
        if (this.isRecording) {
            this.recordFrame();
        }

        // Update ghost vehicle if replaying
        if (this.isReplaying && this.ghostVehicle) {
            // Ghost vehicle is updated in replayLoop
        }
    }

    onLapCompleted(lapTime, sectorTimes = []) {
        // Called when player completes a lap
        this.stopRecording();

        // Update ghost data if this is a better time
        if (!this.ghostData || lapTime < this.ghostData.lapTime) {
            // The recording was already saved in stopRecording()
            console.log(`👻 New ghost data recorded: ${this.formatTime(lapTime)}`);
        }
    }

    loadGhostData() {
        try {
            const saved = localStorage.getItem('ghost_lap_data');
            if (saved) {
                this.ghostData = JSON.parse(saved);
                // Convert position arrays back to THREE.Vector3
                this.ghostData.positions = this.ghostData.positions.map(pos =>
                    new THREE.Vector3(pos.x, pos.y, pos.z)
                );
                // Convert rotation arrays back to THREE.Quaternion
                this.ghostData.rotations = this.ghostData.rotations.map(rot =>
                    new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
                );
                console.log(`👻 Loaded ghost data: ${this.formatTime(this.ghostData.lapTime)}`);
            }
        } catch (error) {
            console.error('Failed to load ghost data:', error);
            this.ghostData = null;
        }
    }

    saveGhostData() {
        if (!this.ghostData) return;

        try {
            // Convert THREE objects to plain objects for JSON storage
            const saveData = {
                ...this.ghostData,
                positions: this.ghostData.positions.map(pos => ({ x: pos.x, y: pos.y, z: pos.z })),
                rotations: this.ghostData.rotations.map(rot => ({ x: rot.x, y: rot.y, z: rot.z, w: rot.w }))
            };

            localStorage.setItem('ghost_lap_data', JSON.stringify(saveData));
            console.log('👻 Ghost data saved');
        } catch (error) {
            console.error('Failed to save ghost data:', error);
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10); // Centiseconds

        return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    getGhostStatus() {
        return {
            hasGhostData: !!this.ghostData,
            isRecording: this.isRecording,
            isReplaying: this.isReplaying,
            ghostLapTime: this.ghostData ? this.ghostData.lapTime : null,
            recordedLaps: this.recordedLaps.length,
            currentReplayTime: this.currentReplayTime
        };
    }

    setReplaySpeed(speed) {
        this.replaySpeed = Math.max(0.1, Math.min(3.0, speed));
    }

    setGhostOpacity(opacity) {
        this.ghostOpacity = Math.max(0.1, Math.min(1.0, opacity));

        // Update existing ghost materials
        if (this.ghostVehicle && this.ghostVehicle.material) {
            this.ghostVehicle.material.opacity = this.ghostOpacity;
        }

        this.ghostWheelMeshes.forEach(wheel => {
            if (wheel.material) {
                wheel.material.opacity = this.ghostOpacity;
            }
        });
    }

    // Compare current run with ghost
    getComparisonData() {
        if (!this.ghostData || !this.isRecording) return null;

        const currentTime = Date.now() - this.currentLapData.startTime;
        const ghostTime = this.ghostData.lapTime;

        return {
            currentTime: currentTime,
            ghostTime: ghostTime,
            difference: currentTime - ghostTime,
            ahead: currentTime < ghostTime
        };
    }

    // Get ghost position at specific time
    getGhostPositionAtTime(time) {
        if (!this.ghostData) return null;

        // Find closest timestamp
        let frameIndex = 0;
        for (let i = 0; i < this.ghostData.timestamps.length; i++) {
            if (this.ghostData.timestamps[i] >= time) {
                frameIndex = i;
                break;
            }
        }

        if (frameIndex < this.ghostData.positions.length) {
            return this.ghostData.positions[frameIndex].clone();
        }

        return null;
    }
}