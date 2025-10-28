import * as THREE from 'three';

export class SpectatorMode {
    constructor(game, camera, renderer) {
        this.game = game;
        this.camera = camera;
        this.renderer = renderer;
        this.isActive = false;
        this.currentTarget = null;
        this.cameraMode = 'follow'; // follow, free, cinematic
        this.cameraOffset = new THREE.Vector3(0, 5, -10);
        this.lookAtOffset = new THREE.Vector3(0, 0, 5);
        this.smoothFactor = 0.1;
        this.zoomLevel = 1.0;

        this.statsOverlay = null;
        this.raceReplay = null;
        this.replaySpeed = 1.0;
        this.isReplaying = false;
        this.cinematicTimer = 0;
        this.statsUpdateTimer = 0;
        this.statsUpdateInterval = 2.0; // Update stats every 2 seconds

        this.initializeSpectatorUI();
        this.setupCameraControls();
    }

    initializeSpectatorUI() {
        // Create spectator controls overlay
        this.spectatorPanel = document.createElement('div');
        this.spectatorPanel.id = 'spectatorPanel';
        this.spectatorPanel.innerHTML = `
            <div class="spectator-controls">
                <button id="cameraFollow">Follow</button>
                <button id="cameraFree">Free Cam</button>
                <button id="cameraCinematic">Cinematic</button>
                <button id="nextTarget">Next Player</button>
                <button id="replayRace">Replay</button>
                <button id="exitSpectator">Exit</button>
            </div>
            <div class="camera-controls">
                <input type="range" id="zoomSlider" min="0.5" max="3.0" step="0.1" value="1.0">
                <span id="zoomValue">1.0x</span>
            </div>
            <div class="replay-controls" style="display: none;">
                <button id="playPause">⏸️</button>
                <input type="range" id="replaySpeed" min="0.25" max="4.0" step="0.25" value="1.0">
                <span id="speedValue">1.0x</span>
                <input type="range" id="replayProgress" min="0" max="100" value="0">
            </div>
        `;

        this.spectatorPanel.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 10px;
            color: white;
            z-index: 1000;
            display: none;
        `;

        document.body.appendChild(this.spectatorPanel);
        this.setupSpectatorControls();

        // Create live stats overlay
        this.createStatsOverlay();
    }

    createStatsOverlay() {
        this.statsOverlay = document.createElement('div');
        this.statsOverlay.id = 'statsOverlay';
        this.statsOverlay.innerHTML = `
            <div class="race-info">
                <div class="position">P1</div>
                <div class="lap-time">1:23.456</div>
                <div class="best-lap">Best: 1:21.234</div>
            </div>
            <div class="leaderboard">
                <div class="leaderboard-header">Live Standings</div>
                <div id="leaderboardList"></div>
            </div>
            <div class="race-events">
                <div id="eventLog"></div>
            </div>
        `;

        this.statsOverlay.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            padding: 15px;
            border-radius: 10px;
            color: white;
            z-index: 1000;
            display: none;
            min-width: 250px;
        `;

        document.body.appendChild(this.statsOverlay);
    }

    setupSpectatorControls() {
        document.getElementById('cameraFollow').addEventListener('click', () => {
            this.setCameraMode('follow');
        });

        document.getElementById('cameraFree').addEventListener('click', () => {
            this.setCameraMode('free');
        });

        document.getElementById('cameraCinematic').addEventListener('click', () => {
            this.setCameraMode('cinematic');
        });

        document.getElementById('nextTarget').addEventListener('click', () => {
            this.nextTarget();
        });

        document.getElementById('replayRace').addEventListener('click', () => {
            this.startReplay();
        });

        document.getElementById('exitSpectator').addEventListener('click', () => {
            this.exitSpectatorMode();
        });

        // Camera controls
        const zoomSlider = document.getElementById('zoomSlider');
        const zoomValue = document.getElementById('zoomValue');

        zoomSlider.addEventListener('input', (e) => {
            this.zoomLevel = parseFloat(e.target.value);
            zoomValue.textContent = this.zoomLevel.toFixed(1) + 'x';
        });

        // Replay controls
        document.getElementById('playPause').addEventListener('click', () => {
            this.toggleReplayPlayback();
        });

        const replaySpeed = document.getElementById('replaySpeed');
        const speedValue = document.getElementById('speedValue');

        replaySpeed.addEventListener('input', (e) => {
            this.replaySpeed = parseFloat(e.target.value);
            speedValue.textContent = this.replaySpeed.toFixed(2) + 'x';
        });
    }

