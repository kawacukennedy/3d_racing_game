import { io } from 'socket.io-client';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.isConnected = false;
        this.currentRoom = null;
        this.players = new Map();
        this.localPlayerId = null;
        this.gameState = 'menu'; // menu, matchmaking, racing, finished
        this.raceStartTime = null;
        this.onGameStateUpdate = null;
        this.onPlayerUpdate = null;
        this.voiceChatCallback = null;
        this.lastPositionUpdate = 0;
        this.updateInterval = 1000 / 20; // 20 updates per second

        // Racing-specific properties
        this.raceData = {
            lapTimes: [],
            currentLap: 1,
            totalLaps: 3,
            position: 1,
            checkpoint: 0,
            finished: false,
            finishTime: null
        };

        this.matchmakingStatus = 'idle'; // idle, searching, found, joining

        // Advanced networking features
        this.networkMode = 'server_authoritative'; // 'server_authoritative', 'peer_to_peer', 'hybrid'
        this.syncModel = {
            entityInterestManagement: 'spatial_partitioning', // spatial_partitioning, kd_tree
            deadReckoning: true,
            interpolationBuffer: 100, // ms
            bandwidthTargets: {
                low: 8,    // kbps
                medium: 24,
                high: 64
            }
        };

        // Message queues for reliable/unreliable delivery
        this.reliableMessages = [];
        this.unreliableMessages = [];

        // Anti-cheat
        this.antiCheat = {
            serverChecks: true,
            impossibleSpeedCheck: true,
            geofenceValidation: true,
            signatureValidation: true,
            simulationDifferentialChecks: true
        };

        // Network testing
        this.netTesting = {
            simulatedConditions: {
                latency: 0,
                jitter: 0,
                packetLoss: 0,
                outOfOrder: false,
                bandwidthThrottle: 0
            },
            deterministicReplay: false
        };
    }

    connect(serverUrl = 'http://localhost:3001') {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.localPlayerId = this.socket.id;
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.currentRoom = null;
            this.gameState = 'menu';
        });

        this.socket.on('roomJoined', (data) => {
            console.log('Joined room:', data.roomId);
            this.currentRoom = data.roomId;
            this.gameState = 'waiting';

            // Update players
            this.players.clear();
            data.players.forEach(playerData => {
                this.players.set(playerData.id, playerData);
            });

            if (this.onGameStateUpdate) {
                this.onGameStateUpdate('roomJoined', data);
            }
        });

        this.socket.on('raceStart', (data) => {
            console.log('Race starting...');
            this.gameState = 'countdown';
            this.raceStartTime = data.startTime;

            // Update players
            data.players.forEach(playerData => {
                if (this.players.has(playerData.id)) {
                    Object.assign(this.players.get(playerData.id), playerData);
                }
            });

            if (this.onGameStateUpdate) {
                this.onGameStateUpdate('raceStart', data);
            }
        });

        this.socket.on('raceBegin', () => {
            console.log('Race begun!');
            this.gameState = 'racing';

            if (this.onGameStateUpdate) {
                this.onGameStateUpdate('raceBegin');
            }
        });

        this.socket.on('playerUpdate', (data) => {
            if (this.players.has(data.playerId)) {
                Object.assign(this.players.get(data.playerId), data);
            }

            if (this.onPlayerUpdate) {
                this.onPlayerUpdate(data);
            }
        });

        this.socket.on('lapUpdate', (data) => {
            if (this.players.has(data.playerId)) {
                const player = this.players.get(data.playerId);
                player.lap = data.lap;
                player.checkpoint = data.checkpoint;
            }

            if (this.onGameStateUpdate) {
                this.onGameStateUpdate('lapUpdate', data);
            }
        });

        this.socket.on('raceEnd', (data) => {
            console.log('Race ended!');
            this.gameState = 'finished';

            if (this.onGameStateUpdate) {
                this.onGameStateUpdate('raceEnd', data);
            }
        });

        // Voice chat events
        this.socket.on('voiceOffer', (data) => {
            if (this.voiceChatCallback) {
                this.voiceChatCallback('voiceOffer', data);
            }
        });

        this.socket.on('voiceAnswer', (data) => {
            if (this.voiceChatCallback) {
                this.voiceChatCallback('voiceAnswer', data);
            }
        });

        this.socket.on('voiceIceCandidate', (data) => {
            if (this.voiceChatCallback) {
                this.voiceChatCallback('voiceIceCandidate', data);
            }
        });

        this.socket.on('voiceMuteStatus', (data) => {
            if (this.voiceChatCallback) {
                this.voiceChatCallback('voiceMuteStatus', data);
            }
        });

        this.socket.on('playerJoined', (data) => {
            if (this.voiceChatCallback) {
                this.voiceChatCallback('playerJoined', data);
            }
        });

        this.socket.on('playerLeft', (data) => {
            if (this.voiceChatCallback) {
                this.voiceChatCallback('playerLeft', data);
            }
        });
    }

    joinMatchmaking(playerData = {}) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return;
        }

        this.gameState = 'matchmaking';
        this.socket.emit('joinMatchmaking', {
            name: playerData.name || 'Player',
            vehicleCustomization: playerData.customization || {},
            ...playerData
        });
    }

    updatePosition(position, rotation, velocity) {
        if (!this.isConnected || this.gameState !== 'racing') return;

        const now = Date.now();
        if (now - this.lastPositionUpdate < this.updateInterval) return;

        this.lastPositionUpdate = now;

        this.socket.emit('updatePosition', {
            position: position,
            rotation: rotation,
            velocity: velocity
        });
    }





    getPlayers() {
        return Array.from(this.players.values());
    }

    getLocalPlayer() {
        return this.players.get(this.localPlayerId);
    }

    isLocalPlayer(playerId) {
        return playerId === this.localPlayerId;
    }

    getRaceTimeRemaining() {
        if (!this.raceStartTime) return 0;
        return Math.max(0, this.raceStartTime - Date.now());
    }

    // Multiplayer Racing Methods
    startMatchmaking(gameMode = 'standard', region = 'auto') {
        if (!this.socket || !this.isConnected) {
            console.error('Not connected to server');
            return false;
        }

        console.log(`Starting matchmaking for ${gameMode} in ${region}`);
        this.matchmakingStatus = 'searching';

        this.socket.emit('startMatchmaking', {
            gameMode,
            region,
            playerData: {
                name: 'Player', // Could be customizable
                level: this.game.progressionManager ? this.game.progressionManager.getPlayerData().level : 1,
                vehicle: this.game.currentVehicleType || 'sports_car'
            }
        });

        return true;
    }

    cancelMatchmaking() {
        if (this.socket && this.isConnected) {
            this.socket.emit('cancelMatchmaking');
        }
        this.matchmakingStatus = 'idle';
        console.log('Matchmaking cancelled');
    }

    joinRace(raceId) {
        if (!this.socket || !this.isConnected) return false;

        console.log(`Joining race: ${raceId}`);
        this.socket.emit('joinRace', { raceId });
        return true;
    }

    leaveRace() {
        if (this.socket && this.isConnected) {
            this.socket.emit('leaveRace');
        }
        this.gameState = 'menu';
        this.raceData = {
            lapTimes: [],
            currentLap: 1,
            totalLaps: 3,
            position: 1,
            checkpoint: 0,
            finished: false,
            finishTime: null
        };
    }

    // Real-time position synchronization
    sendPositionUpdate(position, rotation, velocity, currentLap, checkpoint) {
        if (!this.socket || !this.isConnected || this.gameState !== 'racing') return;

        const now = Date.now();
        if (now - this.lastPositionUpdate < this.updateInterval) return;

        this.lastPositionUpdate = now;

        this.socket.emit('positionUpdate', {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z
            },
            velocity: velocity ? {
                x: velocity.x,
                y: velocity.y,
                z: velocity.z
            } : null,
            currentLap,
            checkpoint,
            timestamp: now
        });
    }

    // Race event synchronization
    sendLapCompleted(lap, checkpoint, lapTime) {
        if (!this.socket || !this.isConnected) return;

        this.socket.emit('lapCompleted', {
            lap,
            checkpoint,
            lapTime,
            timestamp: Date.now()
        });

        // Update local race data
        this.raceData.lapTimes.push(lapTime);
        this.raceData.currentLap = lap + 1;
        this.raceData.checkpoint = checkpoint;
    }

    sendRaceFinished(finalPosition, totalTime, stats) {
        if (!this.socket || !this.isConnected) return;

        this.socket.emit('raceFinished', {
            finalPosition,
            totalTime,
            stats,
            timestamp: Date.now()
        });

        // Update local race data
        this.raceData.finished = true;
        this.raceData.finishTime = totalTime;
        this.raceData.position = finalPosition;
    }

    // Spectate another player
    spectatePlayer(playerId) {
        if (!this.socket || !this.isConnected) return false;

        const player = this.players.get(playerId);
        if (!player) return false;

        this.socket.emit('spectatePlayer', { playerId });
        console.log(`Now spectating ${player.name}`);
        return true;
    }

    stopSpectating() {
        if (this.socket && this.isConnected) {
            this.socket.emit('stopSpectating');
        }
    }

    // Get race leaderboard
    getRaceLeaderboard() {
        const leaderboard = Array.from(this.players.values())
            .filter(player => player.raceData)
            .map(player => ({
                id: player.id,
                name: player.name,
                position: player.raceData.position || 999,
                currentLap: player.raceData.currentLap || 1,
                totalLaps: player.raceData.totalLaps || 3,
                bestLapTime: player.raceData.bestLapTime,
                finished: player.raceData.finished || false,
                finishTime: player.raceData.finishTime
            }))
            .sort((a, b) => {
                // Sort by finished status, then by position, then by lap progress
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                if (a.finished && b.finished) return a.finishTime - b.finishTime;
                return a.position - b.position;
            });

        return leaderboard;
    }

    // Get player statistics for the current race
    getPlayerRaceStats(playerId = null) {
        const targetId = playerId || this.localPlayerId;
        const player = this.players.get(targetId);

        if (!player || !player.raceData) return null;

        return {
            ...player.raceData,
            name: player.name,
            isLocalPlayer: targetId === this.localPlayerId
        };
    }

    // Race state queries
    isRaceActive() {
        return this.gameState === 'racing';
    }

    isRaceFinished() {
        return this.gameState === 'finished';
    }

    getPlayerCount() {
        return this.players.size;
    }

    getMatchmakingStatus() {
        return this.matchmakingStatus;
    }

    // Enhanced event handlers for multiplayer racing
    setupMultiplayerEventHandlers() {
        if (!this.socket) return;

        // Matchmaking events
        this.socket.on('matchmakingStarted', () => {
            console.log('Matchmaking started');
            this.matchmakingStatus = 'searching';
        });

        this.socket.on('matchmakingCancelled', () => {
            console.log('Matchmaking cancelled');
            this.matchmakingStatus = 'idle';
        });

        this.socket.on('matchFound', (data) => {
            console.log('Match found!', data);
            this.matchmakingStatus = 'found';
            // Auto-join the race
            this.joinRace(data.raceId);
        });

        // Race events
        this.socket.on('raceStarting', (data) => {
            console.log('Race starting in', data.countdown, 'seconds');
            this.gameState = 'countdown';
            this.raceStartTime = Date.now() + (data.countdown * 1000);
        });

        this.socket.on('raceStarted', (data) => {
            console.log('Race started!');
            this.gameState = 'racing';
            this.raceStartTime = Date.now();

            // Reset race data
            this.raceData = {
                lapTimes: [],
                currentLap: 1,
                totalLaps: data.totalLaps || 3,
                position: 1,
                checkpoint: 0,
                finished: false,
                finishTime: null
            };
        });

        this.socket.on('raceFinished', (data) => {
            console.log('Race finished!');
            this.gameState = 'finished';

            // Show final results
            if (this.game.uiManager) {
                this.game.uiManager.showRaceResults(data.results);
            }
        });

        // Real-time updates
        this.socket.on('playerPositionUpdate', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.position = data.position;
                player.rotation = data.rotation;
                player.velocity = data.velocity;
                player.raceData = player.raceData || {};
                player.raceData.currentLap = data.currentLap;
                player.raceData.checkpoint = data.checkpoint;

                // Update visual representation
                this.updatePlayerVisual(data.playerId, data);
            }
        });

        this.socket.on('playerLapCompleted', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.raceData = player.raceData || {};
                player.raceData.lapTimes = player.raceData.lapTimes || [];
                player.raceData.lapTimes.push(data.lapTime);
                player.raceData.currentLap = data.lap + 1;
                player.raceData.checkpoint = data.checkpoint;

                console.log(`${player.name} completed lap ${data.lap} in ${data.lapTime.toFixed(2)}ms`);
            }
        });

        this.socket.on('playerFinished', (data) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.raceData = player.raceData || {};
                player.raceData.finished = true;
                player.raceData.finishTime = data.totalTime;
                player.raceData.position = data.finalPosition;

                console.log(`${player.name} finished in position ${data.finalPosition}!`);
            }
        });
    }

    // Visual representation updates for multiplayer
    updatePlayerVisual(playerId, data) {
        // This would update the 3D representation of other players
        // For now, just log the update
        if (playerId !== this.localPlayerId) {
            // Update remote player position/rotation
            // This would be implemented with the scene manager
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentRoom = null;
        this.players.clear();
        this.gameState = 'menu';
    }

    // Voice chat methods
    setVoiceChatCallback(callback) {
        this.voiceChatCallback = callback;
    }

    sendVoiceOffer(peerId, offer) {
        if (!this.socket || !this.isConnected) return;
        this.socket.emit('voiceOffer', { to: peerId, offer });
    }

    sendVoiceAnswer(peerId, answer) {
        if (!this.socket || !this.isConnected) return;
        this.socket.emit('voiceAnswer', { to: peerId, answer });
    }

    sendVoiceIceCandidate(peerId, candidate) {
        if (!this.socket || !this.isConnected) return;
        this.socket.emit('voiceIceCandidate', { to: peerId, candidate });
    }

    sendVoiceMuteStatus(muted) {
        if (!this.socket || !this.isConnected) return;
        this.socket.emit('voiceMuteStatus', { muted });
    }

    setGameStateCallback(callback) {
        this.onGameStateUpdate = callback;
    }

    setPlayerUpdateCallback(callback) {
        this.onPlayerUpdate = callback;
    }

    // Advanced Networking Features

    // Set network mode (server-authoritative, peer-to-peer, hybrid)
    setNetworkMode(mode) {
        if (['server_authoritative', 'peer_to_peer', 'hybrid'].includes(mode)) {
            this.networkMode = mode;
            console.log(`Network mode set to: ${mode}`);
        }
    }

    // Message format handling
    sendReliableMessage(type, payload, seq = null) {
        if (!this.socket || !this.isConnected) return;

        const message = {
            type,
            payload,
            seq: seq || Date.now(),
            timestamp: Date.now(),
            signature: this.generateMessageSignature(payload)
        };

        if (this.networkMode === 'peer_to_peer') {
            // Send directly to peers
            this.sendPeerToPeerMessage(message);
        } else {
            // Send via server
            this.socket.emit('reliableMessage', message);
        }

        this.reliableMessages.push(message);
    }

    sendUnreliableMessage(type, payload) {
        if (!this.socket || !this.isConnected) return;

        const message = {
            type,
            payload,
            timestamp: Date.now()
        };

        // Unreliable messages don't guarantee delivery
        if (this.networkMode === 'peer_to_peer') {
            this.sendPeerToPeerMessage(message, false);
        } else {
            this.socket.emit('unreliableMessage', message);
        }

        this.unreliableMessages.push(message);
    }

    generateMessageSignature(payload) {
        // Simple signature for anti-cheat (in production, use proper crypto)
        const str = JSON.stringify(payload) + this.localPlayerId;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Sync model with entity interest management
    updateEntityInterestManagement() {
        if (this.syncModel.entityInterestManagement === 'spatial_partitioning') {
            this.updateSpatialPartitioning();
        } else if (this.syncModel.entityInterestManagement === 'kd_tree') {
            this.updateKDTreePartitioning();
        }
    }

    updateSpatialPartitioning() {
        // Divide world into cells and only sync entities in nearby cells
        const cellSize = 50; // meters
        const localPlayer = this.getLocalPlayer();

        if (!localPlayer || !localPlayer.position) return;

        const playerCell = {
            x: Math.floor(localPlayer.position.x / cellSize),
            z: Math.floor(localPlayer.position.z / cellSize)
        };

        // Determine interest cells (3x3 grid around player)
        const interestCells = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                interestCells.push({
                    x: playerCell.x + dx,
                    z: playerCell.z + dz
                });
            }
        }

        // Only sync entities in interest cells
        this.players.forEach((player, playerId) => {
            if (playerId === this.localPlayerId) return;

            const playerCell = {
                x: Math.floor(player.position.x / cellSize),
                z: Math.floor(player.position.z / cellSize)
            };

            const inInterestArea = interestCells.some(cell =>
                cell.x === playerCell.x && cell.z === playerCell.z
            );

            player.inInterestArea = inInterestArea;
        });
    }

    updateKDTreePartitioning() {
        // More advanced spatial partitioning using KD-tree
        // Implementation would build and query KD-tree for efficient nearest neighbor searches
        console.log('KD-tree partitioning not yet implemented');
    }

    // Dead reckoning for smooth movement prediction
    applyDeadReckoning(playerId, serverState) {
        const player = this.players.get(playerId);
        if (!player) return;

        const now = Date.now();
        const timeSinceUpdate = now - (serverState.timestamp || now);

        if (timeSinceUpdate < this.syncModel.interpolationBuffer) {
            // Interpolate between last known state and predicted state
            const velocity = serverState.velocity;
            if (velocity) {
                const predictedPosition = {
                    x: serverState.position.x + velocity.x * (timeSinceUpdate / 1000),
                    y: serverState.position.y + velocity.y * (timeSinceUpdate / 1000),
                    z: serverState.position.z + velocity.z * (timeSinceUpdate / 1000)
                };

                player.predictedPosition = predictedPosition;
                player.lastServerUpdate = serverState;
            }
        }
    }

    // Bandwidth management
    getBandwidthTarget() {
        // Determine bandwidth target based on connection quality and game state
        const playerCount = this.getPlayerCount();

        if (playerCount <= 4) return this.syncModel.bandwidthTargets.high;
        if (playerCount <= 8) return this.syncModel.bandwidthTargets.medium;
        return this.syncModel.bandwidthTargets.low;
    }

    optimizeBandwidthUsage() {
        const targetBandwidth = this.getBandwidthTarget();
        const currentBandwidth = this.estimateCurrentBandwidth();

        if (currentBandwidth > targetBandwidth) {
            // Reduce update frequency or message detail
            this.updateInterval = Math.max(50, this.updateInterval + 10); // Increase interval
        } else if (currentBandwidth < targetBandwidth * 0.8) {
            // Can afford more frequent updates
            this.updateInterval = Math.max(20, this.updateInterval - 5); // Decrease interval
        }
    }

    estimateCurrentBandwidth() {
        // Estimate based on message frequency and size
        const recentMessages = this.reliableMessages.concat(this.unreliableMessages)
            .filter(msg => Date.now() - msg.timestamp < 1000); // Last second

        const totalSize = recentMessages.reduce((size, msg) =>
            size + JSON.stringify(msg).length, 0);

        return (totalSize * 8) / 1000; // kbps
    }

    // Anti-cheat measures
    performAntiCheatChecks(playerData) {
        if (!this.antiCheat.serverChecks) return true;

        const checks = [];

        // Impossible speed check
        if (this.antiCheat.impossibleSpeedCheck) {
            checks.push(this.checkImpossibleSpeed(playerData));
        }

        // Geofence validation
        if (this.antiCheat.geofenceValidation) {
            checks.push(this.checkGeofenceViolation(playerData));
        }

        // Signature validation
        if (this.antiCheat.signatureValidation) {
            checks.push(this.validateMessageSignature(playerData));
        }

        // Simulation differential checks
        if (this.antiCheat.simulationDifferentialChecks) {
            checks.push(this.checkSimulationDifferential(playerData));
        }

        return checks.every(check => check);
    }

    checkImpossibleSpeed(playerData) {
        const maxSpeed = 100; // m/s (very fast for a car)
        const velocity = playerData.velocity;

        if (!velocity) return true;

        const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
        return speed <= maxSpeed;
    }

    checkGeofenceViolation(playerData) {
        // Check if player is within track boundaries
        // This would need track data - simplified check
        const position = playerData.position;
        const trackBounds = { min: -200, max: 200 }; // Simplified

        return position.x >= trackBounds.min && position.x <= trackBounds.max &&
               position.z >= trackBounds.min && position.z <= trackBounds.max;
    }

    validateMessageSignature(playerData) {
        // Validate message signature
        const expectedSignature = this.generateMessageSignature(playerData.payload || playerData);
        return playerData.signature === expectedSignature;
    }

    checkSimulationDifferential(playerData) {
        // Compare client simulation with server simulation
        // This would require running server-side simulation
        return true; // Placeholder
    }

    // Network testing and simulation
    setSimulatedConditions(conditions) {
        this.netTesting.simulatedConditions = { ...this.netTesting.simulatedConditions, ...conditions };
        console.log('Simulated network conditions set:', conditions);
    }

    applyNetworkSimulation(message) {
        const conditions = this.netTesting.simulatedConditions;

        // Simulate latency
        if (conditions.latency > 0) {
            setTimeout(() => {
                this.processSimulatedMessage(message);
            }, conditions.latency);
            return;
        }

        // Simulate packet loss
        if (conditions.packetLoss > 0 && Math.random() < conditions.packetLoss) {
            console.log('Simulated packet loss');
            return;
        }

        // Simulate out-of-order delivery
        if (conditions.outOfOrder && Math.random() < 0.1) {
            setTimeout(() => {
                this.processSimulatedMessage(message);
            }, Math.random() * 100);
            return;
        }

        this.processSimulatedMessage(message);
    }

    processSimulatedMessage(message) {
        // Process message after simulation
        if (message.type === 'positionUpdate') {
            this.handlePositionUpdate(message);
        }
        // Handle other message types...
    }

    // Deterministic replay for testing
    startDeterministicReplay(recordedInputs) {
        this.netTesting.deterministicReplay = true;
        this.replayInputs = recordedInputs;
        this.replayIndex = 0;
        console.log('Started deterministic replay');
    }

    stopDeterministicReplay() {
        this.netTesting.deterministicReplay = false;
        this.replayInputs = null;
        this.replayIndex = 0;
        console.log('Stopped deterministic replay');
    }

    getDeterministicInput() {
        if (!this.netTesting.deterministicReplay || !this.replayInputs) return null;

        const input = this.replayInputs[this.replayIndex];
        this.replayIndex = (this.replayIndex + 1) % this.replayInputs.length;
        return input;
    }

    // Peer-to-peer networking (simplified)
    sendPeerToPeerMessage(message, reliable = true) {
        // In a real implementation, this would use WebRTC data channels
        // For now, route through server
        if (reliable) {
            this.socket.emit('peerMessage', message);
        } else {
            this.socket.emit('unreliablePeerMessage', message);
        }
    }

    // Enhanced position update with advanced features
    sendEnhancedPositionUpdate(position, rotation, velocity, additionalData = {}) {
        if (!this.isConnected || this.gameState !== 'racing') return;

        const now = Date.now();
        if (now - this.lastPositionUpdate < this.updateInterval) return;

        this.lastPositionUpdate = now;

        // Perform anti-cheat checks before sending
        const playerData = {
            position,
            rotation,
            velocity,
            ...additionalData,
            timestamp: now
        };

        if (!this.performAntiCheatChecks(playerData)) {
            console.warn('Anti-cheat check failed, position update blocked');
            return;
        }

        // Update entity interest management
        this.updateEntityInterestManagement();

        // Send appropriate message type based on reliability needs
        if (this.syncModel.deadReckoning) {
            this.sendUnreliableMessage('positionUpdate', playerData);
        } else {
            this.sendReliableMessage('positionUpdate', playerData);
        }

        // Optimize bandwidth
        this.optimizeBandwidthUsage();
    }
}