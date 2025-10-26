import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json({ limit: '10mb' }));
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

// Cloud save storage (in production, use a database)
const cloudSaves = new Map();

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
                // Anti-cheat validation
                if (this.validatePositionUpdate(socket.id, data, room)) {
                    room.updatePlayer(socket.id, data);
                    // Broadcast to other players in room
                    socket.to(player.currentRoom).emit('playerUpdate', {
                        playerId: socket.id,
                        ...data
                    });
                } else {
                    // Invalid update - kick player or warn
                    console.warn(`Invalid position update from ${socket.id}`);
                    socket.emit('cheatDetected', { reason: 'Invalid position update' });
                    // Could disconnect: socket.disconnect();
                }
            }
        }
    });

    // Handle race events
    socket.on('lapCompleted', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.currentRoom) {
            const room = games.get(player.currentRoom);
            if (room) {
                // Validate lap completion
                if (validateLapCompletion(socket.id, data, room)) {
                    room.updatePlayer(socket.id, { lap: data.lap, checkpoint: data.checkpoint });
                    io.to(player.currentRoom).emit('lapUpdate', {
                        playerId: socket.id,
                        lap: data.lap,
                        checkpoint: data.checkpoint
                    });
                } else {
                    console.warn(`Invalid lap completion from ${socket.id}`);
                    socket.emit('cheatDetected', { reason: 'Invalid lap completion' });
                }
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

// Anti-cheat validation
function validatePositionUpdate(playerId, newData, room) {
    const player = room.players.get(playerId);
    if (!player) return false;

    const oldPos = player.position;
    const newPos = newData.position;

    if (!newPos || typeof newPos.x !== 'number' || typeof newPos.y !== 'number' || typeof newPos.z !== 'number') {
        return false; // Invalid position data
    }

    // Check for teleportation (distance too large)
    const distance = Math.sqrt(
        Math.pow(newPos.x - oldPos.x, 2) +
        Math.pow(newPos.y - oldPos.y, 2) +
        Math.pow(newPos.z - oldPos.z, 2)
    );

    const maxDistancePerUpdate = 10; // Adjust based on physics
    if (distance > maxDistancePerUpdate) {
        console.warn(`Player ${playerId} teleported ${distance} units`);
        return false;
    }

    // Check speed limits
    const velocity = newData.velocity;
    if (velocity) {
        const speed = Math.sqrt(
            Math.pow(velocity.x, 2) +
            Math.pow(velocity.y, 2) +
            Math.pow(velocity.z, 2)
        );

        const maxSpeed = 50; // Adjust based on vehicle max speed
        if (speed > maxSpeed) {
            console.warn(`Player ${playerId} exceeded speed limit: ${speed}`);
            return false;
        }
    }

    // Check for flying (Y position too high)
    const maxHeight = 10; // Adjust based on track
    if (newPos.y > maxHeight) {
        console.warn(`Player ${playerId} flying at height ${newPos.y}`);
        return false;
    }

    // Check for underground (Y position too low)
    const minHeight = -5;
    if (newPos.y < minHeight) {
        console.warn(`Player ${playerId} underground at height ${newPos.y}`);
        return false;
    }

    return true;
}

function validateLapCompletion(playerId, data, room) {
    const player = room.players.get(playerId);
    if (!player) return false;

    // Check if lap number is sequential
    if (data.lap !== player.lap + 1) {
        console.warn(`Player ${playerId} skipped lap ${player.lap} to ${data.lap}`);
        return false;
    }

    // Check if checkpoint is valid (simplified - would need track data)
    if (data.checkpoint < 0 || data.checkpoint > 10) { // Assume 10 checkpoints
        console.warn(`Player ${playerId} invalid checkpoint ${data.checkpoint}`);
        return false;
    }

    // Check timing - laps should take reasonable time
    const now = Date.now();
    if (player.lastLapTime) {
        const lapTime = now - player.lastLapTime;
        const minLapTime = 10000; // 10 seconds minimum
        const maxLapTime = 300000; // 5 minutes maximum

        if (lapTime < minLapTime) {
            console.warn(`Player ${playerId} completed lap too fast: ${lapTime}ms`);
            return false;
        }
        if (lapTime > maxLapTime) {
            console.warn(`Player ${playerId} took too long for lap: ${lapTime}ms`);
            return false;
        }
    }

    player.lastLapTime = now;
    return true;
}

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

// Cloud save API endpoints
app.post('/api/cloud/save', (req, res) => {
    try {
        const { userId, gameData } = req.body;

        if (!userId || !gameData) {
            return res.status(400).json({ error: 'Missing userId or gameData' });
        }

        // Save to cloud storage
        cloudSaves.set(userId, {
            ...gameData,
            syncedAt: Date.now(),
            version: gameData.version || 1
        });

        // Also save to file for persistence
        const savePath = path.join(__dirname, 'saves', `${userId}.json`);
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, JSON.stringify(cloudSaves.get(userId), null, 2));

        console.log(`Saved cloud data for user ${userId}`);
        res.json({ success: true, syncedAt: Date.now() });
    } catch (error) {
        console.error('Cloud save error:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.get('/api/cloud/load/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        // Try to load from memory first
        let saveData = cloudSaves.get(userId);

        // If not in memory, try to load from file
        if (!saveData) {
            const savePath = path.join(__dirname, 'saves', `${userId}.json`);
            if (fs.existsSync(savePath)) {
                const fileData = fs.readFileSync(savePath, 'utf8');
                saveData = JSON.parse(fileData);
                cloudSaves.set(userId, saveData);
            }
        }

        if (!saveData) {
            return res.status(404).json({ error: 'No save data found' });
        }

        res.json(saveData);
    } catch (error) {
        console.error('Cloud load error:', error);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

app.post('/api/cloud/login', (req, res) => {
    try {
        const { username, password } = req.body;

        // Simple authentication (in production, use proper auth)
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }

        // Generate a simple user ID based on username
        const userId = `user_${Buffer.from(username).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;

        res.json({
            success: true,
            userId: userId,
            username: username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Multiplayer server running on port ${PORT}`);
});