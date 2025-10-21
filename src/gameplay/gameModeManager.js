export class GameModeManager {
    constructor(game) {
        this.game = game;
        this.currentMode = 'standard'; // standard, drift, elimination, time_trial, battle
        this.modeConfig = {};
        this.modeState = {};
        this.modeTimer = 0;
        this.eliminationInterval = 30000; // 30 seconds
        this.lastElimination = 0;

        this.initializeGameModes();
    }

    initializeGameModes() {
        this.gameModes = {
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
            case 'drift':
                this.initializeDriftMode();
                break;
            case 'elimination':
                this.initializeEliminationMode();
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
            case 'drift':
                this.updateDriftMode(deltaTime);
                break;
            case 'elimination':
                this.updateEliminationMode(deltaTime);
                break;
            case 'time_trial':
                this.updateTimeTrialMode(deltaTime);
                break;
            case 'battle':
                this.updateBattleMode(deltaTime);
                break;
        }
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
        const now = Date.now();
        if (now - this.lastElimination >= this.eliminationInterval) {
            this.performElimination();
            this.lastElimination = now;
        }
    }

    updateTimeTrialMode(deltaTime) {
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

    checkDriftZones(playerPos) {
        this.modeState.driftZones.forEach((zone, index) => {
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
            case 'drift':
                return this.modeState.driftScore || 0;
            case 'elimination':
                return this.modeState.survivalTime || 0;
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
            mode: this.currentMode,
            config: this.modeConfig,
            state: this.modeState,
            timeRemaining: this.modeConfig.timeLimit ?
                Math.max(0, this.modeConfig.timeLimit - this.modeTimer) : null
        };
    }

    isModeComplete() {
        if (this.modeConfig.timeLimit && this.modeTimer >= this.modeConfig.timeLimit) {
            return true;
        }

        // Mode-specific completion conditions
        switch (this.currentMode) {
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
}