    setupCameraControls() {
        this.mouse = { x: 0, y: 0 };
        this.mouseButtons = { left: false, right: false };

        // Mouse controls for free camera
        document.addEventListener('mousemove', (e) => {
            if (!this.isActive || this.cameraMode !== 'free') return;

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        document.addEventListener('mousedown', (e) => {
            if (!this.isActive || this.cameraMode !== 'free') return;

            if (e.button === 0) this.mouseButtons.left = true;
            if (e.button === 2) this.mouseButtons.right = true;
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.isActive || this.cameraMode !== 'free') return;

            if (e.button === 0) this.mouseButtons.left = false;
            if (e.button === 2) this.mouseButtons.right = false;
        });

        // Prevent context menu in free camera mode
        document.addEventListener('contextmenu', (e) => {
            if (this.isActive && this.cameraMode === 'free') {
                e.preventDefault();
            }
        });
    }

    enterSpectatorMode() {
        this.isActive = true;
        this.spectatorPanel.style.display = 'block';
        this.statsOverlay.style.display = 'block';

        // Find initial target (player or AI)
        this.findInitialTarget();

        console.log('Entered spectator mode');
    }

    exitSpectatorMode() {
        this.isActive = false;
        this.spectatorPanel.style.display = 'none';
        this.statsOverlay.style.display = 'none';

        // Reset to normal game camera
        this.resetToGameCamera();

        console.log('Exited spectator mode');
    }

    setCameraMode(mode) {
        this.cameraMode = mode;

        // Update button states
        document.querySelectorAll('.spectator-controls button').forEach(btn => {
            btn.classList.remove('active');
        });

        switch (mode) {
            case 'follow':
                document.getElementById('cameraFollow').classList.add('active');
                break;
            case 'free':
                document.getElementById('cameraFree').classList.add('active');
                break;
            case 'cinematic':
                document.getElementById('cameraCinematic').classList.add('active');
                break;
        }

        console.log(`Camera mode set to: ${mode}`);
    }

    findInitialTarget() {
        // Target the player vehicle first
        if (this.game.sceneManager.playerVehicle) {
            this.currentTarget = this.game.sceneManager.playerVehicle;
        } else if (this.game.sceneManager.aiVehicles.length > 0) {
            this.currentTarget = this.game.sceneManager.aiVehicles[0].mesh;
        }
    }

    nextTarget() {
        const allVehicles = [
            this.game.sceneManager.playerVehicle,
            ...this.game.sceneManager.aiVehicles.map(ai => ai.mesh)
        ].filter(vehicle => vehicle);

        if (allVehicles.length === 0) return;

        const currentIndex = this.currentTarget ? allVehicles.indexOf(this.currentTarget) : -1;
        const nextIndex = (currentIndex + 1) % allVehicles.length;
        this.currentTarget = allVehicles[nextIndex];
    }

    update(deltaTime) {
        if (!this.isActive) return;

        this.updateCamera(deltaTime);

        // Throttle stats overlay updates for performance
        this.statsUpdateTimer += deltaTime;
        if (this.statsUpdateTimer >= this.statsUpdateInterval) {
            this.updateStatsOverlay();
            this.statsUpdateTimer = 0;
        }

        this.updateReplay(deltaTime);
    }

    updateCamera(deltaTime) {
        if (!this.currentTarget) return;

        switch (this.cameraMode) {
            case 'follow':
                this.updateFollowCamera(deltaTime);
                break;
            case 'free':
                this.updateFreeCamera(deltaTime);
                break;
            case 'cinematic':
                this.updateCinematicCamera(deltaTime);
                break;
        }
    }

    updateFollowCamera(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        if (!this.currentTarget) return;

        const targetPosition = this.currentTarget.position.clone();
        const targetRotation = this.currentTarget.rotation.clone();

        // Calculate desired camera position
        const offset = this.cameraOffset.clone();
        offset.applyEuler(targetRotation);
        offset.multiplyScalar(this.zoomLevel);

        const desiredPosition = targetPosition.clone().add(offset);

        // Calculate look-at position
        const lookAtOffset = this.lookAtOffset.clone();
        lookAtOffset.applyEuler(targetRotation);
        const desiredLookAt = targetPosition.clone().add(lookAtOffset);

        // Smooth camera movement
        this.camera.position.lerp(desiredPosition, this.smoothFactor);
        this.camera.lookAt(desiredLookAt);
    }

    updateFreeCamera(deltaTime) {
        // Free camera with mouse look and WASD movement
        const moveSpeed = 20 * deltaTime;

        if (this.mouseButtons.left) {
            // Mouse look
            const sensitivity = 0.002;
            this.camera.rotation.y -= this.mouse.x * sensitivity;
            this.camera.rotation.x -= this.mouse.y * sensitivity;
            this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
        }

        // WASD movement (reuse keyboard input)
        const keys = this.game.vehicleController.keys;
        const direction = new THREE.Vector3();

        if (keys['KeyW']) direction.z -= 1;
        if (keys['KeyS']) direction.z += 1;
        if (keys['KeyA']) direction.x -= 1;
        if (keys['KeyD']) direction.x += 1;

        if (direction.length() > 0) {
            direction.normalize();
            direction.applyEuler(this.camera.rotation);
            direction.multiplyScalar(moveSpeed);
            this.camera.position.add(direction);
        }
    }

    updateCinematicCamera(deltaTime) {
        // Cinematic camera with smooth pans and automatic target switching
        this.cinematicTimer += deltaTime;

        // Switch targets every 10 seconds
        if (this.cinematicTimer > 10) {
            this.nextTarget();
            this.cinematicTimer = 0;
        }

        // Use follow camera with cinematic angles
        this.updateFollowCamera(deltaTime);

        // Add slight camera shake for cinematic effect
        const shakeAmount = 0.1;
        this.camera.position.x += (Math.random() - 0.5) * shakeAmount;
        this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
    }

    updateStatsOverlay() {
        // Update live race statistics
        const leaderboardList = document.getElementById('leaderboardList');
        const eventLog = document.getElementById('eventLog');

        // Get real leaderboard data from game
        let leaderboardData = [];
        if (this.game.leaderboardManager) {
            leaderboardData = this.game.leaderboardManager.getLocalLeaderboard('default_track', 5);
        }

        // If no real data, use mock data
        if (leaderboardData.length === 0) {
            leaderboardData = [
                { playerName: 'Player', totalTime: 83456 },
                { playerName: 'AI Driver 1', totalTime: 84123 },
                { playerName: 'AI Driver 2', totalTime: 85789 }
            ];
        }

        leaderboardList.innerHTML = leaderboardData.map((entry, index) => {
            const position = index + 1;
            const timeStr = this.game.leaderboardManager ?
                this.game.leaderboardManager.formatTime(entry.totalTime) : '1:23.456';
            return `<div class="leaderboard-item">P${position} ${entry.playerName} - ${timeStr}</div>`;
        }).join('');

        // Get race events from analytics or use mock events
        let raceEvents = [];
        if (this.game.analyticsManager) {
            raceEvents = this.game.analyticsManager.getRecentEvents(3);
        } else {
            raceEvents = [
                'Race in progress',
                'Lap 1 completed',
                'Fastest lap recorded'
            ];
        }

        eventLog.innerHTML = raceEvents.map(event =>
            `<div class="race-event">${event}</div>`
        ).join('');
    }

    startReplay() {
        // Start race replay
        this.isReplaying = true;
        document.querySelector('.replay-controls').style.display = 'block';

        // Load race data for replay
        this.raceReplay = this.loadRaceReplayData();

        console.log('Started race replay');
    }

    toggleReplayPlayback() {
        this.isReplaying = !this.isReplaying;
        const button = document.getElementById('playPause');
        button.textContent = this.isReplaying ? '⏸️' : '▶️';
    }

    updateReplay(deltaTime) {
        if (!this.isReplaying || !this.raceReplay) return;

        // Update replay progress
        const progressSlider = document.getElementById('replayProgress');
        let progress = parseFloat(progressSlider.value) / 100;

        progress += (deltaTime * this.replaySpeed) / this.raceReplay.duration;
        progress = Math.min(1, Math.max(0, progress));

        progressSlider.value = progress * 100;

        // Update camera to follow replay
        this.updateReplayCamera(progress);
    }

    updateReplayCamera(progress) {
        void(progress); // Parameter kept for future use
        // Interpolate camera position based on replay data
        // This would use recorded position data
        if (this.currentTarget) {
            this.updateFollowCamera(0.016); // Fixed delta for replay
        }
    }

    loadRaceReplayData() {
        // Load recorded race data
        // This would typically come from saved race data
        return {
            duration: 120, // 2 minutes
            positions: [], // Array of position data over time
            events: [] // Race events
        };
    }

    resetToGameCamera() {
        // Reset camera to normal game view
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
    }

    takeScreenshot() {
        // Capture current view as screenshot
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');

        // Create download link
        const link = document.createElement('a');
        link.download = `spectator_screenshot_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }
}