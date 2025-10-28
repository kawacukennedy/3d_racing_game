export class CloudSaveManager {
    constructor() {
        this.isLoggedIn = false;
        this.userId = null;
        this.lastSyncTime = null;
        this.syncInterval = 5 * 60 * 1000; // 5 minutes
        this.autoSyncEnabled = true;
        this.conflictResolution = 'server_wins'; // 'server_wins', 'client_wins', 'manual'
    }

    // Authentication with real backend
    async login(username, password) {
        try {
            const response = await fetch('/api/cloud/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                this.userId = data.userId;
                this.isLoggedIn = true;
                localStorage.setItem('cloud_user_id', this.userId);
                console.log(`Logged in as ${username}`);
                return { success: true, userId: this.userId };
            } else {
                return { success: false, reason: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, reason: 'Network error' };
        }
    }

    logout() {
        this.isLoggedIn = false;
        this.userId = null;
        localStorage.removeItem('cloud_user_id');
        console.log('Logged out');
    }

    autoLogin() {
        const savedUserId = localStorage.getItem('cloud_user_id');
        if (savedUserId) {
            this.userId = savedUserId;
            this.isLoggedIn = true;
            console.log('Auto-logged in');
            return true;
        }
        return false;
    }

    // Data synchronization
    async syncData(game) {
        if (!this.isLoggedIn || !this.userId) {
            return { success: false, reason: 'Not logged in' };
        }

        try {
            const localData = this.getLocalData(game);
            const cloudData = this.getCloudData();

            const mergedData = this.resolveConflicts(localData, cloudData, localData);

            // Save to "cloud" (simulated)
            this.saveCloudData(mergedData);
            this.saveLocalData(mergedData);

            // Apply data to game managers
            this.applyCloudDataToGame(game, mergedData);

            this.lastSyncTime = Date.now();
            console.log('Data synced successfully');

            return { success: true, data: mergedData };
        } catch (error) {
            console.error('Sync failed:', error);
            return { success: false, reason: 'Sync failed' };
        }
    }

    getLocalData(game) {
        void(game); // Parameter kept for future use
        const data = {};
        // Collect data from various managers
        try {
            // Vehicle customization
            const customization = localStorage.getItem('vehicle_customization_default');
            if (customization) data.vehicleCustomization = JSON.parse(customization);

            // Store data (currency and inventory)
            const store = localStorage.getItem('store_data');
            if (store) data.storeData = JSON.parse(store);

            // Leaderboard data
            const leaderboard = localStorage.getItem('leaderboard_data');
            if (leaderboard) data.leaderboardData = JSON.parse(leaderboard);

            // Analytics data
            const analytics = localStorage.getItem('game_analytics');
            if (analytics) data.analyticsData = JSON.parse(analytics);

            // Vehicle unlocks
            const unlocks = localStorage.getItem('unlocked_vehicles');
            if (unlocks) data.unlockedVehicles = JSON.parse(unlocks);

            // Current vehicle selection
            const currentVehicle = localStorage.getItem('current_vehicle_type');
            if (currentVehicle) data.currentVehicleType = currentVehicle;

            // Accessibility settings
            const accessibility = localStorage.getItem('accessibility_settings');
            if (accessibility) data.accessibilitySettings = JSON.parse(accessibility);

            // Ranking data
            const ranking = localStorage.getItem('ranking_data');
            if (ranking) data.rankingData = JSON.parse(ranking);

            data.lastModified = Date.now();
        } catch (error) {
            console.error('Failed to get local data:', error);
        }
        return data;
    }

    async getCloudData() {
        try {
            const response = await fetch(`/api/cloud/load/${this.userId}`);
            if (response.status === 404) {
                return {}; // No data found
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get cloud data:', error);
            return {};
        }
    }

    async saveCloudData(data) {
        try {
            const response = await fetch('/api/cloud/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    gameData: {
                        ...data,
                        syncedAt: Date.now(),
                        version: '1.0'
                    }
                })
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Failed to save cloud data:', error);
            return false;
        }
    }

    saveLocalData(data) {
        // Update local storage with synced data
        try {
            if (data.vehicleCustomization) {
                localStorage.setItem('vehicle_customization_default', JSON.stringify(data.vehicleCustomization));
            }
            if (data.storeData) {
                localStorage.setItem('store_data', JSON.stringify(data.storeData));
            }
            if (data.leaderboardData) {
                localStorage.setItem('leaderboard_data', JSON.stringify(data.leaderboardData));
            }
            if (data.analyticsData) {
                localStorage.setItem('game_analytics', JSON.stringify(data.analyticsData));
            }
            if (data.unlockedVehicles) {
                localStorage.setItem('unlocked_vehicles', JSON.stringify(data.unlockedVehicles));
            }
            if (data.currentVehicleType) {
                localStorage.setItem('current_vehicle_type', data.currentVehicleType);
            }
            if (data.accessibilitySettings) {
                localStorage.setItem('accessibility_settings', JSON.stringify(data.accessibilitySettings));
            }
            if (data.rankingData) {
                localStorage.setItem('ranking_data', JSON.stringify(data.rankingData));
            }
        } catch (error) {
            console.error('Failed to save local data:', error);
        }
    }

    applyCloudDataToGame(game, data) {
        try {
            // Apply vehicle unlocks
            if (data.unlockedVehicles && game.sceneManager?.vehicleConfigManager) {
                data.unlockedVehicles.forEach(vehicleType => {
                    game.sceneManager.vehicleConfigManager.unlockVehicle(vehicleType);
                });
            }

            // Apply current vehicle selection
            if (data.currentVehicleType && game.sceneManager) {
                game.sceneManager.currentVehicleType = data.currentVehicleType;
            }

            // Apply accessibility settings
            if (data.accessibilitySettings && game.accessibilityManager) {
                game.accessibilityManager.settings = { ...game.accessibilityManager.settings, ...data.accessibilitySettings };
                game.accessibilityManager.applySettings();
            }

            // Apply store data
            if (data.storeData && game.storeManager) {
                if (data.storeData.currency) {
                    game.storeManager.currency = { ...game.storeManager.currency, ...data.storeData.currency };
                }
                if (data.storeData.inventory) {
                    game.storeManager.inventory = new Set([...game.storeManager.inventory, ...data.storeData.inventory]);
                }
            }

            console.log('Cloud data applied to game');
        } catch (error) {
            console.error('Failed to apply cloud data to game:', error);
        }
    }

    resolveConflicts(localData, cloudData, currentData) {
        if (!cloudData || Object.keys(cloudData).length === 0) {
            return { ...localData, ...currentData };
        }

        const localTime = localData.lastModified || 0;
        const cloudTime = cloudData.syncedAt || 0;

        switch (this.conflictResolution) {
            case 'server_wins':
                return cloudTime >= localTime ? cloudData : { ...cloudData, ...currentData };
            case 'client_wins':
                return localTime >= cloudTime ? { ...localData, ...currentData } : currentData;
            case 'manual':
                // For now, prefer newer data
                return cloudTime >= localTime ? cloudData : { ...localData, ...currentData };
            default:
                return { ...localData, ...currentData };
        }
    }

    // Auto-sync functionality
    startAutoSync(gameInstance) {
        if (!this.autoSyncEnabled) return;

        setInterval(() => {
            if (this.isLoggedIn && Date.now() - (this.lastSyncTime || 0) > this.syncInterval) {
                this.syncData(this.collectGameData(gameInstance));
            }
        }, this.syncInterval);
    }

    collectGameData(gameInstance) {
        // Collect current game state
        return {
            vehicleCustomization: gameInstance.vehicleCustomization.getCurrentCustomization(),
            storeData: {
                currency: gameInstance.storeManager.getCurrency(),
                inventory: gameInstance.storeManager.getInventory()
            },
            leaderboardData: {
                localLeaderboard: gameInstance.leaderboardManager.localLeaderboard,
                friendsLeaderboard: gameInstance.leaderboardManager.friendsLeaderboard
            },
            analyticsData: gameInstance.analyticsManager.exportData(),
            lastModified: Date.now()
        };
    }

    // Settings
    setAutoSync(enabled) {
        this.autoSyncEnabled = enabled;
    }

    setConflictResolution(mode) {
        this.conflictResolution = mode;
    }

    getSyncStatus() {
        return {
            isLoggedIn: this.isLoggedIn,
            userId: this.userId,
            lastSyncTime: this.lastSyncTime,
            autoSyncEnabled: this.autoSyncEnabled
        };
    }
}