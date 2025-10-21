import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { PhysicsManager } from './physics/physicsManager.js';
import { SceneManager } from './engine/sceneManager.js';
import { VehicleController } from './engine/vehicleController.js';
import { HUD } from './ui/hud.js';
import { UIManager } from './ui/uiManager.js';
import { SpectatorMode } from './ui/spectatorMode.js';
import { AudioManager } from './audio/audioManager.js';
import { VehicleCustomization } from './gameplay/vehicleCustomization.js';
import { AnalyticsManager } from './utils/analyticsManager.js';
import { NetworkManager } from './network/networkManager.js';
import { LeaderboardManager } from './utils/leaderboardManager.js';
import { StoreManager } from './gameplay/storeManager.js';
import { CloudSaveManager } from './utils/cloudSaveManager.js';
import { WeatherManager } from './environment/weatherManager.js';
import { TrackEditor } from './tools/trackEditor.js';
import { RankingManager } from './multiplayer/rankingManager.js';
import { TournamentManager } from './multiplayer/tournamentManager.js';
import { SocialManager } from './multiplayer/socialManager.js';
import { MobileControls } from './ui/mobileControls.js';
import { GameModeManager } from './gameplay/gameModeManager.js';
import { AccessibilityManager } from './ui/accessibilityManager.js';
import { VoiceChatManager } from './audio/voiceChatManager.js';
import { StreamingManager } from './utils/streamingManager.js';
import { MonitoringDashboard } from './ui/monitoringDashboard.js';
import { UserGeneratedContentManager } from './multiplayer/userGeneratedContent.js';
import { EnhancedLeaderboardManager } from './multiplayer/enhancedLeaderboard.js';
import { SocialSharingManager } from './multiplayer/socialSharing.js';

