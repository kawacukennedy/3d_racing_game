import * as THREE from 'three';

export class GameModeManager {
    constructor(game) {
        this.game = game;
        this.currentMode = 'standard'; // standard, drift, elimination, time_trial, battle
        this.modeConfig = {};
        this.modeState = {};
        this.modeTimer = 0;
        this.eliminationInterval = 30000; // 30 seconds
        this.lastElimination = 0;

        // Checkpoint system
        this.checkpoints = [];
        this.currentCheckpoint = 0;
        this.lapCount = 0;
        this.totalLaps = 3; // Default 3 laps

        // Pit stop system
        this.pitLane = null;
        this.inPitLane = false;
        this.pitStopActive = false;
        this.pitStopTimer = 0;
        this.pitStopDuration = 8000; // 8 seconds for a full pit stop

        this.initializeGameModes();
    }

    initializeGameModes() {
        this.gameModes = {
            career: {
                name: 'Career Mode',
                description: 'Progress through championships and unlock rewards',
                rules: ['Complete championship events', 'Earn stars to progress'],
                scoring: 'championship_points',
                timeLimit: null,
                specialRules: {
                    championships: true,
                    unlocks: true,
                    progression: true
                }
            },

            quick: {
                name: 'Quick Race',
                description: 'Fast-paced single race with random settings',
                rules: ['Complete the race', 'Random track and conditions'],
                scoring: 'position',
                timeLimit: null,
                specialRules: {
                    randomTrack: true,
                    randomWeather: true,
                    quickSetup: true
                }
            },

            standard: {
                name: 'Standard Race',
                description: 'Complete laps to finish first',
                rules: ['Complete all laps', 'Position determines winner'],
                scoring: 'position',
                timeLimit: null,
                specialRules: {}
            },

            drift: {
                name: 'Drift Challenge',
                description: 'Score points by drifting around corners',
                rules: ['Drift through marked zones', 'Combo multipliers for style'],
                scoring: 'drift_points',
                timeLimit: 180000, // 3 minutes
                specialRules: {
                    driftZones: true,
                    comboSystem: true,
                    styleMultiplier: true
                }
            },

            elimination: {
                name: 'Elimination Race',
                description: 'Last place gets eliminated each interval',
                rules: ['Stay ahead of the elimination line', 'Last player eliminated loses'],
                scoring: 'survival_time',
                timeLimit: null,
                specialRules: {
                    eliminationTimer: 30000,
                    positionBased: true
                }
            },

            endurance: {
                name: 'Endurance Race',
                description: 'Long-distance race with pit stops and strategy',
                rules: ['Complete many laps', 'Manage fuel and tires'],
                scoring: 'position',
                timeLimit: null,
                specialRules: {
                    fuelManagement: true,
                    tireWear: true,
                    pitStops: true,
                    longDistance: true
                }
            },

            rally: {
                name: 'Rally Race',
                description: 'Off-road racing with varied terrain',
                rules: ['Navigate diverse terrain', 'Stage-based competition'],
                scoring: 'stage_time',
                timeLimit: null,
                specialRules: {
                    offRoad: true,
                    stages: true,
                    terrainDamage: true
                }
            },

            rallycross: {
                name: 'Rallycross',
                description: 'Mixed terrain with jumps and obstacles',
                rules: ['Mix of tarmac and dirt', 'Aggressive racing'],
                scoring: 'position',
                timeLimit: null,
                specialRules: {
                    mixedTerrain: true,
                    jumps: true,
                    obstacles: true
                }
            },

            checkpoint: {
                name: 'Checkpoint Race',
                description: 'Race through checkpoints in any order',
                rules: ['Hit all checkpoints', 'Order doesn\'t matter'],
                scoring: 'checkpoint_time',
                timeLimit: 600000, // 10 minutes
                specialRules: {
                    unorderedCheckpoints: true,
                    timeBased: true
                }
            },

            pursuit_escape: {
                name: 'Pursuit/Escape',
                description: 'Catch or evade opponents in a timed chase',
                rules: ['Pursuers catch escapers', 'Switch roles each round'],
                scoring: 'catch_time',
                timeLimit: 300000, // 5 minutes
                specialRules: {
                    roleSwitching: true,
                    chaseMechanics: true
                }
            },

            time_trial: {
                name: 'Time Trial',
                description: 'Set the fastest lap time',
                rules: ['Complete laps as fast as possible', 'Ghost car shows best time'],
                scoring: 'lap_time',
                timeLimit: null,
                specialRules: {
                    ghostCar: true,
                    sectorTimes: true,
                    personalBest: true
                }
            },

            battle: {
                name: 'Battle Arena',
                description: 'Use power-ups to eliminate opponents',
                rules: ['Collect items to attack others', 'Last player standing wins'],
                scoring: 'eliminations',
                timeLimit: 300000, // 5 minutes
                specialRules: {
                    powerUps: true,
                    destructible: true,
                    itemBoxes: true
                }
            }
        };
    }

