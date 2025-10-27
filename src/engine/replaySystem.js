import * as THREE from 'three';

export class ReplaySystem {
    constructor(game) {
        this.game = game;
        this.isRecording = false;
        this.isReplaying = false;
        this.replayData = null;
        this.replayVehicles = [];
        this.replayCamera = null;
        this.currentReplayTime = 0;
        this.replaySpeed = 1.0;
        this.recordInterval = 50; // Record every 50ms
        this.lastRecordTime = 0;

        // Camera control during replay
        this.cameraMode = 'follow'; // follow, free, cinematic
        this.cameraTarget = null;
        this.cameraOffset = new THREE.Vector3(0, 5, -10);
        this.cameraLookAt = new THREE.Vector3(0, 0, 0);

        // Replay UI state
        this.showUI = true;
        this.replayControls = {
            play: false,
            pause: false,
            rewind: false,
            fastForward: false,
            speed: 1.0
        };

        this.initializeReplaySystem();
    }

    initializeReplaySystem() {
        console.log('🎥 Replay System initialized - recording and playback with camera controls');

        // Set up replay camera
        this.setupReplayCamera();

        // Load saved replay data
        this.loadReplayData();
    }

    setupReplayCamera() {
        // Create a separate camera for replay mode
        this.replayCamera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Initially position it like the main camera
        if (this.game.camera) {
            this.replayCamera.position.copy(this.game.camera.position);
            this.replayCamera.quaternion.copy(this.game.camera.quaternion);
        }
    }

    startRecording() {
        if (this.isRecording || this.isReplaying) return;

        console.log('🎬 Started recording race replay');
        this.isRecording = true;
        this.lastRecordTime = Date.now();

        this.replayData = {
            startTime: Date.now(),
            duration: 0,
            vehicles: [],
            camera: [],
            events: [],
            metadata: {
                trackId: 'default_track',
                gameMode: 'standard',
                playerCount: 1,
                lapCount: 3
            }
        };

        // Initialize vehicle data structures
        this.initializeVehicleRecording();
    }

    stopRecording() {
        if (!this.isRecording) return;

        console.log('⏹️ Stopped recording race replay');
        this.isRecording = false;

        if (this.replayData) {
            this.replayData.duration = Date.now() - this.replayData.startTime;
            this.saveReplayData();
        }
    }

    initializeVehicleRecording() {
        // Set up data structures for all vehicles
        const vehicles = [this.game.physicsManager.getVehicle(0)]; // Player vehicle

        // Add AI vehicles
        if (this.game.sceneManager && this.game.sceneManager.aiVehicles) {
            this.game.sceneManager.aiVehicles.forEach(aiVehicle => {
                vehicles.push(aiVehicle.physicsVehicle);
            });
        }

        vehicles.forEach((vehicle, index) => {
            if (vehicle) {
                this.replayData.vehicles.push({
                    id: index,
                    isPlayer: index === 0,
                    positions: [],
                    rotations: [],
                    velocities: [],
                    timestamps: []
                });
            }
        });
    }

    recordFrame() {
        if (!this.isRecording || !this.replayData) return;

        const now = Date.now();
        if (now - this.lastRecordTime < this.recordInterval) return;

        const timestamp = now - this.replayData.startTime;

        // Record all vehicles
        this.replayData.vehicles.forEach((vehicleData, index) => {
            const vehicle = index === 0 ?
                this.game.physicsManager.getVehicle(0) :
                this.game.sceneManager.aiVehicles[index - 1]?.physicsVehicle;

            if (vehicle && vehicle.chassisBody) {
                vehicleData.positions.push(vehicle.chassisBody.position.clone());
                vehicleData.rotations.push(vehicle.chassisBody.quaternion.clone());
                vehicleData.velocities.push(vehicle.chassisBody.velocity.clone());
                vehicleData.timestamps.push(timestamp);
            }
        });

        // Record camera position
        if (this.game.camera) {
            this.replayData.camera.push({
                position: this.game.camera.position.clone(),
                quaternion: this.game.camera.quaternion.clone(),
                timestamp: timestamp
            });
        }

        this.lastRecordTime = now;
    }

