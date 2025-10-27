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
}