    setGameMode(modeId) {
        if (!this.gameModes[modeId]) {
            console.error(`Unknown game mode: ${modeId}`);
            return false;
        }

        this.currentMode = modeId;
        this.modeConfig = { ...this.gameModes[modeId] };
        this.modeState = {
            startTime: Date.now(),
            score: 0,
            position: 1,
            lapTimes: [],
            eliminations: 0,
            driftCombo: 0,
            powerUps: [],
            ghostData: null
        };

        this.initializeModeSpecificFeatures();
        console.log(`Game mode set to: ${this.modeConfig.name}`);
        return true;
    }

    initializeModeSpecificFeatures() {
        switch (this.currentMode) {
            case 'career':
                this.initializeCareerMode();
                break;
            case 'quick':
                this.initializeQuickMode();
                break;
            case 'drift':
                this.initializeDriftMode();
                break;
            case 'elimination':
                this.initializeEliminationMode();
                break;
            case 'endurance':
                this.initializeEnduranceMode();
                break;
            case 'rally':
                this.initializeRallyMode();
                break;
            case 'rallycross':
                this.initializeRallycrossMode();
                break;
            case 'checkpoint':
                this.initializeCheckpointMode();
                break;
            case 'pursuit_escape':
                this.initializePursuitEscapeMode();
                break;
            case 'time_trial':
                this.initializeTimeTrialMode();
                break;
            case 'battle':
                this.initializeBattleMode();
                break;
        }
    }

    initializeDriftMode() {
        // Create drift zones around corners
        this.modeState.driftZones = this.createDriftZones();
        this.modeState.driftScore = 0;
        this.modeState.maxCombo = 0;

        console.log('Drift mode initialized with zones');
    }

    initializeEliminationMode() {
        this.modeState.eliminationTimer = 0;
        this.modeState.eliminatedPlayers = [];
        this.lastElimination = Date.now();

        console.log('Elimination mode initialized');
    }

    initializeTimeTrialMode() {
        // Load personal best ghost data
        this.modeState.ghostData = this.loadGhostData();
        this.modeState.sectorTimes = [];
        this.modeState.currentSector = 0;

        console.log('Time trial mode initialized');
    }

    initializeBattleMode() {
        // Create item boxes around the track
        this.modeState.itemBoxes = this.createItemBoxes();
        this.modeState.powerUps = [];
        this.modeState.destructibleObjects = this.createDestructibleObjects();

        console.log('Battle mode initialized');
    }

    initializeCareerMode() {
        this.modeState.championship = this.loadCurrentChampionship();
        this.modeState.eventProgress = 0;
        this.modeState.starsEarned = 0;

        console.log('Career mode initialized');
    }

    initializeQuickMode() {
        // Randomize track and weather
        this.modeState.randomTrack = this.selectRandomTrack();
        this.modeState.randomWeather = this.selectRandomWeather();
        this.modeState.lapCount = Math.floor(Math.random() * 5) + 1; // 1-5 laps

        console.log('Quick race mode initialized with random settings');
    }

    initializeEnduranceMode() {
        this.totalLaps = 50; // Long race
        this.modeState.fuelLevel = 100;
        this.modeState.tireWear = 0;
        this.modeState.pitStopsRequired = 0;

        console.log('Endurance mode initialized');
    }

    initializeRallyMode() {
        this.modeState.stages = this.createRallyStages();
        this.modeState.currentStage = 0;
        this.modeState.stageTimes = [];

        console.log('Rally mode initialized');
    }

