export class SocialSharingManager {
    constructor(socialManager, analyticsManager) {
        this.socialManager = socialManager;
        this.analyticsManager = analyticsManager;
        this.shareHistory = [];
        this.shareTemplates = this.getShareTemplates();

        this.loadShareData();
    }

    loadShareData() {
        try {
            const stored = localStorage.getItem('social_sharing');
            if (stored) {
                const data = JSON.parse(stored);
                this.shareHistory = data.shareHistory || [];
            }
        } catch (error) {
            console.error('Failed to load sharing data:', error);
        }
    }

    saveShareData() {
        try {
            const data = {
                shareHistory: this.shareHistory,
                lastUpdated: Date.now()
            };
            localStorage.setItem('social_sharing', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save sharing data:', error);
        }
    }

    getShareTemplates() {
        return {
            race_win: {
                title: "🏆 Race Victory!",
                message: "I just won a race in VelocityRush3D! 🏁 Can you beat my time?",
                hashtags: ["#VelocityRush3D", "#Racing", "#Gaming"],
                image: "race_win_screenshot"
            },
            tournament_win: {
                title: "👑 Tournament Champion!",
                message: "I dominated the tournament in VelocityRush3D! Who's next? 🏆",
                hashtags: ["#VelocityRush3D", "#Tournament", "#Champion"],
                image: "tournament_win_screenshot"
            },
            new_record: {
                title: "🚀 New Record!",
                message: "Just set a new record in VelocityRush3D! Can you break it?",
                hashtags: ["#VelocityRush3D", "#Record", "#Speed"],
                image: "record_screenshot"
            },
            achievement_unlock: {
                title: "🎉 Achievement Unlocked!",
                message: "Unlocked a new achievement in VelocityRush3D! 🎮",
                hashtags: ["#VelocityRush3D", "#Achievement", "#Gaming"],
                image: "achievement_screenshot"
            },
            custom_track: {
                title: "🛣️ Custom Track Created!",
                message: "I just created an epic track in VelocityRush3D! Check it out!",
                hashtags: ["#VelocityRush3D", "#TrackCreator", "#Racing"],
                image: "track_screenshot"
            },
            vehicle_custom: {
                title: "🚗 Custom Vehicle!",
                message: "Created an awesome custom vehicle in VelocityRush3D! 🔥",
                hashtags: ["#VelocityRush3D", "#CustomCar", "#Styling"],
                image: "vehicle_screenshot"
            }
        };
    }

    // Share Race Results

    shareRaceResult(raceData, platform = 'clipboard') {
        const template = this.shareTemplates.race_win;
        const message = this.buildMessage(template, {
            time: this.formatTime(raceData.time),
            position: raceData.position,
            track: raceData.track,
            vehicle: raceData.vehicle
        });

        return this.shareContent(message, template.image, platform, 'race_result', raceData);
    }

    shareTournamentResult(tournamentData, platform = 'clipboard') {
        const template = this.shareTemplates.tournament_win;
        const message = this.buildMessage(template, {
            tournament: tournamentData.name,
            position: tournamentData.position,
            prize: tournamentData.prize || 'glory'
        });

        return this.shareContent(message, template.image, platform, 'tournament_result', tournamentData);
    }

    shareRecord(recordData, platform = 'clipboard') {
        const template = this.shareTemplates.new_record;
        const message = this.buildMessage(template, {
            record: recordData.type,
            value: recordData.value,
            track: recordData.track
        });

        return this.shareContent(message, template.image, platform, 'record', recordData);
    }

    shareAchievement(achievementData, platform = 'clipboard') {
        const template = this.shareTemplates.achievement_unlock;
        const message = this.buildMessage(template, {
            achievement: achievementData.name,
            description: achievementData.description
        });

        return this.shareContent(message, template.image, platform, 'achievement', achievementData);
    }

    shareCustomContent(contentData, contentType, platform = 'clipboard') {
        const template = this.shareTemplates[contentType === 'track' ? 'custom_track' : 'vehicle_custom'];
        const message = this.buildMessage(template, {
            name: contentData.name,
            type: contentType
        });

        return this.shareContent(message, template.image, platform, `custom_${contentType}`, contentData);
    }

    // Core Sharing Methods

    async shareContent(message, imageType, platform, contentType, metadata) {
        const shareData = {
            id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: message,
            imageType: imageType,
            platform: platform,
            contentType: contentType,
            metadata: metadata,
            timestamp: Date.now(),
            success: false
        };

        try {
            switch (platform) {
                case 'clipboard':
                    await this.shareToClipboard(message);
                    break;
                case 'twitter':
                    await this.shareToTwitter(message, imageType);
                    break;
                case 'facebook':
                    await this.shareToFacebook(message, imageType);
                    break;
                case 'discord':
                    await this.shareToDiscord(message, imageType);
                    break;
                case 'friends':
                    await this.shareToFriends(message, metadata);
                    break;
                default:
                    await this.shareToClipboard(message);
            }

            shareData.success = true;

            // Track sharing analytics
            this.analyticsManager.trackEvent('social', 'share', {
                platform: platform,
                contentType: contentType,
                success: true
            });

        } catch (error) {
            console.error('Sharing failed:', error);
            shareData.error = error.message;

            this.analyticsManager.trackEvent('social', 'share_failed', {
                platform: platform,
                contentType: contentType,
                error: error.message
            });
        }

        this.shareHistory.push(shareData);
        this.saveShareData();

        return {
            success: shareData.success,
            shareId: shareData.id,
            platform: platform
        };
    }

    buildMessage(template, variables) {
        let message = template.message;

        // Replace variables
        Object.keys(variables).forEach(key => {
            message = message.replace(`{${key}}`, variables[key]);
        });

        // Add hashtags
        if (template.hashtags && template.hashtags.length > 0) {
            message += '\n\n' + template.hashtags.join(' ');
        }

        // Add game link
        message += '\n\nPlay VelocityRush3D: https://velocityrush3d.com';

        return message;
    }

    // Platform-Specific Sharing

    async shareToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }

