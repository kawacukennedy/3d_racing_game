export class EnhancedLeaderboardManager {
    constructor(socialManager) {
        this.socialManager = socialManager;
        this.leaderboards = {
            global: {
                race: [],
                timeTrial: [],
                tournament: [],
                speed: [],
                distance: []
            },
            weekly: {
                race: [],
                timeTrial: [],
                tournament: [],
                speed: [],
                distance: []
            },
            monthly: {
                race: [],
                timeTrial: [],
                tournament: [],
                speed: [],
                distance: []
            },
            friends: {
                race: [],
                timeTrial: [],
                tournament: [],
                speed: [],
                distance: []
            },
            regional: {} // Will be populated by region
        };

        this.achievements = [];
        this.records = {
            fastestLap: null,
            longestRace: null,
            mostWins: null,
            highestScore: null,
            mostRaces: null
        };

        this.loadLeaderboards();
    }

    loadLeaderboards() {
        try {
            const stored = localStorage.getItem('enhanced_leaderboards');
            if (stored) {
                const data = JSON.parse(stored);
                this.leaderboards = { ...this.leaderboards, ...data.leaderboards };
                this.achievements = data.achievements || [];
                this.records = { ...this.records, ...data.records };
            }
        } catch (error) {
            console.error('Failed to load leaderboards:', error);
        }
    }

    saveLeaderboards() {
        try {
            const data = {
                leaderboards: this.leaderboards,
                achievements: this.achievements,
                records: this.records,
                lastUpdated: Date.now()
            };
            localStorage.setItem('enhanced_leaderboards', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save leaderboards:', error);
        }
    }

    // Enhanced Scoring System

    submitScore(category, subcategory, playerData, scoreData) {
        const entry = {
            id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            playerId: playerData.id,
            playerName: playerData.name,
            avatar: playerData.avatar,
            country: playerData.country,
            score: scoreData.score,
            time: scoreData.time,
            position: scoreData.position,
            track: scoreData.track,
            vehicle: scoreData.vehicle,
            timestamp: Date.now(),
            verified: scoreData.verified || false,
            metadata: scoreData.metadata || {}
        };

        // Add to global leaderboard
        this.addToLeaderboard('global', subcategory, entry);

        // Add to weekly leaderboard
        this.addToLeaderboard('weekly', subcategory, entry);

        // Add to monthly leaderboard
        this.addToLeaderboard('monthly', subcategory, entry);

        // Add to friends leaderboard if applicable
        if (this.socialManager.friends.some(friend => friend.id === playerData.id)) {
            this.addToLeaderboard('friends', subcategory, entry);
        }

        // Check for achievements
        this.checkAchievements(playerData.id, category, subcategory, scoreData);

        // Update records
        this.updateRecords(category, subcategory, entry);

        this.saveLeaderboards();

        return {
            success: true,
            entry: entry,
            rank: this.getPlayerRank('global', subcategory, playerData.id),
            achievements: this.getRecentAchievements(playerData.id)
        };
    }

    addToLeaderboard(timeframe, subcategory, entry) {
        if (!this.leaderboards[timeframe][subcategory]) {
            this.leaderboards[timeframe][subcategory] = [];
        }

        const leaderboard = this.leaderboards[timeframe][subcategory];

        // Remove existing entry for this player
        const existingIndex = leaderboard.findIndex(e => e.playerId === entry.playerId);
        if (existingIndex !== -1) {
            leaderboard.splice(existingIndex, 1);
        }

        // Add new entry
        leaderboard.push(entry);

        // Sort by score (higher is better for most categories)
        leaderboard.sort((a, b) => {
            if (subcategory === 'race' || subcategory === 'timeTrial') {
                // Lower time is better
                return a.time - b.time;
            } else {
                // Higher score is better
                return b.score - a.score;
            }
        });

        // Keep only top 100
        if (leaderboard.length > 100) {
            leaderboard.splice(100);
        }

        // Clean old entries for time-based leaderboards
        if (timeframe === 'weekly') {
            this.cleanWeeklyLeaderboard(subcategory);
        } else if (timeframe === 'monthly') {
            this.cleanMonthlyLeaderboard(subcategory);
        }
    }

    cleanWeeklyLeaderboard(subcategory) {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        this.leaderboards.weekly[subcategory] = this.leaderboards.weekly[subcategory]
            .filter(entry => entry.timestamp > weekAgo);
    }

    cleanMonthlyLeaderboard(subcategory) {
        const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.leaderboards.monthly[subcategory] = this.leaderboards.monthly[subcategory]
            .filter(entry => entry.timestamp > monthAgo);
    }

    // Achievement System

    checkAchievements(playerId, category, subcategory, scoreData) {
        const newAchievements = [];

        // Speed achievements
        if (scoreData.score > 300) {
            newAchievements.push(this.unlockAchievement(playerId, 'speed_demon', 'Reach 300+ km/h'));
        }

        // Race achievements
        if (scoreData.position === 1 && scoreData.time < 120) {
            newAchievements.push(this.unlockAchievement(playerId, 'lightning_fast', 'Win a race in under 2 minutes'));
        }

        // Tournament achievements
        if (category === 'tournament' && scoreData.position === 1) {
            const tournamentWins = this.countTournamentWins(playerId);
            if (tournamentWins >= 5) {
                newAchievements.push(this.unlockAchievement(playerId, 'champion', 'Win 5 tournaments'));
            }
        }

        // Consistency achievements
        const recentRaces = this.getRecentRaces(playerId, 10);
        if (recentRaces.length >= 10) {
            const avgPosition = recentRaces.reduce((sum, race) => sum + race.position, 0) / recentRaces.length;
            if (avgPosition <= 3) {
                newAchievements.push(this.unlockAchievement(playerId, 'consistent', 'Average top 3 for 10 races'));
            }
        }

        // Track-specific achievements
        if (scoreData.track) {
            const trackRaces = this.getTrackRaces(playerId, scoreData.track);
            if (trackRaces.length >= 10) {
                newAchievements.push(this.unlockAchievement(playerId, 'track_master', `Complete 10 races on ${scoreData.track}`));
            }
        }

        return newAchievements;
    }

    unlockAchievement(playerId, achievementId, description) {
        // Check if already unlocked
        if (this.achievements.some(a => a.playerId === playerId && a.achievementId === achievementId)) {
            return null;
        }

        const achievement = {
            id: `achievement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            playerId: playerId,
            achievementId: achievementId,
            description: description,
            unlockedAt: Date.now(),
            rarity: this.getAchievementRarity(achievementId)
        };

        this.achievements.push(achievement);
        return achievement;
    }

    getAchievementRarity(achievementId) {
        const rarities = {
            'speed_demon': 'rare',
            'lightning_fast': 'epic',
            'champion': 'legendary',
            'consistent': 'rare',
            'track_master': 'uncommon'
        };
        return rarities[achievementId] || 'common';
    }

    // Records System

    updateRecords(category, subcategory, entry) {
        // Update fastest lap
        if (subcategory === 'timeTrial' && (!this.records.fastestLap || entry.time < this.records.fastestLap.time)) {
            this.records.fastestLap = {
                playerId: entry.playerId,
                playerName: entry.playerName,
                time: entry.time,
                track: entry.track,
                timestamp: entry.timestamp
            };
        }

        // Update longest race
        if (!this.records.longestRace || entry.time > this.records.longestRace.time) {
            this.records.longestRace = {
                playerId: entry.playerId,
                playerName: entry.playerName,
                time: entry.time,
                track: entry.track,
                timestamp: entry.timestamp
            };
        }

        // Update most wins
        const winCount = this.countWins(entry.playerId);
        if (!this.records.mostWins || winCount > this.records.mostWins.count) {
            this.records.mostWins = {
                playerId: entry.playerId,
                playerName: entry.playerName,
                count: winCount,
                timestamp: Date.now()
            };
        }
    }

    // Query Methods

    getLeaderboard(timeframe, subcategory, limit = 50) {
        const leaderboard = this.leaderboards[timeframe]?.[subcategory] || [];
        return leaderboard.slice(0, limit).map((entry, index) => ({
            ...entry,
            rank: index + 1,
            isFriend: this.socialManager.friends.some(friend => friend.id === entry.playerId)
        }));
    }

    getPlayerRank(timeframe, subcategory, playerId) {
        const leaderboard = this.leaderboards[timeframe]?.[subcategory] || [];
        const index = leaderboard.findIndex(entry => entry.playerId === playerId);
        return index >= 0 ? index + 1 : null;
    }

    getPlayerStats(playerId) {
        const stats = {
            totalRaces: 0,
            wins: 0,
            podiums: 0,
            bestPosition: null,
            averagePosition: 0,
            totalTime: 0,
            bestLapTime: null,
            achievements: [],
            favoriteTrack: null,
            favoriteVehicle: null
        };

        // Aggregate stats from all leaderboards
        Object.values(this.leaderboards).forEach(timeframe => {
            Object.values(timeframe).forEach(subcategory => {
                subcategory.forEach(entry => {
                    if (entry.playerId === playerId) {
                        stats.totalRaces++;

                        if (entry.position === 1) stats.wins++;
                        if (entry.position <= 3) stats.podiums++;

                        if (!stats.bestPosition || entry.position < stats.bestPosition) {
                            stats.bestPosition = entry.position;
                        }

                        if (entry.time) {
                            stats.totalTime += entry.time;
                            if (!stats.bestLapTime || entry.time < stats.bestLapTime) {
                                stats.bestLapTime = entry.time;
                            }
                        }
                    }
                });
            });
        });

        if (stats.totalRaces > 0) {
            stats.averagePosition = stats.totalRaces / stats.totalRaces; // This needs proper calculation
        }

        stats.achievements = this.achievements.filter(a => a.playerId === playerId);

        return stats;
    }

    getRecentAchievements(playerId, limit = 5) {
        return this.achievements
            .filter(a => a.playerId === playerId)
            .sort((a, b) => b.unlockedAt - a.unlockedAt)
            .slice(0, limit);
    }

    // Social Features

    getFriendsLeaderboard(subcategory, limit = 20) {
        const friendsIds = this.socialManager.friends.map(friend => friend.id);
        const leaderboard = this.leaderboards.friends[subcategory] || [];

        return leaderboard
            .filter(entry => friendsIds.includes(entry.playerId))
            .slice(0, limit)
            .map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));
    }

    compareWithFriends(playerId, subcategory) {
        const playerRank = this.getPlayerRank('global', subcategory, playerId);
        const friendsLeaderboard = this.getFriendsLeaderboard(subcategory);

        const playerEntry = friendsLeaderboard.find(entry => entry.playerId === playerId);
        const betterFriends = friendsLeaderboard.filter(entry => entry.rank < (playerEntry?.rank || 999)).length;
        const worseFriends = friendsLeaderboard.filter(entry => entry.rank > (playerEntry?.rank || 999)).length;

        return {
            playerRank: playerRank,
            friendsRank: playerEntry?.rank,
            betterThan: betterFriends,
            worseThan: worseFriends,
            totalFriends: friendsLeaderboard.length
        };
    }

    // Utility Methods

    countWins(playerId) {
        let wins = 0;
        Object.values(this.leaderboards).forEach(timeframe => {
            Object.values(timeframe).forEach(subcategory => {
                subcategory.forEach(entry => {
                    if (entry.playerId === playerId && entry.position === 1) {
                        wins++;
                    }
                });
            });
        });
        return wins;
    }

    countTournamentWins(playerId) {
        return this.leaderboards.global.tournament
            .filter(entry => entry.playerId === playerId && entry.position === 1)
            .length;
    }

    getRecentRaces(playerId, limit = 10) {
        const races = [];
        Object.values(this.leaderboards).forEach(timeframe => {
            Object.values(timeframe).forEach(subcategory => {
                subcategory.forEach(entry => {
                    if (entry.playerId === playerId) {
                        races.push(entry);
                    }
                });
            });
        });

        return races
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    getTrackRaces(playerId, trackName) {
        const races = [];
        Object.values(this.leaderboards).forEach(timeframe => {
            Object.values(timeframe).forEach(subcategory => {
                subcategory.forEach(entry => {
                    if (entry.playerId === playerId && entry.track === trackName) {
                        races.push(entry);
                    }
                });
            });
        });
        return races;
    }

    // Export/Import

    exportPlayerData(playerId) {
        const stats = this.getPlayerStats(playerId);
        const recentRaces = this.getRecentRaces(playerId, 50);
        const achievements = this.achievements.filter(a => a.playerId === playerId);

        return {
            playerId: playerId,
            exportDate: Date.now(),
            stats: stats,
            recentRaces: recentRaces,
            achievements: achievements,
            records: Object.values(this.records).filter(record => record?.playerId === playerId)
        };
    }

    // Seasonal Events

    createSeasonalEvent(eventData) {
        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: eventData.name,
            description: eventData.description,
            type: eventData.type, // 'race', 'tournament', 'challenge'
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            rewards: eventData.rewards,
            requirements: eventData.requirements,
            leaderboard: [],
            status: 'upcoming',
            createdAt: Date.now()
        };

        // Store seasonal events
        const events = JSON.parse(localStorage.getItem('seasonal_events') || '[]');
        events.push(event);
        localStorage.setItem('seasonal_events', JSON.stringify(events));

        return event;
    }

    getActiveSeasonalEvents() {
        const events = JSON.parse(localStorage.getItem('seasonal_events') || '[]');
        const now = Date.now();

        return events.filter(event =>
            event.startDate <= now && event.endDate >= now
        );
    }

    // Advanced Analytics

    getLeaderboardTrends(timeframe, subcategory, days = 7) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const leaderboard = this.leaderboards[timeframe]?.[subcategory] || [];

        const recentEntries = leaderboard.filter(entry => entry.timestamp > cutoff);

        return {
            totalEntries: recentEntries.length,
            averageScore: recentEntries.reduce((sum, entry) => sum + entry.score, 0) / recentEntries.length,
            topPerformers: recentEntries.slice(0, 5),
            trend: this.calculateTrend(recentEntries)
        };
    }

    calculateTrend(entries) {
        if (entries.length < 2) return 'stable';

        const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
        const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
        const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

        const firstAvg = firstHalf.reduce((sum, entry) => sum + entry.score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, entry) => sum + entry.score, 0) / secondHalf.length;

        const change = ((secondAvg - firstAvg) / firstAvg) * 100;

        if (change > 5) return 'improving';
        if (change < -5) return 'declining';
        return 'stable';
    }
}