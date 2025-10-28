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
            },
            // New progression systems
            seasonal: {
                currentSeason: 1,
                seasonProgress: 0,
                seasonPassTier: 'free',
                seasonRewards: []
            },
            missions: {
                daily: {},
                weekly: {},
                lastRefresh: Date.now()
            },
            ranked: {
                currentRank: 'Bronze III',
                rankPoints: 0,
                seasonWins: 0,
                seasonLosses: 0,
                promotionSeries: null
            },
            skillTrees: {},
            garage: {
                ownedVehicles: ['sports_car'],
                activeVehicle: 'sports_car',
                loadouts: {},
                customizations: {}
            },
            tutorial: {
                completedSteps: [],
                currentStep: null,
                enabled: true
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

        // Seasonal content
        this.seasonalContent = this.initializeSeasonalContent();

        // Daily/Weekly missions
        this.missions = this.initializeMissions();

        // Ranked ladder
        this.rankedLadder = this.initializeRankedLadder();

        // Vehicle skill trees
        this.vehicleSkillTrees = this.initializeSkillTrees();

        // Garage management
        this.garage = this.initializeGarage();

        // Tutorial system
        this.tutorial = this.initializeTutorial();

        // Dynamic announcer
        this.announcer = this.initializeAnnouncer();

        this.loadProgress();

        // Start systems
        this.refreshMissions();
        this.updateSeasonalProgress();
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

        // Announce level up
        this.announce('level_up', { level: this.playerData.level });

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

        // Announce achievement
        this.announce('achievement', { name: achievement.name });

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

        // Announce race end
        this.announce('race_end', { position: finalPosition });

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

    // Seasonal Content
    initializeSeasonalContent() {
        return {
            seasons: {
                1: {
                    name: 'Velocity Rush Season 1',
                    startDate: new Date('2024-01-01'),
                    endDate: new Date('2024-03-31'),
                    passTiers: {
                        free: { rewards: ['vehicle_unlock', 'cosmetic_pack'] },
                        premium: { cost: 1000, rewards: ['exclusive_vehicle', 'premium_cosmetics', 'bonus_xp'] }
                    },
                    events: ['winter_challenge', 'speed_trials'],
                    rewards: [
                        { threshold: 100, reward: { credits: 500 } },
                        { threshold: 250, reward: { credits: 1000, gems: 5 } },
                        { threshold: 500, reward: { credits: 2000, gems: 10, vehicle: 'season_1_car' } }
                    ]
                }
            },
            currentSeason: 1
        };
    }

    updateSeasonalProgress(points = 1) {
        this.playerData.seasonal.seasonProgress += points;
        const season = this.seasonalContent.seasons[this.playerData.seasonal.currentSeason];

        // Check for rewards
        season.rewards.forEach(reward => {
            if (this.playerData.seasonal.seasonProgress >= reward.threshold &&
                !this.playerData.seasonal.seasonRewards.includes(reward.threshold)) {
                this.playerData.seasonal.seasonRewards.push(reward.threshold);
                this.grantSeasonalReward(reward.reward);
            }
        });

        this.saveProgress();
    }

    grantSeasonalReward(reward) {
        if (reward.credits) this.addCurrency('credits', reward.credits);
        if (reward.gems) this.addCurrency('gems', reward.gems);
        if (reward.vehicle) this.unlockItem('vehicles', reward.vehicle);
        console.log('Seasonal reward granted:', reward);
        this.announce('season_reward');
    }

    // Daily/Weekly Missions
    initializeMissions() {
        return {
            daily: {
                templates: [
                    { id: 'daily_race', name: 'Complete 3 Races', requirement: { type: 'races_completed', value: 3 }, reward: { credits: 200, experience: 50 } },
                    { id: 'daily_win', name: 'Win 2 Races', requirement: { type: 'races_won', value: 2 }, reward: { credits: 300, experience: 75 } },
                    { id: 'daily_drift', name: 'Score 5000 Drift Points', requirement: { type: 'drift_score', value: 5000 }, reward: { credits: 250, experience: 60 } }
                ]
            },
            weekly: {
                templates: [
                    { id: 'weekly_champion', name: 'Win 10 Races', requirement: { type: 'races_won', value: 10 }, reward: { credits: 1000, experience: 300, gems: 5 } },
                    { id: 'weekly_distance', name: 'Travel 500km', requirement: { type: 'distance', value: 500000 }, reward: { credits: 800, experience: 250 } }
                ]
            }
        };
    }

    refreshMissions() {
        const now = Date.now();
        const lastRefresh = this.playerData.missions.lastRefresh;
        const dayMs = 24 * 60 * 60 * 1000;
        const weekMs = 7 * dayMs;

        // Refresh daily missions
        if (now - lastRefresh >= dayMs) {
            this.playerData.missions.daily = this.generateMissions('daily');
        }

        // Refresh weekly missions
        if (now - lastRefresh >= weekMs) {
            this.playerData.missions.weekly = this.generateMissions('weekly');
        }

        this.playerData.missions.lastRefresh = now;
        this.saveProgress();
    }

    generateMissions(type) {
        const templates = this.missions[type].templates;
        const count = type === 'daily' ? 3 : 2;
        const selected = [];

        for (let i = 0; i < count; i++) {
            const template = templates[Math.floor(Math.random() * templates.length)];
            selected.push({
                id: `${type}_${i}_${Date.now()}`,
                ...template,
                progress: 0,
                completed: false
            });
        }

        return selected;
    }

    updateMissionProgress(missionType, missionId, progress) {
        const mission = this.playerData.missions[missionType][missionId];
        if (mission && !mission.completed) {
            mission.progress += progress;
            if (mission.progress >= mission.requirement.value) {
                mission.completed = true;
                this.completeMission(mission);
            }
            this.saveProgress();
        }
    }

    completeMission(mission) {
        if (mission.reward.credits) this.addCurrency('credits', mission.reward.credits);
        if (mission.reward.gems) this.addCurrency('gems', mission.reward.gems);
        if (mission.reward.experience) this.addExperience(mission.reward.experience, 'mission');
        console.log(`Mission completed: ${mission.name}`);
    }

    // Ranked Ladder
    initializeRankedLadder() {
        return {
            ranks: [
                'Bronze III', 'Bronze II', 'Bronze I',
                'Silver III', 'Silver II', 'Silver I',
                'Gold III', 'Gold II', 'Gold I',
                'Platinum III', 'Platinum II', 'Platinum I',
                'Diamond III', 'Diamond II', 'Diamond I',
                'Master', 'Grandmaster'
            ],
            rankRequirements: {
                'Bronze III': 0,
                'Bronze II': 100,
                'Bronze I': 200,
                'Silver III': 350,
                'Silver II': 500,
                'Silver I': 700,
                'Gold III': 950,
                'Gold II': 1200,
                'Gold I': 1500,
                'Platinum III': 1850,
                'Platinum II': 2200,
                'Platinum I': 2600,
                'Diamond III': 3000,
                'Diamond II': 3500,
                'Diamond I': 4000,
                'Master': 5000,
                'Grandmaster': 6000
            },
            seasonReset: new Date('2024-04-01')
        };
    }

    updateRankedStats(win, opponentRank) {
        const basePoints = win ? 25 : -15;
        const rankMultiplier = this.getRankMultiplier(opponentRank);
        const pointsChange = Math.floor(basePoints * rankMultiplier);

        this.playerData.ranked.rankPoints = Math.max(0, this.playerData.ranked.rankPoints + pointsChange);

        if (win) {
            this.playerData.ranked.seasonWins++;
            if (this.playerData.ranked.promotionSeries !== null) {
                this.playerData.ranked.promotionSeries++;
                if (this.playerData.ranked.promotionSeries >= 5) {
                    this.promoteRank();
                    this.playerData.ranked.promotionSeries = null;
                }
            }
        } else {
            this.playerData.ranked.seasonLosses++;
            this.playerData.ranked.promotionSeries = null;
        }

        this.checkRankProgression();
        this.saveProgress();
    }

    getRankMultiplier(opponentRank) {
        const currentIndex = this.rankedLadder.ranks.indexOf(this.playerData.ranked.currentRank);
        const opponentIndex = this.rankedLadder.ranks.indexOf(opponentRank);
        const diff = opponentIndex - currentIndex;
        return Math.max(0.5, Math.min(2.0, 1 + diff * 0.1));
    }

    checkRankProgression() {
        const nextRankIndex = this.rankedLadder.ranks.indexOf(this.playerData.ranked.currentRank) + 1;

        if (nextRankIndex < this.rankedLadder.ranks.length) {
            const nextRank = this.rankedLadder.ranks[nextRankIndex];
            const nextReq = this.rankedLadder.rankRequirements[nextRank];

            if (this.playerData.ranked.rankPoints >= nextReq) {
                this.playerData.ranked.currentRank = nextRank;
                this.playerData.ranked.promotionSeries = 0;
                console.log(`Rank promoted to ${nextRank}!`);
            }
        }
    }

    promoteRank() {
        const currentIndex = this.rankedLadder.ranks.indexOf(this.playerData.ranked.currentRank);
        if (currentIndex < this.rankedLadder.ranks.length - 1) {
            this.playerData.ranked.currentRank = this.rankedLadder.ranks[currentIndex + 1];
            console.log(`Promoted to ${this.playerData.ranked.currentRank}!`);
            this.announce('rank_up', { rank: this.playerData.ranked.currentRank });
        }
    }

    // Vehicle Skill Trees
    initializeSkillTrees() {
        return {
            sports_car: {
                name: 'Sports Car Mastery',
                skills: {
                    acceleration_boost: {
                        name: 'Acceleration Boost',
                        description: 'Increases acceleration by 10%',
                        maxLevel: 5,
                        cost: [100, 200, 400, 800, 1600],
                        effect: { type: 'acceleration', value: 0.1 }
                    },
                    handling_improvement: {
                        name: 'Handling Improvement',
                        description: 'Improves cornering ability',
                        maxLevel: 3,
                        cost: [150, 300, 600],
                        effect: { type: 'handling', value: 0.05 }
                    },
                    top_speed_increase: {
                        name: 'Top Speed Increase',
                        description: 'Raises maximum speed',
                        maxLevel: 4,
                        cost: [200, 400, 800, 1600],
                        effect: { type: 'top_speed', value: 5 }
                    }
                }
            }
        };
    }

    upgradeSkill(vehicleId, skillId) {
        const skillTree = this.vehicleSkillTrees[vehicleId];
        if (!skillTree) return false;

        const skill = skillTree.skills[skillId];
        if (!skill) return false;

        const currentLevel = this.playerData.skillTrees[vehicleId]?.[skillId] || 0;
        if (currentLevel >= skill.maxLevel) return false;

        const cost = skill.cost[currentLevel];
        if (!this.spendCurrency('credits', cost)) return false;

        if (!this.playerData.skillTrees[vehicleId]) {
            this.playerData.skillTrees[vehicleId] = {};
        }
        this.playerData.skillTrees[vehicleId][skillId] = currentLevel + 1;

        console.log(`Upgraded ${skill.name} to level ${currentLevel + 1}`);
        this.saveProgress();
        return true;
    }

    getSkillEffect(vehicleId, skillId) {
        const level = this.playerData.skillTrees[vehicleId]?.[skillId] || 0;
        const skill = this.vehicleSkillTrees[vehicleId]?.skills[skillId];
        if (!skill) return 0;

        return skill.effect.value * level;
    }

    // Garage Management
    initializeGarage() {
        return {
            maxVehicles: 10,
            customizationOptions: {
                paint: ['red', 'blue', 'black', 'white', 'yellow'],
                wheels: ['standard', 'sport', 'race', 'premium'],
                decals: ['flames', 'stripes', 'numbers', 'logos']
            }
        };
    }

    purchaseVehicle(vehicleId, cost) {
        if (this.playerData.garage.ownedVehicles.length >= this.garage.maxVehicles) {
            console.log('Garage full!');
            return false;
        }

        if (!this.spendCurrency('credits', cost)) return false;

        this.playerData.garage.ownedVehicles.push(vehicleId);
        this.unlockItem('vehicles', vehicleId);
        console.log(`Purchased vehicle: ${vehicleId}`);
        return true;
    }

    setActiveVehicle(vehicleId) {
        if (this.playerData.garage.ownedVehicles.includes(vehicleId)) {
            this.playerData.garage.activeVehicle = vehicleId;
            this.saveProgress();
            return true;
        }
        return false;
    }

    customizeVehicle(vehicleId, category, itemId, cost) {
        if (!this.playerData.garage.ownedVehicles.includes(vehicleId)) return false;
        if (!this.spendCurrency('credits', cost)) return false;

        if (!this.playerData.garage.customizations[vehicleId]) {
            this.playerData.garage.customizations[vehicleId] = {};
        }
        this.playerData.garage.customizations[vehicleId][category] = itemId;
        this.saveProgress();
        return true;
    }

    saveLoadout(vehicleId, loadoutName) {
        const loadout = {
            vehicle: vehicleId,
            customizations: this.playerData.garage.customizations[vehicleId] || {},
            upgrades: this.playerData.unlocks.upgrades.filter(u => u.startsWith(`${vehicleId}_`)) || []
        };
        this.playerData.garage.loadouts[loadoutName] = loadout;
        this.saveProgress();
    }

    loadLoadout(loadoutName) {
        const loadout = this.playerData.garage.loadouts[loadoutName];
        if (loadout) {
            this.setActiveVehicle(loadout.vehicle);
            this.playerData.garage.customizations[loadout.vehicle] = loadout.customizations;
            // Apply upgrades would need integration with vehicle config
            console.log(`Loaded loadout: ${loadoutName}`);
            this.saveProgress();
            return true;
        }
        return false;
    }

    // Tutorial System
    initializeTutorial() {
        return {
            steps: {
                welcome: {
                    id: 'welcome',
                    title: 'Welcome to Velocity Rush!',
                    description: 'Learn the basics of racing',
                    trigger: 'game_start',
                    completed: false
                },
                first_race: {
                    id: 'first_race',
                    title: 'Your First Race',
                    description: 'Complete your first race to earn rewards',
                    trigger: 'race_start',
                    completed: false
                },
                controls: {
                    id: 'controls',
                    title: 'Master the Controls',
                    description: 'Learn to accelerate, brake, and steer',
                    trigger: 'race_start',
                    completed: false
                },
                upgrades: {
                    id: 'upgrades',
                    title: 'Upgrade Your Car',
                    description: 'Spend credits to improve your vehicle',
                    trigger: 'garage_visit',
                    completed: false
                },
                ranked: {
                    id: 'ranked',
                    title: 'Climb the Ranks',
                    description: 'Compete in ranked matches to earn rewards',
                    trigger: 'ranked_unlock',
                    completed: false
                }
            },
            currentStep: null
        };
    }

    triggerTutorialStep(stepId) {
        const step = this.tutorial.steps[stepId];
        if (step && !step.completed && !this.playerData.tutorial.completedSteps.includes(stepId)) {
            this.playerData.tutorial.currentStep = stepId;
            if (this.game && this.game.uiManager) {
                this.game.uiManager.showTutorial(step);
            }
        }
    }

    completeTutorialStep(stepId) {
        if (this.playerData.tutorial.currentStep === stepId) {
            this.playerData.tutorial.completedSteps.push(stepId);
            this.tutorial.steps[stepId].completed = true;
            this.playerData.tutorial.currentStep = null;
            this.saveProgress();

            // Trigger next step if applicable
            const nextSteps = {
                'welcome': 'first_race',
                'first_race': 'controls',
                'controls': 'upgrades'
            };
            if (nextSteps[stepId]) {
                setTimeout(() => this.triggerTutorialStep(nextSteps[stepId]), 2000);
            }
        }
    }

    // Dynamic Announcer
    initializeAnnouncer() {
        return {
            events: {
                race_start: ['Gentlemen, start your engines!', 'The race begins now!', 'Go!'],
                race_end: ['Race complete!', 'What a finish!', 'Check your results!'],
                level_up: ['Level up! Congratulations!', 'You\'ve reached a new level!', 'Keep it up!'],
                achievement: ['Achievement unlocked!', 'Well done!', 'You\'ve earned a new achievement!'],
                rank_up: ['Rank increased!', 'You\'ve climbed the ladder!', 'New rank achieved!'],
                season_reward: ['Seasonal reward earned!', 'Keep progressing!', 'Season milestone reached!']
            },
            localization: {
                en: { /* English strings */ },
                es: { /* Spanish strings */ },
                fr: { /* French strings */ }
            },
            currentLanguage: 'en'
        };
    }

    announce(eventType, data = {}) {
        const messages = this.announcer.events[eventType];
        if (messages) {
            const message = messages[Math.floor(Math.random() * messages.length)];
            const localizedMessage = this.getLocalizedMessage(eventType, message);

            if (this.game && this.game.audioManager) {
                this.game.audioManager.playAnnouncerSound(eventType);
            }

            if (this.game && this.game.uiManager) {
                this.game.uiManager.showAnnouncement(localizedMessage, data);
            }

            console.log(`Announcer: ${localizedMessage}`);
        }
    }

    getLocalizedMessage(eventType, defaultMessage) {
        const lang = this.announcer.currentLanguage;
        return this.announcer.localization[lang]?.[eventType]?.[defaultMessage] || defaultMessage;
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

    getSeasonalData() {
        return { ...this.playerData.seasonal };
    }

    getMissions() {
        return { ...this.playerData.missions };
    }

    getRankedData() {
        return { ...this.playerData.ranked };
    }

    getSkillTrees() {
        return { ...this.playerData.skillTrees };
    }

    getGarageData() {
        return { ...this.playerData.garage };
    }

    getTutorialData() {
        return { ...this.playerData.tutorial };
    }
}