    initializeRallycrossMode() {
        this.modeState.jumps = this.createJumps();
        this.modeState.obstacles = this.createObstacles();
        this.modeState.terrainSections = this.createTerrainSections();

        console.log('Rallycross mode initialized');
    }

    initializeCheckpointMode() {
        this.modeState.checkpointsHit = new Set();
        this.modeState.totalCheckpoints = 10;
        this.modeState.startTime = Date.now();

        console.log('Checkpoint mode initialized');
    }

    initializePursuitEscapeMode() {
        this.modeState.roles = { pursuer: 'player1', escaper: 'player2' };
        this.modeState.catchTime = 0;
        this.modeState.roleSwitchTimer = 120000; // 2 minutes

        console.log('Pursuit/Escape mode initialized');
    }

    createDriftZones() {
        // Create drift scoring zones around track corners
        // This would analyze the track and place zones at corners
        return [
            { position: { x: 10, y: 0, z: 10 }, radius: 8, multiplier: 1.5 },
            { position: { x: -10, y: 0, z: 10 }, radius: 8, multiplier: 1.5 },
            { position: { x: 10, y: 0, z: -10 }, radius: 8, multiplier: 1.5 },
            { position: { x: -10, y: 0, z: -10 }, radius: 8, multiplier: 1.5 }
        ];
    }

    createItemBoxes() {
        // Create item pickup locations
        return [
            { position: { x: 0, y: 1, z: 15 }, type: 'random', collected: false },
            { position: { x: 15, y: 1, z: 0 }, type: 'random', collected: false },
            { position: { x: 0, y: 1, z: -15 }, type: 'random', collected: false },
            { position: { x: -15, y: 1, z: 0 }, type: 'random', collected: false }
        ];
    }

    createDestructibleObjects() {
        // Create breakable objects for battle mode
        return [
            { position: { x: 5, y: 0, z: 5 }, type: 'barrel', health: 100 },
            { position: { x: -5, y: 0, z: 5 }, type: 'barrel', health: 100 },
            { position: { x: 5, y: 0, z: -5 }, type: 'barrel', health: 100 },
            { position: { x: -5, y: 0, z: -5 }, type: 'barrel', health: 100 }
        ];
    }

    update(deltaTime) {
        this.modeTimer += deltaTime;

        switch (this.currentMode) {
            case 'career':
                this.updateCareerMode(deltaTime);
                break;
            case 'quick':
                this.updateQuickMode(deltaTime);
                break;
            case 'drift':
                this.updateDriftMode(deltaTime);
                break;
            case 'elimination':
                this.updateEliminationMode(deltaTime);
                break;
            case 'endurance':
                this.updateEnduranceMode(deltaTime);
                break;
            case 'rally':
                this.updateRallyMode(deltaTime);
                break;
            case 'rallycross':
                this.updateRallycrossMode(deltaTime);
                break;
            case 'checkpoint':
                this.updateCheckpointMode(deltaTime);
                break;
            case 'pursuit_escape':
                this.updatePursuitEscapeMode(deltaTime);
                break;
            case 'time_trial':
                this.updateTimeTrialMode(deltaTime);
                break;
            case 'battle':
                this.updateBattleMode(deltaTime);
                break;
        }

        // Update pit stops
        this.updatePitStops(deltaTime);
    }

    updateDriftMode(deltaTime) {
        // Check for drift scoring
        const playerPos = this.game.physicsManager.vehicle?.chassisBody?.position;
        if (playerPos) {
            this.checkDriftZones(playerPos);
        }

        // Update combo timer
        if (this.modeState.driftCombo > 0) {
            this.modeState.comboTimer -= deltaTime;
            if (this.modeState.comboTimer <= 0) {
                this.modeState.driftCombo = 0;
            }
        }
    }

    updateEliminationMode(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        const now = Date.now();
        if (now - this.lastElimination >= this.eliminationInterval) {
            this.performElimination();
            this.lastElimination = now;
        }
    }

    updateTimeTrialMode(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Update ghost car position
        if (this.modeState.ghostData) {
            this.updateGhostCar();
        }
    }