        // Show user feedback
        this.showNotification('Copied to clipboard!', 'success');
    }

    async shareToTwitter(message, imageType) {
        const url = 'https://velocityrush3d.com';
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;

        // Open Twitter share dialog
        window.open(twitterUrl, '_blank', 'width=600,height=400');

        // In a real implementation, you'd upload the image first
        // and include it in the tweet
    }

    async shareToFacebook(message, imageType) {
        const url = 'https://velocityrush3d.com';
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`;

        window.open(facebookUrl, '_blank', 'width=600,height=400');
    }

    async shareToDiscord(message, imageType) {
        // Discord sharing typically involves webhooks or direct messaging
        // For now, copy to clipboard with Discord formatting
        const discordMessage = `**VelocityRush3D**\n${message}`;
        await this.shareToClipboard(discordMessage);
        this.showNotification('Copied Discord-formatted message!', 'success');
    }

    async shareToFriends(message, metadata) {
        // Share with in-game friends
        const friends = this.socialManager.friends.filter(friend => friend.status === 'online');

        if (friends.length === 0) {
            this.showNotification('No online friends to share with', 'warning');
            return;
        }

        // In a real implementation, this would send to friends via the server
        // For now, just show a success message
        this.showNotification(`Shared with ${friends.length} online friends!`, 'success');

        // Track friend shares
        this.analyticsManager.trackEvent('social', 'friend_share', {
            friendCount: friends.length,
            contentType: metadata.type
        });
    }

    // Screenshot and Image Handling

    async captureScreenshot() {
        return new Promise((resolve, reject) => {
            // In a real implementation, you'd use html2canvas or similar
            // For now, return a placeholder
            setTimeout(() => {
                resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
            }, 100);
        });
    }

    async shareScreenshot(imageData, message, platform = 'clipboard') {
        const shareData = {
            id: `screenshot_${Date.now()}`,
            imageData: imageData,
            message: message,
            platform: platform,
            timestamp: Date.now()
        };

        try {
            switch (platform) {
                case 'clipboard':
                    // For images, we'd need to use the Clipboard API with blobs
                    await this.shareToClipboard(message + '\n[Screenshot attached]');
                    break;
                case 'imgur': {
                    // Upload to Imgur and share link
                    const imgurLink = await this.uploadToImgur(imageData);
                    await this.shareToClipboard(message + '\n' + imgurLink);
                    break;
                }
                default:
                    await this.shareToClipboard(message);
            }

            this.analyticsManager.trackEvent('social', 'screenshot_share', {
                platform: platform,
                hasImage: true
            });

        } catch (error) {
            console.error('Screenshot sharing failed:', error);
            this.analyticsManager.trackEvent('social', 'screenshot_share_failed', {
                platform: platform,
                error: error.message
            });
        }
    }

    async uploadToImgur(imageData) {
        // This would require an Imgur API key and actual upload
        // For now, return a placeholder
        return 'https://i.imgur.com/placeholder.png';
    }

    // Social Challenges and Competitions

    createSocialChallenge(challengeData) {
        const challenge = {
            id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            creator: challengeData.creator || 'localPlayer',
            title: challengeData.title,
            description: challengeData.description,
            type: challengeData.type, // 'race', 'time_trial', 'stunt'
            track: challengeData.track,
            vehicle: challengeData.vehicle,
            target: challengeData.target, // score, time, etc.
            reward: challengeData.reward,
            participants: [],
            leaderboard: [],
            status: 'active',
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 1 week
            createdAt: Date.now()
        };

        // Store challenge
        const challenges = JSON.parse(localStorage.getItem('social_challenges') || '[]');
        challenges.push(challenge);
        localStorage.setItem('social_challenges', JSON.stringify(challenges));

        return challenge;
    }

    joinSocialChallenge(challengeId, playerData) {
        const challenges = JSON.parse(localStorage.getItem('social_challenges') || '[]');
        const challenge = challenges.find(c => c.id === challengeId);

        if (!challenge) return { success: false, reason: 'Challenge not found' };

        if (challenge.participants.some(p => p.id === playerData.id)) {
            return { success: false, reason: 'Already participating' };
        }

        challenge.participants.push({
            id: playerData.id,
            name: playerData.name,
            joinedAt: Date.now(),
            bestScore: null
        });

        localStorage.setItem('social_challenges', JSON.stringify(challenges));

        return { success: true, challenge: challenge };
    }

    submitChallengeResult(challengeId, playerId, result) {
        const challenges = JSON.parse(localStorage.getItem('social_challenges') || '[]');
        const challenge = challenges.find(c => c.id === challengeId);

        if (!challenge) return { success: false, reason: 'Challenge not found' };

        const participant = challenge.participants.find(p => p.id === playerId);
        if (!participant) return { success: false, reason: 'Not participating in challenge' };

        // Update participant's best score
        const isBetter = this.isBetterResult(challenge.type, result, participant.bestScore);
        if (isBetter) {
            participant.bestScore = result;
            participant.lastSubmission = Date.now();

            // Update leaderboard
            this.updateChallengeLeaderboard(challenge);
        }

        localStorage.setItem('social_challenges', JSON.stringify(challenges));

        return {
            success: true,
            improved: isBetter,
            rank: this.getChallengeRank(challenge, playerId)
        };
    }

    isBetterResult(challengeType, newResult, currentBest) {
        if (!currentBest) return true;

        switch (challengeType) {
            case 'race':
            case 'time_trial':
                return newResult.time < currentBest.time;
            case 'stunt':
                return newResult.score > currentBest.score;
            default:
                return newResult.score > currentBest.score;
        }
    }

    updateChallengeLeaderboard(challenge) {
        challenge.leaderboard = challenge.participants
            .filter(p => p.bestScore)
            .sort((a, b) => {
                const type = challenge.type;
                if (type === 'race' || type === 'time_trial') {
                    return a.bestScore.time - b.bestScore.time;
                } else {
                    return b.bestScore.score - a.bestScore.score;
                }
            })
            .map((participant, index) => ({
                ...participant,
                rank: index + 1
            }));
    }

    getChallengeRank(challenge, playerId) {
        const participant = challenge.leaderboard.find(p => p.id === playerId);
        return participant ? participant.rank : null;
    }

    getActiveChallenges() {
        const challenges = JSON.parse(localStorage.getItem('social_challenges') || '[]');
        const now = Date.now();

        return challenges.filter(c =>
            c.status === 'active' &&
            c.expiresAt > now
        );
    }

    // Utility Methods

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#ff9800' : '#2196F3'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    getShareStats() {
        const stats = {
            totalShares: this.shareHistory.length,
            successfulShares: this.shareHistory.filter(s => s.success).length,
            failedShares: this.shareHistory.filter(s => !s.success).length,
            platformStats: {},
            contentStats: {}
        };

        this.shareHistory.forEach(share => {
            // Platform stats
            if (!stats.platformStats[share.platform]) {
                stats.platformStats[share.platform] = 0;
            }
            stats.platformStats[share.platform]++;

            // Content stats
            if (!stats.contentStats[share.contentType]) {
                stats.contentStats[share.contentType] = 0;
            }
            stats.contentStats[share.contentType]++;
        });

        return stats;
    }

    getRecentShares(limit = 10) {
        return this.shareHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
}