export class LeaderboardManager {
    constructor() {
        this.localLeaderboard = [];
        this.globalLeaderboard = [];
        this.friendsLeaderboard = [];
        this.maxEntries = 100;
        this.loadLocalData();
    }

    loadLocalData() {
        try {
            const stored = localStorage.getItem('leaderboard_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.localLeaderboard = data.localLeaderboard || [];
                this.friendsLeaderboard = data.friendsLeaderboard || [];
            }
        } catch (error) {
            console.error('Failed to load leaderboard data:', error);
        }
    }

    saveLocalData() {
        try {
            const data = {
                localLeaderboard: this.localLeaderboard,
                friendsLeaderboard: this.friendsLeaderboard,
                lastUpdated: Date.now()
            };
            localStorage.setItem('leaderboard_data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save leaderboard data:', error);
        }
    }

    addRaceResult(playerName, totalTime, bestLapTime, position, trackName = 'default') {
        const result = {
            id: Date.now() + Math.random(),
            playerName: playerName,
            totalTime: totalTime,
            bestLapTime: bestLapTime,
            position: position,
            trackName: trackName,
            timestamp: Date.now(),
            date: new Date().toISOString()
        };

        // Add to local leaderboard
        this.localLeaderboard.push(result);

        // Sort by total time (ascending - faster is better)
        this.localLeaderboard.sort((a, b) => a.totalTime - b.totalTime);

        // Keep only top entries
        if (this.localLeaderboard.length > this.maxEntries) {
            this.localLeaderboard = this.localLeaderboard.slice(0, this.maxEntries);
        }

        this.saveLocalData();
        return result;
    }

    getLocalLeaderboard(trackName = null, limit = 10) {
        let leaderboard = this.localLeaderboard;

        if (trackName) {
            leaderboard = leaderboard.filter(entry => entry.trackName === trackName);
        }

        return leaderboard.slice(0, limit);
    }

    getPersonalBest(playerName, trackName = null) {
        let entries = this.localLeaderboard.filter(entry => entry.playerName === playerName);

        if (trackName) {
            entries = entries.filter(entry => entry.trackName === trackName);
        }

        if (entries.length === 0) return null;

        return entries.reduce((best, current) =>
            current.totalTime < best.totalTime ? current : best
        );
    }

    getTrackRecords(trackName) {
        return this.localLeaderboard
            .filter(entry => entry.trackName === trackName)
            .slice(0, 10);
    }

    // Friends leaderboard (would sync with server in full implementation)
    addFriendResult(friendId, result) {
        const friendResult = {
            ...result,
            friendId: friendId
        };

        this.friendsLeaderboard.push(friendResult);
        this.friendsLeaderboard.sort((a, b) => a.totalTime - b.totalTime);

        if (this.friendsLeaderboard.length > this.maxEntries) {
            this.friendsLeaderboard = this.friendsLeaderboard.slice(0, this.maxEntries);
        }

        this.saveLocalData();
    }

    getFriendsLeaderboard(limit = 10) {
        return this.friendsLeaderboard.slice(0, limit);
    }

    // Global leaderboard (would fetch from server)
    async fetchGlobalLeaderboard(trackName = null, limit = 10) {
        // In a real implementation, this would make an API call
        // For now, return local data as global
        return this.getLocalLeaderboard(trackName, limit);
    }

    // Statistics
    getPlayerStats(playerName) {
        const playerEntries = this.localLeaderboard.filter(entry => entry.playerName === playerName);

        if (playerEntries.length === 0) {
            return {
                totalRaces: 0,
                bestTime: null,
                averageTime: null,
                winRate: 0
            };
        }

        const bestTime = Math.min(...playerEntries.map(e => e.totalTime));
        const averageTime = playerEntries.reduce((sum, e) => sum + e.totalTime, 0) / playerEntries.length;
        const wins = playerEntries.filter(e => e.position === 1).length;
        const winRate = (wins / playerEntries.length) * 100;

        return {
            totalRaces: playerEntries.length,
            bestTime: bestTime,
            averageTime: averageTime,
            winRate: winRate
        };
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10); // 2 decimal places

        return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    clearLocalData() {
        this.localLeaderboard = [];
        this.friendsLeaderboard = [];
        localStorage.removeItem('leaderboard_data');
    }
}