    updateBattleMode(deltaTime) {
        // Update power-ups and item boxes
        this.updateItemBoxes();
        this.updatePowerUps(deltaTime);
    }

    updateCareerMode(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Update championship progress
        this.updateChampionshipProgress();
    }

    updateQuickMode(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Quick mode uses standard race logic
    }

    updateEnduranceMode(deltaTime) {
        // Update fuel consumption
        this.modeState.fuelLevel -= deltaTime * 0.01; // Consume fuel over time
        this.modeState.tireWear += deltaTime * 0.005; // Tire wear

        // Check if pit stop needed
        if (this.modeState.fuelLevel < 20 || this.modeState.tireWear > 80) {
            this.modeState.pitStopRequired = true;
        }
    }

    updateRallyMode(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Update stage progress
        const currentStage = this.modeState.stages[this.modeState.currentStage];
        if (currentStage && this.checkStageCompletion()) {
            this.completeStage();
        }
    }

    updateRallycrossMode(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Update jump detection and scoring
        this.checkJumps();
        this.checkObstacles();
    }

    updateCheckpointMode(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        // Check for checkpoint hits
        this.checkUnorderedCheckpoints();
    }

    updatePursuitEscapeMode(deltaTime) {
        // Update chase mechanics
        this.updateChaseMechanics(deltaTime);

        // Check for role switch
        if (this.modeTimer >= this.modeState.roleSwitchTimer) {
            this.switchRoles();
        }
    }

    checkDriftZones(playerPos) {
        this.modeState.driftZones.forEach((zone) => {
            const distance = Math.sqrt(
                Math.pow(playerPos.x - zone.position.x, 2) +
                Math.pow(playerPos.z - zone.position.z, 2)
            );

            if (distance <= zone.radius) {
                // Player is in drift zone
                const driftAngle = this.calculateDriftAngle();
                if (driftAngle > 15) { // Minimum drift angle
                    this.scoreDriftPoints(zone.multiplier);
                }
            }
        });
    }

    calculateDriftAngle() {
        // Simplified drift angle calculation
        // In a real implementation, this would use wheel slip angles
        const velocity = this.game.physicsManager.vehicle?.chassisBody?.velocity;
        if (!velocity) return 0;

        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const steering = this.game.vehicleController?.steeringValue || 0;

        return Math.abs(steering) * speed * 10; // Simplified calculation
    }

    scoreDriftPoints(multiplier) {
        this.modeState.driftCombo++;
        this.modeState.comboTimer = 2000; // 2 seconds to maintain combo

        const basePoints = 100;
        const comboBonus = this.modeState.driftCombo * 50;
        const zoneBonus = basePoints * multiplier;
        const totalPoints = Math.floor((basePoints + comboBonus) * zoneBonus);

        this.modeState.driftScore += totalPoints;
        this.modeState.maxCombo = Math.max(this.modeState.maxCombo, this.modeState.driftCombo);

        console.log(`Drift scored: ${totalPoints} points (Combo: ${this.modeState.driftCombo}x)`);
    }

    performElimination() {
        // In multiplayer, eliminate last place player
        // For single player, this could be a time penalty or speed reduction
        console.log('Elimination round!');
        // Implementation would depend on multiplayer system
    }

    updateGhostCar() {
        // Update ghost car position based on recorded lap time
        // This would interpolate between recorded positions
    }

    updateItemBoxes() {
        const playerPos = this.game.physicsManager.vehicle?.chassisBody?.position;
        if (!playerPos) return;

        this.modeState.itemBoxes.forEach((box, index) => {
            if (!box.collected) {
                const distance = Math.sqrt(
                    Math.pow(playerPos.x - box.position.x, 2) +
                    Math.pow(playerPos.z - box.position.z, 2)
                );

                if (distance < 3) { // Collection radius
                    this.collectItemBox(index);
                }
            }
        });
    }

    collectItemBox(index) {
        const box = this.modeState.itemBoxes[index];
        box.collected = true;

        // Give random power-up
        const powerUps = ['boost', 'shield', 'mines', 'oil_slick'];
        const randomPowerUp = powerUps[Math.floor(Math.random() * powerUps.length)];

        this.modeState.powerUps.push({
            type: randomPowerUp,
            duration: 10000, // 10 seconds
            collectedAt: Date.now()
        });

        console.log(`Collected ${randomPowerUp} power-up!`);

        // Respawn item box after delay
        setTimeout(() => {
            box.collected = false;
        }, 30000); // 30 seconds
    }