// Motion Blur Shader
const MotionBlurShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'velocityFactor': { value: 0.5 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float velocityFactor;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            gl_FragColor = color;
        }
    `
};

class Game {
    constructor() {
        console.log('🚀 Game constructor called');

        // Check if required libraries are available
        if (typeof THREE === 'undefined') {
            console.error('❌ THREE.js library not loaded');
            return;
        }
        console.log('✅ THREE.js loaded');

        if (typeof CANNON === 'undefined') {
            console.error('❌ CANNON physics library not loaded');
            return;
        }
        console.log('✅ CANNON physics loaded');

        this.canvas = document.getElementById('gameCanvas');
        console.log('Canvas element:', this.canvas);

        if (!this.canvas) {
            console.error('❌ Canvas element not found');
            return;
        }
        console.log('✅ Canvas found:', this.canvas);
        try {
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
            console.log('✅ THREE.js objects created');
        } catch (error) {
            console.error('❌ Error creating THREE.js objects:', error);
            return;
        }
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Post-processing setup
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Bloom pass for lights and bright areas
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, // strength
            0.4, // radius
            0.85 // threshold
        );
        this.composer.addPass(bloomPass);

        // Depth of field effect
        const bokehPass = new BokehPass(this.scene, this.camera, {
            focus: 10.0,
            aperture: 0.0001,
            maxblur: 0.01,
            width: window.innerWidth,
            height: window.innerHeight
        });
        this.composer.addPass(bokehPass);

        // Film grain effect for cinematic look
        const filmPass = new FilmPass(0.35, 0.025, 648, false);
        this.composer.addPass(filmPass);

        this.physicsManager = new PhysicsManager();
        this.sceneManager = new SceneManager(this.scene, this.physicsManager.world, this.physicsManager, this.camera);
        this.vehicleController = new VehicleController();
        this.hud = new HUD();
        this.uiManager = new UIManager(this);
        this.audioManager = new AudioManager();
        this.vehicleCustomization = new VehicleCustomization();
        this.analyticsManager = new AnalyticsManager();
        this.networkManager = new NetworkManager(this);
        this.leaderboardManager = new LeaderboardManager();
        this.storeManager = new StoreManager(this);
        this.cloudSaveManager = new CloudSaveManager();
        this.weatherManager = new WeatherManager(this.scene, this.physicsManager.world);
        this.trackEditor = new TrackEditor(this.scene, this.physicsManager.world);
        this.rankingManager = new RankingManager();
        this.tournamentManager = new TournamentManager();
        this.socialManager = new SocialManager();
        this.ugcManager = new UserGeneratedContentManager();
        this.enhancedLeaderboard = new EnhancedLeaderboardManager(this.socialManager);
        this.socialSharing = new SocialSharingManager(this.socialManager, this.analyticsManager);
        this.mobileControls = new MobileControls(this);
        this.spectatorMode = new SpectatorMode(this, this.camera, this.renderer);
        this.accessibilityManager = new AccessibilityManager();
        this.gameModeManager = new GameModeManager(this);
        this.voiceChatManager = new VoiceChatManager(this.networkManager);
        this.streamingManager = new StreamingManager(this);
        this.monitoringDashboard = new MonitoringDashboard(this.analyticsManager, this);

        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);

        this.init();

        // Apply saved settings
        this.uiManager.applySettings(this.uiManager.getSettings());
        this.uiManager.applyAccessibilitySettings(this.uiManager.getAccessibilitySettings());

        this.animate();
    }

    init() {
        // Set up camera position
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Handle window resize
        this.resizeHandler = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', this.resizeHandler);

        // Global keyboard shortcuts
        this.keydownHandler = (e) => {
            // Accessibility settings (Alt+A)
            if (e.altKey && e.code === 'KeyA') {
                e.preventDefault();
                this.accessibilityManager.showAccessibilityPanel();
            }

            // Spectator mode (F3)
            if (e.code === 'F3') {
                e.preventDefault();
                if (this.spectatorMode.isActive) {
                    this.spectatorMode.exitSpectatorMode();
                } else {
                    this.spectatorMode.enterSpectatorMode();
                }
            }

            // Mobile controls toggle (F4)
            if (e.code === 'F4') {
                e.preventDefault();
                if (this.mobileControls.isActive()) {
                    this.mobileControls.hide();
                } else {
                    this.mobileControls.show();
                }
            }

            // Voice chat mute toggle (M)
            if (e.code === 'KeyM') {
                e.preventDefault();
                const muted = this.voiceChatManager.toggleMute();
                console.log(`Voice chat ${muted ? 'muted' : 'unmuted'}`);
            }

            // Monitoring dashboard toggle (F11)
            if (e.code === 'F11') {
                e.preventDefault();
                if (this.monitoringDashboard.isVisible) {
                    this.monitoringDashboard.hide();
                } else {
                    this.monitoringDashboard.show();
                }
            }
        };
        document.addEventListener('keydown', this.keydownHandler);

        // Initialize managers
        this.sceneManager.init();
        this.physicsManager.init();
        this.vehicleController.init(this.physicsManager.world, this.hud, this.mobileControls);

        // Load saved vehicle type
        const savedVehicleType = localStorage.getItem('current_vehicle_type');
        if (savedVehicleType) {
            this.sceneManager.currentVehicleType = savedVehicleType;
        }
        this.hud.init();
        this.audioManager.init();

        // Connect player vehicle to controller (player vehicle is created first)
        this.vehicleController.setVehicle(this.sceneManager.playerVehicle);
        this.vehicleController.setPhysicsVehicle(this.physicsManager.getVehicle(0));

        // Apply vehicle customization
        this.vehicleCustomization.loadCustomization(); // Load saved customization
        const vehicleConfig = this.sceneManager.vehicleConfigManager.getVehicleConfig(this.sceneManager.currentVehicleType);
        this.vehicleCustomization.applyCustomization(this.sceneManager.playerVehicle, null, vehicleConfig.color);

        // Initialize cloud save
        this.cloudSaveManager.autoLogin();
        this.cloudSaveManager.startAutoSync(this);

        // Initialize tournaments
        this.tournamentManager.generateDefaultTournaments();

        // Initialize UI after everything is set up
        this.uiManager.init();

        // Initialize networking
        this.networkManager.setGameStateCallback((event, data) => {
            this.handleNetworkEvent(event, data);
        });
        this.networkManager.setPlayerUpdateCallback((data) => {
            this.handlePlayerUpdate(data);
        });

        // Set up collision audio and analytics
        this.physicsManager.setCollisionCallback((intensity) => {
            this.audioManager.playCollisionSound(intensity);
            this.analyticsManager.trackCollision(intensity);
        });

        // Set up tire squeal audio
        this.vehicleController.setTireSquealCallback((intensity) => {
            this.audioManager.playTireSqueal(intensity);
        });

        // Connect vehicle to controller (already done above)
        // this.vehicleController.setVehicle(this.sceneManager.playerVehicle);
    }

    animate() {
        requestAnimationFrame(this.animate);

        const deltaTime = this.clock.getDelta();

        // Update physics
        this.physicsManager.update(deltaTime);

        // Update scene
        this.sceneManager.update(deltaTime);

        // Update weather
        this.weatherManager.update(deltaTime);

        // Update game mode
        this.gameModeManager.update(deltaTime);

        // Update spectator mode
        this.spectatorMode.update(deltaTime);

        // Update vehicle controller
        this.vehicleController.update(deltaTime);

        // Update race logic
        this.updateRace();

        // Update HUD
        this.hud.update();

        // Update streaming data
        if (this.streamingManager.getStreamingStats().isStreaming) {
            const playerVehicle = this.physicsManager.getVehicle(0);
            if (playerVehicle && playerVehicle.chassisBody) {
                const velocity = playerVehicle.chassisBody.velocity;
                const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2) * 3.6; // km/h
                this.streamingManager.onPositionUpdate(1, speed); // TODO: Get actual position
            }
        }

        // Update audio
        const playerVehicle = this.physicsManager.getVehicle(0);
        if (playerVehicle && playerVehicle.chassisBody) {
            const velocity = playerVehicle.chassisBody.velocity;
            const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2) * 3.6; // km/h
            this.audioManager.updateEngineSound(speed);

            // Track distance traveled
            const deltaDistance = Math.sqrt(velocity.x ** 2 + velocity.z ** 2) * deltaTime;
            this.analyticsManager.trackDistance(deltaDistance);

            // Send position updates to server
            if (this.networkManager.isConnected && this.networkManager.gameState === 'racing') {
                const position = playerVehicle.chassisBody.position;
                const quaternion = playerVehicle.chassisBody.quaternion;
                this.networkManager.updatePosition(
                    { x: position.x, y: position.y, z: position.z },
                    { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
                    { x: velocity.x, y: velocity.y, z: velocity.z }
                );
            }
        }

        // Update network player positions
        this.updateNetworkPlayers();

        // Render with post-processing
        this.composer.render();
    }

    handleNetworkEvent(event, data) {
        switch (event) {
            case 'roomJoined':
                console.log('Joined multiplayer room');
                // Could show room UI here
                break;
            case 'raceStart':
                console.log('Race countdown started');
                this.analyticsManager.startRace();
                // Update streaming
                this.streamingManager.onRaceStart('Multiplayer Track', 3, data.playerCount || 1);
                break;
            case 'raceBegin':
                console.log('Race started!');
                // Enable racing controls
                this.streamingManager.onRaceBegin();
                break;
            case 'raceEnd':
                console.log('Race finished!');
                // Record results in leaderboard
                this.recordRaceResults(data.results);
                // Show results
                this.showRaceResults(data.results);
                // Update streaming
                {
                    const playerResult = data.results.find(r => r.id === this.networkManager.localPlayerId);
                    this.streamingManager.onRaceEnd(playerResult ? playerResult.position : 1);
                }
                break;
        }
    }

    handlePlayerUpdate(data) {
        // Update remote player positions in scene
        // This would sync remote players' positions
    }

    updateNetworkPlayers() {
        if (!this.networkManager.isConnected) return;

        const networkPlayers = this.networkManager.getPlayers();
        // Update scene with network player positions
        // This is a simplified version - in a full implementation,
        // you'd interpolate positions and handle prediction/correction
    }

    recordRaceResults(results) {
        // Calculate average opponent MMR for ranking
        const opponentMMRs = results.map(() => 1500 + (Math.random() - 0.5) * 400); // Simulate opponent MMRs
        const averageOpponentMMR = opponentMMRs.reduce((sum, mmr) => sum + mmr, 0) / opponentMMRs.length;

        results.forEach((player, index) => {
            // In a real implementation, we'd have actual race times
            // For now, use placeholder times based on position
            const baseTime = 120000; // 2 minutes base
            const positionPenalty = index * 5000; // 5 seconds penalty per position
            const totalTime = baseTime + positionPenalty + (Math.random() * 10000); // Add some randomness

            this.leaderboardManager.addRaceResult(
                player.name,
                totalTime,
                totalTime * 0.8, // Best lap is usually faster
                index + 1,
                'multiplayer_track'
            );

            // Record ranking result (only for local player)
            if (index === 0) { // Assuming first result is local player
                this.rankingManager.recordMatchResult(
                    averageOpponentMMR,
                    index + 1,
                    totalTime / 1000, // Convert to seconds
                    'multiplayer_track'
                );
            }

            // Grant race rewards
            const rewards = this.storeManager.grantRaceReward(index + 1, 'multiplayer');
            console.log(`${player.name} earned ${rewards.credits} credits and ${rewards.gems} gems`);
        });
    }

    showRaceResults(results) {
        // Simple results display
        console.log('Race Results:');
        results.forEach((player, index) => {
            console.log(`${index + 1}. ${player.name}`);
        });

        // Show leaderboard
        const leaderboard = this.leaderboardManager.getLocalLeaderboard('multiplayer_track', 5);
        console.log('Top 5 Times:');
        leaderboard.forEach((entry, index) => {
            console.log(`${index + 1}. ${entry.playerName} - ${this.leaderboardManager.formatTime(entry.totalTime)}`);
        });
    }

    startQuickRace() {
        console.log('🏁 Starting quick race...');

        try {
            // Create a simple track
            this.createSimpleTrack();

            // Create player vehicle
            this.createPlayerVehicle();

            // Position camera for racing
            this.setupRaceCamera();

            // Start physics simulation
            this.startRaceSimulation();

            // Update HUD
            this.uiManager.updateHUD();

            console.log('✅ Quick race started successfully!');
        } catch (error) {
            console.error('❌ Error starting quick race:', error);
        }
    }

    createSimpleTrack() {
        console.log('🏗️ Creating simple track...');

        // Create a basic oval track
        const trackSegments = [
            // Start/Finish straight
            { type: 'straight', length: 100, width: 10 },
            // First corner
            { type: 'corner', radius: 30, angle: Math.PI/2 },
            // Back straight
            { type: 'straight', length: 80, width: 10 },
            // Second corner
            { type: 'corner', radius: 30, angle: Math.PI/2 },
            // Home straight
            { type: 'straight', length: 60, width: 10 },
            // Third corner
            { type: 'corner', radius: 30, angle: Math.PI/2 },
            // Final straight
            { type: 'straight', length: 80, width: 10 },
            // Fourth corner
            { type: 'corner', radius: 30, angle: Math.PI/2 }
        ];

        // Generate track geometry
        let currentPosition = { x: 0, y: 0, z: 0 };
        let currentAngle = 0;

        trackSegments.forEach((segment, index) => {
            if (segment.type === 'straight') {
                // Create straight segment
                const geometry = new THREE.PlaneGeometry(segment.width, segment.length);
                const material = new THREE.MeshLambertMaterial({
                    color: index === 0 ? 0x444444 : 0x666666, // Start/finish line
                    transparent: true,
                    opacity: 0.8
                });
                const mesh = new THREE.Mesh(geometry, material);

                mesh.position.set(
                    currentPosition.x,
                    0,
                    currentPosition.z + segment.length/2
                );
                mesh.rotation.x = -Math.PI/2;

                this.scene.add(mesh);

                // Move position forward
                currentPosition.z += segment.length;

            } else if (segment.type === 'corner') {
                // Create corner segment (simplified as straight for now)
                const geometry = new THREE.PlaneGeometry(segment.radius * 2, segment.radius * 2);
                const material = new THREE.MeshLambertMaterial({
                    color: 0x666666,
                    transparent: true,
                    opacity: 0.8
                });
                const mesh = new THREE.Mesh(geometry, material);

                mesh.position.set(
                    currentPosition.x + Math.cos(currentAngle) * segment.radius,
                    0,
                    currentPosition.z + Math.sin(currentAngle) * segment.radius
                );
                mesh.rotation.x = -Math.PI/2;

                this.scene.add(mesh);

                // Update angle and position
                currentAngle += segment.angle;
                currentPosition.x += Math.cos(currentAngle) * segment.radius * 2;
                currentPosition.z += Math.sin(currentAngle) * segment.radius * 2;
            }
        });

        // Add some basic lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        console.log('✅ Simple track created');
    }

    createPlayerVehicle() {
        console.log('🚗 Creating player vehicle...');

        // Create vehicle mesh
        const vehicleGeometry = new THREE.BoxGeometry(2, 1, 4);
        const vehicleMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.playerVehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
        this.playerVehicle.position.set(0, 1, 0);
        this.scene.add(this.playerVehicle);

        // Create wheels
        this.playerWheelMeshes = [];
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

        const wheelPositions = [
            { x: -1, y: 0.5, z: -1.5 }, // Front left
            { x: 1, y: 0.5, z: -1.5 },  // Front right
            { x: -1, y: 0.5, z: 1.5 },  // Rear left
            { x: 1, y: 0.5, z: 1.5 }    // Rear right
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.z = Math.PI / 2;
            this.playerVehicle.add(wheel);
            this.playerWheelMeshes.push(wheel);
        });

        console.log('✅ Player vehicle created');
    }

    setupRaceCamera() {
        console.log('📹 Setting up race camera...');

        // Position camera behind and above the vehicle
        this.camera.position.set(0, 8, -10);
        this.camera.lookAt(0, 0, 10);

        console.log('✅ Race camera setup');
    }

    startRace() {
        console.log('🏁 Starting race...');
        this.uiManager.hideMenu();
        this.startRaceSimulation();
    }

    startRaceSimulation() {
        console.log('⚡ Starting race simulation...');

        this.raceActive = true;
        this.raceStartTime = Date.now();
        this.currentLap = 1;
        this.totalLaps = 3;
        this.playerPosition = 1; // Single player for now

        // Enable controls
        this.setupRaceControls();

        console.log('✅ Race simulation started');
    }

    setupRaceControls() {
        console.log('🎮 Setting up race controls...');

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false
        };

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.keys.forward = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.keys.backward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'Space':
                    this.keys.brake = true;
                    e.preventDefault();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.keys.forward = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.keys.backward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'Space':
                    this.keys.brake = false;
                    break;
            }
        });

        console.log('✅ Race controls setup');
    }

    updateRace() {
        if (!this.raceActive || !this.playerVehicle) return;

        const speed = 0.5; // Base speed
        const turnSpeed = 0.05;

        // Update vehicle position based on controls
        if (this.keys.forward) {
            this.playerVehicle.position.z += speed;
        }
        if (this.keys.backward) {
            this.playerVehicle.position.z -= speed * 0.5;
        }
        if (this.keys.left) {
            this.playerVehicle.rotation.y += turnSpeed;
        }
        if (this.keys.right) {
            this.playerVehicle.rotation.y -= turnSpeed;
        }

        // Update camera to follow vehicle
        const cameraOffset = new THREE.Vector3(0, 8, -10);
        cameraOffset.applyEuler(new THREE.Euler(0, this.playerVehicle.rotation.y, 0));
        this.camera.position.copy(this.playerVehicle.position).add(cameraOffset);
        this.camera.lookAt(this.playerVehicle.position);

        // Update HUD
        this.uiManager.updateHUD();
    }

    cleanup() {
        // Stop animation loop
        if (this.animate) {
            cancelAnimationFrame(this.animate);
        }

        // Clean up Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.composer) {
            this.composer.dispose();
        }

        // Clean up physics
        if (this.physicsManager) {
            this.physicsManager.cleanup();
        }

        // Clean up vehicle controller
        if (this.vehicleController) {
            this.vehicleController.cleanup();
        }

        // Clean up audio
        if (this.audioManager) {
            this.audioManager.cleanup();
        }

        // Clean up network connections
        if (this.networkManager) {
            this.networkManager.disconnect();
        }

        // Remove event listeners
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);

        console.log('Game cleanup completed');
    }
}

// Debug function
function updateDebug(message) {
    const debugDiv = document.getElementById('debug');
    if (debugDiv) {
        debugDiv.style.display = 'block';
        debugDiv.innerHTML += message + '<br>';
    }
    console.log(message);
}

// Button functionality is now handled entirely by UIManager

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');

    // Show loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.innerHTML = '🚀 Loading VelocityRush3D...<br><small>Check console for details</small>';
    document.body.appendChild(loadingDiv);

    // Make sure menu is visible
    const menu = document.getElementById('menu');
    if (menu) {
        menu.style.display = 'block';
        updateDebug('✅ Menu element found and displayed');
    } else {
        updateDebug('❌ Menu element not found');
    }

    // UIManager handles all button functionality now

    try {
        const game = new Game();
        window.game = game; // Make game globally available
        updateDebug('✅ Game initialized successfully');

        // Hide loading message after successful initialization
        setTimeout(() => {
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
                loadingDiv.classList.add('success');
            }
        }, 2000);

    } catch (error) {
        updateDebug('❌ Error initializing game: ' + error.message);
        console.error('❌ Error initializing game:', error);
        loadingDiv.innerHTML = `
            ❌ Failed to load VelocityRush3D<br>
            <small>Error: ${error.message}</small><br>
            <small>Check browser console for details</small>
        `;
        loadingDiv.style.color = '#ff6b6b';
    }
});