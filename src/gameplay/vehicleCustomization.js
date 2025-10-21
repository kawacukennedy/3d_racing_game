export class VehicleCustomization {
    constructor() {
        this.customizations = {
            paint: { color: 0xff0000, metallic: 0.0, roughness: 0.8 },
            decals: [],
            wheels: { color: 0x333333, size: 1.0, spokes: 'standard' },
            spoilers: null,
            neon: { color: 0x00ff00, intensity: 0.0 },
            exhaust: { effect: 'smoke' },
            tint: { opacity: 0.0, reflective: false }
        };
        this.presets = this.loadPresets();
    }

    loadPresets() {
        return {
            default: {
                paint: { color: 0xff0000, metallic: 0.0, roughness: 0.8 },
                decals: [],
                wheels: { color: 0x333333, size: 1.0, spokes: 'standard' },
                spoilers: null,
                neon: { color: 0x00ff00, intensity: 0.0 },
                exhaust: { effect: 'smoke' },
                tint: { opacity: 0.0, reflective: false }
            },
            sport: {
                paint: { color: 0x0000ff, metallic: 0.3, roughness: 0.4 },
                decals: ['stripe'],
                wheels: { color: 0x000000, size: 1.1, spokes: 'standard' },
                spoilers: 'small',
                neon: { color: 0xff0000, intensity: 0.5 },
                exhaust: { effect: 'fire' },
                tint: { opacity: 0.1, reflective: false }
            },
            luxury: {
                paint: { color: 0xffffff, metallic: 0.8, roughness: 0.2 },
                decals: ['logo'],
                wheels: { color: 0xc0c0c0, size: 1.0, spokes: 'multi' },
                spoilers: null,
                neon: { color: 0x0000ff, intensity: 0.3 },
                exhaust: { effect: 'smoke' },
                tint: { opacity: 0.6, reflective: true }
            },
            offroad: {
                paint: { color: 0x8B4513, metallic: 0.0, roughness: 0.9 },
                decals: ['mud'],
                wheels: { color: 0x654321, size: 1.2, spokes: 'standard' },
                spoilers: null,
                neon: { color: 0xffa500, intensity: 0.2 },
                exhaust: { effect: 'smoke' },
                tint: { opacity: 0.0, reflective: false }
            }
        };
    }

    applyCustomization(vehicleMesh, customization = null, baseColor = null) {
        if (!vehicleMesh) return;

        const config = customization || this.customizations;

        // Apply paint customization
        if (config.paint) {
            const material = vehicleMesh.material;
            if (material) {
                // Use custom paint color, or base vehicle color if no custom paint
                const paintColor = config.paint.color || baseColor || 0xff0000;
                material.color.setHex(paintColor);
            }
        }

        // Apply paint
        if (vehicleMesh.material) {
            vehicleMesh.material.color.setHex(config.paint.color);
            if (vehicleMesh.material.metalness !== undefined) {
                vehicleMesh.material.metalness = config.paint.metallic;
                vehicleMesh.material.roughness = config.paint.roughness;
            }
        }

        // Apply neon underglow (simplified)
        if (config.neon.intensity > 0) {
            // Add emissive glow to bottom of vehicle
            if (vehicleMesh.material.emissive) {
                vehicleMesh.material.emissive.setHex(config.neon.color);
                vehicleMesh.material.emissiveIntensity = config.neon.intensity;
            }
        }

        // Store current customization
        this.customizations = { ...config };
    }

    setPaint(color, metallic = 0.0, roughness = 0.8) {
        this.customizations.paint = { color, metallic, roughness };
    }

    addDecal(decalType) {
        if (!this.customizations.decals.includes(decalType)) {
            this.customizations.decals.push(decalType);
        }
    }

    removeDecal(decalType) {
        this.customizations.decals = this.customizations.decals.filter(d => d !== decalType);
    }

    setWheels(color, size = 1.0) {
        this.customizations.wheels = { color, size };
    }

    setSpoiler(spoilerType) {
        this.customizations.spoilers = spoilerType;
    }

    setNeon(color, intensity) {
        this.customizations.neon = { color, intensity };
    }

    loadPreset(presetName) {
        if (this.presets[presetName]) {
            this.customizations = { ...this.presets[presetName] };
            return true;
        }
        return false;
    }

    saveCustomization(slot = 'default') {
        try {
            const saved = JSON.stringify(this.customizations);
            localStorage.setItem(`vehicle_customization_${slot}`, saved);
            return true;
        } catch (error) {
            console.error('Failed to save customization:', error);
            return false;
        }
    }

    loadCustomization(slot = 'default') {
        try {
            const saved = localStorage.getItem(`vehicle_customization_${slot}`);
            if (saved) {
                this.customizations = JSON.parse(saved);
                return true;
            }
        } catch (error) {
            console.error('Failed to load customization:', error);
        }
        return false;
    }

    getAvailableColors() {
        return [
            // Basic Colors
            { name: 'Red', value: 0xff0000, category: 'basic' },
            { name: 'Blue', value: 0x0000ff, category: 'basic' },
            { name: 'Green', value: 0x00ff00, category: 'basic' },
            { name: 'Yellow', value: 0xffff00, category: 'basic' },
            { name: 'Purple', value: 0xff00ff, category: 'basic' },
            { name: 'Orange', value: 0xffa500, category: 'basic' },
            { name: 'White', value: 0xffffff, category: 'basic' },
            { name: 'Black', value: 0x000000, category: 'basic' },
            { name: 'Gray', value: 0x808080, category: 'basic' },
            { name: 'Pink', value: 0xffc0cb, category: 'basic' },

            // Metallic Colors
            { name: 'Silver Metallic', value: 0xc0c0c0, category: 'metallic', metallic: 0.8, roughness: 0.2 },
            { name: 'Gold Metallic', value: 0xffd700, category: 'metallic', metallic: 0.9, roughness: 0.1 },
            { name: 'Chrome', value: 0xffffff, category: 'metallic', metallic: 1.0, roughness: 0.0 },
            { name: 'Gunmetal', value: 0x2c3539, category: 'metallic', metallic: 0.7, roughness: 0.3 },
            { name: 'Rose Gold', value: 0xe0b8a8, category: 'metallic', metallic: 0.8, roughness: 0.2 },

            // Matte Colors
            { name: 'Matte Black', value: 0x1a1a1a, category: 'matte', metallic: 0.0, roughness: 0.9 },
            { name: 'Matte White', value: 0xf5f5f5, category: 'matte', metallic: 0.0, roughness: 0.9 },
            { name: 'Matte Gray', value: 0x696969, category: 'matte', metallic: 0.0, roughness: 0.9 },
            { name: 'Matte Blue', value: 0x000080, category: 'matte', metallic: 0.0, roughness: 0.9 },
            { name: 'Matte Red', value: 0x8b0000, category: 'matte', metallic: 0.0, roughness: 0.9 },

            // Special Colors
            { name: 'Pearl White', value: 0xf8f8ff, category: 'special', metallic: 0.3, roughness: 0.1 },
            { name: 'Candy Apple Red', value: 0xff0800, category: 'special', metallic: 0.2, roughness: 0.3 },
            { name: 'Electric Blue', value: 0x1e90ff, category: 'special', metallic: 0.4, roughness: 0.2 },
            { name: 'Neon Green', value: 0x39ff14, category: 'special', metallic: 0.1, roughness: 0.4 },
            { name: 'Hot Pink', value: 0xff1493, category: 'special', metallic: 0.2, roughness: 0.3 },

            // Racing Colors
            { name: 'Racing Green', value: 0x004225, category: 'racing' },
            { name: 'Racing Blue', value: 0x002366, category: 'racing' },
            { name: 'Racing Yellow', value: 0xffd300, category: 'racing' },
            { name: 'Safety Orange', value: 0xff4500, category: 'racing' },
            { name: 'Checkered Flag', value: 0x000000, category: 'racing', pattern: 'checkered' }
        ];
    }

    getAvailableDecals() {
        return [
            // Racing Decals
            { name: 'Racing Stripe', type: 'stripe', category: 'racing' },
            { name: 'Flame Pattern', type: 'flame', category: 'racing' },
            { name: 'Checkered Flag', type: 'checkered', category: 'racing' },
            { name: 'Speed Lines', type: 'speed', category: 'racing' },
            { name: 'Victory Wreath', type: 'wreath', category: 'racing' },

            // Brand Logos
            { name: 'VelocityRush Logo', type: 'logo', category: 'brand' },
            { name: 'Sponsor Logo', type: 'sponsor', category: 'brand' },
            { name: 'Manufacturer Badge', type: 'badge', category: 'brand' },

            // Numbers & Text
            { name: 'Race Number', type: 'number', category: 'text' },
            { name: 'Custom Text', type: 'text', category: 'text' },
            { name: 'Championship Badge', type: 'champion', category: 'text' },

            // Environmental
            { name: 'Mud Splatter', type: 'mud', category: 'environment' },
            { name: 'Dirt Tracks', type: 'dirt', category: 'environment' },
            { name: 'Snow Flakes', type: 'snow', category: 'environment' },

            // Style
            { name: 'Carbon Fiber', type: 'carbon', category: 'style' },
            { name: 'Tribal Pattern', type: 'tribal', category: 'style' },
            { name: 'Geometric', type: 'geometric', category: 'style' },
            { name: 'Abstract Art', type: 'abstract', category: 'style' },
            { name: 'Retro Waves', type: 'retro', category: 'style' },

            // Seasonal
            { name: 'Halloween Theme', type: 'halloween', category: 'seasonal' },
            { name: 'Christmas Lights', type: 'christmas', category: 'seasonal' },
            { name: 'Summer Vibes', type: 'summer', category: 'seasonal' },
            { name: 'Winter Frost', type: 'winter', category: 'seasonal' }
        ];
    }

    getAvailableWheels() {
        return [
            { name: 'Standard Alloy', type: 'standard', color: 0xc0c0c0, size: 1.0, price: 0 },
            { name: 'Sport Alloy', type: 'sport', color: 0x000000, size: 1.1, price: 500 },
            { name: 'Chrome Rims', type: 'chrome', color: 0xffffff, size: 1.0, price: 1000 },
            { name: 'Black Chrome', type: 'black_chrome', color: 0x1a1a1a, size: 1.0, price: 1200 },
            { name: 'Gold Rims', type: 'gold', color: 0xffd700, size: 1.1, price: 1500 },
            { name: 'Carbon Fiber', type: 'carbon', color: 0x333333, size: 1.0, price: 2000 },
            { name: 'Forged Aluminum', type: 'forged', color: 0x708090, size: 1.2, price: 2500 },
            { name: 'Diamond Cut', type: 'diamond', color: 0xc0c0c0, size: 1.1, price: 1800 },
            { name: 'Spoke Wheels', type: 'spoke', color: 0x654321, size: 1.0, price: 800 },
            { name: 'Offroad Tires', type: 'offroad', color: 0x8b4513, size: 1.3, price: 1200 },
            { name: 'Racing Slicks', type: 'racing', color: 0x000000, size: 1.0, price: 3000 },
            { name: 'Neon Rims', type: 'neon', color: 0x00ff00, size: 1.1, price: 2200 }
        ];
    }

    getAvailableSpoilers() {
        return [
            { name: 'No Spoiler', type: null, price: 0 },
            { name: 'Small Lip Spoiler', type: 'lip', price: 500 },
            { name: 'Ducktail Spoiler', type: 'ducktail', price: 1000 },
            { name: 'Wing Spoiler', type: 'wing', price: 1500 },
            { name: 'GT Wing', type: 'gt_wing', price: 2000 },
            { name: 'Carbon Fiber Wing', type: 'carbon_wing', price: 3000 },
            { name: 'Adjustable Wing', type: 'adjustable', price: 4000 },
            { name: 'F1 Style Wing', type: 'f1_wing', price: 5000 }
        ];
    }

    getAvailableExhausts() {
        return [
            { name: 'Standard Exhaust', type: 'standard', effect: 'smoke', price: 0 },
            { name: 'Sport Exhaust', type: 'sport', effect: 'smoke', price: 800 },
            { name: 'Racing Exhaust', type: 'racing', effect: 'fire', price: 1500 },
            { name: 'Turbo Exhaust', type: 'turbo', effect: 'fire', price: 2200 },
            { name: 'Electric Sound', type: 'electric', effect: 'sparks', price: 1000 },
            { name: 'Flame Thrower', type: 'flame', effect: 'flames', price: 3000 },
            { name: 'Nitrous Boost', type: 'nitrous', effect: 'boost', price: 4000 }
        ];
    }

    getAvailableTints() {
        return [
            { name: 'No Tint', opacity: 0.0, reflective: false, price: 0 },
            { name: 'Light Tint', opacity: 0.1, reflective: false, price: 200 },
            { name: 'Medium Tint', opacity: 0.3, reflective: false, price: 400 },
            { name: 'Dark Tint', opacity: 0.6, reflective: false, price: 600 },
            { name: 'Limo Tint', opacity: 0.8, reflective: false, price: 800 },
            { name: 'Reflective Tint', opacity: 0.3, reflective: true, price: 1000 },
            { name: 'Privacy Glass', opacity: 0.9, reflective: true, price: 1200 }
        ];
    }

    getAvailableNeonColors() {
        return [
            { name: 'No Neon', color: 0x000000, intensity: 0.0, price: 0 },
            { name: 'Blue Neon', color: 0x0080ff, intensity: 0.5, price: 500 },
            { name: 'Red Neon', color: 0xff0040, intensity: 0.5, price: 500 },
            { name: 'Green Neon', color: 0x00ff40, intensity: 0.5, price: 500 },
            { name: 'Purple Neon', color: 0x8000ff, intensity: 0.5, price: 500 },
            { name: 'White Neon', color: 0xffffff, intensity: 0.3, price: 600 },
            { name: 'Rainbow Neon', color: 0xff0080, intensity: 0.6, price: 800 },
            { name: 'Police Lights', color: 0xff0000, intensity: 0.8, price: 1000 }
        ];
    }

    getCurrentCustomization() {
        return { ...this.customizations };
    }
}