export class SocialHub {
    constructor(game) {
        this.game = game;
        this.friends = new Map();
        this.pendingFriendRequests = new Map();
        this.activeChallenges = new Map();
        this.spectatorMode = false;
        this.spectatedPlayer = null;
        this.socialEvents = [];
        this.notifications = [];

        // Social features
        this.liveEvents = new Map(); // Live race events, tournaments, etc.
        this.playerStatus = {
            online: true,
            inRace: false,
            currentActivity: 'menu',
            privacy: 'public' // public, friends, private
        };

        this.initializeSocialHub();
    }

    initializeSocialHub() {
        console.log('👥 Social Hub initialized - connecting players worldwide');

        // Load social data
        this.loadSocialData();

        // Set up real-time social features
        this.initializeRealTimeFeatures();

        // Start social event polling
        this.startSocialEventPolling();
    }

    // Friend System
    sendFriendRequest(playerId, playerName) {
        if (this.friends.has(playerId)) {
            return { success: false, reason: 'Already friends' };
        }

        if (this.pendingFriendRequests.has(playerId)) {
            return { success: false, reason: 'Request already sent' };
        }

        const request = {
            id: 'request_' + Date.now(),
            to: playerId,
            toName: playerName,
            from: 'local_player', // In a real game, this would be the current player's ID
            fromName: 'You',
            timestamp: Date.now(),
            status: 'pending'
        };

        this.pendingFriendRequests.set(playerId, request);

        // In a real implementation, this would send to server
        console.log(`👋 Friend request sent to ${playerName}`);

        this.saveSocialData();
        return { success: true, request: request };
    }

    acceptFriendRequest(requestId) {
        const request = Array.from(this.pendingFriendRequests.values())
            .find(req => req.id === requestId);

        if (!request) {
            return { success: false, reason: 'Request not found' };
        }

        // Add to friends
        this.friends.set(request.from, {
            id: request.from,
            name: request.fromName,
            status: 'offline',
            lastSeen: Date.now(),
            friendSince: Date.now()
        });

        // Remove from pending
        this.pendingFriendRequests.delete(request.from);

        console.log(`✅ Friend request accepted from ${request.fromName}`);

        this.saveSocialData();
        return { success: true, friend: this.friends.get(request.from) };
    }

    declineFriendRequest(requestId) {
        const request = Array.from(this.pendingFriendRequests.values())
            .find(req => req.id === requestId);

        if (!request) {
            return { success: false, reason: 'Request not found' };
        }

        this.pendingFriendRequests.delete(request.from);
        this.saveSocialData();

        return { success: true };
    }

    removeFriend(playerId) {
        if (!this.friends.has(playerId)) {
            return { success: false, reason: 'Not friends' };
        }

        const friend = this.friends.get(playerId);
        this.friends.delete(playerId);

        console.log(`👋 Removed ${friend.name} from friends`);

        this.saveSocialData();
        return { success: true };
    }

