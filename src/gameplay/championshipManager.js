export class ChampionshipManager {
    constructor(game) {
        this.game = game;

        // Championship data
        this.currentChampionship = null;
        this.championships = this.defineChampionships();
        this.seasons = [];
        this.currentSeason = null;

        // Career progress
        this.careerStats = {
            totalChampionships: 0,
            totalSeasons: 0,
            totalRaces: 0,
            totalWins: 0,
            totalPodiums: 0,
            totalPoints: 0,
            bestChampionshipFinish: null,
            currentReputation: 0,
            unlockedContent: []
        };

        this.loadCareerData();
    }

    defineChampionships() {
        return {
            rookie_cup: {
                id: 'rookie_cup',
                name: 'Rookie Cup',
                description: 'Entry-level championship for new drivers',
                difficulty: 'easy',
                requirements: { level: 1 },
                seasons: [
                    {
                        id: 'season_1',
                        name: 'Season 1',
                        races: [
                            {
                                id: 'race_1',
                                name: 'Welcome Race',
                                track: 'oval_track',
                                mode: 'standard',
                                laps: 2,
                                aiCount: 3,
                                points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                            },
                            {
                                id: 'race_2',
                                name: 'Speed Challenge',
                                track: 'speedway',
                                mode: 'time_trial',
                                laps: 1,
                                aiCount: 0,
                                points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                            },
                            {
                                id: 'race_3',
                                name: 'Drift Masters',
                                track: 'technical_circuit',
                                mode: 'drift',
                                laps: 1,
                                aiCount: 5,
                                points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                            }
                        ],
                        rewards: {
                            completion: { credits: 5000, experience: 1000 },
                            gold: { credits: 10000, gems: 5, experience: 2000 },
                            silver: { credits: 7500, gems: 3, experience: 1500 },
                            bronze: { credits: 5000, gems: 1, experience: 1000 }
                        }
                    }
                ]
            },

            pro_series: {
                id: 'pro_series',
                name: 'Pro Series',
                description: 'Professional racing championship',
                difficulty: 'normal',
                requirements: { level: 10, championships: 1 },
                seasons: [
                    {
                        id: 'season_1',
                        name: 'Pro Season 1',
                        races: [
                            {
                                id: 'race_1',
                                name: 'City Circuit',
                                track: 'city_circuit',
                                mode: 'standard',
                                laps: 3,
                                aiCount: 7,
                                points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                            },
                            {
                                id: 'race_2',
                                name: 'Mountain Pass',
                                track: 'mountain_track',
                                mode: 'standard',
                                laps: 4,
                                aiCount: 7,
                                points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                            },
                            {
                                id: 'race_3',
                                name: 'Night Race',
                                track: 'night_circuit',
                                mode: 'standard',
                                laps: 3,
                                aiCount: 7,
                                points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                            },
                            {
                                id: 'race_4',
                                name: 'Championship Final',
                                track: 'grand_prix',
                                mode: 'standard',
                                laps: 5,
                                aiCount: 7,
                                points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
                            }
                        ],
                        rewards: {
                            completion: { credits: 15000, experience: 3000 },
                            gold: { credits: 25000, gems: 10, experience: 5000 },
                            silver: { credits: 20000, gems: 7, experience: 4000 },
                            bronze: { credits: 15000, gems: 5, experience: 3000 }
                        }
                    }
                ]
            },

            elite_series: {
                id: 'elite_series',
                name: 'Elite Series',
                description: 'Elite championship for master drivers',
                difficulty: 'hard',
                requirements: { level: 25, championships: 3 },
                seasons: [
                    {
                        id: 'season_1',
                        name: 'Elite Season 1',
                        races: [
                            {
                                id: 'race_1',
                                name: 'Extreme Circuit',
                                track: 'extreme_track',
                                mode: 'standard',
                                laps: 5,
                                aiCount: 11,
                                points: [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                            },
                            {
                                id: 'race_2',
                                name: 'Weather Challenge',
                                track: 'weather_track',
                                mode: 'standard',
                                laps: 4,
                                aiCount: 11,
                                weather: 'dynamic',
                                points: [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                            },
                            {
                                id: 'race_3',
                                name: 'Elimination Showdown',
                                track: 'arena_track',
                                mode: 'elimination',
                                laps: 1,
                                aiCount: 15,
                                points: [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                            }
                        ],
                        rewards: {
                            completion: { credits: 50000, experience: 10000 },
                            gold: { credits: 75000, gems: 25, experience: 15000 },
                            silver: { credits: 60000, gems: 20, experience: 12000 },
                            bronze: { credits: 50000, gems: 15, experience: 10000 }
                        }
                    }
                ]
            }
        };
    }

    // Championship Management
    startChampionship(championshipId) {
        const championship = this.championships[championshipId];
        if (!championship) {
            console.error(`Championship ${championshipId} not found`);
            return false;
        }

        // Check requirements
        if (!this.meetsRequirements(championship.requirements)) {
            console.error(`Requirements not met for championship ${championshipId}`);
            return false;
        }

        this.currentChampionship = {
            id: championshipId,
            data: championship,
            currentSeason: 0,
            progress: {
                completedRaces: 0,
                totalPoints: 0,
                standings: []
            }
        };

        console.log(`Started championship: ${championship.name}`);
        return true;
    }

    meetsRequirements(requirements) {
        if (requirements.level && this.game.progressionManager.getPlayerData().level < requirements.level) {
            return false;
        }
        if (requirements.championships && this.careerStats.totalChampionships < requirements.championships) {
            return false;
        }
        return true;
    }

    // Season Management
    startSeason(seasonIndex = 0) {
        if (!this.currentChampionship) return false;

        const season = this.currentChampionship.data.seasons[seasonIndex];
        if (!season) return false;

        this.currentSeason = {
            id: season.id,
            data: season,
            currentRace: 0,
            results: [],
            points: 0,
            position: null
        };

        console.log(`Started season: ${season.name}`);
        return true;
    }

    // Race Management
    startNextRace() {
        if (!this.currentSeason) return null;

        const race = this.currentSeason.data.races[this.currentSeason.currentRace];
        if (!race) return null;

        // Configure the race
        this.configureRace(race);

        console.log(`Starting race: ${race.name}`);
        return race;
    }

    configureRace(raceConfig) {
        // Set game mode
        if (this.game.gameModeManager) {
            this.game.gameModeManager.setGameMode(raceConfig.mode);
            this.game.gameModeManager.totalLaps = raceConfig.laps;
        }

        // Set AI count
        if (this.game.sceneManager) {
            this.game.sceneManager.setAICount(raceConfig.aiCount);
        }

        // Set weather if specified
        if (raceConfig.weather && this.game.weatherManager) {
            this.game.weatherManager.setWeather(raceConfig.weather);
        }
    }

    completeRace(finalPosition, raceTime, stats) {
        if (!this.currentSeason) return;

        const race = this.currentSeason.data.races[this.currentSeason.currentRace];
        const points = race.points[finalPosition - 1] || 0;

        const raceResult = {
            raceId: race.id,
            position: finalPosition,
            points: points,
            time: raceTime,
            stats: stats
        };

        this.currentSeason.results.push(raceResult);
        this.currentSeason.points += points;
        this.currentSeason.currentRace++;

        // Update career stats
        this.careerStats.totalRaces++;
        this.careerStats.totalPoints += points;
        if (finalPosition === 1) this.careerStats.totalWins++;
        if (finalPosition <= 3) this.careerStats.totalPodiums++;

        // Check if season is complete
        if (this.currentSeason.currentRace >= this.currentSeason.data.races.length) {
            this.completeSeason();
        }

        console.log(`Race completed: ${race.name} - Position ${finalPosition}, ${points} points`);
        return raceResult;
    }

    completeSeason() {
        // Calculate final standings
        const totalPoints = this.currentSeason.points;
        const position = this.calculateSeasonPosition(totalPoints);

        this.currentSeason.position = position;

        // Grant rewards
        this.grantSeasonRewards(position);

        // Update career stats
        if (position === 1) {
            this.careerStats.totalChampionships++;
            if (!this.careerStats.bestChampionshipFinish ||
                position < this.careerStats.bestChampionshipFinish) {
                this.careerStats.bestChampionshipFinish = position;
            }
        }

        console.log(`Season completed: Position ${position}, ${totalPoints} points`);

        // Save progress
        this.saveCareerData();

        // Check for new championships unlocked
        this.checkChampionshipUnlocks();
    }

    calculateSeasonPosition(playerPoints) {
        // Simple calculation - in a real game, this would compare against AI performances
        // For now, assume player is competitive
        if (playerPoints >= 75) return 1; // Gold
        if (playerPoints >= 60) return 2; // Silver
        if (playerPoints >= 45) return 3; // Bronze
        return 4; // Finished
    }

    grantSeasonRewards(position) {
        const rewards = this.currentSeason.data.rewards;

        let rewardSet;
        switch (position) {
            case 1: rewardSet = rewards.gold; break;
            case 2: rewardSet = rewards.silver; break;
            case 3: rewardSet = rewards.bronze; break;
            default: rewardSet = rewards.completion; break;
        }

        if (rewardSet.credits) {
            this.game.progressionManager.addCurrency('credits', rewardSet.credits);
        }
        if (rewardSet.gems) {
            this.game.progressionManager.addCurrency('gems', rewardSet.gems);
        }
        if (rewardSet.experience) {
            this.game.progressionManager.addExperience(rewardSet.experience, 'championship');
        }

        console.log(`Season rewards granted: ${rewardSet.credits || 0} credits, ${rewardSet.gems || 0} gems, ${rewardSet.experience || 0} XP`);
    }

    checkChampionshipUnlocks() {
        Object.values(this.championships).forEach(championship => {
            if (!this.isChampionshipUnlocked(championship.id) && this.meetsRequirements(championship.requirements)) {
                this.unlockChampionship(championship.id);
            }
        });
    }

    unlockChampionship(championshipId) {
        this.careerStats.unlockedContent.push(championshipId);
        console.log(`Championship unlocked: ${this.championships[championshipId].name}`);
    }

    isChampionshipUnlocked(championshipId) {
        return this.careerStats.unlockedContent.includes(championshipId);
    }

    // Data Persistence
    saveCareerData() {
        try {
            const data = {
                careerStats: this.careerStats,
                currentChampionship: this.currentChampionship,
                currentSeason: this.currentSeason,
                lastUpdated: Date.now()
            };
            localStorage.setItem('championship_career', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save championship data:', error);
        }
    }

    loadCareerData() {
        try {
            const saved = localStorage.getItem('championship_career');
            if (saved) {
                const data = JSON.parse(saved);
                this.careerStats = { ...this.careerStats, ...data.careerStats };
                this.currentChampionship = data.currentChampionship;
                this.currentSeason = data.currentSeason;
                console.log('Championship career data loaded');
            }
        } catch (error) {
            console.error('Failed to load championship data:', error);
        }
    }

    // Getters
    getAvailableChampionships() {
        return Object.values(this.championships).filter(championship =>
            this.isChampionshipUnlocked(championship.id) || this.meetsRequirements(championship.requirements)
        );
    }

    getCurrentSeasonProgress() {
        if (!this.currentSeason) return null;

        return {
            seasonName: this.currentSeason.data.name,
            currentRace: this.currentSeason.currentRace + 1,
            totalRaces: this.currentSeason.data.races.length,
            points: this.currentSeason.points,
            results: this.currentSeason.results
        };
    }

    getCareerStats() {
        return { ...this.careerStats };
    }

    // Reset (for testing)
    resetCareer() {
        this.careerStats = {
            totalChampionships: 0,
            totalSeasons: 0,
            totalRaces: 0,
            totalWins: 0,
            totalPodiums: 0,
            totalPoints: 0,
            bestChampionshipFinish: null,
            currentReputation: 0,
            unlockedContent: []
        };
        this.currentChampionship = null;
        this.currentSeason = null;
        this.saveCareerData();
        console.log('Career reset');
    }
}