    updatePowerUps(deltaTime) {
        void(deltaTime); // Parameter kept for future use
        this.modeState.powerUps = this.modeState.powerUps.filter(powerUp => {
            const age = Date.now() - powerUp.collectedAt;
            return age < powerUp.duration;
        });
    }

    loadGhostData() {
        // Load personal best lap data
        const saved = localStorage.getItem('ghost_lap_data');
        return saved ? JSON.parse(saved) : null;
    }

    saveGhostData(lapData) {
        localStorage.setItem('ghost_lap_data', JSON.stringify(lapData));
    }

    recordLapTime(lapTime, sectorTimes) {
        this.modeState.lapTimes.push(lapTime);
        this.modeState.sectorTimes = sectorTimes;

        // Save as ghost data if it's a personal best
        const bestTime = Math.min(...this.modeState.lapTimes);
        if (lapTime === bestTime) {
            this.saveGhostData({
                lapTime: lapTime,
                sectorTimes: sectorTimes,
                recordedAt: Date.now()
            });
        }
    }

    getCurrentScore() {
        switch (this.currentMode) {
            case 'career':
                return this.modeState.starsEarned || 0;
            case 'drift':
                return this.modeState.driftScore || 0;
            case 'elimination':
                return this.modeState.survivalTime || 0;
            case 'endurance':
                return this.lapCount;
            case 'rally':
                return this.modeState.stageTimes?.reduce((sum, time) => sum + time, 0) || 0;
            case 'rallycross':
                return this.modeState.jumpsCompleted || 0;
            case 'checkpoint':
                return this.modeState.checkpointsHit?.size || 0;
            case 'pursuit_escape':
                return this.modeState.catchTime || 0;
            case 'time_trial':
                return this.modeState.bestLapTime || 0;
            case 'battle':
                return this.modeState.eliminations || 0;
            default:
                return 0;
        }
    }

    getModeStatus() {
        return {
            currentMode: this.currentMode,
            modeConfig: this.modeConfig,
            modeState: this.modeState,
            modeTimer: this.modeTimer,
            isActive: this.modeTimer > 0,
            progress: this.getModeProgress()
        };
    }

    getCurrentGameState() {
        return {
            currentMode: this.currentMode,
            modeState: this.modeState,
            modeTimer: this.modeTimer,
            lapCount: this.lapCount,
            currentCheckpoint: this.currentCheckpoint,
            players: this.modeState.players || [],
            isActive: this.modeTimer > 0,
            progress: this.getModeProgress()
        };
    }