    startReplay() {
        if (!this.replayData || this.isReplaying) return;

        console.log('🎥 Starting race replay');
        this.isReplaying = true;
        this.currentReplayTime = 0;
        this.replayControls.play = true;

        // Create replay vehicles
        this.createReplayVehicles();

        // Switch to replay camera
        this.switchToReplayCamera();

        // Start replay loop
        this.replayLoop();
    }

    stopReplay() {
        if (!this.isReplaying) return;

        console.log('🎥 Stopped race replay');
        this.isReplaying = false;
        this.currentReplayTime = 0;
        this.replayControls.play = false;

        // Remove replay vehicles
        this.removeReplayVehicles();

        // Switch back to main camera
        this.switchToMainCamera();
    }

    createReplayVehicles() {
        if (!this.replayData) return;

        this.replayVehicles = [];

        this.replayData.vehicles.forEach((vehicleData, index) => {
            if (vehicleData.positions.length === 0) return;

            // Create replay vehicle mesh
            const vehicleConfig = this.game.sceneManager.vehicleConfigManager.getVehicleConfig(
                index === 0 ? this.game.sceneManager.currentVehicleType : 'sports_car'
            );

            if (!vehicleConfig) return;

            // Create main body
            const geometry = new THREE.BoxGeometry(vehicleConfig.width, vehicleConfig.height, vehicleConfig.length);
            const material = new THREE.MeshLambertMaterial({
                color: index === 0 ? vehicleConfig.color : 0xff4444, // Different color for AI
                transparent: true,
                opacity: 0.8
            });

            const replayVehicle = new THREE.Mesh(geometry, material);
            replayVehicle.castShadow = false;
            replayVehicle.receiveShadow = false;

            // Create wheels
            const wheelMeshes = [];
            for (let i = 0; i < 4; i++) {
                const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
                const wheelMaterial = new THREE.MeshLambertMaterial({
                    color: 0x333333,
                    transparent: true,
                    opacity: 0.8
                });
                const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheelMesh.castShadow = false;
                wheelMesh.receiveShadow = false;
                wheelMeshes.push(wheelMesh);
                this.game.scene.add(wheelMesh);
            }

            this.replayVehicles.push({
                mesh: replayVehicle,
                wheelMeshes: wheelMeshes,
                data: vehicleData
            });

            this.game.scene.add(replayVehicle);
        });
    }

    removeReplayVehicles() {
        this.replayVehicles.forEach(vehicle => {
            this.game.scene.remove(vehicle.mesh);
            vehicle.wheelMeshes.forEach(wheel => {
                this.game.scene.remove(wheel);
            });
        });
        this.replayVehicles = [];
    }

    replayLoop() {
        if (!this.isReplaying || !this.replayData) return;

        if (!this.replayControls.play) {
            // Paused - just wait
            setTimeout(() => this.replayLoop(), 16);
            return;
        }

        // Advance replay time
        this.currentReplayTime += (16.67 * this.replaySpeed);

        // Check if replay is complete
        if (this.currentReplayTime >= this.replayData.duration) {
            if (this.shouldLoopReplay()) {
                this.currentReplayTime = 0; // Loop replay
            } else {
                this.stopReplay();
                return;
            }
        }

        // Update all replay vehicles
        this.updateReplayVehicles();

        // Update replay camera
        this.updateReplayCamera();

        // Continue replay loop
        setTimeout(() => this.replayLoop(), 16);
    }

    updateReplayVehicles() {
        this.replayVehicles.forEach(vehicle => {
            const frameIndex = this.findFrameIndex(vehicle.data.timestamps, this.currentReplayTime);
            if (frameIndex >= 0 && frameIndex < vehicle.data.positions.length) {
                // Interpolate between frames for smoother playback
                const currentPos = vehicle.data.positions[frameIndex];
                const currentRot = vehicle.data.rotations[frameIndex];

                vehicle.mesh.position.copy(currentPos);
                vehicle.mesh.quaternion.copy(currentRot);

                // Update wheel positions
                this.updateReplayWheelPositions(vehicle);
            }
        });
    }

