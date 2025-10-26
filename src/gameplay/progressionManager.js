export class ProgressionManager {
    constructor(game) {
        this.game = game;

        // Player progression data
        this.playerData = {
            level: 1,
            experience: 0,
            experienceToNext: 1000,
            totalExperience: 0,
            currency: {
                credits: 1000,
                gems: 50
            },
            unlocks: {
                vehicles: ['sports_car'],
                tracks: ['default_track'],
                upgrades: [],
                cosmetics: []
            },
            achievements: [],
            statistics: {
                racesCompleted: 0,
                racesWon: 0,
                totalRaceTime: 0,
                bestLapTime: null,
                totalDistance: 0,
                checkpointsPassed: 0,
                pitStopsCompleted: 0,
                draftingTime: 0
            }
        };

        // Experience rewards
        this.experienceRewards = {
            raceComplete: 100,
            raceWin: 250,
            lapComplete: 25,
            checkpointPass: 5,
            pitStop: 50,
            draftingBonus: 10, // per second
            perfectLap: 200, // within 5% of best time
            cleanRace: 150, // no collisions
            speedDemon: 300, // exceed 300 km/h
            driftMaster: 200 // high drift score
        };

        // Level requirements
        this.levelRequirements = this.generateLevelRequirements();

        // Achievement definitions
        this.achievements = this.defineAchievements();

        this.loadProgress();
    }

    generateLevelRequirements() {
        const requirements = {};
        for (let level = 1; level <= 100; level++) {
            // Exponential growth: base 1000, multiplier 1.15 per level
            requirements[level] = Math.floor(1000 * Math.pow(1.15, level - 1));
        }
        return requirements;
    }

    defineAchievements() {
        return {
            first_race: {
                id: 'first_race',
                name: 'First Race',
                description: 'Complete your first race',
                icon: '🏁',
                requirement: { type: 'races_completed', value: 1 },
                reward: { credits: 500, experience: 100 }
            },
            race_winner: {
                id: 'race_winner',
                name: 'Winner',
                description: 'Win your first race',
                icon: '🏆',
                requirement: { type: 'races_won', value: 1 },
                reward: { credits: 1000, experience: 250 }
            },
            speed_demon: {
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Reach 300 km/h',
                icon: '💨',
                requirement: { type: 'max_speed', value: 300 },
                reward: { credits: 2000, experience: 500 }
            },
            distance_traveler: {
                id: 'distance_traveler',
                name: 'Long Distance',
                description: 'Travel 1000 km total',
                icon: '🛣️',
                requirement: { type: 'total_distance', value: 1000000 }, // meters
                reward: { credits: 1500, experience: 300 }
            },
            pit_stop_pro: {
                id: 'pit_stop_pro',
                name: 'Pit Stop Pro',
                description: 'Complete 10 pit stops',
                icon: '🔧',
                requirement: { type: 'pit_stops', value: 10 },
                reward: { credits: 800, experience: 200 }
            },
            drafting_master: {
                id: 'drafting_master',
                name: 'Slipstreamer',
                description: 'Spend 5 minutes drafting',
                icon: '🌪️',
                requirement: { type: 'drafting_time', value: 300 }, // seconds
                reward: { credits: 1200, experience: 400 }
            },
            level_10: {
                id: 'level_10',
                name: 'Rising Star',
                description: 'Reach level 10',
                icon: '⭐',
                requirement: { type: 'level', value: 10 },
                reward: { gems: 10, experience: 1000 }
            },
            level_25: {
                id: 'level_25',
                name: 'Champion',
                description: 'Reach level 25',
                icon: '👑',
                requirement: { type: 'level', value: 25 },
                reward: { gems: 25, experience: 2500 }
            },
            level_50: {
                id: 'level_50',
                name: 'Legend',
                description: 'Reach level 50',
                icon: '🌟',
                requirement: { type: 'level', value: 50 },
                reward: { gems: 50, experience: 5000 }
            }
        };
    }

    // Experience and Leveling
    addExperience(amount, source = 'unknown') {
        this.playerData.experience += amount;
        this.playerData.totalExperience += amount;

        console.log(`Gained ${amount} XP from ${source} (Total: ${this.playerData.experience}/${this.playerData.experienceToNext})`);

        // Check for level up
        while (this.playerData.experience >= this.playerData.experienceToNext) {
            this.levelUp();
        }

        this.saveProgress();
    }

    levelUp() {
        this.playerData.experience -= this.playerData.experienceToNext;
        this.playerData.level++;

        // Calculate next level requirement
        this.playerData.experienceToNext = this.levelRequirements[this.playerData.level] || this.playerData.experienceToNext * 1.15;

        console.log(`🎉 Level up! Now level ${this.playerData.level}`);

        // Grant level rewards
        this.grantLevelRewards();

        // Check level-based achievements
        this.checkAchievements();
    }

    grantLevelRewards() {
        const baseCredits = 500 + (this.playerData.level * 50);
        const baseGems = Math.floor(this.playerData.level / 10);

        this.addCurrency('credits', baseCredits);
        if (baseGems > 0) {
            this.addCurrency('gems', baseGems);
        }

        console.log(`Level ${this.playerData.level} rewards: ${baseCredits} credits${baseGems > 0 ? `, ${baseGems} gems` : ''}`);
    }

    // Currency Management
    addCurrency(type, amount) {
        if (this.playerData.currency[type] !== undefined) {
            this.playerData.currency[type] += amount;
            console.log(`Added ${amount} ${type} (Total: ${this.playerData.currency[type]})`);
            this.saveProgress();
        }
    }

    spendCurrency(type, amount) {
        if (this.playerData.currency[type] >= amount) {
            this.playerData.currency[type] -= amount;
            console.log(`Spent ${amount} ${type} (Remaining: ${this.playerData.currency[type]})`);
            this.saveProgress();
            return true;
        }
        return false;
    }

    getCurrency(type) {
        return this.playerData.currency[type] || 0;
    }

    // Unlocks and Progression
    unlockItem(category, itemId) {
        if (!this.playerData.unlocks[category]) {
            this.playerData.unlocks[category] = [];
        }

        if (!this.playerData.unlocks[category].includes(itemId)) {
            this.playerData.unlocks[category].push(itemId);
            console.log(`Unlocked ${category}: ${itemId}`);
            this.saveProgress();
            return true;
        }

        return false;
    }

    isUnlocked(category, itemId) {
        return this.playerData.unlocks[category]?.includes(itemId) || false;
    }

    getUnlockedItems(category) {
        return this.playerData.unlocks[category] || [];
    }

    // Vehicle Upgrades
    purchaseUpgrade(vehicleId, upgradeType, upgradeId) {
        const upgradeCost = this.getUpgradeCost(upgradeType, upgradeId);

        if (!this.spendCurrency('credits', upgradeCost)) {
            return false; // Not enough currency
        }

        // Apply upgrade
        this.applyVehicleUpgrade(vehicleId, upgradeType, upgradeId);
        console.log(`Purchased ${upgradeType} upgrade: ${upgradeId} for ${vehicleId}`);
        return true;
    }

    getUpgradeCost(upgradeType, upgradeId) {
        const costs = {
            engine: { basic: 1000, sport: 2500, race: 5000, ultimate: 10000 },
            tires: { standard: 200, soft: 500, hard: 300, intermediate: 400 },
            suspension: { basic: 800, sport: 2000, race: 4000 },
            aerodynamics: { basic: 1200, sport: 3000, race: 6000 }
        };

        return costs[upgradeType]?.[upgradeId] || 0;
    }

    applyVehicleUpgrade(vehicleId, upgradeType, upgradeId) {
        // This would modify the vehicle configuration
        // For now, just track the upgrade
        const upgradeKey = `${vehicleId}_${upgradeType}`;
        if (!this.playerData.unlocks.upgrades) {
            this.playerData.unlocks.upgrades = [];
        }
        this.playerData.unlocks.upgrades.push(`${upgradeKey}_${upgradeId}`);
    }

    // Achievements
    checkAchievements() {
        Object.values(this.achievements).forEach(achievement => {
            if (!this.playerData.achievements.includes(achievement.id)) {
                if (this.meetsAchievementRequirement(achievement)) {
                    this.unlockAchievement(achievement);
                }
            }
        });
    }

    meetsAchievementRequirement(achievement) {
        const req = achievement.requirement;
        switch (req.type) {
            case 'races_completed':
                return this.playerData.statistics.racesCompleted >= req.value;
            case 'races_won':
                return this.playerData.statistics.racesWon >= req.value;
            case 'max_speed':
                return (this.playerData.statistics.maxSpeed || 0) >= req.value;
            case 'total_distance':
                return this.playerData.statistics.totalDistance >= req.value;
            case 'pit_stops':
                return this.playerData.statistics.pitStopsCompleted >= req.value;
            case 'drafting_time':
                return this.playerData.statistics.draftingTime >= req.value;
            case 'level':
                return this.playerData.level >= req.value;
            default:
                return false;
        }
    }

    unlockAchievement(achievement) {
        this.playerData.achievements.push(achievement.id);

        // Grant rewards
        if (achievement.reward.credits) {
            this.addCurrency('credits', achievement.reward.credits);
        }
        if (achievement.reward.gems) {
            this.addCurrency('gems', achievement.reward.gems);
        }
        if (achievement.reward.experience) {
            this.addExperience(achievement.reward.experience, 'achievement');
        }

        console.log(`🏆 Achievement unlocked: ${achievement.name} - ${achievement.description}`);

        // Notify UI
        if (this.game && this.game.uiManager) {
            this.game.uiManager.showAchievement(achievement);
        }
    }

    // Race Events
    onRaceStart() {
        // Track race start
    }

    onRaceComplete(finalPosition, raceTime, bestLapTime, stats) {
        this.playerData.statistics.racesCompleted++;

        if (finalPosition === 1) {
            this.playerData.statistics.racesWon++;
            this.addExperience(this.experienceRewards.raceWin, 'race_win');
        } else {
            this.addExperience(this.experienceRewards.raceComplete, 'race_complete');
        }

        this.playerData.statistics.totalRaceTime += raceTime;
        this.playerData.statistics.totalDistance += stats.distance || 0;

        if (!this.playerData.statistics.bestLapTime || bestLapTime < this.playerData.statistics.bestLapTime) {
            this.playerData.statistics.bestLapTime = bestLapTime;
        }

        this.checkAchievements();
    }

    onCheckpointPassed() {
        this.playerData.statistics.checkpointsPassed++;
        this.addExperience(this.experienceRewards.checkpointPass, 'checkpoint');
    }

    onPitStopCompleted() {
        this.playerData.statistics.pitStopsCompleted++;
        this.addExperience(this.experienceRewards.pitStop, 'pit_stop');
        this.checkAchievements();
    }

    onDraftingTime(seconds) {
        this.playerData.statistics.draftingTime += seconds;
        this.addExperience(this.experienceRewards.draftingBonus * seconds, 'drafting');
        this.checkAchievements();
    }

    // Data Persistence
    saveProgress() {
        try {
            localStorage.setItem('game_progression', JSON.stringify(this.playerData));
        } catch (error) {
            console.error('Failed to save progression data:', error);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('game_progression');
            if (saved) {
                const loadedData = JSON.parse(saved);
                // Merge with defaults to handle new fields
                this.playerData = { ...this.playerData, ...loadedData };
                console.log('Progression data loaded');
            }
        } catch (error) {
            console.error('Failed to load progression data:', error);
        }
    }

    // Getters
    getPlayerData() {
        return { ...this.playerData };
    }

    getLevelProgress() {
        return {
            currentLevel: this.playerData.level,
            currentXP: this.playerData.experience,
            xpToNext: this.playerData.experienceToNext,
            progressPercent: (this.playerData.experience / this.playerData.experienceToNext) * 100
        };
    }

    getStatistics() {
        return { ...this.playerData.statistics };
    }

    getAchievements() {
        return Object.values(this.achievements).map(achievement => ({
            ...achievement,
            unlocked: this.playerData.achievements.includes(achievement.id)
        }));
    }
}