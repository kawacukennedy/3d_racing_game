export class UserGeneratedContentManager {
    constructor() {
        this.tracks = [];
        this.vehicles = [];
        this.decals = [];
        this.contentQueue = [];
        this.moderationQueue = [];
        this.featuredContent = {
            tracks: [],
            vehicles: [],
            decals: []
        };

        this.loadContent();
    }

    loadContent() {
        try {
            const stored = localStorage.getItem('ugc_content');
            if (stored) {
                const data = JSON.parse(stored);
                this.tracks = data.tracks || [];
                this.vehicles = data.vehicles || [];
                this.decals = data.decals || [];
                this.featuredContent = data.featuredContent || this.featuredContent;
            }
        } catch (error) {
            console.error('Failed to load UGC content:', error);
        }
    }

    saveContent() {
        try {
            const data = {
                tracks: this.tracks,
                vehicles: this.vehicles,
                decals: this.decals,
                featuredContent: this.featuredContent,
                lastUpdated: Date.now()
            };
            localStorage.setItem('ugc_content', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save UGC content:', error);
        }
    }

    // Track Creation and Management

    createTrack(trackData) {
        const track = {
            id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: trackData.name,
            description: trackData.description,
            creator: trackData.creator || 'Anonymous',
            creatorId: trackData.creatorId || 'localPlayer',
            segments: trackData.segments,
            difficulty: trackData.difficulty || 0.5,
            length: trackData.length,
            thumbnail: trackData.thumbnail,
            tags: trackData.tags || [],
            rating: 0,
            ratings: [],
            downloads: 0,
            plays: 0,
            status: 'pending', // pending, approved, rejected, featured
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
        };

        this.tracks.push(track);
        this.contentQueue.push({
            type: 'track',
            content: track,
            submittedAt: Date.now()
        });

        this.saveContent();
        return track;
    }

    updateTrack(trackId, updates) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return { success: false, reason: 'Track not found' };

        // Only allow creator or admin to update
        if (track.creatorId !== 'localPlayer' && !updates.adminOverride) {
            return { success: false, reason: 'Permission denied' };
        }

        Object.assign(track, updates, { updatedAt: Date.now(), version: track.version + 1 });
        this.saveContent();

        return { success: true, track: track };
    }

    deleteTrack(trackId) {
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index === -1) return { success: false, reason: 'Track not found' };

        const track = this.tracks[index];

        // Only allow creator or admin to delete
        if (track.creatorId !== 'localPlayer') {
            return { success: false, reason: 'Permission denied' };
        }

        this.tracks.splice(index, 1);
        this.saveContent();

        return { success: true };
    }

    // Vehicle Customization Sharing

    shareVehicleCustomization(customizationData) {
        const vehicle = {
            id: `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: customizationData.name,
            description: customizationData.description,
            creator: customizationData.creator || 'Anonymous',
            creatorId: customizationData.creatorId || 'localPlayer',
            baseVehicle: customizationData.baseVehicle,
            customization: customizationData.customization,
            thumbnail: customizationData.thumbnail,
            tags: customizationData.tags || [],
            rating: 0,
            ratings: [],
            downloads: 0,
            uses: 0,
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.vehicles.push(vehicle);
        this.contentQueue.push({
            type: 'vehicle',
            content: vehicle,
            submittedAt: Date.now()
        });

        this.saveContent();
        return vehicle;
    }

    // Decal Creation

    createDecal(decalData) {
        const decal = {
            id: `decal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: decalData.name,
            description: decalData.description,
            creator: decalData.creator || 'Anonymous',
            creatorId: decalData.creatorId || 'localPlayer',
            imageData: decalData.imageData,
            category: decalData.category || 'custom',
            tags: decalData.tags || [],
            rating: 0,
            ratings: [],
            downloads: 0,
            uses: 0,
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.decals.push(decal);
        this.contentQueue.push({
            type: 'decal',
            content: decal,
            submittedAt: Date.now()
        });

        this.saveContent();
        return decal;
    }

    // Content Discovery and Search

    searchContent(type, query, filters = {}) {
        let content = [];

        switch (type) {
            case 'tracks':
                content = this.tracks;
                break;
            case 'vehicles':
                content = this.vehicles;
                break;
            case 'decals':
                content = this.decals;
                break;
            default:
                content = [...this.tracks, ...this.vehicles, ...this.decals];
        }

        // Apply search query
        if (query) {
            const queryLower = query.toLowerCase();
            content = content.filter(item =>
                item.name.toLowerCase().includes(queryLower) ||
                item.description.toLowerCase().includes(queryLower) ||
                item.tags.some(tag => tag.toLowerCase().includes(queryLower))
            );
        }

        // Apply filters
        if (filters.creator) {
            content = content.filter(item => item.creatorId === filters.creator);
        }

        if (filters.rating && filters.rating > 0) {
            content = content.filter(item => item.rating >= filters.rating);
        }

        if (filters.status) {
            content = content.filter(item => item.status === filters.status);
        }

        if (filters.tags && filters.tags.length > 0) {
            content = content.filter(item =>
                filters.tags.some(tag => item.tags.includes(tag))
            );
        }

        // Sort by relevance/popularity
        content.sort((a, b) => {
            // Featured content first
            if (a.status === 'featured' && b.status !== 'featured') return -1;
            if (b.status === 'featured' && a.status !== 'featured') return 1;

            // Then by rating
            if (b.rating !== a.rating) return b.rating - a.rating;

            // Then by downloads/uses
            const aPopularity = (a.downloads || 0) + (a.uses || 0) + (a.plays || 0);
            const bPopularity = (b.downloads || 0) + (b.uses || 0) + (b.plays || 0);
            return bPopularity - aPopularity;
        });

        return content;
    }

    getFeaturedContent(type = null) {
        if (type) {
            return this.featuredContent[type] || [];
        }

        return {
            tracks: this.featuredContent.tracks,
            vehicles: this.featuredContent.vehicles,
            decals: this.featuredContent.decals
        };
    }

    getTrendingContent(limit = 10) {
        const allContent = [...this.tracks, ...this.vehicles, ...this.decals];

        // Calculate trending score based on recent activity
        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

        return allContent
            .filter(item => item.createdAt > weekAgo)
            .map(item => ({
                ...item,
                trendingScore: (item.downloads || 0) + (item.uses || 0) + (item.plays || 0) +
                              (item.ratings.length * 2) + (item.rating * 5)
            }))
            .sort((a, b) => b.trendingScore - a.trendingScore)
            .slice(0, limit);
    }

    // Content Rating and Feedback

    rateContent(contentId, rating, userId = 'localPlayer') {
        const content = this.findContentById(contentId);
        if (!content) return { success: false, reason: 'Content not found' };

        // Remove existing rating from this user
        content.ratings = content.ratings.filter(r => r.userId !== userId);

        // Add new rating
        content.ratings.push({
            userId: userId,
            rating: Math.max(1, Math.min(5, rating)), // 1-5 stars
            timestamp: Date.now()
        });

        // Recalculate average rating
        content.rating = content.ratings.reduce((sum, r) => sum + r.rating, 0) / content.ratings.length;

        this.saveContent();
        return { success: true, newRating: content.rating };
    }

    addContentReview(contentId, reviewData) {
        const content = this.findContentById(contentId);
        if (!content) return { success: false, reason: 'Content not found' };

        if (!content.reviews) content.reviews = [];

        const review = {
            id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: reviewData.userId || 'localPlayer',
            username: reviewData.username || 'Anonymous',
            rating: reviewData.rating,
            title: reviewData.title,
            content: reviewData.content,
            helpful: 0,
            notHelpful: 0,
            timestamp: Date.now()
        };

        content.reviews.push(review);
        this.saveContent();

        return { success: true, review: review };
    }

    // Content Moderation

    submitForModeration(contentId) {
        const content = this.findContentById(contentId);
        if (!content) return { success: false, reason: 'Content not found' };

        if (content.status !== 'pending') {
            return { success: false, reason: 'Content already moderated' };
        }

        this.moderationQueue.push({
            contentId: contentId,
            type: this.getContentType(content),
            submittedAt: Date.now(),
            priority: content.creatorId === 'localPlayer' ? 'high' : 'normal'
        });

        return { success: true };
    }

    moderateContent(contentId, action, moderatorNotes = '') {
        const content = this.findContentById(contentId);
        if (!content) return { success: false, reason: 'Content not found' };

        content.status = action; // 'approved', 'rejected', 'featured'
        content.moderatedAt = Date.now();
        content.moderatorNotes = moderatorNotes;

        // Remove from moderation queue
        this.moderationQueue = this.moderationQueue.filter(item => item.contentId !== contentId);

        // Add to featured if approved as featured
        if (action === 'featured') {
            const type = this.getContentType(content);
            if (!this.featuredContent[type].find(item => item.id === contentId)) {
                this.featuredContent[type].push(content);
            }
        }

        this.saveContent();
        return { success: true, content: content };
    }

    getModerationQueue() {
        return this.moderationQueue.map(item => ({
            ...item,
            content: this.findContentById(item.contentId)
        })).filter(item => item.content);
    }

    // Content Usage Tracking

    trackContentUsage(contentId, action) {
        const content = this.findContentById(contentId);
        if (!content) return;

        switch (action) {
            case 'download':
                content.downloads = (content.downloads || 0) + 1;
                break;
            case 'use':
                content.uses = (content.uses || 0) + 1;
                break;
            case 'play':
                content.plays = (content.plays || 0) + 1;
                break;
        }

        this.saveContent();
    }

    // Utility Methods

    findContentById(contentId) {
        return this.tracks.find(t => t.id === contentId) ||
               this.vehicles.find(v => v.id === contentId) ||
               this.decals.find(d => d.id === contentId);
    }

    getContentType(content) {
        if (this.tracks.includes(content)) return 'tracks';
        if (this.vehicles.includes(content)) return 'vehicles';
        if (this.decals.includes(content)) return 'decals';
        return 'unknown';
    }

    getContentStats() {
        return {
            tracks: {
                total: this.tracks.length,
                approved: this.tracks.filter(t => t.status === 'approved').length,
                featured: this.tracks.filter(t => t.status === 'featured').length,
                pending: this.tracks.filter(t => t.status === 'pending').length
            },
            vehicles: {
                total: this.vehicles.length,
                approved: this.vehicles.filter(v => v.status === 'approved').length,
                featured: this.vehicles.filter(v => v.status === 'featured').length,
                pending: this.vehicles.filter(v => v.status === 'pending').length
            },
            decals: {
                total: this.decals.length,
                approved: this.decals.filter(d => d.status === 'approved').length,
                featured: this.decals.filter(d => d.status === 'featured').length,
                pending: this.decals.filter(d => d.status === 'pending').length
            },
            moderationQueue: this.moderationQueue.length
        };
    }

    // Export/Import Content

    exportContent(contentId) {
        const content = this.findContentById(contentId);
        if (!content) return null;

        return {
            ...content,
            exportedAt: Date.now(),
            exportVersion: '1.0'
        };
    }

    importContent(contentData) {
        try {
            // Validate content data
            if (!contentData.id || !contentData.name) {
                return { success: false, reason: 'Invalid content data' };
            }

            // Check for duplicates
            if (this.findContentById(contentData.id)) {
                return { success: false, reason: 'Content already exists' };
            }

            // Add to appropriate collection
            const type = contentData.type || this.detectContentType(contentData);
            switch (type) {
                case 'track':
                    this.tracks.push(contentData);
                    break;
                case 'vehicle':
                    this.vehicles.push(contentData);
                    break;
                case 'decal':
                    this.decals.push(contentData);
                    break;
                default:
                    return { success: false, reason: 'Unknown content type' };
            }

            this.saveContent();
            return { success: true, content: contentData };
        } catch (error) {
            return { success: false, reason: 'Import failed: ' + error.message };
        }
    }

    detectContentType(contentData) {
        if (contentData.segments) return 'track';
        if (contentData.customization) return 'vehicle';
        if (contentData.imageData) return 'decal';
        return 'unknown';
    }
}