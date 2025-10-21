import { io } from 'socket.io-client';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.isConnected = false;
        this.currentRoom = null;
        this.players = new Map();
        this.localPlayerId = null;
        this.gameState = 'menu'; // menu, matchmaking, racing
        this.raceStartTime = null;
        this.onGameStateUpdate = null;
        this.onPlayerUpdate = null;
        this.voiceChatCallback = null;
        this.lastPositionUpdate = 0;
        this.updateInterval = 1000 / 20; // 20 updates per second
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

    sendLapCompleted(lap, checkpoint) {
        if (!this.isConnected) return;

        this.socket.emit('lapCompleted', { lap, checkpoint });
    }

    sendRaceFinished() {
        if (!this.isConnected) return;

        this.socket.emit('raceFinished');
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