    updateReplayWheelPositions(vehicle) {
        const vehicleConfig = this.game.sceneManager.vehicleConfigManager.getVehicleConfig('sports_car');
        if (!vehicleConfig) return;

        const wheelPositions = [
            new THREE.Vector3(-vehicleConfig.width/2, -vehicleConfig.height/2, vehicleConfig.length/2),
            new THREE.Vector3(vehicleConfig.width/2, -vehicleConfig.height/2, vehicleConfig.length/2),
            new THREE.Vector3(-vehicleConfig.width/2, -vehicleConfig.height/2, -vehicleConfig.length/2),
            new THREE.Vector3(vehicleConfig.width/2, -vehicleConfig.height/2, -vehicleConfig.length/2)
        ];

        vehicle.wheelMeshes.forEach((wheel, index) => {
            wheel.position.copy(vehicle.mesh.position).add(wheelPositions[index]);
            wheel.quaternion.copy(vehicle.mesh.quaternion);
        });
    }

    findFrameIndex(timestamps, targetTime) {
        // Binary search for the closest timestamp
        let left = 0;
        let right = timestamps.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (timestamps[mid] < targetTime) {
                left = mid + 1;
            } else if (timestamps[mid] > targetTime) {
                right = mid - 1;
            } else {
                return mid;
            }
        }