    // Challenge System
    createChallenge(friendId, challengeType, parameters = {}) {
        if (!this.friends.has(friendId)) {
            return { success: false, reason: 'Not friends with this player' };
        }

        const challenge = {
            id: 'challenge_' + Date.now(),
            challenger: 'local_player',
            challenged: friendId,
            type: challengeType,
            parameters: parameters,
            status: 'pending',
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        this.activeChallenges.set(challenge.id, challenge);

        // In a real implementation, this would send to server
        console.log(`🎯 Challenge sent to ${this.friends.get(friendId).name}: ${challengeType}`);

        this.saveSocialData();
        return { success: true, challenge: challenge };
    }

    acceptChallenge(challengeId) {
        const challenge = this.activeChallenges.get(challengeId);
        if (!challenge) {
            return { success: false, reason: 'Challenge not found' };
        }

        if (challenge.challenged !== 'local_player') {
            return { success: false, reason: 'Not your challenge' };
        }

        challenge.status = 'accepted';
        challenge.acceptedAt = Date.now();

        console.log(`🎯 Challenge accepted: ${challenge.type}`);

        this.saveSocialData();
        return { success: true, challenge: challenge };
    }

    declineChallenge(challengeId) {
        const challenge = this.activeChallenges.get(challengeId);
        if (!challenge) {
            return { success: false, reason: 'Challenge not found' };
        }

        challenge.status = 'declined';
        this.saveSocialData();

        return { success: true };
    }

    completeChallenge(challengeId, result) {
        const challenge = this.activeChallenges.get(challengeId);
        if (!challenge) {
            return { success: false, reason: 'Challenge not found' };
        }

        challenge.status = 'completed';
        challenge.result = result;
        challenge.completedAt = Date.now();

        // Award rewards based on result
        if (result.winner === 'local_player') {
            this.awardChallengeReward(challenge);
        }

        console.log(`🏆 Challenge completed: ${result.winner} won`);

        this.saveSocialData();
        return { success: true, challenge: challenge };
    }

    awardChallengeReward(challenge) {
        // Award currency and XP for winning challenges
        if (this.game.storeManager) {
            this.game.storeManager.addCurrency('credits', 100);
            this.game.storeManager.addCurrency('gems', 2);
        }

        // Add notification
        this.addNotification({
            type: 'challenge_win',
            title: 'Challenge Won!',
            message: `You won the ${challenge.type} challenge! +100 credits, +2 gems`,
            timestamp: Date.now()
        });
    }

    // Spectator Mode
    enterSpectatorMode(targetPlayerId = null) {
        if (this.spectatorMode) return;

        this.spectatorMode = true;

        if (targetPlayerId && this.friends.has(targetPlayerId)) {
            this.spectatedPlayer = targetPlayerId;
            console.log(`👁️ Spectating ${this.friends.get(targetPlayerId).name}`);
        } else {
            // Auto-select a player to spectate
            this.spectatedPlayer = this.findSpectatorTarget();
        }

        // Switch camera to spectator mode
        if (this.game.spectatorMode) {
            this.game.spectatorMode.activate();
        }

        return { success: true, spectating: this.spectatedPlayer };
    }

    exitSpectatorMode() {
        if (!this.spectatorMode) return;

        this.spectatorMode = false;
        this.spectatedPlayer = null;

        // Switch back to player camera
        if (this.game.spectatorMode) {
            this.game.spectatorMode.deactivate();
        }

        console.log('👁️ Exited spectator mode');
        return { success: true };
    }

    findSpectatorTarget() {
        // Find a friend who is currently racing
        for (const [friendId, friend] of this.friends) {
            if (friend.status === 'racing') {
                return friendId;
            }
        }

        // If no friends racing, find any online player
        // In a real implementation, this would query the server
        return null;
    }

    switchSpectatorTarget(newTargetId) {
        if (!this.spectatorMode) return false;

        if (this.friends.has(newTargetId)) {
            this.spectatedPlayer = newTargetId;
            console.log(`👁️ Switched spectating to ${this.friends.get(newTargetId).name}`);
            return true;
        }

        return false;
    }

    // Live Events System
    createLiveEvent(eventType, parameters = {}) {
        const event = {
            id: 'event_' + Date.now(),
            type: eventType,
            host: 'local_player',
            parameters: parameters,
            participants: ['local_player'],
            status: 'waiting',
            created: Date.now(),
            maxParticipants: parameters.maxParticipants || 8
        };

        this.liveEvents.set(event.id, event);

        // Announce event to friends
        this.announceEvent(event);

        console.log(`📢 Created live event: ${eventType}`);

        return { success: true, event: event };
    }

    joinLiveEvent(eventId) {
        const event = this.liveEvents.get(eventId);
        if (!event) {
            return { success: false, reason: 'Event not found' };
        }

        if (event.participants.length >= event.maxParticipants) {
            return { success: false, reason: 'Event full' };
        }

        if (event.participants.includes('local_player')) {
            return { success: false, reason: 'Already joined' };
        }

        event.participants.push('local_player');

        // If event is now full, start it
        if (event.participants.length >= event.maxParticipants) {
            event.status = 'starting';
            this.startLiveEvent(eventId);
        }

        console.log(`✅ Joined live event: ${event.type}`);

        return { success: true, event: event };
    }

    startLiveEvent(eventId) {
        const event = this.liveEvents.get(eventId);
        if (!event) return;

        event.status = 'active';
        event.startedAt = Date.now();

        // Start the actual race/tournament
        switch (event.type) {
            case 'race':
                this.startLiveRace(event);
                break;
            case 'tournament':
                this.startLiveTournament(event);
                break;
        }

        console.log(`🚀 Live event started: ${event.type}`);
    }

    startLiveRace(event) {
        // Start a multiplayer race with the participants
        if (this.game.networkManager) {
            this.game.networkManager.createRoom(event.parameters.track || 'default_track');
        }
    }

    startLiveTournament(event) {
        // Start a tournament with the participants
        if (this.game.tournamentManager) {
            this.game.tournamentManager.createTournament(
                event.parameters.format || 'single_elimination',
                event.participants
            );
        }
    }

    // Notification System
    addNotification(notification) {
        this.notifications.unshift(notification);

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // In a real implementation, this would trigger UI updates
        console.log(`🔔 Notification: ${notification.title}`);
    }

    markNotificationRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveSocialData();
        }
    }

    clearNotifications() {
        this.notifications = [];
        this.saveSocialData();
    }

    // Real-time Features
    initializeRealTimeFeatures() {
        // Set up WebSocket or polling for real-time social features
        // For now, we'll simulate with intervals
        this.startPresenceUpdates();
    }

    startPresenceUpdates() {
        // Update friend presence every 30 seconds
        setInterval(() => {
            this.updateFriendPresence();
        }, 30000);
    }

    updateFriendPresence() {
        // In a real implementation, this would poll the server for friend status
        // For now, simulate some friends being online
        for (const friend of this.friends.values()) {
            // Randomly update status
            if (Math.random() < 0.3) {
                const statuses = ['online', 'racing', 'in_menu', 'offline'];
                friend.status = statuses[Math.floor(Math.random() * statuses.length)];
                friend.lastSeen = Date.now();
            }
        }
    }

    startSocialEventPolling() {
        // Poll for social events every 10 seconds
        setInterval(() => {
            this.pollSocialEvents();
        }, 10000);
    }

    pollSocialEvents() {
        // In a real implementation, this would check for:
        // - New friend requests
        // - Challenge responses
        // - Live events
        // - Achievement unlocks by friends
        // - Tournament invitations

        // For now, simulate occasional events
        if (Math.random() < 0.1) { // 10% chance every 10 seconds
            this.simulateSocialEvent();
        }
    }

    simulateSocialEvent() {
        const events = [
            () => this.addNotification({
                id: 'sim_' + Date.now(),
                type: 'friend_online',
                title: 'Friend Online',
                message: 'Your friend Player123 is now online!',
                timestamp: Date.now()
            }),
            () => this.addNotification({
                id: 'sim_' + Date.now(),
                type: 'achievement',
                title: 'Friend Achievement',
                message: 'Player456 unlocked "Speed Demon" achievement!',
                timestamp: Date.now()
            }),
            () => this.addNotification({
                id: 'sim_' + Date.now(),
                type: 'tournament',
                title: 'Tournament Starting',
                message: 'A new tournament is starting in 5 minutes!',
                timestamp: Date.now()
            })
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];
        randomEvent();
    }

    // Privacy and Settings
    setPrivacyLevel(level) {
        if (['public', 'friends', 'private'].includes(level)) {
            this.playerStatus.privacy = level;
            this.saveSocialData();
            console.log(`🔒 Privacy set to: ${level}`);
            return true;
        }
        return false;
    }

    updatePlayerStatus(status) {
        Object.assign(this.playerStatus, status);
        // In a real implementation, broadcast to friends/server
    }

    // Data Management
    loadSocialData() {
        try {
            const stored = localStorage.getItem('social_hub_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.friends = new Map(data.friends || []);
                this.pendingFriendRequests = new Map(data.pendingFriendRequests || []);
                this.activeChallenges = new Map(data.activeChallenges || []);
                this.notifications = data.notifications || [];
                this.liveEvents = new Map(data.liveEvents || []);
                this.playerStatus = { ...this.playerStatus, ...data.playerStatus };
            }
        } catch (error) {
            console.error('Failed to load social data:', error);
        }
    }

    saveSocialData() {
        try {
            const data = {
                friends: Array.from(this.friends.entries()),
                pendingFriendRequests: Array.from(this.pendingFriendRequests.entries()),
                activeChallenges: Array.from(this.activeChallenges.entries()),
                notifications: this.notifications,
                liveEvents: Array.from(this.liveEvents.entries()),
                playerStatus: this.playerStatus,
                lastUpdated: Date.now()
            };
            localStorage.setItem('social_hub_data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save social data:', error);
        }
    }

    // Getters for UI
    getFriends() {
        return Array.from(this.friends.values());
    }

    getOnlineFriends() {
        return Array.from(this.friends.values()).filter(friend => friend.status !== 'offline');
    }

    getPendingRequests() {
        return Array.from(this.pendingFriendRequests.values());
    }

    getActiveChallenges() {
        return Array.from(this.activeChallenges.values());
    }

    getLiveEvents() {
        return Array.from(this.liveEvents.values());
    }

    getRecentNotifications(limit = 10) {
        return this.notifications.slice(0, limit);
    }

    getUnreadNotificationCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Social Statistics
    getSocialStats() {
        return {
            totalFriends: this.friends.size,
            onlineFriends: this.getOnlineFriends().length,
            pendingRequests: this.pendingFriendRequests.size,
            activeChallenges: this.activeChallenges.size,
            liveEvents: this.liveEvents.size,
            unreadNotifications: this.getUnreadNotificationCount(),
            privacy: this.playerStatus.privacy
        };
    }

    // Cleanup
    cleanup() {
        // Clean up expired challenges
        const now = Date.now();
        for (const [id, challenge] of this.activeChallenges) {
            if (challenge.expires < now && challenge.status === 'pending') {
                this.activeChallenges.delete(id);
            }
        }

        // Clean up old notifications (keep last 30 days)
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        this.notifications = this.notifications.filter(n => n.timestamp > thirtyDaysAgo);

        this.saveSocialData();
    }
}