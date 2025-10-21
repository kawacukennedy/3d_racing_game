export class AnalyticsManager {
    constructor() {
        this.sessionStartTime = Date.now();
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.events = [];
        this.metrics = {
            totalRaces: 0,
            totalDistance: 0,
            totalTime: 0,
            crashes: 0,
            bestLapTime: null,
            averageSpeed: 0,
            fps: [],
            memoryUsage: [],
            networkLatency: [],
            errorCount: 0,
            featureUsage: {}
        };
        this.performanceMarks = new Map();
        this.errorTracking = {
            javascript: [],
            network: [],
            game: [],
            user: []
        };

        this.loadAnalyticsData();
    }

    loadStoredData() {
        try {
            const stored = localStorage.getItem('game_analytics');
            if (stored) {
                const data = JSON.parse(stored);
                this.metrics = { ...this.metrics, ...data.metrics };
                this.events = data.events || [];
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
    }

    saveData() {
        try {
            const data = {
                metrics: this.metrics,
                events: this.events.slice(-100), // Keep last 100 events
                lastUpdated: Date.now()
            };
            localStorage.setItem('game_analytics', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }

    trackEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStartTime,
            data: data
        };

        this.events.push(event);

        // Update metrics based on event type
        switch (eventType) {
            case 'race_start':
                this.raceStartTime = Date.now();
                break;
            case 'race_end':
                if (this.raceStartTime) {
                    const raceTime = Date.now() - this.raceStartTime;
                    this.metrics.racesCompleted++;
                    this.metrics.totalPlayTime += raceTime;
                    if (data.lapTime && (!this.metrics.bestLapTime || data.lapTime < this.metrics.bestLapTime)) {
                        this.metrics.bestLapTime = data.lapTime;
                    }
                }
                break;
            case 'collision':
                this.metrics.collisions++;
                break;
            case 'customization_applied':
                this.metrics.customizationsApplied++;
                break;
            case 'distance_traveled':
                this.metrics.totalDistance += data.distance || 0;
                break;
        }

        // Auto-save periodically
        if (this.events.length % 10 === 0) {
            this.saveData();
        }
    }

    startRace() {
        this.trackEvent('race_start');
    }

    endRace(finalPosition, totalTime, bestLapTime) {
        this.trackEvent('race_end', {
            position: finalPosition,
            totalTime: totalTime,
            bestLapTime: bestLapTime
        });
    }

    trackCollision(intensity) {
        this.trackEvent('collision', { intensity });
    }

    trackCustomization() {
        this.trackEvent('customization_applied');
    }

    trackDistance(distance) {
        this.metrics.totalDistance += distance;
        this.saveAnalyticsData();
    }

    // Performance Monitoring

    startPerformanceMark(markName) {
        this.performanceMarks.set(markName, performance.now());
    }

    endPerformanceMark(markName) {
        const startTime = this.performanceMarks.get(markName);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.trackEvent('performance', 'mark_completed', {
                markName,
                duration,
                timestamp: Date.now()
            });
            this.performanceMarks.delete(markName);
            return duration;
        }
        return null;
    }

    trackFPS(fps) {
        this.metrics.fps.push({
            value: fps,
            timestamp: Date.now()
        });

        // Keep only last 1000 readings
        if (this.metrics.fps.length > 1000) {
            this.metrics.fps.shift();
        }

        // Check for performance issues
        if (fps < 30) {
            this.trackEvent('performance', 'low_fps', {
                fps,
                timestamp: Date.now()
            });
        }
    }

    trackMemoryUsage() {
        if (performance.memory) {
            const memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };

            this.metrics.memoryUsage.push(memoryInfo);

            // Keep only last 100 readings
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }

            // Check for memory issues
            const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
            if (usagePercent > 80) {
                this.trackEvent('performance', 'high_memory_usage', {
                    usagePercent,
                    usedMB: Math.round(memoryInfo.used / 1024 / 1024),
                    limitMB: Math.round(memoryInfo.limit / 1024 / 1024),
                    timestamp: Date.now()
                });
            }

            return memoryInfo;
        }
        return null;
    }

    trackNetworkLatency(latency) {
        this.metrics.networkLatency.push({
            value: latency,
            timestamp: Date.now()
        });

        // Keep only last 100 readings
        if (this.metrics.networkLatency.length > 100) {
            this.metrics.networkLatency.shift();
        }

        // Check for network issues
        if (latency > 200) {
            this.trackEvent('network', 'high_latency', {
                latency,
                timestamp: Date.now()
            });
        }
    }

    // Error Tracking

    trackError(error, context = {}) {
        const errorInfo = {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: error.message || error,
            stack: error.stack,
            type: error.name || 'UnknownError',
            context: context,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionId: this.sessionId
        };

        // Categorize error
        if (error instanceof TypeError || error instanceof ReferenceError) {
            this.errorTracking.javascript.push(errorInfo);
        } else if (context.networkRequest) {
            this.errorTracking.network.push(errorInfo);
        } else if (context.gameContext) {
            this.errorTracking.game.push(errorInfo);
        } else {
            this.errorTracking.user.push(errorInfo);
        }

        this.metrics.errorCount++;

        // Track error event
        this.trackEvent('error', 'javascript_error', {
            errorId: errorInfo.id,
            message: errorInfo.message,
            type: errorInfo.type,
            context: context,
            timestamp: errorInfo.timestamp
        });

        // Keep only last 50 errors per category
        Object.keys(this.errorTracking).forEach(category => {
            if (this.errorTracking[category].length > 50) {
                this.errorTracking[category].shift();
            }
        });

        this.saveAnalyticsData();
        return errorInfo;
    }

    trackNetworkError(url, status, responseTime, context = {}) {
        const errorInfo = {
            url,
            status,
            responseTime,
            context,
            timestamp: Date.now(),
            sessionId: this.sessionId
        };

        this.errorTracking.network.push(errorInfo);

        this.trackEvent('network', 'request_failed', {
            url,
            status,
            responseTime,
            context,
            timestamp: Date.now()
        });

        this.saveAnalyticsData();
        return errorInfo;
    }

    // Feature Usage Tracking

    trackFeatureUsage(featureName, action = 'used', metadata = {}) {
        if (!this.metrics.featureUsage[featureName]) {
            this.metrics.featureUsage[featureName] = {
                totalUses: 0,
                lastUsed: null,
                actions: {}
            };
        }

        const feature = this.metrics.featureUsage[featureName];
        feature.totalUses++;
        feature.lastUsed = Date.now();

        if (!feature.actions[action]) {
            feature.actions[action] = 0;
        }
        feature.actions[action]++;

        this.trackEvent('feature', 'usage', {
            featureName,
            action,
            metadata,
            timestamp: Date.now()
        });

        this.saveAnalyticsData();
    }

    // User Behavior Analytics

    trackUserFlow(step, metadata = {}) {
        this.trackEvent('user_flow', step, {
            metadata,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStartTime
        });
    }

    trackABTest(testName, variant, outcome = null) {
        this.trackEvent('ab_test', 'exposure', {
            testName,
            variant,
            outcome,
            timestamp: Date.now()
        });
    }

    // Performance Reports

    generatePerformanceReport() {
        const report = {
            sessionId: this.sessionId,
            sessionDuration: Date.now() - this.sessionStartTime,
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            performance: {
                averageFPS: this.metrics.fps.length > 0 ?
                    this.metrics.fps.reduce((sum, reading) => sum + reading.value, 0) / this.metrics.fps.length : 0,
                minFPS: this.metrics.fps.length > 0 ?
                    Math.min(...this.metrics.fps.map(r => r.value)) : 0,
                maxFPS: this.metrics.fps.length > 0 ?
                    Math.max(...this.metrics.fps.map(r => r.value)) : 0,
                averageMemoryUsage: this.metrics.memoryUsage.length > 0 ?
                    this.metrics.memoryUsage.reduce((sum, reading) => sum + reading.used, 0) / this.metrics.memoryUsage.length : 0,
                averageNetworkLatency: this.metrics.networkLatency.length > 0 ?
                    this.metrics.networkLatency.reduce((sum, reading) => sum + reading.value, 0) / this.metrics.networkLatency.length : 0
            },
            errors: {
                total: this.metrics.errorCount,
                byCategory: {
                    javascript: this.errorTracking.javascript.length,
                    network: this.errorTracking.network.length,
                    game: this.errorTracking.game.length,
                    user: this.errorTracking.user.length
                },
                recentErrors: [
                    ...this.errorTracking.javascript.slice(-5),
                    ...this.errorTracking.network.slice(-5),
                    ...this.errorTracking.game.slice(-5)
                ]
            },
            featureUsage: this.metrics.featureUsage
        };

        return report;
    }

    // Crash Reporting

    trackCrash(error, context = {}) {
        const crashReport = {
            id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: this.sessionId,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: {
                ...context,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: Date.now(),
                sessionDuration: Date.now() - this.sessionStartTime
            },
            systemInfo: {
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            performance: this.generatePerformanceReport()
        };

        // Store crash report
        const crashReports = JSON.parse(localStorage.getItem('crash_reports') || '[]');
        crashReports.push(crashReport);

        // Keep only last 10 crash reports
        if (crashReports.length > 10) {
            crashReports.splice(0, crashReports.length - 10);
        }

        localStorage.setItem('crash_reports', JSON.stringify(crashReports));

        // Track crash event
        this.trackEvent('crash', 'application_crash', {
            crashId: crashReport.id,
            errorMessage: error.message,
            timestamp: Date.now()
        });

        return crashReport;
    }

    // Data Export

    exportAnalyticsData() {
        const data = {
            sessionId: this.sessionId,
            exportTime: Date.now(),
            sessionDuration: Date.now() - this.sessionStartTime,
            metrics: this.metrics,
            events: this.events,
            errorTracking: this.errorTracking,
            performanceReport: this.generatePerformanceReport(),
            crashReports: JSON.parse(localStorage.getItem('crash_reports') || '[]')
        };

        return data;
    }

    // Real-time Monitoring

    startRealTimeMonitoring() {
        // Monitor FPS every second
        setInterval(() => {
            // This would be called from the render loop
            // this.trackFPS(currentFPS);
        }, 1000);

        // Monitor memory every 5 seconds
        setInterval(() => {
            this.trackMemoryUsage();
        }, 5000);

        // Auto-save analytics every minute
        setInterval(() => {
            this.saveAnalyticsData();
        }, 60000);
    }

    // Alert System

    checkPerformanceAlerts() {
        const alerts = [];

        // FPS alerts
        const recentFPS = this.metrics.fps.slice(-10);
        if (recentFPS.length >= 10) {
            const avgFPS = recentFPS.reduce((sum, reading) => sum + reading.value, 0) / recentFPS.length;
            if (avgFPS < 30) {
                alerts.push({
                    type: 'performance',
                    severity: 'high',
                    message: `Low FPS detected: ${avgFPS.toFixed(1)} average`,
                    timestamp: Date.now()
                });
            }
        }

        // Memory alerts
        const recentMemory = this.metrics.memoryUsage.slice(-5);
        if (recentMemory.length >= 5) {
            const avgMemoryUsage = recentMemory.reduce((sum, reading) => sum + (reading.used / reading.limit), 0) / recentMemory.length;
            if (avgMemoryUsage > 0.85) {
                alerts.push({
                    type: 'memory',
                    severity: 'high',
                    message: `High memory usage: ${(avgMemoryUsage * 100).toFixed(1)}%`,
                    timestamp: Date.now()
                });
            }
        }

        // Error rate alerts
        const recentErrors = this.events.filter(e =>
            e.type === 'error' &&
            e.timestamp > Date.now() - 300000 // Last 5 minutes
        ).length;

        if (recentErrors > 10) {
            alerts.push({
                type: 'errors',
                severity: 'high',
                message: `High error rate: ${recentErrors} errors in last 5 minutes`,
                timestamp: Date.now()
            });
        }

        return alerts;
    }

    getMetrics() {
        return { ...this.metrics };
    }

    getEvents(eventType = null, limit = 50) {
        let filteredEvents = this.events;
        if (eventType) {
            filteredEvents = this.events.filter(e => e.type === eventType);
        }
        return filteredEvents.slice(-limit);
    }

    getRecentEvents(limit = 5) {
        return this.getEvents(null, limit).map(event => {
            switch (event.type) {
                case 'race_started':
                    return 'Race started';
                case 'lap_completed':
                    return `Lap ${event.data.lap || 1} completed`;
                case 'collision':
                    return 'Collision detected';
                case 'customization_applied':
                    return 'Vehicle customized';
                case 'distance_traveled':
                    return `Traveled ${Math.round(event.data.distance || 0)}m`;
                case 'race_finished':
                    return 'Race finished';
                default:
                    return event.type.replace(/_/g, ' ');
            }
        });
    }

    getSessionStats() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        return {
            sessionDuration,
            eventsInSession: this.events.filter(e => e.sessionTime <= sessionDuration).length,
            averageRaceTime: this.metrics.racesCompleted > 0 ?
                this.metrics.totalPlayTime / this.metrics.racesCompleted : 0
        };
    }

    resetMetrics() {
        this.metrics = {
            totalPlayTime: 0,
            racesCompleted: 0,
            bestLapTime: null,
            totalDistance: 0,
            collisions: 0,
            customizationsApplied: 0
        };
        this.saveData();
    }

    exportData() {
        return {
            metrics: this.metrics,
            events: this.events,
            sessionStats: this.getSessionStats(),
            exportTime: Date.now()
        };
    }
}