        // Return the closest frame
        return left < timestamps.length ? left : timestamps.length - 1;
    }

    updateReplayCamera() {
        if (!this.replayCamera) return;

        switch (this.cameraMode) {
            case 'follow':
                this.updateFollowCamera();
                break;
            case 'free':
                // Free camera - controlled by user input
                break;
            case 'cinematic':
                this.updateCinematicCamera();
                break;
        }
    }

    updateFollowCamera() {
        // Follow the player's replay vehicle
        if (this.replayVehicles.length > 0) {
            const playerVehicle = this.replayVehicles[0];
            const targetPos = playerVehicle.mesh.position.clone();

            // Calculate camera position behind and above the vehicle
            const vehicleForward = new THREE.Vector3(0, 0, 1);
            vehicleForward.applyQuaternion(playerVehicle.mesh.quaternion);

            const cameraPos = targetPos.clone()
                .add(vehicleForward.multiplyScalar(-10))
                .add(new THREE.Vector3(0, 5, 0));

            this.replayCamera.position.lerp(cameraPos, 0.1);
            this.replayCamera.lookAt(targetPos);
        }
    }

    updateCinematicCamera() {
        // Use recorded camera positions for cinematic replay
        if (this.replayData && this.replayData.camera) {
            const frameIndex = this.findFrameIndex(
                this.replayData.camera.map(c => c.timestamp),
                this.currentReplayTime
            );

            if (frameIndex >= 0 && frameIndex < this.replayData.camera.length) {
                const cameraData = this.replayData.camera[frameIndex];
                this.replayCamera.position.copy(cameraData.position);
                this.replayCamera.quaternion.copy(cameraData.quaternion);
            }
        }
    }

    switchToReplayCamera() {
        if (this.replayCamera && this.game.renderer) {
            // In a real implementation, you'd switch the active camera
            // For now, we'll just update the replay camera
        }
    }

    switchToMainCamera() {
        // Switch back to main game camera
    }

    shouldLoopReplay() {
        // For now, don't loop replays
        return false;
    }

    update(deltaTime) {
        // Record current frame if recording
        if (this.isRecording) {
            this.recordFrame();
        }

        // Update replay if active
        if (this.isReplaying) {
            // Replay loop is handled separately
        }
    }

    // Camera control methods
    setCameraMode(mode) {
        if (['follow', 'free', 'cinematic'].includes(mode)) {
            this.cameraMode = mode;
            console.log(`📷 Replay camera mode: ${mode}`);
        }
    }

    // Replay control methods
    play() {
        this.replayControls.play = true;
        this.replayControls.pause = false;
    }

    pause() {
        this.replayControls.play = false;
        this.replayControls.pause = true;
    }

    rewind(seconds = 10) {
        this.currentReplayTime = Math.max(0, this.currentReplayTime - seconds * 1000);
    }

    fastForward(seconds = 10) {
        this.currentReplayTime = Math.min(this.replayData?.duration || 0, this.currentReplayTime + seconds * 1000);
    }

    setSpeed(speed) {
        this.replaySpeed = Math.max(0.1, Math.min(4.0, speed));
    }

    seekToTime(time) {
        this.currentReplayTime = Math.max(0, Math.min(this.replayData?.duration || 0, time));
    }

    // Data management
    saveReplayData() {
        if (!this.replayData) return;

        try {
            // Convert THREE objects to plain objects for JSON storage
            const saveData = {
                ...this.replayData,
                vehicles: this.replayData.vehicles.map(vehicle => ({
                    ...vehicle,
                    positions: vehicle.positions.map(pos => ({ x: pos.x, y: pos.y, z: pos.z })),
                    rotations: vehicle.rotations.map(rot => ({ x: rot.x, y: rot.y, z: rot.z, w: rot.w })),
                    velocities: vehicle.velocities.map(vel => ({ x: vel.x, y: vel.y, z: vel.z }))
                })),
                camera: this.replayData.camera.map(cam => ({
                    position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
                    quaternion: { x: cam.quaternion.x, y: cam.quaternion.y, z: cam.quaternion.z, w: cam.quaternion.w },
                    timestamp: cam.timestamp
                }))
            };

            // Save to localStorage (in a real game, this might be saved to a file or server)
            localStorage.setItem('race_replay_data', JSON.stringify(saveData));
            console.log('💾 Replay data saved');
        } catch (error) {
            console.error('Failed to save replay data:', error);
        }
    }

    loadReplayData() {
        try {
            const saved = localStorage.getItem('race_replay_data');
            if (saved) {
                this.replayData = JSON.parse(saved);

                // Convert back to THREE objects
                this.replayData.vehicles.forEach(vehicle => {
                    vehicle.positions = vehicle.positions.map(pos => new THREE.Vector3(pos.x, pos.y, pos.z));
                    vehicle.rotations = vehicle.rotations.map(rot => new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w));
                    vehicle.velocities = vehicle.velocities.map(vel => new THREE.Vector3(vel.x, vel.y, vel.z));
                });

                this.replayData.camera.forEach(cam => {
                    cam.position = new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z);
                    cam.quaternion = new THREE.Quaternion(cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w);
                });

                console.log(`📼 Loaded replay data: ${this.formatTime(this.replayData.duration)}`);
            }
        } catch (error) {
            console.error('Failed to load replay data:', error);
            this.replayData = null;
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10);

        return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    getReplayStatus() {
        return {
            isRecording: this.isRecording,
            isReplaying: this.isReplaying,
            hasReplayData: !!this.replayData,
            currentTime: this.currentReplayTime,
            duration: this.replayData?.duration || 0,
            speed: this.replaySpeed,
            cameraMode: this.cameraMode,
            controls: { ...this.replayControls }
        };
    }

    // Export replay for sharing
    exportReplay() {
        if (!this.replayData) return null;

        // In a real implementation, this would create a file or send to server
        return JSON.stringify(this.replayData);
    }

    // Import replay data
    importReplay(replayJson) {
        try {
            const replayData = JSON.parse(replayJson);
            this.replayData = replayData;
            this.loadReplayData(); // Convert THREE objects
            console.log('📥 Replay data imported');
            return true;
        } catch (error) {
            console.error('Failed to import replay data:', error);
            return false;
        }
    }
}