    getModeProgress() {
        switch (this.currentMode) {
            case 'career':
                return {
                    type: 'championship',
                    currentEvent: this.modeState.championship?.currentEvent || 0,
                    totalEvents: this.modeState.championship?.events?.length || 1,
                    percentage: ((this.modeState.championship?.currentEvent || 0) / (this.modeState.championship?.events?.length || 1)) * 100
                };
            case 'quick':
            case 'standard':
            case 'time_trial':
                return {
                    type: 'lap_based',
                    current: this.lapCount,
                    total: this.totalLaps,
                    percentage: this.totalLaps > 0 ? (this.lapCount / this.totalLaps) * 100 : 0
                };
            case 'drift':
                return {
                    type: 'score_based',
                    current: this.modeState.driftScore || 0,
                    target: 10000, // Example target
                    percentage: Math.min(((this.modeState.driftScore || 0) / 10000) * 100, 100)
                };
            case 'elimination':
                return {
                    type: 'survival',
                    remainingPlayers: this.modeState.players ? this.modeState.players.filter(p => p.status === 'active').length : 0,
                    totalPlayers: this.modeState.players ? this.modeState.players.length : 0,
                    percentage: this.modeState.players ? (this.modeState.players.filter(p => p.status === 'active').length / this.modeState.players.length) * 100 : 0
                };
            case 'endurance':
                return {
                    type: 'fuel_based',
                    fuelLevel: this.modeState.fuelLevel || 100,
                    tireWear: this.modeState.tireWear || 0,
                    percentage: this.totalLaps > 0 ? (this.lapCount / this.totalLaps) * 100 : 0
                };
            case 'rally':
                return {
                    type: 'stage_based',
                    currentStage: this.modeState.currentStage || 0,
                    totalStages: this.modeState.stages?.length || 1,
                    percentage: ((this.modeState.currentStage || 0) / (this.modeState.stages?.length || 1)) * 100
                };
            case 'rallycross':
                return {
                    type: 'lap_based',
                    current: this.lapCount,
                    total: this.totalLaps,
                    percentage: this.totalLaps > 0 ? (this.lapCount / this.totalLaps) * 100 : 0
                };
            case 'checkpoint':
                return {
                    type: 'checkpoint_based',
                    current: this.modeState.checkpointsHit?.size || 0,
                    total: this.modeState.totalCheckpoints || 10,
                    percentage: ((this.modeState.checkpointsHit?.size || 0) / (this.modeState.totalCheckpoints || 10)) * 100
                };
            case 'pursuit_escape':
                return {
                    type: 'time_based',
                    current: this.modeTimer,
                    total: this.modeState.roleSwitchTimer || 120000,
                    percentage: (this.modeTimer / (this.modeState.roleSwitchTimer || 120000)) * 100
                };
            case 'battle':
                return {
                    type: 'elimination_count',
                    current: this.modeState.eliminations || 0,
                    target: 5,
                    percentage: ((this.modeState.eliminations || 0) / 5) * 100
                };
            default:
                return {
                    type: 'time_based',
                    current: this.modeTimer,
                    total: this.modeConfig.timeLimit || 300,
                    percentage: this.modeConfig.timeLimit ? (this.modeTimer / this.modeConfig.timeLimit) * 100 : 0
                };
        }
    }

    isModeComplete() {
        if (this.modeConfig.timeLimit && this.modeTimer >= this.modeConfig.timeLimit) {
            return true;
        }

        // Mode-specific completion conditions
        switch (this.currentMode) {
            case 'career':
                return this.modeState.championship?.currentEvent >= this.modeState.championship?.events?.length;
            case 'quick':
            case 'standard':
                return this.lapCount >= this.totalLaps;
            case 'drift':
                return this.modeState.driftScore >= 10000;
            case 'elimination':
                return this.modeState.players?.filter(p => p.status === 'active').length <= 1;
            case 'endurance':
                return this.lapCount >= this.totalLaps;
            case 'rally':
                return this.modeState.currentStage >= this.modeState.stages?.length;
            case 'rallycross':
                return this.lapCount >= this.totalLaps;
            case 'checkpoint':
                return this.modeState.checkpointsHit?.size >= this.modeState.totalCheckpoints;
            case 'pursuit_escape':
                return this.modeTimer >= this.modeState.roleSwitchTimer * 3; // 3 rounds
            case 'time_trial':
                return this.modeState.lapTimes.length >= 3; // 3 laps
            case 'battle':
                return this.modeState.eliminations >= 5; // 5 eliminations
            default:
                return false;
        }
    }

    getAvailableModes() {
        return Object.keys(this.gameModes).map(id => ({
            id: id,
            ...this.gameModes[id]
        }));
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        // Adjust AI behavior, item spawn rates, etc. based on difficulty
        if (this.game.aiControllers) {
            this.game.aiControllers.forEach(controller => {
                controller.setDifficulty(difficulty);
            });
        }
    }

    // Checkpoint System
    initializeCheckpoints(trackData) {
        if (trackData && trackData.checkpoints) {
            this.checkpoints = trackData.checkpoints.map(cp => ({
                id: cp.id,
                position: cp.position,
                rotation: cp.rotation,
                passed: false,
                lapTimes: []
            }));
        } else {
            // Create default checkpoints if none provided
            this.createDefaultCheckpoints();
        }

        this.currentCheckpoint = 0;
        this.lapCount = 0;
        console.log(`Initialized ${this.checkpoints.length} checkpoints`);
    }

