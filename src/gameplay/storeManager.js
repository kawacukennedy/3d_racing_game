export class StoreManager {
    constructor(game = null) {
        this.game = game;
        this.currency = { credits: 1000, gems: 100 }; // Starting currency
        this.inventory = new Set();
        this.storeItems = this.initializeStoreItems();
        this.loadPlayerData();
    }

    initializeStoreItems() {
        return {
            // Paint jobs
            paint_red: { id: 'paint_red', name: 'Red Paint', type: 'paint', color: 0xff0000, price: { credits: 500 }, rarity: 'common' },
            paint_blue: { id: 'paint_blue', name: 'Blue Paint', type: 'paint', color: 0x0000ff, price: { credits: 500 }, rarity: 'common' },
            paint_green: { id: 'paint_green', name: 'Green Paint', type: 'paint', color: 0x00ff00, price: { credits: 500 }, rarity: 'common' },
            paint_yellow: { id: 'paint_yellow', name: 'Yellow Paint', type: 'paint', color: 0xffff00, price: { credits: 500 }, rarity: 'common' },
            paint_purple: { id: 'paint_purple', name: 'Purple Paint', type: 'paint', color: 0x800080, price: { credits: 750 }, rarity: 'uncommon' },
            paint_orange: { id: 'paint_orange', name: 'Orange Paint', type: 'paint', color: 0xffa500, price: { credits: 750 }, rarity: 'uncommon' },
            paint_pink: { id: 'paint_pink', name: 'Pink Paint', type: 'paint', color: 0xff69b4, price: { credits: 750 }, rarity: 'uncommon' },
            paint_teal: { id: 'paint_teal', name: 'Teal Paint', type: 'paint', color: 0x008080, price: { credits: 750 }, rarity: 'uncommon' },
            paint_gold: { id: 'paint_gold', name: 'Gold Paint', type: 'paint', color: 0xffd700, price: { credits: 2000 }, rarity: 'rare' },
            paint_silver: { id: 'paint_silver', name: 'Silver Paint', type: 'paint', color: 0xc0c0c0, metallic: 0.8, price: { credits: 1500 }, rarity: 'uncommon' },
            paint_chrome: { id: 'paint_chrome', name: 'Chrome Paint', type: 'paint', color: 0xc0c0c0, metallic: 1.0, price: { gems: 50 }, rarity: 'epic' },
            paint_pearl_white: { id: 'paint_pearl_white', name: 'Pearl White', type: 'paint', color: 0xffffff, metallic: 0.3, price: { credits: 2500 }, rarity: 'rare' },
            paint_matte_black: { id: 'paint_matte_black', name: 'Matte Black', type: 'paint', color: 0x000000, roughness: 1.0, price: { credits: 1800 }, rarity: 'rare' },

            // Wheels
            wheels_sport: { id: 'wheels_sport', name: 'Sport Wheels', type: 'wheels', color: 0x000000, size: 1.1, price: { credits: 1000 }, rarity: 'uncommon' },
            wheels_gold: { id: 'wheels_gold', name: 'Gold Wheels', type: 'wheels', color: 0xffd700, size: 1.0, price: { credits: 1500 }, rarity: 'rare' },
            wheels_chrome: { id: 'wheels_chrome', name: 'Chrome Wheels', type: 'wheels', color: 0xc0c0c0, metallic: 1.0, size: 1.0, price: { credits: 2000 }, rarity: 'rare' },
            wheels_offroad: { id: 'wheels_offroad', name: 'Offroad Wheels', type: 'wheels', color: 0x8B4513, size: 1.2, price: { credits: 1200 }, rarity: 'uncommon' },
            wheels_racing: { id: 'wheels_racing', name: 'Racing Wheels', type: 'wheels', color: 0xff0000, size: 0.9, price: { credits: 1800 }, rarity: 'rare' },
            wheels_luxe: { id: 'wheels_luxe', name: 'Luxury Wheels', type: 'wheels', color: 0x000000, size: 1.0, spokes: 'multi', price: { gems: 25 }, rarity: 'epic' },

            // Decals
            decal_flames: { id: 'decal_flames', name: 'Flame Decals', type: 'decal', decalType: 'flame', price: { credits: 300 }, rarity: 'common' },
            decal_stripe: { id: 'decal_stripe', name: 'Racing Stripes', type: 'decal', decalType: 'stripe', price: { credits: 400 }, rarity: 'common' },
            decal_logo: { id: 'decal_logo', name: 'Premium Logo', type: 'decal', decalType: 'logo', price: { credits: 800 }, rarity: 'uncommon' },
            decal_skull: { id: 'decal_skull', name: 'Skull Decals', type: 'decal', decalType: 'skull', price: { credits: 600 }, rarity: 'uncommon' },
            decal_lightning: { id: 'decal_lightning', name: 'Lightning Bolts', type: 'decal', decalType: 'lightning', price: { credits: 500 }, rarity: 'uncommon' },
            decal_carbon: { id: 'decal_carbon', name: 'Carbon Fiber', type: 'decal', decalType: 'carbon', price: { credits: 900 }, rarity: 'rare' },
            decal_chrome_skull: { id: 'decal_chrome_skull', name: 'Chrome Skull', type: 'decal', decalType: 'chrome_skull', price: { gems: 15 }, rarity: 'epic' },

            // Exhaust Effects
            exhaust_standard: { id: 'exhaust_standard', name: 'Standard Exhaust', type: 'exhaust', effect: 'smoke', price: { credits: 0 }, rarity: 'common' },
            exhaust_fire: { id: 'exhaust_fire', name: 'Fire Exhaust', type: 'exhaust', effect: 'fire', price: { credits: 1500 }, rarity: 'rare' },
            exhaust_electric: { id: 'exhaust_electric', name: 'Electric Exhaust', type: 'exhaust', effect: 'electric', price: { credits: 1200 }, rarity: 'uncommon' },
            exhaust_plasma: { id: 'exhaust_plasma', name: 'Plasma Exhaust', type: 'exhaust', effect: 'plasma', price: { gems: 30 }, rarity: 'epic' },

            // Window Tints
            tint_clear: { id: 'tint_clear', name: 'Clear Windows', type: 'tint', opacity: 0.0, price: { credits: 0 }, rarity: 'common' },
            tint_light: { id: 'tint_light', name: 'Light Tint', type: 'tint', opacity: 0.3, price: { credits: 400 }, rarity: 'common' },
            tint_medium: { id: 'tint_medium', name: 'Medium Tint', type: 'tint', opacity: 0.6, price: { credits: 600 }, rarity: 'uncommon' },
            tint_dark: { id: 'tint_dark', name: 'Dark Tint', type: 'tint', opacity: 0.8, price: { credits: 800 }, rarity: 'rare' },
            tint_mirror: { id: 'tint_mirror', name: 'Mirror Tint', type: 'tint', opacity: 0.9, reflective: true, price: { gems: 20 }, rarity: 'epic' },

            // Spoilers
            spoiler_none: { id: 'spoiler_none', name: 'No Spoiler', type: 'spoiler', style: 'none', price: { credits: 0 }, rarity: 'common' },
            spoiler_small: { id: 'spoiler_small', name: 'Small Spoiler', type: 'spoiler', style: 'small', downforce: 0.1, price: { credits: 800 }, rarity: 'uncommon' },
            spoiler_large: { id: 'spoiler_large', name: 'Large Spoiler', type: 'spoiler', style: 'large', downforce: 0.2, price: { credits: 1200 }, rarity: 'rare' },
            spoiler_wing: { id: 'spoiler_wing', name: 'Wing Spoiler', type: 'spoiler', style: 'wing', downforce: 0.3, price: { gems: 25 }, rarity: 'epic' },

            // Vehicles
            vehicle_muscle: {
                id: 'vehicle_muscle',
                name: 'Muscle Car',
                type: 'vehicle',
                vehicleType: 'muscle_car',
                price: { credits: 5000 },
                rarity: 'uncommon'
            },
            vehicle_rally: {
                id: 'vehicle_rally',
                name: 'Rally Car',
                type: 'vehicle',
                vehicleType: 'rally_car',
                price: { credits: 7500 },
                rarity: 'rare'
            },
            vehicle_formula: {
                id: 'vehicle_formula',
                name: 'Formula Car',
                type: 'vehicle',
                vehicleType: 'formula',
                price: { credits: 15000, gems: 50 },
                rarity: 'epic'
            },
            vehicle_offroad: {
                id: 'vehicle_offroad',
                name: 'Offroad Vehicle',
                type: 'vehicle',
                vehicleType: 'offroad',
                price: { credits: 8000 },
                rarity: 'uncommon'
            },
            vehicle_hypercar: {
                id: 'vehicle_hypercar',
                name: 'Hypercar',
                type: 'vehicle',
                vehicleType: 'hypercar',
                price: { credits: 25000, gems: 100 },
                rarity: 'legendary'
            },

            // Special packages
            bundle_racer: {
                id: 'bundle_racer',
                name: 'Racer Bundle',
                type: 'bundle',
                items: ['paint_blue', 'wheels_sport', 'decal_stripe'],
                price: { credits: 2000 },
                rarity: 'rare'
            },
            bundle_legendary: {
                id: 'bundle_legendary',
                name: 'Legendary Bundle',
                type: 'bundle',
                items: ['paint_chrome', 'wheels_gold', 'decal_logo'],
                price: { gems: 100 },
                rarity: 'legendary'
            }
        };
    }

    loadPlayerData() {
        try {
            const stored = localStorage.getItem('store_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.currency = { ...this.currency, ...data.currency };
                this.inventory = new Set(data.inventory || []);
            }
        } catch (error) {
            console.error('Failed to load store data:', error);
        }
    }

    savePlayerData() {
        try {
            const data = {
                currency: this.currency,
                inventory: Array.from(this.inventory),
                lastUpdated: Date.now()
            };
            localStorage.setItem('store_data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save store data:', error);
        }
    }

    getCurrency() {
        return { ...this.currency };
    }

    addCurrency(type, amount) {
        if (Object.hasOwn(this.currency, type)) {
            this.currency[type] += amount;
            this.savePlayerData();
            return true;
        }
        return false;
    }

    spendCurrency(type, amount) {
        if (this.currency[type] >= amount) {
            this.currency[type] -= amount;
            this.savePlayerData();
            return true;
        }
        return false;
    }

    canAfford(itemId) {
        const item = this.storeItems[itemId];
        if (!item) return false;

        for (const [currencyType, amount] of Object.entries(item.price)) {
            if (this.currency[currencyType] < amount) {
                return false;
            }
        }
        return true;
    }

    purchaseItem(itemId) {
        const item = this.storeItems[itemId];
        if (!item) return { success: false, reason: 'Item not found' };

        if (!this.canAfford(itemId)) {
            return { success: false, reason: 'Insufficient currency' };
        }

        // Spend currency
        for (const [currencyType, amount] of Object.entries(item.price)) {
            this.spendCurrency(currencyType, amount);
        }

        // Add to inventory or unlock vehicle
        if (item.type === 'bundle') {
            // Add all items in bundle
            item.items.forEach(bundleItemId => {
                this.inventory.add(bundleItemId);
            });
        } else if (item.type === 'vehicle') {
            // Unlock vehicle (handled externally)
            // This will be checked by the UI manager
        } else {
            this.inventory.add(itemId);
        }

        this.savePlayerData();
        return { success: true, item: item };
    }

    hasItem(itemId) {
        return this.inventory.has(itemId);
    }

    getInventory() {
        return Array.from(this.inventory);
    }

    getAvailableItems() {
        return Object.values(this.storeItems).filter(item => {
            if (item.type === 'vehicle') {
                // For vehicles, check if unlocked instead of inventory
                return !this.game?.sceneManager?.vehicleConfigManager?.isUnlocked(item.vehicleType);
            }
            return !this.hasItem(item.id);
        });
    }

    getItemsByType(type) {
        return Object.values(this.storeItems).filter(item => item.type === type && !this.hasItem(item.id));
    }

    getItemDetails(itemId) {
        return this.storeItems[itemId] || null;
    }

    // Reward system
    grantRaceReward(position, raceType = 'normal') {
        let credits = 0;
        let gems = 0;

        switch (position) {
            case 1:
                credits = raceType === 'multiplayer' ? 500 : 200;
                gems = raceType === 'multiplayer' ? 5 : 1;
                break;
            case 2:
                credits = raceType === 'multiplayer' ? 300 : 150;
                gems = raceType === 'multiplayer' ? 3 : 0;
                break;
            case 3:
                credits = raceType === 'multiplayer' ? 200 : 100;
                gems = raceType === 'multiplayer' ? 2 : 0;
                break;
            default:
                credits = raceType === 'multiplayer' ? 100 : 50;
                break;
        }

        this.addCurrency('credits', credits);
        if (gems > 0) {
            this.addCurrency('gems', gems);
        }

        return { credits, gems };
    }

    // Daily login bonus
    claimDailyBonus() {
        const today = new Date().toDateString();
        const lastClaim = localStorage.getItem('last_daily_bonus');

        if (lastClaim === today) {
            return { success: false, reason: 'Already claimed today' };
        }

        localStorage.setItem('last_daily_bonus', today);
        this.addCurrency('credits', 100);
        this.addCurrency('gems', 1);

        return { success: true, credits: 100, gems: 1 };
    }
}