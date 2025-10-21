export class RankingManager {
    constructor() {
        this.playerMMR = 1500; // Starting MMR
        this.seasonStartMMR = 1500;
        this.currentSeason = 1;
        this.seasonEndDate = this.calculateSeasonEnd();
        this.rankTiers = this.initializeRankTiers();
        this.matchHistory = [];
        this.seasonRewards = [];
        this.achievements = new Set();

        this.loadPlayerData();
    }

    initializeRankTiers() {
        return {
            bronze: { minMMR: 0, maxMMR: 1199, color: '#CD7F32', icon: '🥉' },
            silver: { minMMR: 1200, maxMMR: 1399, color: '#C0C0C0', icon: '🥈' },
            gold: { minMMR: 1400, maxMMR: 1599, color: '#FFD700', icon: '🥇' },
            platinum: { minMMR: 1600, maxMMR: 1799, color: '#E5E4E2', icon: '💎' },
            diamond: { minMMR: 1800, maxMMR: 1999, color: '#B9F2FF', icon: '💎' },
            master: { minMMR: 2000, maxMMR: 9999, color: '#FF6B6B', icon: '👑' }
        };
    }

    loadPlayerData() {
        try {
            const stored = localStorage.getItem('ranking_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.playerMMR = data.playerMMR || 1500;
                this.seasonStartMMR = data.seasonStartMMR || 1500;
                this.currentSeason = data.currentSeason || 1;
                this.matchHistory = data.matchHistory || [];
                this.achievements = new Set(data.achievements || []);
                this.seasonEndDate = new Date(data.seasonEndDate) || this.calculateSeasonEnd();
            }
        } catch (error) {
            console.error('Failed to load ranking data:', error);
        }
    }

    savePlayerData() {
        try {
            const data = {
                playerMMR: this.playerMMR,
                seasonStartMMR: this.seasonStartMMR,
                currentSeason: this.currentSeason,
                matchHistory: this.matchHistory.slice(-50), // Keep last 50 matches
                achievements: Array.from(this.achievements),
                seasonEndDate: this.seasonEndDate.toISOString(),
                lastUpdated: Date.now()
            };
            localStorage.setItem('ranking_data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save ranking data:', error);
        }
    }

    calculateSeasonEnd() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth;
    }

    getCurrentRank() {
        for (const [tierName, tierData] of Object.entries(this.rankTiers)) {
            if (this.playerMMR >= tierData.minMMR && this.playerMMR <= tierData.maxMMR) {
                return {
                    tier: tierName,
                    ...tierData,
                    progress: (this.playerMMR - tierData.minMMR) / (tierData.maxMMR - tierData.minMMR)
                };
            }
        }
        return this.rankTiers.bronze; // Fallback
    }

    calculateMMRChange(opponentMMR, placement, matchDuration) {
        const mmrDifference = opponentMMR - this.playerMMR;
        const expectedScore = 1 / (1 + Math.pow(10, mmrDifference / 400));

        let actualScore;
        if (placement === 1) actualScore = 1.0;
        else if (placement === 2) actualScore = 0.7;
        else if (placement === 3) actualScore = 0.4;
        else actualScore = 0.1;

        // Base MMR change
        let mmrChange = (actualScore - expectedScore) * 25;

        // Bonuses/penalties
        if (matchDuration < 60) mmrChange *= 0.5; // Short matches worth less
        if (placement === 1) mmrChange *= 1.2; // Winning bonus

        // Clamp MMR change
        mmrChange = Math.max(-50, Math.min(50, mmrChange));

        return Math.round(mmrChange);
    }

    recordMatchResult(opponentMMR, placement, matchDuration, trackName) {
        const mmrChange = this.calculateMMRChange(opponentMMR, placement, matchDuration);
        const oldMMR = this.playerMMR;
        this.playerMMR = Math.max(0, this.playerMMR + mmrChange);

        const matchResult = {
            id: Date.now(),
            opponentMMR: opponentMMR,
            placement: placement,
            mmrChange: mmrChange,
            oldMMR: oldMMR,
            newMMR: this.playerMMR,
            matchDuration: matchDuration,
            trackName: trackName,
            timestamp: Date.now()
        };

        this.matchHistory.push(matchResult);

        // Check for achievements
        this.checkAchievements(matchResult);

        this.savePlayerData();

        return matchResult;
    }

    checkAchievements(matchResult) {
        // First win achievement
        if (matchResult.placement === 1 && !this.achievements.has('first_win')) {
            this.achievements.add('first_win');
            this.seasonRewards.push({ type: 'achievement', name: 'First Victory', reward: 100 });
        }

        // MMR milestones
        const milestones = [1600, 1800, 2000, 2200];
        milestones.forEach(milestone => {
            if (matchResult.newMMR >= milestone && matchResult.oldMMR < milestone) {
                this.achievements.add(`mmr_${milestone}`);
                this.seasonRewards.push({
                    type: 'milestone',
                    name: `Reached ${milestone} MMR`,
                    reward: milestone === 2000 ? 500 : 200
                });
            }
        });

        // Win streak (would need to track consecutive wins)
        // This is simplified - in a real implementation you'd track win streaks
    }

    getSeasonProgress() {
        const now = new Date();
        const seasonProgress = (this.seasonEndDate - now) / (this.seasonEndDate - new Date(this.seasonEndDate.getTime() - 30 * 24 * 60 * 60 * 1000));

        return {
            season: this.currentSeason,
            progress: Math.max(0, Math.min(1, 1 - seasonProgress)),
            daysRemaining: Math.ceil((this.seasonEndDate - now) / (24 * 60 * 60 * 1000)),
            mmrGain: this.playerMMR - this.seasonStartMMR
        };
    }

    endSeason() {
        const seasonProgress = this.getSeasonProgress();
        const finalRank = this.getCurrentRank();

        // Calculate season rewards based on performance
        let seasonReward = 0;
        if (finalRank.tier === 'master') seasonReward = 1000;
        else if (finalRank.tier === 'diamond') seasonReward = 750;
        else if (finalRank.tier === 'platinum') seasonReward = 500;
        else if (finalRank.tier === 'gold') seasonReward = 300;
        else if (finalRank.tier === 'silver') seasonReward = 150;
        else seasonReward = 50;

        // Bonus for MMR gain
        seasonReward += Math.floor(seasonProgress.mmrGain / 10) * 10;

        this.seasonRewards.push({
            type: 'season_end',
            name: `Season ${this.currentSeason} Reward`,
            reward: seasonReward,
            rank: finalRank.tier
        });

        // Reset for new season
        this.currentSeason++;
        this.seasonStartMMR = this.playerMMR;
        this.seasonEndDate = this.calculateSeasonEnd();

        this.savePlayerData();

        return {
            season: this.currentSeason - 1,
            finalRank: finalRank,
            mmrGain: seasonProgress.mmrGain,
            reward: seasonReward
        };
    }

    getMatchmakingRange() {
        const currentRank = this.getCurrentRank();
        const baseRange = 200; // Base matchmaking range

        // Adjust range based on rank (higher ranks have wider ranges)
        const rankMultiplier = currentRank.tier === 'master' ? 1.5 :
                              currentRank.tier === 'diamond' ? 1.3 :
                              currentRank.tier === 'platinum' ? 1.2 : 1.0;

        return {
            minMMR: Math.max(0, this.playerMMR - baseRange * rankMultiplier),
            maxMMR: this.playerMMR + baseRange * rankMultiplier
        };
    }

    getPlayerStats() {
        const matches = this.matchHistory;
        const wins = matches.filter(m => m.placement === 1).length;
        const totalMatches = matches.length;

        return {
            mmr: this.playerMMR,
            rank: this.getCurrentRank(),
            winRate: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0,
            totalMatches: totalMatches,
            seasonProgress: this.getSeasonProgress(),
            achievements: Array.from(this.achievements),
            recentMatches: matches.slice(-5)
        };
    }

    getSeasonRewards() {
        return this.seasonRewards.slice(); // Return copy
    }

    claimSeasonReward(index) {
        if (index >= 0 && index < this.seasonRewards.length) {
            const reward = this.seasonRewards.splice(index, 1)[0];
            // In a real implementation, you'd add the reward to player's currency
            return reward;
        }
        return null;
    }
}