    createDefaultCheckpoints() {
        // Create basic checkpoints around a circular track
        const numCheckpoints = 8;
        this.checkpoints = [];

        for (let i = 0; i < numCheckpoints; i++) {
            const angle = (i / numCheckpoints) * Math.PI * 2;
            const radius = 100; // Track radius
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            this.checkpoints.push({
                id: i,
                position: new THREE.Vector3(x, 0, z),
                rotation: new THREE.Euler(0, angle + Math.PI / 2, 0),
                passed: false,
                lapTimes: []
            });
        }
    }

    checkCheckpointCollision(playerPosition) {
        if (this.checkpoints.length === 0) return false;

        const checkpoint = this.checkpoints[this.currentCheckpoint];
        const distance = playerPosition.distanceTo(checkpoint.position);

        if (distance < 10) { // 10 units checkpoint radius
            this.passCheckpoint();
            return true;
        }

        return false;
    }

    passCheckpoint() {
        const checkpoint = this.checkpoints[this.currentCheckpoint];
        checkpoint.passed = true;
        checkpoint.lapTimes.push(Date.now());

        console.log(`Checkpoint ${this.currentCheckpoint + 1}/${this.checkpoints.length} passed`);

        // Move to next checkpoint
        this.currentCheckpoint++;

        // Check if lap completed
        if (this.currentCheckpoint >= this.checkpoints.length) {
            this.completeLap();
        }
    }

    completeLap() {
        this.lapCount++;
        this.currentCheckpoint = 0;

        // Reset checkpoint states for next lap
        this.checkpoints.forEach(cp => cp.passed = false);

        const lapTime = this.calculateLapTime();
        this.modeState.lapTimes.push(lapTime);

        console.log(`Lap ${this.lapCount}/${this.totalLaps} completed in ${lapTime.toFixed(2)}ms`);

        // Notify ghost system of lap completion
        if (this.game && this.game.ghostSystem) {
            this.game.ghostSystem.onLapCompleted(lapTime);
        }

        // Check race completion
        if (this.lapCount >= this.totalLaps) {
            this.endRace();
        }
    }

    // Pit Stop System
    initializePitLane(trackData) {
        void(trackData); // Parameter kept for future use
        // Create pit lane area
        this.pitLane = {
            entryPoint: new THREE.Vector3(100, 0, 0), // Near track
            exitPoint: new THREE.Vector3(120, 0, 0),  // Pit lane end
            pitBoxes: [
                { position: new THREE.Vector3(105, 0, -5), occupied: false },
                { position: new THREE.Vector3(110, 0, -5), occupied: false },
                { position: new THREE.Vector3(115, 0, -5), occupied: false }
            ]
        };

        console.log('Pit lane initialized with 3 pit boxes');
    }

    checkPitLaneEntry(playerPosition) {
        if (!this.pitLane || this.inPitLane) return false;

        const distanceToEntry = playerPosition.distanceTo(this.pitLane.entryPoint);
        if (distanceToEntry < 8) { // 8 units entry zone
            this.enterPitLane();
            return true;
        }

        return false;
    }

    enterPitLane() {
        this.inPitLane = true;
        console.log('Entered pit lane');

        // Find available pit box
        const availableBox = this.pitLane.pitBoxes.find(box => !box.occupied);
        if (availableBox) {
            availableBox.occupied = true;
            this.currentPitBox = availableBox;
            console.log('Pit box assigned');
        }
    }

    checkPitLaneExit(playerPosition) {
        if (!this.pitLane || !this.inPitLane) return false;

        const distanceToExit = playerPosition.distanceTo(this.pitLane.exitPoint);
        if (distanceToExit < 5) { // 5 units exit zone
            this.exitPitLane();
            return true;
        }

        return false;
    }

    exitPitLane() {
        this.inPitLane = false;
        if (this.currentPitBox) {
            this.currentPitBox.occupied = false;
            this.currentPitBox = null;
        }
        console.log('Exited pit lane');
    }

    startPitStop() {
        if (!this.inPitLane || this.pitStopActive) return false;

        this.pitStopActive = true;
        this.pitStopTimer = 0;

        console.log('Pit stop started - refueling and tire change');

        // Trigger pit stop actions
        this.performPitStopActions();

        return true;
    }

