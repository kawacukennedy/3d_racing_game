export class SocialManager {
    constructor() {
        this.friends = [];
        this.friendRequests = [];
        this.blockedUsers = [];
        this.messages = [];
        this.onlineFriends = new Set();
        this.leaderboards = {
            global: [],
            friends: [],
            weekly: [],
            monthly: []
        };

        this.loadSocialData();
    }

    loadSocialData() {
        try {
            const stored = localStorage.getItem('social_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.friends = data.friends || [];
                this.friendRequests = data.friendRequests || [];
                this.blockedUsers = data.blockedUsers || [];
                this.messages = data.messages || [];
            }
        } catch (error) {
            console.error('Failed to load social data:', error);
        }
    }

    saveSocialData() {
        try {
            const data = {
                friends: this.friends,
                friendRequests: this.friendRequests,
                blockedUsers: this.blockedUsers,
                messages: this.messages,
                lastUpdated: Date.now()
            };
            localStorage.setItem('social_data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save social data:', error);
        }
    }

    // Friend Management

    sendFriendRequest(playerId, playerName) {
        // Check if already friends
        if (this.friends.some(friend => friend.id === playerId)) {
            return { success: false, reason: 'Already friends' };
        }

        // Check if request already sent
        if (this.friendRequests.some(req => req.to === playerId && req.from === 'localPlayer')) {
            return { success: false, reason: 'Request already sent' };
        }

        const request = {
            id: Date.now(),
            from: 'localPlayer',
            to: playerId,
            playerName: playerName,
            status: 'pending',
            timestamp: Date.now()
        };

        this.friendRequests.push(request);
        this.saveSocialData();

        return { success: true, request: request };
    }

    acceptFriendRequest(requestId) {
        const request = this.friendRequests.find(req => req.id === requestId);
        if (!request || request.to !== 'localPlayer') {
            return { success: false, reason: 'Request not found' };
        }

        // Add to friends
        const friend = {
            id: request.from,
            name: request.playerName,
            addedAt: Date.now(),
            status: 'offline',
            lastSeen: Date.now()
        };

        this.friends.push(friend);

        // Remove request
        this.friendRequests = this.friendRequests.filter(req => req.id !== requestId);

        this.saveSocialData();
        return { success: true, friend: friend };
    }

    declineFriendRequest(requestId) {
        this.friendRequests = this.friendRequests.filter(req => req.id !== requestId);
        this.saveSocialData();
        return { success: true };
    }

    removeFriend(friendId) {
        this.friends = this.friends.filter(friend => friend.id !== friendId);
        this.saveSocialData();
        return { success: true };
    }

    blockUser(playerId) {
        if (!this.blockedUsers.includes(playerId)) {
            this.blockedUsers.push(playerId);
            // Remove from friends if they were friends
            this.friends = this.friends.filter(friend => friend.id !== playerId);
            this.saveSocialData();
        }
        return { success: true };
    }

    unblockUser(playerId) {
        this.blockedUsers = this.blockedUsers.filter(id => id !== playerId);
        this.saveSocialData();
        return { success: true };
    }

    // Messaging

    sendMessage(toPlayerId, message) {
        if (this.blockedUsers.includes(toPlayerId)) {
            return { success: false, reason: 'User is blocked' };
        }

        const messageObj = {
            id: Date.now(),
            from: 'localPlayer',
            to: toPlayerId,
            content: message,
            timestamp: Date.now(),
            read: false,
            type: 'direct'
        };

        this.messages.push(messageObj);
        this.saveSocialData();

        return { success: true, message: messageObj };
    }

    getMessages(withPlayerId = null, unreadOnly = false) {
        let filteredMessages = this.messages;

        if (withPlayerId) {
            filteredMessages = filteredMessages.filter(msg =>
                (msg.from === withPlayerId && msg.to === 'localPlayer') ||
                (msg.from === 'localPlayer' && msg.to === withPlayerId)
            );
        }

        if (unreadOnly) {
            filteredMessages = filteredMessages.filter(msg =>
                !msg.read && msg.to === 'localPlayer'
            );
        }

        return filteredMessages.sort((a, b) => b.timestamp - a.timestamp);
    }

    markMessageRead(messageId) {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message && message.to === 'localPlayer') {
            message.read = true;
            this.saveSocialData();
            return { success: true };
        }
        return { success: false, reason: 'Message not found' };
    }

    // Online Status

    updateFriendStatus(friendId, status, lastSeen = null) {
        const friend = this.friends.find(f => f.id === friendId);
        if (friend) {
            friend.status = status;
            if (lastSeen) friend.lastSeen = lastSeen;

            if (status === 'online') {
                this.onlineFriends.add(friendId);
            } else {
                this.onlineFriends.delete(friendId);
            }

            this.saveSocialData();
            return { success: true };
        }
        return { success: false, reason: 'Friend not found' };
    }

    getOnlineFriends() {
        return this.friends.filter(friend => friend.status === 'online');
    }

    // Leaderboards

    updateLeaderboard(type, playerId, playerName, score, metadata = {}) {
        if (!this.leaderboards[type]) {
            this.leaderboards[type] = [];
        }

        const leaderboard = this.leaderboards[type];
        const existingEntry = leaderboard.find(entry => entry.playerId === playerId);

        if (existingEntry) {
            // Update existing entry if better score
            if (score > existingEntry.score) {
                existingEntry.score = score;
                existingEntry.metadata = metadata;
                existingEntry.updatedAt = Date.now();
            }
        } else {
            // Add new entry
            leaderboard.push({
                playerId: playerId,
                playerName: playerName,
                score: score,
                metadata: metadata,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        // Sort and keep top 100
        leaderboard.sort((a, b) => b.score - a.score);
        if (leaderboard.length > 100) {
            leaderboard.splice(100);
        }

        this.saveSocialData();
        return { success: true, rank: leaderboard.findIndex(entry => entry.playerId === playerId) + 1 };
    }

    getLeaderboard(type, limit = 50) {
        const leaderboard = this.leaderboards[type] || [];
        return leaderboard.slice(0, limit).map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));
    }

    getPlayerRank(type, playerId) {
        const leaderboard = this.leaderboards[type] || [];
        const index = leaderboard.findIndex(entry => entry.playerId === playerId);
        return index >= 0 ? index + 1 : null;
    }

    // Social Gaming Features

    createParty(name, maxPlayers = 4) {
        const party = {
            id: Date.now(),
            name: name,
            leader: 'localPlayer',
            members: ['localPlayer'],
            maxPlayers: maxPlayers,
            status: 'open',
            createdAt: Date.now(),
            settings: {
                gameMode: 'race',
                isPrivate: false,
                skillRequirement: null
            }
        };

        // In a real implementation, this would be stored on the server
        return party;
    }

    inviteToParty(partyId, playerId) {
        // Send party invitation
        const invitation = {
            id: Date.now(),
            type: 'party_invite',
            from: 'localPlayer',
            to: playerId,
            partyId: partyId,
            timestamp: Date.now(),
            status: 'pending'
        };

        return { success: true, invitation: invitation };
    }

    joinParty(partyId) {
        // Join existing party
        return { success: true, partyId: partyId };
    }

    // Achievements & Social Rewards

    unlockAchievement(achievementId, playerId = 'localPlayer') {
        const achievement = {
            id: achievementId,
            playerId: playerId,
            unlockedAt: Date.now(),
            shared: false
        };

        // Store achievement
        const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
        achievements.push(achievement);
        localStorage.setItem('achievements', JSON.stringify(achievements));

        return achievement;
    }

    shareAchievement(achievementId) {
        // Mark achievement as shared
        const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
        const achievement = achievements.find(a => a.id === achievementId);

        if (achievement) {
            achievement.shared = true;
            achievement.sharedAt = Date.now();
            localStorage.setItem('achievements', JSON.stringify(achievements));

            // Create social post
            const post = {
                id: Date.now(),
                type: 'achievement',
                playerId: 'localPlayer',
                content: `Unlocked achievement: ${achievementId}`,
                timestamp: Date.now(),
                likes: 0,
                comments: []
            };

            return { success: true, post: post };
        }

        return { success: false, reason: 'Achievement not found' };
    }

    // Activity Feed

    getActivityFeed(limit = 20) {
        const activities = [];

        // Add recent races
        const raceHistory = JSON.parse(localStorage.getItem('race_history') || '[]');
        raceHistory.slice(-10).forEach(race => {
            activities.push({
                id: `race_${race.id}`,
                type: 'race',
                playerId: 'localPlayer',
                content: `Completed race: ${race.trackName}`,
                position: race.position,
                timestamp: race.timestamp,
                metadata: race
            });
        });

        // Add tournament results
        const tournamentData = JSON.parse(localStorage.getItem('tournament_data') || '{}');
        (tournamentData.completedTournaments || []).slice(-5).forEach(tournament => {
            activities.push({
                id: `tournament_${tournament.id}`,
                type: 'tournament',
                playerId: 'localPlayer',
                content: `Finished tournament: ${tournament.name}`,
                position: tournament.finalPosition,
                timestamp: tournament.completedAt,
                metadata: tournament
            });
        });

        // Sort by timestamp and limit
        return activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    // Social Challenges

    createChallenge(challengeType, targetPlayerId, parameters = {}) {
        const challenge = {
            id: Date.now(),
            type: challengeType,
            challenger: 'localPlayer',
            target: targetPlayerId,
            parameters: parameters,
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        // Store challenge
        const challenges = JSON.parse(localStorage.getItem('challenges') || '[]');
        challenges.push(challenge);
        localStorage.setItem('challenges', JSON.stringify(challenges));

        return { success: true, challenge: challenge };
    }

    acceptChallenge(challengeId) {
        const challenges = JSON.parse(localStorage.getItem('challenges') || '[]');
        const challenge = challenges.find(c => c.id === challengeId);

        if (challenge && challenge.target === 'localPlayer') {
            challenge.status = 'accepted';
            challenge.acceptedAt = Date.now();
            localStorage.setItem('challenges', JSON.stringify(challenges));

            return { success: true, challenge: challenge };
        }

        return { success: false, reason: 'Challenge not found' };
    }

    completeChallenge(challengeId, result) {
        const challenges = JSON.parse(localStorage.getItem('challenges') || '[]');
        const challenge = challenges.find(c => c.id === challengeId);

        if (challenge) {
            challenge.status = 'completed';
            challenge.result = result;
            challenge.completedAt = Date.now();
            localStorage.setItem('challenges', JSON.stringify(challenges));

            return { success: true, challenge: challenge };
        }

        return { success: false, reason: 'Challenge not found' };
    }

    getActiveChallenges() {
        const challenges = JSON.parse(localStorage.getItem('challenges') || '[]');
        const now = Date.now();

        return challenges.filter(c =>
            c.status === 'pending' || c.status === 'accepted'
        ).filter(c => c.expiresAt > now);
    }

    // Privacy & Settings

    updatePrivacySettings(settings) {
        const privacySettings = {
            showOnlineStatus: settings.showOnlineStatus ?? true,
            showActivity: settings.showActivity ?? true,
            allowFriendRequests: settings.allowFriendRequests ?? true,
            allowMessages: settings.allowMessages ?? true,
            allowChallenges: settings.allowChallenges ?? true,
            updatedAt: Date.now()
        };

        localStorage.setItem('privacy_settings', JSON.stringify(privacySettings));
        return { success: true, settings: privacySettings };
    }

    getPrivacySettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('privacy_settings') || '{}');
            return {
                showOnlineStatus: settings.showOnlineStatus ?? true,
                showActivity: settings.showActivity ?? true,
                allowFriendRequests: settings.allowFriendRequests ?? true,
                allowMessages: settings.allowMessages ?? true,
                allowChallenges: settings.allowChallenges ?? true
            };
        } catch (error) {
            return {
                showOnlineStatus: true,
                showActivity: true,
                allowFriendRequests: true,
                allowMessages: true,
                allowChallenges: true
            };
        }
    }
}