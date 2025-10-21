import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Game state
const games = new Map();
const waitingPlayers = [];
const connectedPlayers = new Map();

class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map();
        this.maxPlayers = 8;
        this.gameState = 'waiting'; // waiting, countdown, racing, finished
        this.startTime = null;
        this.trackData = null;
    }

    addPlayer(playerId, playerData) {
        if (this.players.size >= this.maxPlayers) return false;

        this.players.set(playerId, {
            id: playerId,
            name: playerData.name || `Player ${playerId.slice(0, 4)}`,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            lap: 1,
            checkpoint: 0,
            finished: false,
            disconnected: false,
            ...playerData
        });

        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);

        // If room becomes empty, clean it up
        if (this.players.size === 0) {
            games.delete(this.roomId);
        }
    }

    updatePlayer(playerId, data) {
        const player = this.players.get(playerId);
        if (player) {
            Object.assign(player, data);
        }
    }

    getPlayerData() {
        return Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            position: player.position,
            rotation: player.rotation,
            velocity: player.velocity,
            lap: player.lap,
            checkpoint: player.checkpoint,
            finished: player.finished
        }));
    }

    startRace() {
        this.gameState = 'countdown';
        this.startTime = Date.now() + 3000; // 3 second countdown

        // Broadcast race start
        io.to(this.roomId).emit('raceStart', {
            startTime: this.startTime,
            players: this.getPlayerData()
        });

        // Start the race after countdown
        setTimeout(() => {
            this.gameState = 'racing';
            io.to(this.roomId).emit('raceBegin');
        }, 3000);
    }

    endRace() {
        this.gameState = 'finished';
        const results = Array.from(this.players.values())
            .sort((a, b) => {
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                return a.lap - b.lap || a.checkpoint - b.checkpoint;
            });

        io.to(this.roomId).emit('raceEnd', { results });
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    connectedPlayers.set(socket.id, {
        id: socket.id,
        socket: socket,
        currentRoom: null
    });

    // Handle player joining matchmaking
    socket.on('joinMatchmaking', (playerData) => {
        console.log(`Player ${socket.id} joined matchmaking`);

        waitingPlayers.push({
            id: socket.id,
            socket: socket,
            data: playerData,
            joinedAt: Date.now()
        });

        // Try to create or join a game
        tryCreateGame();
    });

    // Handle player position updates
    socket.on('updatePosition', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.currentRoom) {
            const room = games.get(player.currentRoom);
            if (room) {
                room.updatePlayer(socket.id, data);
                // Broadcast to other players in room
                socket.to(player.currentRoom).emit('playerUpdate', {
                    playerId: socket.id,
                    ...data
                });
            }
        }
    });

    // Handle race events
    socket.on('lapCompleted', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.currentRoom) {
            const room = games.get(player.currentRoom);
            if (room) {
                room.updatePlayer(socket.id, { lap: data.lap, checkpoint: data.checkpoint });
                io.to(player.currentRoom).emit('lapUpdate', {
                    playerId: socket.id,
                    lap: data.lap,
                    checkpoint: data.checkpoint
                });
            }
        }
    });

    socket.on('raceFinished', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.currentRoom) {
            const room = games.get(player.currentRoom);
            if (room) {
                room.updatePlayer(socket.id, { finished: true });
                // Check if all players finished
                const activePlayers = Array.from(room.players.values()).filter(p => !p.finished && !p.disconnected);
                if (activePlayers.length === 0) {
                    room.endRace();
                }
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        const player = connectedPlayers.get(socket.id);
        if (player) {
            // Remove from waiting list
            const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
            if (waitingIndex !== -1) {
                waitingPlayers.splice(waitingIndex, 1);
            }

            // Mark as disconnected in room
            if (player.currentRoom) {
                const room = games.get(player.currentRoom);
                if (room) {
                    const roomPlayer = room.players.get(socket.id);
                    if (roomPlayer) {
                        roomPlayer.disconnected = true;
                    }
                }
            }

            connectedPlayers.delete(socket.id);
        }
    });
});

function tryCreateGame() {
    if (waitingPlayers.length >= 2) {
        // Create a new game room
        const roomId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const room = new GameRoom(roomId);
        games.set(roomId, room);

        // Add players to room
        const playersToAdd = waitingPlayers.splice(0, Math.min(8, waitingPlayers.length));
        playersToAdd.forEach(player => {
            if (room.addPlayer(player.id, player.data)) {
                player.socket.join(roomId);
                connectedPlayers.get(player.id).currentRoom = roomId;

                // Notify player they joined a room
                player.socket.emit('roomJoined', {
                    roomId: roomId,
                    players: room.getPlayerData()
                });
            }
        });

        console.log(`Created game room ${roomId} with ${playersToAdd.length} players`);

        // Start the race after a short delay
        setTimeout(() => {
            room.startRace();
        }, 1000);
    }
}

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Multiplayer server running on port ${PORT}`);
});