    performPitStopActions() {
        // Refuel the vehicle
        if (this.game && this.game.physicsManager) {
            this.game.physicsManager.refuel(this.game.physicsManager.vehicle, 100);
        }

        // Change tires to optimal compound
        if (this.game && this.game.physicsManager) {
            this.game.physicsManager.changeTires(this.game.physicsManager.vehicle, 'soft');
        }

        // Could add other pit stop actions here:
        // - Adjust suspension
        // - Clean windshield
        // - Change brake pads
        // - Repair minor damage
    }

    updatePitStop(deltaTime) {
        if (!this.pitStopActive) return;

        this.pitStopTimer += deltaTime * 1000; // Convert to milliseconds

        if (this.pitStopTimer >= this.pitStopDuration) {
            this.completePitStop();
        }
    }

    completePitStop() {
        this.pitStopActive = false;
        this.pitStopTimer = 0;

        console.log('Pit stop completed - vehicle ready to race');

        // Notify UI
        if (this.game && this.game.uiManager) {
            this.game.uiManager.showPitStopComplete();
        }
    }

    getPitStopStatus() {
        return {
            inPitLane: this.inPitLane,
            pitStopActive: this.pitStopActive,
            pitStopProgress: this.pitStopTimer / this.pitStopDuration,
            pitBoxesOccupied: this.pitLane ? this.pitLane.pitBoxes.filter(box => box.occupied).length : 0,
            totalPitBoxes: this.pitLane ? this.pitLane.pitBoxes.length : 0
        };
    }

    // Update method for pit stops
    updatePitStops(deltaTime) {
        this.updatePitStop(deltaTime);
    }

    calculateLapTime() {
        if (this.checkpoints.length === 0) return 0;

        const firstCheckpoint = this.checkpoints[0];
        const lastCheckpoint = this.checkpoints[this.checkpoints.length - 1];

        if (firstCheckpoint.lapTimes.length > 0 && lastCheckpoint.lapTimes.length > 0) {
            return lastCheckpoint.lapTimes[lastCheckpoint.lapTimes.length - 1] -
                   firstCheckpoint.lapTimes[firstCheckpoint.lapTimes.length - 1];
        }

        return 0;
    }

    getCurrentPosition() {
        // Calculate position based on lap progress and checkpoint progress
        const lapProgress = (this.lapCount + (this.currentCheckpoint / this.checkpoints.length)) / this.totalLaps;
        return Math.max(0, Math.min(1, lapProgress));
    }

    getRaceProgress() {
        return {
            currentLap: this.lapCount,
            totalLaps: this.totalLaps,
            currentCheckpoint: this.currentCheckpoint,
            totalCheckpoints: this.checkpoints.length,
            position: this.getCurrentPosition(),
            lapTimes: [...this.modeState.lapTimes],
            bestLapTime: this.modeState.lapTimes.length > 0 ? Math.min(...this.modeState.lapTimes) : null
        };
    }

    startRace(trackData = null, players = null) {
        console.log(`Starting ${this.gameModes[this.currentMode].name} race`);
        this.modeTimer = 0;
        this.lapCount = 0;
        this.currentCheckpoint = 0;
        this.modeState = {
            lapTimes: [],
            driftPoints: 0,
            comboMultiplier: 1,
            comboTimer: 0,
            eliminations: 0,
            itemsCollected: [],
            powerUps: [],
            players: players || ['local_player'],
            trackData: trackData
        };

        // Initialize mode-specific features
        this.initializeModeSpecificFeatures();

        return true;
    }

    endRace() {
        const finalTime = this.calculateLapTime();
        const bestLap = Math.min(...this.modeState.lapTimes);

        console.log(`Race completed! Total time: ${finalTime.toFixed(2)}ms, Best lap: ${bestLap.toFixed(2)}ms`);

        // Stop replay recording
        if (this.game.replaySystem) {
            this.game.replaySystem.stopRecording();
        }

        // Trigger race end event
        if (this.game.uiManager) {
            this.game.uiManager.showRaceResults({
                totalTime: finalTime,
                bestLapTime: bestLap,
                lapTimes: this.modeState.lapTimes,
                position: 1 // Player finished first
            });
        }
    }
}