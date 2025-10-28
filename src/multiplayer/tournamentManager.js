export class TournamentManager {
    constructor() {
        this.activeTournaments = [];
        this.completedTournaments = [];
        this.playerStats = {
            tournamentsEntered: 0,
            tournamentsWon: 0,
            bestPlacement: null,
            totalPrizeMoney: 0
        };

        this.loadTournamentData();
    }

    calculateTotalRounds(type, maxPlayers) {
        switch (type) {
            case 'single_elimination':
                return Math.ceil(Math.log2(maxPlayers));
            case 'double_elimination':
                return Math.ceil(Math.log2(maxPlayers)) * 2 - 1;
            case 'round_robin':
                return maxPlayers - 1;
            case 'time_trial':
                return 1;
            default:
                return Math.ceil(Math.log2(maxPlayers));
        }
    }

    loadTournamentData() {
        try {
            const stored = localStorage.getItem('tournament_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.activeTournaments = data.activeTournaments || [];
                this.completedTournaments = data.completedTournaments || [];
                this.playerStats = { ...this.playerStats, ...data.playerStats };
            }
        } catch (error) {
            console.error('Failed to load tournament data:', error);
        }
    }

    saveTournamentData() {
        try {
            const data = {
                activeTournaments: this.activeTournaments,
                completedTournaments: this.completedTournaments,
                playerStats: this.playerStats,
                lastUpdated: Date.now()
            };
            localStorage.setItem('tournament_data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save tournament data:', error);
        }
    }

    createTournament(name, type = 'single_elimination', maxPlayers = 16, entryFee = 100, prizePool = 1000) {
        const tournament = {
            id: Date.now(),
            name: name,
            type: type, // single_elimination, double_elimination, round_robin, time_trial
            maxPlayers: maxPlayers,
            entryFee: entryFee,
            prizePool: prizePool,
            status: 'registering', // registering, in_progress, completed
            currentRound: 0,
            totalRounds: this.calculateTotalRounds(type, maxPlayers),
            players: [],
            brackets: [],
            matches: [],
            eliminatedPlayers: [],
            startTime: null,
            endTime: null,
            createdAt: Date.now()
        };

        this.activeTournaments.push(tournament);
        this.saveTournamentData();

        console.log(`Created tournament: ${name}`);
        return tournament;
    }

    joinTournament(tournamentId, playerData) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return { success: false, reason: 'Tournament not found' };

        if (tournament.players.length >= tournament.maxPlayers) {
            return { success: false, reason: 'Tournament is full' };
        }

        if (tournament.status !== 'registering') {
            return { success: false, reason: 'Registration closed' };
        }

        // Check if player can afford entry fee
        if (playerData.currency && playerData.currency.credits < tournament.entryFee) {
            return { success: false, reason: 'Insufficient credits' };
        }

        const playerEntry = {
            id: playerData.id || Date.now(),
            name: playerData.name,
            mmr: playerData.mmr || 1500,
            joinedAt: Date.now(),
            status: 'active' // active, eliminated, winner
        };

        tournament.players.push(playerEntry);
        this.playerStats.tournamentsEntered++;

        // Auto-start tournament when full
        if (tournament.players.length >= tournament.maxPlayers) {
            this.startTournament(tournamentId);
        }

        this.saveTournamentData();
        return { success: true, tournament: tournament };
    }

    startTournament(tournamentId) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return;

        tournament.status = 'in_progress';
        tournament.startTime = Date.now();

        // Sort players by MMR for seeding
        tournament.players.sort((a, b) => b.mmr - a.mmr);

        // Create brackets based on tournament size
        this.createBrackets(tournament);

        console.log(`Tournament ${tournament.name} started with ${tournament.players.length} players`);
        this.saveTournamentData();
    }

    createBrackets(tournament) {
        const players = [...tournament.players];

        tournament.brackets = [];
        tournament.currentRound = 1;

        // Create first round matches
        const firstRoundMatches = [];
        for (let i = 0; i < players.length; i += 2) {
            if (players[i + 1]) {
                firstRoundMatches.push({
                    id: `match_${Date.now()}_${i}`,
                    round: 1,
                    player1: players[i],
                    player2: players[i + 1],
                    winner: null,
                    status: 'pending', // pending, in_progress, completed
                    startTime: null,
                    endTime: null
                });
            } else {
                // Bye for odd number of players
                firstRoundMatches.push({
                    id: `bye_${Date.now()}_${i}`,
                    round: 1,
                    player1: players[i],
                    player2: null,
                    winner: players[i],
                    status: 'completed'
                });
            }
        }

        tournament.brackets.push({
            round: 1,
            matches: firstRoundMatches
        });
    }

    recordMatchResult(tournamentId, matchId, winnerId, matchData = {}) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return { success: false, reason: 'Tournament not found' };

        const currentRound = tournament.brackets[tournament.currentRound - 1];
        const match = currentRound.matches.find(m => m.id === matchId);

        if (!match) return { success: false, reason: 'Match not found' };

        match.winner = winnerId;
        match.status = 'completed';
        match.endTime = Date.now();
        match.matchData = matchData;

        // Check if round is complete
        const roundComplete = currentRound.matches.every(m => m.status === 'completed');

        if (roundComplete) {
            if (tournament.currentRound >= Math.ceil(Math.log2(tournament.maxPlayers))) {
                // Tournament complete
                this.completeTournament(tournament);
            } else {
                // Advance to next round
                this.advanceToNextRound(tournament);
            }
        }

        this.saveTournamentData();
        return { success: true };
    }

    advanceRound(tournamentId) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return { success: false, reason: 'Tournament not found' };

        return this.advanceToNextRound(tournament);
    }

    advanceToNextRound(tournament) {
        const currentRound = tournament.brackets[tournament.currentRound - 1];
        const winners = currentRound.matches
            .filter(match => match.winner)
            .map(match => match.winner);

        tournament.currentRound++;

        // Create next round matches
        const nextRoundMatches = [];
        for (let i = 0; i < winners.length; i += 2) {
            if (winners[i + 1]) {
                nextRoundMatches.push({
                    id: `match_${Date.now()}_${i}`,
                    round: tournament.currentRound,
                    player1: winners[i],
                    player2: winners[i + 1],
                    winner: null,
                    status: 'pending'
                });
            } else {
                // Bye
                nextRoundMatches.push({
                    id: `bye_${Date.now()}_${i}`,
                    round: tournament.currentRound,
                    player1: winners[i],
                    player2: null,
                    winner: winners[i],
                    status: 'completed'
                });
            }
        }

        tournament.brackets.push({
            round: tournament.currentRound,
            matches: nextRoundMatches
        });
    }

    completeTournament(tournament) {
        tournament.status = 'completed';
        tournament.endTime = Date.now();

        const finalRound = tournament.brackets[tournament.brackets.length - 1];
        const winner = finalRound.matches[0]?.winner;

        if (winner) {
            // Update winner stats
            const winnerPlayer = tournament.players.find(p => p.id === winner.id);
            if (winnerPlayer) {
                winnerPlayer.status = 'winner';
                this.playerStats.tournamentsWon++;
                this.playerStats.bestPlacement = 1;
            }

            // Distribute prizes
            this.distributePrizes(tournament);
        }

        // Move to completed tournaments
        this.completedTournaments.push(tournament);
        this.activeTournaments = this.activeTournaments.filter(t => t.id !== tournament.id);

        console.log(`Tournament ${tournament.name} completed. Winner: ${winner?.name || 'Unknown'}`);
        this.saveTournamentData();
    }

    distributePrizes(tournament) {
        const prizeDistribution = {
            1: 0.5,  // 50% to winner
            2: 0.25, // 25% to runner-up
            3: 0.15, // 15% to third place
            4: 0.1   // 10% to fourth place
        };

        // Sort players by final placement
        const placements = this.calculatePlacements(tournament);

        placements.forEach((player, index) => {
            const position = index + 1;
            const prizeShare = prizeDistribution[position];

            if (prizeShare) {
                const prizeAmount = Math.floor(tournament.prizePool * prizeShare);
                player.prizeMoney = prizeAmount;

                // In a real implementation, you'd credit this to player's account
                if (player.id === 'local_player') { // Assuming local player check
                    this.playerStats.totalPrizeMoney += prizeAmount;
                }

                console.log(`${player.name} won ${prizeAmount} credits (${position}${this.getOrdinalSuffix(position)} place)`);
            }
        });
    }

    calculatePlacements(tournament) {
        // Simplified placement calculation
        const placements = [];

        // Winner is from final match
        const finalMatch = tournament.brackets[tournament.brackets.length - 1].matches[0];
        if (finalMatch?.winner) {
            placements.push(finalMatch.winner);
        }

        // For simplicity, we'll just return the winner
        // A full implementation would track all eliminations
        return placements;
    }

    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    }

    getActiveTournaments() {
        return this.activeTournaments.slice();
    }

    getCompletedTournaments() {
        return this.completedTournaments.slice();
    }

    getTournamentDetails(tournamentId) {
        return this.activeTournaments.find(t => t.id === tournamentId) ||
               this.completedTournaments.find(t => t.id === tournamentId);
    }

    getPlayerTournamentStats() {
        return { ...this.playerStats };
    }

    // Generate some default tournaments
    generateDefaultTournaments() {
        if (this.activeTournaments.length === 0) {
            this.createTournament('Weekly Championship', 'single_elimination', 16, 200, 2000);
            this.createTournament('Daily Sprint', 'time_trial', 8, 50, 400);
            this.createTournament('Elite Cup', 'double_elimination', 32, 500, 10000);
            this.createTournament('Round Robin League', 'round_robin', 12, 150, 1500);
        }
    }

    // Advanced Tournament Features

    createCustomTournament(config) {
        const tournament = {
            id: Date.now(),
            name: config.name,
            type: config.type || 'single_elimination',
            maxPlayers: config.maxPlayers || 16,
            entryFee: config.entryFee || 100,
            prizePool: config.prizePool || 1000,
            gameMode: config.gameMode || 'race',
            trackType: config.trackType || 'random',
            vehicleClass: config.vehicleClass || 'any',
            timeLimit: config.timeLimit || 300, // 5 minutes
            specialRules: config.specialRules || [],
            status: 'registering',
            currentRound: 0,
            totalRounds: this.calculateTotalRounds(config.type, config.maxPlayers),
            players: [],
            brackets: [],
            matches: [],
            eliminatedPlayers: [],
            spectators: [],
            socialFeatures: {
                chatEnabled: true,
                spectatorMode: true,
                liveStreaming: config.liveStreaming || false,
                bettingEnabled: config.bettingEnabled || false
            },
            createdAt: Date.now(),
            startTime: config.startTime || null
        };

        this.activeTournaments.push(tournament);
        this.saveTournamentData();
        return tournament;
    }

    // Tournament Types Implementation

    setupSingleEliminationBracket(tournament) {
        const players = [...tournament.players];
        // Shuffle players for fairness
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }

        const bracket = [];
        let round = 1;
        let currentRoundPlayers = players;

        while (currentRoundPlayers.length > 1) {
            const matches = [];
            for (let i = 0; i < currentRoundPlayers.length; i += 2) {
                const match = {
                    id: `match_${tournament.id}_${round}_${i}`,
                    round: round,
                    player1: currentRoundPlayers[i],
                    player2: currentRoundPlayers[i + 1] || null,
                    winner: null,
                    status: 'pending',
                    scores: { player1: 0, player2: 0 },
                    bestLaps: { player1: null, player2: null }
                };
                matches.push(match);
            }

            bracket.push({
                round: round,
                matches: matches,
                status: round === 1 ? 'active' : 'pending'
            });

            // Prepare next round players (winners)
            currentRoundPlayers = matches.map(match => match.winner).filter(winner => winner);
            round++;
        }

        tournament.brackets = bracket;
        tournament.currentRound = 1;
    }

    setupDoubleEliminationBracket(tournament) {
        // Winners bracket
        const winnersBracket = this.createSingleEliminationBracket(tournament.players);

        // Losers bracket (starts empty)
        const losersBracket = [];

        tournament.brackets = [
            { name: 'winners', rounds: winnersBracket },
            { name: 'losers', rounds: losersBracket }
        ];
    }

    setupRoundRobinTournament(tournament) {
        const players = [...tournament.players];
        const matches = [];

        // Generate all possible match combinations
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                matches.push({
                    id: `match_${tournament.id}_${i}_${j}`,
                    round: 1,
                    player1: players[i],
                    player2: players[j],
                    winner: null,
                    status: 'pending',
                    scores: { player1: 0, player2: 0 },
                    completed: false
                });
            }
        }

        tournament.brackets = [{
            round: 1,
            matches: matches,
            status: 'active'
        }];
        tournament.currentRound = 1;
    }

    setupTimeTrialTournament(tournament) {
        // All players race individually against time
        const matches = tournament.players.map((player, index) => ({
            id: `trial_${tournament.id}_${index}`,
            round: 1,
            player1: player,
            player2: null, // AI or time-based
            winner: null,
            status: 'pending',
            bestTime: null,
            completed: false
        }));

        tournament.brackets = [{
            round: 1,
            matches: matches,
            status: 'active'
        }];
        tournament.currentRound = 1;
    }

    // Social Features

    joinTournamentSpectator(tournamentId, spectatorId) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return { success: false, reason: 'Tournament not found' };

        if (!tournament.spectators) tournament.spectators = [];

        if (!tournament.spectators.includes(spectatorId)) {
            tournament.spectators.push(spectatorId);
            this.saveTournamentData();
        }

        return {
            success: true,
            tournament: {
                id: tournament.id,
                name: tournament.name,
                status: tournament.status,
                currentRound: tournament.currentRound,
                players: tournament.players.length,
                spectators: tournament.spectators.length
            }
        };
    }

    leaveTournamentSpectator(tournamentId, spectatorId) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament || !tournament.spectators) return;

        tournament.spectators = tournament.spectators.filter(id => id !== spectatorId);
        this.saveTournamentData();
    }

    sendTournamentMessage(tournamentId, playerId, message) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return { success: false, reason: 'Tournament not found' };

        const chatMessage = {
            id: Date.now(),
            playerId: playerId,
            message: message,
            timestamp: Date.now(),
            type: 'chat'
        };

        if (!tournament.chat) tournament.chat = [];
        tournament.chat.push(chatMessage);

        // Keep only last 100 messages
        if (tournament.chat.length > 100) {
            tournament.chat = tournament.chat.slice(-100);
        }

        this.saveTournamentData();

        return { success: true, message: chatMessage };
    }

    getTournamentChat(tournamentId, since = 0) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament || !tournament.chat) return [];

        return tournament.chat.filter(msg => msg.timestamp > since);
    }

    // Tournament Analytics

    getTournamentState(tournamentId) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return null;

        const totalRounds = Math.ceil(Math.log2(tournament.maxPlayers));
        const currentRound = tournament.brackets[tournament.currentRound - 1] || {};
        const currentRoundMatches = currentRound.matches || [];
        const completedMatches = currentRoundMatches.filter(match => match.winner).length;
        const totalMatches = currentRoundMatches.length;

        return {
            id: tournament.id,
            name: tournament.name,
            type: tournament.type,
            status: tournament.status,
            currentRound: tournament.currentRound,
            totalRounds: totalRounds,
            players: tournament.players.length,
            maxPlayers: tournament.maxPlayers,
            matchesCompleted: completedMatches,
            totalMatches: totalMatches,
            roundProgress: totalMatches > 0 ? completedMatches / totalMatches : 0,
            winner: tournament.winner || null,
            prizePool: tournament.prizePool,
            entryFee: tournament.entryFee
        };
    }

    getTournamentStats(tournamentId) {
        const tournament = this.completedTournaments.find(t => t.id === tournamentId);
        if (!tournament) return null;

        const totalMatches = tournament.brackets.reduce((sum, round) =>
            sum + round.matches.length, 0);

        const completedMatches = tournament.brackets.reduce((sum, round) =>
            sum + round.matches.filter(match => match.winner).length, 0);

        const averageMatchTime = tournament.matches.reduce((sum, match) =>
            sum + (match.duration || 0), 0) / tournament.matches.length;

        return {
            tournamentId: tournament.id,
            name: tournament.name,
            totalPlayers: tournament.players.length,
            totalMatches: totalMatches,
            completedMatches: completedMatches,
            winner: tournament.winner,
            duration: tournament.completedAt - tournament.createdAt,
            averageMatchTime: averageMatchTime,
            prizeDistribution: tournament.prizeDistribution
        };
    }

    getPlayerTournamentHistory(playerId) {
        const history = [];

        // Check active tournaments
        this.activeTournaments.forEach(tournament => {
            const player = tournament.players.find(p => p.id === playerId);
            if (player) {
                history.push({
                    tournamentId: tournament.id,
                    name: tournament.name,
                    status: 'active',
                    currentRound: tournament.currentRound,
                    position: player.currentPosition || 'unknown'
                });
            }
        });

        // Check completed tournaments
        this.completedTournaments.forEach(tournament => {
            const result = tournament.results.find(r => r.playerId === playerId);
            if (result) {
                history.push({
                    tournamentId: tournament.id,
                    name: tournament.name,
                    status: 'completed',
                    position: result.position,
                    prize: result.prize || 0,
                    completedAt: tournament.completedAt
                });
            }
        });

        return history.sort((a, b) => (b.completedAt || Date.now()) - (a.completedAt || Date.now()));
    }

    // Advanced Matchmaking

    findSuitableTournament(playerSkill, preferences = {}) {
        const suitableTournaments = this.activeTournaments.filter(tournament => {
            if (tournament.status !== 'registering') return false;
            if (tournament.players.length >= tournament.maxPlayers) return false;

            // Check skill level compatibility
            const avgSkill = tournament.players.reduce((sum, p) => sum + p.skill, 0) /
                           Math.max(tournament.players.length, 1);

            const skillDiff = Math.abs(playerSkill - avgSkill);
            if (skillDiff > 500) return false; // Too big skill gap

            // Check preferences
            if (preferences.vehicleClass && tournament.vehicleClass !== 'any' &&
                tournament.vehicleClass !== preferences.vehicleClass) return false;

            if (preferences.gameMode && tournament.gameMode !== preferences.gameMode) return false;

            if (preferences.entryFeeMax && tournament.entryFee > preferences.entryFeeMax) return false;

            return true;
        });

        return suitableTournaments.sort((a, b) => {
            // Prefer tournaments with similar skill levels
            const aSkillDiff = Math.abs(playerSkill - (a.players.reduce((sum, p) => sum + p.skill, 0) / Math.max(a.players.length, 1)));
            const bSkillDiff = Math.abs(playerSkill - (b.players.reduce((sum, p) => sum + p.skill, 0) / Math.max(b.players.length, 1)));

            return aSkillDiff - bSkillDiff;
        });
    }

    // Tournament Scheduling

    scheduleTournament(tournamentId, startTime) {
        const tournament = this.activeTournaments.find(t => t.id === tournamentId);
        if (!tournament) return { success: false, reason: 'Tournament not found' };

        tournament.startTime = startTime;
        tournament.status = 'scheduled';

        this.saveTournamentData();
        return { success: true, tournament: tournament };
    }

    getUpcomingTournaments() {
        const now = Date.now();
        return this.activeTournaments
            .filter(t => t.startTime && t.startTime > now)
            .sort((a, b) => a.startTime - b.startTime);
    }

    // Prize Pool Management

    calculatePrizeDistribution(tournament) {
        const prizePool = tournament.prizePool;
        const playerCount = tournament.players.length;

        // Standard distribution: 50% to winner, 30% to top 3, 20% to rest
        const distribution = {
            1: Math.floor(prizePool * 0.5), // 50% to winner
            2: Math.floor(prizePool * 0.2), // 20% to 2nd
            3: Math.floor(prizePool * 0.1), // 10% to 3rd
        };

        // Distribute remaining 20% among positions 4+
        const remainingPool = prizePool - distribution[1] - distribution[2] - distribution[3];
        const remainingPositions = Math.max(1, playerCount - 3);
        const remainingPrize = Math.floor(remainingPool / remainingPositions);

        for (let i = 4; i <= playerCount; i++) {
            distribution[i] = remainingPrize;
        }

        return distribution;
    }
}